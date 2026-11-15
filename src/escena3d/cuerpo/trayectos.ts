import * as THREE from 'three';

export const PARTICULA_ARTERIA = new THREE.Color('#FF8A8A');
export const PARTICULA_VENA = new THREE.Color('#7FB2FF');
export const MUESTRAS_TRAYECTO = 160;

/** Recorrido muestreado para mover partículas sin recalcular la curva en cada cuadro. */
export interface Trayecto {
  puntos: Float32Array;
  longitud: number;
  color: THREE.Color;
}

/** Remuestrea una polilínea (en el sentido del flujo) a puntos equiespaciados. */
export function trayectoDesdePuntos(puntos: THREE.Vector3[], tipo: 'arteria' | 'vena'): Trayecto {
  const curva = new THREE.CatmullRomCurve3(puntos);
  const muestras = curva.getSpacedPoints(MUESTRAS_TRAYECTO);
  return {
    puntos: new Float32Array(muestras.flatMap((p) => [p.x, p.y, p.z])),
    longitud: curva.getLength(),
    color: tipo === 'arteria' ? PARTICULA_ARTERIA : PARTICULA_VENA,
  };
}
