import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Parte } from '../despiece';
import { cinta, corrugado, superficie, tuboVariable, useGeometrias } from '../geometria';
import { crearMateriales, type Variante } from '../materiales';
import {
  ALTO_ELECTRODO,
  BANDA,
  BRAZOS,
  elevacionBanda,
  FRONTALES,
  HEBILLAS,
  NUCLEO,
  orientacionCabeza,
  puntoBanda,
  puntoCabeza,
  rutaBajada,
  rutaBrazo,
  rutaEspina,
  seccionBanda,
} from './geometria';

/**
 * Diadema EEG de 8 electrodos secos (propuesta del equipo AYNI, reconstruida de una vista
 * frontal y una lateral): banda segmentada con 3 electrodos frontales y módulo en la nuca,
 * espina hasta el núcleo de la coronilla y 5 brazos segmentados con electrodos de contacto
 * plateado. Un LED del módulo parpadea mientras registra.
 */

interface Props {
  variante?: Variante;
  reducido?: boolean;
}

/** Textura de segmentos de la banda: ranuras finas transversales. */
function texturaSegmentos() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 16;
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = '#2A2C30';
    c.fillRect(0, 0, 64, 16);
    c.fillStyle = '#141518';
    c.fillRect(0, 0, 5, 16);
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(110, 1);
  return t;
}

function crearMaterialesEeg(variante: Variante) {
  const base = crearMateriales(variante);
  const nombres = ['banda', 'brazo', 'negro', 'mate', 'plata', 'puerto'] as const;
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
    banda: std('#FFFFFF', 0.7, { map: texturaSegmentos(), side: THREE.DoubleSide }),
    brazo: std('#26282C', 0.62),
    negro: std('#1E2023', 0.55),
    mate: std('#2E3035', 0.75, { flatShading: true }),
    plata: std('#C8CDD2', 0.25, { metalness: 0.85 }),
    puerto: std('#0B0C0E', 0.4),
  };
}

function useMaterialesEeg(variante: Variante) {
  const m = useMemo(() => crearMaterialesEeg(variante), [variante]);
  useEffect(
    () => () =>
      new Set(Object.values(m) as THREE.Material[]).forEach((x) => {
        (x as THREE.MeshStandardMaterial).map?.dispose();
        x.dispose();
      }),
    [m],
  );
  return m;
}

type MaterialesEeg = ReturnType<typeof crearMaterialesEeg>;

