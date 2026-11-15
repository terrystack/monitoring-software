import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { construirContexto } from '../src/chat/contexto';
import { separarRapidas } from '../src/chat/contrato';
import { cargarConfig } from '../src/config/esquemas';
import { generarLecturas } from '../src/datos/generador';
import { evaluarSeleccion, resolverSeleccion } from '../src/estado/seleccion';
import { definirHerramientas, ejecutarLectura } from './_herramientas';
import { POST } from './chat';
import { POST as POST_STT } from './stt';
import { POST as POST_TTS } from './tts';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config = resultado.config;
const lecturas = generarLecturas(config);
const seleccion = resolverSeleccion(config, { tripulanteId: null, entornoId: null, dia: null });
const contexto = construirContexto({
  config,
  seleccion,
  motor: evaluarSeleccion(lecturas, config, seleccion),
  lecturas,
  idioma: 'es',
  pestanaAnterior: 'agente',
  zonaSeleccionada: null,
  lienzo: { tipo: 'vacio' },
  ahoraHHMM: '12:00',
});

const peticion = (cuerpo: unknown) =>
  new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify(cuerpo) });
const valida = {
  idioma: 'es',
  mensajes: [{ rol: 'usuario', texto: '¿Por qué mi corazón está en ámbar?' }],
  contexto,
};

describe('herramientas del agente', () => {
  it('declara enums con los ids reales del contexto', () => {
    const zona = definirHerramientas(contexto).find((h) => h.nombre === 'mostrar_zona_3d')!;
    const props = zona.parametros.properties as { zona: { enum: string[] } };
    expect(props.zona.enum).toContain('corazon');
  });

  it('las de lectura solo leen el contexto', () => {
    const r = ejecutarLectura('consultar_indicador', { indicador: 'pulso_reposo' }, contexto) as {
      id: string;
      ultimos14?: unknown;
    };
    expect(r.id).toBe('pulso_reposo');
    expect(r.ultimos14).toBeUndefined();
    expect(ejecutarLectura('consultar_zona', { zona: 'inventada' }, contexto)).toEqual({
      error: 'zona desconocida',
    });
  });

  it('separa la línea RAPIDAS del texto', () => {
    expect(separarRapidas('Hola.\nRAPIDAS: a | b | c | d')).toEqual({
      texto: 'Hola.',
      rapidas: ['a', 'b', 'c'],
    });
  });
});

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.stubEnv('LLM_PROVIDER', 'anthropic');
    vi.stubEnv('LLM_API_KEY', 'clave-de-prueba');
    vi.stubEnv('LLM_MODEL', 'modelo-de-prueba');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('GROQ_API_KEY', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('400 con un cuerpo inválido y 502 sin clave', async () => {
    expect((await POST(peticion({ idioma: 'es' }))).status).toBe(400);
    vi.stubEnv('LLM_API_KEY', '');
    vi.stubEnv('LLM_PROVIDER', '');
    expect((await POST(peticion(valida))).status).toBe(502);
  });

  it('ejecuta lecturas en el servidor y devuelve las visualizaciones al cliente', async () => {
    const respuestas = [
      {
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', id: 't1', name: 'consultar_zona', input: { zona: 'corazon' } },
          { type: 'tool_use', id: 't2', name: 'mostrar_zona_3d', input: { zona: 'corazon' } },
        ],
      },
      {
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Tu pulso subió.\nRAPIDAS: ¿Qué hago? | Ver gráfico' }],
      },
    ];
    const enviados: { messages: { content: { type: string; content?: string }[] }[] }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: string }) => {
        enviados.push(JSON.parse(init.body));
        return new Response(JSON.stringify(respuestas.shift()), { status: 200 });
      }),
    );

    const r = await POST(peticion(valida));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      texto: 'Tu pulso subió.',
      llamadas: [{ nombre: 'mostrar_zona_3d', args: { zona: 'corazon' } }],
      respuestasRapidas: ['¿Qué hago?', 'Ver gráfico'],
      fuentes: ['corazon'],
    });
    const resultados = enviados[1].messages.at(-1)!.content;
    expect(resultados.map((b) => b.type)).toEqual(['tool_result', 'tool_result']);
    expect(JSON.parse(resultados[0].content!).tarjeta.zona).toBe('corazon');
  });

  it('502 si el proveedor falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('caído', { status: 500 })),
    );
    expect((await POST(peticion(valida))).status).toBe(502);
  });

  it('si Gemini falla usa el respaldo Groq', async () => {
    vi.stubEnv('LLM_PROVIDER', '');
    vi.stubEnv('LLM_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', 'gemini-test');
    vi.stubEnv('GROQ_API_KEY', 'groq-test');
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(String(url));
        if (url.includes('generativelanguage')) {
          return new Response('caído', { status: 500 });
        }
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Respuesta Groq.\nRAPIDAS: a | b', tool_calls: [] } }],
          }),
          { status: 200 },
        );
      }),
    );
    const r = await POST(peticion(valida));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ texto: 'Respuesta Groq.' });
    expect(urls.some((u) => u.includes('generativelanguage'))).toBe(true);
    expect(urls.some((u) => u.includes('api.groq.com'))).toBe(true);
  });
});

describe('POST /api/stt', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('502 sin GROQ_API_KEY', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    const form = new FormData();
    form.append('file', new Blob(['abc'], { type: 'audio/webm' }), 'a.webm');
    const r = await POST_STT(new Request('http://localhost/api/stt', { method: 'POST', body: form }));
    expect(r.status).toBe(502);
  });

  it('transcribe con Whisper en Groq', async () => {
    vi.stubEnv('GROQ_API_KEY', 'groq-test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ text: 'hola mundo' }), { status: 200 })),
    );
    const form = new FormData();
    form.append('file', new Blob(['abc'], { type: 'audio/webm' }), 'a.webm');
    form.append('language', 'es');
    const r = await POST_STT(new Request('http://localhost/api/stt', { method: 'POST', body: form }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ texto: 'hola mundo' });
  });
});

describe('POST /api/tts', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('502 sin GEMINI_API_KEY', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const r = await POST_TTS(
      new Request('http://localhost/api/tts', {
        method: 'POST',
        body: JSON.stringify({ texto: 'hola', idioma: 'es' }),
      }),
    );
    expect(r.status).toBe(502);
  });

  it('genera audio con Gemini TTS', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'gemini-test');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ inlineData: { mimeType: 'audio/wav', data: 'UklGRg==' } }],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const r = await POST_TTS(
      new Request('http://localhost/api/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ texto: 'hola', idioma: 'es' }),
      }),
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ audio: 'UklGRg==', mediaType: 'audio/wav' });
  });
});
