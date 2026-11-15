import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { useParametrosCalidad } from '../calidad';
import { useEmisivoZonas, useLiberar, useOpacidadCapa } from './animacionCapa';
import { crearMusculos } from './geometrias';
import { crearMaterialTranslucido, ORDEN_RENDER } from './materiales';

const ROJO_MUSCULO = '#B8484B';
const OPACIDAD_MUSCULOS = 0.7;

/** Músculos (5.2): elipsoides rojo apagado translúcido con emisivo de estado. */
export function CapaMusculos() {
  const { segmentos } = useParametrosCalidad();
  const piezas = useMemo(() => crearMusculos(segmentos), [segmentos]);
  const material = useMemo(() => crearMaterialTranslucido(ROJO_MUSCULO, { roughness: 0.7 }), []);
  useLiberar(...piezas.map((p) => p.geometria));
  useLiberar(material);

  const porZona = useMemo(() => new Map([['musculos', [material]]]), [material]);
  useEmisivoZonas(porZona);

  const grupo = useRef<THREE.Group>(null);
  useOpacidadCapa('musculos', grupo, (o) => {
    material.opacity = o * OPACIDAD_MUSCULOS;
  });

  return (
    <group ref={grupo}>
      {piezas.map((p) => (
        <mesh
          key={p.nombre}
          name={p.nombre}
          geometry={p.geometria}
          material={material}
          renderOrder={ORDEN_RENDER.interno}
        />
      ))}
    </group>
  );
}
