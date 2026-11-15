import {
  AdaptiveDpr,
  Environment,
  Lightformer,
  PerformanceMonitor,
  Stars,
} from '@react-three/drei';
import { useAyni } from '../estado/store';
import { NIVELES, ORDEN_CALIDAD, useMovimientoReducido } from './calidad';

function cambiarCalidad(paso: 1 | -1) {
  const { calidad, setCalidad } = useAyni.getState();
  const i = ORDEN_CALIDAD.indexOf(calidad) + paso;
  if (i >= 0 && i < ORDEN_CALIDAD.length) setCalidad(ORDEN_CALIDAD[i]);
}

/** Fondo, niebla, luces, entorno y estrellas comunes a todas las escenas 3D (sección 5.1). */
export function Ambiente() {
  const calidad = useAyni((s) => s.calidad);
  const reducido = useMovimientoReducido();
  return (
    <>
      {/* Fondo opaco: el EffectComposer compone mal la mezcla aditiva sobre un canvas transparente. */}
      <color attach="background" args={['#070B1E']} />
      <fog attach="fog" args={['#070B1E', 5, 18]} />
      <PerformanceMonitor
        onDecline={() => cambiarCalidad(-1)}
        onIncline={() => cambiarCalidad(1)}
        flipflops={3}
        onFallback={() => useAyni.getState().setCalidad('baja')}
      />
      <AdaptiveDpr />

      <hemisphereLight args={['#9FE8FF', '#0B1026', 0.55]} />
      <directionalLight position={[1.5, 3, 2.5]} intensity={1.1} />
      <directionalLight position={[-1.2, 2.4, -3]} intensity={2.4} color="#67E8F9" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={1.2} position={[0, 3, 3]} scale={[5, 1.5, 1]} />
        <Lightformer form="ring" intensity={2} color="#22D3EE" position={[-2, 1.5, -3]} scale={2} />
      </Environment>
      <Stars
        radius={25}
        depth={35}
        count={NIVELES[calidad].estrellas}
        factor={3}
        saturation={0}
        fade
        speed={reducido ? 0 : 0.3}
      />
    </>
  );
}
