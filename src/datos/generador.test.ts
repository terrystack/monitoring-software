import { describe, expect, it } from 'vitest';
import { cargarConfig, type ConfigAyni } from '../config/esquemas';
import { crearAleatorio, generarLecturas, lecturasACsv } from './generador';
import { parsearCsv } from './cargarCsv';

function config(): ConfigAyni {
  const r = cargarConfig();
  if (!r.ok) throw new Error('config inválida');
  return r.config;
}

const cfg = config();
const lecturas = generarLecturas(cfg);
const de = (trip: string, ind: string, dia: number) => {
  const fecha = new Date(`${cfg.tripulantes.generador.fechaInicio}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dia - 1);
  const prefijo = fecha.toISOString().slice(0, 10);
  return lecturas.filter(
    (l) => l.tripulanteId === trip && l.indicador === ind && l.fechaHora.startsWith(prefijo),
  );
};

describe('generador sintético', () => {
  it('es reproducible con la misma semilla', () => {
    expect(lecturasACsv(generarLecturas(cfg))).toBe(lecturasACsv(lecturas));
    const a = crearAleatorio(1);
    const b = crearAleatorio(1);
    expect([a.gauss(), a.gauss()]).toEqual([b.gauss(), b.gauss()]);
  });

  it('genera 60 lecturas por tripulante y día, más la MHCL y la prueba metabólica semanales', () => {
    // 51 del flujo principal + 6 del PVT-B (velocidad, TR y estrés, al despertar y de noche)
    // + 3 de frecuencia respiratoria (Astroskin), + 3 subescalas de la MHCL cada domingo
    // + 4 de la prueba metabólica (PUMA) cada miércoles.
    const miercoles = new Set(
      lecturas
        .filter((l) => l.indicador === 'vo2' && l.tripulanteId === 'A01')
        .map((l) => l.fechaHora),
    ).size;
    expect(miercoles).toBe(4);
    expect(lecturas).toHaveLength(3 * (30 * 60 + 4 * 3 + miercoles * 4));
    expect(de('A01', 'co2_cabina', 1)).toHaveLength(24);
    expect(de('A01', 'hrv', 1)).toHaveLength(3);
    expect(de('A01', 'presion_sistolica', 1).map((l) => l.fechaHora)).toEqual([
      '2026-10-16T07:15:00Z',
    ]);
  });

  it('respeta la validación física de cada indicador', () => {
    const porId = new Map(cfg.indicadores.map((i) => [i.id, i]));
    for (const l of lecturas) {
      const v = porId.get(l.indicador)!.validacion;
      expect(l.valor).toBeGreaterThanOrEqual(v.min);
      expect(l.valor).toBeLessThanOrEqual(v.max);
    }
  });

  it('genera un pulso con contexto ejercicio a la hora del ejercicio', () => {
    const pulsos = de('A01', 'pulso_reposo', 3);
    expect(pulsos).toHaveLength(4);
    const ejercicio = pulsos.find((l) => l.contexto === 'ejercicio')!;
    expect(ejercicio.fechaHora).toBe('2026-10-18T16:00:00Z');
    expect(ejercicio.valor).toBeGreaterThan(90);
  });

  it('aplica los escenarios: fijar, rampa, multiplicar y acumulado', () => {
    expect(de('A02', 'co2_cabina', 28).every((l) => l.valor === 3.8)).toBe(true);
    expect(de('A02', 'cefalea', 28)[0].valor).toBe(2);
    expect(de('A01', 'sueno_horas', 21)[0].valor).toBe(6.4);
    expect(de('A01', 'sueno_horas', 25)[0].valor).toBe(5.1);
    expect(de('A02', 'ejercicio_min', 28)[0].valor).toBeLessThan(70);
    expect(de('A03', 'tasa_dosis_dia', 29)[0].valor).toBe(12);
    const antes = de('A03', 'dosis_radiacion', 28)[0].valor;
    const despues = de('A03', 'dosis_radiacion', 29)[0].valor;
    expect(despues - antes).toBeCloseTo(12, 1);
  });

  it('el CSV generado se vuelve a leer sin errores', () => {
    const r = parsearCsv(lecturasACsv(lecturas));
    expect(r.errores).toEqual([]);
    expect(r.lecturas).toEqual(lecturas);
  });
});
