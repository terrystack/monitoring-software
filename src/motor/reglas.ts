import type {
  Comparador,
  DireccionRiesgo,
  Entorno,
  Frases,
  Indicador,
  Multisenal,
  Regla,
} from '../config/esquemas';
import type {
  AlertaMultisenal,
  EstadoZona,
  EvaluacionIndicador,
  Lectura,
  LineaBase,
} from '../datos/tipos';
import { conUnidad as conUnidadEn, FRASES_BASE, numero, rellenar } from './frases';
import { agregarPorDia, calcularLineaBase, diaDe, sumarDias, type ValorDiario } from './lineaBase';

export const RANGO_ESTADO: Record<EstadoZona, number> = {
  sin_dato: 0,
  normal: 1,
  atencion: 2,
  critico: 3,
};

/** El peor estado de la lista; `sin_dato` solo si no hay otro. */
export function peorEstado(estados: EstadoZona[]): EstadoZona {
  return estados.reduce<EstadoZona>(
    (peor, e) => (RANGO_ESTADO[e] > RANGO_ESTADO[peor] ? e : peor),
    'sin_dato',
  );
}

export function comparar(a: number, comparador: Comparador, b: number): boolean {
  switch (comparador) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
  }
}

/** Convierte un desvío (z o %) en "cuánto riesgo" según la dirección que es mala. */
export function riesgoSegunDireccion(desvio: number, direccion: DireccionRiesgo): number {
  if (direccion === 'sube') return desvio;
  if (direccion === 'baja') return -desvio;
  return Math.abs(desvio);
}

export interface ContextoRegla {
  indicador: Indicador;
  /** Lecturas válidas del indicador, sin contextos ignorados, hasta fechaReferencia, en orden. */
  lecturas: Lectura[];
  serie: ValorDiario[];
  fechaReferencia: string;
  frases: Frases;
}

export interface ResultadoRegla {
  estado: EstadoZona;
  motivo: string;
  lineaBase?: LineaBase | null;
  z?: number | null;
}

type ReglaDe<T extends Regla['tipo']> = Extract<Regla, { tipo: T }>;

function reglaLineaBase(r: ReglaDe<'linea_base'>, ctx: ContextoRegla): ResultadoRegla {
  const { indicador: ind, serie, frases } = ctx;
  const actual = serie[serie.length - 1];
  const { lineaBase, dias } = calcularLineaBase(serie, actual.dia, r.ventanaDias, r.minDias);
  const valor = conUnidadEn(actual.valor, ind.unidad, frases);
  if (!lineaBase) {
    return {
      estado: 'sin_dato',
      motivo: rellenar(frases.faltanDias, { nombre: ind.nombre, valor, dias, minDias: r.minDias }),
      lineaBase: null,
      z: null,
    };
  }
  const z = (actual.valor - lineaBase.media) / lineaBase.desv;
  const riesgo = riesgoSegunDireccion(z, ind.direccionRiesgo);
  return {
    estado: riesgo >= r.zRojo ? 'critico' : riesgo >= r.zAmbar ? 'atencion' : 'normal',
    motivo: rellenar(frases.lineaBase, {
      nombre: ind.nombre,
      valor,
      min: numero(lineaBase.min, frases),
      max: numero(lineaBase.max, frases),
      z: numero(z, frases),
    }),
    lineaBase,
    z,
  };
}

function reglaLimiteFijo(r: ReglaDe<'limite_fijo'>, ctx: ContextoRegla): ResultadoRegla {
  const { indicador: ind, lecturas, serie, frases } = ctx;
  const conUnidad = (v: number) => conUnidadEn(v, ind.unidad, frases);
  let valor = serie[serie.length - 1].valor;
  let detalle = '';
  if (r.ventanaHoras) {
    const fin = Date.parse(lecturas[lecturas.length - 1].fechaHora);
    const inicio = fin - r.ventanaHoras * 3_600_000;
    const enVentana = lecturas.filter((l) => {
      const t = Date.parse(l.fechaHora);
      return t > inicio && t <= fin;
    });
    valor = enVentana.reduce((s, l) => s + l.valor, 0) / enVentana.length;
    detalle = rellenar(frases.promedioHoras, { horas: numero(r.ventanaHoras, frases) });
  }
  const estado: EstadoZona = comparar(valor, r.comparador, r.rojo)
    ? 'critico'
    : comparar(valor, r.comparador, r.ambar)
      ? 'atencion'
      : 'normal';
  const umbral = estado === 'critico' ? r.rojo : r.ambar;
  const valores = { nombre: ind.nombre, valor: conUnidad(valor), detalle };
  return {
    estado,
    motivo:
      estado === 'normal'
        ? rellenar(frases.dentroDelLimite, valores)
        : rellenar(frases.fueraDelLimite, {
            ...valores,
            comparador: r.comparador,
            umbral: conUnidad(umbral),
          }),
  };
}

