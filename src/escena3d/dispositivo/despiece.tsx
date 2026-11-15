import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

/* ------------------------------------------------------------------------------------------
 * Despiece: cada parte se aleja según su vector (AYNI_DISPOSITIVOS_3D.md §8)
 * ---------------------------------------------------------------------------------------- */

interface ContextoDespiece {
  /** 0 = armado, 1 = despiece completo (se lee en cada cuadro, no provoca renders). */
  t: { current: number };
  /** Nombres de las partes (id → texto); si falta, no se etiqueta. */
  nombres: Record<string, string>;
  conEtiquetas: boolean;
}

const Despiece = createContext<ContextoDespiece>({
  t: { current: 0 },
  nombres: {},
  conEtiquetas: false,
});

export function ProveedorDespiece({
  activo,
  nombres,
  conEtiquetas,
  reducido,
  children,
}: {
  activo: boolean;
  nombres: Record<string, string>;
  conEtiquetas: boolean;
  reducido: boolean;
  children: ReactNode;
}) {
  const t = useRef(0);
  useFrame((_, delta) => {
    const meta = activo ? 1 : 0;
    t.current = reducido ? meta : THREE.MathUtils.damp(t.current, meta, 6, Math.min(delta, 0.1));
  });
  const valor = useMemo(() => ({ t, nombres, conEtiquetas }), [nombres, conEtiquetas]);
  return <Despiece.Provider value={valor}>{children}</Despiece.Provider>;
}

/** Grupo de una parte: se desplaza `separar` (m) en el despiece y muestra su nombre. */
export function Parte({
  id,
  separar = [0, 0, 0],
  ancla,
  children,
}: {
  id: string;
  separar?: [number, number, number];
  /** Dónde poner la etiqueta (coordenadas de la parte); por defecto el origen del grupo. */
  ancla?: [number, number, number];
  children: ReactNode;
}) {
  const { t, nombres, conEtiquetas } = useContext(Despiece);
  const grupo = useRef<THREE.Group>(null);
  const [etiqueta, setEtiqueta] = useState(false);
  useFrame(() => {
    if (!grupo.current) return;
    const k = t.current;
    grupo.current.position.set(separar[0] * k, separar[1] * k, separar[2] * k);
    const mostrar = conEtiquetas && k > 0.6;
    if (mostrar !== etiqueta) setEtiqueta(mostrar);
  });
  const nombre = nombres[id];
  return (
    <group ref={grupo} name={id} userData={{ parte: id }}>
      {children}
      {etiqueta && nombre && (
        <Html
          center
          position={ancla ?? [0, 0, 0]}
          zIndexRange={[25, 5]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="whitespace-nowrap rounded border border-acento/60 bg-fondo-profundo/85 px-1.5 py-0.5 text-[0.68rem] text-tinta">
            {nombre}
          </span>
        </Html>
      )}
    </group>
  );
}
