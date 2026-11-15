import type { ConfigAyni } from '../config/esquemas';
import { conUnidad, numero } from '../motor/frases';
import { plantilla } from '../ui/textos';
import type { ContextoAgente, IndicadorContexto, RespuestaChat } from './contrato';

/** Minúsculas y sin tildes, para comparar texto libre con nombres y palabras clave. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/₂/g, '2')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const contiene = (pregunta: string, palabras: string[]) =>
  palabras.some((p) => pregunta.includes(normalizar(p)));

function terminos(texto: string, ignorar: Set<string>, minimo = 5): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((t) => t.length >= minimo && !ignorar.has(t));
}

/** Indicadores mencionados, del más al menos probable (nombre e id pesan más que la descripción). */
function buscarIndicadores(
  pregunta: string,
  c: ContextoAgente,
  ignorar: Set<string>,
): IndicadorContexto[] {
  return c.indicadores
    .map((ind) => {
      const ids = ind.id.split('_').filter((t) => t.length >= 3 && !ignorar.has(t));
      const puntos =
        terminos(ind.nombre, ignorar).filter((t) => pregunta.includes(t)).length * 3 +
        ids.filter((t) => pregunta.includes(` ${t} `)).length * 3 +
        terminos(ind.textos.queEs, ignorar).filter((t) => pregunta.includes(t)).length;
      return { ind, puntos };
    })
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .map((x) => x.ind);
}

function diasPedidos(pregunta: string): 7 | 14 | 30 {
  const n = Number(/\b(\d{1,2})\b/.exec(pregunta)?.[1] ?? 0);
  if (/sema|week/.test(pregunta)) return n >= 2 ? 14 : 7;
  if (n >= 20 || /mes|month/.test(pregunta)) return 30;
  if (n > 0 && n <= 7) return 7;
  return 14;
}

/**
 * Respuesta sin conexión con el modelo (AYNI_FUSION.md §8.9): reglas sobre el CONTEXTO, en el
 * idioma de la configuración. Mismo formato que /api/chat.
 */
