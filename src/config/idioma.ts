import { z } from 'zod';
import { esquemaEscena, esquemaFrases, type ConfigAyni } from './esquemas';
import enJson from './idiomas/en.json';

/** El español es el idioma base de src/config; los demás son capas con los mismos ids. */
export const IDIOMAS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

const t = z.string().min(1);
const textosIndicador = z.object({ queEs: t, queSignifica: t, porQueEspacio: t }).strict();
const tarjetaMultisenal = z
  .object({ queSignifica: t, acciones: z.array(t), avisoMedico: t, porQueEspacio: t })
  .strict();

export const esquemaTraduccion = z
  .object({
    escena: z
      .object({
        estados: z.record(z.string(), t),
        capas: z.record(z.string(), t),
        modosCapa: z.record(z.string(), t),
        textos: esquemaEscena.shape.textos,
        etiquetasAptitud: esquemaEscena.shape.etiquetasAptitud,
        preguntasSugeridas: esquemaEscena.shape.preguntasSugeridas,
        respaldo: esquemaEscena.shape.respaldo,
        escalaAnimo: esquemaEscena.shape.escalaAnimo,
      })
      .strict(),
    frases: esquemaFrases,
    zonas: z.record(z.string(), z.object({ nombre: t, funcion: t }).strict()),
    indicadores: z.record(
      z.string(),
      z
        .object({
          nombre: t,
          unidad: t.optional(),
          textos: textosIndicador,
          acciones: z.array(t),
          avisoMedico: t,
        })
        .strict(),
    ),
    reglasCompuestas: z
      .object({
        multisenal: z.record(
          z.string(),
          z.object({ nombre: t, tarjeta: tarjetaMultisenal }).strict(),
        ),
        aptitud: z.record(z.string(), z.object({ nombre: t }).strict()),
      })
      .strict(),
    entornos: z.record(z.string(), z.object({ nombre: t, riesgosDestacados: z.array(t) }).strict()),
    escenarios: z.record(z.string(), z.object({ nombre: t, descripcion: t }).strict()),
    tripulantes: z.record(z.string(), z.object({ nombre: t, rol: t }).strict()),
    dispositivos: z.record(
      z.string(),
      z
        .object({
          nombre: t,
          pasos: z.array(t),
          erroresComunes: z.array(t),
          /** Error común de cada paso ("" si el paso no tiene). */
          erroresPasos: z.array(z.string()).optional(),
          sensores: z.record(z.string(), z.object({ nombre: t, donde: t }).strict()).optional(),
        })
        .strict(),
    ),
    rutina: z.record(z.string(), z.object({ titulo: t }).strict()),
  })
  .strict();

export type Traduccion = z.infer<typeof esquemaTraduccion>;

export const TRADUCCIONES: Record<Exclude<Idioma, 'es'>, unknown> = { en: enJson };

/** Lista lo que falta o sobra en una traducción respecto a la configuración base. */
export function faltantesTraduccion(config: ConfigAyni, tr: Traduccion): string[] {
  const errores: string[] = [];
  const mismosIds = (ruta: string, base: string[], traducidos: Record<string, unknown>) => {
    for (const id of base) if (!(id in traducidos)) errores.push(`${ruta}.${id}: falta`);
    for (const id of Object.keys(traducidos))
      if (!base.includes(id)) errores.push(`${ruta}.${id}: no existe en la configuración`);
  };
  const mismoLargo = (ruta: string, base: unknown[], traducido: unknown[] | undefined) => {
    if (traducido && traducido.length !== base.length)
      errores.push(`${ruta}: ${traducido.length} elementos, se esperaban ${base.length}`);
  };

  mismosIds(
    'escena.estados',
    config.escena.estados.map((e) => e.id),
    tr.escena.estados,
  );
  mismosIds(
    'escena.capas',
    config.escena.capas.map((c) => c.id),
    tr.escena.capas,
  );
  mismosIds(
    'escena.modosCapa',
    config.escena.modosCapa.map((m) => m.id),
    tr.escena.modosCapa,
  );
  mismosIds(
    'zonas',
    config.zonas.map((z) => z.id),
    tr.zonas,
  );
  mismosIds(
    'indicadores',
    config.indicadores.map((i) => i.id),
    tr.indicadores,
  );
  for (const i of config.indicadores)
    mismoLargo(`indicadores.${i.id}.acciones`, i.acciones, tr.indicadores[i.id]?.acciones);
  const { multisenal, aptitud } = config.reglasCompuestas;
  mismosIds(
    'reglasCompuestas.multisenal',
    multisenal.map((m) => m.id),
    tr.reglasCompuestas.multisenal,
  );
  for (const m of multisenal)
    mismoLargo(
      `reglasCompuestas.multisenal.${m.id}.tarjeta.acciones`,
      m.tarjeta.acciones,
      tr.reglasCompuestas.multisenal[m.id]?.tarjeta.acciones,
    );
  mismosIds(
    'reglasCompuestas.aptitud',
    aptitud.map((a) => a.id),
    tr.reglasCompuestas.aptitud,
  );
  mismosIds(
    'entornos',
    config.entornos.map((e) => e.id),
    tr.entornos,
  );
  for (const e of config.entornos)
    mismoLargo(
      `entornos.${e.id}.riesgosDestacados`,
      e.riesgosDestacados,
      tr.entornos[e.id]?.riesgosDestacados,
    );
  mismosIds(
    'escenarios',
    config.escenarios.map((e) => e.id),
    tr.escenarios,
  );
  mismosIds(
    'tripulantes',
    config.tripulantes.tripulantes.map((x) => x.id),
    tr.tripulantes,
  );
  mismosIds(
    'dispositivos',
    config.dispositivos.map((d) => d.id),
    tr.dispositivos,
  );
  for (const d of config.dispositivos) {
    mismoLargo(`dispositivos.${d.id}.pasos`, d.pasos, tr.dispositivos[d.id]?.pasos);
    if (d.pasos.some((p) => p.error))
      mismoLargo(`dispositivos.${d.id}.erroresPasos`, d.pasos, tr.dispositivos[d.id]?.erroresPasos);
    if (d.sensores)
      mismosIds(
        `dispositivos.${d.id}.sensores`,
        d.sensores.map((s) => s.id),
        tr.dispositivos[d.id]?.sensores ?? {},
      );
    mismoLargo(
      `dispositivos.${d.id}.erroresComunes`,
      d.erroresComunes,
      tr.dispositivos[d.id]?.erroresComunes,
    );
  }
  mismosIds(
    'rutina',
    config.rutina.map((x) => x.id),
    tr.rutina,
  );
  return errores;
}

