import * as THREE from 'three';
import { PERFIL_CABEZA, puntoSuperficie, seccionEn, type Perfil } from '../medidas';

/**
 * PUMA reconstruido a partir de 3 vistas de referencia (frontal, lateral izquierda e isométrica)
 * con el pipeline img2threejs; la spec con las decisiones vive en docs/puma/object-sculpt-spec.json.
 * Coordenadas del cuerpo: metros, +Y arriba, +Z frente, +X = izquierda del astronauta.
 *
 * Lado izquierdo (+X): manguera → cámara de flujo ahumada → bloque trasero con tornillos y módulo
 * blanco en los montantes; dos sensores negros cuelgan bajo la cámara con líneas de muestra ámbar;
 * de ahí sale el umbilical trenzado. Lado derecho (−X): manguera → carcasa blanca con disipador
 * oscuro. Placas craneales transparentes perforadas sobre un arnés azul marino.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Máscara oronasal: del puente nasal a bajo el mentón, en forma de gota. */
export const MASCARA = { cy: 1.612, ay: 0.064, ax: 0.064, bombeo: 0.032 };
export const CENTRO_CABEZA = v(0, 1.64, 0.035);

/** z de la cara (elipse de la cabeza) en (x, y). */
export function zCara(x: number, y: number) {
  const s = seccionEn(PERFIL_CABEZA, y);
  const k = Math.min(0.98, Math.abs(x) / s.rx);
  return s.cz + s.rz * Math.sqrt(1 - k * k);
}

const suave = (a: number, b: number, t: number) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** Punto de la máscara: u alrededor (0–1), v del vértice (0) al borde (1). */
export function puntoMascara(u: number, v2: number, extra = 0) {
  const ang = u * Math.PI * 2;
  const phi = v2 * (Math.PI / 2);
  const sy = Math.sin(ang) * Math.sin(phi);
  // Más angosta arriba (puente nasal) que abajo (mentón).
  const ancho = 1 - 0.58 * suave(0.15, 1, sy);
  const x = MASCARA.ax * ancho * Math.cos(ang) * Math.sin(phi);
  const y = MASCARA.cy + MASCARA.ay * sy;
  return v(x, y, zCara(x, y) + 0.002 + MASCARA.bombeo * Math.cos(phi) + extra);
}

/** Puerto inferior frontal de la máscara y su eje. */
export const PUERTO = { centro: v(0, 1.574, 0.17), eje: v(0, -0.35, 0.94).normalize() };

/** Barra en T bajo el mentón (arco con los brazos hacia los lados). */
export const T = {
  cuello: [v(0, 1.57, 0.18), v(0, 1.556, 0.205)],
  barra: [
    v(-0.075, 1.557, 0.198),
    v(-0.035, 1.55, 0.212),
    v(0, 1.548, 0.215),
    v(0.035, 1.55, 0.212),
    v(0.075, 1.557, 0.198),
  ],
  tapa: { centro: v(0, 1.551, 0.228), largo: 0.022 },
};

export const MANGUERA_IZQ = [
  v(0.074, 1.557, 0.199),
  v(0.09, 1.557, 0.168),
  v(0.104, 1.558, 0.13),
  v(0.11, 1.558, 0.104),
];
export const MANGUERA_DER = [
  v(-0.074, 1.557, 0.199),
  v(-0.092, 1.558, 0.166),
  v(-0.115, 1.561, 0.13),
  v(-0.132, 1.566, 0.106),
];

/** Cámara de flujo ahumada: corre hacia atrás y un poco hacia afuera a la altura del mentón. */
export const CAMARA = {
  desde: v(0.11, 1.558, 0.104),
  hasta: v(0.158, 1.558, 0.002),
  radio: 0.019,
};
export const enCamara = (t: number) => CAMARA.desde.clone().lerp(CAMARA.hasta, t);

/** Bloque de montaje beige (con tornillos) y módulo blanco trasero en los montantes. */
export const MONTAJE = {
  centro: v(0.162, 1.541, -0.016),
  tamano: [0.03, 0.075, 0.034] as [number, number, number],
};
export const MODULO_TRASERO = {
  centro: v(0.15, 1.59, -0.056),
  tamano: [0.034, 0.05, 0.058] as [number, number, number],
};

/** Sensores negros que cuelgan bajo la cámara (O₂ adelante, CO₂ atrás). */
export const SENSORES = [enCamara(0.3), enCamara(0.68)].map((p) => ({
  arriba: v(p.x, 1.537, p.z),
  radio: 0.011,
  largo: 0.042,
}));

/** Carcasa blanca derecha con disipador oscuro en la cara lateral. */
export const CARCASA = {
  centro: v(-0.165, 1.582, 0.078),
  tamano: [0.045, 0.07, 0.056] as [number, number, number],
  disipador: {
    centro: v(-0.195, 1.578, 0.078),
    tamano: [0.016, 0.056, 0.054] as [number, number, number],
  },
  canister: { centro: v(-0.15, 1.633, 0.088), radio: 0.011, alto: 0.03 },
  soporte: {
    centro: v(-0.153, 1.522, 0.086),
    tamano: [0.034, 0.04, 0.03] as [number, number, number],
  },
};

/** Placas craneales: ángulos (°, + = izquierda) y altura; perforaciones 3 × 3. */
export const PLACA = {
  arriba: { y: 1.73, desde: 94, hasta: 152, separacion: 0.011 },
  abajo: { y: 1.585, desde: 78, hasta: 150, separacion: 0.028 },
  huecos: {
    columnas: 3,
    filas: 3,
    u: [0.24, 0.86] as [number, number],
    v: [0.2, 0.8] as [number, number],
    ancho: 0.1,
    alto: 0.15,
  },
};

