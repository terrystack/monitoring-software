import type { ConfigAyni, Indicador } from '../config/esquemas';
import type { Lectura, LineaBase } from '../datos/tipos';
import {
  agregarPorDia,
  bandaNormal,
  calcularLineaBase,
  diaDe,
  type BandaNormal,
} from './lineaBase';
import { filtrarContexto, validarLecturas } from './validacion';

export interface PuntoSerie {
  dia: string;
  numDia: number;
  valor: number;
  banda: BandaNormal | null;
  fuera: boolean;
  manual: boolean;
}

export interface Umbral {
  valor: number;
  estado: 'atencion' | 'critico';
}

const MS_DIA = 86_400_000;

/** Día de datos (1 = `generador.fechaInicio`) de una fecha AAAA-MM-DD. */
export function numeroDeDia(config: ConfigAyni, dia: string): number {
  const inicio = Date.parse(`${config.tripulantes.generador.fechaInicio}T00:00:00Z`);
  return Math.round((Date.parse(`${dia}T00:00:00Z`) - inicio) / MS_DIA) + 1;
}

/** "Tu normal" de un indicador como media ± z·σ, con el z de su regla de línea base. */
export function normalDe(ind: Indicador, lineaBase: LineaBase | null): BandaNormal | null {
  return lineaBase ? bandaNormal(lineaBase, parametrosBanda(ind).z) : null;
}

function parametrosBanda(ind: Indicador) {
  const regla = ind.reglas.find((r) => r.tipo === 'linea_base');
  return regla && regla.tipo === 'linea_base'
    ? { ventana: regla.ventanaDias, minDias: regla.minDias, z: regla.zAmbar }
    : { ventana: 14, minDias: 5, z: 2 };
}

/** Líneas fijas que dibuja la regla (CO₂, presupuesto de radiación…). */
export function umbralesDe(ind: Indicador): Umbral[] {
  const u: Umbral[] = [];
  for (const r of ind.reglas) {
    if (r.tipo === 'limite_fijo')
      u.push({ valor: r.ambar, estado: 'atencion' }, { valor: r.rojo, estado: 'critico' });
    if (r.tipo === 'presupuesto')
      u.push(
        { valor: (r.limite * r.ambarPct) / 100, estado: 'atencion' },
        { valor: (r.limite * r.rojoPct) / 100, estado: 'critico' },
      );
  }
  return u;
}

/**
 * Serie diaria de un indicador hasta `fechaReferencia` con la banda personal de cada día
 * (reglas 1–3 del motor: validación, contexto y agregación diaria).
 */
export function serieIndicador(
  lecturas: Lectura[],
  ind: Indicador,
  config: ConfigAyni,
  fechaReferencia: string,
): PuntoSerie[] {
  const limite = Date.parse(fechaReferencia);
  const propias = lecturas.filter(
    (l) => l.indicador === ind.id && Date.parse(l.fechaHora) <= limite,
  );
  const { validas } = validarLecturas(propias, [ind], config.frases);
  const enContexto = filtrarContexto(validas, ind);
  const diasManuales = new Set(
    enContexto.filter((l) => l.fuente === 'manual').map((l) => diaDe(l.fechaHora)),
  );
  const diaria = agregarPorDia(enContexto, ind.agregacionDiaria);
  const { ventana, minDias, z } = parametrosBanda(ind);
  // Un acumulado (presupuesto) solo crece: no tiene "normal" personal, solo su límite.
  const conBanda = !ind.reglas.some((r) => r.tipo === 'presupuesto');
  return diaria.map((p) => {
    const { lineaBase } = conBanda
      ? calcularLineaBase(diaria, p.dia, ventana, minDias)
      : { lineaBase: null };
    const banda = lineaBase ? bandaNormal(lineaBase, z) : null;
    const sube = banda !== null && p.valor > banda.sup;
    const baja = banda !== null && p.valor < banda.inf;
    const fuera =
      ind.direccionRiesgo === 'sube' ? sube : ind.direccionRiesgo === 'baja' ? baja : sube || baja;
    return {
      dia: p.dia,
      numDia: numeroDeDia(config, p.dia),
      valor: p.valor,
      banda,
      fuera,
      manual: diasManuales.has(p.dia),
    };
  });
}
