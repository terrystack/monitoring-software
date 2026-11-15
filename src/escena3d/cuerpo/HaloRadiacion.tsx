import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAyni } from '../../estado/store';
import { useMovimientoReducido, useParametrosCalidad } from '../calidad';
import { intensidadEstado, useColoresEstado, useLiberar, useOpacidadCapa } from './animacionCapa';
import { crearHalo } from './geometrias';
import { CIAN_HOLOGRAMA, crearMaterialHalo, ORDEN_RENDER } from './materiales';

/** Visibilidad mínima del halo para que la capa exista aunque la dosis sea baja. */
const INTENSIDAD_MINIMA = 0.05;
const CIAN = new THREE.Color(CIAN_HOLOGRAMA);

/** Halo de radiación (5.2) de la zona todo_cuerpo. */
export function HaloRadiacion() {
  const { segmentos } = useParametrosCalidad();
  const pieza = useMemo(() => crearHalo(segmentos), [segmentos]);
  const material = useMemo(() => crearMaterialHalo(), []);
  useLiberar(pieza.geometria);
  useLiberar(material);

  const grupo = useRef<THREE.Group>(null);
  useOpacidadCapa('halo', grupo, (o) => {
    material.uniforms.uOpacidad.value = o;
  });

  const colores = useColoresEstado();
  const reducido = useMovimientoReducido();
  const tiempo = useRef(0);
  useFrame((state, delta) => {
    const u = material.uniforms;
    if (!reducido) tiempo.current += delta;
    u.uTiempo.value = tiempo.current;
    const fraccion = useAyni.getState().estadoCuerpo?.fraccionDosis ?? 0;
    const { estado } = intensidadEstado('todo_cuerpo', state.clock.elapsedTime, reducido);
    const alerta = estado === 'atencion' || estado === 'critico';
    u.uIntensidad.value =
      INTENSIDAD_MINIMA + (1 - INTENSIDAD_MINIMA) * Math.min(1, fraccion) + (alerta ? 0.6 : 0);
    u.uColor.value.copy(alerta && colores[estado] ? colores[estado] : CIAN);
  });

  return (
    <group ref={grupo}>
      <mesh
        name={pieza.nombre}
        geometry={pieza.geometria}
        material={material}
        renderOrder={ORDEN_RENDER.halo}
      />
    </group>
  );
}
