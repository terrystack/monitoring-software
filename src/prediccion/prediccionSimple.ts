import type { Indicador } from '../config/esquemas';
import type { PuntoSerie } from '../motor/series';

export interface PuntoPrediccion {
  numDia: number;
  valor: number;
  inf: number;
  sup: number;
}

export interface Prediccion {
  puntos: PuntoPrediccion[];
  /** Cambio medio por día de la recta ajustada (o tasa diaria en acumulativos). */
  pendientePorDia: number;
}

export const VENTANA_PREDICCION_DIAS = 14;
export const HORIZONTE_DIAS = 7;
export const MIN_DIAS_PREDICCION = 5;
const Z_95 = 1.96;

const esAcumulativo = (ind: Indicador) => ind.reglas.some((r) => r.tipo === 'presupuesto');

/**
 * Predicción v1 (sección 7 de la spec): regresión lineal de los últimos 14 días, proyectada
 * 7 días con banda ±1,96·σ de los residuos (mínimo el 1 % de la media). En indicadores
 * acumulativos proyecta la tasa media diaria sin banda por debajo del último valor.
 */
export function predecir(serie: PuntoSerie[], ind: Indicador): Prediccion | null {
  const ventana = serie.slice(-VENTANA_PREDICCION_DIAS);
  if (ventana.length < MIN_DIAS_PREDICCION) return null;
  const ultimo = ventana[ventana.length - 1];

  if (esAcumulativo(ind)) {
    const incrementos = ventana
      .slice(1)
      .map((p, i) => (p.valor - ventana[i].valor) / (p.numDia - ventana[i].numDia));
    const tasa = incrementos.reduce((s, v) => s + v, 0) / incrementos.length;
    const desv = desviacion(incrementos, tasa);
    return {
      pendientePorDia: tasa,
      puntos: Array.from({ length: HORIZONTE_DIAS }, (_, i) => {
        const k = i + 1;
        const valor = ultimo.valor + tasa * k;
        const margen = Z_95 * desv * Math.sqrt(k);
        return {
          numDia: ultimo.numDia + k,
          valor,
          inf: Math.max(ultimo.valor, valor - margen),
          sup: valor + margen,
        };
      }),
    };
  }

  const xs = ventana.map((p) => p.numDia);
  const ys = ventana.map((p) => p.valor);
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
  const my = ys.reduce((s, v) => s + v, 0) / ys.length;
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const pendiente = sxx === 0 ? 0 : xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / sxx;
  const ordenada = my - pendiente * mx;
  const residuos = xs.map((x, i) => ys[i] - (ordenada + pendiente * x));
  const sigma = Math.max(desviacion(residuos, 0), Math.abs(my) * 0.01);
  const margen = Z_95 * sigma;
  return {
    pendientePorDia: pendiente,
    puntos: Array.from({ length: HORIZONTE_DIAS }, (_, i) => {
      const numDia = ultimo.numDia + i + 1;
      const valor = ordenada + pendiente * numDia;
      return { numDia, valor, inf: valor - margen, sup: valor + margen };
    }),
  };
}

/**
 * Primer día predicho que sale de la última banda personal en la dirección de riesgo.
 * Orientativo: la interfaz y el agente lo dicen con "podría".
 */
export function cruceProbable(
  serie: PuntoSerie[],
  prediccion: Prediccion | null,
  ind: Indicador,
): { dias: number } | null {
  const banda = serie[serie.length - 1]?.banda;
  if (!prediccion || !banda) return null;
  const ultimoDia = serie[serie.length - 1].numDia;
  for (const p of prediccion.puntos) {
    const sube = p.valor > banda.sup;
    const baja = p.valor < banda.inf;
    const fuera =
      ind.direccionRiesgo === 'sube' ? sube : ind.direccionRiesgo === 'baja' ? baja : sube || baja;
    if (fuera) return { dias: p.numDia - ultimoDia };
  }
  return null;
}

function desviacion(valores: number[], media: number): number {
  if (valores.length < 2) return 0;
  return Math.sqrt(valores.reduce((s, v) => s + (v - media) ** 2, 0) / (valores.length - 1));
}
