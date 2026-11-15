import * as THREE from 'three';
import type { Dispositivo } from '../../config/esquemas';
import { ANCLAJES } from '../cuerpo/anclajes';
import { registroZonas } from '../interaccion/useSeleccionZona';

/** Sección elíptica del torso a la altura del chaleco (m). */
export interface MedidasTorso {
  rx: number;
  rz: number;
  cz: number;
}

export const ALTURA_CHALECO = { desde: 1.04, hasta: 1.44 };
const HOLGURA = 0.008;
const POR_DEFECTO: MedidasTorso = { rx: 0.165 + HOLGURA, rz: 0.12 + HOLGURA, cz: 0.01 };

/**
 * Mide la piel entre y = 1,0 y 1,45 (AYNI_FUSION.md §7.3): el fondo con los vértices
 * centrales y el ancho con los laterales hasta el primer hueco (los brazos cuelgan aparte).
 */
export function medirTorso(idZonaPiel: string | undefined): MedidasTorso {
  const mallas = idZonaPiel ? registroZonas.get(idZonaPiel)?.mallas : undefined;
  if (!mallas?.length) return POR_DEFECTO;
  const v = new THREE.Vector3();
  const zs: number[] = [];
  const laterales: { x: number; z: number }[] = [];
  for (const m of mallas) {
    const pos = (m as THREE.Mesh).geometry?.attributes.position;
    if (!pos) continue;
    m.updateWorldMatrix(true, false);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (v.y < 1.0 || v.y > 1.45) continue;
      if (Math.abs(v.x) < 0.1) zs.push(v.z);
      if (v.y > 1.12 && v.y < 1.36) laterales.push({ x: Math.abs(v.x), z: v.z });
    }
  }
  if (zs.length < 20) return POR_DEFECTO;
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const cz = (minZ + maxZ) / 2;
  const rz = (maxZ - minZ) / 2;
  const xs = laterales
    .filter((p) => Math.abs(p.z - cz) < rz * 0.45 && p.x > 0.1 && p.x < 0.3)
    .map((p) => p.x)
    .sort((a, b) => a - b);
  let rx = POR_DEFECTO.rx - HOLGURA;
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - xs[i - 1] > 0.008) {
      rx = xs[i - 1];
      break;
    }
    rx = xs[i];
  }
  return { rx: Math.min(rx, 0.2) + HOLGURA, rz: rz + HOLGURA, cz };
}

type Sensor = NonNullable<Dispositivo['sensores']>[number];

/** Posición 3D de un sensor: elipse del torso (altura, ángulo; 0° = frente, + = izquierda) o anclaje. */
export function posicionSensor(sensor: Sensor, t: MedidasTorso): THREE.Vector3 {
  if (sensor.posicion.tipo === 'anclaje') return ANCLAJES[sensor.posicion.anclaje].clone();
  const a = THREE.MathUtils.degToRad(sensor.posicion.angulo);
  const afuera = 0.006;
  return new THREE.Vector3(
    (t.rx + afuera) * Math.sin(a),
    sensor.posicion.altura,
    t.cz + (t.rz + afuera) * Math.cos(a),
  );
}
