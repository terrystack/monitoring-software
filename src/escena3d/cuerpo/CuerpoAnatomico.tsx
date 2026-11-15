import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bvh, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { IdCapa } from '../../config/esquemas';
import { useAyni } from '../../estado/store';
import { useMovimientoReducido, useParametrosCalidad } from '../calidad';
import {
  intensidadEstado,
  useColoresEstado,
  useEmisivoZonas,
  useOpacidadCapa,
} from './animacionCapa';
import { FlujoParticulas } from './FlujoParticulas';
import { trayectoDesdePuntos, type Trayecto } from './trayectos';
import {
  CAPAS,
  DECODIFICADOR_DRACO,
  prepararCuerpo,
  URL_CUERPO,
  URL_FLUJO,
  type ArchivoFlujo,
  type CuerpoPreparado,
} from './modeloAnatomico';

useGLTF.preload(URL_CUERPO, DECODIFICADOR_DRACO);

const OPACIDAD: Partial<Record<IdCapa, number>> = {
  organos: 0.88,
  vascular: 0.6,
  musculos: 0.7,
  nervioso: 0.9,
};

/** Anima la opacidad de una capa del modelo (un componente por capa: número fijo de hooks). */
function ControlCapa({
  capa,
  preparado,
  opacidadVascular,
}: {
  capa: IdCapa;
  preparado: CuerpoPreparado;
  opacidadVascular: MutableRefObject<number>;
}) {
  const grupo = useMemo(() => ({ current: preparado.grupos.get(capa) ?? null }), [preparado, capa]);
  useOpacidadCapa(capa, grupo, (o) => {
    if (capa === 'piel') preparado.piel.uniforms.uOpacidad.value = o;
    if (capa === 'nervioso') preparado.nervios.uniforms.uOpacidad.value = o;
    if (capa === 'vascular') opacidadVascular.current = o;
    const factor = OPACIDAD[capa] ?? 1;
    for (const m of preparado.materialesCapa.get(capa) ?? []) {
      m.opacity =
        m === preparado.hueso
          ? o * (useAyni.getState().estadoCuerpo?.densidadOsea ?? 0.85)
          : o * factor;
    }
  });
  return null;
}

/** Cuerpo anatómico (Z-Anatomy / BodyParts3D, piel MakeHuman) con los materiales de AYNI. */
export function CuerpoAnatomico({ onListo }: { onListo: () => void }) {
  const [renderizado, setRenderizado] = useState(false);
  const gltf = useGLTF(URL_CUERPO, DECODIFICADOR_DRACO);
  const zonas = useAyni((s) => s.config?.zonas);
  const { transmision, particulasFlujo } = useParametrosCalidad();
  const preparado = useMemo(() => prepararCuerpo(gltf.scene, zonas ?? []), [gltf.scene, zonas]);

  useEffect(() => {
    preparado.organos.forEach((m) => (m.transmission = transmision));
  }, [preparado, transmision]);
  useEffect(() => {
    onListo();
  }, [preparado, onListo]);

  const [trayectos, setTrayectos] = useState<Trayecto[]>([]);
  useEffect(() => {
    let cancelado = false;
    fetch(URL_FLUJO)
      .then((r) => r.json() as Promise<ArchivoFlujo>)
      .then((datos) => {
        if (cancelado) return;
        setTrayectos(
          datos.recorridos
            .filter((r) => r.puntos.length >= 2)
            .map((r) =>
              trayectoDesdePuntos(
                r.puntos.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
                r.tipo,
              ),
            ),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, []);

  useEmisivoZonas(preparado.porZona);
  const opacidadVascular = useRef(1);
  const colores = useColoresEstado();
  const reducido = useMovimientoReducido();

  useFrame((state) => {
    if (!renderizado) setRenderizado(true);
    const t = state.clock.elapsedTime;
    const estadoCuerpo = useAyni.getState().estadoCuerpo;

    const p = preparado.piel.uniforms;
    p.uTiempo.value = t;
    p.uEscaneo.value = reducido ? 0 : 1;
    const piel = intensidadEstado('piel_inmune', t, reducido);
    if (colores[piel.estado]) p.uColorEstado.value.copy(colores[piel.estado]);
    p.uMezclaEstado.value =
      piel.estado === 'atencion' || piel.estado === 'critico'
        ? Math.min(1, piel.intensidad * 0.7)
        : 0;

    const n = preparado.nervios.uniforms;
    n.uTiempo.value = t;
    n.uPulsos.value = reducido ? 0 : 1;
    n.uVelocidad.value = estadoCuerpo?.velocidadNervios ?? 1;
    const nervios = intensidadEstado('nervios', t, reducido);
    if (colores[nervios.estado]) n.uColorEstado.value.copy(colores[nervios.estado]);
    n.uMezclaEstado.value =
      nervios.estado === 'atencion' || nervios.estado === 'critico'
        ? Math.min(1, 0.4 + nervios.intensidad * 0.4)
        : 0;

    if (preparado.corazon) {
      const lpm = estadoCuerpo?.pulsoLpm ?? 64;
      const latido = reducido
        ? 0
        : Math.pow(Math.max(0, Math.sin(((t * lpm) / 60) * 2 * Math.PI)), 6);
      preparado.corazon.scale.setScalar(1 + 0.06 * latido);
    }
  });

  return (
    <group visible={renderizado}>
      <Bvh>
        <primitive object={preparado.raiz} />
      </Bvh>
      <FlujoParticulas
        trayectos={trayectos}
        cantidad={particulasFlujo}
        opacidad={opacidadVascular}
      />
      {CAPAS.filter((c) => c !== 'halo').map((capa) => (
        <ControlCapa
          key={capa}
          capa={capa}
          preparado={preparado}
          opacidadVascular={opacidadVascular}
        />
      ))}
    </group>
  );
}
