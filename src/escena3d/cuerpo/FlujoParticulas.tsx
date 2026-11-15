import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAyni } from '../../estado/store';
import { useMovimientoReducido } from '../calidad';
import { useLiberar } from './animacionCapa';
import { ORDEN_RENDER, sinRaycast } from './materiales';
import { MUESTRAS_TRAYECTO as MUESTRAS, type Trayecto } from './trayectos';

const VELOCIDAD_FLUJO = 0.16; // m/s, ilustrativa

interface Props {
  trayectos: Trayecto[];
  cantidad: number;
  opacidad: MutableRefObject<number>;
}

/** Partículas de flujo instanciadas; en microgravedad se acumulan hacia la cabeza (5.2). */
export function FlujoParticulas({ trayectos, cantidad, opacidad }: Props) {
  const geometria = useMemo(() => new THREE.SphereGeometry(0.0034, 6, 4), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useLiberar(geometria, material);

  // Reparto determinista proporcional a la longitud de cada trayecto.
  const particulas = useMemo(() => {
    const total = trayectos.reduce((s, t) => s + t.longitud, 0);
    const lista: { trayecto: number; u: number }[] = [];
    trayectos.forEach((t, i) => {
      const n = Math.max(1, Math.round((cantidad * t.longitud) / total));
      for (let k = 0; k < n; k++) lista.push({ trayecto: i, u: (k + ((i * 0.37) % 1)) / n });
    });
    return lista;
  }, [trayectos, cantidad]);

  const malla = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = malla.current;
    if (!m) return;
    particulas.forEach((p, i) => m.setColorAt(i, trayectos[p.trayecto].color));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [particulas, trayectos]);

  const reducido = useMovimientoReducido();
  const matriz = useMemo(() => new THREE.Matrix4(), []);
  useFrame((_, delta) => {
    const m = malla.current;
    if (!m) return;
    m.visible = !reducido && particulas.length > 0 && opacidad.current > 0.005;
    if (!m.visible) return;
    material.opacity = opacidad.current;
    const g = useAyni.getState().estadoCuerpo?.gravedad ?? 1;
    const sesgo = 0.6 * (1 - Math.min(1, g));
    const dt = Math.min(delta, 0.1);
    particulas.forEach((p, i) => {
      const t = trayectos[p.trayecto];
      const idx = Math.min(MUESTRAS - 1, Math.floor(p.u * MUESTRAS));
      const frac = p.u * MUESTRAS - idx;
      const a = idx * 3;
      const b = a + 3;
      const x = t.puntos[a] + (t.puntos[b] - t.puntos[a]) * frac;
      const y = t.puntos[a + 1] + (t.puntos[b + 1] - t.puntos[a + 1]) * frac;
      const z = t.puntos[a + 2] + (t.puntos[b + 2] - t.puntos[a + 2]) * frac;
      // Más lentas cuanto más arriba: se acumulan hacia la cabeza (densidad ∝ 1/velocidad).
      const velocidad = VELOCIDAD_FLUJO * (1 - sesgo * 0.6 * (y - 0.95));
      p.u = (p.u + (dt * velocidad) / t.longitud) % 1;
      matriz.makeTranslation(x, y, z);
      m.setMatrixAt(i, matriz);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      key={particulas.length}
      ref={malla}
      name="vaso_arteria_flujo"
      args={[geometria, material, Math.max(1, particulas.length)]}
      raycast={sinRaycast}
      frustumCulled={false}
      renderOrder={ORDEN_RENDER.interno}
    />
  );
}
