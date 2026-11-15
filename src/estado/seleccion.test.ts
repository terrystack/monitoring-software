import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../config/esquemas';
import { configEnIdioma } from '../config/idioma';
import { generarLecturas } from '../datos/generador';
import { configConEntorno, diaMision, evaluarSeleccion, resolverSeleccion } from './seleccion';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config = resultado.config;
const lecturas = generarLecturas(config);
const vacia = { tripulanteId: null, entornoId: null, dia: null };

const noNormales = (zonas: Record<string, { estado: string }>) =>
  Object.fromEntries(
    Object.entries(zonas)
      .filter(([, z]) => z.estado !== 'normal' && z.estado !== 'sin_dato')
      .map(([id, z]) => [id, z.estado]),
  );

describe('selección de tripulante, entorno y día', () => {
  it('sin elección abre en el escenario inicial con el entorno del tripulante', () => {
    expect(resolverSeleccion(config, vacia)).toEqual({
      tripulanteId: 'A01',
      entornoId: 'base_marciana',
      dia: 27,
    });
  });

  it('ignora ids que ya no existen y limita el día al rango de datos', () => {
    const sel = resolverSeleccion(config, { tripulanteId: 'X9', entornoId: 'luna', dia: 99 });
    expect(sel).toEqual({ tripulanteId: 'A01', entornoId: 'base_marciana', dia: 30 });
  });

  it('el día de misión parte de diaMisionInicial', () => {
    expect(diaMision(config, { tripulanteId: 'A01', entornoId: 'base_marciana', dia: 1 })).toBe(
      113,
    );
    expect(diaMision(config, { tripulanteId: 'A01', entornoId: 'base_marciana', dia: 27 })).toBe(
      139,
    );
  });

  it('cambiar de tripulante o de día recolorea las zonas', () => {
    const fatiga = evaluarSeleccion(lecturas, config, resolverSeleccion(config, vacia));
    expect(noNormales(fatiga.zonas)).toEqual({ corazon: 'atencion', cerebro: 'atencion' });

    const kenji = evaluarSeleccion(lecturas, config, {
      tripulanteId: 'A02',
      entornoId: 'base_marciana',
      dia: 28,
    });
    expect(kenji.tripulanteId).toBe('A02');
    expect(noNormales(kenji.zonas)).toMatchObject({ pulmones: 'atencion', cerebro: 'atencion' });

    const antes = evaluarSeleccion(lecturas, config, {
      tripulanteId: 'A01',
      entornoId: 'base_marciana',
      dia: 26,
    });
    expect(antes.alertas).toEqual([]);
  });

  it('el entorno elegido solo cambia el entorno del tripulante seleccionado', () => {
    const sel = { tripulanteId: 'A02', entornoId: 'estacion', dia: 10 };
    const c = configConEntorno(config, sel);
    expect(c.tripulantes.tripulantes.map((t) => t.entorno)).toEqual([
      'base_marciana',
      'estacion',
      'base_marciana',
    ]);
  });

  it('en inglés el motor redacta las tarjetas en inglés', () => {
    const en = configEnIdioma(config, 'en');
    const m = evaluarSeleccion(lecturas, en, resolverSeleccion(en, vacia));
    expect(m.zonas.corazon.tarjeta.queCambio.startsWith('Possible built-up fatigue:')).toBe(true);
    expect(m.zonas.corazon.tarjeta.queCambio).toContain('your normal is');
  });
});
