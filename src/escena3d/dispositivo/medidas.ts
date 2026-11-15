import * as THREE from 'three';
import { registroZonas } from '../interaccion/useSeleccionZona';

/**
 * Medidas del cuerpo para colocar los dispositivos (AYNI_DISPOSITIVOS_3D.md §3.4).
 * Coordenadas del cuerpo en metros: +x = izquierda del astronauta, +z = frente.
 * Los perfiles por defecto se midieron sobre `cuerpo.glb` (piel_cuerpo); si la malla de piel
 * está cargada se recalculan con `medirPerfil`.
 */

/** Sección elíptica a una altura: semiejes y centro en z. */
export interface Seccion {
  y: number;
  rx: number;
  rz: number;
  cz: number;
}

export type Perfil = Seccion[];

const sec = (y: number, rx: number, zmin: number, zmax: number): Seccion => ({
  y,
  rx,
  rz: (zmax - zmin) / 2,
  cz: (zmax + zmin) / 2,
});

/** Torso de la piel (y 0,94–1,50). */
export const PERFIL_TORSO: Perfil = [
  sec(0.94, 0.16, -0.112, 0.113),
  sec(1.0, 0.152, -0.105, 0.115),
  sec(1.06, 0.142, -0.078, 0.119),
  sec(1.1, 0.139, -0.071, 0.116),
  sec(1.2, 0.144, -0.081, 0.122),
  sec(1.26, 0.158, -0.087, 0.122),
  sec(1.3, 0.165, -0.087, 0.122),
  sec(1.36, 0.165, -0.086, 0.105),
  sec(1.42, 0.163, -0.077, 0.082),
  sec(1.46, 0.158, -0.063, 0.062),
  sec(1.5, 0.15, -0.053, 0.068),
];

/** Cabeza de la piel (y 1,56–1,76). */
export const PERFIL_CABEZA: Perfil = [
  sec(1.56, 0.056, -0.036, 0.136),
  sec(1.58, 0.06, -0.035, 0.138),
  sec(1.6, 0.071, -0.04, 0.148),
  sec(1.62, 0.076, -0.054, 0.153),
  sec(1.64, 0.0785, -0.061, 0.146),
  sec(1.66, 0.079, -0.066, 0.136),
  sec(1.68, 0.073, -0.066, 0.137),
  sec(1.7, 0.0715, -0.066, 0.136),
  sec(1.72, 0.069, -0.059, 0.13),
  sec(1.74, 0.063, -0.046, 0.119),
  sec(1.76, 0.049, -0.023, 0.095),
];

/** Puntos de la cara medidos en la piel. */
export const CARA = {
  /** Punta de la nariz. */
  nariz: new THREE.Vector3(0, 1.622, 0.153),
  /** Centro de la boca. */
  boca: new THREE.Vector3(0, 1.588, 0.14),
  /** Mentón. */
  menton: new THREE.Vector3(0, 1.556, 0.134),
  /** Centro de la frente. */
  frente: new THREE.Vector3(0, 1.71, 0.136),
  coronilla: 1.778,
};

/**
 * Índice izquierdo (la mano cuelga con la palma hacia el muslo): centro de la falange distal,
 * eje hacia la punta y dirección del dorso (uña).
 */
export const DEDO_INDICE_IZQ = {
  centro: new THREE.Vector3(0.285, 0.75, 0.134),
  eje: new THREE.Vector3(-0.22, -0.91, 0.35).normalize(),
  dorso: new THREE.Vector3(1, 0, 0),
};

/** Sección interpolada del perfil a la altura `y` (se satura en los extremos). */
export function seccionEn(perfil: Perfil, y: number): Seccion {
  if (y <= perfil[0].y) return { ...perfil[0], y };
  const ultimo = perfil[perfil.length - 1];
  if (y >= ultimo.y) return { ...ultimo, y };
  const i = perfil.findIndex((s) => s.y >= y);
  const a = perfil[i - 1];
  const b = perfil[i];
  const t = (y - a.y) / (b.y - a.y);
  return {
    y,
    rx: a.rx + (b.rx - a.rx) * t,
    rz: a.rz + (b.rz - a.rz) * t,
    cz: a.cz + (b.cz - a.cz) * t,
  };
}

