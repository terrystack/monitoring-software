import { describe, expect, it } from 'vitest';
import { construirTarjeta } from '../motor/tarjetaAccion';
import { cargarConfig, type ConfigAyni } from './esquemas';
import {
  configEnIdioma,
  esquemaTraduccion,
  faltantesTraduccion,
  TRADUCCIONES,
  traducirConfig,
} from './idioma';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config base inválida');
const base: ConfigAyni = resultado.config;

describe('traducción al inglés', () => {
  const tr = esquemaTraduccion.parse(TRADUCCIONES.en);

  it('cubre todos los ids y listas de la configuración base', () => {
    expect(faltantesTraduccion(base, tr)).toEqual([]);
  });

  it('detecta ids que faltan y listas de otro largo', () => {
    const { corazon: _omitida, ...zonas } = tr.zonas;
    const incompleta = {
      ...tr,
      zonas,
      indicadores: {
        ...tr.indicadores,
        hrv: { ...tr.indicadores.hrv, acciones: ['Only one.'] },
      },
    };
    expect(faltantesTraduccion(base, incompleta)).toEqual([
      'zonas.corazon: falta',
      'indicadores.hrv.acciones: 1 elementos, se esperaban 3',
    ]);
  });

  it('traduce textos sin tocar ids, umbrales ni colores', () => {
    const en = traducirConfig(base, tr);
    expect(en.zonas.find((z) => z.id === 'corazon')?.nombre).toBe('Heart');
    expect(en.escena.textos.pestanaCuerpo).toBe('3D Body');
    expect(en.escena.estados.map((e) => e.color)).toEqual(base.escena.estados.map((e) => e.color));
    expect(en.indicadores.map((i) => i.reglas)).toEqual(base.indicadores.map((i) => i.reglas));
    expect(en.zonas.map((z) => z.mallas)).toEqual(base.zonas.map((z) => z.mallas));
  });

  it('el motor redacta en el idioma de la configuración', () => {
    const en = configEnIdioma(base, 'en');
    const zona = en.zonas[0];
    const tarjeta = construirTarjeta({
      zona,
      estado: 'sin_dato',
      indicadores: en.indicadores,
      evaluaciones: {},
      frases: en.frases,
    });
    expect(tarjeta.queCambio).toBe('There are no measurements for this zone yet.');
    expect(configEnIdioma(base, 'es')).toBe(base);
  });
});
