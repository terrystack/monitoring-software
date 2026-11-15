import type { ConfigAyni } from '../config/esquemas';
import { fechaDeDia } from '../datos/generador';
import type { EstadoMotor, Lectura } from '../datos/tipos';
import { evaluarMotor } from '../motor/estadoZonas';

/** Qué tripulante, en qué entorno y en qué día de datos se está mirando. */
export interface Seleccion {
  tripulanteId: string;
  entornoId: string;
  dia: number;
}

export interface SeleccionGuardada {
  tripulanteId: string | null;
  entornoId: string | null;
  dia: number | null;
}

/** Completa lo que el usuario no eligió con el escenario inicial y el entorno del tripulante. */
export function resolverSeleccion(config: ConfigAyni, guardada: SeleccionGuardada): Seleccion {
  const inicial =
    config.escenarios.find((e) => e.id === config.escena.escenarioInicial) ?? config.escenarios[0];
  const tripulantes = config.tripulantes.tripulantes;
  const tripulante =
    tripulantes.find((t) => t.id === guardada.tripulanteId) ??
    tripulantes.find((t) => t.id === inicial?.tripulanteId) ??
    tripulantes[0];
  const entorno =
    config.entornos.find((e) => e.id === guardada.entornoId) ??
    config.entornos.find((e) => e.id === tripulante.entorno) ??
    config.entornos[0];
  const dias = config.tripulantes.generador.dias;
  const dia = Math.min(dias, Math.max(1, guardada.dia ?? inicial?.diaDemo ?? dias));
  return { tripulanteId: tripulante.id, entornoId: entorno.id, dia };
}

/** La configuración con el tripulante ubicado en el entorno elegido (solo cambia `entorno`). */
export function configConEntorno(config: ConfigAyni, sel: Seleccion): ConfigAyni {
  return {
    ...config,
    tripulantes: {
      ...config.tripulantes,
      tripulantes: config.tripulantes.tripulantes.map((t) =>
        t.id === sel.tripulanteId ? { ...t, entorno: sel.entornoId } : t,
      ),
    },
  };
}

/** Ejecuta el motor sobre las lecturas del tripulante hasta el final del día elegido. */
export function evaluarSeleccion(
  lecturas: Lectura[],
  config: ConfigAyni,
  sel: Seleccion,
): EstadoMotor {
  const propias = lecturas.filter((l) => l.tripulanteId === sel.tripulanteId);
  return evaluarMotor(propias, configConEntorno(config, sel), fechaDeDia(config, sel.dia));
}

/** Día de misión que corresponde al día de datos (el día 1 es `diaMisionInicial`). */
export function diaMision(config: ConfigAyni, sel: Seleccion): number {
  const t = config.tripulantes.tripulantes.find((x) => x.id === sel.tripulanteId);
  return (t?.diaMisionInicial ?? 0) + sel.dia - 1;
}
