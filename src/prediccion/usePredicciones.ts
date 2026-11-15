import { useEffect, useState } from 'react';
import { z } from 'zod';
import type { ConfigAyni, Indicador } from '../config/esquemas';
import { numeroDeDia, type PuntoSerie } from '../motor/series';
import {
  HORIZONTE_DIAS,
  predecir,
  type Prediccion,
  type PuntoPrediccion,
} from './prediccionSimple';

const URL_PREDICCIONES = '/data/predicciones.json';

/** Formato de la sección 7 de AYNI_SPEC.md (modelo del equipo de datos). */
const esquemaArchivo = z.object({
  modelo: z.string(),
  entrenadoCon: z.string(),
  series: z.array(
    z.object({
      tripulanteId: z.string(),
      indicador: z.string(),
      puntos: z.array(
        z.object({
          fecha: z.string(),
          valor: z.number(),
          inferior: z.number(),
          superior: z.number(),
        }),
      ),
    }),
  ),
});
type ArchivoPredicciones = z.infer<typeof esquemaArchivo>;

let archivo: Promise<ArchivoPredicciones | null> | undefined;
function cargarArchivo(): Promise<ArchivoPredicciones | null> {
  archivo ??= fetch(URL_PREDICCIONES)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (d ? (esquemaArchivo.safeParse(d).data ?? null) : null))
    .catch(() => null);
  return archivo;
}

export interface FuentePrediccion {
  /** Nombre del modelo y datos de entrenamiento, para "Modelo: … · datos: …". */
  modelo: string;
  datos: string;
  predecir: (ind: Indicador, serie: PuntoSerie[], tripulanteId: string) => Prediccion | null;
}

/**
 * Usa `public/data/predicciones.json` si existe y es válido; si no, la regresión lineal v1.
 */
export function usePredicciones(config: ConfigAyni): FuentePrediccion {
  const [externo, setExterno] = useState<ArchivoPredicciones | null>(null);
  useEffect(() => {
    let vigente = true;
    void cargarArchivo().then((a) => vigente && setExterno(a));
    return () => {
      vigente = false;
    };
  }, []);

  const { textos } = config.escena;
  if (!externo)
    return {
      modelo: textos.modeloV1,
      datos: textos.datosSinteticos,
      predecir: (ind, serie) => predecir(serie, ind),
    };

  return {
    modelo: externo.modelo,
    datos: externo.entrenadoCon,
    predecir: (ind, serie, tripulanteId) => {
      const ultimo = serie[serie.length - 1];
      const propia = externo.series.find(
        (s) => s.indicador === ind.id && s.tripulanteId === tripulanteId,
      );
      if (!propia || !ultimo) return predecir(serie, ind);
      const puntos: PuntoPrediccion[] = propia.puntos
        .map((p) => ({
          numDia: numeroDeDia(config, p.fecha.slice(0, 10)),
          valor: p.valor,
          inf: p.inferior,
          sup: p.superior,
        }))
        .filter((p) => p.numDia > ultimo.numDia && p.numDia <= ultimo.numDia + HORIZONTE_DIAS);
      if (puntos.length === 0) return predecir(serie, ind);
      return {
        puntos,
        pendientePorDia: (puntos[puntos.length - 1].valor - ultimo.valor) / (puntos.length || 1),
      };
    },
  };
}
