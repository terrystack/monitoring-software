import { useMemo } from 'react';
import { Bloom, EffectComposer, Outline, Vignette } from '@react-three/postprocessing';
import { useAyni } from '../estado/store';
import { NIVELES } from './calidad';
import { registroZonas } from './interaccion/useSeleccionZona';

/** Contorno cian del acento de interfaz (5.1); más tenue donde la zona queda tapada. */
const CONTORNO_VISIBLE = 0x22d3ee;
const CONTORNO_OCULTO = 0x0e7490;

/**
 * Postprocesado (5.1 y 5.3): contorno de la zona en hover o seleccionada, Bloom solo sobre
 * emisivos de estado (umbral 1: la piel y las vías normales quedan por debajo) y viñeta.
 */
export function Efectos() {
  const calidad = useAyni((s) => s.calidad);
  const zonaHover = useAyni((s) => s.zonaHover);
  const zonaSeleccionada = useAyni((s) => s.zonaSeleccionada);
  const version = useAyni((s) => s.versionZonas);
  const p = NIVELES[calidad];

  const seleccion = useMemo(() => {
    const zona = zonaHover ?? zonaSeleccionada;
    return zona ? (registroZonas.get(zona)?.mallas ?? []) : [];
    // version: el registro cambia al reconstruir geometrías
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zonaHover, zonaSeleccionada, version]);

  if (!p.bloom && !p.vignette && !p.outline) return null;
  return (
    <EffectComposer multisampling={p.multisampling}>
      {p.outline && seleccion.length > 0 ? (
        <Outline
          selection={seleccion}
          visibleEdgeColor={CONTORNO_VISIBLE}
          hiddenEdgeColor={CONTORNO_OCULTO}
          edgeStrength={3.5}
          blur={calidad === 'alta'}
          xRay
        />
      ) : (
        <></>
      )}
      {p.bloom ? (
        <Bloom
          mipmapBlur
          levels={p.nivelesBloom}
          luminanceThreshold={0.85}
          luminanceSmoothing={0.2}
          intensity={0.9}
        />
      ) : (
        <></>
      )}
      {p.vignette ? <Vignette offset={0.32} darkness={0.55} /> : <></>}
    </EffectComposer>
  );
}
