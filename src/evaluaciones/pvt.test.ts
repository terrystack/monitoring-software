import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../config/esquemas';
import { agendaDelDia } from '../motor/agenda';
import {
  lecturasDeSesionPvt,
  momentoSugerido,
  resumirPvt,
  SesionPvt,
  type IntentoPvt,
  type SesionPvtGuardada,
} from './pvt';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config = resultado.config;
const p = config.evaluaciones.pvt;
const umbrales = { umbralLapsoMs: 355, umbralFalsaMs: 130 };

const resp = (rt: number): IntentoPvt => ({
  trial: 1,
  type: 'response',
  rt_ms: rt,
  delay_ms: 1000,
  t_ms: 0,
  cell: 0,
});

describe('configuración del PVT-B', () => {
  it('usa la pareja de umbrales del artículo y dura 3 minutos', () => {
    expect([p.umbralLapsoMs, p.umbralFalsaMs]).toEqual([355, 130]);
    expect(p.duracionS).toBe(180);
    expect(p.maxRespuestaMs).toBe(30_000);
    expect([p.filas, p.columnas]).toEqual([7, 7]);
  });
});

describe('resumen del PVT-B', () => {
  it('velocidad = promedio de 1000/TR; 250 ms equivale a 4.0', () => {
    expect(resumirPvt([resp(250)], umbrales).velocidad).toBeCloseTo(4);
    const r = resumirPvt([resp(200), resp(250)], umbrales);
    expect(r.velocidad).toBeCloseTo((5 + 4) / 2);
    expect(r.trMedioMs).toBe(225);
  });

  it('lapsos: TR ≥ 355 ms más las no respondidas', () => {
    const timeout: IntentoPvt = { ...resp(0), type: 'timeout', rt_ms: null };
    const r = resumirPvt([resp(354), resp(355), resp(600), timeout], umbrales);
    expect(r.lapsos).toBe(3);
    expect(r.estimulos).toBe(4);
  });

  it('salidas en falso: sin estímulo o TR < 130 ms, y no entran en la velocidad', () => {
    const sinEstimulo: IntentoPvt = { ...resp(0), type: 'false_start', rt_ms: null, cell: null };
    const r = resumirPvt([sinEstimulo, resp(90), resp(250)], umbrales);
    expect(r.salidasFalsas).toBe(2);
    expect(r.respuestasValidas).toBe(1);
    expect(r.velocidad).toBeCloseTo(4);
  });

  it('se puede recalcular con otros umbrales (PsyToolkit: 500/100)', () => {
    const intentos = [resp(110), resp(400)];
    expect(resumirPvt(intentos, umbrales)).toMatchObject({ lapsos: 1, salidasFalsas: 1 });
    expect(resumirPvt(intentos, { umbralLapsoMs: 500, umbralFalsaMs: 100 })).toMatchObject({
      lapsos: 0,
      salidasFalsas: 0,
    });
  });

  it('sin respuestas válidas no hay velocidad', () => {
    expect(resumirPvt([], umbrales)).toMatchObject({ velocidad: null, trMedioMs: null, lapsos: 0 });
  });
});

