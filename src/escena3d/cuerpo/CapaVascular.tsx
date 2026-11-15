import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { useParametrosCalidad } from '../calidad';
import { useEmisivoZonas, useLiberar, useOpacidadCapa } from './animacionCapa';
import { FlujoParticulas } from './FlujoParticulas';
import { trayectoDesdePuntos } from './trayectos';
import { crearVasos, recorridosVasculares } from './geometrias';
import { crearMaterialTranslucido, ORDEN_RENDER } from './materiales';

const COLOR_ARTERIA = '#E5484D';
const COLOR_VENA = '#3E7BFA';
const OPACIDAD_TUBOS = 0.55;

/** Sistema vascular procedural (respaldo): arterias rojas y venas azules con flujo. */
export function CapaVascular() {
  const { segmentos, particulasFlujo } = useParametrosCalidad();
  const vasos = useMemo(() => crearVasos(segmentos), [segmentos]);
  const trayectos = useMemo(
    () =>
      recorridosVasculares().flatMap((vaso) =>
        vaso.recorridos.map((r) => trayectoDesdePuntos(r.puntos, vaso.tipo)),
      ),
    [],
  );
  const arteria = useMemo(() => crearMaterialTranslucido(COLOR_ARTERIA, { roughness: 0.35 }), []);
  const vena = useMemo(() => crearMaterialTranslucido(COLOR_VENA, { roughness: 0.35 }), []);
  useLiberar(...vasos.map((v) => v.geometria));
  useLiberar(arteria, vena);

  const porZona = useMemo(() => new Map([['vascular', [arteria, vena]]]), [arteria, vena]);
  useEmisivoZonas(porZona);

  const grupo = useRef<THREE.Group>(null);
  const opacidad = useRef(1);
  useOpacidadCapa('vascular', grupo, (o) => {
    arteria.opacity = o * OPACIDAD_TUBOS;
    vena.opacity = o * OPACIDAD_TUBOS;
    opacidad.current = o;
  });

  return (
    <group ref={grupo}>
      {vasos.map((v) => (
        <mesh
          key={v.nombre}
          name={v.nombre}
          geometry={v.geometria}
          material={v.tipo === 'arteria' ? arteria : vena}
          renderOrder={ORDEN_RENDER.interno}
        />
      ))}
      <FlujoParticulas trayectos={trayectos} cantidad={particulasFlujo} opacidad={opacidad} />
    </group>
  );
}
