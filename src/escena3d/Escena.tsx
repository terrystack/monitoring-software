import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { useAyni } from '../estado/store';
import { Ambiente } from './Ambiente';
import { NIVELES } from './calidad';
import { VISTA_FRONTAL, VISTA_TRES_CUARTOS } from './cuerpo/anclajes';
import { Cuerpo } from './cuerpo/Cuerpo';
import { Efectos } from './Efectos';
import { CamaraVuelo } from './interaccion/CamaraVuelo';
import { EtiquetasZona } from './interaccion/EtiquetasZona';
import { registroZonas, zonaDesdeIntersecciones } from './interaccion/useSeleccionZona';

/** Canvas, luces, entorno y controles (sección 5.1). */
export default function Escena() {
  const calidad = useAyni((s) => s.calidad);
  const parametros = NIVELES[calidad];
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
      <Ambiente />
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