export function responderLocal(
  preguntaOriginal: string,
  c: ContextoAgente,
  config: ConfigAyni,
): RespuestaChat {
  const r = config.escena.respaldo;
  const pregunta = ` ${normalizar(preguntaOriginal)} `;
  const ignorar = new Set(r.palabras.ignorar.map(normalizar));
  const etiqueta = (estado: string) =>
    config.escena.estados.find((e) => e.id === estado)?.etiqueta ?? estado;
  const rapidas = config.escena.preguntasSugeridas
    .filter((p) => normalizar(p) !== normalizar(preguntaOriginal))
    .slice(0, 3);
  let prefijo = '';
  const respuesta = (
    texto: string,
    llamadas: RespuestaChat['llamadas'] = [],
    fuentes: string[] = [],
  ): RespuestaChat => ({
    texto: [prefijo, texto].filter(Boolean).join(' '),
    llamadas,
    respuestasRapidas: rapidas,
    fuentes,
  });
  const unidadDe = (ind: IndicadorContexto) => (v: number) =>
    conUnidad(v, ind.unidad, config.frases);
  const grafico = (ind: IndicadorContexto): RespuestaChat['llamadas'][number] => ({
    nombre: 'mostrar_grafico',
    args: { indicador: ind.id, dias: diasPedidos(pregunta), prediccion: true },
  });
  const fuera = c.zonas.filter((z) => z.estado === 'atencion' || z.estado === 'critico');
  const avisosFuera = () =>
    [
      ...new Set(
        fuera
          .map((z) => c.tarjetas[z.id])
          .filter(Boolean)
          .map((t) => plantilla(r.aviso, { aviso: t.avisoMedico })),
      ),
    ].join(' ');

  if (contiene(pregunta, r.palabras.emergencia))
    return { texto: r.emergencia, llamadas: [], respuestasRapidas: [], fuentes: [] };

  const otro = config.tripulantes.tripulantes.find(
    (t) =>
      t.id !== c.tripulante.id &&
      terminos(t.nombre, ignorar, 4).some((n) => pregunta.includes(` ${n} `)),
  );
  if (otro) return respuesta(plantilla(r.otroTripulante, { tripulante: c.tripulante.nombre }));

  if (contiene(pregunta, r.palabras.medicamento))
    return respuesta([r.noMedicamento, avisosFuera()].filter(Boolean).join(' '));

  if (contiene(pregunta, r.palabras.agenda)) {
    const siguiente = c.agendaHoy.find((a) => a.estado !== 'hecha');
    return respuesta(
      siguiente
        ? plantilla(r.agenda, { hora: siguiente.hora, titulo: siguiente.titulo })
        : r.agendaCompleta,
      [{ nombre: 'abrir_pestana', args: { pestana: 'medicion' } }],
    );
  }

  const indicadores = buscarIndicadores(pregunta, c, ignorar);
  const ind = indicadores[0] ?? null;

  if (c.dispositivos.length) {
    const deIndicadores = new Set(c.indicadores.flatMap((i) => terminos(i.nombre, ignorar)));
    const nuevo = (texto: string) =>
      terminos(texto, ignorar).some((t) => !deIndicadores.has(t) && pregunta.includes(t));
    let disp = c.dispositivos[0];
    let sensor: (typeof disp.sensores)[number] | undefined;
    for (const d of c.dispositivos) {
      const s = d.sensores.find((x) => nuevo(x.nombre));
      if (s) {
        disp = d;
        sensor = s;
        break;
      }
    }
    const porNombre = sensor
      ? undefined
      : c.dispositivos.find(
          (d) =>
            pregunta.includes(d.id) ||
            terminos(d.nombre, ignorar, 4).some(
              (t) => !deIndicadores.has(t) && pregunta.includes(t),
            ),
        );
    if (porNombre) disp = porNombre;
    if (sensor || porNombre || contiene(pregunta, r.palabras.dispositivo)) {
      const pasosConfig = config.dispositivos.find((d) => d.id === disp.id)?.pasos ?? [];
      const i = sensor
        ? Math.max(
            0,
            pasosConfig.findIndex((p) => p.sensor === sensor.id),
          )
        : 0;
      const paso = disp.pasos[i];
      const partes = [
        plantilla(r.dispositivo, {
          dispositivo: disp.nombre,
          n: paso?.n ?? 1,
          paso: paso?.texto ?? '',
        }),
      ];
      if (sensor && paso?.error) partes.push(plantilla(r.errorPaso, { error: paso.error }));
      if (sensor && /\d/.test(pregunta)) partes.push(r.repetirMedicion);
      return respuesta(
        partes.join(' '),
        [
          {
            nombre: 'mostrar_guia_dispositivo',
            args: sensor
              ? { dispositivo: disp.id, paso: paso?.n ?? 1, sensor: sensor.id }
              : { dispositivo: disp.id, paso: 1 },
          },
        ],
        [disp.id],
      );
    }
  }

  if (contiene(pregunta, r.palabras.inventar) && ind)
    return respuesta(plantilla(r.noInvento, { nombre: ind.nombre }), [grafico(ind)], [ind.id]);

  if (contiene(pregunta, r.palabras.internet)) {
    if (!ind) return respuesta(`${r.sinInternet} ${r.noEntiendo}`);
    return respuesta(
      `${r.sinInternet} ${plantilla(r.queEs, { nombre: ind.nombre, queEs: ind.textos.queEs })}`,
      [grafico(ind)],
      [ind.id, ind.fuenteNombre],
    );
  }

  if (contiene(pregunta, r.palabras.diagnostico)) prefijo = r.noDiagnostico;

  if (contiene(pregunta, r.palabras.animo)) {
    const enContexto = c.indicadores.find((i) => i.id === config.escena.indicadorAnimo);
    return respuesta(
      [
        r.animo,
        enContexto?.avisoMedico &&
        (enContexto.estado === 'atencion' || enContexto.estado === 'critico')
          ? plantilla(r.aviso, { aviso: enContexto.avisoMedico })
          : '',
      ]
        .filter(Boolean)
        .join(' '),
      enContexto ? [grafico(enContexto)] : [],
      enContexto ? [enContexto.id] : [],
    );
  }

  if (contiene(pregunta, r.palabras.radiacion) && c.limites.radiacionCarreraMSv) {
    const idDosis = config.indicadores.find((i) =>
      i.reglas.some((g) => g.tipo === 'presupuesto'),
    )?.id;
    const dosis = c.indicadores.find((i) => i.id === idDosis);
    if (dosis?.valor !== null && dosis) {
      const limite = c.limites.radiacionCarreraMSv;
      return respuesta(
        plantilla(r.radiacion, {
          nombre: dosis.nombre,
          valor: unidadDe(dosis)(dosis.valor!),
          porcentaje: numero((dosis.valor! / limite) * 100, config.frases),
          limite,
          fuente: dosis.fuenteNombre,
        }),
        [grafico(dosis)],
        [dosis.id, dosis.fuenteNombre],
      );
    }
  }

  const idCo2 = config.indicadores.find((i) =>
    i.reglas.some((g) => g.tipo === 'limite_fijo' && g.ventanaHoras),
  )?.id;
  if (ind && ind.id === idCo2 && ind.valor !== null && c.limites.co2) {
    return respuesta(
      plantilla(r.co2, {
        nombre: ind.nombre,
        valor: unidadDe(ind)(ind.valor),
        limite: c.limites.co2,
      }),
      [grafico(ind)],
      [ind.id, ind.fuenteNombre],
    );
  }

  if (contiene(pregunta, r.palabras.relacion) && indicadores.length >= 2) {
    const [a, b] = indicadores;
    return respuesta(
      plantilla(r.comparar, { a: a.nombre, b: b.nombre }),
      [
        {
          nombre: 'comparar_indicadores',
          args: { indicadores: [a.id, b.id], dias: diasPedidos(pregunta) },
        },
      ],
      [a.id, b.id],
    );
  }

  const zona = c.zonas.find((z) => pregunta.includes(` ${normalizar(z.nombre)}`));
  const pideTendencia = contiene(pregunta, r.palabras.tendencia);

  if (contiene(pregunta, r.palabras.medico) && !zona) {
    if (fuera.length === 0) return respuesta(r.medicoNada);
    return respuesta(
      avisosFuera(),
      [{ nombre: 'mostrar_zona_3d', args: { zona: fuera[0].id } }],
      fuera.map((z) => z.id),
    );
  }

  if (ind && (pideTendencia || !zona)) {
    const unidad = unidadDe(ind);
    const partes = [
      ind.valor === null
        ? plantilla(r.sinValor, { nombre: ind.nombre })
        : ind.normal
          ? plantilla(r.indicador, {
              nombre: ind.nombre,
              valor: unidad(ind.valor),
              normal: `${numero(ind.normal.inf, config.frases)}–${unidad(ind.normal.sup)}`,
            })
          : plantilla(r.indicadorSinNormal, { nombre: ind.nombre, valor: unidad(ind.valor) }),
    ];
    if (ind.cruceProbableEnDias !== null)
      partes.push(plantilla(r.prediccion, { n: ind.cruceProbableEnDias }));
    if ((ind.estado === 'atencion' || ind.estado === 'critico') && ind.avisoMedico)
      partes.push(plantilla(r.aviso, { aviso: ind.avisoMedico }));
    return respuesta(partes.join(' '), [grafico(ind)], [ind.id, ind.fuenteNombre]);
  }

  if (zona) {
    const tarjeta = c.tarjetas[zona.id];
    const partes = [
      plantilla(r.zona, {
        zona: zona.nombre,
        estado: etiqueta(zona.estado),
        queCambio: tarjeta?.queCambio ?? '',
      }),
    ];
    if (tarjeta?.acciones.length)
      partes.push(plantilla(r.acciones, { acciones: tarjeta.acciones.join(' ') }));
    if (tarjeta && (zona.estado === 'atencion' || zona.estado === 'critico'))
      partes.push(plantilla(r.aviso, { aviso: tarjeta.avisoMedico }));
    return respuesta(
      partes.join(' ').trim(),
      [{ nombre: 'mostrar_zona_3d', args: { zona: zona.id } }],
      [zona.id],
    );
  }

  if (prefijo || contiene(pregunta, r.palabras.estado) || fuera.length > 0) {
    const motivo =
      fuera.length === 0
        ? r.todoNormal
        : plantilla(r.zonasFuera, { lista: fuera.map((z) => z.nombre).join(', ') });
    return respuesta(plantilla(r.estado, { puntaje: c.puntaje, motivo }), [
      { nombre: 'mostrar_resumen', args: {} },
    ]);
  }

  return respuesta(r.noEntiendo);
}
