import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useAyni } from '../../estado/store';
import { useParametrosCalidad } from '../calidad';
import { useEmisivoZonas, useLiberar, useOpacidadCapa } from './animacionCapa';
import { crearEsqueleto } from './geometrias';
import { crearMaterialTranslucido, ORDEN_RENDER } from './materiales';

const MARFIL = '#EFE6CF';

/** Esqueleto (5.2): marfil translúcido; más translúcido = más pérdida de densidad estimada. */
export function CapaEsqueleto() {
  const { segmentos } = useParametrosCalidad();
  const piezas = useMemo(() => crearEsqueleto(segmentos), [segmentos]);
  const material = useMemo(() => crearMaterialTranslucido(MARFIL, { roughness: 0.6 }), []);
  useLiberar(material);
  useLiberar(...piezas.estaticas.map((p) => p.geometria), piezas.columna.geometria);

  const columna = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const malla = columna.current;
    if (!malla) return;
    piezas.columna.matrices.forEach((m, i) => malla.setMatrixAt(i, m));
    malla.instanceMatrix.needsUpdate = true;
    malla.computeBoundingSphere();
  }, [piezas]);

  const grupo = useRef<THREE.Group>(null);
  useOpacidadCapa('esqueleto', grupo, (o) => {
    const densidad = useAyni.getState().estadoCuerpo?.densidadOsea ?? 0.85;
    material.opacity = densidad * o;
  });
  const porZona = useMemo(() => new Map([['huesos', [material]]]), [material]);
  useEmisivoZonas(porZona);

  return (
    <group ref={grupo}>
      {piezas.estaticas.map((p) => (
        <mesh
          key={p.nombre}
          name={p.nombre}
          geometry={p.geometria}
          material={material}
          renderOrder={ORDEN_RENDER.interno}
        />
      ))}
      <instancedMesh
        key={piezas.columna.geometria.uuid}
        ref={columna}
        name={piezas.columna.nombre}
        args={[piezas.columna.geometria, material, piezas.columna.matrices.length]}
        renderOrder={ORDEN_RENDER.interno}
      />
    </group>
  );
}
