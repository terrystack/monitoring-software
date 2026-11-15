import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { borrarLecturasManuales, guardarLecturaManual, leerLecturasManuales } from './almacen';
import type { Lectura } from './tipos';

const animo: Lectura = {
  tripulanteId: 'A01',
  fechaHora: '2026-11-14T22:00:00Z',
  indicador: 'animo',
  valor: 4,
  unidad: 'escala_1_5',
  fuente: 'manual',
  contexto: 'manual',
};

describe('almacen (IndexedDB)', () => {
  it('guarda, lee y borra lecturas manuales', async () => {
    await borrarLecturasManuales();
    expect(await leerLecturasManuales()).toEqual([]);
    await guardarLecturaManual(animo);
    await guardarLecturaManual({ ...animo, valor: 3 });
    expect((await leerLecturasManuales()).map((l) => l.valor)).toEqual([4, 3]);
    await borrarLecturasManuales();
    expect(await leerLecturasManuales()).toEqual([]);
  });
});
