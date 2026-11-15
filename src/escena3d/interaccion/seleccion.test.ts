import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cargarConfig } from '../../config/esquemas';
import { zonaDesdeIntersecciones } from './useSeleccionZona';

const r = cargarConfig();
if (!r.ok) throw new Error('config inválida');
const { zonas } = r.config;

const malla = (nombre: string, visible = true) => {
  const m = new THREE.Mesh();
  m.name = nombre;
  m.visible = visible;
  return { object: m };
};

describe('zonaDesdeIntersecciones', () => {
  const halo = malla('halo_radiacion');
  const piel = malla('piel_cuerpo');
  const craneo = malla('hueso_craneo');
  const cerebro = malla('nervio_cerebro');

  it('prefiere la estructura interna visible más cercana', () => {
    expect(
      zonaDesdeIntersecciones([halo, piel, craneo, cerebro], zonas, { esqueleto: 'visible' }),
    ).toBe('huesos');
  });

  it('atraviesa las capas internas semitransparentes', () => {
    expect(
      zonaDesdeIntersecciones([halo, piel, craneo, cerebro], zonas, { esqueleto: 'translucida' }),
    ).toBe('cerebro');
    expect(zonaDesdeIntersecciones([halo, piel, craneo], zonas, { esqueleto: 'translucida' })).toBe(
      'huesos',
    );
  });

  it('la piel gana al halo y el halo solo se elige si no hay nada más', () => {
    expect(zonaDesdeIntersecciones([halo, piel], zonas)).toBe('piel_inmune');
    expect(zonaDesdeIntersecciones([halo], zonas)).toBe('todo_cuerpo');
  });

  it('un vaso no tapa la estructura que tiene justo detrás', () => {
    const vaso = { ...malla('vaso_arteria_cabeza'), distance: 2.5 };
    const cerebroCerca = { ...malla('nervio_cerebro'), distance: 2.51 };
    const pulmonLejos = { ...malla('organo_pulmon_izq'), distance: 2.7 };
    expect(zonaDesdeIntersecciones([vaso, cerebroCerca], zonas)).toBe('cerebro');
    expect(zonaDesdeIntersecciones([vaso, pulmonLejos], zonas)).toBe('vascular');
    expect(zonaDesdeIntersecciones([vaso], zonas)).toBe('vascular');
  });

  it('ignora mallas ocultas y sin zona', () => {
    expect(
      zonaDesdeIntersecciones([malla('hueso_craneo', false), malla('fondo'), piel], zonas),
    ).toBe('piel_inmune');
    expect(zonaDesdeIntersecciones([], zonas)).toBeNull();
  });
});