function reglaTendencia(r: ReglaDe<'tendencia'>, ctx: ContextoRegla): ResultadoRegla {
  const { indicador: ind, serie, frases } = ctx;
  const conUnidad = (v: number) => conUnidadEn(v, ind.unidad, frases);
  const ultimos = serie.slice(-r.diasConsecutivos);
  const actual = serie[serie.length - 1];
  const seguidos = ultimos.every((v, i) => v.dia === sumarDias(ultimos[0].dia, i));
  const cumple =
    ultimos.length === r.diasConsecutivos &&
    seguidos &&
    ultimos.every((v) => comparar(v.valor, r.comparador, r.umbral));
  return cumple
    ? {
        estado: r.estado,
        motivo: rellenar(frases.tendencia, {
          nombre: ind.nombre,
          comparador: r.comparador,
          umbral: conUnidad(r.umbral),
          dias: r.diasConsecutivos,
          valor: conUnidad(actual.valor),
        }),
      }
    : {
        estado: 'normal',
        motivo: rellenar(frases.sinTendencia, {
          nombre: ind.nombre,
          valor: conUnidad(actual.valor),
        }),
      };
}

function reglaPorcentajeCambio(
  r: ReglaDe<'porcentaje_cambio'>,
  ctx: ContextoRegla,
): ResultadoRegla {
  const { indicador: ind, serie, frases } = ctx;
  const conUnidad = (v: number) => conUnidadEn(v, ind.unidad, frases);
  const actual = serie[serie.length - 1];
  let referencia: number | undefined;
  let textoReferencia: string;
  if (r.referencia === 'inicio') {
    referencia = serie[0].valor;
    textoReferencia = frases.referenciaInicio;
  } else {
    const lb = ind.reglas.find((x): x is ReglaDe<'linea_base'> => x.tipo === 'linea_base');
    referencia = calcularLineaBase(
      serie,
      actual.dia,
      lb?.ventanaDias ?? serie.length,
      lb?.minDias ?? 1,
    ).lineaBase?.media;
    textoReferencia = frases.referenciaNormal;
  }
  if (referencia === undefined || referencia === 0) {
    return {
      estado: 'sin_dato',
      motivo: rellenar(frases.sinReferencia, {
        nombre: ind.nombre,
        valor: conUnidad(actual.valor),
      }),
    };
  }
  const pct = ((actual.valor - referencia) / Math.abs(referencia)) * 100;
  const riesgo = riesgoSegunDireccion(pct, ind.direccionRiesgo);
  return {
    estado: riesgo >= r.rojoPct ? 'critico' : riesgo >= r.ambarPct ? 'atencion' : 'normal',
    motivo: rellenar(frases.cambio, {
      nombre: ind.nombre,
      valor: conUnidad(actual.valor),
      pct: `${pct >= 0 ? '+' : ''}${numero(pct, frases)}`,
      referencia: textoReferencia,
      valorReferencia: conUnidad(referencia),
    }),
  };
}

function reglaMetaDiaria(r: ReglaDe<'meta_diaria'>, ctx: ContextoRegla): ResultadoRegla {
  const { indicador: ind, serie, fechaReferencia, frases } = ctx;
  const conUnidad = (v: number) => conUnidadEn(v, ind.unidad, frases);
  const porDia = new Map(serie.map((v) => [v.dia, v.valor]));
  const primerDia = serie[0].dia;
  const ayer = sumarDias(diaDe(fechaReferencia), -1);
  let dias = 0;
  for (let dia = ayer; dia >= primerDia && dias < r.diasRojo; dia = sumarDias(dia, -1)) {
    if ((porDia.get(dia) ?? 0) >= r.meta) break;
    dias++;
  }
  const valores = {
    nombre: ind.nombre,
    meta: conUnidad(r.meta),
    valorAyer: conUnidad(porDia.get(ayer) ?? 0),
    dias,
  };
  const plantilla =
    dias === 0 ? frases.metaCumplida : dias === 1 ? frases.metaUnDia : frases.metaDias;
  return {
    estado: dias >= r.diasRojo ? 'critico' : dias >= r.diasAmbar ? 'atencion' : 'normal',
    motivo: rellenar(plantilla, valores),
  };
}

function reglaPresupuesto(r: ReglaDe<'presupuesto'>, ctx: ContextoRegla): ResultadoRegla {
  const { indicador: ind, serie, frases } = ctx;
  const valor = serie[serie.length - 1].valor;
  const pct = (valor / r.limite) * 100;
  return {
    estado: pct >= r.rojoPct ? 'critico' : pct >= r.ambarPct ? 'atencion' : 'normal',
    motivo: rellenar(frases.presupuesto, {
      nombre: ind.nombre,
      valor: conUnidadEn(valor, ind.unidad, frases),
      pct: numero(pct, frases),
      limite: conUnidadEn(r.limite, ind.unidad, frases),
    }),
  };
}

