import type { ConfigAyni, Contexto, Indicador, Tripulante } from '../config/esquemas';
import { COLUMNAS_CSV, type Lectura } from './tipos';

/** Sección 4.5: horas fijas de cada frecuencia. */
const HORAS_TRES_VECES_DIA = ['07:00', '13:00', '21:00'];
/** Hora de las lecturas diarias sin tarea en la rutina (dosis). */
const HORA_DIARIA_SIN_TAREA = '23:00';
/** Pulso extra durante el ejercicio: media personal + este valor (ilustrativo). */
const PULSO_EJERCICIO_EXTRA = 50;
/** Indicadores acumulados y el indicador diario del que se suman. */
const FUENTE_ACUMULADO: Record<string, string> = { dosis_radiacion: 'tasa_dosis_dia' };
const HORA_PICO_CICLO = 15;

/** PRNG mulberry32: misma semilla → misma secuencia. */
export function crearAleatorio(semilla: number) {
  let estado = semilla >>> 0;
  const uniforme = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => {
    const u = 1 - uniforme();
    const v = uniforme();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { uniforme, gauss };
}

function redondear(valor: number, decimales: number): number {
  const f = 10 ** decimales;
  return Math.round(valor * f) / f;
}

function ajustar(valor: number, ind: Indicador): number {
  const v = redondear(valor, ind.sintetico.decimales);
  return Math.min(ind.validacion.max, Math.max(ind.validacion.min, v));
}

function fechaHoraIso(fechaInicio: string, dia: number, hora: string): string {
  const base = new Date(`${fechaInicio}T${hora}:00Z`);
  base.setUTCDate(base.getUTCDate() + dia - 1);
  return base.toISOString().replace('.000Z', 'Z');
}

function horaNumero(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h + m / 60;
}

function horasDe(ind: Indicador, config: ConfigAyni): string[] {
  switch (ind.sintetico.frecuencia) {
    case 'cada_hora':
      return Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
    case 'tres_veces_dia':
      return HORAS_TRES_VECES_DIA;
    case 'diaria': {
      const tarea = config.rutina.find((t) => t.indicadores.includes(ind.id));
      return [tarea?.hora ?? HORA_DIARIA_SIN_TAREA];
    }
  }
}

/** Sección 4.5: contexto de cada lectura generada. */
function contextoDe(ind: Indicador, hora: string): Contexto {
  if (ind.id === 'sueno_horas') return 'sueno';
  if (ind.id === 'ejercicio_min') return 'ejercicio';
  if (ind.entrada === 'manual') return 'manual';
  if (ind.id === 'glucosa' && hora === '13:00') return 'post_comida';
  if (horaNumero(hora) >= 21) return 'noche';
  return 'reposo';
}

function fuenteDe(ind: Indicador): string {
  return ind.entrada === 'manual' ? 'manual' : 'dispositivo';
}

interface LecturaInterna extends Lectura {
  dia: number;
}

function generarTripulante(
  trip: Tripulante,
  config: ConfigAyni,
  aleatorio: ReturnType<typeof crearAleatorio>,
): LecturaInterna[] {
  const { fechaInicio, dias } = config.tripulantes.generador;
  const lecturas: LecturaInterna[] = [];
  const pulso = config.indicadores.find((i) => i.id === 'pulso_reposo');
  const ejercicio = config.indicadores.find((i) => i.id === 'ejercicio_min');
  const horaEjercicio = ejercicio ? horasDe(ejercicio, config)[0] : undefined;

  for (let dia = 1; dia <= dias; dia++) {
    for (const ind of config.indicadores) {
      if (ind.sintetico.acumulado) continue;
      const media = ind.sintetico.media + (trip.desviosPersonales[ind.id] ?? 0);
      for (const hora of horasDe(ind, config)) {
        const ciclo = ind.sintetico.cicloDiario
          ? ind.sintetico.cicloDiario *
            Math.cos((2 * Math.PI * (horaNumero(hora) - HORA_PICO_CICLO)) / 24)
          : 0;
        const valor = ajustar(media + aleatorio.gauss() * ind.sintetico.desv + ciclo, ind);
        lecturas.push({
          tripulanteId: trip.id,
          fechaHora: fechaHoraIso(fechaInicio, dia, hora),
          indicador: ind.id,
          valor,
          unidad: ind.unidad,
          fuente: fuenteDe(ind),
          contexto: contextoDe(ind, hora),
          dia,
        });
      }
    }
    if (pulso && horaEjercicio) {
      const media =
        pulso.sintetico.media + (trip.desviosPersonales[pulso.id] ?? 0) + PULSO_EJERCICIO_EXTRA;
      lecturas.push({
        tripulanteId: trip.id,
        fechaHora: fechaHoraIso(fechaInicio, dia, horaEjercicio),
        indicador: pulso.id,
        valor: ajustar(media + aleatorio.gauss() * pulso.sintetico.desv, pulso),
        unidad: pulso.unidad,
        fuente: fuenteDe(pulso),
        contexto: 'ejercicio',
        dia,
      });
    }
  }
  return lecturas;
}

function aplicarEscenarios(
  lecturas: LecturaInterna[],
  config: ConfigAyni,
  soloAcumulados: boolean,
) {
  const porId = new Map(config.indicadores.map((i) => [i.id, i]));
  for (const esc of config.escenarios) {
    for (const alt of esc.alteraciones) {
      const ind = porId.get(alt.indicador);
      if (!ind || Boolean(ind.sintetico.acumulado) !== soloAcumulados) continue;
      for (const l of lecturas) {
        if (l.tripulanteId !== esc.tripulanteId || l.indicador !== alt.indicador) continue;
        if (l.dia < alt.diaInicio || l.dia > alt.diaFin) continue;
        let valor = l.valor;
        switch (alt.modo) {
          case 'sumar':
            valor += alt.valor;
            break;
          case 'multiplicar':
            valor *= alt.valor;
            break;
          case 'fijar':
            valor = alt.valor;
            break;
          case 'rampa': {
            const tramo = alt.diaFin - alt.diaInicio;
            const t = tramo === 0 ? 0 : (l.dia - alt.diaInicio) / tramo;
            valor = alt.valor + ((alt.valorFinal ?? alt.valor) - alt.valor) * t;
            break;
          }
        }
        l.valor = ajustar(valor, ind);
        if (alt.contexto) l.contexto = alt.contexto;
      }
    }
  }
}

function generarAcumulados(
  lecturas: LecturaInterna[],
  trip: Tripulante,
  config: ConfigAyni,
): LecturaInterna[] {
  const { fechaInicio, dias } = config.tripulantes.generador;
  const resultado: LecturaInterna[] = [];
  for (const ind of config.indicadores) {
    if (!ind.sintetico.acumulado) continue;
    const fuente = FUENTE_ACUMULADO[ind.id];
    if (!fuente) continue;
    const hora = horasDe(ind, config)[0];
    let acumulado = 0;
    for (let dia = 1; dia <= dias; dia++) {
      acumulado += lecturas
        .filter((l) => l.tripulanteId === trip.id && l.indicador === fuente && l.dia === dia)
        .reduce((s, l) => s + l.valor, 0);
      resultado.push({
        tripulanteId: trip.id,
        fechaHora: fechaHoraIso(fechaInicio, dia, hora),
        indicador: ind.id,
        valor: ajustar(acumulado, ind),
        unidad: ind.unidad,
        fuente: fuenteDe(ind),
        contexto: contextoDe(ind, hora),
        dia,
      });
    }
  }
  return resultado;
}

/** Sección 4.5: genera todas las lecturas sintéticas de forma reproducible. */
export function generarLecturas(config: ConfigAyni): Lectura[] {
  const aleatorio = crearAleatorio(config.tripulantes.generador.semilla);
  const base = config.tripulantes.tripulantes.flatMap((t) =>
    generarTripulante(t, config, aleatorio),
  );
  aplicarEscenarios(base, config, false);
  const acumulados = config.tripulantes.tripulantes.flatMap((t) =>
    generarAcumulados(base, t, config),
  );
  aplicarEscenarios(acumulados, config, true);

  const ordenTrip = new Map(config.tripulantes.tripulantes.map((t, i) => [t.id, i]));
  const ordenInd = new Map(config.indicadores.map((ind, i) => [ind.id, i]));
  return [...base, ...acumulados]
    .sort(
      (a, b) =>
        (ordenTrip.get(a.tripulanteId) ?? 0) - (ordenTrip.get(b.tripulanteId) ?? 0) ||
        a.fechaHora.localeCompare(b.fechaHora) ||
        (ordenInd.get(a.indicador) ?? 0) - (ordenInd.get(b.indicador) ?? 0),
    )
    .map(({ dia: _dia, ...lectura }) => lectura);
}

export function lecturasACsv(lecturas: Lectura[]): string {
  const filas = lecturas.map((l) =>
    [
      l.tripulanteId,
      l.fechaHora,
      l.indicador,
      String(l.valor),
      l.unidad,
      l.fuente,
      l.contexto,
    ].join(','),
  );
  return [COLUMNAS_CSV.join(','), ...filas].join('\n') + '\n';
}

/** Fecha de referencia del modo demo: final del día indicado (sección 6.2). */
export function fechaDeDia(config: ConfigAyni, dia: number, hora = '23:59:59'): string {
  const [h, m, s] = hora.split(':');
  return fechaHoraIso(config.tripulantes.generador.fechaInicio, dia, `${h}:${m}`).replace(
    /:00Z$/,
    `:${s ?? '00'}Z`,
  );
}
