import type { Zona } from '../../config/esquemas';

/** Zona a la que pertenece una malla según los patrones de zonas.json (`*` = cualquier sufijo). */
export function zonaDeMalla(nombre: string, zonas: Zona[]): string | null {
  for (const zona of zonas) {
    for (const patron of zona.mallas) {
      const coincide = patron.endsWith('*')
        ? nombre.startsWith(patron.slice(0, -1))
        : nombre === patron;
      if (coincide) return zona.id;
    }
  }
  return null;
}
