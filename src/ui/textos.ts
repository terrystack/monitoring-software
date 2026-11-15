import { rellenar } from '../motor/frases';

/** Plantillas de textos de la interfaz con `{clave}` (las mismas reglas que las del motor). */
export const plantilla = rellenar;

/** Iniciales para el avatar: la del nombre propio, sin el título (Cmdte., Dra., Eng.). */
export function iniciales(nombre: string): string {
  const partes = nombre.split(/\s+/).filter((p) => !p.endsWith('.'));
  return (partes[0] ?? nombre).slice(0, 1).toUpperCase();
}
