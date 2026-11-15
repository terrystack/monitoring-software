import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { ConfigAyni, Dispositivo, IdCapa, ModoCapa } from '../../config/esquemas';
import { useAyni } from '../../estado/store';
import { Ambiente } from '../Ambiente';
import { NIVELES, useMovimientoReducido } from '../calidad';
import { Cuerpo } from '../cuerpo/Cuerpo';
import { Arnes, type LecturasArnes } from './arnes/Arnes';
import { VISTA_ARNES } from './arnes/geometria';
import { Eeg } from './eeg/Eeg';
import { VISTA_EEG } from './eeg/geometria';
import { VISTA_OXIMETRO } from './oximetro/geometria';
import { Oximetro } from './oximetro/Oximetro';
import { ProveedorDespiece } from './despiece';
import { dispositivoConSensores, estadoSensor, valorSensor } from './estadoSensor';
import type { Variante } from './materiales';
import { medirPerfil, PERFIL_CABEZA, PERFIL_TORSO, type Perfil } from './medidas';
import { modeloDe, posicionSensor, puntosDe, type Modelo } from './modelos';
import { VISTA_PUMA } from './puma/geometria';
import { Puma, type FasePuma } from './puma/Puma';
import { Sensor } from './Sensor';

interface Props {
  config: ConfigAyni;
}

type Animacion = Dispositivo['pasos'][number]['animacion'];

const RAPIDEZ = 5;
/** Radio de la esfera de los sensores según el tamaño del dispositivo. */
const RADIO_SENSOR: Record<Modelo, number> = {
  puma: 0.0065,
  arnes: 0.0085,
  eeg: 0.006,
  oximetro: 0.0045,
};
/** Piel opaca: los dispositivos se apoyan sobre la piel (cara, pecho y brazo). */
const PIEL: Record<Modelo, ModoCapa> = {
  puma: 'visible',
  arnes: 'visible',
  eeg: 'visible',
  oximetro: 'visible',
};
/** La cámara deja de guiarse a los 1,6 s para que se pueda girar libremente. */
const TIEMPO_GUIA = 1.6;

const VISTAS: Record<Modelo, { posicion: THREE.Vector3; objetivo: THREE.Vector3 }> = {
  puma: VISTA_PUMA,
  arnes: VISTA_ARNES,
  eeg: VISTA_EEG,
  oximetro: VISTA_OXIMETRO,
};

/** De dónde llega el dispositivo en el paso "colocar" (desplazamiento inicial, m). */
const ENTRADA: Record<Modelo, [number, number, number]> = {
  puma: [0, 0.02, 0.22],
  arnes: [0, 0.03, 0.26],
  eeg: [0, 0.16, 0.02],
  oximetro: [0, 0, 0],
};

/** Solo en desarrollo: `?fasePuma=blockout|estructura` para revisar el modelado por pasadas. */
function fasePuma(): FasePuma {
  if (!import.meta.env.DEV) return 'completo';
  const f = new URLSearchParams(window.location.search).get('fasePuma');
  return f === 'blockout' || f === 'estructura' ? f : 'completo';
}

const suave = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

/** Animación de cada paso sobre el dispositivo completo (presentar, colocar, ajustar). */
function Animado({
  animacion,
  duracionMs,
  repeticion,
  entrada,
  reducido,
  children,
}: {
  animacion: Animacion;
  duracionMs: number;
  repeticion: string;
  entrada: [number, number, number];
  reducido: boolean;
  children: ReactNode;
}) {
  const grupo = useRef<THREE.Group>(null);
  const inicio = useRef<number | null>(null);
  useEffect(() => {
    inicio.current = null;
  }, [animacion, repeticion]);
  useFrame((state) => {
    const g = grupo.current;
    if (!g) return;
    inicio.current ??= state.clock.elapsedTime;
    const t = reducido ? 1 : (state.clock.elapsedTime - inicio.current) / (duracionMs / 1000);
    g.position.set(0, 0, 0);
    g.scale.setScalar(1);
    if (animacion === 'colocar' || animacion === 'volar_a_anclaje') {
      const k = 1 - suave(t);
      g.position.set(entrada[0] * k, entrada[1] * k, entrada[2] * k);
    }
    if (animacion === 'ajustar' && !reducido) {
      // Pequeño "apretar" en el sitio: no escala alrededor del origen del mundo.
      const k = t < 1 ? Math.sin(Math.PI * t) : 0;
      g.position.y = -0.004 * k;
    }
  });
  return <group ref={grupo}>{children}</group>;
}