/** Electrodo de brazo: contacto plateado contra la piel, cuerpo moleteado y tapa. */
function Electrodo({
  m,
  posicion,
  rotacion,
}: {
  m: MaterialesEeg;
  posicion: THREE.Vector3;
  rotacion: THREE.Quaternion;
}) {
  return (
    <group position={posicion} quaternion={rotacion}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0.0022, 0]} material={m.plata}>
          <cylinderGeometry args={[0.0085, 0.0095, 0.0044, 24]} />
        </mesh>
        <mesh position={[0, 0.0085, 0]} material={m.mate}>
          <cylinderGeometry args={[0.0118, 0.0118, 0.0085, 20]} />
        </mesh>
        <mesh position={[0, 0.0155, 0]} material={m.negro}>
          <cylinderGeometry args={[0.0125, 0.0122, 0.0055, 32]} />
        </mesh>
      </group>
      <mesh position={[0, 0, ALTO_ELECTRODO - 0.0003]} scale={[1, 1, 0.16]} material={m.negro}>
        <sphereGeometry args={[0.0122, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}

export function Eeg({ variante = 'normal', reducido = false }: Props) {
  const m = useMaterialesEeg(variante);
  const led = useRef<THREE.MeshStandardMaterial>(null);

  const g = useGeometrias(() => {
    // Banda: sección de rectángulo redondeado (superelipse) que engorda en el módulo trasero.
    const p = (x: number) => Math.sign(x) * Math.abs(x) ** 0.3;
    const banda = superficie(
      (u, w) => {
        const a = u * 360 - 180;
        const s = w * Math.PI * 2;
        const { grosor } = seccionBanda(a);
        return puntoBanda(a, 0.5 * p(Math.cos(s)), grosor * (0.5 + 0.5 * p(Math.sin(s))));
      },
      240,
      20,
      { cerradaU: true },
    );
    const espina = cinta(
      rutaEspina(),
      (q) => q.clone().sub(puntoCabeza(180, 0)).normalize(),
      0.03,
      false,
      40,
    );
    const brazos = BRAZOS.map((_, i) =>
      tuboVariable(rutaBrazo(i), corrugado(0.0068, 22, 0.14), 160, 12),
    );
    const bajadas = BRAZOS.map((_, i) => {
      const r = rutaBajada(i);
      return r ? tuboVariable(r, corrugado(0.0052, 9, 0.16), 60, 10) : null;
    });
    return {
      banda,
      espina,
      ...Object.fromEntries(brazos.map((b, i) => [`brazo${i}`, b])),
      ...Object.fromEntries(bajadas.flatMap((b, i) => (b ? [[`bajada${i}`, b]] : []))),
    } as Record<string, THREE.BufferGeometry>;
  }, []);

  useFrame((state) => {
    if (!led.current) return;
    led.current.emissiveIntensity = reducido
      ? 1
      : 0.4 + 1.4 * (Math.sin(state.clock.elapsedTime * Math.PI) > 0.6 ? 1 : 0);
  });

  const nucleo = puntoCabeza(NUCLEO.acimut, NUCLEO.elevacion, 0.012);
  const qNucleo = orientacionCabeza(NUCLEO.acimut, NUCLEO.elevacion);
  const sobreBanda = (a: number, extra: number) => {
    const { grosor } = seccionBanda(a);
    return {
      p: puntoBanda(a, 0, grosor + extra),
      q: orientacionCabeza(a, elevacionBanda(a)),
    };
  };
  const modulo = sobreBanda(180, 0);
  const qModulo = orientacionCabeza(180, elevacionBanda(180) - 3);

  return (
    <group name="eeg">
      <Parte id="banda" separar={[0, 0, 0.05]} ancla={[0.1, 1.67, 0.1]}>
        <mesh geometry={g.banda} material={m.banda} />
        {HEBILLAS.map((a) => {
          const h = sobreBanda(a, 0.003);
          return (
            <group key={a} position={h.p} quaternion={h.q}>
              <RoundedBox
                args={[0.03, BANDA.ancho + 0.006, 0.006]}
                radius={0.0018}
                smoothness={2}
                material={m.negro}
              />
              <mesh position={[0.004, 0, 0.0031]} material={m.puerto}>
                <planeGeometry args={[0.012, BANDA.ancho * 0.6]} />
              </mesh>
            </group>
          );
        })}
      </Parte>

      <Parte id="frontales" separar={[0, 0, 0.07]} ancla={[0, 1.735, 0.16]}>
        {FRONTALES.map((f) => {
          const h = sobreBanda(f.acimut, 0.0005);
          return (
            <group key={f.id} position={h.p} quaternion={h.q}>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.0025]} material={m.negro}>
                <cylinderGeometry args={[0.0165, 0.0165, 0.005, 36]} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.0052]} material={m.mate}>
                <cylinderGeometry args={[0.0118, 0.0118, 0.0012, 32]} />
              </mesh>
            </group>
          );
        })}
      </Parte>

      <Parte id="modulo" separar={[0, -0.02, -0.07]} ancla={[0.05, 1.6, -0.1]}>
        <group position={modulo.p} quaternion={qModulo}>
          <mesh position={[0, -0.012, 0.001]} material={m.puerto}>
            <planeGeometry args={[0.011, 0.004]} />
          </mesh>
          <mesh position={[0.018, -0.012, 0.0012]}>
            <circleGeometry args={[0.0014, 12]} />
            <meshStandardMaterial
              ref={led}
              color="#22D3EE"
              emissive="#22D3EE"
              emissiveIntensity={1}
            />
          </mesh>
        </group>
      </Parte>

      <Parte id="espina" separar={[0, 0.03, -0.05]} ancla={[0, 1.76, -0.11]}>
        <mesh geometry={g.espina} material={m.brazo} />
        <group position={nucleo} quaternion={qNucleo}>
          <RoundedBox args={[0.05, 0.034, 0.01]} radius={0.004} smoothness={3} material={m.negro} />
        </group>
      </Parte>

      <Parte id="brazos" separar={[0, 0.07, 0]} ancla={[0.07, 1.83, 0.02]}>
        {BRAZOS.map((b, i) => (
          <group key={b.id}>
            <mesh geometry={g[`brazo${i}`]} material={m.brazo} />
            {g[`bajada${i}`] && <mesh geometry={g[`bajada${i}`]} material={m.brazo} />}
          </group>
        ))}
      </Parte>

      <Parte id="electrodos" separar={[0, 0.07, 0.03]} ancla={[-0.1, 1.8, 0.08]}>
        {BRAZOS.map((b) => (
          <Electrodo
            key={b.id}
            m={m}
            posicion={puntoCabeza(b.acimut, b.elevacion, 0.0005)}
            rotacion={orientacionCabeza(b.acimut, b.elevacion)}
          />
        ))}
      </Parte>
    </group>
  );
}
