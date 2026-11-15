import { z } from 'zod';

/** Contrato de scripts/mallas-anatomia.json (sección 5.2 de la spec). */
const esquemaFuente = z
  .object({
    archivo: z.string().optional(),
    carpeta: z.string().optional(),
    credito: z.string(),
  })
  .strict();

const esquemaRegla = z
  .object({
    nombre: z.string().min(1),
    fuente: z.string().min(1),
    /** Fracción de triángulos que se conserva al simplificar (0–1]. */
    conservar: z.number().gt(0).max(1),
    /** Si existe, se extraen recorridos de partículas de flujo de estas estructuras. */
    flujo: z.enum(['arteria', 'vena']).optional(),
    incluir: z.array(z.string()).optional(),
    archivos: z.array(z.string()).optional(),
  })
  .strict();

export const esquemaMapeo = z
  .object({
    fuentes: z.record(z.string(), esquemaFuente),
    creditos: z.record(
      z.string(),
      z
        .object({
          texto: z.string(),
          licencia: z.string(),
          enlace: z.string().url(),
          urlLicencia: z.string().url(),
        })
        .strict(),
    ),
    excluir: z.record(z.string(), z.array(z.string())),
    mallas: z.array(esquemaRegla).min(1),
  })
  .strict();

export type MapeoAnatomia = z.infer<typeof esquemaMapeo>;

export interface ReglaExpandida {
  nombre: string;
  fuente: string;
  conservar: number;
  flujo?: 'arteria' | 'vena';
  incluir: RegExp[];
  archivos: string[];
}

const LADOS = [
  { lado: 'izq', l: 'l', lado_en: 'left', Lado_en: 'Left' },
  { lado: 'der', l: 'r', lado_en: 'right', Lado_en: 'Right' },
] as const;

function sustituir(texto: string, valores: Record<string, string>): string {
  return texto.replace(/\{(lado|l|lado_en|Lado_en)\}/g, (_, clave: string) => valores[clave]);
}

/** Expande las reglas con `{lado}` en una por lado (izq = `.l`, der = `.r`). */
export function expandirReglas(mapeo: MapeoAnatomia): ReglaExpandida[] {
  return mapeo.mallas.flatMap((r) => {
    const variantes = r.nombre.includes('{lado}') ? LADOS : [null];
    return variantes.map((v) => {
      const s = (t: string) => (v ? sustituir(t, v) : t);
      return {
        nombre: s(r.nombre),
        fuente: r.fuente,
        conservar: r.conservar,
        flujo: r.flujo,
        incluir: (r.incluir ?? []).map((patron) => new RegExp(s(patron), 'i')),
        archivos: r.archivos ?? [],
      };
    });
  });
}

/** Nombre de contrato de una estructura fuente, o null si se excluye o no tiene regla. */
export function clasificar(
  estructura: string,
  fuente: string,
  reglas: ReglaExpandida[],
  excluir: Record<string, string[]>,
): ReglaExpandida | null {
  const exclusiones = (excluir[fuente] ?? []).map((p) => new RegExp(p, 'i'));
  if (exclusiones.some((re) => re.test(estructura))) return null;
  for (const regla of reglas) {
    if (regla.fuente !== fuente) continue;
    if (regla.incluir.some((re) => re.test(estructura))) return regla;
  }
  return null;
}