describe('sesión del PVT-B', () => {
  /** Aleatorio fijo: espera = min + 0.5·(max−min) = 1500 ms; casilla = ⌊0.5·49⌋ = 24. */
  const nueva = () => {
    const s = new SesionPvt(p, () => 0.5);
    s.iniciar(0);
    return s;
  };

  it('enciende una casilla tras la espera y mide el TR desde ese cuadro', () => {
    const s = nueva();
    expect(s.avanzar(1499)).toBe('espera');
    expect(s.avanzar(1500)).toBe('estimulo');
    expect(s.celda).toBe(24);
    expect(s.contador(1620)).toBe(100); // contador en pasos de 50 ms
    s.pulsar(1750, 24);
    expect(s.intentos).toEqual([
      { trial: 1, type: 'response', rt_ms: 250, delay_ms: 1500, t_ms: 1750, cell: 24 },
    ]);
    expect(s.fase).toBe('retro');
    expect(s.contador(2000)).toBe(250);
    expect(s.avanzar(2749)).toBe('retro');
    expect(s.avanzar(2750)).toBe('espera');
  });

  it('presionar sin estímulo es salida en falso y la prueba sigue', () => {
    const s = nueva();
    s.pulsar(300);
    s.pulsar(600);
    expect(s.intentos.map((i) => i.type)).toEqual(['false_start', 'false_start']);
    expect(s.avanzar(1500)).toBe('estimulo');
  });

  it('con estímulo solo cuenta tocar la casilla encendida; el teclado siempre vale', () => {
    const s = nueva();
    s.avanzar(1500);
    s.pulsar(1700, 3); // otra casilla: se ignora y el estímulo sigue
    expect(s.intentos).toEqual([]);
    expect(s.fase).toBe('estimulo');
    s.pulsar(1800, 24);
    expect(s.intentos).toMatchObject([{ type: 'response', rt_ms: 300, cell: 24 }]);
    s.avanzar(2800);
    s.avanzar(4300);
    s.pulsar(4600);
    expect(s.intentos[1]).toMatchObject({ type: 'response', rt_ms: 300 });
  });

  it('sin respuesta en 30 s registra un lapso y continúa', () => {
    const s = nueva();
    s.avanzar(1500);
    expect(s.avanzar(31_499)).toBe('estimulo');
    expect(s.avanzar(31_500)).toBe('espera');
    expect(s.intentos).toMatchObject([{ type: 'timeout', rt_ms: null, t_ms: 31_500 }]);
  });

  it('termina exactamente a los 180 s y descarta el estímulo a medias', () => {
    const s = nueva();
    let t = 0;
    while (s.avanzar(t) !== 'fin') {
      if (s.fase === 'estimulo' && s.contador(t)! >= 250) s.pulsar(t);
      t += 10;
    }
    expect(t).toBe(180_000);
    expect(s.restanteMs(t)).toBe(0);
    expect(s.intentos.every((i) => i.t_ms < 180_000)).toBe(true);
    expect(s.intentos.length).toBeGreaterThan(60);
    s.pulsar(t + 5);
    expect(s.fase).toBe('fin');
  });
});

describe('sesión guardada', () => {
  const guardada: SesionPvtGuardada = {
    id: 'x',
    tripulanteId: 'A01',
    fechaHora: '2026-11-14T07:02:00Z',
    momento: 'despertar',
    contexto: 'despertar',
    entrada: 'teclado',
    estres: 45,
    horasSueno: 6.5,
    duracionS: 180,
    umbrales,
    cuadricula: { filas: 7, columnas: 7 },
    resumen: resumirPvt([resp(240), resp(250)], umbrales),
    intentos: [resp(240), resp(250)],
  };

  it('el estrés y el PVT-B quedan en el mismo registro y alimentan al motor', () => {
    const l = lecturasDeSesionPvt(config, guardada);
    expect(Object.fromEntries(l.map((x) => [x.indicador, x.valor]))).toEqual({
      estres: 45,
      tiempo_reaccion: 245,
      velocidad_respuesta: 4.08,
    });
    expect(new Set(l.map((x) => x.contexto))).toEqual(new Set(['despertar']));
  });

  it('la tarea de la mañana se marca hecha solo con lecturas al despertar', () => {
    const dia = config.tripulantes.generador.dias;
    const fecha = new Date(`${config.tripulantes.generador.fechaInicio}T00:00:00Z`);
    fecha.setUTCDate(fecha.getUTCDate() + dia - 1);
    const lecturas = lecturasDeSesionPvt(config, {
      ...guardada,
      tripulanteId: 'Z99',
      fechaHora: `${fecha.toISOString().slice(0, 10)}T07:05:00Z`,
    });
    const estados = Object.fromEntries(
      agendaDelDia(config, lecturas, 'Z99', dia, '23:00').map((t) => [t.tarea.id, t.estado]),
    );
    expect(estados.pvt_despertar).toBe('hecha');
    expect(estados.pvt_noche).toBe('atrasada');
  });
});

describe('momento sugerido', () => {
  it('elige el horario de rutina más cercano', () => {
    expect(momentoSugerido(config, '06:40')).toBe('despertar');
    expect(momentoSugerido(config, '12:00')).toBe('despertar');
    expect(momentoSugerido(config, '20:30')).toBe('noche');
    expect(momentoSugerido(config, '02:00')).toBe('despertar');
  });
});
