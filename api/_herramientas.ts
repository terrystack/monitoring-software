import {
  HERRAMIENTAS_LECTURA,
  HERRAMIENTAS_VISUALIZACION,
  type ContextoAgente,
  type NombreLectura,
  type NombreVisualizacionApi,
} from '../src/chat/contrato.js';

export interface DefinicionHerramienta {
  nombre: string;
  descripcion: string;
  parametros: Record<string, unknown>;
}

const objeto = (propiedades: Record<string, unknown>, requeridos: string[] = []) => ({
  type: 'object',
  properties: propiedades,
  required: requeridos,
  additionalProperties: false,
});
const enumDe = (valores: string[]) => ({ type: 'string', enum: valores });

/** Herramientas con `enum` de los ids reales del contexto de esta petición (§8.7). */
export function definirHerramientas(c: ContextoAgente): DefinicionHerramienta[] {
  const zonas = c.zonas.map((z) => z.id);
  const indicadores = c.indicadores.map((i) => i.id);
  const sensores = c.dispositivos.flatMap((d) => d.sensores.map((s) => s.id));
  const pasos = Math.max(1, ...c.dispositivos.map((d) => d.pasos.length));
  const dispositivo = c.dispositivos.length
    ? { dispositivo: enumDe(c.dispositivos.map((d) => d.id)) }
    : {};
  const dias = { type: 'integer', enum: [7, 14, 30] };
  const sensor = sensores.length ? { sensor: enumDe(sensores) } : {};

  return [
    {
      nombre: 'consultar_zona',
      descripcion: 'Estado de una zona del cuerpo, sus indicadores y su tarjeta de acción.',
      parametros: objeto({ zona: enumDe(zonas) }, ['zona']),
    },
    {
      nombre: 'consultar_indicador',
      descripcion:
        'Valor, normal personal, estado, motivo, textos, acciones y aviso de un indicador.',
      parametros: objeto({ indicador: enumDe(indicadores) }, ['indicador']),
    },
    {
      nombre: 'consultar_tendencia',
      descripcion: 'Últimos valores diarios y pendiente de un indicador.',
      parametros: objeto(
        { indicador: enumDe(indicadores), dias: { type: 'integer', minimum: 7, maximum: 30 } },
        ['indicador'],
      ),
    },
    {
      nombre: 'consultar_prediccion',
      descripcion: 'Predicción a 7 días con banda y cruce probable fuera de su normal.',
      parametros: objeto({ indicador: enumDe(indicadores) }, ['indicador']),
    },
    {
      nombre: 'consultar_agenda',
      descripcion: 'Tareas de medición de hoy y su estado.',
      parametros: objeto({}),
    },
    {
      nombre: 'consultar_dispositivo',
      descripcion:
        'Pasos, errores comunes y sensores de un dispositivo (PUMA, arnés ECG, diadema EEG u oxímetro). Sin argumentos: la lista de dispositivos.',
      parametros: objeto({
        ...dispositivo,
        paso: { type: 'integer', minimum: 1, maximum: pasos },
        ...sensor,
      }),
    },
    {
      nombre: 'mostrar_zona_3d',
      descripcion: 'Muestra en el lienzo el cuerpo 3D con la zona seleccionada.',
      parametros: objeto(
        { zona: enumDe(zonas), capas: { type: 'array', items: enumDe(c.capas) } },
        ['zona'],
      ),
    },
    {
      nombre: 'mostrar_grafico',
      descripcion: 'Muestra en el lienzo el gráfico de un indicador con su normal y predicción.',
      parametros: objeto(
        { indicador: enumDe(indicadores), dias, prediccion: { type: 'boolean' } },
        ['indicador'],
      ),
    },
    {
      nombre: 'comparar_indicadores',
      descripcion: 'Muestra en el lienzo dos indicadores en los mismos días (doble eje).',
      parametros: objeto(
        {
          indicadores: { type: 'array', items: enumDe(indicadores), minItems: 2, maxItems: 2 },
          dias,
        },
        ['indicadores'],
      ),
    },
    {
      nombre: 'mostrar_guia_dispositivo',
      descripcion:
        'Muestra en el lienzo un dispositivo (PUMA, arnés ECG, diadema EEG u oxímetro) sobre el cuerpo, en un paso de su guía o un sensor.',
      parametros: objeto({
        ...dispositivo,
        paso: { type: 'integer', minimum: 1, maximum: pasos },
        ...sensor,
      }),
    },
    {
      nombre: 'mostrar_resumen',
      descripcion: 'Muestra en el lienzo el resumen de hoy (estado 0–100, aptitud, alertas).',
      parametros: objeto({}),
    },
    {
      nombre: 'abrir_pestana',
      descripcion: 'Cambia de pestaña. Úsala solo si el astronauta lo pide explícitamente.',
      parametros: objeto(
        { pestana: enumDe(['cuerpo3d', 'monitoreo', 'medicion', 'evaluaciones', 'agente']) },
        ['pestana'],
      ),
    },
  ];
}

