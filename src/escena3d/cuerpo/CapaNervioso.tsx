import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useAyni } from '../../estado/store';
import { useMovimientoReducido, useParametrosCalidad } from '../calidad';
import {
  intensidadEstado,
  useColoresEstado,
  useEmisivoZonas,
  useLiberar,
  useOpacidadCapa,
} from './animacionCapa';
import { crearNervioso } from './geometrias';
import { crearMaterialNervio, crearMaterialOrgano, ORDEN_RENDER } from './materiales';

/** Sistema nervioso (5.2): cerebro con pliegues y vías con pulsos de señal. */
export function CapaNervioso() {
  const { segmentos, transmision } = useParametrosCalidad();
  const piezas = useMemo(() => crearNervioso(segmentos), [segmentos]);
  const materialCerebro = useMemo(() => crearMaterialOrgano('#D9A7C7', transmision), [transmision]);
  const materialVias = useMemo(() => crearMaterialNervio(), []);
  useLiberar(piezas.cerebro.geometria, ...piezas.vias.map((p) => p.geometria));
  useLiberar(materialCerebro, materialVias);

  const porZona = useMemo(() => new Map([['cerebro', [materialCerebro]]]), [materialCerebro]);
  useEmisivoZonas(porZona);

  const grupo = useRef<THREE.Group>(null);
  useOpacidadCapa('nervioso', grupo, (o) => {
    materialCerebro.opacity = o * 0.9;
    materialVias.uniforms.uOpacidad.value = o;
  });

  const colores = useColoresEstado();
  const reducido = useMovimientoReducido();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const u = materialVias.uniforms;
    u.uTiempo.value = t;
    u.uPulsos.value = reducido ? 0 : 1;
    u.uVelocidad.value = useAyni.getState().estadoCuerpo?.velocidadNervios ?? 1;
    const { estado, intensidad } = intensidadEstado('nervios', t, reducido);
    if (colores[estado]) u.uColorEstado.value.copy(colores[estado]);
    u.uMezclaEstado.value =
      estado === 'atencion' || estado === 'critico' ? Math.min(1, 0.4 + intensidad * 0.4) : 0;
  });

  return (
    <group ref={grupo}>
      <mesh
        name={piezas.cerebro.nombre}
        geometry={piezas.cerebro.geometria}
        material={materialCerebro}
        renderOrder={ORDEN_RENDER.interno}
      />
      {piezas.vias.map((p) => (
        <mesh
          key={p.nombre}
          name={p.nombre}
          geometry={p.geometria}
          material={materialVias}
          renderOrder={ORDEN_RENDER.interno}
        />
      ))}
    </group>
  );
}
