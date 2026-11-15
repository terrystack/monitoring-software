import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { ConfigAyni, IdCapa, ModoCapa } from '../../config/esquemas';
import { useAyni } from '../../estado/store';
import { Ambiente } from '../Ambiente';
import { NIVELES, useMovimientoReducido } from '../calidad';
import { Cuerpo } from '../cuerpo/Cuerpo';
import { Chaleco } from './Chaleco';
import { dispositivoConSensores, estadoSensor, valorSensor } from './estadoSensor';
import { Sensor } from './Sensor';
import { medirTorso, posicionSensor, type MedidasTorso } from './torso';

interface Props {
  config: ConfigAyni;
}

const VISTA = {
  posicion: new THREE.Vector3(0, 1.3, 1.35),
  objetivo: new THREE.Vector3(0, 1.22, 0),
};
const RAPIDEZ = 5;

/** Cámara que se acerca al sensor activo (paso o elegido) y vuelve al chaleco sin sensor. */
function CamaraSensor({ destino }: { destino: THREE.Vector3 | null }) {
  const camara = useThree((s) => s.camera);
  const controles = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const reducido = useMovimientoReducido();
  const objetivo = useRef<{ posicion: THREE.Vector3; objetivo: THREE.Vector3 } | null>(null);

  useEffect(() => {
    objetivo.current = destino
      ? {
          objetivo: destino.clone(),
          posicion: destino
            .clone()
            .add(new THREE.Vector3(destino.x * 1.4, 0.12, 1).normalize().multiplyScalar(0.95)),
        }
      : { posicion: VISTA.posicion.clone(), objetivo: VISTA.objetivo.clone() };
    if (reducido && controles && objetivo.current) {
      camara.position.copy(objetivo.current.posicion);
      controles.target.copy(objetivo.current.objetivo);
      controles.update();
      objetivo.current = null;
    }
  }, [destino, reducido, camara, controles]);

  useFrame((_, delta) => {
    const d = objetivo.current;
    if (!d || !controles) return;
    const k = 1 - Math.exp(-RAPIDEZ * Math.min(delta, 0.1));
    camara.position.lerp(d.posicion, k);
    controles.target.lerp(d.objetivo, k);
    if (camara.position.distanceTo(d.posicion) < 0.002) objetivo.current = null;
  });
  return null;
}

/**
 * Escena de la pestaña Medición: el cuerpo anatómico (solo piel translúcida, sin selección),
 * el chaleco y sus sensores. Fuerza las capas al montar y restaura las anteriores al salir.
 */
export default function EscenaMedicion({ config }: Props) {
  const calidad = useAyni((s) => s.calidad);
  const motor = useAyni((s) => s.motor);
  const paso = useAyni((s) => s.pasoDispositivo);
  const sensorElegido = useAyni((s) => s.sensorSeleccionado);
  const repeticion = useAyni((s) => s.repeticionPaso);
  const versionZonas = useAyni((s) => s.versionZonas);
  const reducido = useMovimientoReducido();
  const parametros = NIVELES[calidad];
  const disp = dispositivoConSensores(config);
  const idPiel = config.zonas.find((z) => z.capa === 'piel')?.id;

  useEffect(() => {
    const s = useAyni.getState();
    const anterior = s.modoCapa;
    s.setModosCapa(
      Object.fromEntries(
        config.escena.capas.map((c): [IdCapa, ModoCapa] => [
          c.id,
          c.id === 'piel' ? 'translucida' : 'oculta',
        ]),
      ),
    );
    return () => useAyni.getState().setModosCapa(anterior);
  }, [config]);

  const medidas: MedidasTorso = useMemo(
    () => medirTorso(idPiel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idPiel, versionZonas],
  );

  const posiciones = useMemo(
    () => new Map((disp?.sensores ?? []).map((s) => [s.id, posicionSensor(s, medidas)])),
    [disp, medidas],
  );

  if (!disp?.sensores) return null;
  const pasoActual = disp.pasos[Math.min(paso, disp.pasos.length - 1)];
  const idActivo = sensorElegido ?? pasoActual?.sensor ?? null;
  const fantasma =
    disp.erroresComunes.find((e) => e.texto === pasoActual?.error && e.desplazamiento)
      ?.desplazamiento ?? null;
  const estados = config.escena.estados;

  return (
    <Canvas
      dpr={[1, parametros.dprMaximo]}
      camera={{ position: VISTA.posicion.toArray(), fov: 38, near: 0.02, far: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={(estado) => {
        // Solo en desarrollo: acceso para capturas y pruebas desde el navegador.
        if (import.meta.env.DEV) Object.assign(window, { __ayni: { r3f: estado, store: useAyni } });
      }}
    >
      <Ambiente />
      <Cuerpo interactivo={false} />
      <Chaleco
        medidas={medidas}
        animacion={pasoActual?.animacion ?? 'presentar'}
        duracionMs={pasoActual?.duracionMs ?? 2000}
        repeticion={`${paso}-${repeticion}`}
        fantasma={fantasma}
        reducido={reducido}
      />
      {disp.sensores.map((s) => {
        const estado = estadoSensor(s, motor);
        const color =
          s.indicadores.length === 0
            ? '#22D3EE'
            : (estados.find((e) => e.id === estado)?.color ?? '#64748B');
        return (
          <Sensor
            key={s.id}
            id={s.id}
            nombre={s.nombre}
            posicion={posiciones.get(s.id)!}
            color={color}
            etiqueta={valorSensor(s, motor, config)}
            destacado={s.id === idActivo}
            sincronizado={pasoActual?.animacion === 'medir'}
            animado={!reducido && calidad !== 'baja'}
            conEtiqueta={calidad !== 'baja'}
            alElegir={() => useAyni.getState().setSensorSeleccionado(s.id)}
          />
        );
      })}
      <CamaraSensor destino={idActivo ? (posiciones.get(idActivo) ?? null) : null} />
      <OrbitControls
        makeDefault
        target={VISTA.objetivo.toArray()}
        enablePan={false}
        enableDamping
        minDistance={0.3}
        maxDistance={3}
      />
    </Canvas>
  );
}
