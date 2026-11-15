import * as THREE from 'three';
import { normalSuperficie, puntoSuperficie, type Perfil } from '../medidas';

export const HOLGURA = 0.006;
export const ALTO = { desde: 0.975, hasta: 1.47 };
export const ELECTRODOS: { id: string; y: number; a: number }[] = [
  { id: 'RA', y: 1.4, a: -30 },
  { id: 'LA', y: 1.4, a: 30 },
  { id: 'LL', y: 1.12, a: 35 },
  { id: 'RL', y: 1.12, a: -35 },
];
export const RIP = [1.27, 1.08];
export const TEMP = { y: 1.25, a: 88 };
export const BOLSILLO = { y: 1.05, a: 95 };
export const BANDA_CABEZA_Y = 1.715;

/** Borde superior de la tela en cada ángulo: sisas a los lados, escote delante y detrás. */
export function bordeSuperior(anguloGrados: number): number {
  const a = THREE.MathUtils.degToRad(anguloGrados);
  const s = Math.abs(Math.sin(a));
  const c = Math.cos(a);
  let y = ALTO.hasta;
  if (s > 0.78) y = Math.min(y, 1.3 + 0.17 * ((1 - s) / 0.22) ** 1.6);
  if (c > 0.62) y = Math.min(y, 1.39 + 0.08 * ((1 - c) / 0.38) ** 1.6);
  if (c < -0.7) y = Math.min(y, 1.435 + 0.035 * ((1 + c) / 0.3) ** 1.6);
  return y;
}

export function orientar(normal: THREE.Vector3) {
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
}

/** Posiciones (mundo) de las piezas que llevan sensor. */
export function puntosAstroskin(perfil: Perfil): Record<string, THREE.Vector3> {
  const n = normalSuperficie(perfil, BOLSILLO.y + 0.03, BOLSILLO.a);
  return {
    registrador: puntoSuperficie(perfil, BOLSILLO.y + 0.03, BOLSILLO.a, HOLGURA + 0.03).add(
      n.multiplyScalar(0.004),
    ),
  };
}

export const VISTA_ASTROSKIN = {
  posicion: new THREE.Vector3(0.5, 1.5, 1.45),
  objetivo: new THREE.Vector3(0, 1.36, 0),
};

/** Alturas que cubre la camiseta (para las pruebas). */
export const ZONA_CAMISETA = ALTO;
