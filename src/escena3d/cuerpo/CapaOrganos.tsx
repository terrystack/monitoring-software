import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useAyni } from '../../estado/store';
import { useMovimientoReducido, useParametrosCalidad } from '../calidad';
import { zonaDeMalla } from '../interaccion/zonaDeMalla';
import { useEmisivoZonas, useLiberar, useOpacidadCapa } from './animacionCapa';
import { crearOrganos } from './geometrias';
import { crearMaterialOrgano, ORDEN_RENDER } from './materiales';

const COLOR_ORGANO: Record<string, string> = {
  organo_corazon: '#B83246',
  organo_pulmon_izq: '#E79AA6',
  organo_pulmon_der: '#E79AA6',
  organo_higado: '#8C3A2B',
  organo_estomago: '#D8907E',
  organo_pancreas: '#E6BE78',
  organo_rinon_izq: '#9C4646',
  organo_rinon_der: '#9C4646',
};

const OPACIDAD_ORGANOS = 0.88;

/** Órganos (5.2): Physical con transmisión baja; el corazón late al ritmo del pulso. */
export function CapaOrganos() {
  const { segmentos, transmision } = useParametrosCalidad();
  const zonas = useAyni((s) => s.config?.zonas);
  const piezas = useMemo(() => crearOrganos(segmentos), [segmentos]);
  const materiales = useMemo(
    () => piezas.map((p) => crearMaterialOrgano(COLOR_ORGANO[p.nombre] ?? '#C07070', 0)),
    [piezas],
  );
  useLiberar(...piezas.map((p) => p.geometria), ...materiales);

  useEffect(() => {
    materiales.forEach((m) => (m.transmission = transmision));
  }, [materiales, transmision]);

  const porZona = useMemo(() => {
    const mapa = new Map<string, THREE.MeshPhysicalMaterial[]>();
    piezas.forEach((p, i) => {
      const zona = zonas ? zonaDeMalla(p.nombre, zonas) : null;
      if (zona) mapa.set(zona, [...(mapa.get(zona) ?? []), materiales[i]]);
    });
    return mapa;
  }, [piezas, materiales, zonas]);
  useEmisivoZonas(porZona);

  const grupo = useRef<THREE.Group>(null);
  useOpacidadCapa('organos', grupo, (o) => {
    for (const m of materiales) m.opacity = o * OPACIDAD_ORGANOS;
  });

  const corazon = useRef<THREE.Mesh>(null);
  const reducido = useMovimientoReducido();
  useFrame((state) => {
    if (!corazon.current) return;
    const lpm = useAyni.getState().estadoCuerpo?.pulsoLpm ?? 64;
    const fase = (state.clock.elapsedTime * lpm) / 60;
    const latido = reducido ? 0 : Math.pow(Math.max(0, Math.sin(fase * 2 * Math.PI)), 6);
    corazon.current.scale.setScalar(1 + 0.08 * latido);
  });

  return (
    <group ref={grupo}>
      {piezas.map((p, i) => (
        <mesh
          key={p.nombre}
          ref={p.nombre === 'organo_corazon' ? corazon : undefined}
          name={p.nombre}
          geometry={p.geometria}
          material={materiales[i]}
          position={p.posicion}
          renderOrder={ORDEN_RENDER.interno}
        />
      ))}
    </group>
  );
}
