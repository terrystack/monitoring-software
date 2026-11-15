import { useEffect, useMemo, useState } from 'react';
import type { ConfigAyni, IdCapa, ModoCapa } from '../config/esquemas';
import { cargarCsv } from '../datos/cargarCsv';
import type { Lectura } from '../datos/tipos';
import { estadoDesdeMotor } from '../escena3d/estadoDesdeMotor';
import { crearMockEstadoCuerpo } from '../escena3d/mockEstadoCuerpo';
import { configConEntorno, evaluarSeleccion, resolverSeleccion } from './seleccion';
import { useAyni } from './store';

type Carga = { tipo: 'cargando' } | { tipo: 'listo'; lecturas: Lectura[] } | { tipo: 'error' };

/**
 * Alimenta el cuerpo con el motor sobre el CSV sintético para el tripulante, entorno y día
 * elegidos en el perfil. Sin CSV usa el estado de ejemplo. `?zona=<id>` abre la app con esa
 * zona elegida; `?capas=piel,esqueleto` deja visibles solo esas capas.
 */
export function useFuenteEstado(config: ConfigAyni) {
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' });
  const tripulanteId = useAyni((s) => s.tripulanteId);
  const entornoId = useAyni((s) => s.entornoId);
  const dia = useAyni((s) => s.dia);
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
    cargarCsv()
      .then(({ lecturas }) => vigente && setCarga({ tipo: 'listo', lecturas }))
      .catch(() => vigente && setCarga({ tipo: 'error' }));
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    const { setEstadoCuerpo, setMotor } = useAyni.getState();
    if (carga.tipo === 'cargando') return;
    if (carga.tipo === 'error') {
      setMotor(null);
      setEstadoCuerpo(crearMockEstadoCuerpo(config));
      return;
    }
    const motor = evaluarSeleccion(carga.lecturas, config, seleccion);
    setMotor(motor);
    setEstadoCuerpo(estadoDesdeMotor(motor, configConEntorno(config, seleccion)));
  }, [carga, config, seleccion]);

  return seleccion;
}
