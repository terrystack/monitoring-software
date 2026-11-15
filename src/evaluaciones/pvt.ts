import type { ConfigAyni, ConfigEvaluaciones, Contexto } from '../config/esquemas';
import type { Lectura } from '../datos/tipos';

/**
 * PVT-B (prueba de vigilancia psicomotora breve, 3 min) según Jones et al. (2022) y la
 * implementación de PsyToolkit, con el estímulo en una cuadrícula: tras una espera aleatoria
 * se enciende una casilla con un contador en ms; se responde tocándola o con la tecla B.
 *
 * Todo lo de este archivo es puro: el tiempo entra como argumento (ms de performance.now()),
 * así la misma lógica corre en el navegador y en los tests.
 */

export type ParametrosPvt = ConfigEvaluaciones['pvt'];

/** `response` guarda el TR crudo: el umbral de salida en falso se aplica al resumir. */
export type TipoIntento = 'response' | 'false_start' | 'timeout';

/** Un registro por intento (guía §8) más la casilla. Se guarda en IndexedDB con la sesión. */
export interface IntentoPvt {
  /** Número del estímulo al que pertenece (las salidas en falso llevan el del que esperaban). */
  trial: number;
  type: TipoIntento;
  /** TR en ms desde que apareció el estímulo; null en salidas en falso sin estímulo. */
  rt_ms: number | null;
  /** Espera aleatoria programada antes del estímulo. */
  delay_ms: number;
  /** Momento del evento desde el inicio de la prueba. */
  t_ms: number;
  /** Casilla encendida (índice fila × columnas + columna); null si no había estímulo. */
  cell: number | null;
}

export type FasePvt = 'inicial' | 'espera' | 'estimulo' | 'retro' | 'fin';

export interface ResumenPvt {
  /** Medida principal: promedio de 1000/TR (1/s) de las respuestas válidas. */
  velocidad: number | null;
  trMedioMs: number | null;
  trMedianaMs: number | null;
  /** Respuestas con TR ≥ umbral de lapso, más las no respondidas. */
  lapsos: number;
  /** Toques sin estímulo, más respuestas con TR < umbral de salida en falso. */
  salidasFalsas: number;
  /** Estímulos presentados (respondidos o no). */
  estimulos: number;
  respuestasValidas: number;
}

export type Umbrales = Pick<ParametrosPvt, 'umbralLapsoMs' | 'umbralFalsaMs'>;

const promedio = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/** Resultados del PVT-B (guía §5). Se puede recalcular con otros umbrales. */
export function resumirPvt(intentos: IntentoPvt[], umbrales: Umbrales): ResumenPvt {
  const respuestas = intentos.filter((i) => i.type === 'response' && i.rt_ms !== null);
  const validas = respuestas
    .map((i) => i.rt_ms as number)
    .filter((rt) => rt >= umbrales.umbralFalsaMs);
  const anticipadas = respuestas.length - validas.length;
  const sinRespuesta = intentos.filter((i) => i.type === 'timeout').length;
  const sinEstimulo = intentos.filter((i) => i.type === 'false_start').length;
  return {
    velocidad: promedio(validas.map((rt) => 1000 / rt)),
    trMedioMs: promedio(validas),
    trMedianaMs: mediana(validas),
    lapsos: validas.filter((rt) => rt >= umbrales.umbralLapsoMs).length + sinRespuesta,
    salidasFalsas: sinEstimulo + anticipadas,
    estimulos: respuestas.length + sinRespuesta,
    respuestasValidas: validas.length,
  };
}

/**
 * Estado de una prueba en curso. `avanzar(t)` se llama en cada cuadro; `pulsar(t)` con cada
 * toque o tecla. El estímulo cuenta desde el primer cuadro en que se decide mostrarlo.
 */
export class SesionPvt {
  fase: FasePvt = 'inicial';
  readonly intentos: IntentoPvt[] = [];
  /** Casilla encendida (estímulo o retroalimentación). */
  celda: number | null = null;
  private inicio = 0;
  private numero = 0;
  private esperaMs = 0;
  private inicioEspera = 0;
  private inicioEstimulo = 0;
  private finRetro = 0;
  private ultimoTr = 0;

  constructor(
    private readonly p: ParametrosPvt,
    private readonly aleatorio: () => number = Math.random,
  ) {}

  iniciar(t: number) {
    this.inicio = t;
    this.nuevaEspera(t);
  }

  private nuevaEspera(t: number) {
    this.numero += 1;
    this.fase = 'espera';
    this.celda = null;
    this.inicioEspera = t;
    this.esperaMs = Math.round(
      this.p.esperaMinMs + this.aleatorio() * (this.p.esperaMaxMs - this.p.esperaMinMs),
    );
  }

  private get totalCeldas() {
    return this.p.filas * this.p.columnas;
  }

  transcurridoMs(t: number) {
    return this.fase === 'inicial' ? 0 : t - this.inicio;
  }

  restanteMs(t: number) {
    return Math.max(0, this.p.duracionS * 1000 - this.transcurridoMs(t));
  }

