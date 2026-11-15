import * as THREE from 'three';
import { base } from '../medidas';
import { TORSO_MEDIDO } from './torsoMedido';

/**
 * Arnés ECG con dosímetro y presión arterial (propuesta del equipo, 3 vistas de referencia).
 * Coordenadas del cuerpo: metros, +Y arriba, +Z frente, +X = izquierda del astronauta.
 *
 * Banda torácica de malla azul marino bajo el pecho con tirantes en V delante y cruzados en la
 * espalda; registrador ECG gris claro en el esternón con 4 cables a los electrodos (rojo y verde
 * bajo la clavícula derecha, blanco y negro bajo la izquierda); dosímetro personal negro en el
 * costado derecho; manguito de presión negro en el brazo izquierdo unido al registrador por un
 * tubo. Discos grises de contacto y un parche con el trazo de ECG en la banda.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const { alturas, angulos, radios, cz: CZ } = TORSO_MEDIDO;

/** Radio medido del torso (bilineal en altura y ángulo, simétrico). */
export function radioTorso(y: number, anguloGrados: number) {
  const a = Math.min(180, Math.abs(((anguloGrados + 540) % 360) - 180));
  const fy = THREE.MathUtils.clamp(
    (y - alturas[0]) / (alturas[1] - alturas[0]),
    0,
    alturas.length - 1,
  );
  const fa = a / (angulos[1] - angulos[0]);
  const y0 = Math.min(Math.floor(fy), alturas.length - 2);
  const a0 = Math.min(Math.floor(fa), angulos.length - 2);
  const ty = fy - y0;
  const ta = fa - a0;
  const r = (i: number, j: number) => radios[i][j];
  return (
    (r(y0, a0) * (1 - ta) + r(y0, a0 + 1) * ta) * (1 - ty) +
    (r(y0 + 1, a0) * (1 - ta) + r(y0 + 1, a0 + 1) * ta) * ty
  );
}

/** Punto sobre la piel medida del torso: 0° = frente, + = izquierda; `extra` hacia afuera. */
export function puntoTorso(y: number, anguloGrados: number, extra = 0) {
  const a = THREE.MathUtils.degToRad(anguloGrados);
  const r = radioTorso(y, anguloGrados) + extra;
  return v(r * Math.sin(a), y, CZ + r * Math.cos(a));
}

/** Normal hacia afuera de la piel medida (diferencias finitas). */
export function normalTorso(y: number, anguloGrados: number) {
  const th = puntoTorso(y, anguloGrados + 1).sub(puntoTorso(y, anguloGrados - 1));
  const tv = puntoTorso(y + 0.01, anguloGrados).sub(puntoTorso(y - 0.01, anguloGrados));
  return new THREE.Vector3().crossVectors(th, tv).normalize();
}

/** Ángulo en el que la piel del torso pasa por la coordenada x a esa altura. */
export function anguloParaX(y: number, x: number) {
  let lo = 0;
  let hi = 100;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (puntoTorso(y, m).x < Math.abs(x)) lo = m;
    else hi = m;
  }
  return Math.sign(x) * (lo + hi) * 0.5;
}

/** Orientación de una pieza apoyada en el torso: Z local = normal, Y local ≈ arriba. */
export function orientacionTorso(y: number, anguloGrados: number) {
  return new THREE.Quaternion().setFromRotationMatrix(
    base(normalTorso(y, anguloGrados), v(0, 1, 0)),
  );
}

/* ---------------------------------------------------------------------------------------- */

/** Banda torácica: alturas del borde inferior y superior y separación de la piel. */
export const BANDA = { abajo: 1.205, arriba: 1.298, piel: 0.0015, grosor: 0.005 };
export const SOBRE_BANDA = BANDA.piel + BANDA.grosor;

/** Registrador ECG (Holter) en el esternón. Medidas ≈ 66 × 118 × 24 mm. */
export const REGISTRADOR = { y: 1.25, angulo: 0, tamano: [0.066, 0.118, 0.024] as const };
/** Dosímetro personal en el costado derecho del pecho. Medidas ≈ 58 × 86 × 24 mm. */
export const DOSIMETRO = {
  y: 1.252,
  angulo: -50,
  tamano: [0.058, 0.086, 0.024] as const,
  /** Cuánto se gira hacia el frente respecto de la normal (0 = pegado al costado). */
  giro: 0.4,
};
/** Presillas verticales de la banda que sujetan cada equipo (ángulos). */
export const PRESILLAS = [-19, 19, -65, -39];
/** Discos grises de contacto y parche con el trazo de ECG. */
export const DISCOS = [-84, -28, 42];
export const PARCHE = { angulo: 64, lado: 0.036 };

