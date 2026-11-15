import type { Frases } from '../config/esquemas';
import frasesJson from '../config/frases.json';
import { formatearNumero } from './lineaBase';

/** Frases del idioma base (src/config/frases.json); el motor las usa si no recibe otras. */
export const FRASES_BASE = frasesJson as Frases;

/** Sustituye cada `{clave}` de la plantilla por su valor. */
export function rellenar(plantilla: string, valores: Record<string, string | number>): string {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave: string) =>
    clave in valores ? String(valores[clave]) : `{${clave}}`,
  );
}

export function numero(valor: number, frases: Frases, decimales = 1): string {
  return formatearNumero(valor, decimales, frases.separadorDecimal);
}

/** Valor con su unidad; las escalas `escala_A_B` se muestran como `valor/B`. */
export function conUnidad(valor: number, unidad: string, frases: Frases): string {
  const escala = /^escala_\d+_(\d+)$/.exec(unidad);
  return escala ? `${numero(valor, frases)}/${escala[1]}` : `${numero(valor, frases)} ${unidad}`;
}
