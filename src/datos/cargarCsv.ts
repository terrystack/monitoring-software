import Papa from 'papaparse';
import { z } from 'zod';
import { esquemaContexto } from '../config/esquemas';
import { guardarCsvEnCache, leerCsvDeCache } from './almacen';
import { COLUMNAS_CSV, type Lectura } from './tipos';

export const RUTA_CSV = '/data/sinteticos.csv';

const esquemaFila = z.object({
  tripulante_id: z.string().min(1, 'tripulante_id vacío'),
  fecha_hora: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?Z$/, 'fecha_hora debe ser ISO 8601 UTC'),
  indicador: z.string().min(1, 'indicador vacío'),
  valor: z
    .string()
    .refine((v) => v.trim() !== '' && Number.isFinite(Number(v)), 'valor no numérico'),
  unidad: z.string().min(1, 'unidad vacía'),
  fuente: z.string().min(1, 'fuente vacía'),
  contexto: esquemaContexto,
});

export interface ErrorFila {
  fila: number;
  mensaje: string;
}

export interface ResultadoCsv {
  lecturas: Lectura[];
  errores: ErrorFila[];
}

/** Convierte el CSV largo de la sección 4.1 en lecturas; las filas inválidas se reportan. */
export function parsearCsv(texto: string): ResultadoCsv {
  const { data, errors, meta } = Papa.parse<Record<string, string>>(texto.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const faltantes = COLUMNAS_CSV.filter((c) => !meta.fields?.includes(c));
  if (faltantes.length > 0) {
    return {
      lecturas: [],
      errores: [{ fila: 1, mensaje: `faltan columnas: ${faltantes.join(', ')}` }],
    };
  }

  const errores: ErrorFila[] = errors.map((e) => ({ fila: (e.row ?? 0) + 2, mensaje: e.message }));
  const lecturas: Lectura[] = [];
  data.forEach((fila, i) => {
    const r = esquemaFila.safeParse(fila);
    if (!r.success) {
      errores.push({ fila: i + 2, mensaje: r.error.issues.map((x) => x.message).join('; ') });
      return;
    }
    lecturas.push({
      tripulanteId: r.data.tripulante_id,
      fechaHora: r.data.fecha_hora,
      indicador: r.data.indicador,
      valor: Number(r.data.valor),
      unidad: r.data.unidad,
      fuente: r.data.fuente,
      contexto: r.data.contexto,
    });
  });
  return { lecturas, errores };
}

export interface ResultadoCargaCsv extends ResultadoCsv {
  origen: 'red' | 'cache';
}

/** Descarga el CSV; si no hay conexión usa la última copia guardada en IndexedDB. */
export async function cargarCsv(ruta = RUTA_CSV): Promise<ResultadoCargaCsv> {
  try {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    const texto = await respuesta.text();
    await guardarCsvEnCache(texto).catch(() => undefined);
    return { ...parsearCsv(texto), origen: 'red' };
  } catch (error) {
    const copia = await leerCsvDeCache().catch(() => undefined);
    if (copia === undefined) {
      throw new Error(`No se pudo cargar ${ruta} y no hay copia local (${String(error)})`);
    }
    return { ...parsearCsv(copia), origen: 'cache' };
  }
}
