import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { seg } from '../calidad';

/**
 * Cuerpo procedural (sección 5.2): metros, altura 1,78 m, eje Y hacia arriba, origen entre
 * los pies, mirando a +Z. El lado izquierdo del cuerpo es +X.
 */

export type Lado = 1 | -1;
export const LADOS: { lado: Lado; sufijo: 'izq' | 'der' }[] = [
  { lado: 1, sufijo: 'izq' },
  { lado: -1, sufijo: 'der' },
];

type Punto = [number, number, number];

/** Puntos articulares del lado izquierdo (x > 0); el derecho se refleja en X. */
export const PROPORCIONES = {
  altura: 1.78,
  centroCabeza: [0, 1.665, 0.005] as Punto,
  baseCuello: [0, 1.5, -0.01] as Punto,
  hombro: [0.19, 1.435, -0.01] as Punto,
  codo: [0.25, 1.15, -0.025] as Punto,
  muneca: [0.3, 0.87, 0] as Punto,
  puntaMano: [0.33, 0.7, 0.012] as Punto,
  cadera: [0.09, 0.925, 0] as Punto,
  rodilla: [0.1, 0.505, 0.012] as Punto,
  tobillo: [0.1, 0.085, -0.01] as Punto,
  talon: [0.1, 0.045, -0.04] as Punto,
  puntaPie: [0.105, 0.035, 0.16] as Punto,
  centroPecho: [0, 1.3, 0.02] as Punto,
} as const;

export function punto(p: Punto, lado: Lado = 1): THREE.Vector3 {
  return new THREE.Vector3(p[0] * lado, p[1], p[2]);
}

/** Pieza estática del cuerpo: su geometría ya está en coordenadas del cuerpo. */
export interface Pieza {
  nombre: string;
  geometria: THREE.BufferGeometry;
  /** Si existe, la geometría está centrada en este punto (para escalar sobre sí misma). */
  posicion?: THREE.Vector3;
}

/** Pieza instanciada (una sola malla, muchas copias). */
export interface PiezaInstanciada {
  nombre: string;
  geometria: THREE.BufferGeometry;
  matrices: THREE.Matrix4[];
}

const EJE_Y = new THREE.Vector3(0, 1, 0);

/** Orienta una geometría construida a lo largo de Y para que vaya de `a` a `b`. */
export function alinear(geo: THREE.BufferGeometry, a: THREE.Vector3, b: THREE.Vector3) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const q = new THREE.Quaternion().setFromUnitVectors(EJE_Y, dir.clone().normalize());
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
    q,
    new THREE.Vector3(1, 1, 1),
  );
  return geo.applyMatrix4(m);
}

export function capsulaEntre(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radio: number,
  f: number,
  escalaLocal?: [number, number, number],
) {
  const geo = new THREE.CapsuleGeometry(radio, a.distanceTo(b), seg(6, f), seg(16, f));
  if (escalaLocal) geo.scale(...escalaLocal);
  return alinear(geo, a, b);
}

export function fusionar(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const unidas = mergeGeometries(geos, false);
  if (!unidas) throw new Error('No se pudieron fusionar las geometrías');
  geos.forEach((g) => g.dispose());
  unidas.computeBoundingBox();
  unidas.computeBoundingSphere();
  return unidas;
}

function torno(perfil: [number, number][], f: number, escalaZ: number) {
  const geo = new THREE.LatheGeometry(
    perfil.map(([r, y]) => new THREE.Vector2(r, y)),
    seg(40, f, 12),
  );
  geo.scale(1, 1, escalaZ);
  return geo;
}

/** Ruido determinista barato (suma de senos) para deformar superficies. */
export function ruido3(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 1.7 + y * 2.3 + 0.4) * Math.sin(y * 1.3 - z * 2.1 + 1.1) * 0.5 +
    Math.sin(z * 2.9 + x * 0.8 + 2.3) * 0.3 +
    Math.sin((x + y + z) * 4.1) * 0.2
  );
}

// --- Piel -----------------------------------------------------------------------

