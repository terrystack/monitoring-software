import { useRef, type KeyboardEvent } from 'react';
import type { ConfigEscena } from '../config/esquemas';
import { useAyni, type Pestana } from '../estado/store';

interface Props {
  textos: ConfigEscena['textos'];
}

/** Las cinco pestañas (AYNI_FUSION.md §4.3), operables con flechas, Inicio y Fin. */
export function Navegacion({ textos }: Props) {
  const pestana = useAyni((s) => s.pestana);
  const setPestana = useAyni((s) => s.setPestana);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const pestanas: { id: Pestana; nombre: string }[] = [
    { id: 'cuerpo3d', nombre: textos.pestanaCuerpo },
    { id: 'monitoreo', nombre: textos.pestanaMonitoreo },
    { id: 'medicion', nombre: textos.pestanaMedicion },
    { id: 'evaluaciones', nombre: textos.pestanaEvaluaciones },
    { id: 'agente', nombre: textos.pestanaAgente },
  ];

  const alPulsar = (e: KeyboardEvent, i: number) => {
    const destino =
      e.key === 'ArrowRight'
        ? (i + 1) % pestanas.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + pestanas.length) % pestanas.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? pestanas.length - 1
              : null;
    if (destino === null) return;
    e.preventDefault();
    setPestana(pestanas[destino].id);
    botones.current[destino]?.focus();
  };

  return (
    <nav aria-label={textos.secciones} className="h-full">
      <div role="tablist" aria-label={textos.secciones} className="flex h-full items-stretch gap-1">
        {pestanas.map((p, i) => {
          const activa = p.id === pestana;
          return (
            <button
              key={p.id}
              ref={(el) => {
                botones.current[i] = el;
              }}
              id={`pestana-${p.id}`}
              type="button"
              role="tab"
              aria-selected={activa}
              aria-controls={`panel-${p.id}`}
              tabIndex={activa ? 0 : -1}
              onClick={() => setPestana(p.id)}
              onKeyDown={(e) => alPulsar(e, i)}
              className={`relative whitespace-nowrap px-3 text-[0.9rem] transition-colors duration-200 ${
                activa ? 'font-semibold text-tinta' : 'text-tinta-suave hover:text-tinta'
              }`}
            >
              {p.nombre}
              <span
                aria-hidden="true"
                className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-acento transition-opacity duration-200 ${
                  activa ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
