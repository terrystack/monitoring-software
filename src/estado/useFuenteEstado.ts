import { useEffect, useMemo, useState } from 'react';
import type { ConfigAyni, IdCapa, ModoCapa } from '../config/esquemas';
import { leerLecturasManuales } from '../datos/almacen';
import { cargarCsv } from '../datos/cargarCsv';
import { estadoDesdeMotor } from '../escena3d/estadoDesdeMotor';
import { crearMockEstadoCuerpo } from '../escena3d/mockEstadoCuerpo';
import { configConEntorno, evaluarSeleccion, resolverSeleccion } from './seleccion';
import { useAyni } from './store';

type Carga = 'cargando' | 'listo' | 'error';

/**
 * Alimenta el cuerpo con el motor sobre el CSV sintético más las lecturas manuales, para el
 * tripulante, entorno y día elegidos en el perfil. Sin CSV usa el estado de ejemplo.
 * `?zona=<id>` abre la app con esa zona elegida; `?capas=piel,esqueleto` deja visibles solo
 * esas capas.
 */
export function useFuenteEstado(config: ConfigAyni) {
  const [carga, setCarga] = useState<Carga>('cargando');
  const tripulanteId = useAyni((s) => s.tripulanteId);
  const entornoId = useAyni((s) => s.entornoId);
  const dia = useAyni((s) => s.dia);
  const lecturas = useAyni((s) => s.lecturas);
  const lecturasManuales = useAyni((s) => s.lecturasManuales);
  const seleccion = useMemo(
    () => resolverSeleccion(config, { tripulanteId, entornoId, dia }),
    [config, tripulanteId, entornoId, dia],
  );

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const zona = parametros.get('zona');
    if (zona && config.zonas.some((z) => z.id === zona)) useAyni.getState().seleccionarZona(zona);
    const capas = parametros.get('capas');
    if (!capas) return;
    const visibles = new Set(capas.split(','));
    useAyni
      .getState()
      .setModosCapa(
        Object.fromEntries(
          config.escena.capas.map((c) => [c.id, visibles.has(c.id) ? 'visible' : 'oculta']),
        ) as Record<IdCapa, ModoCapa>,
      );
  }, [config]);

  useEffect(() => {
    let vigente = true;
    const { setLecturas, setLecturasManuales } = useAyni.getState();
    cargarCsv()
      .then((r) => {
        if (!vigente) return;
        setLecturas(r.lecturas);
        setCarga('listo');
      })
      .catch(() => vigente && setCarga('error'));
    leerLecturasManuales()
      .then((manuales) => vigente && setLecturasManuales(manuales))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  const todas = useMemo(() => [...lecturas, ...lecturasManuales], [lecturas, lecturasManuales]);

  useEffect(() => {
    const { setEstadoCuerpo, setMotor } = useAyni.getState();
    if (carga === 'cargando') return;
    if (carga === 'error' && lecturasManuales.length === 0) {
      setMotor(null);
      setEstadoCuerpo(crearMockEstadoCuerpo(config));
      return;
    }
    const motor = evaluarSeleccion(todas, config, seleccion);
    setMotor(motor);
    setEstadoCuerpo(estadoDesdeMotor(motor, configConEntorno(config, seleccion)));
  }, [carga, todas, lecturasManuales.length, config, seleccion]);

  return seleccion;
}
