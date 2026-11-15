import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAyni } from '../../estado/store';
import { useMovimientoReducido } from '../calidad';
import { VISTA_FRONTAL } from '../cuerpo/anclajes';
import { registroZonas } from './useSeleccionZona';

/** Rapidez del amortiguado: con 6/s llega al ~97 % del recorrido en unos 600 ms. */
const RAPIDEZ = 6;
const DISTANCIA_MIN = 0.85;
const DISTANCIA_MAX = 3.2;

interface Destino {
  posicion: THREE.Vector3;
  objetivo: THREE.Vector3;
}

/** Vuela la cámara a la zona seleccionada o a la vista frontal (5.3); salta con movimiento reducido. */
export function CamaraVuelo() {
  const camara = useThree((s) => s.camera);
  const controles = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const reducido = useMovimientoReducido();
  const destino = useRef<Destino | null>(null);

  useEffect(() => {
    if (!controles) return;
    const aplicarInmediato = () => {
      if (!reducido || !destino.current) return;
      camara.position.copy(destino.current.posicion);
      controles.target.copy(destino.current.objetivo);
      controles.update();
      destino.current = null;
    };

    const alSeleccionar = useAyni.subscribe(
      (s) => s.zonaSeleccionada,
      (zona) => {
        const registro = zona ? registroZonas.get(zona) : undefined;
        if (!registro) return;
        const direccion = camara.position.clone().sub(controles.target).normalize();
        const distancia = THREE.MathUtils.clamp(registro.radio * 3.2, DISTANCIA_MIN, DISTANCIA_MAX);
        destino.current = {
          objetivo: registro.centro.clone(),
          posicion: registro.centro.clone().addScaledVector(direccion, distancia),
        };
        aplicarInmediato();
      },
    );
    const alPedirFrontal = useAyni.subscribe(
      (s) => s.vistaFrontalPedida,
      () => {
        destino.current = {
          posicion: new THREE.Vector3(...VISTA_FRONTAL.posicion),
          objetivo: new THREE.Vector3(...VISTA_FRONTAL.objetivo),
        };
        aplicarInmediato();
      },
    );
    // Si la persona arrastra, el vuelo se cancela.
    const cancelar = () => (destino.current = null);
    controles.addEventListener('start', cancelar);
    return () => {
      alSeleccionar();
      alPedirFrontal();
      controles.removeEventListener('start', cancelar);
    };
  }, [camara, controles, reducido]);

  useFrame((_, delta) => {
    const d = destino.current;
    if (!d || !controles) return;
    const k = 1 - Math.exp(-RAPIDEZ * Math.min(delta, 0.1));
    camara.position.lerp(d.posicion, k);
    controles.target.lerp(d.objetivo, k);
    if (
      camara.position.distanceTo(d.posicion) < 0.002 &&
      controles.target.distanceTo(d.objetivo) < 0.002
    ) {
      destino.current = null;
    }
  });

  return null;
}
