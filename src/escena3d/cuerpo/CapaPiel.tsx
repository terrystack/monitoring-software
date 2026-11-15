import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useMovimientoReducido, useParametrosCalidad } from '../calidad';
import { intensidadEstado, useColoresEstado, useLiberar, useOpacidadCapa } from './animacionCapa';
import { crearPiel } from './geometrias';
import {
  crearMaterialHolografico,
  crearMaterialSoloProfundidad,
  ORDEN_RENDER,
  sinRaycast,
} from './materiales';

export function CapaPiel() {
  const { segmentos } = useParametrosCalidad();
  const pieza = useMemo(() => crearPiel(segmentos), [segmentos]);
  const material = useMemo(() => crearMaterialHolografico(), []);
  const profundidad = useMemo(() => crearMaterialSoloProfundidad(), []);
  useLiberar(pieza.geometria);
  useLiberar(material, profundidad);

  const grupo = useRef<THREE.Group>(null);
  const colores = useColoresEstado();
  const reducido = useMovimientoReducido();

  useOpacidadCapa('piel', grupo, (o) => {
    material.uniforms.uOpacidad.value = o;
  });

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const u = material.uniforms;
    u.uTiempo.value = t;
    u.uEscaneo.value = reducido ? 0 : 1;
    const { estado, intensidad } = intensidadEstado('piel_inmune', t, reducido);
    if (colores[estado]) u.uColorEstado.value.copy(colores[estado]);
    u.uMezclaEstado.value =
      estado === 'atencion' || estado === 'critico' ? Math.min(1, intensidad * 0.7) : 0;
  });

  return (
    <group ref={grupo}>
      {/* Pasada de profundidad: el holograma solo dibuja la superficie exterior, sin las
          cápsulas solapadas por dentro. Va después de las capas internas. */}
      <mesh
        name={pieza.nombre}
        geometry={pieza.geometria}
        material={profundidad}
        renderOrder={ORDEN_RENDER.pielProfundidad}
        raycast={sinRaycast}
      />
      <mesh
        name={pieza.nombre}
        geometry={pieza.geometria}
        material={material}
        renderOrder={ORDEN_RENDER.piel}
      />
    </group>
  );
}
