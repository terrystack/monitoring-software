import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Parte } from '../despiece';
import { cinta, superficie, tubo, tuboVariable, useGeometrias } from '../geometria';
import { crearMateriales, type Variante } from '../materiales';
import {
  afueraTirante,
  BANDA,
  brocheElectrodo,
  cajaEnBanda,
  CLAVIJAS,
  colaElectrodo,
  DISCOS,
  DOSIMETRO,
  ejeBrazo,
  ELECTRODOS,
  MANGUITO,
  normalTorso,
  orientacionManguito,
  orientacionTorso,
  PARCHE,
  PRESILLAS,
  puntoManguito,
  puntoTorso,
  REGISTRADOR,
  rutaCable,
  rutaManguera,
  rutaTirante,
  SOBRE_BANDA,
} from './geometria';

/**
 * Arnés ECG con dosímetro y manguito de presión (propuesta del equipo AYNI, reconstruida de una
 * vista frontal, una isométrica y una lateral izquierda). Las pantallas muestran los valores del
 * motor: pulso y presión en el registrador; dosis del día y acumulada en el dosímetro.
 */

export interface LecturasArnes {
  pulso: number | null;
  sistolica: number | null;
  diastolica: number | null;
  dosisDia: number | null;
  dosisTotal: number | null;
}

interface Props {
  variante?: Variante;
  lecturas?: LecturasArnes;
  reducido?: boolean;
}

const SIN_LECTURAS: LecturasArnes = {
  pulso: null,
  sistolica: null,
  diastolica: null,
  dosisDia: null,
  dosisTotal: null,
};

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const desde = (dir: THREE.Vector3) =>
  new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), dir.clone().normalize());

/* --- Texturas de canvas ------------------------------------------------------------------ */

