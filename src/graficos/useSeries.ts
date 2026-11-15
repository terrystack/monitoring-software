import { useMemo } from 'react';
import type { ConfigAyni } from '../config/esquemas';
import { fechaDeDia } from '../datos/generador';
import type { Seleccion } from '../estado/seleccion';
import { useAyni } from '../estado/store';
import { serieIndicador, type PuntoSerie } from '../motor/series';

/**
 * Series diarias con banda personal de los indicadores pedidos, para el tripulante elegido,
 * hasta el final del día de datos seleccionado (CSV + lecturas manuales).
 */
export function useSeries(
  ids: string[],
  config: ConfigAyni,
  seleccion: Seleccion,
): Record<string, PuntoSerie[]> {
  const lecturas = useAyni((s) => s.lecturas);
  const manuales = useAyni((s) => s.lecturasManuales);
  const clave = ids.join(',');

  return useMemo(() => {
    const propias = [...lecturas, ...manuales].filter(
      (l) => l.tripulanteId === seleccion.tripulanteId,
    );
    const fecha = fechaDeDia(config, seleccion.dia);
    return Object.fromEntries(
      clave
        .split(',')
        .filter(Boolean)
        .map((id) => {
          const ind = config.indicadores.find((i) => i.id === id);
          return [id, ind ? serieIndicador(propias, ind, config, fecha) : []];
        }),
    );
  }, [lecturas, manuales, config, seleccion.tripulanteId, seleccion.dia, clave]);
}
