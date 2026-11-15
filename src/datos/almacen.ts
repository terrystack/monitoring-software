import { createStore, del, get, set, type UseStore } from 'idb-keyval';
import type { Lectura } from './tipos';

const CLAVE_CSV = 'csv_sintetico';
const CLAVE_MANUALES = 'lecturas_manuales';

let almacen: UseStore | undefined;
function obtenerAlmacen(): UseStore {
  almacen ??= createStore('ayni', 'datos');
  return almacen;
}

export async function guardarCsvEnCache(texto: string): Promise<void> {
  await set(CLAVE_CSV, texto, obtenerAlmacen());
}

export async function leerCsvDeCache(): Promise<string | undefined> {
  return get<string>(CLAVE_CSV, obtenerAlmacen());
}

export async function leerLecturasManuales(): Promise<Lectura[]> {
  return (await get<Lectura[]>(CLAVE_MANUALES, obtenerAlmacen())) ?? [];
}

export async function guardarLecturaManual(lectura: Lectura): Promise<Lectura[]> {
  const actuales = await leerLecturasManuales();
  const nuevas = [...actuales, lectura];
  await set(CLAVE_MANUALES, nuevas, obtenerAlmacen());
  return nuevas;
}

export async function borrarLecturasManuales(): Promise<void> {
  await del(CLAVE_MANUALES, obtenerAlmacen());
}