/**
 * Centro y orientación (Z local = normal) de una caja apoyada en la banda. `giro` la vuelve hacia
 * el frente (se separa un poco más para que el canto interior no entre en la banda).
 */
export function cajaEnBanda(y: number, angulo: number, fondo: number, giro = 0) {
  const n = normalTorso(y, angulo)
    .lerp(v(0, 0, 1), giro)
    .normalize();
  return {
    centro: puntoTorso(y, angulo, SOBRE_BANDA + fondo / 2 + 0.001 + giro * 0.012),
    rotacion: new THREE.Quaternion().setFromRotationMatrix(base(n, v(0, 1, 0))),
  };
}

/** Electrodos de 4 cables (lado del astronauta): ángulo y altura en la piel. */
export const ELECTRODOS = [
  { id: 'RA', color: 'rojo', angulo: -57, y: 1.405 },
  { id: 'RL', color: 'verde', angulo: -48, y: 1.422 },
  { id: 'LA', color: 'blanco', angulo: 48, y: 1.422 },
  { id: 'LL', color: 'negro', angulo: 57, y: 1.405 },
] as const;

/** Clavijas en la cara superior del registrador (x local), en el mismo orden. */
export const CLAVIJAS = [-0.0165, -0.0055, 0.0055, 0.0165];

/** Punto (mundo) a partir de coordenadas locales del registrador. */
export function enRegistrador(local: THREE.Vector3) {
  const { centro, rotacion } = cajaEnBanda(
    REGISTRADOR.y,
    REGISTRADOR.angulo,
    REGISTRADOR.tamano[2],
  );
  return local.clone().applyQuaternion(rotacion).add(centro);
}

/** Cable de cada electrodo: sube desde su clavija y sigue el pecho hasta la cola del broche. */
export function rutaCable(i: number): THREE.Vector3[] {
  const e = ELECTRODOS[i];
  const [, alto] = REGISTRADOR.tamano;
  const salida = enRegistrador(v(CLAVIJAS[i], alto / 2 + 0.017, 0));
  const arriba = enRegistrador(v(CLAVIJAS[i] * 1.3, alto / 2 + 0.04, 0.002));
  const cola = colaElectrodo(i);
  const a0 = anguloParaX(arriba.y, arriba.x || 1e-4);
  const medio = [0.3, 0.62].map((t) => {
    const y = THREE.MathUtils.lerp(arriba.y, cola.y, t) - 0.012 * Math.sin(Math.PI * t);
    const ang = THREE.MathUtils.lerp(a0, e.angulo, t * 0.9);
    return puntoTorso(y, ang, 0.011 - 0.004 * t);
  });
  return [salida, arriba, ...medio, cola];
}

/** Broche del electrodo: centro en la piel y punto donde entra el cable (abajo, hacia dentro). */
export function brocheElectrodo(i: number) {
  const e = ELECTRODOS[i];
  return {
    centro: puntoTorso(e.y, e.angulo, 0.003),
    rotacion: orientacionTorso(e.y, e.angulo),
  };
}
export function colaElectrodo(i: number) {
  const e = ELECTRODOS[i];
  const hacia = e.angulo > 0 ? -5 : 5;
  return puntoTorso(e.y - 0.022, e.angulo + hacia, 0.006);
}

/** Tirante: sube en V desde el centro de la banda, pasa sobre el hombro y cruza la espalda. */
export function rutaTirante(lado: 1 | -1): THREE.Vector3[] {
  const e = 0.004;
  const pecho = [
    [1.296, 0.024],
    [1.335, 0.036],
    [1.375, 0.052],
    [1.41, 0.07],
  ].map(([y, x]) => puntoTorso(y, anguloParaX(y, lado * x), e));
  const hombro = [
    v(0.098, 1.452, 0.088),
    v(0.103, 1.494, 0.05),
    v(0.106, 1.531, 0.002),
    v(0.106, 1.521, -0.045),
    v(0.104, 1.497, -0.084),
  ].map((p) => p.setX(lado * p.x));
  const cruce = lado === 1 ? 0.0012 : 0.0028;
  const espalda = [
    puntoTorso(1.432, lado * 152, e),
    puntoTorso(1.385, lado * 166, e + cruce),
    puntoTorso(1.345, 180, e + cruce),
    puntoTorso(1.315, -lado * 167, e + cruce),
    puntoTorso(BANDA.arriba - 0.004, -lado * 155, e),
  ];
  return [...pecho, ...hombro, ...espalda];
}

