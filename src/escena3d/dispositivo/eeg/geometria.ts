import * as THREE from 'three';
import { base } from '../medidas';
import { CABEZA_MEDIDA } from './cabezaMedida';

/**
 * Diadema EEG de 8 electrodos secos (propuesta del equipo, vistas frontal y lateral).
 * Coordenadas del cuerpo: metros, +Y arriba, +Z frente, +X = izquierda del astronauta.
 * Direcciones en la cabeza: acimut (0° = frente, + = izquierda, 180° = nuca) y elevación
 * (0° = altura del centro, 90° = coronilla) desde el centro medido de la cabeza.
 *
 * Banda negra segmentada alrededor de la cabeza (alta en la frente, baja en la nuca) con 3
 * electrodos frontales (Fp1, Fpz, Fp2), hebillas a los lados y el módulo de electrónica en la
 * nuca. De él sube una espina plana hasta el núcleo trasero de la coronilla, del que salen 5
 * brazos segmentados que terminan en electrodos (Fz, F3, F4, C3, C4); el central y los
 * exteriores bajan hasta la banda.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const { centro, elevaciones, acimuts, radios } = CABEZA_MEDIDA;
export const CENTRO_CABEZA = v(...centro);
const rad = THREE.MathUtils.degToRad;

export function direccion(acimut: number, elevacion: number) {
  const a = rad(acimut);
  const e = rad(elevacion);
  return v(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a));
}

/** Radio medido de la piel en esa dirección (bilineal, simétrico). */
export function radioCabeza(acimut: number, elevacion: number) {
  const a = Math.min(180, Math.abs(((acimut + 540) % 360) - 180));
  const fe = THREE.MathUtils.clamp(
    (elevacion - elevaciones[0]) / (elevaciones[1] - elevaciones[0]),
    0,
    elevaciones.length - 1,
  );
  const fa = a / (acimuts[1] - acimuts[0]);
  const e0 = Math.min(Math.floor(fe), elevaciones.length - 2);
  const a0 = Math.min(Math.floor(fa), acimuts.length - 2);
  const te = fe - e0;
  const ta = fa - a0;
  const r = (i: number, j: number) => radios[i][j];
  return (
    (r(e0, a0) * (1 - ta) + r(e0, a0 + 1) * ta) * (1 - te) +
    (r(e0 + 1, a0) * (1 - ta) + r(e0 + 1, a0 + 1) * ta) * te
  );
}

/** Punto sobre el cuero cabelludo medido; `extra` lo separa hacia afuera (radial). */
export function puntoCabeza(acimut: number, elevacion: number, extra = 0) {
  return CENTRO_CABEZA.clone().addScaledVector(
    direccion(acimut, elevacion),
    radioCabeza(acimut, elevacion) + extra,
  );
}

/** Normal hacia afuera de la piel (diferencias finitas). */
export function normalCabeza(acimut: number, elevacion: number) {
  const da = puntoCabeza(acimut + 1, elevacion).sub(puntoCabeza(acimut - 1, elevacion));
  const de = puntoCabeza(acimut, elevacion + 1).sub(puntoCabeza(acimut, elevacion - 1));
  const n = new THREE.Vector3().crossVectors(da, de);
  // En la coronilla la derivada en acimut se anula: se usa la dirección radial.
  return n.lengthSq() < 1e-10 ? direccion(acimut, elevacion) : n.normalize();
}

/** Orientación sobre la cabeza: Z local = normal, Y local ≈ hacia la coronilla. */
export function orientacionCabeza(acimut: number, elevacion: number) {
  const n = normalCabeza(acimut, elevacion);
  const arriba = puntoCabeza(acimut, elevacion + 2).sub(puntoCabeza(acimut, elevacion - 2));
  return new THREE.Quaternion().setFromRotationMatrix(base(n, arriba));
}

/* --- Banda ------------------------------------------------------------------------------- */

/** Elevación de la línea media de la banda: sobre las cejas al frente, baja en la nuca. */
export const elevacionBanda = (acimut: number) => 28 - 34 * ((1 - Math.cos(rad(acimut))) / 2);

/** Cuánto pesa el módulo trasero en ese acimut (0 delante, 1 en la nuca). */
export const pesoModulo = (acimut: number) =>
  THREE.MathUtils.smoothstep(Math.abs(((acimut + 540) % 360) - 180), 148, 168);

export const BANDA = { ancho: 0.024, grosor: 0.0075, anchoModulo: 0.042, grosorModulo: 0.022 };

/** Ancho (m) y grosor (m) de la banda en un acimut. */
export function seccionBanda(acimut: number) {
  const k = pesoModulo(acimut);
  return {
    ancho: THREE.MathUtils.lerp(BANDA.ancho, BANDA.anchoModulo, k),
    grosor: THREE.MathUtils.lerp(BANDA.grosor, BANDA.grosorModulo, k),
  };
}

