import { z } from 'zod';
import type { IdCapa } from '../config/esquemas';
import type { Pestana } from '../estado/store';
import type { DiasRango, EstadoLienzo, LlamadaVisualizacion } from './tipos';

/** Ids que existen en la app; cualquier otro hace que la llamada se ignore. */
export interface IdsValidos {
  zonas: string[];
  indicadores: string[];
  capas: string[];
  sensores: string[];
  pasos: number;
}

export interface EfectoLlamada {
  lienzo?: EstadoLienzo;
  pestana?: Pestana;
}

const dias = z
  .union([z.literal(7), z.literal(14), z.literal(30)])
  .optional()
  .transform((d): DiasRango => d ?? 14);

/** Valida una llamada de visualización (§8.7) y devuelve su efecto, o null si no es válida. */
export function efectoDeLlamada(l: LlamadaVisualizacion, ids: IdsValidos): EfectoLlamada | null {
  const zona = z.string().refine((v) => ids.zonas.includes(v));
  const indicador = z.string().refine((v) => ids.indicadores.includes(v));
  const capa = z.string().refine((v) => ids.capas.includes(v));
  const paso = z.number().int().min(1).max(Math.max(1, ids.pasos));
  const sensor = z.string().refine((v) => ids.sensores.includes(v));

  switch (l.nombre) {
    case 'mostrar_zona_3d': {
      const r = z.object({ zona, capas: z.array(capa).optional() }).safeParse(l.args);
      return r.success
        ? {
            lienzo: {
              tipo: 'cuerpo',
              zona: r.data.zona,
              capas: r.data.capas as IdCapa[] | undefined,
            },
          }
        : null;
    }
    case 'mostrar_grafico': {
      const r = z.object({ indicador, dias, prediccion: z.boolean().optional() }).safeParse(l.args);
      return r.success
        ? {
            lienzo: {
              tipo: 'grafico',
              indicador: r.data.indicador,
              dias: r.data.dias,
              prediccion: r.data.prediccion ?? true,
            },
          }
        : null;
    }
    case 'comparar_indicadores': {
      const r = z.object({ indicadores: z.tuple([indicador, indicador]), dias }).safeParse(l.args);
      return r.success
        ? { lienzo: { tipo: 'comparacion', indicadores: r.data.indicadores, dias: r.data.dias } }
        : null;
    }
    case 'mostrar_guia_dispositivo': {
      const r = z.object({ paso: paso.optional(), sensor: sensor.optional() }).safeParse(l.args);
      return r.success
        ? { lienzo: { tipo: 'dispositivo', paso: r.data.paso ?? 1, sensor: r.data.sensor ?? null } }
        : null;
    }
    case 'mostrar_resumen':
      return { lienzo: { tipo: 'resumen' } };
    case 'abrir_pestana': {
      const r = z
        .object({ pestana: z.enum(['cuerpo3d', 'monitoreo', 'medicion', 'agente']) })
        .safeParse(l.args);
      return r.success ? { pestana: r.data.pestana } : null;
    }
  }
}

/** Primer lienzo válido y la pestaña pedida (si la hay) de una respuesta del agente. */
export function efectosDeRespuesta(
  llamadas: LlamadaVisualizacion[],
  ids: IdsValidos,
): EfectoLlamada {
  const efectos = llamadas
    .map((l) => efectoDeLlamada(l, ids))
    .filter((e): e is EfectoLlamada => e !== null);
  return {
    lienzo: efectos.find((e) => e.lienzo)?.lienzo,
    pestana: efectos.find((e) => e.pestana)?.pestana,
  };
}
