import { useRef, type KeyboardEvent } from 'react';
import { Boxes, Combine } from 'lucide-react';
import type { ConfigAyni } from '../../config/esquemas';
import { dispositivosConSensores } from '../../escena3d/dispositivo/estadoSensor';
import { useAyni } from '../../estado/store';

interface Props {
  config: ConfigAyni;
  activo: string;
}

/** Pestañas internas de la escena: PUMA · Arnés ECG · Diadema EEG, y el botón de despiece. */
export function SelectorDispositivo({ config, activo }: Props) {
  const despiece = useAyni((s) => s.despiece);
  const { setDispositivoActivo, setDespiece } = useAyni.getState();
  const { textos } = config.escena;
  const lista = dispositivosConSensores(config);
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  const alTeclado = (e: KeyboardEvent, i: number) => {
    const n = lista.length;
    const destino =
      e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : null;
    if (destino === null) return;
    e.preventDefault();
    setDispositivoActivo(lista[destino].id);
    botones.current[destino]?.focus();
  };

  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-wrap items-start justify-between gap-2">
      <div
        role="tablist"
        aria-label={textos.dispositivos}
        className="pointer-events-auto flex gap-1 rounded-lg border border-linea/60 bg-fondo-profundo/80 p-1 backdrop-blur"
      >
        {lista.map((d, i) => {
          const sel = d.id === activo;
          return (
            <button
              key={d.id}
              ref={(el) => (botones.current[i] = el)}
              type="button"
              role="tab"
              aria-selected={sel}
              tabIndex={sel ? 0 : -1}
              onClick={() => setDispositivoActivo(d.id)}
              onKeyDown={(e) => alTeclado(e, i)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[0.8rem] font-semibold transition-colors ${
                sel ? 'bg-acento/20 text-tinta' : 'text-tinta-suave hover:text-tinta'
              }`}
            >
              {d.nombre.split(' · ')[0]}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-pressed={despiece}
        onClick={() => setDespiece(!despiece)}
        className={`pointer-events-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.8rem] font-semibold backdrop-blur transition-colors ${
          despiece
            ? 'border-acento bg-acento/20 text-tinta'
            : 'border-linea/60 bg-fondo-profundo/80 text-tinta-suave hover:text-tinta'
        }`}
      >
        {despiece ? (
          <Combine size={15} aria-hidden="true" />
        ) : (
          <Boxes size={15} aria-hidden="true" />
        )}
        {despiece ? textos.armar : textos.verPiezas}
      </button>
    </div>
  );
}
