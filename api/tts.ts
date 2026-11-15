/** POST /api/tts · Gemini Text-to-speech (AYNI_FUSION.md §8.4). La clave vive solo aquí. */

const LIMITE_CHARS = 4000;
const MODELO = process.env.TTS_MODEL ?? 'gemini-3.8-flash-lite-tts';
const VOZ = process.env.TTS_VOICE ?? 'Kore';

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export async function POST(request: Request): Promise<Response> {
  const clave = process.env.GEMINI_API_KEY;
  if (!clave) return json({ error: 'tts no configurado' }, 502);

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const texto =
    typeof cuerpo === 'object' &&
    cuerpo &&
    'texto' in cuerpo &&
    typeof (cuerpo as { texto: unknown }).texto === 'string'
      ? (cuerpo as { texto: string }).texto.trim()
      : '';
  if (!texto) return json({ error: 'texto requerido' }, 400);
  if (texto.length > LIMITE_CHARS) return json({ error: 'texto demasiado largo' }, 413);

  const idioma =
    typeof cuerpo === 'object' &&
    cuerpo &&
    'idioma' in cuerpo &&
    ((cuerpo as { idioma: unknown }).idioma === 'es' ||
      (cuerpo as { idioma: unknown }).idioma === 'en')
      ? (cuerpo as { idioma: 'es' | 'en' }).idioma
      : undefined;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': clave,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: texto }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: VOZ },
            },
            ...(idioma ? { languageCode: idioma === 'es' ? 'es-ES' : 'en-US' } : {}),
          },
        },
      }),
    });
    if (!r.ok) {
      return json({ error: 'proveedor', detalle: (await r.text()).slice(0, 300) }, 502);
    }
    const datos = (await r.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };
    const inline = datos.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!inline?.data) return json({ error: 'sin audio' }, 502);
    return json({
      audio: inline.data,
      mediaType: inline.mimeType || 'audio/wav',
    });
  } catch {
    return json({ error: 'interno' }, 502);
  }
}
