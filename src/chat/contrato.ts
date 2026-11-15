// Contrato compartido entre el cliente y /api/chat (AYNI_FUSION.md §8.5–8.7).
// Sin dependencias del DOM: lo compilan tanto la app como la función de Vercel.
import type { TarjetaAccion } from '../datos/tipos.js';

export type EstadoContexto = 'normal' | 'atencion' | 'critico' | 'sin_dato';

export interface IndicadorContexto {
  id: string;
  nombre: string;
  unidad: string;
  zonas: string[];
  estado: EstadoContexto;
  valor: number | null;
  motivo: string | null;
  normal: { media: number; inf: number; sup: number } | null;
  /** Valores diarios, del más antiguo al más reciente. */
  ultimos14: number[];
  pendientePorDia: number | null;
  prediccion7: { valor: number; inf: number; sup: number }[] | null;
  cruceProbableEnDias: number | null;
  /** `queSignifica` solo viene si el indicador está en atención o crítico. */
  textos: { queEs: string; queSignifica?: string; porQueEspacio: string };
  acciones: string[];
  avisoMedico: string;
  fuenteNombre: string;
}

export interface ContextoAgente {
  idioma: 'es' | 'en';
  tripulante: {
    id: string;
    nombre: string;
    rol: string;
    diaMision: number;
    entorno: { id: string; nombre: string; riesgosDestacados: string[] };
  };
  diaDatos: number;
  fechaReferencia: string;
  pantalla: { pestanaAnterior: string; zonaSeleccionada: string | null; lienzo: string };
  puntaje: number;
  zonas: { id: string; nombre: string; estado: EstadoContexto }[];
  indicadores: IndicadorContexto[];
  alertas: {
    id: string;
    nombre: string;
    estado: EstadoContexto;
    zonas: string[];
    indicadores: string[];
  }[];
  aptitud: { id: string; nombre: string; estado: EstadoContexto }[];
  /** Solo zonas en atención o crítico y la seleccionada; `indicadores` son ids. */
  tarjetas: Record<string, Omit<TarjetaAccion, 'indicadores'> & { indicadores: string[] }>;
  agendaHoy: { id: string; titulo: string; hora: string; estado: string }[];
  dispositivo: {
    id: string;
    nombre: string;
    pasos: { n: number; texto: string; error?: string }[];
    sensores: { id: string; nombre: string; donde: string; indicadores: string[] }[];
  } | null;
  capas: string[];
  lecturasDescartadas: { indicador: string; motivo: string }[];
  limites: { radiacionCarreraMSv: number | null; co2: string };
}

export interface MensajePeticion {
  rol: 'usuario' | 'asistente';
  texto: string;
  imagen?: { mediaType: string; datos: string };
}

export interface PeticionChat {
  idioma: 'es' | 'en';
  mensajes: MensajePeticion[];
  contexto: ContextoAgente;
}

export const HERRAMIENTAS_LECTURA = [
  'consultar_zona',
  'consultar_indicador',
  'consultar_tendencia',
  'consultar_prediccion',
  'consultar_agenda',
  'consultar_dispositivo',
] as const;

export const HERRAMIENTAS_VISUALIZACION = [
  'mostrar_zona_3d',
  'mostrar_grafico',
  'comparar_indicadores',
  'mostrar_guia_dispositivo',
  'mostrar_resumen',
  'abrir_pestana',
] as const;

export type NombreLectura = (typeof HERRAMIENTAS_LECTURA)[number];
export type NombreVisualizacionApi = (typeof HERRAMIENTAS_VISUALIZACION)[number];

export interface RespuestaChat {
  texto: string;
  llamadas: { nombre: NombreVisualizacionApi; args: Record<string, unknown> }[];
  respuestasRapidas: string[];
  fuentes: string[];
}

/** Separa la línea final `RAPIDAS: a | b | c` del texto del modelo. */
export function separarRapidas(texto: string): { texto: string; rapidas: string[] } {
  const lineas = texto.trimEnd().split('\n');
  const i = lineas.findIndex((l) => /^\s*(RAPIDAS|RÁPIDAS|QUICK)\s*:/i.test(l));
  if (i < 0) return { texto: texto.trim(), rapidas: [] };
  const rapidas = lineas[i]
    .replace(/^\s*[^:]+:\s*/, '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  return {
    texto: lineas
      .slice(0, i)
      .concat(lineas.slice(i + 1))
      .join('\n')
      .trim(),
    rapidas,
  };
}
