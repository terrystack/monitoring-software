import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../config/esquemas';
import { generarLecturas } from '../datos/generador';
import {
  barajar,
  lecturasDeSesionMhcl,
  mhclCompleta,
  puntuarMhcl,
  referenciaSubescala,
} from './mhcl';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config = resultado.config;
const { mhcl } = config.evaluaciones;

describe('MHCL', () => {
  it('tiene 23 ítems de 0 a 10 repartidos en 3 subescalas', () => {
    expect(mhcl.items).toHaveLength(23);
    expect([mhcl.escalaMin, mhcl.escalaMax]).toEqual([0, 10]);
    const porSub = Object.fromEntries(
      mhcl.subescalas.map((s) => [s.id, mhcl.items.filter((i) => i.subescala === s.id).length]),
    );
    expect(porSub).toEqual({ adaptacion: 11, autorregulacion: 5, aprension: 7 });
  });

  it('el puntaje de cada subescala es el promedio de sus ítems', () => {
    const respuestas = Object.fromEntries(
      mhcl.items.map((i) => [i.id, i.subescala === 'adaptacion' ? 8 : 2]),
    );
    respuestas.preocupado = 9;
    const p = Object.fromEntries(puntuarMhcl(mhcl, respuestas).map((x) => [x.id, x.promedio]));
    expect(p.adaptacion).toBe(8);
    expect(p.autorregulacion).toBe(2);
    expect(p.aprension).toBeCloseTo((2 * 6 + 9) / 7);
    expect(mhclCompleta(mhcl, respuestas)).toBe(true);
    delete respuestas.preocupado;
    expect(mhclCompleta(mhcl, respuestas)).toBe(false);
  });

  it('baraja los ítems sin perder ninguno', () => {
    const ids = mhcl.items.map((i) => i.id);
    let semilla = 7;
    const aleatorio = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
    const b = barajar(ids, aleatorio);
    expect(b).not.toEqual(ids);
    expect([...b].sort()).toEqual([...ids].sort());
  });

  it('la referencia de subescala sale de las medias de la tabla 3', () => {
    expect(referenciaSubescala(mhcl, 'autorregulacion')).toBeCloseTo(
      (5.81 + 5.32 + 5.21 + 4.66 + 5.24) / 5,
    );
  });

  it('cada sesión deja una lectura por subescala en su indicador', () => {
    const respuestas = Object.fromEntries(mhcl.items.map((i) => [i.id, 5]));
    const l = lecturasDeSesionMhcl(config, {
      id: 'x',
      tripulanteId: 'A01',
      fechaHora: '2026-11-15T10:30:00Z',
      orden: [],
      respuestas,
      puntajes: puntuarMhcl(mhcl, respuestas),
    });
    expect(l.map((x) => [x.indicador, x.valor])).toEqual([
      ['mhcl_adaptacion', 5],
      ['mhcl_autorregulacion', 5],
      ['mhcl_aprension', 5],
    ]);
  });
});

describe('datos sintéticos de Evaluaciones', () => {
  const lecturas = generarLecturas(config).filter((l) => l.tripulanteId === 'A01');
  it('el PVT-B va a las 07:00 al despertar y a las 21:00 de noche, cada día', () => {
    const pvt = lecturas.filter((l) => l.indicador === 'velocidad_respuesta');
    expect(pvt).toHaveLength(60);
    expect(new Set(pvt.map((l) => `${l.fechaHora.slice(11, 16)} ${l.contexto}`))).toEqual(
      new Set(['07:00 despertar', '21:00 noche']),
    );
  });
  it('la velocidad sintética es 1000 / TR de la misma toma', () => {
    const tr = lecturas.find((l) => l.indicador === 'tiempo_reaccion')!;
    const v = lecturas.find(
      (l) => l.indicador === 'velocidad_respuesta' && l.fechaHora === tr.fechaHora,
    )!;
    expect(v.valor).toBeCloseTo(1000 / tr.valor, 2);
  });
  it('la MHCL va una vez por semana (domingo)', () => {
    const m = lecturas.filter((l) => l.indicador === 'mhcl_aprension');
    expect(m.map((l) => new Date(l.fechaHora).getUTCDay())).toEqual([0, 0, 0, 0]);
  });
});