export const esLectura = (n: string): n is NombreLectura =>
  (HERRAMIENTAS_LECTURA as readonly string[]).includes(n);
export const esVisualizacion = (n: string): n is NombreVisualizacionApi =>
  (HERRAMIENTAS_VISUALIZACION as readonly string[]).includes(n);

/** Ejecuta una herramienta de lectura sobre el contexto recibido; nunca sale a internet. */
export function ejecutarLectura(
  nombre: NombreLectura,
  args: Record<string, unknown>,
  c: ContextoAgente,
): unknown {
  const indicador = (id: unknown) => c.indicadores.find((i) => i.id === id);
  switch (nombre) {
    case 'consultar_zona': {
      const zona = c.zonas.find((z) => z.id === args.zona);
      if (!zona) return { error: 'zona desconocida' };
      return {
        ...zona,
        indicadores: c.indicadores
          .filter((i) => i.zonas.includes(zona.id))
          .map(({ id, nombre, unidad, estado, valor, normal, motivo }) => ({
            id,
            nombre,
            unidad,
            estado,
            valor,
            normal,
            motivo,
          })),
        tarjeta: c.tarjetas[zona.id] ?? null,
      };
    }
    case 'consultar_indicador': {
      const i = indicador(args.indicador);
      if (!i) return { error: 'indicador desconocido' };
      const { ultimos14: _u, prediccion7: _p, ...resto } = i;
      return resto;
    }
    case 'consultar_tendencia': {
      const i = indicador(args.indicador);
      if (!i) return { error: 'indicador desconocido' };
      const dias = Math.min(14, Math.max(1, Number(args.dias ?? 14)));
      return {
        id: i.id,
        unidad: i.unidad,
        valores: i.ultimos14.slice(-dias),
        pendientePorDia: i.pendientePorDia,
        normal: i.normal,
      };
    }
    case 'consultar_prediccion': {
      const i = indicador(args.indicador);
      if (!i) return { error: 'indicador desconocido' };
      return {
        id: i.id,
        unidad: i.unidad,
        prediccion7: i.prediccion7,
        cruceProbableEnDias: i.cruceProbableEnDias,
        normal: i.normal,
      };
    }
    case 'consultar_agenda':
      return c.agendaHoy;
    case 'consultar_dispositivo': {
      if (!c.dispositivos.length) return { error: 'sin dispositivo' };
      const disp =
        c.dispositivos.find((d) => d.id === args.dispositivo) ??
        c.dispositivos.find((d) => d.sensores.some((s) => s.id === args.sensor));
      if (!disp)
        return c.dispositivos.map((d) => ({
          id: d.id,
          nombre: d.nombre,
          inspiradoEn: d.inspiradoEn,
          sensores: d.sensores.map((s) => s.nombre),
        }));
      const paso = disp.pasos.find((p) => p.n === args.paso);
      const sensor = disp.sensores.find((s) => s.id === args.sensor);
      return paso || sensor
        ? { dispositivo: disp.id, paso: paso ?? null, sensor: sensor ?? null }
        : disp;
    }
  }
}
