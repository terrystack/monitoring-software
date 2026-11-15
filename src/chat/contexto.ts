import type { ConfigAyni, Dispositivo, Indicador } from '../config/esquemas';
import { fechaDeDia } from '../datos/generador';
import type { EstadoMotor, Lectura } from '../datos/tipos';
import { diaMision, type Seleccion } from '../estado/seleccion';
import { agendaDelDia } from '../motor/agenda';
import { puntajeGeneral } from '../motor/puntaje';
import { normalDe, serieIndicador, type PuntoSerie } from '../motor/series';
import { cruceProbable, predecir, type Prediccion } from '../prediccion/prediccionSimple';
import type { ContextoAgente, IndicadorContexto } from './contrato';
import type { EstadoLienzo } from './tipos';

export interface EntradaContexto {
  config: ConfigAyni;
  seleccion: Seleccion;
  motor: EstadoMotor;
  /** CSV + lecturas manuales (de todos los tripulantes; se filtran aquí). */
  lecturas: Lectura[];
  idioma: 'es' | 'en';
  pestanaAnterior: string;
  zonaSeleccionada: string | null;
  lienzo: EstadoLienzo;
  /** Hora del reloj (HH:MM) para la agenda del último día. */
  ahoraHHMM: string;
  predecirIndicador?: (ind: Indicador, serie: PuntoSerie[]) => Prediccion | null;
}

const redondear = (v: number) => Math.round(v * 10) / 10;

type DispositivoConSensores = Omit<Dispositivo, 'pasos'> & {
  sensores?: { id: string; nombre: string; donde: string; indicadores: string[] }[];
  pasos: (Dispositivo['pasos'][number] & { error?: string })[];
};

/**
 * CONTEXTO del Agente AYNI (AYNI_FUSION.md §8.6): la única fuente de datos del modelo.
 * Solo contiene salidas del motor y de la configuración del tripulante activo.
 */
