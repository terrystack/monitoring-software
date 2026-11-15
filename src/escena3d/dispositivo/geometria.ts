import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/* Geometrías reutilizables de los dispositivos (AYNI_DISPOSITIVOS_3D.md §3.1). */

/**
 * Superficie paramétrica (u, v ∈ [0, 1]) con índices y normales. `visible(u, v)` permite
 * recortar caras (sisas, escotes); `cerradaU` une la última columna con la primera.
 */
export function superficie(
  fn: (u: number, v: number) => THREE.Vector3,
  nu: number,
  nv: number,
  opciones: { cerradaU?: boolean; visible?: (u: number, v: number) => boolean } = {},
): THREE.BufferGeometry {
  const { cerradaU = false, visible } = opciones;
  const columnas = cerradaU ? nu : nu + 1;
  const pos: number[] = [];
  const uv: number[] = [];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i < columnas; i++) {
      const p = fn(i / nu, j / nv);
      pos.push(p.x, p.y, p.z);
      uv.push(i / nu, j / nv);
    }
  }
  const idx: number[] = [];
  const id = (i: number, j: number) => j * columnas + (i % columnas);
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      if (visible && !visible((i + 0.5) / nu, (j + 0.5) / nv)) continue;
      const a = id(i, j);
      const b = id(i + 1, j);
      const c = id(i + 1, j + 1);
      const d = id(i, j + 1);
      idx.push(a, b, d, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Cinta plana que sigue una curva (correas, bandas, cinturón). `afuera(p)` da la normal de la
 * superficie que la cinta cubre; el ancho se reparte a ambos lados de la curva.
 */
export function cinta(
  puntos: THREE.Vector3[],
  afuera: (p: THREE.Vector3) => THREE.Vector3,
  ancho: number,
  cerrada = false,
  segmentos = 96,
): THREE.BufferGeometry {
  const curva = new THREE.CatmullRomCurve3(puntos, cerrada, 'centripetal');
  const n = segmentos;
  const pos: number[] = [];
  const tangente = new THREE.Vector3();
  const lado = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const t = cerrada ? (i % n) / n : i / n;
    const p = curva.getPointAt(t);
    curva.getTangentAt(t, tangente);
    const nrm = afuera(p);
    lado
      .crossVectors(tangente, nrm)
      .normalize()
      .multiplyScalar(ancho / 2);
    pos.push(p.x + lado.x, p.y + lado.y, p.z + lado.z, p.x - lado.x, p.y - lado.y, p.z - lado.z);
  }
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Tubo por puntos (cables, fibra óptica). */
export function tubo(puntos: THREE.Vector3[], radio: number, cerrado = false, segmentos = 64) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(puntos, cerrado, 'centripetal'),
    segmentos,
    radio,
    8,
    cerrado,
  );
}

/** Libera geometrías al desmontar o al cambiar las medidas. */
export function useGeometrias<T extends Record<string, THREE.BufferGeometry>>(
  crear: () => T,
  deps: unknown[],
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(crear, deps);
  useEffect(() => () => Object.values(g).forEach((x) => x.dispose()), [g]);
  return g;
}
