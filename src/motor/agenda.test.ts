import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../config/esquemas';
import { fechaDeDia } from '../datos/generador';
import type { Lectura } from '../datos/tipos';
import { agendaDelDia, diaSemana } from './agenda';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config = resultado.config;
const ultimo = config.tripulantes.generador.dias;

const lec = (indicador: string, dia: number, tripulanteId = 'A01'): Lectura => ({
  tripulanteId,
  fechaHora: `${fechaDeDia(config, dia).slice(0, 10)}T07:05:00Z`,
  indicador,
  valor: 1,
  unidad: '',
  fuente: 'manual',
  contexto: 'reposo',
});

const estados = (agenda: ReturnType<typeof agendaDelDia>) =>
  Object.fromEntries(agenda.map((a) => [a.tarea.id, a.estado]));

describe('agenda del día', () => {
  it('día de la semana ISO', () => {
    expect(diaSemana('2026-11-16')).toBe(1);
    expect(diaSemana('2026-11-15')).toBe(7);
  });

  it('hecha si hay lectura de alguno de sus indicadores ese día y del mismo tripulante', () => {
    const agenda = agendaDelDia(
      config,
      [lec('hrv', 5), lec('presion_sistolica', 5, 'A02')],
      'A01',
      5,
      '00:00',
    );
    const e = estados(agenda);
    expect(e.pulso_hrv_despertar).toBe('hecha');
    expect(e.presion).toBe('atrasada');
  });

  it('en días anteriores al último todo lo no hecho está atrasado', () => {
    expect(Object.values(estados(agendaDelDia(config, [], 'A01', 5, '00:00')))).not.toContain(
      'pendiente',
    );
  });

  it('en el último día depende de la hora actual', () => {
    const e = estados(agendaDelDia(config, [], 'A01', ultimo, '12:00'));
    expect(e.presion).toBe('atrasada');
    expect(e.temperatura).toBe('pendiente');
  });

  it('las tareas semanales solo aparecen su día y la lista va por hora', () => {
    const agenda = agendaDelDia(config, [], 'A01', 5, '00:00');
    const fecha = fechaDeDia(config, 5).slice(0, 10);
    const semanales = config.rutina.filter(
      (t) => t.franja === 'semanal' && t.diasSemana?.includes(diaSemana(fecha)),
    );
    expect(agenda.filter((a) => a.tarea.franja === 'semanal')).toHaveLength(semanales.length);
    const horas = agenda.map((a) => a.tarea.hora);
    expect(horas).toEqual([...horas].sort());
  });
});
