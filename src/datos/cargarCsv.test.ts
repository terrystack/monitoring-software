import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cargarCsv, parsearCsv } from './cargarCsv';

const CABECERA = 'tripulante_id,fecha_hora,indicador,valor,unidad,fuente,contexto';
const VALIDO = `${CABECERA}
A01,2026-11-14T07:00:00Z,pulso_reposo,68,lpm,dispositivo,reposo
A01,2026-11-14T22:00:00Z,animo,4,escala_1_5,manual,noche
`;

describe('parsearCsv', () => {
  it('lee el formato largo de la sección 4.1', () => {
    const r = parsearCsv(VALIDO);
    expect(r.errores).toEqual([]);
    expect(r.lecturas[0]).toEqual({
      tripulanteId: 'A01',
      fechaHora: '2026-11-14T07:00:00Z',
      indicador: 'pulso_reposo',
      valor: 68,
      unidad: 'lpm',
      fuente: 'dispositivo',
      contexto: 'reposo',
    });
  });

  it('reporta las filas inválidas con su número de fila', () => {
    const r = parsearCsv(`${CABECERA}
A01,2026-11-14T07:00:00Z,pulso_reposo,abc,lpm,dispositivo,reposo
A01,14/11/2026,pulso_reposo,70,lpm,dispositivo,flotando
A01,2026-11-14T08:00:00Z,pulso_reposo,70,lpm,dispositivo,reposo
`);
    expect(r.lecturas).toHaveLength(1);
    expect(r.errores[0]).toEqual({ fila: 2, mensaje: 'valor no numérico' });
    expect(r.errores[1].fila).toBe(3);
    expect(r.errores[1].mensaje).toContain('fecha_hora debe ser ISO 8601 UTC');
  });

  it('avisa si faltan columnas', () => {
    const r = parsearCsv('tripulante_id,valor\nA01,3\n');
    expect(r.errores[0].mensaje).toContain('faltan columnas');
  });
});

describe('cargarCsv', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('usa la copia de IndexedDB cuando no hay conexión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(VALIDO)),
    );
    const enLinea = await cargarCsv();
    expect(enLinea.origen).toBe('red');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('sin red'))),
    );
    const sinRed = await cargarCsv();
    expect(sinRed.origen).toBe('cache');
    expect(sinRed.lecturas).toHaveLength(2);
  });
});