const PERFIL_TORSO: [number, number][] = [
  [0, 0.8],
  [0.1, 0.805],
  [0.155, 0.84],
  [0.175, 0.9],
  [0.172, 0.96],
  [0.158, 1.03],
  [0.148, 1.08],
  [0.152, 1.15],
  [0.165, 1.24],
  [0.178, 1.32],
  [0.185, 1.39],
  [0.175, 1.44],
  [0.13, 1.475],
  [0.075, 1.495],
  [0.056, 1.5],
  [0, 1.505],
];

const PERFIL_CABEZA: [number, number][] = [
  [0, 1.47],
  [0.052, 1.475],
  [0.054, 1.53],
  [0.058, 1.565],
  [0.075, 1.585],
  [0.088, 1.62],
  [0.094, 1.67],
  [0.09, 1.72],
  [0.075, 1.755],
  [0.045, 1.775],
  [0, 1.78],
];

export function crearPiel(f: number): Pieza {
  const P = PROPORCIONES;
  const partes: THREE.BufferGeometry[] = [
    torno(PERFIL_TORSO, f, 0.62),
    torno(PERFIL_CABEZA, f, 1.12),
  ];
  for (const { lado } of LADOS) {
    partes.push(
      capsulaEntre(punto(P.hombro, lado), punto(P.codo, lado), 0.044, f),
      capsulaEntre(punto(P.codo, lado), punto(P.muneca, lado), 0.034, f),
      capsulaEntre(punto(P.muneca, lado), punto(P.puntaMano, lado), 0.03, f, [0.5, 1, 1]),
      capsulaEntre(punto(P.cadera, lado), punto(P.rodilla, lado), 0.068, f),
      capsulaEntre(punto(P.rodilla, lado), punto(P.tobillo, lado), 0.044, f),
      capsulaEntre(punto(P.talon, lado), punto(P.puntaPie, lado), 0.038, f, [1, 1, 0.6]),
    );
  }
  return { nombre: 'piel_cuerpo', geometria: fusionar(partes) };
}

// --- Esqueleto -------------------------------------------------------------------

/** Curva de la columna (de C1 a L5), compartida con la médula. */
export function curvaColumna(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    (
      [
        [0, 1.565, -0.02],
        [0, 1.46, -0.045],
        [0, 1.33, -0.07],
        [0, 1.19, -0.064],
        [0, 1.06, -0.045],
        [0, 0.975, -0.06],
      ] as Punto[]
    ).map((p) => new THREE.Vector3(...p)),
  );
}

function crearCraneo(f: number): Pieza {
  const geo = new THREE.SphereGeometry(1, seg(28, f), seg(20, f));
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let sx = 0.07;
    let sz = 0.088;
    // Mandíbula y cara más estrechas que la bóveda.
    if (y < -0.15) {
      const t = (-0.15 - y) / 0.85;
      sx *= 1 - 0.38 * t;
      sz *= 1 - (z < 0 ? 0.45 : 0.12) * t;
    }
    pos.setXYZ(i, x * sx, y * 0.086, z * sz);
  }
  geo.computeVertexNormals();
  geo.translate(0, 1.672, 0.008);
  return { nombre: 'hueso_craneo', geometria: geo };
}

function crearColumna(f: number): PiezaInstanciada {
  const cuerpo = new THREE.CylinderGeometry(0.016, 0.017, 0.013, seg(10, f));
  const apofisis = new THREE.BoxGeometry(0.007, 0.009, 0.022).translate(0, 0, -0.02);
  const geometria = fusionar([cuerpo, apofisis]);
  const curva = curvaColumna();
  const matrices: THREE.Matrix4[] = [];
  const total = 24;
  for (let i = 0; i < total; i++) {
    const t = 0.02 + (0.96 * i) / (total - 1);
    const q = new THREE.Quaternion().setFromUnitVectors(EJE_Y, curva.getTangentAt(t).negate());
    const s = 0.7 + 0.65 * (i / (total - 1));
    matrices.push(new THREE.Matrix4().compose(curva.getPointAt(t), q, new THREE.Vector3(s, 1, s)));
  }
  return { nombre: 'hueso_columna', geometria, matrices };
}

/** Arco de costilla: toro parcial que va de la espalda (−Z) al frente (+Z) por el lado. */
function costilla(radio: number, arco: number, lado: Lado, y: number, f: number) {
  const geo = new THREE.TorusGeometry(radio, 0.0062, seg(6, f), seg(22, f), arco);
  // Lleva el plano XY del toro al plano XZ empezando por la espalda (determinante +1).
  geo.applyMatrix4(new THREE.Matrix4().set(0, lado, 0, 0, 0, 0, -lado, 0, -1, 0, 0, 0, 0, 0, 0, 1));
  geo.scale(1, 1, 0.72);
  geo.rotateX(0.35);
  geo.translate(0, y, -0.03);
  return geo;
}

