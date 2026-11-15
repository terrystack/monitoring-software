import { createStore, delMany, get, set, type UseStore } from 'idb-keyval';
import type { SesionMhclGuardada } from '../evaluaciones/mhcl';
import type { SesionPvtGuardada } from '../evaluaciones/pvt';
import type { Lectura } from './tipos';

const CLAVE_CSV = 'csv_sintetico';
const CLAVE_MANUALES = 'lecturas_manuales';
const CLAVE_PVT = 'sesiones_pvt';
const CLAVE_MHCL = 'sesiones_mhcl';

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
  return guardarLecturasManuales([lectura]);
}

/** Agrega varias lecturas de una vez (p. ej. las de una sesión de Evaluaciones). */
export async function guardarLecturasManuales(lecturas: Lectura[]): Promise<Lectura[]> {
  const actuales = await leerLecturasManuales();
  const nuevas = [...actuales, ...lecturas];
  await set(CLAVE_MANUALES, nuevas, obtenerAlmacen());
  return nuevas;
}

/** Borra las lecturas manuales y las sesiones de Evaluaciones (botón del perfil). */
export async function borrarLecturasManuales(): Promise<void> {
  await delMany([CLAVE_MANUALES, CLAVE_PVT, CLAVE_MHCL], obtenerAlmacen());
}

async function leerLista<T>(clave: string): Promise<T[]> {
  return (await get<T[]>(clave, obtenerAlmacen())) ?? [];
}

async function agregarALista<T>(clave: string, item: T): Promise<T[]> {
  const nuevas = [...(await leerLista<T>(clave)), item];
  await set(clave, nuevas, obtenerAlmacen());
  return nuevas;
}

/** Sesiones completas del PVT-B, con cada intento, para exportar o recalcular. */
export const leerSesionesPvt = () => leerLista<SesionPvtGuardada>(CLAVE_PVT);
export const guardarSesionPvt = (s: SesionPvtGuardada) => agregarALista(CLAVE_PVT, s);
export const leerSesionesMhcl = () => leerLista<SesionMhclGuardada>(CLAVE_MHCL);
export const guardarSesionMhcl = (s: SesionMhclGuardada) => agregarALista(CLAVE_MHCL, s);