/** Devuelve la configuración con los textos de la traducción; lo que falte queda en español. */
export function traducirConfig(config: ConfigAyni, tr: Traduccion): ConfigAyni {
  const { escena } = config;
  return {
    ...config,
    escena: {
      ...escena,
      estados: escena.estados.map((e) => ({
        ...e,
        etiqueta: tr.escena.estados[e.id] ?? e.etiqueta,
      })),
      capas: escena.capas.map((c) => ({ ...c, nombre: tr.escena.capas[c.id] ?? c.nombre })),
      modosCapa: escena.modosCapa.map((m) => ({
        ...m,
        etiqueta: tr.escena.modosCapa[m.id] ?? m.etiqueta,
      })),
      textos: tr.escena.textos,
      etiquetasAptitud: tr.escena.etiquetasAptitud,
      preguntasSugeridas: tr.escena.preguntasSugeridas,
      respaldo: tr.escena.respaldo,
      escalaAnimo: tr.escena.escalaAnimo,
      indicadoresRegistro: escena.indicadoresRegistro,
      indicadorAnimo: escena.indicadorAnimo,
      indicadoresDestacados: escena.indicadoresDestacados,
      escenarioInicial: escena.escenarioInicial,
    },
    frases: tr.frases,
    zonas: config.zonas.map((z) => ({ ...z, ...tr.zonas[z.id] })),
    indicadores: config.indicadores.map((i) => {
      const x = tr.indicadores[i.id];
      return x
        ? {
            ...i,
            nombre: x.nombre,
            unidad: x.unidad ?? i.unidad,
            textos: x.textos,
            acciones: x.acciones,
            avisoMedico: x.avisoMedico,
          }
        : i;
    }),
    reglasCompuestas: {
      multisenal: config.reglasCompuestas.multisenal.map((m) => {
        const x = tr.reglasCompuestas.multisenal[m.id];
        return x ? { ...m, nombre: x.nombre, tarjeta: { ...m.tarjeta, ...x.tarjeta } } : m;
      }),
      aptitud: config.reglasCompuestas.aptitud.map((a) => ({
        ...a,
        ...tr.reglasCompuestas.aptitud[a.id],
      })),
    },
    entornos: config.entornos.map((e) => ({ ...e, ...tr.entornos[e.id] })),
    escenarios: config.escenarios.map((e) => ({ ...e, ...tr.escenarios[e.id] })),
    tripulantes: {
      ...config.tripulantes,
      tripulantes: config.tripulantes.tripulantes.map((x) => ({ ...x, ...tr.tripulantes[x.id] })),
    },
    dispositivos: config.dispositivos.map((d) => {
      const x = tr.dispositivos[d.id];
      return x
        ? {
            ...d,
            nombre: x.nombre,
            pasos: d.pasos.map((p, i) => ({
              ...p,
              texto: x.pasos[i] ?? p.texto,
              ...(p.error ? { error: x.erroresPasos?.[i] || p.error } : {}),
            })),
            ...(d.sensores
              ? {
                  sensores: d.sensores.map((s) => ({ ...s, ...x.sensores?.[s.id] })),
                }
              : {}),
            erroresComunes: d.erroresComunes.map((e, i) => ({
              ...e,
              texto: x.erroresComunes[i] ?? e.texto,
            })),
          }
        : d;
    }),
    rutina: config.rutina.map((r) => ({ ...r, ...tr.rutina[r.id] })),
  };
}

/** Configuración en el idioma pedido; si la traducción no es válida, se queda en español. */
export function configEnIdioma(base: ConfigAyni, idioma: Idioma): ConfigAyni {
  if (idioma === 'es') return base;
  const tr = esquemaTraduccion.safeParse(TRADUCCIONES[idioma]);
  return tr.success ? traducirConfig(base, tr.data) : base;
}