function crearCostillas(f: number, lado: Lado, sufijo: string): Pieza {
  const partes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) {
    const radio = 0.07 + 0.055 * Math.sin((Math.PI * (i + 1.5)) / 13.5);
    const arco = i < 10 ? Math.PI * 0.9 : Math.PI * 0.55;
    partes.push(costilla(radio, arco, lado, 1.425 - i * 0.025, f));
  }
  return { nombre: `hueso_costillas_${sufijo}`, geometria: fusionar(partes) };
}

function crearPelvis(f: number): Pieza {
  const anillo = new THREE.TorusGeometry(0.08, 0.02, seg(8, f), seg(28, f));
  anillo.rotateX(Math.PI / 2);
  anillo.scale(1, 1, 0.72);
  anillo.rotateX(-0.25);
  anillo.translate(0, 0.945, -0.012);
  const partes: THREE.BufferGeometry[] = [anillo];
  for (const { lado } of LADOS) {
    const ala = new THREE.SphereGeometry(1, seg(16, f), seg(12, f));
    ala.scale(0.048, 0.05, 0.012);
    ala.rotateZ(lado * -0.35);
    ala.rotateY(lado * 0.95);
    ala.translate(lado * 0.082, 0.99, -0.03);
    partes.push(ala);
  }
  return { nombre: 'hueso_pelvis', geometria: fusionar(partes) };
}

/** Hueso largo: cilindro con extremos esféricos (epífisis). */
function huesoLargo(a: THREE.Vector3, b: THREE.Vector3, radio: number, f: number) {
  const diafisis = alinear(
    new THREE.CylinderGeometry(radio, radio * 0.9, a.distanceTo(b), seg(10, f)),
    a,
    b,
  );
  const extremo = (p: THREE.Vector3) =>
    new THREE.SphereGeometry(radio * 1.75, seg(12, f), seg(8, f)).translate(p.x, p.y, p.z);
  return fusionar([diafisis, extremo(a), extremo(b)]);
}

export interface PiezasEsqueleto {
  estaticas: Pieza[];
  columna: PiezaInstanciada;
}

export function crearEsqueleto(f: number): PiezasEsqueleto {
  const P = PROPORCIONES;
  const estaticas: Pieza[] = [crearCraneo(f), crearPelvis(f)];
  const esternon = new THREE.BoxGeometry(0.024, 0.15, 0.01, 1, 4, 1);
  esternon.rotateX(-0.12);
  esternon.translate(0, 1.31, 0.068);
  estaticas.push({ nombre: 'hueso_esternon', geometria: esternon });

  for (const { lado, sufijo } of LADOS) {
    estaticas.push(
      crearCostillas(f, lado, sufijo),
      {
        nombre: `hueso_clavicula_${sufijo}`,
        geometria: capsulaEntre(
          new THREE.Vector3(lado * 0.02, 1.45, 0.045),
          new THREE.Vector3(lado * 0.17, 1.462, -0.005),
          0.0065,
          f,
        ),
      },
      {
        nombre: `hueso_humero_${sufijo}`,
        geometria: huesoLargo(punto(P.hombro, lado), punto(P.codo, lado), 0.0105, f),
      },
      {
        nombre: `hueso_radio_${sufijo}`,
        geometria: huesoLargo(punto(P.codo, lado), punto(P.muneca, lado), 0.0078, f),
      },
      {
        nombre: `hueso_femur_${sufijo}`,
        geometria: huesoLargo(punto(P.cadera, lado), punto(P.rodilla, lado), 0.0135, f),
      },
      {
        nombre: `hueso_tibia_${sufijo}`,
        geometria: huesoLargo(punto(P.rodilla, lado), punto(P.tobillo, lado), 0.0115, f),
      },
    );
  }
  return { estaticas, columna: crearColumna(f) };
}

// --- Órganos ---------------------------------------------------------------------

