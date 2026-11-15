import type { ConfigAyni, Tarea } from '../config/esquemas';
import { fechaDeDia } from '../datos/generador';
import type { Lectura } from '../datos/tipos';
import { diaDe } from './lineaBase';

export type EstadoTarea = 'hecha' | 'pendiente' | 'atrasada';

export interface TareaAgenda {
  tarea: Tarea;
  estado: EstadoTarea;
}

/** Día de la semana ISO (1 = lunes … 7 = domingo) de una fecha AAAA-MM-DD. */
export function diaSemana(fecha: string): number {
  return ((new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

/**
 * Agenda del día de datos `dia` (AYNI_FUSION.md §7.4): hecha si hay una lectura de alguno de
 * sus indicadores ese día; si no, atrasada cuando ya pasó su hora (en días anteriores al
 * último, todo lo no hecho está atrasado) y pendiente en otro caso.
 * `ahoraHHMM` es la hora actual del reloj y solo cuenta en el último día de datos.
 */
export function agendaDelDia(
  config: ConfigAyni,
  lecturas: Lectura[],
  tripulanteId: string,
  dia: number,
  ahoraHHMM: string,
): TareaAgenda[] {
  const fecha = fechaDeDia(config, dia).slice(0, 10);
  const dow = diaSemana(fecha);
  const ultimoDia = dia >= config.tripulantes.generador.dias;
  const delDia = new Set(
    lecturas
      .filter((l) => l.tripulanteId === tripulanteId && diaDe(l.fechaHora) === fecha)
      .map((l) => l.indicador),
  );
  return config.rutina
    .filter((t) => t.franja !== 'semanal' || (t.diasSemana ?? []).includes(dow))
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .map((tarea) => {
      if (tarea.indicadores.some((i) => delDia.has(i))) return { tarea, estado: 'hecha' };
      const vencida = !ultimoDia || tarea.hora <= ahoraHHMM;
      return { tarea, estado: vencida ? 'atrasada' : 'pendiente' };
    });
}
