import { useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { ConfigAyni } from '../config/esquemas';
import type { Seleccion } from '../estado/seleccion';
import { useAyni } from '../estado/store';
import { EntradaChat } from './EntradaChat';
import { Mensaje } from './Mensaje';
import { useAgente } from './useAgente';
import { detenerVoz, puedeHablar } from './voz';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

/** Conversación con el Agente HANAN PACHA: bienvenida, sugerencias, mensajes y entrada. */
export function PanelChat({ config, seleccion }: Props) {
  const chat = useAyni((s) => s.chat);
  const vozActiva = useAyni((s) => s.vozActiva);
  const { setVozActiva } = useAyni.getState();
  const { enviar, pensando } = useAgente(config, seleccion);
  const { textos, preguntasSugeridas } = config.escena;
  const final = useRef<HTMLLIElement>(null);

  useEffect(() => {
    final.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [chat.length, pensando]);

  return (
    <section
      aria-labelledby="chat-titulo"
      className="panel flex h-full min-h-0 flex-col rounded-none border-y-0 border-l-0 lg:rounded-none"
    >
      <header className="flex items-center gap-3 border-b border-linea/60 px-4 py-3">
        <h2 id="chat-titulo" className="text-[1.05rem] font-semibold text-tinta">
          {textos.pestanaAgente}
        </h2>
        {puedeHablar() && (
          <button
            type="button"
            aria-pressed={vozActiva}
            onClick={() => {
              if (vozActiva) detenerVoz();
              setVozActiva(!vozActiva);
            }}
            className={`ml-auto flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[0.8rem] transition-colors ${
              vozActiva
                ? 'border-acento/60 bg-acento/15 text-tinta'
                : 'border-linea text-tinta-suave hover:text-tinta'
            }`}
          >
            {vozActiva ? (
              <Volume2 size={14} aria-hidden="true" />
            ) : (
              <VolumeX size={14} aria-hidden="true" />
            )}
            {textos.leerEnVoz}
          </button>
        )}
        {puedeHablar() && (
          <button
            type="button"
            onClick={detenerVoz}
            className="rounded-md px-2 py-1 text-[0.8rem] text-tinta-suave hover:text-tinta"
          >
            {textos.detenerVoz}
          </button>
        )}
      </header>

      <ol
        aria-label={textos.conversacion}
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
      >
        <li className="flex flex-col items-start gap-2">
          <p className="max-w-[92%] rounded-lg border border-linea/70 bg-fondo-profundo/60 px-3.5 py-2.5 text-[0.9rem] leading-relaxed text-tinta">
            {textos.agenteBienvenida}
          </p>
          {chat.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {preguntasSugeridas.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={pensando}
                  onClick={() => void enviar(p)}
                  className="rounded-md border border-linea px-2.5 py-1.5 text-left text-[0.82rem] text-tinta-suave transition-colors hover:border-acento/60 hover:text-tinta disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </li>
        {chat.map((m) => (
          <Mensaje
            key={m.id}
            mensaje={m}
            config={config}
            deshabilitado={pensando}
            alResponder={(t) => void enviar(t)}
          />
        ))}
        {pensando && (
          <li className="text-[0.84rem] text-tinta-tenue" role="status">
            {textos.pensando}
          </li>
        )}
        <li ref={final} aria-hidden="true" />
      </ol>

      <EntradaChat config={config} pensando={pensando} alEnviar={(t, img) => void enviar(t, img)} />
    </section>
  );
}