/**
 * Elipsoide deformable centrado en el origen. `deformar` recibe la posición en la esfera
 * unitaria y devuelve un factor de escala por eje.
 */
function elipsoide(
  radios: [number, number, number],
  f: number,
  amplitudRuido = 0,
  deformar?: (x: number, y: number, z: number) => [number, number, number],
  segmentos = 24,
) {
  const geo = new THREE.SphereGeometry(1, seg(segmentos, f), seg(segmentos * 0.75, f));
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const [dx, dy, dz] = deformar ? deformar(x, y, z) : [1, 1, 1];
    const n = 1 + amplitudRuido * ruido3(x * 3, y * 3, z * 3);
    pos.setXYZ(i, x * radios[0] * dx * n, y * radios[1] * dy * n, z * radios[2] * dz * n);
  }
  geo.computeVertexNormals();
  return geo;
}

function crearCorazon(f: number): Pieza {
  const lobulo = (x: number) =>
    new THREE.SphereGeometry(0.029, seg(18, f), seg(14, f)).translate(x, 0.012, 0);
  const cono = new THREE.ConeGeometry(0.039, 0.068, seg(18, f));
  cono.rotateZ(Math.PI);
  cono.translate(0, -0.03, 0);
  const geo = fusionar([lobulo(0.017), lobulo(-0.017), cono]);
  // El ápice apunta hacia abajo, a la izquierda (+X) y adelante.
  geo.rotateZ(0.45);
  geo.rotateX(0.35);
  return {
    nombre: 'organo_corazon',
    geometria: geo,
    posicion: new THREE.Vector3(0.022, 1.29, 0.022),
  };
}

function crearPulmon(f: number, lado: Lado, sufijo: string): Pieza {
  const geo = elipsoide([0.064, 0.125, 0.072], f, 0.06, (x, y) => [
    x * lado < 0 ? 0.55 : 1, // cara medial aplanada
    y > 0 ? 1 : 0.92,
    1,
  ]);
  geo.translate(lado * (lado > 0 ? 0.084 : 0.088), 1.3, -0.01);
  return { nombre: `organo_pulmon_${sufijo}`, geometria: geo };
}

function crearHigado(f: number): Pieza {
  const geo = elipsoide([0.1, 0.048, 0.064], f, 0.03, (x) => [1, 1 - Math.max(0, x) * 0.55, 1]);
  geo.rotateZ(0.15);
  geo.translate(-0.045, 1.16, 0.028);
  return { nombre: 'organo_higado', geometria: geo };
}

function crearEstomago(f: number): Pieza {
  const geo = elipsoide([0.044, 0.06, 0.034], f, 0.02, (_x, y) => [y < 0 ? 1.15 : 0.85, 1, 1]);
  geo.rotateZ(-0.65);
  geo.translate(0.062, 1.13, 0.035);
  return { nombre: 'organo_estomago', geometria: geo };
}

function crearPancreas(f: number): Pieza {
  const geo = capsulaEntre(
    new THREE.Vector3(-0.02, 1.074, 0.012),
    new THREE.Vector3(0.075, 1.094, -0.002),
    0.011,
    f,
    [1, 1, 0.75],
  );
  return { nombre: 'organo_pancreas', geometria: geo };
}

function crearRinon(f: number, lado: Lado, sufijo: string): Pieza {
  const geo = elipsoide([0.023, 0.044, 0.019], f, 0.02, (x) => [x * lado < 0 ? 0.6 : 1, 1, 1], 18);
  geo.rotateZ(lado * 0.15);
  geo.translate(lado * 0.062, 1.05, -0.048);
  return { nombre: `organo_rinon_${sufijo}`, geometria: geo };
}

export function crearOrganos(f: number): Pieza[] {
  return [
    crearCorazon(f),
    ...LADOS.map(({ lado, sufijo }) => crearPulmon(f, lado, sufijo)),
    crearHigado(f),
    crearEstomago(f),
    crearPancreas(f),
    ...LADOS.map(({ lado, sufijo }) => crearRinon(f, lado, sufijo)),
  ];
}

// --- Sistema nervioso ------------------------------------------------------------

/** Tubo sobre una curva Catmull-Rom; uv.x avanza a lo largo del recorrido. */
export function tubo(puntos: THREE.Vector3[], radio: number, f: number, segmentos = 48) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(puntos),
    seg(segmentos, f, 8),
    radio,
    seg(6, f, 4),
    false,
  );
}