/** Punto de la banda: acimut, posición a lo ancho (−0,5…0,5) y altura sobre la piel. */
export function puntoBanda(acimut: number, ancho01: number, altura: number) {
  const { ancho } = seccionBanda(acimut);
  const e0 = elevacionBanda(acimut);
  const r = radioCabeza(acimut, e0);
  // En el módulo la banda crece hacia abajo (nuca), no hacia la coronilla.
  const desplazar = (pesoModulo(acimut) * (BANDA.anchoModulo - BANDA.ancho)) / 2;
  const e = e0 + THREE.MathUtils.radToDeg((ancho01 * ancho - desplazar) / r);
  return puntoCabeza(acimut, e, 0.0015 + altura);
}

/** Electrodos frontales integrados en la banda. */
export const FRONTALES = [
  { id: 'Fp2', acimut: -28 },
  { id: 'Fpz', acimut: 0 },
  { id: 'Fp1', acimut: 28 },
];
/** Hebillas laterales de ajuste. */
export const HEBILLAS = [-68, 68];

/* --- Brazos ------------------------------------------------------------------------------ */

/** Núcleo trasero en la coronilla del que salen los brazos. */
export const NUCLEO = { acimut: 180, elevacion: 62 };

/** Electrodos de los brazos (10-20) y si el brazo sigue hasta la banda. */
export const BRAZOS = [
  { id: 'Fz', acimut: 0, elevacion: 55, bajaA: 0 },
  { id: 'F3', acimut: 40, elevacion: 46, bajaA: null },
  { id: 'F4', acimut: -40, elevacion: 46, bajaA: null },
  { id: 'C3', acimut: 86, elevacion: 44, bajaA: 86 },
  { id: 'C4', acimut: -86, elevacion: 44, bajaA: -86 },
] as const;

/** Alto del electrodo de brazo sobre la piel (contacto + cuerpo). */
export const ALTO_ELECTRODO = 0.019;

/** Recorrido del brazo: del núcleo al dorso de su electrodo, arqueado sobre la cabeza. */
export function rutaBrazo(i: number): THREE.Vector3[] {
  const b = BRAZOS[i];
  const d0 = direccion(NUCLEO.acimut, NUCLEO.elevacion);
  const d1 = direccion(b.acimut, b.elevacion);
  const q0 = new THREE.Quaternion();
  const q = new THREE.Quaternion().setFromUnitVectors(d0, d1);
  const n = 14;
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n;
    const d = d0.clone().applyQuaternion(q0.clone().slerp(q, t));
    const e = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)));
    const a = THREE.MathUtils.radToDeg(Math.atan2(d.x, d.z));
    const extra =
      THREE.MathUtils.lerp(0.013, ALTO_ELECTRODO + 0.004, t) + 0.011 * Math.sin(Math.PI * t) ** 0.8;
    return puntoCabeza(a, e, extra);
  });
}

/** Tramo fino que baja del electrodo del brazo hasta la banda (central y exteriores). */
export function rutaBajada(i: number): THREE.Vector3[] | null {
  const b = BRAZOS[i];
  if (b.bajaA === null) return null;
  const eBanda = elevacionBanda(b.bajaA) + 4;
  return Array.from({ length: 7 }, (_, k) => {
    const t = k / 6;
    const e = THREE.MathUtils.lerp(b.elevacion - 4, eBanda, t);
    const a = THREE.MathUtils.lerp(b.acimut, b.bajaA, t);
    return puntoCabeza(a, e, THREE.MathUtils.lerp(ALTO_ELECTRODO * 0.6, 0.012, t));
  });
}

/** Espina plana: del módulo de la nuca al núcleo. */
export function rutaEspina(): THREE.Vector3[] {
  return Array.from({ length: 10 }, (_, k) => {
    const e = THREE.MathUtils.lerp(elevacionBanda(180) + 6, NUCLEO.elevacion, k / 9);
    return puntoCabeza(180, e, 0.009);
  });
}

/** Puntos (mundo) de las piezas con sensor. */
export function puntosEeg(): Record<string, THREE.Vector3> {
  return {
    frontales: puntoCabeza(0, elevacionBanda(0), 0.03),
    centrales: puntoCabeza(BRAZOS[1].acimut, BRAZOS[1].elevacion, ALTO_ELECTRODO + 0.014),
    modulo: puntoBanda(180, 0, BANDA.grosorModulo + 0.016),
  };
}

export const VISTA_EEG = {
  posicion: v(0.36, 1.82, 0.56),
  objetivo: v(0.0, 1.69, 0.02),
};
