import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../config/esquemas';
import type { PuntoSerie } from '../motor/series';
import { cruceProbable, predecir } from './prediccionSimple';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config = resultado.config;
const indicador = (id: string) => config.indicadores.find((i) => i.id === id)!;

const punto = (numDia: number, valor: number, banda: PuntoSerie['banda'] = null): PuntoSerie => ({
  dia: `d${numDia}`,
  numDia,
  valor,
  banda,
  fuera: false,
  manual: false,
});

describe('predicción simple', () => {
  it('sin al menos 5 días no predice', () => {
    expect(
      predecir(
        [1, 2, 3, 4].map((v, i) => punto(i + 1, v)),
        indicador('glucosa'),
      ),
    ).toBeNull();
  });

  it('una pendiente perfecta se proyecta exacta 7 días', () => {
    const serie = Array.from({ length: 14 }, (_, i) => punto(i + 1, 100 + 2 * (i + 1)));
    const p = predecir(serie, indicador('glucosa'))!;
    expect(p.pendientePorDia).toBeCloseTo(2);
    expect(p.puntos.map((x) => x.numDia)).toEqual([15, 16, 17, 18, 19, 20, 21]);
    expect(p.puntos[0].valor).toBeCloseTo(130);
    expect(p.puntos[6].valor).toBeCloseTo(142);
  });

  it('usa solo los últimos 14 días', () => {
    const serie = [
      ...Array.from({ length: 10 }, (_, i) => punto(i + 1, 500)),
      ...Array.from({ length: 14 }, (_, i) => punto(i + 11, 100)),
    ];
    expect(predecir(serie, indicador('glucosa'))!.puntos[0].valor).toBeCloseTo(100);
  });

  it('la banda se ensancha con el ruido', () => {
    const limpia = Array.from({ length: 14 }, (_, i) => punto(i + 1, 100));
    const ruidosa = limpia.map((p, i) => ({ ...p, valor: 100 + (i % 2 === 0 ? 8 : -8) }));
    const ancho = (s: PuntoSerie[]) => {
      const x = predecir(s, indicador('glucosa'))!.puntos[0];
      return x.sup - x.inf;
    };
    expect(ancho(ruidosa)).toBeGreaterThan(ancho(limpia));
    expect(ancho(limpia)).toBeGreaterThan(0);
  });

  it('acumulativos: proyecta la tasa diaria sin bajar del último valor', () => {
    const serie = Array.from({ length: 10 }, (_, i) => punto(i + 1, 300 + 0.4 * (i + 1)));
    const p = predecir(serie, indicador('dosis_radiacion'))!;
    expect(p.pendientePorDia).toBeCloseTo(0.4);
    expect(p.puntos[6].valor).toBeCloseTo(304 + 0.4 * 7);
    expect(p.puntos.every((x) => x.inf >= 304 - 1e-9)).toBe(true);
  });

  it('cruceProbable detecta el primer día predicho fuera de tu normal', () => {
    const banda = { media: 100, inf: 90, sup: 110 };
    const serie = Array.from({ length: 14 }, (_, i) => punto(i + 1, 96 + (i + 1), banda));
    const pred = predecir(serie, indicador('glucosa'));
    expect(cruceProbable(serie, pred, indicador('glucosa'))).toEqual({ dias: 1 });

    const plana = serie.map((p) => ({ ...p, valor: 100 }));
    expect(
      cruceProbable(plana, predecir(plana, indicador('glucosa')), indicador('glucosa')),
    ).toBeNull();
  });
});
