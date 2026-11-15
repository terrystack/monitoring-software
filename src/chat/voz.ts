// Voz del Agente AYNI: Gemini TTS (/api/tts); Whisper + dictado (AYNI_FUSION.md §8.4).

let audioActual: HTMLAudioElement | null = null;
let urlActual: string | null = null;
let generacion = 0;
let abortActual: AbortController | null = null;

function liberarAudioGemini(): void {
  if (audioActual) {
    audioActual.pause();
    audioActual.src = '';
    audioActual = null;
  }
  if (urlActual) {
    URL.revokeObjectURL(urlActual);
    urlActual = null;
  }
}

export function puedeHablar(): boolean {
  return typeof window !== 'undefined';
}

/** Quita marcas de formato para que no se lean en voz alta. */
export function textoParaVoz(texto: string): string {
  return texto
    .replace(/[*_#`>|]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function base64ABlob(b64: string, mediaType: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mediaType });
}

async function obtenerAudioGemini(
  texto: string,
  idioma: 'es' | 'en',
  signal: AbortSignal,
): Promise<Blob | null> {
  try {
    const r = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texto, idioma }),
      signal,
    });
    if (!r.ok) return null;
    const datos = (await r.json()) as { audio?: string; mediaType?: string };
    if (!datos.audio) return null;
    return base64ABlob(datos.audio, datos.mediaType || 'audio/wav');
  } catch {
    return null;
  }
}

function reproducirBlob(blob: Blob, id: number, alTerminar?: () => void): void {
  liberarAudioGemini();
  urlActual = URL.createObjectURL(blob);
  const audio = new Audio(urlActual);
  audioActual = audio;
  audio.onended = () => {
    if (id === generacion) alTerminar?.();
  };
  audio.onerror = () => {
    if (id === generacion) alTerminar?.();
  };
  void audio.play().catch(() => {
    if (id === generacion) alTerminar?.();
  });
}

/** Solo Gemini TTS (`POST /api/tts`). Sin voz del navegador. */
export function hablar(texto: string, idioma: 'es' | 'en', alTerminar?: () => void): void {
  const limpio = textoParaVoz(texto);
  if (!limpio) {
    alTerminar?.();
    return;
  }
  detenerVoz();
  const id = ++generacion;
  const control = new AbortController();
  abortActual = control;

  void obtenerAudioGemini(limpio, idioma, control.signal).then((blob) => {
    if (id !== generacion) return;
    if (!blob) {
      alTerminar?.();
      return;
    }
    reproducirBlob(blob, id, alTerminar);
  });
}

export function detenerVoz(): void {
  generacion += 1;
  abortActual?.abort();
  abortActual = null;
  liberarAudioGemini();
}

interface ReconocimientoVoz {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

function constructorDictado(): (new () => ReconocimientoVoz) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => ReconocimientoVoz)
    | undefined;
}

function puedeGrabar(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export function puedeDictar(): boolean {
  return puedeGrabar() || constructorDictado() !== undefined;
}

function iniciarDictadoNavegador(
  idioma: 'es' | 'en',
  alTexto: (texto: string) => void,
  alTerminar: () => void,
): () => void {
  const Dictado = constructorDictado();
  if (!Dictado) return () => undefined;
  const r = new Dictado();
  r.lang = idioma === 'es' ? 'es-419' : 'en-US';
  r.interimResults = true;
  r.continuous = false;
  r.onresult = (e) => {
    const texto = Array.from(e.results)
      .map((res) => res[0]?.transcript ?? '')
      .join(' ');
    alTexto(texto.trim());
  };
  r.onend = alTerminar;
  r.onerror = alTerminar;
  r.start();
  return () => r.stop();
}

async function transcribirWhisper(blob: Blob, idioma: 'es' | 'en'): Promise<string | null> {
  const form = new FormData();
  form.append('file', blob, 'dictado.webm');
  form.append('language', idioma);
  try {
    const r = await fetch('/api/stt', { method: 'POST', body: form });
    if (!r.ok) return null;
    const datos = (await r.json()) as { texto?: string };
    return (datos.texto ?? '').trim() || null;
  } catch {
    return null;
  }
}

function mimeGrabacion(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  return '';
}

/**
 * Preferencia: grabar + Whisper (`/api/stt`). Si no hay grabación o falla → dictado del navegador.
 */
export function iniciarDictado(
  idioma: 'es' | 'en',
  alTexto: (texto: string) => void,
  alTerminar: () => void,
  alEstado?: (estado: 'grabando' | 'transcribiendo' | 'listo') => void,
  alError?: () => void,
): () => void {
  if (!puedeGrabar()) {
    return iniciarDictadoNavegador(idioma, alTexto, alTerminar);
  }

  let activo = true;
  let grabadora: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let detenerRespaldo: (() => void) | null = null;
  const trozos: Blob[] = [];

  const limpiarStream = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  const caerAlNavegador = () => {
    limpiarStream();
    if (!activo) {
      alTerminar();
      return;
    }
    if (constructorDictado()) {
      detenerRespaldo = iniciarDictadoNavegador(idioma, alTexto, alTerminar);
      return;
    }
    alError?.();
    alTerminar();
  };

  void (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!activo) {
        limpiarStream();
        return;
      }
      const mime = mimeGrabacion();
      grabadora = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      grabadora.ondataavailable = (e) => {
        if (e.data.size > 0) trozos.push(e.data);
      };
      grabadora.onstop = () => {
        limpiarStream();
        if (!activo) {
          alTerminar();
          return;
        }
        const blob = new Blob(trozos, { type: grabadora?.mimeType || 'audio/webm' });
        if (blob.size === 0) {
          caerAlNavegador();
          return;
        }
        alEstado?.('transcribiendo');
        void transcribirWhisper(blob, idioma).then((texto) => {
          if (!activo) {
            alTerminar();
            return;
          }
          if (texto) {
            alTexto(texto);
            alEstado?.('listo');
            alTerminar();
            return;
          }
          caerAlNavegador();
        });
      };
      alEstado?.('grabando');
      grabadora.start();
    } catch {
      caerAlNavegador();
    }
  })();

  return () => {
    if (detenerRespaldo) {
      detenerRespaldo();
      detenerRespaldo = null;
      return;
    }
    if (!activo) return;
    if (grabadora && grabadora.state !== 'inactive') {
      grabadora.stop();
      return;
    }
    activo = false;
    limpiarStream();
    alTerminar();
  };
}
