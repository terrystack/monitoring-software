// Voz del Agente AYNI con la Web Speech API (AYNI_FUSION.md §8.4).

const PREFERENCIAS: Record<'es' | 'en', string[]> = {
  es: ['es-PE', 'es-419', 'es-US', 'es-MX', 'es'],
  en: ['en-US', 'en-GB', 'en'],
};

export function puedeHablar(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function elegirVoz(idioma: 'es' | 'en'): SpeechSynthesisVoice | undefined {
  const voces = window.speechSynthesis.getVoices();
  for (const pref of PREFERENCIAS[idioma]) {
    const voz = voces.find((v) => v.lang.toLowerCase().startsWith(pref.toLowerCase()));
    if (voz) return voz;
  }
  return undefined;
}

/** Quita marcas de formato para que no se lean en voz alta. */
export function textoParaVoz(texto: string): string {
  return texto
    .replace(/[*_#`>|]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hablar(texto: string, idioma: 'es' | 'en', alTerminar?: () => void): void {
  if (!puedeHablar()) return;
  window.speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(textoParaVoz(texto));
  frase.lang = PREFERENCIAS[idioma][0];
  const voz = elegirVoz(idioma);
  if (voz) frase.voice = voz;
  frase.rate = 1;
  frase.pitch = 1;
  frase.onend = () => alTerminar?.();
  frase.onerror = () => alTerminar?.();
  window.speechSynthesis.speak(frase);
}

export function detenerVoz(): void {
  if (puedeHablar()) window.speechSynthesis.cancel();
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
    (new () => ReconocimientoVoz) | undefined;
}

export function puedeDictar(): boolean {
  return constructorDictado() !== undefined;
}

/** Empieza a dictar; devuelve la función para detener. `alTexto` recibe el texto acumulado. */
export function iniciarDictado(
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
