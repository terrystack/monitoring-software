import type { ImagenAdjunta } from './tipos';

const LADO_MAXIMO = 1024;
const CALIDAD_JPEG = 0.8;
const BYTES_MAXIMOS = 4 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];

export class ImagenNoValida extends Error {}

/**
 * Reduce una imagen a lado mayor ≤ 1024 px en JPEG 0,8 y la devuelve en base64 sin prefijo
 * (AYNI_FUSION.md §8.3). No se guarda en ningún almacenamiento persistente.
 */
export async function prepararImagen(archivo: File): Promise<ImagenAdjunta> {
  if (!TIPOS.includes(archivo.type) || archivo.size > BYTES_MAXIMOS) throw new ImagenNoValida();
  const mapa = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(mapa.width * escala);
  lienzo.height = Math.round(mapa.height * escala);
  lienzo.getContext('2d')?.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
  mapa.close();
  const url = lienzo.toDataURL('image/jpeg', CALIDAD_JPEG);
  const datos = url.slice(url.indexOf(',') + 1);
  if (datos.length * 0.75 > BYTES_MAXIMOS) throw new ImagenNoValida();
  return { mediaType: 'image/jpeg', datos };
}

export const urlDeImagen = (imagen: ImagenAdjunta) =>
  `data:${imagen.mediaType};base64,${imagen.datos}`;
