import type { Frases, Indicador } from '../config/esquemas';
import type { Lectura, LecturaDescartada } from '../datos/tipos';
import { conUnidad, FRASES_BASE, numero, rellenar } from './frases';

export interface ResultadoValidacion {
  validas: Lectura[];
  descartadas: LecturaDescartada[];
}

/** Regla 1 (6.2): las lecturas fuera de `validacion` se descartan y se pide repetirlas. */
export function validarLecturas(
  lecturas: Lectura[],
  indicadores: Indicador[],
  frases: Frases = FRASES_BASE,
): ResultadoValidacion {
  const porId = new Map(indicadores.map((i) => [i.id, i]));
  const validas: Lectura[] = [];
  const descartadas: LecturaDescartada[] = [];
  for (const lectura of lecturas) {
    const ind = porId.get(lectura.indicador);
    if (!ind) {
      descartadas.push({
        lectura,
        motivo: rellenar(frases.indicadorNoConfigurado, { indicador: lectura.indicador }),
      });
      continue;
    }
    const { min, max } = ind.validacion;
    if (!Number.isFinite(lectura.valor) || lectura.valor < min || lectura.valor > max) {
      descartadas.push({
        lectura,
        motivo: rellenar(frases.fueraDeRango, {
          nombre: ind.nombre,
          valor: conUnidad(lectura.valor, ind.unidad, frases),
          min: numero(min, frases),
          max: numero(max, frases),
        }),
      });
      continue;
    }
    validas.push(lectura);
  }
  return { validas, descartadas };
}

/** Regla 2 (6.2): excluye las lecturas tomadas en un contexto que el indicador ignora. */
export function filtrarContexto(lecturas: Lectura[], indicador: Indicador): Lectura[] {
  const ignorados = new Set<string>(indicador.contextosIgnorados);
  return lecturas.filter((l) => !ignorados.has(l.contexto));
}
