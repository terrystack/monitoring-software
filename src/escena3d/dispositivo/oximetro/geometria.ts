import * as THREE from 'three';
import { base, DEDO_INDICE_IZQ } from '../medidas';

const MARCO = base(DEDO_INDICE_IZQ.eje, DEDO_INDICE_IZQ.dorso);
export const ROTACION = new THREE.Quaternion().setFromRotationMatrix(MARCO);
const Y_LOCAL = new THREE.Vector3(0, 1, 0).applyQuaternion(ROTACION);

/** Posiciones (mundo) de las piezas que llevan sensor. */
export function puntosOximetro(): Record<string, THREE.Vector3> {
  return {
    pinza: DEDO_INDICE_IZQ.centro
      .clone()
      .add(Y_LOCAL.clone().multiplyScalar(-0.03))
      .add(DEDO_INDICE_IZQ.eje.clone().multiplyScalar(-0.02)),
  };
}

/** Vista de cámara para el oxímetro (mano izquierda, desde el lado y el frente). */
export const VISTA_OXIMETRO = {
  posicion: new THREE.Vector3(0.5, 0.8, 0.3),
  objetivo: DEDO_INDICE_IZQ.centro.clone(),
};