/** Normal para orientar la cinta del tirante (radial en el torso, del hombro arriba). */
export function afueraTirante(p: THREE.Vector3) {
  const radial = v(p.x, 0, p.z - CZ).normalize();
  const hombro = p
    .clone()
    .sub(v(p.x * 0.45, 1.43, 0))
    .normalize();
  return radial.lerp(hombro, THREE.MathUtils.smoothstep(p.y, 1.43, 1.5)).normalize();
}

/* --- Manguito de presión en el brazo izquierdo ------------------------------------------ */

/** Eje del brazo izquierdo medido en la piel (abajo → arriba) y semiejes del manguito. */
export const MANGUITO = {
  abajo: v(0.238, 1.19, -0.003),
  arriba: v(0.217, 1.33, -0.004),
  rx: 0.05,
  rz: 0.054,
  grosor: 0.012,
  /** Ángulo (alrededor del brazo, 0° = frente, + = afuera) de la hebilla y de la salida del tubo. */
  hebilla: 70,
  tubo: -25,
};

export function ejeBrazo() {
  return MANGUITO.arriba.clone().sub(MANGUITO.abajo).normalize();
}

/** Punto del manguito: t de abajo (0) a arriba (1), ángulo en grados, separación hacia afuera. */
export function puntoManguito(t: number, anguloGrados: number, extra = 0) {
  const eje = ejeBrazo();
  const c = MANGUITO.abajo.clone().lerp(MANGUITO.arriba, t);
  const ex = v(1, 0, 0).addScaledVector(eje, -eje.x).normalize();
  const ez = new THREE.Vector3().crossVectors(ex, eje).normalize();
  const a = THREE.MathUtils.degToRad(anguloGrados);
  return c
    .addScaledVector(ex, Math.sin(a) * (MANGUITO.rx + extra))
    .addScaledVector(ez, Math.cos(a) * (MANGUITO.rz + extra));
}

/** Orientación en el manguito: Z local hacia afuera, Y local a lo largo del brazo. */
export function orientacionManguito(t: number, anguloGrados: number) {
  const n = puntoManguito(t, anguloGrados, 0.01).sub(puntoManguito(t, anguloGrados));
  return new THREE.Quaternion().setFromRotationMatrix(base(n, ejeBrazo()));
}

/** Tubo de aire: del conector lateral del registrador, cuelga y sube al borde del manguito. */
export function rutaManguera(): THREE.Vector3[] {
  const [ancho] = REGISTRADOR.tamano;
  const puerto = enRegistrador(v(ancho / 2 + 0.024, 0, 0));
  const entrada = puntoManguito(-0.06, MANGUITO.tubo, MANGUITO.grosor * 0.5);
  return [
    puerto,
    puerto.clone().add(v(0.016, -0.012, 0.004)),
    v(0.092, 1.19, 0.152),
    v(0.11, 1.135, 0.142),
    v(0.15, 1.115, 0.112),
    v(0.188, 1.13, 0.082),
    entrada.clone().add(v(-0.004, -0.045, 0.006)),
    entrada,
  ];
}

/** Puntos (mundo) de las piezas con sensor. */
export function puntosArnes(): Record<string, THREE.Vector3> {
  const caja = (y: number, angulo: number, fondo: number) =>
    puntoTorso(y, angulo, SOBRE_BANDA + fondo + 0.008);
  return {
    electrodos: puntoTorso(ELECTRODOS[2].y + 0.004, ELECTRODOS[2].angulo, 0.018),
    registrador: caja(REGISTRADOR.y + 0.03, REGISTRADOR.angulo, REGISTRADOR.tamano[2]),
    dosimetro: caja(DOSIMETRO.y + 0.02, DOSIMETRO.angulo, DOSIMETRO.tamano[2] + 0.006),
    manguito: puntoManguito(0.55, 40, MANGUITO.grosor + 0.01),
  };
}

export const VISTA_ARNES = {
  posicion: v(0.42, 1.44, 0.98),
  objetivo: v(0.04, 1.29, 0.02),
};