export function puntoPlaca(lado: 1 | -1, u: number, w: number, extra = 0) {
  const y = PLACA.abajo.y + (PLACA.arriba.y - PLACA.abajo.y) * w;
  const a0 = PLACA.abajo.desde + (PLACA.arriba.desde - PLACA.abajo.desde) * w;
  const a1 = PLACA.abajo.hasta + (PLACA.arriba.hasta - PLACA.abajo.hasta) * w;
  const sep = PLACA.abajo.separacion + (PLACA.arriba.separacion - PLACA.abajo.separacion) * w;
  return puntoSuperficie(PERFIL_CABEZA, y, lado * (a0 + (a1 - a0) * u), sep + extra);
}

/** ¿Hay material de placa en (u, w)? Falso dentro de las perforaciones redondeadas. */
export function hayPlaca(u: number, w: number) {
  const h = PLACA.huecos;
  for (let c = 0; c < h.columnas; c++) {
    for (let f = 0; f < h.filas; f++) {
      const cu = h.u[0] + ((h.u[1] - h.u[0]) * (c + 0.5)) / h.columnas;
      const cw = h.v[0] + ((h.v[1] - h.v[0]) * (f + 0.5)) / h.filas + (c % 2 ? 0.04 : -0.04);
      const du = Math.abs(u - cu) / (h.ancho / 2);
      const dw = Math.abs(w - cw) / (h.alto / 2);
      if (du ** 4 + dw ** 4 < 1) return false;
    }
  }
  return true;
}

/** Montantes transparentes de cada lado (pares de varillas del módulo a la placa). */
export function montantes(lado: 1 | -1) {
  if (lado === 1)
    return [
      [v(0.143, 1.615, -0.046), v(0.112, 1.705, -0.042)],
      [v(0.145, 1.615, -0.066), v(0.112, 1.7, -0.062)],
    ];
  return [
    [v(-0.152, 1.616, 0.058), v(-0.11, 1.7, 0.01)],
    [v(-0.152, 1.612, 0.04), v(-0.11, 1.692, -0.008)],
  ];
}

/** Correa azul lateral: de la coronilla, delante de la oreja, por debajo del mentón al otro lado. */
export function rutaCorreaLateral(): THREE.Vector3[] {
  const lado = (s: number) => [
    v(s * 0.03, 1.776, 0.06),
    v(s * 0.062, 1.745, 0.072),
    v(s * 0.078, 1.7, 0.076),
    v(s * 0.082, 1.645, 0.08),
    v(s * 0.072, 1.585, 0.09),
    v(s * 0.045, 1.535, 0.1),
  ];
  return [...lado(-1), v(0, 1.526, 0.103), ...lado(1).reverse()];
}

/** Dos correas sobre el vértice, de la frente a la nuca. */
export function rutaCorreaCorona(x: number): THREE.Vector3[] {
  return [
    v(x, 1.745, 0.126),
    v(x, 1.766, 0.098),
    v(x, 1.783, 0.052),
    v(x, 1.787, 0.01),
    v(x, 1.776, -0.032),
    v(x, 1.75, -0.058),
    v(x, 1.712, -0.074),
  ];
}

export const LINEA_LATON = [
  v(-0.056, 1.762, 0.052),
  v(-0.02, 1.789, 0.048),
  v(0.03, 1.789, 0.032),
  v(0.07, 1.762, 0.002),
  v(0.086, 1.726, -0.016),
];

/** Hebillas grises superiores e inferiores (lado +1 = izquierda). */
export const HEBILLAS = (s: 1 | -1) => ({
  superior: { centro: v(s * 0.062, 1.648, 0.128), hacia: v(s * 0.08, 1.668, 0.082) },
  inferior: { centro: v(s * 0.058, 1.566, 0.12), hacia: v(s * 0.072, 1.585, 0.092) },
});

/** Umbilical trenzado: del módulo trasero izquierdo, por la espalda, hasta la cadera izquierda. */
export function rutaUmbilical(torso: Perfil): THREE.Vector3[] {
  return [
    v(0.15, 1.563, -0.066),
    v(0.14, 1.51, -0.09),
    puntoSuperficie(torso, 1.42, 150, 0.016),
    puntoSuperficie(torso, 1.27, 152, 0.018),
    puntoSuperficie(torso, 1.12, 135, 0.02),
    puntoSuperficie(torso, 1.02, 108, 0.024),
    v(0.168, 0.968, 0.02),
  ];
}

/** Líneas de muestra ámbar: de los conectores de los sensores al bloque de montaje. */
export function rutasMuestra(): THREE.Vector3[][] {
  return SENSORES.map((s) => {
    const fondo = s.arriba.clone().setY(s.arriba.y - s.largo - 0.03);
    return [
      fondo,
      fondo.clone().add(v(0.006, -0.022, -0.01)),
      v(0.158, 1.452, -0.006),
      v(0.162, 1.5, -0.012),
    ];
  });
}

/** Puntos (mundo) de las piezas con sensor. */
export function puntosPuma(_torso?: Perfil): Record<string, THREE.Vector3> {
  return {
    o2: SENSORES[0].arriba.clone().add(v(0.022, -0.02, 0)),
    co2_aliento: SENSORES[1].arriba.clone().add(v(0.022, -0.02, 0)),
    flujo: enCamara(0.5).add(v(0.026, 0.012, 0)),
    electronica: CARCASA.disipador.centro.clone().add(v(-0.022, 0, 0)),
  };
}

export const VISTA_PUMA = {
  posicion: v(0.62, 1.74, 0.78),
  objetivo: v(0.0, 1.6, 0.0),
};