export function construirContexto(e: EntradaContexto): ContextoAgente {
  const { config, seleccion, motor } = e;
  const predecirInd = e.predecirIndicador ?? ((ind, serie) => predecir(serie, ind));
  const tripulante = config.tripulantes.tripulantes.find((t) => t.id === seleccion.tripulanteId);
  const entorno = config.entornos.find((x) => x.id === seleccion.entornoId);
  const propias = e.lecturas.filter((l) => l.tripulanteId === seleccion.tripulanteId);
  const fechaReferencia = fechaDeDia(config, seleccion.dia);

  const indicadores: IndicadorContexto[] = config.indicadores.map((ind) => {
    const ev = motor.indicadores[ind.id];
    const serie = serieIndicador(propias, ind, config, fechaReferencia);
    const pred = predecirInd(ind, serie);
    const cruce = cruceProbable(serie, pred, ind);
    const normal = normalDe(ind, ev?.lineaBase ?? null);
    return {
      id: ind.id,
      nombre: ind.nombre,
      unidad: ind.unidad,
      zonas: ind.zonas,
      estado: ev?.estado ?? 'sin_dato',
      valor: ev ? redondear(ev.valor) : null,
      motivo: ev?.motivo ?? null,
      normal: normal
        ? { media: redondear(normal.media), inf: redondear(normal.inf), sup: redondear(normal.sup) }
        : null,
      ultimos14: serie.slice(-14).map((p) => redondear(p.valor)),
      pendientePorDia: pred ? redondear(pred.pendientePorDia) : null,
      prediccion7: pred
        ? pred.puntos.map((p) => ({
            valor: redondear(p.valor),
            inf: redondear(p.inf),
            sup: redondear(p.sup),
          }))
        : null,
      cruceProbableEnDias: cruce?.dias ?? null,
      // "Qué significa" solo hace falta cuando el indicador está fuera de lo normal.
      textos:
        ev?.estado === 'atencion' || ev?.estado === 'critico'
          ? ind.textos
          : { queEs: ind.textos.queEs, porQueEspacio: ind.textos.porQueEspacio },
      acciones: ind.acciones,
      avisoMedico: ind.avisoMedico,
      fuenteNombre: ind.fuenteNombre,
    };
  });

  const tarjetas = Object.fromEntries(
    Object.entries(motor.zonas)
      .filter(
        ([id, z]) => z.estado === 'atencion' || z.estado === 'critico' || id === e.zonaSeleccionada,
      )
      // Las evaluaciones ya van en `indicadores`: la tarjeta solo nombra sus ids.
      .map(([id, z]) => [
        id,
        { ...z.tarjeta, indicadores: z.tarjeta.indicadores.map((i) => i.indicador) },
      ]),
  );

  const dispositivos = config.dispositivos as DispositivoConSensores[];
  const disp = dispositivos.find((d) => d.sensores?.length) ?? dispositivos[0];
  const presupuesto = config.indicadores
    .flatMap((i) => i.reglas)
    .find((r) => r.tipo === 'presupuesto');
  const co2 = config.indicadores.find((i) =>
    i.reglas.some((r) => r.tipo === 'limite_fijo' && r.ventanaHoras),
  );
  const reglaCo2 = co2?.reglas.find((r) => r.tipo === 'limite_fijo');

  return {
    idioma: e.idioma,
    tripulante: {
      id: seleccion.tripulanteId,
      nombre: tripulante?.nombre ?? '',
      rol: tripulante?.rol ?? '',
      diaMision: diaMision(config, seleccion),
      entorno: {
        id: seleccion.entornoId,
        nombre: entorno?.nombre ?? '',
        riesgosDestacados: entorno?.riesgosDestacados ?? [],
      },
    },
    diaDatos: seleccion.dia,
    fechaReferencia,
    pantalla: {
      pestanaAnterior: e.pestanaAnterior,
      zonaSeleccionada: e.zonaSeleccionada,
      lienzo: e.lienzo.tipo,
    },
    puntaje: puntajeGeneral(motor),
    zonas: config.zonas.map((z) => ({
      id: z.id,
      nombre: z.nombre,
      estado: motor.zonas[z.id]?.estado ?? 'sin_dato',
    })),
    indicadores,
    alertas: motor.alertas.map((a) => ({
      id: a.id,
      nombre: config.reglasCompuestas.multisenal.find((m) => m.id === a.id)?.nombre ?? a.nombre,
      estado: a.estado,
      zonas: a.zonas,
      indicadores: a.indicadores,
    })),
    aptitud: motor.aptitud.map((a) => ({
      id: a.id,
      nombre: config.reglasCompuestas.aptitud.find((x) => x.id === a.id)?.nombre ?? a.nombre,
      estado: a.estado,
    })),
    tarjetas,
    agendaHoy: agendaDelDia(
      config,
      propias,
      seleccion.tripulanteId,
      seleccion.dia,
      e.ahoraHHMM,
    ).map((t) => ({
      id: t.tarea.id,
      titulo: t.tarea.titulo,
      hora: t.tarea.hora,
      estado: t.estado,
    })),
    dispositivo: disp
      ? {
          id: disp.id,
          nombre: disp.nombre,
          pasos: disp.pasos.map((p, i) => ({
            n: i + 1,
            texto: p.texto,
            ...(p.error ? { error: p.error } : {}),
          })),
          sensores: (disp.sensores ?? []).map((s) => ({
            id: s.id,
            nombre: s.nombre,
            donde: s.donde,
            indicadores: s.indicadores,
          })),
        }
      : null,
    capas: config.escena.capas.map((c) => c.id),
    lecturasDescartadas: motor.descartadas.slice(-10).map((d) => ({
      indicador: d.lectura.indicador,
      motivo: d.motivo,
    })),
    limites: {
      radiacionCarreraMSv: presupuesto?.tipo === 'presupuesto' ? presupuesto.limite : null,
      co2:
        co2 && reglaCo2?.tipo === 'limite_fijo'
          ? `≤ ${reglaCo2.ambar} ${co2.unidad} (${reglaCo2.ventanaHoras} h) · NASA-STD-3001`
          : '',
    },
  };
}
