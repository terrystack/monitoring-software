import { useEffect, useRef, useState } from 'react';
import { Focus, Layers } from 'lucide-react';
import type { ConfigEscena, ModoCapa } from '../../config/esquemas';
import { useAyni } from '../../estado/store';

interface Props {
  escena: ConfigEscena;
}

const MODOS: ModoCapa[] = ['visible', 'translucida', 'oculta'];

/** Selector de capas (5.3, punto 2): cada capa visible, semitransparente u oculta, y vista frontal. */
export function ControlCapas({ escena }: Props) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const modoCapa = useAyni((s) => s.modoCapa);
  const { setModoCapa, vistaFrontal } = useAyni.getState();
  const capas = [...escena.capas].sort((a, b) => a.orden - b.orden);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setAbierto(false);
    };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', escape, true);
    };
  }, [abierto]);

  return (
    <div ref={raiz} className="relative">
      {abierto && (
        <div
          id="menu-capas"
          className="panel absolute bottom-12 left-1/2 w-[22rem] -translate-x-1/2 p-3 shadow-[0_12px_32px_rgb(0_0_0/0.45)]"
        >
          <p className="rotulo mb-2">{escena.textos.capas}</p>
          <ul className="flex flex-col gap-1.5">
            {capas.map((capa) => (
              <li key={capa.id} className="flex items-center justify-between gap-3">
                <span className="text-[0.86rem] text-tinta">{capa.nombre}</span>
                <div
                  role="radiogroup"
                  aria-label={capa.nombre}
                  className="flex overflow-hidden rounded-md border border-linea text-[0.72rem]"
                >
                  {MODOS.map((modo) => {
                    const activo = modoCapa[capa.id] === modo;
                    return (
                      <button
                        key={modo}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => setModoCapa(capa.id, modo)}
                        className={`px-2 py-1 transition-colors ${
                          activo ? 'bg-acento/20 text-tinta' : 'text-tinta-tenue hover:text-tinta'
                        }`}
                      >
                        {escena.modosCapa.find((m) => m.id === modo)?.etiqueta}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="panel flex items-center gap-1 p-1">
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls="menu-capas"
          onClick={() => setAbierto((v) => !v)}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[0.82rem] transition-colors ${
            abierto ? 'bg-acento/15 text-tinta' : 'text-tinta-suave hover:text-tinta'
          }`}
        >
          <Layers size={15} aria-hidden="true" />
          {escena.textos.capas}
        </button>
        <span aria-hidden="true" className="h-5 w-px bg-linea" />
        <button
          type="button"
          onClick={vistaFrontal}
          className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-[0.82rem] text-tinta-suave transition-colors hover:text-tinta"
        >
          <Focus size={15} aria-hidden="true" />
          {escena.textos.vistaFrontal}
        </button>
      </div>
    </div>
  );
}
