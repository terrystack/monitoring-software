import type { Contexto, Estado } from '../config/esquemas';

export type { Contexto };

/** Sección 6.1 */
export type EstadoZona = Estado;

/** Una fila del CSV de la sección 4.1, ya tipada. */
export interface Lectura {
  tripulanteId: string;
  fechaHora: string;
  indicador: string;
  valor: number;
  unidad: string;
  fuente: string;
  contexto: string;
}

export const COLUMNAS_CSV = [
  'tripulante_id',
  'fecha_hora',
  'indicador',
  'valor',
  'unidad',
  'fuente',
  'contexto',
] as const;

export type FilaCsv = Record<(typeof COLUMNAS_CSV)[number], string>;

export interface LineaBase {
  media: number;
  desv: number;
  min: number;
  max: number;
}

/** Sección 6.1 */
export interface EvaluacionIndicador {
  indicador: string;
  valor: number;
  lineaBase: LineaBase | null;
  z: number | null;
  estado: EstadoZona;
  motivo: string;
}

/** Sección 6.1 */
export interface TarjetaAccion {
  zona: string;
  estado: EstadoZona;
  funcion: string;
  indicadores: EvaluacionIndicador[];
  queCambio: string;
  queSignifica: string;
  acciones: string[];
  avisoMedico: string;
  porQueEspacio: string;
  fuente: string;
  /** Nombre corto de la fuente para mostrar ("NASA HRP"). */
  fuenteNombre: string;
}

export interface LecturaDescartada {
  lectura: Lectura;
  motivo: string;
}

export interface AlertaMultisenal {
  id: string;
  nombre: string;
  estado: EstadoZona;
  zonas: string[];
  indicadores: string[];
}

export interface EstadoAptitud {
  id: string;
  nombre: string;
  estado: EstadoZona;
}

/** Sección 6.1: salida completa de evaluarMotor(lecturas, config, fechaReferencia). */
export interface EstadoMotor {
  tripulanteId: string;
  fechaReferencia: string;
  indicadores: Record<string, EvaluacionIndicador>;
  zonas: Record<string, { estado: EstadoZona; tarjeta: TarjetaAccion }>;
  alertas: AlertaMultisenal[];
  aptitud: EstadoAptitud[];
  descartadas: LecturaDescartada[];
}
