import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { IdCapa, ModoCapa } from '../../config/esquemas';
import type { EstadoZona } from '../../datos/tipos';
import { useAyni } from '../../estado/store';
import { useMovimientoReducido } from '../calidad';

const FACTOR_MODO: Record<ModoCapa, number> = { visible: 1, translucida: 0.3, oculta: 0 };

/**
 * Anima la opacidad de una capa hacia el modo del store (≈500 ms) sin re-render y oculta
 * el grupo cuando llega a 0 (no se desmonta).
 */
export function useOpacidadCapa(
  capa: IdCapa,
  grupo: RefObject<THREE.Object3D>,
  aplicar: (opacidad: number) => void,
) {
  const actual = useRef(FACTOR_MODO[useAyni.getState().modoCapa[capa]]);
  const reducido = useMovimientoReducido();
  useFrame((_, delta) => {
    const objetivo = FACTOR_MODO[useAyni.getState().modoCapa[capa]];
    actual.current = reducido ? objetivo : THREE.MathUtils.damp(actual.current, objetivo, 9, delta);
    if (Math.abs(actual.current - objetivo) < 0.002) actual.current = objetivo;
    if (grupo.current) grupo.current.visible = actual.current > 0.005;
    aplicar(actual.current);
  });
}

/** Colores de la paleta de estado (escena.json), convertidos a THREE.Color. */
export function useColoresEstado(): Record<EstadoZona, THREE.Color> {
  const estados = useAyni((s) => s.config?.escena.estados);
  return useMemo(() => {
    const colores = {} as Record<EstadoZona, THREE.Color>;
    for (const e of estados ?? []) colores[e.id] = new THREE.Color(e.color);
    return colores;
  }, [estados]);
}

const INTENSIDAD_EMISIVA: Record<EstadoZona, number> = {
  normal: 0.05,
  atencion: 0.75,
  critico: 1.1,
  sin_dato: 0.04,
};

/**
 * Brillo de estado de una zona: color de la paleta, intensidad según el estado, pulso
 * sincronizado si la zona está en una alerta multiseñal y realce si está seleccionada.
 */
export function intensidadEstado(
  zona: string,
  tiempo: number,
  reducido: boolean,
): { estado: EstadoZona; intensidad: number } {
  const { estadoCuerpo, zonaSeleccionada, zonaHover } = useAyni.getState();
  const estado = estadoCuerpo?.zonas[zona] ?? 'sin_dato';
  let intensidad = INTENSIDAD_EMISIVA[estado];
  const enAlerta = estadoCuerpo?.alertas.some((zonas) => zonas.includes(zona)) ?? false;
  if (enAlerta && !reducido) intensidad *= 0.65 + 0.55 * (0.5 + 0.5 * Math.sin(tiempo * 4.5));
  if (zonaSeleccionada === zona) intensidad += 0.35;
  else if (zonaHover === zona) intensidad += 0.15;
  return { estado, intensidad };
}

type MaterialEmisivo = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

/** Aplica el brillo de estado de cada zona a sus materiales en cada cuadro. */
export function useEmisivoZonas(materialesPorZona: Map<string, MaterialEmisivo[]>) {
  const colores = useColoresEstado();
  const reducido = useMovimientoReducido();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    materialesPorZona.forEach((materiales, zona) => {
      const { estado, intensidad } = intensidadEstado(zona, t, reducido);
      const color = colores[estado];
      for (const m of materiales) {
        if (color) m.emissive.copy(color);
        m.emissiveIntensity = intensidad;
      }
    });
  });
}

/** Libera geometrías y materiales creados a mano al desmontar. */
export function useLiberar(...recursos: ({ dispose: () => void } | undefined)[]) {
  useEffect(
    () => () => recursos.forEach((r) => r?.dispose()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    recursos,
  );
}