/**
 * Punto sobre la superficie del perfil: altura, ángulo en grados (0° = frente, + = izquierda)
 * y separación hacia afuera de la piel (m).
 */
export function puntoSuperficie(perfil: Perfil, y: number, anguloGrados: number, extra = 0) {
  const s = seccionEn(perfil, y);
  const a = THREE.MathUtils.degToRad(anguloGrados);
  return new THREE.Vector3((s.rx + extra) * Math.sin(a), y, s.cz + (s.rz + extra) * Math.cos(a));
}

/** Normal hacia afuera de la elipse en ese ángulo (horizontal). */
export function normalSuperficie(perfil: Perfil, y: number, anguloGrados: number) {
  const s = seccionEn(perfil, y);
  const a = THREE.MathUtils.degToRad(anguloGrados);
  return new THREE.Vector3(Math.sin(a) / s.rx, 0, Math.cos(a) / s.rz).normalize();
}

/**
 * Recalcula un perfil con la malla de piel cargada: para cada altura toma el fondo con los
 * vértices centrales (|x| < 0,03) y el ancho con los laterales hasta el primer hueco (así no
 * cuenta los brazos). Devuelve el perfil por defecto si la malla no está.
 */
export function medirPerfil(idZonaPiel: string | undefined, base: Perfil, xMax = 0.2): Perfil {
  const mallas = idZonaPiel ? registroZonas.get(idZonaPiel)?.mallas : undefined;
  if (!mallas?.length) return base;
  const v = new THREE.Vector3();
  const rangos = base.map(() => ({ zmin: Infinity, zmax: -Infinity, pts: [] as number[][] }));
  const media = 0.008;
  for (const m of mallas) {
    const pos = (m as THREE.Mesh).geometry?.attributes.position;
    if (!pos) continue;
    m.updateWorldMatrix(true, false);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      for (let k = 0; k < base.length; k++) {
        if (Math.abs(v.y - base[k].y) > media) continue;
        const r = rangos[k];
        if (Math.abs(v.x) < 0.03) {
          r.zmin = Math.min(r.zmin, v.z);
          r.zmax = Math.max(r.zmax, v.z);
        }
        if (Math.abs(v.x) < xMax) r.pts.push([Math.abs(v.x), v.z]);
      }
    }
  }
  return base.map((s, k) => {
    const r = rangos[k];
    if (!Number.isFinite(r.zmin)) return s;
    const cz = (r.zmin + r.zmax) / 2;
    const rz = (r.zmax - r.zmin) / 2;
    // Ancho: vértices laterales cerca del centro en z, desde 0,6·rx hasta el primer hueco
    // (así no se cuentan los brazos que cuelgan al lado).
    const xs = r.pts
      .filter(([x, z]) => Math.abs(z - cz) < rz * 0.45 && x > s.rx * 0.6)
      .map(([x]) => x)
      .sort((a, b) => a - b);
    let rx = s.rx;
    if (xs.length >= 5) {
      rx = xs[0];
      for (let i = 1; i < xs.length; i++) {
        if (xs[i] - xs[i - 1] > 0.008) break;
        rx = xs[i];
      }
    }
    rx = THREE.MathUtils.clamp(rx, s.rx - 0.02, s.rx + 0.015);
    return sec(s.y, rx, r.zmin, r.zmax);
  });
}

/** Base ortonormal a partir de un eje (Z local) y una dirección aproximada para Y local. */
export function base(eje: THREE.Vector3, arriba: THREE.Vector3): THREE.Matrix4 {
  const z = eje.clone().normalize();
  const y = arriba
    .clone()
    .sub(z.clone().multiplyScalar(arriba.dot(z)))
    .normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z);
}
