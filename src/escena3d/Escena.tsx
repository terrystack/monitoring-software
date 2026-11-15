import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  AdaptiveDpr,
  Environment,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
  Stars,
  Stats,
} from '@react-three/drei';
import { useAyni } from '../estado/store';
import { NIVELES, ORDEN_CALIDAD, useMovimientoReducido } from './calidad';
import { VISTA_FRONTAL, VISTA_TRES_CUARTOS } from './cuerpo/anclajes';
import { Cuerpo } from './cuerpo/Cuerpo';
import { Efectos } from './Efectos';
import { CamaraVuelo } from './interaccion/CamaraVuelo';
import { EtiquetasZona } from './interaccion/EtiquetasZona';
import { registroZonas, zonaDesdeIntersecciones } from './interaccion/useSeleccionZona';

function cambiarCalidad(paso: 1 | -1) {
  const { calidad, setCalidad } = useAyni.getState();
  const i = ORDEN_CALIDAD.indexOf(calidad) + paso;
  if (i >= 0 && i < ORDEN_CALIDAD.length) setCalidad(ORDEN_CALIDAD[i]);
}

/** Canvas, luces, entorno y controles (sección 5.1). */
export default function Escena() {
  const calidad = useAyni((s) => s.calidad);
  const parametros = NIVELES[calidad];
  const reducido = useMovimientoReducido();
  const { mostrarFps, vista } = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return {
      mostrarFps: p.has('fps'),
      vista: p.get('vista') === '34' ? VISTA_TRES_CUARTOS : VISTA_FRONTAL,
    };
  }, []);

  return (
    <Canvas
      dpr={[1, parametros.dprMaximo]}
      camera={{ position: vista.posicion, fov: 38, near: 0.05, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={(estado) => {
        // Solo en desarrollo: acceso para medir fps y probar clics desde el navegador.
        if (import.meta.env.DEV)
          Object.assign(window, {
            __ayni: { r3f: estado, registroZonas, store: useAyni, zonaDesdeIntersecciones },
          });
      }}
    >
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
        count={parametros.estrellas}
        factor={3}
        saturation={0}
        fade
        speed={reducido ? 0 : 0.3}
      />

      <Cuerpo />
      <EtiquetasZona />
      <CamaraVuelo />
      <Efectos />

      <OrbitControls
        makeDefault
        regress
        target={vista.objetivo}
        enablePan={false}
        enableDamping
        minDistance={0.45}
        maxDistance={5}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI - 0.25}
      />
      {mostrarFps && <Stats />}
    </Canvas>
  );
}