function crearCerebro(f: number): Pieza {
  const geo = elipsoide(
    [0.068, 0.058, 0.082],
    f,
    0,
    (x, y, z) => {
      const pliegues = 1 + 0.045 * ruido3(x * 9, y * 9, z * 9);
      const cisura = 1 - 0.09 * Math.exp(-(x * x) / 0.006) * Math.max(0, y + 0.2);
      return [pliegues * cisura, pliegues * cisura, pliegues * cisura];
    },
    48,
  );
  geo.translate(0, 1.69, 0);
  return { nombre: 'nervio_cerebro', geometria: geo };
}

function crearMedula(f: number): Pieza {
  const puntos = [
    new THREE.Vector3(0, 1.655, -0.005),
    ...curvaColumna()
      .getPoints(8)
      .map((p) => p.add(new THREE.Vector3(0, 0, -0.012))),
  ];
  return { nombre: 'nervio_medula', geometria: tubo(puntos, 0.0045, f, 80) };
}

function crearNerviosBrazo(f: number, lado: Lado, sufijo: string): Pieza {
  const P = PROPORCIONES;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(lado * x, y, z);
  const hombro = punto(P.hombro, lado);
  const codo = punto(P.codo, lado);
  const muneca = punto(P.muneca, lado);
  const principal = tubo(
    [v(0.02, 1.47, -0.035), v(0.1, 1.45, -0.02), hombro, codo, muneca, punto(P.puntaMano, lado)],
    0.0022,
    f,
  );
  const rama = tubo(
    [
      codo,
      codo
        .clone()
        .lerp(muneca, 0.5)
        .add(v(0.014, 0, -0.01)),
      muneca.clone().add(v(0.01, 0, -0.008)),
    ],
    0.0018,
    f,
    24,
  );
  return { nombre: `nervio_periferico_brazo_${sufijo}`, geometria: fusionar([principal, rama]) };
}

function crearNerviosPierna(f: number, lado: Lado, sufijo: string): Pieza {
  const P = PROPORCIONES;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(lado * x, y, z);
  const rodilla = punto(P.rodilla, lado).add(new THREE.Vector3(0, 0, -0.02));
  const principal = tubo(
    [
      v(0.02, 0.98, -0.06),
      v(0.07, 0.88, -0.05),
      rodilla,
      punto(P.tobillo, lado),
      punto(P.puntaPie, lado),
    ],
    0.0026,
    f,
  );
  const rama = tubo([rodilla, v(0.112, 0.3, 0.02), v(0.106, 0.1, 0.03)], 0.002, f, 24);
  return { nombre: `nervio_periferico_pierna_${sufijo}`, geometria: fusionar([principal, rama]) };
}

export interface PiezasNervioso {
  cerebro: Pieza;
  vias: Pieza[];
}

export function crearNervioso(f: number): PiezasNervioso {
  return {
    cerebro: crearCerebro(f),
    vias: [
      crearMedula(f),
      ...LADOS.map(({ lado, sufijo }) => crearNerviosBrazo(f, lado, sufijo)),
      ...LADOS.map(({ lado, sufijo }) => crearNerviosPierna(f, lado, sufijo)),
    ],
  };
}

// --- Sistema vascular ------------------------------------------------------------

export interface Recorrido {
  /** Puntos en el sentido del flujo: arterias desde el corazón, venas hacia el corazón. */
  puntos: THREE.Vector3[];
  radio: number;
}

export interface Vaso {
  nombre: string;
  tipo: 'arteria' | 'vena';
  recorridos: Recorrido[];
}

const CORAZON_ENTRADA = new THREE.Vector3(-0.02, 1.29, 0.025);
const CAVA_SUPERIOR = new THREE.Vector3(-0.022, 1.43, 0);
const CAVA_INFERIOR = new THREE.Vector3(-0.025, 0.96, 0.005);

