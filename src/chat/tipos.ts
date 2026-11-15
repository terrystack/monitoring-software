import type { IdCapa } from '../config/esquemas';

export type DiasRango = 7 | 14 | 30;

/** Qué muestra el lienzo del Agente AYNI (AYNI_FUSION.md §8.11). */
export type EstadoLienzo =
  | { tipo: 'vacio' }
  | { tipo: 'cuerpo'; zona: string | null; capas?: IdCapa[] }
  | { tipo: 'grafico'; indicador: string; dias: DiasRango; prediccion: boolean }
  | { tipo: 'comparacion'; indicadores: [string, string]; dias: DiasRango }
  | { tipo: 'dispositivo'; dispositivo?: string; paso: number; sensor: string | null }
  | { tipo: 'resumen' };

export type NombreVisualizacion =
  | 'mostrar_zona_3d'
  | 'mostrar_grafico'
  | 'comparar_indicadores'
  | 'mostrar_guia_dispositivo'
  | 'mostrar_resumen'
  | 'abrir_pestana';

export interface LlamadaVisualizacion {
  nombre: NombreVisualizacion;
  args: Record<string, unknown>;
}

export interface ImagenAdjunta {
  mediaType: string;
  /** Base64 sin prefijo `data:`. */
  datos: string;
}

export interface MensajeChat {
  id: string;
  rol: 'usuario' | 'asistente';
  texto: string;
  imagen?: ImagenAdjunta;
  llamadas?: LlamadaVisualizacion[];
  respuestasRapidas?: string[];
  fuentes?: string[];
  /** La respuesta salió del respaldo local, no del modelo. */
  sinConexion?: boolean;
}
