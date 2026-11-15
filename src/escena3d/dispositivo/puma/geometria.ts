import * as THREE from 'three';
import {
  normalSuperficie,
  PERFIL_CABEZA,
  puntoSuperficie,
  seccionEn,
  type Perfil,
} from '../medidas';

export const MASCARA = { ax: 0.046, ay: 0.054, cy: 1.602, bombeo: 0.034 };
const INCLINACION = THREE.MathUtils.degToRad(35);
const LARGO_CANAL = 0.068;
export const CAJA = { y: 1.005, a: -112 };
export const CINTURON_Y = 0.985;
export const CENTRO_CABEZA = new THREE.Vector3(0, 1.665, 0.035);

/** z de la cara (elipse de la cabeza) en (x, y). */
export function zCara(x: number, y: number) {
  const s = seccionEn(PERFIL_CABEZA, y);
  const k = Math.min(0.98, Math.abs(x) / s.rx);
  return s.cz + s.rz * Math.sqrt(1 - k * k);
}

/** Punto de la máscara: u alrededor (0–1), v del vértice (0) al borde (1). */
export function puntoMascara(u: number, v: number, extra = 0) {
  const ang = u * Math.PI * 2;
  const phi = v * (Math.PI / 2);
  const x = MASCARA.ax * Math.cos(ang) * Math.sin(phi);
  const y = MASCARA.cy + MASCARA.ay * Math.sin(ang) * Math.sin(phi);
  return new THREE.Vector3(x, y, zCara(x, y) + 0.002 + MASCARA.bombeo * Math.cos(phi) + extra);
}

export function alinear(dir: THREE.Vector3) {
  return new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );
}

/** Geometría base compartida por el componente, los sensores y las pruebas. */
export function geometriaPuma(torso: Perfil) {
  const vertice = puntoMascara(0, 0);
  const manifold = vertice.clone().add(new THREE.Vector3(0, -0.006, 0.009));
  const inicio = manifold.clone().add(new THREE.Vector3(0, -0.014, 0.002));
  const canal = (lado: 1 | -1) => {
    const dir = new THREE.Vector3(
      lado * Math.sin(INCLINACION),
      -Math.cos(INCLINACION),
      -0.08,
    ).normalize();
    return {
      desde: inicio.clone(),
      hasta: inicio.clone().add(dir.clone().multiplyScalar(LARGO_CANAL)),
      dir,
    };
  };
  const izq = canal(1);
  const der = canal(-1);
  const en = (c: ReturnType<typeof canal>, t: number) => c.desde.clone().lerp(c.hasta, t);
  const nCaja = normalSuperficie(torso, CAJA.y, CAJA.a);
  const caja = puntoSuperficie(torso, CAJA.y, CAJA.a, 0.006 + 0.0175 + 0.004);
  return {
    vertice,
    manifold,
    izq,
    der,
    o2: en(izq, 0.32),
    co2: en(izq, 0.78),
    flujo: en(der, 0.55),
    caja,
    nCaja,
  };
}

export function puntosPuma(torso: Perfil): Record<string, THREE.Vector3> {
  const g = geometriaPuma(torso);
  return {
    o2: g.o2.clone().add(new THREE.Vector3(0.006, 0.006, 0.022)),
    co2_aliento: g.co2.clone().add(new THREE.Vector3(0.02, 0, 0.012)),
    flujo: g.flujo.clone().add(new THREE.Vector3(-0.022, 0, 0.012)),
    electronica: g.caja.clone().add(g.nCaja.clone().multiplyScalar(0.03)),
  };
}

export const VISTA_PUMA = {
  posicion: new THREE.Vector3(0.36, 1.66, 0.62),
  objetivo: new THREE.Vector3(0, 1.58, 0.06),
};