export function recorridosVasculares(): Vaso[] {
  const P = PROPORCIONES;
  const vasos: Vaso[] = [
    {
      nombre: 'vaso_aorta',
      tipo: 'arteria',
      recorridos: [
        {
          radio: 0.0095,
          puntos: (
            [
              [0.02, 1.29, 0.03],
              [0.02, 1.37, 0.02],
              [0.005, 1.415, 0],
              [-0.005, 1.39, -0.035],
              [0, 1.3, -0.045],
              [0, 1.15, -0.035],
              [0, 1.0, -0.02],
              [0, 0.96, -0.01],
            ] as Punto[]
          ).map((p) => new THREE.Vector3(...p)),
        },
      ],
    },
    {
      nombre: 'vaso_vena_cava',
      tipo: 'vena',
      recorridos: [
        {
          radio: 0.009,
          puntos: [
            CAVA_INFERIOR,
            new THREE.Vector3(-0.028, 1.1, -0.01),
            new THREE.Vector3(-0.03, 1.22, 0.005),
            CORAZON_ENTRADA,
          ],
        },
        {
          radio: 0.008,
          puntos: [CAVA_SUPERIOR, new THREE.Vector3(-0.022, 1.36, 0.015), CORAZON_ENTRADA],
        },
      ],
    },
  ];

  for (const { lado, sufijo } of LADOS) {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(lado * x, y, z);
    const mas = (p: THREE.Vector3, x: number, y: number, z: number) => p.clone().add(v(x, y, z));
    const hombro = punto(P.hombro, lado);
    const codo = punto(P.codo, lado);
    const muneca = punto(P.muneca, lado);
    const mano = punto(P.puntaMano, lado);
    const rodilla = punto(P.rodilla, lado);
    const tobillo = punto(P.tobillo, lado);
    const pie = punto(P.puntaPie, lado);
    vasos.push(
      {
        nombre: `vaso_arteria_carotida_${sufijo}`,
        tipo: 'arteria',
        recorridos: [
          {
            radio: 0.0045,
            puntos: [
              v(0.012, 1.41, 0),
              v(0.028, 1.5, 0.012),
              v(0.032, 1.6, 0.02),
              v(0.03, 1.66, 0.03),
            ],
          },
        ],
      },
      {
        nombre: `vaso_arteria_brazo_${sufijo}`,
        tipo: 'arteria',
        recorridos: [
          {
            radio: 0.0045,
            puntos: [
              v(0.012, 1.41, 0),
              v(0.09, 1.43, 0),
              mas(hombro, 0, -0.02, 0.015),
              mas(codo, 0, 0, 0.02),
              mas(muneca, 0, 0, 0.018),
              mano,
            ],
          },
        ],
      },
      {
        nombre: `vaso_arteria_pierna_${sufijo}`,
        tipo: 'arteria',
        recorridos: [
          {
            radio: 0.0055,
            puntos: [
              new THREE.Vector3(0, 0.96, -0.01),
              v(0.06, 0.9, 0.02),
              v(0.085, 0.72, 0.03),
              mas(rodilla, 0, 0, -0.025),
              mas(tobillo, 0, 0, 0.01),
              pie,
            ],
          },
        ],
      },
      {
        nombre: `vaso_vena_brazo_${sufijo}`,
        tipo: 'vena',
        recorridos: [
          {
            radio: 0.0045,
            puntos: [
              mas(mano, 0.006, 0.01, -0.006),
              mas(muneca, 0.012, 0, -0.01),
              mas(codo, 0.012, 0, -0.005),
              mas(hombro, 0, -0.03, -0.01),
              v(0.05, 1.43, 0),
              CAVA_SUPERIOR,
            ],
          },
        ],
      },
      {
        nombre: `vaso_vena_pierna_${sufijo}`,
        tipo: 'vena',
        recorridos: [
          {
            radio: 0.005,
            puntos: [
              mas(pie, 0.008, 0.01, -0.01),
              mas(tobillo, 0.012, 0, -0.012),
              mas(rodilla, 0.015, 0, -0.035),
              v(0.07, 0.9, 0),
              CAVA_INFERIOR,
            ],
          },
        ],
      },
    );
  }
  return vasos;
}

export function crearVasos(f: number): (Pieza & { tipo: Vaso['tipo'] })[] {
  return recorridosVasculares().map((vaso) => ({
    nombre: vaso.nombre,
    tipo: vaso.tipo,
    geometria: fusionar(vaso.recorridos.map((r) => tubo(r.puntos, r.radio, f, 56))),
  }));
}

// --- Músculos --------------------------------------------------------------------

