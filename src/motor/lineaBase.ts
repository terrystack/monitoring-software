import type { Agregacion } from '../config/esquemas';
import type { Lectura, LineaBase } from '../datos/tipos';

export interface ValorDiario {
  dia: string;
  valor: number;
}

/** Número con como máximo `decimales` cifras (sin ceros sobrantes) y el separador indicado. */
export function formatearNumero(valor: number, decimales = 1, separador = ','): string {
  const f = 10 ** decimales;
  return String(Math.round(valor * f) / f).replace('.', separador);
}

/** Día UTC (AAAA-MM-DD) de una fecha ISO. */
export function diaDe(fechaHora: string): string {
  return new Date(fechaHora).toISOString().slice(0, 10);
}

export function sumarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function agregar(valores: number[], agregacion: Agregacion): number {
  switch (agregacion) {
    case 'ultimo':
      return valores[valores.length - 1];
    case 'promedio':
      return valores.reduce((s, v) => s + v, 0) / valores.length;
    case 'suma':
      return valores.reduce((s, v) => s + v, 0);
    case 'max':
      return Math.max(...valores);
    case 'min':
      return Math.min(...valores);
  }
}

/** Regla 3 (6.2): reduce las lecturas a un valor por día, en orden cronológico. */
export function agregarPorDia(lecturas: Lectura[], agregacion: Agregacion): ValorDiario[] {
  const porDia = new Map<string, Lectura[]>();
  for (const l of [...lecturas].sort((a, b) => Date.parse(a.fechaHora) - Date.parse(b.fechaHora))) {
    const dia = diaDe(l.fechaHora);
    const lista = porDia.get(dia) ?? [];
    lista.push(l);
    porDia.set(dia, lista);
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, lista]) => ({
      dia,
      valor: agregar(
        lista.map((l) => l.valor),
        agregacion,
      ),
    }));
}

/** Valores diarios de los `ventanaDias` días anteriores a `diaActual` (sin incluirlo). */
export function ventanaPrevia(
  serie: ValorDiario[],
  diaActual: string,
  ventanaDias: number,
): ValorDiario[] {
  const desde = sumarDias(diaActual, -ventanaDias);
  return serie.filter((v) => v.dia >= desde && v.dia < diaActual);
}

/**
 * Media y desviación (muestral) de la ventana previa. Con menos de `minDias` días devuelve null.
 * Si σ = 0 se usa el 1 % de la media (4.4.3).
 */
export function calcularLineaBase(
  serie: ValorDiario[],
  diaActual: string,
  ventanaDias: number,
  minDias: number,
): { lineaBase: LineaBase | null; dias: number } {
  const ventana = ventanaPrevia(serie, diaActual, ventanaDias).map((v) => v.valor);
  if (ventana.length < minDias) return { lineaBase: null, dias: ventana.length };
  const media = ventana.reduce((s, v) => s + v, 0) / ventana.length;
  const varianza =
    ventana.length > 1
      ? ventana.reduce((s, v) => s + (v - media) ** 2, 0) / (ventana.length - 1)
      : 0;
  const desv = Math.sqrt(varianza) || Math.abs(media) * 0.01;
  return {
    lineaBase: { media, desv, min: Math.min(...ventana), max: Math.max(...ventana) },
    dias: ventana.length,
  };
}