/** Regla 4 (6.2): evalúa una regla de la sección 4.4.3. */
export function evaluarRegla(regla: Regla, ctx: ContextoRegla): ResultadoRegla {
  switch (regla.tipo) {
    case 'linea_base':
      return reglaLineaBase(regla, ctx);
    case 'limite_fijo':
      return reglaLimiteFijo(regla, ctx);
    case 'tendencia':
      return reglaTendencia(regla, ctx);
    case 'porcentaje_cambio':
      return reglaPorcentajeCambio(regla, ctx);
    case 'meta_diaria':
      return reglaMetaDiaria(regla, ctx);
    case 'presupuesto':
      return reglaPresupuesto(regla, ctx);
  }
}

type AjusteRegla = NonNullable<Entorno['ajustes']>[string];

/** Aplica `entornos.json → ajustes` a las reglas del mismo `tipo`. */
export function aplicarAjustes(indicador: Indicador, ajuste?: AjusteRegla): Indicador {
  if (!ajuste?.tipo) return indicador;
  return {
    ...indicador,
    reglas: indicador.reglas.map((r) =>
      r.tipo === ajuste.tipo ? ({ ...r, ...ajuste } as Regla) : r,
    ),
  };
}

/**
 * Evalúa un indicador con todas sus reglas; manda la peor.
 * `lecturas` ya vienen validadas, sin contextos ignorados y hasta fechaReferencia.
 * Devuelve null si no hay ninguna lectura.
 */
export function evaluarIndicador(
  indicador: Indicador,
  lecturas: Lectura[],
  fechaReferencia: string,
  ajuste?: AjusteRegla,
  frases: Frases = FRASES_BASE,
): EvaluacionIndicador | null {
  if (lecturas.length === 0) return null;
  const ind = aplicarAjustes(indicador, ajuste);
  const ordenadas = [...lecturas].sort((a, b) => Date.parse(a.fechaHora) - Date.parse(b.fechaHora));
  const serie = agregarPorDia(ordenadas, ind.agregacionDiaria);
  const ctx: ContextoRegla = {
    indicador: ind,
    lecturas: ordenadas,
    serie,
    fechaReferencia,
    frases,
  };
  const resultados = ind.reglas.map((r) => evaluarRegla(r, ctx));
  const estado = peorEstado(resultados.map((r) => r.estado));
  const elegido = resultados.find((r) => r.estado === estado) ?? resultados[0];
  const conLineaBase = resultados.find((r) => r.lineaBase !== undefined);
  return {
    indicador: ind.id,
    valor: serie[serie.length - 1].valor,
    lineaBase: conLineaBase?.lineaBase ?? null,
    z: conLineaBase?.z ?? null,
    estado,
    motivo: elegido.motivo,
  };
}

/**
 * Regla 6 (6.2): una alerta multiseñal se activa si se cumplen `minimoCondiciones`
 * con lecturas dentro de las `ventanaHoras` previas a fechaReferencia.
 */
export function evaluarMultisenal(
  regla: Multisenal,
  evaluaciones: Record<string, EvaluacionIndicador>,
  lecturasPorIndicador: Map<string, Lectura[]>,
  fechaReferencia: string,
): AlertaMultisenal | null {
  const fin = Date.parse(fechaReferencia);
  const inicio = fin - regla.ventanaHoras * 3_600_000;
  const cumplidas = regla.condiciones.filter((c) => {
    const recientes = (lecturasPorIndicador.get(c.indicador) ?? []).filter((l) => {
      const t = Date.parse(l.fechaHora);
      return t >= inicio && t <= fin;
    });
    if (recientes.length === 0) return false;
    const ev = evaluaciones[c.indicador];
    switch (c.medida) {
      case 'valor': {
        const ultima = recientes.reduce((a, b) =>
          Date.parse(b.fechaHora) >= Date.parse(a.fechaHora) ? b : a,
        );
        return comparar(ultima.valor, c.comparador, c.umbral);
      }
      case 'z':
        return ev?.z != null && comparar(ev.z, c.comparador, c.umbral);
      case 'estado':
        return (
          ev !== undefined &&
          ev.estado !== 'sin_dato' &&
          comparar(RANGO_ESTADO[ev.estado] - 1, c.comparador, c.umbral)
        );
    }
  });
  if (cumplidas.length < regla.minimoCondiciones) return null;
  return {
    id: regla.id,
    nombre: regla.nombre,
    estado: regla.estado,
    zonas: regla.zonas,
    indicadores: [...new Set(cumplidas.map((c) => c.indicador))],
  };
}