/** Elipsoide a lo largo de un tramo [t0, t1] del segmento a→b, desplazado por `offset`. */
function musculoEnSegmento(
  a: THREE.Vector3,
  b: THREE.Vector3,
  t0: number,
  t1: number,
  rx: number,
  rz: number,
  offset: THREE.Vector3,
  f: number,
) {
  const inicio = a.clone().lerp(b, t0).add(offset);
  const fin = a.clone().lerp(b, t1).add(offset);
  const geo = new THREE.SphereGeometry(1, seg(20, f), seg(14, f));
  geo.scale(rx, inicio.distanceTo(fin) / 2, rz);
  return alinear(geo, inicio, fin);
}

function musculoFijo(
  radios: [number, number, number],
  centro: THREE.Vector3,
  rotZ: number,
  f: number,
) {
  const geo = new THREE.SphereGeometry(1, seg(20, f), seg(14, f));
  geo.scale(...radios);
  geo.rotateZ(rotZ);
  geo.translate(centro.x, centro.y, centro.z);
  return geo;
}

export function crearMusculos(f: number): Pieza[] {
  const P = PROPORCIONES;
  const piezas: Pieza[] = [
    {
      nombre: 'musculo_abdominal',
      geometria: musculoFijo([0.068, 0.14, 0.02], new THREE.Vector3(0, 1.1, 0.07), 0, f),
    },
  ];
  for (const { lado, sufijo } of LADOS) {
    const hombro = punto(P.hombro, lado);
    const codo = punto(P.codo, lado);
    const cadera = punto(P.cadera, lado);
    const rodilla = punto(P.rodilla, lado);
    const tobillo = punto(P.tobillo, lado);
    piezas.push(
      {
        nombre: `musculo_cuadriceps_${sufijo}`,
        geometria: musculoEnSegmento(
          cadera,
          rodilla,
          0.15,
          0.88,
          0.05,
          0.042,
          new THREE.Vector3(0, 0, 0.02),
          f,
        ),
      },
      {
        nombre: `musculo_gemelo_${sufijo}`,
        geometria: musculoEnSegmento(
          rodilla,
          tobillo,
          0.06,
          0.5,
          0.034,
          0.032,
          new THREE.Vector3(0, 0, -0.018),
          f,
        ),
      },
      {
        nombre: `musculo_gluteo_${sufijo}`,
        geometria: musculoFijo(
          [0.068, 0.072, 0.048],
          new THREE.Vector3(lado * 0.075, 0.9, -0.058),
          0,
          f,
        ),
      },
      {
        nombre: `musculo_deltoides_${sufijo}`,
        geometria: musculoFijo(
          [0.046, 0.058, 0.048],
          hombro.clone().add(new THREE.Vector3(lado * 0.006, -0.012, 0)),
          lado * 0.25,
          f,
        ),
      },
      {
        nombre: `musculo_biceps_${sufijo}`,
        geometria: musculoEnSegmento(
          hombro,
          codo,
          0.28,
          0.88,
          0.025,
          0.025,
          new THREE.Vector3(0, 0, 0.016),
          f,
        ),
      },
      {
        nombre: `musculo_dorsal_${sufijo}`,
        geometria: musculoFijo(
          [0.072, 0.125, 0.022],
          new THREE.Vector3(lado * 0.092, 1.24, -0.075),
          lado * 0.25,
          f,
        ),
      },
    );
  }
  return piezas;
}

// --- Halo de radiación -----------------------------------------------------------

export function crearHalo(f: number): Pieza {
  const geo = new THREE.SphereGeometry(1, seg(48, f), seg(32, f));
  geo.scale(0.6, 0.98, 0.6);
  geo.translate(0, 0.9, 0);
  return { nombre: 'halo_radiacion', geometria: geo };
}

// --- Todas las piezas (para tests y registro de nombres) ------------------------

export function piezasDelCuerpo(f: number): (Pieza | PiezaInstanciada)[] {
  const esqueleto = crearEsqueleto(f);
  const nervioso = crearNervioso(f);
  return [
    crearPiel(f),
    ...esqueleto.estaticas,
    esqueleto.columna,
    ...crearOrganos(f),
    nervioso.cerebro,
    ...nervioso.vias,
    ...crearVasos(f),
    ...crearMusculos(f),
    crearHalo(f),
  ];
}