  /** Avanza la máquina de estados hasta el instante `t` y devuelve la fase resultante. */
  avanzar(t: number): FasePvt {
    if (this.fase === 'inicial' || this.fase === 'fin') return this.fase;
    if (this.restanteMs(t) <= 0) {
      // Un estímulo que queda a medias al terminar no cuenta.
      this.fase = 'fin';
      this.celda = null;
      return this.fase;
    }
    if (this.fase === 'espera' && t - this.inicioEspera >= this.esperaMs) {
      this.fase = 'estimulo';
      this.inicioEstimulo = t;
      this.celda = Math.min(this.totalCeldas - 1, Math.floor(this.aleatorio() * this.totalCeldas));
    } else if (this.fase === 'estimulo' && t - this.inicioEstimulo >= this.p.maxRespuestaMs) {
      this.registrar('timeout', null, this.inicioEstimulo + this.p.maxRespuestaMs);
      this.nuevaEspera(t);
    } else if (this.fase === 'retro' && t >= this.finRetro) {
      this.nuevaEspera(t);
    }
    return this.fase;
  }

  /**
   * Respuesta en el instante `t`. `celdaTocada` es la casilla tocada (undefined con teclado).
   * En espera cuenta como salida en falso; con estímulo solo vale tocar la casilla encendida
   * (un toque en otra casilla se ignora); en la retroalimentación se ignora todo.
   */
  pulsar(t: number, celdaTocada?: number | null) {
    this.avanzar(t);
    if (this.fase === 'espera') {
      this.registrar('false_start', null, t);
    } else if (this.fase === 'estimulo') {
      if (celdaTocada !== undefined && celdaTocada !== this.celda) return;
      const rt = Math.max(0, Math.round(t - this.inicioEstimulo));
      this.registrar('response', rt, t);
      this.ultimoTr = rt;
      this.fase = 'retro';
      this.finRetro = t + this.p.retroalimentacionMs;
    }
  }

  /** Número a mostrar en la casilla: contador en pasos de `pasoContadorMs` o el TR final. */
  contador(t: number): number | null {
    if (this.fase === 'estimulo') {
      const ms = t - this.inicioEstimulo;
      return Math.floor(ms / this.p.pasoContadorMs) * this.p.pasoContadorMs;
    }
    if (this.fase === 'retro') return this.ultimoTr;
    return null;
  }

  private registrar(type: TipoIntento, rt: number | null, t: number) {
    this.intentos.push({
      trial: this.numero,
      type,
      rt_ms: rt,
      delay_ms: this.esperaMs,
      t_ms: Math.round(t - this.inicio),
      cell: type === 'false_start' ? null : this.celda,
    });
  }
}

// --- Sesión guardada ----------------------------------------------------------

export type EntradaPvt = 'teclado' | 'tactil' | 'raton' | 'mixta';

export interface SesionPvtGuardada {
  id: string;
  tripulanteId: string;
  fechaHora: string;
  /** id del momento (despertar, noche) o "libre". */
  momento: string;
  contexto: Contexto;
  entrada: EntradaPvt;
  estres: number;
  horasSueno: number | null;
  duracionS: number;
  umbrales: Umbrales;
  cuadricula: { filas: number; columnas: number };
  resumen: ResumenPvt;
  intentos: IntentoPvt[];
}

/** Momento de rutina más cercano a la hora del reloj (distancia circular en el día). */
export function momentoSugerido(config: ConfigAyni, ahoraHHMM: string): string {
  const aMin = (h: string) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  };
  const ahora = aMin(ahoraHHMM);
  let mejor = 'libre';
  let distancia = Infinity;
  for (const m of config.evaluaciones.pvt.momentos) {
    const tarea = config.rutina.find((t) => t.id === m.tarea);
    if (!tarea) continue;
    const d = Math.abs(aMin(tarea.hora) - ahora);
    const circular = Math.min(d, 1440 - d);
    if (circular < distancia) {
      distancia = circular;
      mejor = m.id;
    }
  }
  return mejor;
}

export function contextoDeMomento(config: ConfigAyni, momento: string): Contexto {
  return config.evaluaciones.pvt.momentos.find((m) => m.id === momento)?.contexto ?? 'manual';
}

/** Combina los tipos de entrada usados durante la prueba. */
export function combinarEntrada(usadas: Set<Exclude<EntradaPvt, 'mixta'>>): EntradaPvt {
  if (usadas.size === 1) return [...usadas][0];
  return usadas.size === 0 ? 'teclado' : 'mixta';
}

/** Lecturas manuales que alimentan al motor: TR medio, velocidad y estrés en el mismo registro. */
export function lecturasDeSesionPvt(config: ConfigAyni, s: SesionPvtGuardada): Lectura[] {
  const { indicadores } = config.evaluaciones.pvt;
  const unidad = (id: string) => config.indicadores.find((i) => i.id === id)?.unidad ?? '';
  const lectura = (indicador: string, valor: number): Lectura => ({
    tripulanteId: s.tripulanteId,
    fechaHora: s.fechaHora,
    indicador,
    valor,
    unidad: unidad(indicador),
    fuente: 'manual',
    contexto: s.contexto,
  });
  const lecturas = [lectura(indicadores.estres, s.estres)];
  if (s.resumen.trMedioMs !== null)
    lecturas.push(lectura(indicadores.tiempoReaccion, Math.round(s.resumen.trMedioMs)));
  if (s.resumen.velocidad !== null)
    lecturas.push(lectura(indicadores.velocidad, Math.round(s.resumen.velocidad * 100) / 100));
  return lecturas;
}
