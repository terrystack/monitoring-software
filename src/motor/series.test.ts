import { describe, expect, it } from 'vitest';
import { cargarConfig, type Indicador } from '../config/esquemas';
import type { Lectura } from '../datos/tipos';
import { numeroDeDia, serieIndicador, umbralesDe } from './series';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config = resultado.config;
const indicador = (id: string) => config.indicadores.find((i) => i.id === id)!;
const inicio = config.tripulantes.generador.fechaInicio;

function fecha(dia: number): string {
  const d = new Date(`${inicio}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dia - 1);
  return d.toISOString().slice(0, 10);
}

function lec(ind: string, dia: number, valor: number, extra: Partial<Lectura> = {}): Lectura {
  return {
    tripulanteId: 'A01',
    fechaHora: `${fecha(dia)}T07:00:00Z`,
    indicador: ind,
    valor,
    unidad: indicador(ind).unidad,
    fuente: 'dispositivo',
    contexto: 'reposo',
    ...extra,
  };
}

const ref = (dia: number) => `${fecha(dia)}T23:59:59Z`;
const BASE = [60, 62, 61, 63, 59, 61, 62, 60, 61, 62];

describe('serie diaria con banda personal', () => {
  it('numera los días desde la fecha de inicio del generador', () => {
    expect(numeroDeDia(config, inicio)).toBe(1);
    expect(numeroDeDia(config, fecha(27))).toBe(27);
  });

  it('la banda es null con menos de minDias días previos', () => {
    const serie = serieIndicador(
      BASE.slice(0, 6).map((v, i) => lec('pulso_reposo', i + 1, v)),
      indicador('pulso_reposo'),
      config,
      ref(6),
    );
    expect(serie.slice(0, 5).every((p) => p.banda === null)).toBe(true);
    expect(serie[5].banda).not.toBeNull();
  });

  it('marca fuera según la dirección de riesgo', () => {
    const lecturas = [...BASE, 75].map((v, i) => lec('pulso_reposo', i + 1, v));
    const ambas = serieIndicador(lecturas, indicador('pulso_reposo'), config, ref(11));
    expect(ambas.at(-1)?.fuera).toBe(true);

    const soloBaja: Indicador = { ...indicador('pulso_reposo'), direccionRiesgo: 'baja' };
    expect(serieIndicador(lecturas, soloBaja, config, ref(11)).at(-1)?.fuera).toBe(false);
  });

  it('ignora lecturas en un contexto que el indicador descarta y marca las manuales', () => {
    const lecturas = [
      ...BASE.map((v, i) => lec('pulso_reposo', i + 1, v)),
      lec('pulso_reposo', 11, 140, { contexto: 'ejercicio' }),
      lec('pulso_reposo', 11, 61, { fuente: 'manual' }),
    ];
    const serie = serieIndicador(lecturas, indicador('pulso_reposo'), config, ref(11));
    expect(serie.at(-1)).toMatchObject({ numDia: 11, valor: 61, manual: true, fuera: false });
    expect(serie[0].manual).toBe(false);
  });

  it('no incluye lecturas posteriores a la fecha de referencia', () => {
    const lecturas = BASE.map((v, i) => lec('pulso_reposo', i + 1, v));
    expect(serieIndicador(lecturas, indicador('pulso_reposo'), config, ref(5))).toHaveLength(5);
  });

  it('un acumulado (presupuesto) no tiene banda personal', () => {
    const lecturas = Array.from({ length: 10 }, (_, i) => lec('dosis_radiacion', i + 1, 300 + i));
    const serie = serieIndicador(lecturas, indicador('dosis_radiacion'), config, ref(10));
    expect(serie.every((p) => p.banda === null && !p.fuera)).toBe(true);
  });

  it('umbrales fijos: presupuesto de radiación al 80 % y al 100 % de 600 mSv', () => {
    expect(umbralesDe(indicador('dosis_radiacion'))).toEqual([
      { valor: 480, estado: 'atencion' },
      { valor: 600, estado: 'critico' },
    ]);
    expect(umbralesDe(indicador('pulso_reposo'))).toEqual([]);
  });
});
