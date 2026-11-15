import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { useAyni } from '../../estado/store';
import { useMovimientoReducido } from '../calidad';
import { registrarZonas, useSeleccionZona } from '../interaccion/useSeleccionZona';
import { CapaEsqueleto } from './CapaEsqueleto';
import { CapaMusculos } from './CapaMusculos';
import { CapaNervioso } from './CapaNervioso';
import { CapaOrganos } from './CapaOrganos';
import { CapaPiel } from './CapaPiel';
import { CapaVascular } from './CapaVascular';
import { CuerpoAnatomico } from './CuerpoAnatomico';
import { HaloRadiacion } from './HaloRadiacion';
import { LimiteError } from './LimiteError';

const PERIODO_RESPIRACION_S = 4.5;

/** Cuerpo procedural (respaldo si el modelo anatómico no carga). */
function CapasProcedurales({ onListo }: { onListo: () => void }) {
  useEffect(() => {
    onListo();
  }, [onListo]);
  return (
    <>
      <CapaEsqueleto />
      <CapaOrganos />
      <CapaNervioso />
      <CapaVascular />
      <CapaMusculos />
      <CapaPiel />
    </>
  );
}

/**
 * Orquesta el cuerpo (anatómico por defecto; `?cuerpo=procedural` fuerza el procedural),
 * el halo, la respiración leve y la selección de zonas.
 */
export function Cuerpo({ interactivo = true }: { interactivo?: boolean }) {
  const grupo = useRef<THREE.Group>(null);
  const reducido = useMovimientoReducido();
  const calidad = useAyni((s) => s.calidad);
  const zonas = useAyni((s) => s.config?.zonas);
  const manejadores = useSeleccionZona();
  const procedural = useMemo(
    () => new URLSearchParams(window.location.search).get('cuerpo') === 'procedural',
    [],
  );

  const registrar = useCallback(() => {
    if (grupo.current && zonas) registrarZonas(grupo.current, zonas);
  }, [zonas]);
  // Las capas procedurales reconstruyen sus geometrías al cambiar la calidad.
  useEffect(registrar, [calidad, registrar]);

  useFrame((state) => {
    if (!grupo.current) return;
    const s = reducido
      ? 0
      : Math.sin((state.clock.elapsedTime * 2 * Math.PI) / PERIODO_RESPIRACION_S);
    grupo.current.scale.set(1 + 0.004 * s, 1 + 0.0015 * s, 1 + 0.007 * s);
  });

  const respaldo = <CapasProcedurales onListo={registrar} />;
  return (
    <group ref={grupo} name="cuerpo" {...(interactivo ? manejadores : {})}>
      {procedural ? (
        respaldo
      ) : (
        <LimiteError respaldo={respaldo}>
          <Suspense fallback={null}>
            <CuerpoAnatomico onListo={registrar} />
          </Suspense>
        </LimiteError>
      )}
      <HaloRadiacion />
    </group>
  );
}