/** Cámara que va a la vista del dispositivo o al sensor activo y luego deja girar. */
function CamaraGuiada({
  posicion,
  objetivo,
}: {
  posicion: THREE.Vector3;
  objetivo: THREE.Vector3;
}) {
  const camara = useThree((s) => s.camera);
  const controles = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const reducido = useMovimientoReducido();
  const destino = useRef<{ posicion: THREE.Vector3; objetivo: THREE.Vector3; t: number } | null>(
    null,
  );
  const clave = `${posicion.toArray().join()}|${objetivo.toArray().join()}`;

  useEffect(() => {
    destino.current = { posicion: posicion.clone(), objetivo: objetivo.clone(), t: 0 };
    if (reducido && controles) {
      camara.position.copy(posicion);
      controles.target.copy(objetivo);
      controles.update();
      destino.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, reducido, camara, controles]);

  useFrame((_, delta) => {
    const d = destino.current;
    if (!d || !controles) return;
    const dt = Math.min(delta, 0.1);
    const k = 1 - Math.exp(-RAPIDEZ * dt);
    camara.position.lerp(d.posicion, k);
    controles.target.lerp(d.objetivo, k);
    d.t += dt;
    if (d.t > TIEMPO_GUIA || camara.position.distanceTo(d.posicion) < 0.002) destino.current = null;
  });
  return null;
}

function DispositivoModelo({
  modelo,
  torso,
  variante,
  reducido,
  colocar = null,
  repeticion,
}: {
  modelo: Modelo;
  torso: Perfil;
  variante: Variante;
  reducido: boolean;
  /** Duración (ms) del paso "colocar" (abre la pinza del oxímetro); null si no toca. */
  colocar?: number | null;
  repeticion?: string;
}) {
  const motor = useAyni((s) => s.motor);
  const valor = (id: string) => motor?.indicadores[id]?.valor ?? null;
  const pulso = valor('pulso_reposo');
  const sistolica = valor('presion_sistolica');
  const diastolica = valor('presion_diastolica');
  const dosisDia = valor('tasa_dosis_dia');
  const dosisTotal = valor('dosis_radiacion');
  const lecturas = useMemo<LecturasArnes>(
    () => ({ pulso, sistolica, diastolica, dosisDia, dosisTotal }),
    [pulso, sistolica, diastolica, dosisDia, dosisTotal],
  );
  if (modelo === 'puma') return <Puma torso={torso} variante={variante} fase={fasePuma()} />;
  if (modelo === 'eeg') return <Eeg variante={variante} reducido={reducido} />;
  if (modelo === 'oximetro')
    return (
      <Oximetro
        variante={variante}
        spo2={valor('spo2')}
        pulso={pulso}
        colocar={colocar}
        repeticion={repeticion}
        reducido={reducido}
      />
    );
  return <Arnes variante={variante} lecturas={lecturas} reducido={reducido} />;
}

/**
 * Escena de la pestaña Medición (AYNI_DISPOSITIVOS_3D.md): el cuerpo anatómico con la piel
 * visible y el dispositivo activo (PUMA, arnés ECG, diadema EEG u oxímetro) con sus sensores.
 * Fuerza las capas al montar y restaura las anteriores al salir.
 */
export default function EscenaMedicion({ config }: Props) {
  const calidad = useAyni((s) => s.calidad);
  const motor = useAyni((s) => s.motor);
  const paso = useAyni((s) => s.pasoDispositivo);
  const sensorElegido = useAyni((s) => s.sensorSeleccionado);
  const repeticion = useAyni((s) => s.repeticionPaso);
  const versionZonas = useAyni((s) => s.versionZonas);
  const activo = useAyni((s) => s.dispositivoActivo);
  const despiece = useAyni((s) => s.despiece);
  const reducido = useMovimientoReducido();
  const parametros = NIVELES[calidad];
  const disp = dispositivoConSensores(config, activo);
  const modelo = modeloDe(disp);
  const idPiel = config.zonas.find((z) => z.capa === 'piel')?.id;

  useEffect(() => {
    const anterior = useAyni.getState().modoCapa;
    return () => useAyni.getState().setModosCapa(anterior);
  }, []);
  useEffect(() => {
    useAyni
      .getState()
      .setModosCapa(
        Object.fromEntries(
          config.escena.capas.map((c): [IdCapa, ModoCapa] => [
            c.id,
            c.id === 'piel' ? PIEL[modelo] : 'oculta',
          ]),
        ),
      );
  }, [config, modelo]);

  const { torso, cabeza } = useMemo(
    () => ({
      torso: medirPerfil(idPiel, PERFIL_TORSO),
      cabeza: medirPerfil(idPiel, PERFIL_CABEZA, 0.1),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idPiel, versionZonas],
  );

  const posiciones = useMemo(() => {
    const piezas = puntosDe(modelo, torso);
    return new Map(
      (disp?.sensores ?? []).map((s) => [s.id, posicionSensor(s, torso, cabeza, piezas)]),
    );
  }, [disp, modelo, torso, cabeza]);

  if (!disp?.sensores) return null;
  const pasoActual = disp.pasos[Math.min(paso, disp.pasos.length - 1)];
  const animacion = pasoActual?.animacion ?? 'presentar';
  const idActivo = sensorElegido ?? pasoActual?.sensor ?? null;
  const fantasma =
    disp.erroresComunes.find((e) => e.texto === pasoActual?.error && e.desplazamiento)
      ?.desplazamiento ?? null;
  const estados = config.escena.estados;
  const destinoSensor = idActivo ? posiciones.get(idActivo) : undefined;
  const vista = VISTAS[modelo];
  const repeticionClave = `${disp.id}-${paso}-${repeticion}`;
  const enDespiece = despiece || animacion === 'despiece';
  // En el despiece la cámara se aleja para que entren las piezas separadas.
  const vistaGeneral = enDespiece
    ? {
        objetivo: vista.objetivo,
        posicion: vista.objetivo.clone().lerp(vista.posicion, 1.45),
      }
    : vista;
  const camara =
    destinoSensor && !enDespiece
      ? {
          objetivo: destinoSensor,
          posicion: destinoSensor
            .clone()
            .add(
              new THREE.Vector3(destinoSensor.x * 1.6, 0.08, 1)
                .normalize()
                .multiplyScalar(modelo === 'arnes' ? 0.6 : 0.5),
            ),
        }
      : vistaGeneral;

  return (
    <Canvas
      dpr={[1, parametros.dprMaximo]}
      camera={{ position: vista.posicion.toArray(), fov: 38, near: 0.02, far: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={(estado) => {
        // Solo en desarrollo: acceso para capturas y pruebas desde el navegador.
        if (import.meta.env.DEV) Object.assign(window, { __ayni: { r3f: estado, store: useAyni } });
      }}
    >
      <Ambiente />
      <Cuerpo interactivo={false} />
      <ProveedorDespiece
        key={disp.id}
        activo={enDespiece}
        nombres={disp.partes ?? {}}
        conEtiquetas={calidad !== 'baja'}
        reducido={reducido}
      >
        <Animado
          animacion={animacion}
          duracionMs={pasoActual?.duracionMs ?? 2000}
          repeticion={repeticionClave}
          entrada={ENTRADA[modelo]}
          reducido={reducido}
        >
          <DispositivoModelo modelo={modelo} torso={torso} variante="normal" reducido={reducido} />
        </Animado>
      </ProveedorDespiece>
      {fantasma && (
        <group position={fantasma}>
          <DispositivoModelo
            modelo={modelo}
            torso={torso}
            variante="fantasma"
            reducido={reducido}
          />
        </group>
      )}
      {!enDespiece &&
        disp.sensores.map((s) => {
          const estado = estadoSensor(s, motor);
          const color =
            s.indicadores.length === 0
              ? '#22D3EE'
              : (estados.find((e) => e.id === estado)?.color ?? '#64748B');
          return (
            <Sensor
              key={`${disp.id}-${s.id}`}
              id={s.id}
              nombre={s.nombre}
              posicion={posiciones.get(s.id)!}
              color={color}
              etiqueta={valorSensor(s, motor, config)}
              destacado={s.id === idActivo}
              sincronizado={animacion === 'medir'}
              animado={!reducido && calidad !== 'baja'}
              conEtiqueta={calidad !== 'baja'}
              alElegir={() => useAyni.getState().setSensorSeleccionado(s.id)}
              radio={RADIO_SENSOR[modelo]}
            />
          );
        })}
      <CamaraGuiada posicion={camara.posicion} objetivo={camara.objetivo} />
      <OrbitControls
        makeDefault
        target={vista.objetivo.toArray()}
        enablePan={false}
        enableDamping
        minDistance={0.15}
        maxDistance={3}
      />
    </Canvas>
  );
}