function lienzo(ancho: number, alto: number, dibujar: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (ctx) dibujar(ctx);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Malla perforada de la banda: rombos oscuros sobre azul marino. */
function texturaMalla() {
  const t = lienzo(64, 64, (c) => {
    c.fillStyle = '#46516B';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#1C2333';
    const rombo = (x: number, y: number) => {
      c.beginPath();
      c.moveTo(x, y - 13);
      c.lineTo(x + 13, y);
      c.lineTo(x, y + 13);
      c.lineTo(x - 13, y);
      c.closePath();
      c.fill();
    };
    rombo(16, 16);
    rombo(48, 48);
    rombo(48, -16);
    rombo(-16, 48);
    rombo(16, 80);
    rombo(80, 16);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(70, 7);
  return t;
}

/** Tela del manguito: neopreno negro con textura de panal tenue. */
function texturaNeopreno() {
  const t = lienzo(64, 64, (c) => {
    c.fillStyle = '#1D1F23';
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = '#2B2E34';
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const x = i * 16 + (j % 2) * 8;
        const y = j * 16;
        c.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          c.lineTo(x + 6 * Math.cos(a), y + 6 * Math.sin(a));
        }
        c.closePath();
        c.stroke();
      }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(40, 3);
  return t;
}

/** Parche con el trazo del ECG. */
function texturaParche() {
  return lienzo(128, 128, (c) => {
    c.fillStyle = '#3C4762';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#6B7690';
    c.lineWidth = 6;
    c.strokeRect(5, 5, 118, 118);
    c.strokeStyle = '#F1F5F9';
    c.lineWidth = 4;
    c.lineJoin = 'round';
    c.beginPath();
    [
      [14, 68],
      [44, 68],
      [52, 56],
      [60, 92],
      [70, 30],
      [80, 80],
      [86, 68],
      [114, 68],
    ].forEach(([x, y]) => c.lineTo(x, y));
    c.stroke();
  });
}

const fuente = (peso: number, px: number) => `${peso} ${px}px Biryani, system-ui, sans-serif`;
const fmt = (n: number | null, dec = 0) => (n == null ? '--' : n.toFixed(dec));

/** Cara del registrador: pantalla con pulso y presión, botones y fila de iconos. */
function dibujarRegistrador(c: CanvasRenderingContext2D, l: LecturasArnes) {
  const { width: w, height: h } = c.canvas;
  c.fillStyle = '#D9DCE0';
  c.fillRect(0, 0, w, h);
  // Marco y pantalla.
  c.fillStyle = '#9EA4AA';
  c.beginPath();
  c.roundRect(26, 34, w - 52, 172, 10);
  c.fill();
  c.fillStyle = '#BCC6B6';
  c.fillRect(36, 44, w - 72, 152);
  c.fillStyle = '#2F3A33';
  c.font = fuente(600, 20);
  c.fillText('HR', 48, 70);
  c.textAlign = 'right';
  c.font = fuente(700, 64);
  c.fillText(fmt(l.pulso), w - 46, 112);
  c.font = fuente(600, 22);
  c.fillText(`${fmt(l.sistolica)}/${fmt(l.diastolica)} mmHg`, w - 46, 180);
  c.textAlign = 'left';
  c.strokeStyle = '#2F3A33';
  c.lineWidth = 2.5;
  c.beginPath();
  [
    [48, 140],
    [70, 140],
    [76, 132],
    [82, 150],
    [88, 118],
    [94, 146],
    [100, 140],
    [130, 140],
  ].forEach(([x, y]) => c.lineTo(x, y));
  c.stroke();
  // Iconos junto a los botones (los botones son relieves 3D).
  c.strokeStyle = '#1E3A8A';
  c.lineWidth = 4;
  const icono = (y: number, tipo: number) => {
    c.beginPath();
    if (tipo === 0)
      [
        [140, y + 6],
        [150, y - 6],
        [160, y + 6],
      ].forEach(([x, yy]) => c.lineTo(x, yy));
    if (tipo === 1)
      [
        [140, y - 6],
        [150, y + 6],
        [160, y - 6],
      ].forEach(([x, yy]) => c.lineTo(x, yy));
    if (tipo === 2) c.arc(150, y, 5, 0, Math.PI * 2);
    if (tipo === 3)
      [
        [158, y - 8],
        [146, y],
        [158, y + 8],
      ].forEach(([x, yy]) => c.lineTo(x, yy));
    c.stroke();
  };
  BOTONES.forEach((py, i) => icono(py, i));
  // Fila inferior: encendido y modos.
  c.fillStyle = '#2546A8';
  c.beginPath();
  c.ellipse(52, 430, 16, 9, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#D7262E';
  c.lineWidth = 4;
  c.beginPath();
  c.arc(104, 432, 11, -1.1, Math.PI + 1.1);
  c.stroke();
  c.beginPath();
  c.moveTo(104, 416);
  c.lineTo(104, 430);
  c.stroke();
  c.strokeStyle = '#2B7BD8';
  c.strokeRect(146, 420, 18, 18);
  c.beginPath();
  c.arc(204, 430, 11, 0, Math.PI * 2);
  c.stroke();
}
/** Filas (px del canvas) de los 4 botones del registrador. */
const BOTONES = [250, 292, 334, 376];
const CARA_REG = { ancho: 256, alto: 476 };

/** Cara del dosímetro: pantalla verde con dosis del día y acumulada. */
function dibujarDosimetro(c: CanvasRenderingContext2D, l: LecturasArnes) {
  const { width: w, height: h } = c.canvas;
  c.fillStyle = '#202226';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#9BE35A';
  c.beginPath();
  c.roundRect(20, 24, w - 40, 196, 8);
  c.fill();
  c.fillStyle = '#17260F';
  c.font = fuente(600, 18);
  c.fillText('▲ ◆', 34, 52);
  c.fillText('mSv', w - 74, 52);
  c.fillText('DAY', 34, 110);
  c.fillText('DOSE', 34, 188);
  c.textAlign = 'right';
  c.font = fuente(700, 58);
  c.fillText(fmt(l.dosisDia, 2), w - 34, 122);
  c.font = fuente(700, 40);
  c.fillText(fmt(l.dosisTotal, 1), w - 34, 196);
  c.textAlign = 'center';
  c.fillStyle = '#E5E7EB';
  c.font = `italic 600 24px Georgia, serif`;
  c.fillText('Personal Dosimeter', w / 2, h - 38);
  c.textAlign = 'left';
  c.fillStyle = '#3A3D44';
  c.beginPath();
  c.arc(w / 2, 250, 5, 0, Math.PI * 2);
  c.fill();
}
const CARA_DOS = { ancho: 256, alto: 380 };

/* --- Materiales -------------------------------------------------------------------------- */

function crearMaterialesArnes(variante: Variante) {
  const base = crearMateriales(variante);
  const nombres = [
    'malla',
    'marino',
    'correa',
    'gris',
    'grisOscuro',
    'negro',
    'neopreno',
    'goma',
    'disco',
    'cable',
    'rojo',
    'verde',
    'blanco',
    'negroBroche',
    'boton',
  ] as const;
  if (variante === 'fantasma')
    return {
      ...base,
      ...(Object.fromEntries(nombres.map((n) => [n, base.tela])) as unknown as Record<
        (typeof nombres)[number],
        THREE.MeshStandardMaterial
      >),
    };
  const std = (
    color: string,
    rugosidad: number,
    extra: THREE.MeshStandardMaterialParameters = {},
  ) => new THREE.MeshStandardMaterial({ color, roughness: rugosidad, ...extra });
  return {
    ...base,
    malla: std('#FFFFFF', 0.85, { map: texturaMalla(), side: THREE.DoubleSide }),
    marino: std('#2D3548', 0.8, { side: THREE.DoubleSide }),
    correa: std('#5C6884', 0.88, { side: THREE.DoubleSide }),
    gris: std('#D9DCE0', 0.42),
    grisOscuro: std('#9EA4AA', 0.5),
    negro: std('#202226', 0.55),
    neopreno: std('#FFFFFF', 0.82, { map: texturaNeopreno(), side: THREE.DoubleSide }),
    goma: std('#16181B', 0.35),
    disco: std('#C9CDD3', 0.5),
    cable: std('#D4D2CB', 0.55),
    rojo: std('#C8322E', 0.35),
    verde: std('#2E8B57', 0.35),
    blanco: std('#EEEEEE', 0.35),
    negroBroche: std('#1A1A1A', 0.35),
    boton: std('#33467A', 0.4),
  };
}

type MaterialesArnes = ReturnType<typeof crearMaterialesArnes>;

function useMaterialesArnes(variante: Variante): MaterialesArnes {
  const m = useMemo(() => crearMaterialesArnes(variante), [variante]);
  useEffect(
    () => () =>
      new Set(Object.values(m) as THREE.Material[]).forEach((x) => {
        const mapa = (x as THREE.MeshStandardMaterial).map;
        mapa?.dispose();
        x.dispose();
      }),
    [m],
  );
  return m;
}

/** Textura de canvas que se redibuja cuando cambian las lecturas. */
function usePantalla(
  tamano: { ancho: number; alto: number },
  dibujar: (c: CanvasRenderingContext2D, l: LecturasArnes) => void,
  l: LecturasArnes,
) {
  const tex = useMemo(() => lienzo(tamano.ancho, tamano.alto, () => {}), [tamano]);
  useEffect(() => {
    const c = (tex.image as HTMLCanvasElement).getContext('2d');
    if (!c) return;
    dibujar(c, l);
    tex.needsUpdate = true;
  }, [tex, dibujar, l]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/* --- Componente ---------------------------------------------------------------------------- */

const COLOR_BROCHE = {
  rojo: 'rojo',
  verde: 'verde',
  blanco: 'blanco',
  negro: 'negroBroche',
} as const;

export function Arnes({ variante = 'normal', lecturas = SIN_LECTURAS, reducido = false }: Props) {
  const m = useMaterialesArnes(variante);
  const fantasma = variante === 'fantasma';
  const led = useRef<THREE.MeshStandardMaterial>(null);

  const caraReg = usePantalla(CARA_REG, dibujarRegistrador, lecturas);
  const caraDos = usePantalla(CARA_DOS, dibujarDosimetro, lecturas);
  const parche = useMemo(() => texturaParche(), []);
  useEffect(() => () => parche.dispose(), [parche]);

  const g = useGeometrias(() => {
    const anillo = (extra: number) =>
      superficie(
        (u, w) => puntoTorso(BANDA.abajo + (BANDA.arriba - BANDA.abajo) * w, u * 360 - 180, extra),
        180,
        6,
        { cerradaU: true },
      );
    const borde = (y: number) =>
      tubo(
        Array.from({ length: 120 }, (_, i) =>
          puntoTorso(y, (i / 120) * 360 - 180, BANDA.piel + BANDA.grosor / 2),
        ),
        BANDA.grosor / 2 + 0.0012,
        true,
        240,
      );
    const presilla = (a: number) =>
      cinta(
        [BANDA.abajo - 0.006, 1.25, BANDA.arriba + 0.006].map((y) =>
          puntoTorso(y, a, SOBRE_BANDA + 0.0025),
        ),
        () => normalTorso(1.25, a),
        0.011,
        false,
        8,
      );

    // Manguito: sección de rectángulo redondeado (superelipse) alrededor del brazo.
    const seccion = (s: number) => {
      const a = s * Math.PI * 2;
      const p = (x: number) => Math.sign(x) * Math.abs(x) ** 0.25;
      return { t: 0.5 + 0.5 * p(Math.cos(a)), d: 0.5 + 0.5 * p(Math.sin(a)) };
    };
    const manguito = superficie(
      (u, w) => {
        const { t, d } = seccion(w);
        return puntoManguito(t, u * 360 - 180, 0.002 + d * MANGUITO.grosor);
      },
      120,
      24,
      { cerradaU: true },
    );
    const [a0, a1] = [-55, MANGUITO.hebilla];
    const solapa = superficie(
      (u, w) => {
        const ang = a0 + (a1 - a0) * u;
        const k = Math.min(1, (ang - a0) / 5, (a1 - ang) / 2 + 0.25);
        const { t, d } = seccion(w);
        const tt = 0.06 + 0.88 * t;
        return puntoManguito(tt, ang, 0.002 + MANGUITO.grosor + 0.0006 + d * 0.0045 * k);
      },
      60,
      16,
    );

    const electrodos = ELECTRODOS.map((_, i) => {
      const b = brocheElectrodo(i);
      const centro = b.centro.clone().add(v(0, 0, 0).applyQuaternion(b.rotacion));
      return {
        cuerpo: tuboVariable(
          [centro, centro.clone().lerp(colaElectrodo(i), 0.55), colaElectrodo(i)],
          (t) => 0.0046 - 0.0024 * t,
          16,
          12,
        ),
        cable: tubo(rutaCable(i), 0.0013, false, 60),
      };
    });

    return {
      exterior: anillo(SOBRE_BANDA),
      interior: anillo(BANDA.piel),
      bordeSup: borde(BANDA.arriba),
      bordeInf: borde(BANDA.abajo),
      tiranteIzq: cinta(rutaTirante(1), afueraTirante, 0.04, false, 140),
      tiranteDer: cinta(rutaTirante(-1), afueraTirante, 0.04, false, 140),
      ...Object.fromEntries(PRESILLAS.map((a, i) => [`presilla${i}`, presilla(a)])),
      manguito,
      solapa,
      manguera: tubo(rutaManguera(), 0.0042, false, 120),
      ...Object.fromEntries(
        electrodos.flatMap((e, i) => [
          [`cuerpo${i}`, e.cuerpo],
          [`cable${i}`, e.cable],
        ]),
      ),
    } as Record<string, THREE.BufferGeometry>;
  }, []);

  useFrame((state) => {
    if (!led.current) return;
    const lpm = lecturas.pulso ?? 64;
    const fase = (state.clock.elapsedTime * lpm) / 60;
    led.current.emissiveIntensity = reducido
      ? 1
      : 0.3 + 1.6 * Math.max(0, Math.sin(fase * Math.PI * 2)) ** 8;
  });

  const [anchoR, altoR, fondoR] = REGISTRADOR.tamano;
  const reg = cajaEnBanda(REGISTRADOR.y, REGISTRADOR.angulo, fondoR);
  const [anchoD, altoD, fondoD] = DOSIMETRO.tamano;
  const dos = cajaEnBanda(DOSIMETRO.y, DOSIMETRO.angulo, fondoD, DOSIMETRO.giro);
  const pxReg = (px: number, py: number): [number, number] => [
    (px / CARA_REG.ancho - 0.5) * (anchoR - 0.008),
    (0.5 - py / CARA_REG.alto) * (altoR - 0.01),
  ];
  const hebilla = {
    p: puntoManguito(0.5, MANGUITO.hebilla, MANGUITO.grosor + 0.007),
    q: orientacionManguito(0.5, MANGUITO.hebilla),
  };
  const conectorManguito = puntoManguito(-0.025, MANGUITO.tubo, MANGUITO.grosor * 0.5);
  const parcheP = puntoTorso(1.252, PARCHE.angulo, SOBRE_BANDA + 0.0012);

  return (
    <group name="arnes">
      <Parte id="banda" separar={[0, 0, 0.04]} ancla={[-0.13, BANDA.abajo - 0.02, 0.1]}>
        <mesh geometry={g.exterior} material={m.malla} />
        <mesh geometry={g.interior} material={m.marino} />
        <mesh geometry={g.bordeSup} material={m.marino} />
        <mesh geometry={g.bordeInf} material={m.marino} />
        {PRESILLAS.map((_, i) => (
          <mesh key={i} geometry={g[`presilla${i}`]} material={m.marino} />
        ))}
        <group position={parcheP} quaternion={orientacionTorso(1.252, PARCHE.angulo)}>
          <RoundedBox
            args={[PARCHE.lado, PARCHE.lado, 0.002]}
            radius={0.0008}
            smoothness={2}
            material={m.marino}
          />
          {!fantasma && (
            <mesh position={[0, 0, 0.0011]}>
              <planeGeometry args={[PARCHE.lado * 0.96, PARCHE.lado * 0.96]} />
              <meshStandardMaterial map={parche} roughness={0.8} />
            </mesh>
          )}
        </group>
      </Parte>

      <Parte id="tirantes" separar={[0, 0.08, 0]} ancla={[0.1, 1.53, 0.0]}>
        <mesh geometry={g.tiranteIzq} material={m.correa} />
        <mesh geometry={g.tiranteDer} material={m.correa} />
      </Parte>

      <Parte id="discos" separar={[0, 0, 0.07]} ancla={[0.1, 1.29, 0.14]}>
        {DISCOS.map((a) => (
          <group
            key={a}
            position={puntoTorso(1.252, a, SOBRE_BANDA + 0.0012)}
            quaternion={orientacionTorso(1.252, a)}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]} material={m.disco}>
              <cylinderGeometry args={[0.017, 0.017, 0.0026, 32]} />
            </mesh>
          </group>
        ))}
      </Parte>

      <Parte
        id="registrador"
        separar={[0, 0, 0.12]}
        ancla={[0, REGISTRADOR.y + altoR / 2 + 0.02, reg.centro.z + 0.02]}
      >
        <group position={reg.centro} quaternion={reg.rotacion}>
          <RoundedBox
            args={[anchoR, altoR, fondoR]}
            radius={0.008}
            smoothness={4}
            material={m.gris}
          />
          {!fantasma && (
            <>
              <mesh position={[0, 0, fondoR / 2 + 0.0002]}>
                <planeGeometry args={[anchoR - 0.008, altoR - 0.01]} />
                <meshStandardMaterial map={caraReg} roughness={0.45} />
              </mesh>
              {BOTONES.map((py) => {
                const [x, y] = pxReg(80, py);
                return (
                  <mesh
                    key={py}
                    position={[x, y, fondoR / 2 + 0.0012]}
                    scale={[1, 1, 0.42]}
                    rotation={[Math.PI / 2, 0, 0]}
                    material={m.boton}
                  >
                    <cylinderGeometry args={[0.0052, 0.0052, 0.0022, 24]} />
                  </mesh>
                );
              })}
              <mesh position={[anchoR / 2 - 0.009, altoR / 2 - 0.007, fondoR / 2 + 0.0004]}>
                <circleGeometry args={[0.0016, 14]} />
                <meshStandardMaterial
                  ref={led}
                  color="#22C55E"
                  emissive="#22C55E"
                  emissiveIntensity={1}
                />
              </mesh>
            </>
          )}
          {/* Clavijas de los cables en la cara superior. */}
          {CLAVIJAS.map((x) => (
            <group key={x} position={[x, altoR / 2, 0]}>
              <mesh position={[0, 0.006, 0]} material={m.grisOscuro}>
                <cylinderGeometry args={[0.0033, 0.0033, 0.012, 16]} />
              </mesh>
              <mesh position={[0, 0.0135, 0]} material={m.cable}>
                <cylinderGeometry args={[0.0018, 0.0028, 0.007, 12]} />
              </mesh>
            </group>
          ))}
          {/* Conector del tubo de aire en el costado izquierdo. */}
          <mesh
            position={[anchoR / 2 + 0.005, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={m.metal}
          >
            <cylinderGeometry args={[0.0048, 0.0048, 0.01, 6]} />
          </mesh>
          <mesh
            position={[anchoR / 2 + 0.016, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={m.grisOscuro}
          >
            <cylinderGeometry args={[0.0044, 0.0056, 0.014, 16]} />
          </mesh>
        </group>
      </Parte>

      <Parte id="electrodos" separar={[0, 0.05, 0.1]} ancla={[0.13, 1.45, 0.11]}>
        {ELECTRODOS.map((e, i) => {
          const b = brocheElectrodo(i);
          const mat = m[COLOR_BROCHE[e.color]];
          return (
            <group key={e.id}>
              <group position={b.centro} quaternion={b.rotacion}>
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.0022]} material={mat}>
                  <cylinderGeometry args={[0.0098, 0.0098, 0.0044, 28]} />
                </mesh>
                <mesh position={[0, 0, 0.0044]} scale={[1, 1, 0.42]} material={mat}>
                  <sphereGeometry args={[0.0098, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
              </group>
              <mesh geometry={g[`cuerpo${i}`]} material={mat} />
              <mesh geometry={g[`cable${i}`]} material={m.cable} />
            </group>
          );
        })}
      </Parte>

      <Parte
        id="dosimetro"
        separar={[-0.08, 0, 0.08]}
        ancla={[dos.centro.x - 0.02, DOSIMETRO.y + altoD / 2 + 0.02, dos.centro.z]}
      >
        <group position={dos.centro} quaternion={dos.rotacion}>
          <RoundedBox
            args={[anchoD, altoD, fondoD]}
            radius={0.006}
            smoothness={4}
            material={m.negro}
          />
          <RoundedBox
            args={[0.034, 0.012, 0.014]}
            radius={0.003}
            smoothness={2}
            position={[0, altoD / 2 + 0.004, -0.002]}
            material={m.negro}
          />
          <mesh
            position={[0, altoD / 2 + 0.006, -0.002]}
            rotation={[0, 0, Math.PI / 2]}
            material={m.grisOscuro}
          >
            <cylinderGeometry args={[0.0022, 0.0022, 0.038, 12]} />
          </mesh>
          {!fantasma && (
            <mesh position={[0, 0, fondoD / 2 + 0.0002]}>
              <planeGeometry args={[anchoD - 0.006, altoD - 0.006]} />
              <meshStandardMaterial map={caraDos} roughness={0.35} />
            </mesh>
          )}
        </group>
      </Parte>

      <Parte
        id="manguito"
        separar={[0.1, 0, 0]}
        ancla={[MANGUITO.arriba.x + 0.06, MANGUITO.arriba.y + 0.02, 0]}
      >
        <mesh geometry={g.manguito} material={m.neopreno} />
        <mesh geometry={g.solapa} material={m.neopreno} />
        <group position={hebilla.p} quaternion={hebilla.q}>
          {[-1, 1].map((s) => (
            <RoundedBox
              key={`v${s}`}
              args={[0.0045, 0.104, 0.006]}
              radius={0.0015}
              smoothness={2}
              position={[s * 0.0075, 0, 0]}
              material={m.goma}
            />
          ))}
          {[-1, 1].map((s) => (
            <RoundedBox
              key={`h${s}`}
              args={[0.0195, 0.0045, 0.006]}
              radius={0.0015}
              smoothness={2}
              position={[0, s * 0.05, 0]}
              material={m.goma}
            />
          ))}
        </group>
        <mesh position={conectorManguito} quaternion={desde(ejeBrazo())} material={m.goma}>
          <cylinderGeometry args={[0.0058, 0.0058, 0.016, 16]} />
        </mesh>
      </Parte>

      <Parte id="manguera" separar={[0.04, -0.06, 0.06]} ancla={[0.13, 1.06, 0.13]}>
        <mesh geometry={g.manguera} material={m.goma} />
      </Parte>
    </group>
  );
}
