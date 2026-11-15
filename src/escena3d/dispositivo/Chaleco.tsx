import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ALTURA_CHALECO, type MedidasTorso } from './torso';

type Animacion =
  'presentar' | 'volar_a_anclaje' | 'ajustar' | 'medir' | 'mostrar_resultado' | 'error';

interface Props {
  medidas: MedidasTorso;
  animacion: Animacion;
  duracionMs: number;
  /** Cambia para relanzar la animación del paso ("Repetir paso"). */
  repeticion: string;
  /** Desplazamiento del error común: dibuja un chaleco fantasma rojo desplazado. */
  fantasma: [number, number, number] | null;
  reducido: boolean;
}

const COLOR_TELA = '#3A4A63';
const COLOR_TELA_BRILLO = '#0F1D30';
const COLOR_COSTURA = '#22D3EE';
const COLOR_BANDA = '#FBBF24';
const COLOR_ERROR = '#F87171';
const ANGULO_COSTURA = THREE.MathUtils.degToRad(38);

const suave = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

function curvaElipse(m: MedidasTorso, y: number, extra: number) {
  const puntos = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return new THREE.Vector3((m.rx + extra) * Math.sin(a), y, m.cz + (m.rz + extra) * Math.cos(a));
  });
  return new THREE.CatmullRomCurve3(puntos, true);
}

/** Chaleco biométrico procedural en coordenadas del cuerpo (AYNI_FUSION.md §7.3). */
export function Chaleco({ medidas, animacion, duracionMs, repeticion, fantasma, reducido }: Props) {
  const grupo = useRef<THREE.Group>(null);
  const inicio = useRef<number | null>(null);
  const alto = ALTURA_CHALECO.hasta - ALTURA_CHALECO.desde;
  const centroY = (ALTURA_CHALECO.desde + ALTURA_CHALECO.hasta) / 2;

  const geometrias = useMemo(() => {
    const tela = new THREE.CylinderGeometry(0.96, 1, alto, 56, 1, true);
    const costura = (lado: 1 | -1) => {
      const x = (medidas.rx + 0.003) * Math.sin(lado * ANGULO_COSTURA);
      const z = medidas.cz + (medidas.rz + 0.003) * Math.cos(ANGULO_COSTURA);
      return new THREE.TubeGeometry(
        new THREE.LineCurve3(
          new THREE.Vector3(x, ALTURA_CHALECO.desde + 0.01, z),
          new THREE.Vector3(x, ALTURA_CHALECO.hasta - 0.01, z),
        ),
        8,
        0.0022,
        6,
        false,
      );
    };
    return {
      tela,
      banda: new THREE.TubeGeometry(curvaElipse(medidas, 1.2, 0.004), 96, 0.008, 8, true),
      costuraIzq: costura(1),
      costuraDer: costura(-1),
      hombrera: new THREE.CapsuleGeometry(0.022, 0.11, 4, 12),
    };
  }, [medidas, alto]);

  const materiales = useMemo(
    () => ({
      tela: new THREE.MeshStandardMaterial({
        color: COLOR_TELA,
        emissive: COLOR_TELA_BRILLO,
        roughness: 0.62,
        metalness: 0.25,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
      }),
      costura: new THREE.MeshStandardMaterial({
        color: COLOR_COSTURA,
        emissive: COLOR_COSTURA,
        emissiveIntensity: 0.6,
      }),
      banda: new THREE.MeshStandardMaterial({ color: COLOR_BANDA, roughness: 0.5 }),
      fantasma: new THREE.MeshBasicMaterial({
        color: COLOR_ERROR,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    }),
    [],
  );

  useEffect(
    () => () => {
      Object.values(geometrias).forEach((g) => g.dispose());
    },
    [geometrias],
  );
  useEffect(() => () => Object.values(materiales).forEach((m) => m.dispose()), [materiales]);
  useEffect(() => {
    inicio.current = null;
  }, [animacion, repeticion]);

  useFrame((state) => {
    const g = grupo.current;
    if (!g) return;
    inicio.current ??= state.clock.elapsedTime;
    const t = reducido ? 1 : (state.clock.elapsedTime - inicio.current) / (duracionMs / 1000);
    g.position.set(0, 0, 0);
    g.scale.setScalar(1);
    if (animacion === 'presentar' && !reducido)
      g.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.006);
    if (animacion === 'volar_a_anclaje') g.position.y = 0.4 * (1 - suave(t));
    if (animacion === 'ajustar') g.scale.setScalar(1.03 - 0.03 * suave(t));
  });

  const telaProps = {
    geometry: geometrias.tela,
    position: [0, centroY, medidas.cz] as [number, number, number],
    scale: [medidas.rx, 1, medidas.rz] as [number, number, number],
  };

  return (
    <>
      <group ref={grupo} name="dispositivo_chaleco">
        <mesh name="dispositivo_chaleco_tela" {...telaProps} material={materiales.tela} />
        <mesh
          name="dispositivo_chaleco_costura_izq"
          geometry={geometrias.costuraIzq}
          material={materiales.costura}
        />
        <mesh
          name="dispositivo_chaleco_costura_der"
          geometry={geometrias.costuraDer}
          material={materiales.costura}
        />
        <mesh
          name="dispositivo_chaleco_banda"
          geometry={geometrias.banda}
          material={materiales.banda}
        />
        {([1, -1] as const).map((lado) => (
          <mesh
            key={lado}
            name={`dispositivo_chaleco_hombrera_${lado === 1 ? 'izq' : 'der'}`}
            geometry={geometrias.hombrera}
            material={materiales.tela}
            position={[lado * medidas.rx * 0.62, ALTURA_CHALECO.hasta + 0.035, medidas.cz]}
            rotation={[0, 0, lado * 1.05]}
            scale={[1, 1, 0.55]}
          />
        ))}
      </group>
      {fantasma && (
        <mesh
          name="dispositivo_chaleco_fantasma"
          {...telaProps}
          position={[fantasma[0], centroY + fantasma[1], medidas.cz + fantasma[2]]}
          scale={[medidas.rx * 1.06, 1, medidas.rz * 1.1]}
          material={materiales.fantasma}
        />
      )}
    </>
  );
}
