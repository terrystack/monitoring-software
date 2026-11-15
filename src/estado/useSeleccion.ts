import { useMemo } from 'react';
import type { ConfigAyni } from '../config/esquemas';
import { resolverSeleccion, type Seleccion } from './seleccion';
import { useAyni } from './store';

/** Tripulante, entorno y día de datos que se están mirando (los mismos en toda la app). */
export function useSeleccion(config: ConfigAyni): Seleccion {
  const tripulanteId = useAyni((s) => s.tripulanteId);
  const entornoId = useAyni((s) => s.entornoId);
  const dia = useAyni((s) => s.dia);
  return useMemo(
    () => resolverSeleccion(config, { tripulanteId, entornoId, dia }),
    [config, tripulanteId, entornoId, dia],
  );
}
