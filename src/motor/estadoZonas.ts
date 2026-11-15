import type { Aptitud, ConfigAyni, Indicador } from '../config/esquemas';
import type {
  AlertaMultisenal,
  EstadoAptitud,
  EstadoMotor,
  EstadoZona,
  EvaluacionIndicador,
  Lectura,
} from '../datos/tipos';
import { evaluarIndicador, evaluarMultisenal, peorEstado } from './reglas';
import { construirTarjeta } from './tarjetaAccion';
import { filtrarContexto, validarLecturas } from './validacion';

/** Regla 5 (6.2): peor estado de los indicadores de la zona; `sin_dato` solo si todos lo son. */
export function estadoDeZona(
  zonaId: string,
  indicadores: Indicador[],
  evaluaciones: Record<string, EvaluacionIndicador>,
): EstadoZona {
  return peorEstado(
    indicadores
      .filter((i) => i.zonas.includes(zonaId))
      .map((i) => evaluaciones[i.id]?.estado ?? 'sin_dato'),
  );
}

/** Regla 7 (6.2): criterio `peor_estado`; las zonas sin dato no cuentan salvo que todas lo sean. */
export function evaluarAptitud(
  aptitudes: Aptitud[],
  estadosZona: Record<string, EstadoZona>,
): EstadoAptitud[] {
  return aptitudes.map((a) => ({
    id: a.id,
    nombre: a.nombre,
    estado: peorEstado(a.zonas.map((z) => estadosZona[z] ?? 'sin_dato')),
  }));
}

/**
 * Motor completo (6.2). `lecturas` son las de un tripulante; solo cuentan las tomadas
 * hasta `fechaReferencia` (ISO), de modo que el deslizador de tiempo solo cambia esa fecha.
 */
export function evaluarMotor(
  lecturas: Lectura[],
  config: ConfigAyni,
  fechaReferencia: string,
): EstadoMotor {
  const limite = Date.parse(fechaReferencia);
  const hasta = lecturas.filter((l) => Date.parse(l.fechaHora) <= limite);
  const tripulanteId = lecturas[0]?.tripulanteId ?? '';
  const tripulante = config.tripulantes.tripulantes.find((t) => t.id === tripulanteId);
  const entorno = config.entornos.find((e) => e.id === tripulante?.entorno);

  const { frases } = config;
  const { validas, descartadas } = validarLecturas(hasta, config.indicadores, frases);

  const lecturasPorIndicador = new Map<string, Lectura[]>();
  const evaluaciones: Record<string, EvaluacionIndicador> = {};
  for (const ind of config.indicadores) {
    const propias = filtrarContexto(
      validas.filter((l) => l.indicador === ind.id),
      ind,
    );
    lecturasPorIndicador.set(ind.id, propias);
    const ev = evaluarIndicador(ind, propias, fechaReferencia, entorno?.ajustes?.[ind.id], frases);
    if (ev) evaluaciones[ind.id] = ev;
  }

  const estados: Record<string, EstadoZona> = Object.fromEntries(
    config.zonas.map((z) => [z.id, estadoDeZona(z.id, config.indicadores, evaluaciones)]),
  );

  const alertas = config.reglasCompuestas.multisenal
    .map((m) => evaluarMultisenal(m, evaluaciones, lecturasPorIndicador, fechaReferencia))
    .filter((a): a is AlertaMultisenal => a !== null);
  for (const alerta of alertas) {
    for (const z of alerta.zonas)
      estados[z] = peorEstado([estados[z] ?? 'sin_dato', alerta.estado]);
  }

  const zonas: EstadoMotor['zonas'] = {};
  for (const zona of config.zonas) {
    const alerta = alertas.find((a) => a.zonas.includes(zona.id));
    const regla = alerta && config.reglasCompuestas.multisenal.find((m) => m.id === alerta.id);
    zonas[zona.id] = {
      estado: estados[zona.id],
      tarjeta: construirTarjeta({
        zona,
        estado: estados[zona.id],
        indicadores: config.indicadores,
        evaluaciones,
        alerta: alerta && regla ? { alerta, regla } : undefined,
        frases,
      }),
    };
  }

  return {
    tripulanteId,
    fechaReferencia,
    indicadores: evaluaciones,
    zonas,
    alertas,
    aptitud: evaluarAptitud(config.reglasCompuestas.aptitud, estados),
    descartadas,
  };
}
