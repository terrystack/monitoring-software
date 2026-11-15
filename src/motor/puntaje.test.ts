import { describe, expect, it } from 'vitest';
import type { EstadoMotor, EstadoZona, TarjetaAccion } from '../datos/tipos';
import { estadoDePuntaje, puntajeGeneral, zonasFuera } from './puntaje';

const zonas = (estados: Record<string, EstadoZona>): EstadoMotor['zonas'] =>
  Object.fromEntries(
    Object.entries(estados).map(([id, estado]) => [id, { estado, tarjeta: {} as TarjetaAccion }]),
  );

const alerta = {
  id: 'fatiga',
  nombre: '',
  estado: 'atencion' as const,
  zonas: [],
  indicadores: [],
};

describe('puntaje general', () => {
  it('resta 10 por zona en atención, 25 por crítica y 5 por alerta multiseñal', () => {
    const m = {
      zonas: zonas({
        corazon: 'atencion',
        cerebro: 'atencion',
        pulmones: 'critico',
        huesos: 'normal',
      }),
      alertas: [alerta],
    };
    expect(puntajeGeneral(m)).toBe(100 - 20 - 25 - 5);
  });

  it('nunca baja de 0 y sin dato no resta', () => {
    const muchas = zonas(
      Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`z${i}`, 'critico'])),
    );
    expect(puntajeGeneral({ zonas: muchas, alertas: [] })).toBe(0);
    expect(puntajeGeneral({ zonas: zonas({ rinones: 'sin_dato' }), alertas: [] })).toBe(100);
  });

  it('color del puntaje y zonas fuera, críticas primero', () => {
    expect([80, 79, 55, 54].map(estadoDePuntaje)).toEqual([
      'normal',
      'atencion',
      'atencion',
      'critico',
    ]);
    expect(
      zonasFuera({ zonas: zonas({ corazon: 'atencion', pulmones: 'critico', huesos: 'normal' }) }),
    ).toEqual(['pulmones', 'corazon']);
  });
});
