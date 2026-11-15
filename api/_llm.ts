import type { DefinicionHerramienta } from './_herramientas.js';

/** Representación interna común a los proveedores (AYNI_FUSION.md §8.8). */
export type Bloque =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'imagen'; mediaType: string; datos: string }
  | { tipo: 'uso'; id: string; nombre: string; args: Record<string, unknown> }
  | { tipo: 'resultado'; id: string; contenido: string };

export interface MensajeLLM {
  rol: 'usuario' | 'asistente';
  bloques: Bloque[];
}

export interface RespuestaLLM {
  texto: string;
  usos: { id: string; nombre: string; args: Record<string, unknown> }[];
}

export interface PeticionLLM {
  system: string;
  mensajes: MensajeLLM[];
  herramientas: DefinicionHerramienta[];
  maxTokens: number;
  signal: AbortSignal;
}

export interface AdaptadorLLM {
  completar(p: PeticionLLM): Promise<RespuestaLLM>;
}

export class ErrorProveedor extends Error {}

const TEMPERATURA = 0.3;

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal: AbortSignal,
) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) throw new ErrorProveedor(`proveedor ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json() as Promise<Record<string, unknown>>;
}

function anthropic(clave: string, modelo: string): AdaptadorLLM {
  const contenido = (b: Bloque) => {
    switch (b.tipo) {
      case 'texto':
        return { type: 'text', text: b.texto };
      case 'imagen':
        return {
          type: 'image',
          source: { type: 'base64', media_type: b.mediaType, data: b.datos },
        };
      case 'uso':
        return { type: 'tool_use', id: b.id, name: b.nombre, input: b.args };
      case 'resultado':
        return { type: 'tool_result', tool_use_id: b.id, content: b.contenido };
    }
  };
  return {
    async completar({ system, mensajes, herramientas, maxTokens, signal }) {
      const datos = await postJson(
        'https://api.anthropic.com/v1/messages',
        { 'x-api-key': clave, 'anthropic-version': '2023-06-01' },
        {
          model: modelo,
          max_tokens: maxTokens,
          temperature: TEMPERATURA,
          system,
          tools: herramientas.map((h) => ({
            name: h.nombre,
            description: h.descripcion,
            input_schema: h.parametros,
          })),
          messages: mensajes.map((m) => ({
            role: m.rol === 'usuario' ? 'user' : 'assistant',
            content: m.bloques.map(contenido),
          })),
        },
        signal,
      );
      const bloques = (datos.content ?? []) as {
        type: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
      }[];
      return {
        texto: bloques
          .filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join('\n'),
        usos: bloques
          .filter((b) => b.type === 'tool_use')
          .map((b) => ({ id: b.id ?? '', nombre: b.name ?? '', args: b.input ?? {} })),
      };
    },
  };
}

function openai(clave: string, modelo: string, base: string): AdaptadorLLM {
  return {
    async completar({ system, mensajes, herramientas, maxTokens, signal }) {
      const salida: Record<string, unknown>[] = [{ role: 'system', content: system }];
      for (const m of mensajes) {
        const resultados = m.bloques.filter((b) => b.tipo === 'resultado');
        for (const r of resultados)
          if (r.tipo === 'resultado')
            salida.push({ role: 'tool', tool_call_id: r.id, content: r.contenido });
        const usos = m.bloques.filter((b) => b.tipo === 'uso');
        const partes = m.bloques.flatMap((b): Record<string, unknown>[] =>
          b.tipo === 'texto'
            ? [{ type: 'text', text: b.texto }]
            : b.tipo === 'imagen'
              ? [{ type: 'image_url', image_url: { url: `data:${b.mediaType};base64,${b.datos}` } }]
              : [],
        );
        if (m.rol === 'asistente') {
          if (partes.length === 0 && usos.length === 0) continue;
          salida.push({
            role: 'assistant',
            content:
              partes
                .filter((p) => p.type === 'text')
                .map((p) => String(p.text))
                .join('\n') || null,
            ...(usos.length
              ? {
                  tool_calls: usos.map((u) =>
                    u.tipo === 'uso'
                      ? {
                          id: u.id,
                          type: 'function',
                          function: { name: u.nombre, arguments: JSON.stringify(u.args) },
                        }
                      : null,
                  ),
                }
              : {}),
          });
        } else if (partes.length) {
          salida.push({ role: 'user', content: partes });
        }
      }
      const datos = await postJson(
        `${base.replace(/\/$/, '')}/chat/completions`,
        { authorization: `Bearer ${clave}` },
        {
          model: modelo,
          max_tokens: maxTokens,
          temperature: TEMPERATURA,
          messages: salida,
          tools: herramientas.map((h) => ({
            type: 'function',
            function: { name: h.nombre, description: h.descripcion, parameters: h.parametros },
          })),
        },
        signal,
      );
      const mensaje = ((datos.choices as { message?: Record<string, unknown> }[] | undefined)?.[0]
        ?.message ?? {}) as {
        content?: string | null;
        tool_calls?: { id: string; function: { name: string; arguments: string } }[];
      };
      return {
        texto: mensaje.content ?? '',
        usos: (mensaje.tool_calls ?? []).map((t) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(t.function.arguments || '{}');
          } catch {
            args = {};
          }
          return { id: t.id, nombre: t.function.name, args };
        }),
      };
    },
  };
}

/** Adaptador según las variables de entorno del servidor; null si falta la clave. */
export function crearAdaptador(env: NodeJS.ProcessEnv): AdaptadorLLM | null {
  const clave = env.LLM_API_KEY;
  if (!clave) return null;
  const proveedor = (env.LLM_PROVIDER ?? 'anthropic').toLowerCase();
  if (proveedor === 'openai')
    return openai(
      clave,
      env.LLM_MODEL ?? 'gpt-4o-mini',
      env.LLM_BASE_URL || 'https://api.openai.com/v1',
    );
  return anthropic(clave, env.LLM_MODEL ?? 'claude-sonnet-5-5');
}
