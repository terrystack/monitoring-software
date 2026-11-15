import { z } from 'zod';
import { separarRapidas, type ContextoAgente, type RespuestaChat } from '../src/chat/contrato.js';
import {
  definirHerramientas,
  ejecutarLectura,
  esLectura,
  esVisualizacion,
} from './_herramientas.js';
import { instrucciones } from './_instrucciones.js';
import { crearAdaptador, ErrorProveedor, type Bloque, type MensajeLLM } from './_llm.js';

/** POST /api/chat · Agente AYNI (AYNI_FUSION.md §8.5 y §8.8). La clave vive solo aquí. */

const LIMITE_BYTES = 6 * 1024 * 1024;
const MAX_VUELTAS = 4;
const TIEMPO_MAXIMO_MS = 25_000;
const MAX_MENSAJES = 12;

const esquemaPeticion = z.object({
  idioma: z.enum(['es', 'en']),
  mensajes: z
    .array(
      z.object({
        rol: z.enum(['usuario', 'asistente']),
        texto: z.string().max(4000),
        imagen: z
          .object({
            mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
            datos: z.string().max(5_600_000),
          })
          .optional(),
      }),
    )
    .min(1),
  contexto: z
    .object({
      idioma: z.enum(['es', 'en']),
      zonas: z.array(z.object({ id: z.string() }).passthrough()),
      indicadores: z.array(z.object({ id: z.string() }).passthrough()),
      capas: z.array(z.string()),
    })
    .passthrough(),
});

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export async function POST(request: Request): Promise<Response> {
  const tamano = Number(request.headers.get('content-length') ?? 0);
  if (tamano > LIMITE_BYTES) return json({ error: 'demasiado grande' }, 413);
  const texto = await request.text();
  if (texto.length > LIMITE_BYTES) return json({ error: 'demasiado grande' }, 413);

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  const peticion = esquemaPeticion.safeParse(cuerpo);
  if (!peticion.success) return json({ error: 'petición inválida' }, 400);

  const adaptador = crearAdaptador(process.env);
  if (!adaptador) return json({ error: 'modelo no configurado' }, 502);

  const contexto = peticion.data.contexto as unknown as ContextoAgente;
  const herramientas = definirHerramientas(contexto);
  const mensajes: MensajeLLM[] = peticion.data.mensajes.slice(-MAX_MENSAJES).map((m) => ({
    rol: m.rol,
    bloques: [
      ...(m.imagen
        ? [{ tipo: 'imagen' as const, mediaType: m.imagen.mediaType, datos: m.imagen.datos }]
        : []),
      { tipo: 'texto' as const, texto: m.texto || '…' },
    ],
  }));

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);
  const llamadas: RespuestaChat['llamadas'] = [];
  const fuentes = new Set<string>();
  try {
    for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
      const r = await adaptador.completar({
        system: instrucciones(contexto),
        mensajes,
        herramientas,
        maxTokens: Number(process.env.CHAT_MAX_TOKENS ?? 600),
        signal: control.signal,
      });
      if (r.usos.length === 0 || vuelta === MAX_VUELTAS - 1) {
        const { texto: limpio, rapidas } = separarRapidas(r.texto);
        return json({
          texto: limpio,
          llamadas,
          respuestasRapidas: rapidas,
          fuentes: [...fuentes],
        } satisfies RespuestaChat);
      }
      const resultados: Bloque[] = r.usos.map((u) => {
        if (esLectura(u.nombre)) {
          for (const v of Object.values(u.args)) if (typeof v === 'string') fuentes.add(v);
          return {
            tipo: 'resultado',
            id: u.id,
            contenido: JSON.stringify(ejecutarLectura(u.nombre, u.args, contexto)),
          };
        }
        if (esVisualizacion(u.nombre)) {
          llamadas.push({ nombre: u.nombre, args: u.args });
          return {
            tipo: 'resultado',
            id: u.id,
            contenido: JSON.stringify({ ok: true, mostrado: u.nombre }),
          };
        }
        return { tipo: 'resultado', id: u.id, contenido: JSON.stringify({ error: 'desconocida' }) };
      });
      mensajes.push(
        {
          rol: 'asistente',
          bloques: [
            ...(r.texto ? [{ tipo: 'texto' as const, texto: r.texto }] : []),
            ...r.usos.map((u) => ({ tipo: 'uso' as const, ...u })),
          ],
        },
        { rol: 'usuario', bloques: resultados },
      );
    }
    return json({ error: 'sin respuesta' }, 502);
  } catch (error) {
    if (control.signal.aborted) return json({ error: 'tiempo agotado' }, 504);
    if (error instanceof ErrorProveedor) return json({ error: 'proveedor' }, 502);
    return json({ error: 'interno' }, 502);
  } finally {
    clearTimeout(temporizador);
  }
}
