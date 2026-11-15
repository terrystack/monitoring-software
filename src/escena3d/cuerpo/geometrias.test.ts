import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { cargarConfig } from '../../config/esquemas';
import { zonaDeMalla } from '../interaccion/zonaDeMalla';
import { piezasDelCuerpo } from './geometrias';

const r = cargarConfig();
if (!r.ok) throw new Error('config inválida');
const { zonas } = r.config;

describe('geometrías del cuerpo procedural', () => {
  const piezas = piezasDelCuerpo(1);

  it('cada malla tiene un name único que casa con una zona de zonas.json', () => {
    const nombres = piezas.map((p) => p.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const nombre of nombres) expect(zonaDeMalla(nombre, zonas), nombre).not.toBeNull();
  });

  it('las geometrías no están vacías y caben en el cuerpo (0 a 1,85 m; el halo lo envuelve)', () => {
    for (const p of piezas) {
      if (p.nombre === 'halo_radiacion') continue;
      const geo = p.geometria;
      expect(geo.getAttribute('position').count, p.nombre).toBeGreaterThan(0);
      const caja = new THREE.Box3();
      if ('matrices' in p) {
        geo.computeBoundingBox();
        for (const m of p.matrices) caja.union(geo.boundingBox!.clone().applyMatrix4(m));
      } else {
        geo.computeBoundingBox();
        caja.copy(geo.boundingBox!);
        if (p.posicion) caja.translate(p.posicion);
      }
      expect(caja.min.y, p.nombre).toBeGreaterThanOrEqual(-0.01);
      expect(caja.max.y, p.nombre).toBeLessThanOrEqual(1.85);
      expect(Math.abs(caja.min.x), p.nombre).toBeLessThan(0.5);
    }
  });

  it('cubre todas las zonas de zonas.json', () => {
    const cubiertas = new Set(piezas.map((p) => zonaDeMalla(p.nombre, zonas)));
    for (const zona of zonas) expect(cubiertas.has(zona.id), zona.id).toBe(true);
  });

  it('menos calidad, menos vértices', () => {
    const vertices = (f: number) =>
      piezasDelCuerpo(f).reduce((s, p) => s + p.geometria.getAttribute('position').count, 0);
    expect(vertices(0.6)).toBeLessThan(vertices(1.5));
  });
});

describe('zonaDeMalla', () => {
  it('resuelve nombres exactos y comodines', () => {
    expect(zonaDeMalla('piel_cuerpo', zonas)).toBe('piel_inmune');
    expect(zonaDeMalla('hueso_femur_izq', zonas)).toBe('huesos');
    expect(zonaDeMalla('nervio_periferico_brazo_der', zonas)).toBe('nervios');
    expect(zonaDeMalla('organo_pulmon_izq', zonas)).toBe('pulmones');
    expect(zonaDeMalla('cuerpo', zonas)).toBeNull();
    expect(zonaDeMalla('organo_pulmon_izquierdo', zonas)).toBeNull();
  });
});
