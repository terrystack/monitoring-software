import type { ConfigAyni } from '../../config/esquemas';
import { fechaDeDia } from '../../datos/generador';

/** Hora del reloj local en HH:MM. */
export const horaActual = () => new Date().toTimeString().slice(0, 5);

/**
 * Fecha y hora de un registro: el día de datos que se está mirando con la hora actual, igual
 * que el registro manual de la pestaña Medición.
 */
export function fechaHoraRegistro(config: ConfigAyni, dia: number): string {
  return `${fechaDeDia(config, dia).slice(0, 10)}T${new Date().toISOString().slice(11, 19)}Z`;
}
