import * as THREE from 'three';
import { PROPORCIONES, punto } from './geometrias';

export type IdAnclaje =
  'muneca_izq' | 'muneca_der' | 'pecho' | 'brazo_izq' | 'dedo_indice' | 'frente';

const P = PROPORCIONES;

function entre(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  return a.clone().lerp(b, t);
}

/** Cámara de la "Vista frontal" (5.3). */
export const VISTA_FRONTAL = {
  posicion: [0, 1.12, 3.1] as [number, number, number],
  objetivo: [0, 0.95, 0] as [number, number, number],
};

/** Vista de tres cuartos (revisión con `?vista=34`). */
export const VISTA_TRES_CUARTOS = {
  posicion: [1.75, 1.3, 2.45] as [number, number, number],
  objetivo: VISTA_FRONTAL.objetivo,
};

/** Posiciones 3D (sobre la piel) para colocar el dispositivo y etiquetas (5.2). */
export const ANCLAJES: Record<IdAnclaje, THREE.Vector3> = {
  muneca_izq: entre(punto(P.codo, 1), punto(P.muneca, 1), 0.88).add(new THREE.Vector3(0, 0, 0.03)),
  muneca_der: entre(punto(P.codo, -1), punto(P.muneca, -1), 0.88).add(
    new THREE.Vector3(0, 0, 0.03),
  ),
  pecho: new THREE.Vector3(0, 1.3, 0.125),
  brazo_izq: entre(punto(P.hombro, 1), punto(P.codo, 1), 0.45).add(
    new THREE.Vector3(0.035, 0, 0.02),
  ),
  dedo_indice: entre(punto(P.muneca, 1), punto(P.puntaMano, 1), 0.95).add(
    new THREE.Vector3(0, 0, 0.02),
  ),
  frente: new THREE.Vector3(0, 1.71, 0.1),
};
