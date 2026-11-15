import { useEffect, useState } from 'react';
import { useAyni, type Calidad } from '../estado/store';

export interface ParametrosCalidad {
  /** Multiplicador de segmentos de las geometrías procedurales. */
  segmentos: number;
  particulasFlujo: number;
  estrellas: number;
  bloom: boolean;
  vignette: boolean;
  outline: boolean;
  /** Muestras MSAA del EffectComposer (0 = sin antialias en el postprocesado). */
  multisampling: number;
  /** Niveles de la cadena de mipmaps del Bloom (menos = más barato). */
  nivelesBloom: number;
  /** Densidad de píxeles máxima del canvas. */
  dprMaximo: number;
  /** Transmisión de los órganos (MeshPhysicalMaterial); 0 evita el pase extra. */
  transmision: number;
}

export const NIVELES: Record<Calidad, ParametrosCalidad> = {
  alta: {
    segmentos: 1.5,
    particulasFlujo: 600,
    estrellas: 4000,
    bloom: true,
    vignette: true,
    outline: true,
    multisampling: 4,
    nivelesBloom: 8,
    dprMaximo: 2,
    transmision: 0.2,
  },
  media: {
    segmentos: 1,
    particulasFlujo: 300,
    estrellas: 2000,
    bloom: true,
    vignette: true,
    outline: true,
    multisampling: 0,
    nivelesBloom: 5,
    dprMaximo: 1,
    transmision: 0,
  },
  baja: {
    segmentos: 0.6,
    particulasFlujo: 100,
    estrellas: 800,
    bloom: false,
    vignette: false,
    outline: false,
    multisampling: 0,
    nivelesBloom: 0,
    dprMaximo: 1,
    transmision: 0,
  },
};

export const ORDEN_CALIDAD: Calidad[] = ['baja', 'media', 'alta'];

/** Segmentos escalados por calidad, nunca por debajo de `minimo`. */
export function seg(base: number, factor: number, minimo = 3): number {
  return Math.max(minimo, Math.round(base * factor));
}

export function useParametrosCalidad(): ParametrosCalidad {
  return NIVELES[useAyni((s) => s.calidad)];
}

const CONSULTA_MOVIMIENTO = '(prefers-reduced-motion: reduce)';

function prefiereMovimientoReducido(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.(CONSULTA_MOVIMIENTO).matches;
}

/** Movimiento reducido si lo pide el sistema operativo o el ajuste del perfil. */
export function useMovimientoReducido(): boolean {
  const ajuste = useAyni((s) => s.movimientoReducido);
  const [sistema, setSistema] = useState(prefiereMovimientoReducido);
  useEffect(() => {
    const consulta = window.matchMedia?.(CONSULTA_MOVIMIENTO);
    if (!consulta) return;
    const alCambiar = () => setSistema(consulta.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);
  return ajuste || sistema;
}
