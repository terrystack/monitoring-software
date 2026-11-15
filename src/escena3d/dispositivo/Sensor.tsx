import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type * as THREE from 'three';

interface Props {
  id: string;
  nombre: string;
  posicion: THREE.Vector3;
  color: string;
  /** Valor actual del primer indicador del sensor ("69 lpm"), si lo hay. */
  etiqueta: string | null;
  destacado: boolean;
  /** Paso "medir": todos los sensores pulsan a 60 lpm a la vez. */
  sincronizado: boolean;
  animado: boolean;
  conEtiqueta: boolean;
  alElegir: () => void;
}

const RADIO = 0.011;

/** Sensor del chaleco: esfera emisiva del color del peor estado que mide, con su valor. */
export function Sensor({
  id,
  nombre,
  posicion,
  color,
  etiqueta,
  destacado,
  sincronizado,
  animado,
  conEtiqueta,
  alElegir,
}: Props) {
  const malla = useRef<THREE.Mesh>(null);
  const fase = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    if (!malla.current) return;
    const base = destacado ? 1.7 : 1;
    if (!animado) {
      malla.current.scale.setScalar(base);
      return;
    }
    const t = state.clock.elapsedTime;
    const pulso = sincronizado
      ? Math.max(0, Math.sin(t * Math.PI * 2)) ** 4
      : (Math.sin(t * 2.2 + fase.current) + 1) / 2;
    malla.current.scale.setScalar(base * (1 + (sincronizado ? 0.45 : 0.15) * pulso));
  });

  return (
    <group position={posicion}>
      <mesh
        ref={malla}
        name={`sensor_${id}`}
        onClick={(e) => {
          e.stopPropagation();
          alElegir();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <sphereGeometry args={[RADIO, 20, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={destacado ? 2.2 : 1.2}
        />
      </mesh>
      {conEtiqueta && (etiqueta || destacado) && (
        <Html
          center
          position={[0, 0.032, 0]}
          zIndexRange={[30, 10]}
          style={{ pointerEvents: 'none' }}
        >
          <span
            className={`whitespace-nowrap rounded-full border bg-fondo-profundo/85 px-2 py-0.5 text-[0.72rem] tabular-nums text-tinta ${
              destacado ? 'border-acento' : 'border-white/10'
            }`}
          >
            {destacado ? `${nombre}${etiqueta ? ` · ${etiqueta}` : ''}` : etiqueta}
          </span>
        </Html>
      )}
    </group>
  );
}
