import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { Mic, Paperclip, SendHorizontal, Square, X } from 'lucide-react';
import type { ConfigAyni } from '../config/esquemas';
import { useAyni } from '../estado/store';
import { ImagenNoValida, prepararImagen, urlDeImagen } from './imagen';
import type { ImagenAdjunta } from './tipos';
import { iniciarDictado, puedeDictar } from './voz';

interface Props {
  config: ConfigAyni;
  pensando: boolean;
  alEnviar: (texto: string, imagen?: ImagenAdjunta) => void;
}

/** Texto, imagen (adjuntar, pegar o arrastrar), dictado y envío (AYNI_FUSION.md §8.2). */
export function EntradaChat({ config, pensando, alEnviar }: Props) {
  const { textos } = config.escena;
  const idioma = useAyni((s) => s.idioma);
  const borrador = useAyni((s) => s.borradorAgente);
  const [texto, setTexto] = useState('');
  const [imagen, setImagen] = useState<ImagenAdjunta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dictando, setDictando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const detenerDictado = useRef<() => void>(() => undefined);
  const archivo = useRef<HTMLInputElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!borrador) return;
    setTexto(borrador);
    useAyni.getState().setBorradorAgente(null);
    campo.current?.focus();
  }, [borrador]);

  useEffect(() => () => detenerDictado.current(), []);

  const adjuntar = async (f: File | undefined | null) => {
    if (!f) return;
    try {
      setImagen(await prepararImagen(f));
      setError(null);
    } catch (e) {
      setError(e instanceof ImagenNoValida ? textos.imagenNoValida : textos.imagenNoValida);
    }
  };

  const enviar = () => {
    if (pensando || (!texto.trim() && !imagen)) return;
    alEnviar(texto, imagen ?? undefined);
    setTexto('');
    setImagen(null);
  };

  const alternarDictado = () => {
    if (dictando || transcribiendo) {
      detenerDictado.current();
      return;
    }
    setError(null);
    setDictando(true);
    setTranscribiendo(false);
    detenerDictado.current = iniciarDictado(
      idioma,
      setTexto,
      () => {
        setDictando(false);
        setTranscribiendo(false);
      },
      (estado) => {
        if (estado === 'transcribiendo') {
          setDictando(false);
          setTranscribiendo(true);
        } else if (estado === 'grabando') {
          setDictando(true);
          setTranscribiendo(false);
        } else {
          setDictando(false);
          setTranscribiendo(false);
        }
      },
      () => setError(textos.dictadoError),
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
      onDragOver={(e: DragEvent) => e.preventDefault()}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        void adjuntar(e.dataTransfer.files[0]);
      }}
      className="border-t border-linea/60 p-3"
    >
      {error && (
        <p role="alert" className="mb-2 text-[0.8rem] text-estado-atencion">
          {error}
        </p>
      )}
      {imagen && (
        <div className="relative mb-2 inline-block">
          <img
            src={urlDeImagen(imagen)}
            alt=""
            className="h-20 rounded-md border border-linea/70 object-cover"
          />
          <button
            type="button"
            onClick={() => setImagen(null)}
            aria-label={textos.quitarImagen}
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-linea bg-fondo-profundo text-tinta-suave hover:text-tinta"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={archivo}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void adjuntar(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => archivo.current?.click()}
          aria-label={textos.adjuntarImagen}
          title={textos.adjuntarImagen}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-linea text-tinta-suave hover:text-tinta"
        >
          <Paperclip size={17} aria-hidden="true" />
        </button>
        {puedeDictar() && (
          <button
            type="button"
            onClick={alternarDictado}
            aria-pressed={dictando || transcribiendo}
            aria-label={transcribiendo ? textos.dictadoTranscribiendo : textos.dictar}
            title={transcribiendo ? textos.dictadoTranscribiendo : textos.dictar}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border transition-colors ${
              dictando || transcribiendo
                ? 'border-acento bg-acento/20 text-tinta'
                : 'border-linea text-tinta-suave hover:text-tinta'
            }`}
          >
            {dictando || transcribiendo ? (
              <Square size={14} aria-hidden="true" />
            ) : (
              <Mic size={17} aria-hidden="true" />
            )}
          </button>
        )}
        <label className="sr-only" htmlFor="pregunta-agente">
          {textos.escribeTuPregunta}
        </label>
        <textarea
          id="pregunta-agente"
          ref={campo}
          rows={1}
          value={texto}
          placeholder={textos.escribeTuPregunta}
          onChange={(e) => setTexto(e.target.value)}
          onPaste={(e: ClipboardEvent) => {
            const f = [...e.clipboardData.files].find((x) => x.type.startsWith('image/'));
            if (f) {
              e.preventDefault();
              void adjuntar(f);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-linea bg-fondo-profundo px-3 py-2 text-[0.9rem] text-tinta placeholder:text-tinta-tenue"
        />
        <button
          type="submit"
          disabled={pensando || (!texto.trim() && !imagen)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-md border border-acento/60 bg-acento/15 px-3.5 text-[0.88rem] font-semibold text-tinta transition-colors hover:bg-acento/25 disabled:opacity-50"
        >
          <SendHorizontal size={16} aria-hidden="true" />
          <span className="hidden sm:inline">{textos.enviar}</span>
          <span className="sr-only sm:hidden">{textos.enviar}</span>
        </button>
      </div>
    </form>
  );
}
