import type { Frases, Indicador, Multisenal, Zona } from '../config/esquemas';
import type {
  AlertaMultisenal,
  EstadoZona,
  EvaluacionIndicador,
  TarjetaAccion,
} from '../datos/tipos';
import { FRASES_BASE, rellenar } from './frases';
import { RANGO_ESTADO } from './reglas';

export interface DatosTarjeta {
  zona: Zona;
  estado: EstadoZona;
  indicadores: Indicador[];
  evaluaciones: Record<string, EvaluacionIndicador>;
  /** Alerta multiseñal activa que marca esta zona (sobrescribe la tarjeta, 4.4.7). */
  alerta?: { alerta: AlertaMultisenal; regla: Multisenal };
  frases?: Frases;
}

/** Construye la tarjeta de acción de una zona (6.1). */
export function construirTarjeta({
  zona,
  estado,
  indicadores,
  evaluaciones,
  alerta,
  frases = FRASES_BASE,
}: DatosTarjeta): TarjetaAccion {
  const propios = indicadores.filter((i) => i.zonas.includes(zona.id));
  const evaluados = propios
    .map((i) => evaluaciones[i.id])
    .filter((e): e is EvaluacionIndicador => e !== undefined)
    .sort((a, b) => RANGO_ESTADO[b.estado] - RANGO_ESTADO[a.estado]);

  if (alerta) {
    const implicados = alerta.alerta.indicadores
      .map((id) => evaluaciones[id])
      .filter((e): e is EvaluacionIndicador => e !== undefined);
    return {
      zona: zona.id,
      estado,
      funcion: zona.funcion,
      indicadores: implicados,
      queCambio: rellenar(frases.multisenal, {
        nombre: alerta.regla.nombre,
        motivos: implicados.map((e) => e.motivo).join(' '),
      }),
      ...alerta.regla.tarjeta,
    };
  }

  const fuera = evaluados.filter((e) => e.estado === 'atencion' || e.estado === 'critico');
  const queCambio =
    fuera.length > 0
      ? fuera.map((e) => e.motivo).join(' ')
      : evaluados.length === 0
        ? frases.sinMediciones
        : estado === 'sin_dato'
          ? evaluados.map((e) => e.motivo).join(' ')
          : frases.dentroDeTuNormal;

  const principal = propios.find((i) => i.id === evaluados[0]?.indicador) ?? propios[0];
  return {
    zona: zona.id,
    estado,
    funcion: zona.funcion,
    indicadores: evaluados,
    queCambio,
    queSignifica: principal?.textos.queSignifica ?? '',
    acciones: principal?.acciones ?? [],
    avisoMedico: principal?.avisoMedico ?? '',
    porQueEspacio: principal?.textos.porQueEspacio ?? '',
    fuente: principal?.fuente ?? '',
    fuenteNombre: principal?.fuenteNombre ?? '',
  };
}
