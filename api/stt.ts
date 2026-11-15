/** POST /api/stt · Whisper en Groq (AYNI_FUSION.md §8.4). La clave vive solo aquí. */

const LIMITE_BYTES = 25 * 1024 * 1024;
const MODELO = 'whisper-large-v3-turbo';
const URL_GROQ = 'https://api.groq.com/openai/v1/audio/transcriptions';

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export async function POST(request: Request): Promise<Response> {
  const clave = process.env.GROQ_API_KEY;
  if (!clave) return json({ error: 'stt no configurado' }, 502);

  const tamano = Number(request.headers.get('content-length') ?? 0);
  if (tamano > LIMITE_BYTES) return json({ error: 'demasiado grande' }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'formulario inválido' }, 400);
  }

  const archivo = form.get('file');
  if (!(archivo instanceof Blob) || archivo.size === 0) {
    return json({ error: 'audio requerido' }, 400);
  }
  if (archivo.size > LIMITE_BYTES) return json({ error: 'demasiado grande' }, 413);

  const idioma = form.get('language');
  const salida = new FormData();
  const nombre =
    archivo instanceof File && archivo.name ? archivo.name : 'dictado.webm';
  salida.append('file', archivo, nombre);
  salida.append('model', MODELO);
  salida.append('response_format', 'json');
  if (typeof idioma === 'string' && (idioma === 'es' || idioma === 'en')) {
    salida.append('language', idioma);
  }

  try {
    const r = await fetch(URL_GROQ, {
      method: 'POST',
      headers: { authorization: `Bearer ${clave}` },
      body: salida,
    });
    if (!r.ok) {
      return json({ error: 'proveedor', detalle: (await r.text()).slice(0, 300) }, 502);
    }
    const datos = (await r.json()) as { text?: string };
    const texto = (datos.text ?? '').trim();
    if (!texto) return json({ error: 'sin transcripción' }, 502);
    return json({ texto });
  } catch {
    return json({ error: 'interno' }, 502);
  }
}
