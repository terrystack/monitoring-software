import type { ConfigAyni, ConfigEvaluaciones } from '../config/esquemas';
import type { Lectura } from '../datos/tipos';

/**
 * Mental Health Checklist (MHCL; Bower et al., 2019): 23 ítems de 0 (nunca) a 10 (siempre),
 * en orden aleatorio cada vez, con tres subescalas. El puntaje de cada subescala es el
 * promedio de sus ítems (0–10), para poder compararlas entre sí.
 */

export type ConfigMhcl = ConfigEvaluaciones['mhcl'];

export interface PuntajeSubescala {
  id: string;
  promedio: number | null;
  respondidos: number;
  total: number;
}

export interface SesionMhclGuardada {
  id: string;
  tripulanteId: string;
  fechaHora: string;
  /** Orden en que se presentaron los ítems. */
  orden: string[];
  respuestas: Record<string, number>;
  puntajes: PuntajeSubescala[];
}

/** Fisher–Yates con un generador inyectable (para tests). */
export function barajar<T>(lista: T[], aleatorio: () => number = Math.random): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function puntuarMhcl(
  mhcl: ConfigMhcl,
  respuestas: Record<string, number>,
): PuntajeSubescala[] {
  return mhcl.subescalas.map((s) => {
    const items = mhcl.items.filter((i) => i.subescala === s.id);
    const valores = items
      .map((i) => respuestas[i.id])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return {
      id: s.id,
      promedio: valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null,
      respondidos: valores.length,
      total: items.length,
    };
  });
}

/** Promedio de las medias de referencia de los ítems de la subescala (solo orientación). */
export function referenciaSubescala(mhcl: ConfigMhcl, id: string): number | null {
  const medias = mhcl.items
    .filter((i) => i.subescala === id && i.referencia)
    .map((i) => i.referencia!.media);
  return medias.length ? medias.reduce((a, b) => a + b, 0) / medias.length : null;
}

export function mhclCompleta(mhcl: ConfigMhcl, respuestas: Record<string, number>): boolean {
  return mhcl.items.every((i) => typeof respuestas[i.id] === 'number');
}

/** Una lectura por subescala con su promedio redondeado a 1 decimal. */
export function lecturasDeSesionMhcl(config: ConfigAyni, s: SesionMhclGuardada): Lectura[] {
  const { mhcl } = config.evaluaciones;
  return s.puntajes.flatMap((p) => {
    const sub = mhcl.subescalas.find((x) => x.id === p.id);
    const ind = config.indicadores.find((i) => i.id === sub?.indicador);
    if (!sub || !ind || p.promedio === null) return [];
    return [
      {
        tripulanteId: s.tripulanteId,
        fechaHora: s.fechaHora,
        indicador: ind.id,
        valor: Math.round(p.promedio * 10) / 10,
        unidad: ind.unidad,
        fuente: 'manual',
        contexto: 'manual',
      },
    ];
  });
}
