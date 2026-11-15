import { useEffect, useRef, type PointerEvent as EventoPuntero } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ConfigAyni } from '../../config/esquemas';
import {
  combinarEntrada,
  SesionPvt,
  type EntradaPvt,
  type IntentoPvt,
} from '../../evaluaciones/pvt';
import { plantilla } from '../../ui/textos';

interface Props {
  config: ConfigAyni;
  onFin: (intentos: IntentoPvt[], entrada: EntradaPvt) => void;
  onSalir: () => void;
}

/** Tiempo del evento en el mismo reloj que performance.now() (y que requestAnimationFrame). */
const instante = (e: { timeStamp: number }) => (e.timeStamp > 0 ? e.timeStamp : performance.now());

/**
 * La prueba a pantalla completa. El bucle de cuadros enciende la casilla y escribe el contador
 * directamente en el DOM (sin pasar por React) para que el estímulo cuente desde el cuadro en
 * que se pinta; la respuesta toma el `timeStamp` del evento de teclado o puntero.
 */
export function PruebaPvt({ config, onFin, onSalir }: Props) {
  const p = config.evaluaciones.pvt;
  const t = config.evaluaciones.textos;
  const celdas = useRef<(HTMLDivElement | null)[]>([]);
  const contadores = useRef<(HTMLSpanElement | null)[]>([]);
  const restante = useRef<HTMLSpanElement>(null);
  const sesion = useRef<SesionPvt | null>(null);
  const entradas = useRef(new Set<Exclude<EntradaPvt, 'mixta'>>());
  const callbacks = useRef({ onFin });
  callbacks.current = { onFin };

  useEffect(() => {
    const s = new SesionPvt(p);
    sesion.current = s;
    let encendida: number | null = null;
    let ultimoTexto = '';
    let segundos = -1;
    let cuadro = 0;

    const pintar = (ahora: number) => {
      const fase = s.avanzar(ahora);
      if (s.celda !== encendida) {
        if (encendida !== null) {
          celdas.current[encendida]?.removeAttribute('data-on');
          const c = contadores.current[encendida];
          if (c) c.textContent = '';
        }
        if (s.celda !== null) celdas.current[s.celda]?.setAttribute('data-on', '1');
        encendida = s.celda;
        ultimoTexto = '';
      }
      if (encendida !== null) {
        const valor = s.contador(ahora);
        const texto = valor === null ? '' : String(valor);
        if (texto !== ultimoTexto) {
          const c = contadores.current[encendida];
          if (c) c.textContent = texto;
          ultimoTexto = texto;
        }
      }
      const seg = Math.ceil(s.restanteMs(ahora) / 1000);
      if (seg !== segundos && restante.current) {
        restante.current.textContent = plantilla(t.tiempoRestante, { s: seg });
        segundos = seg;
      }
      if (fase === 'fin') {
        callbacks.current.onFin([...s.intentos], combinarEntrada(entradas.current));
        return;
      }
      cuadro = requestAnimationFrame(pintar);
    };

    cuadro = requestAnimationFrame((ahora) => {
      s.iniciar(ahora);
      pintar(ahora);
    });

    const alPulsarTecla = (e: KeyboardEvent) => {
      if (e.repeat || e.key.toLowerCase() !== p.tecla.toLowerCase()) return;
      e.preventDefault();
      entradas.current.add('teclado');
      s.pulsar(instante(e));
    };
    window.addEventListener('keydown', alPulsarTecla);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener('keydown', alPulsarTecla);
    };
    // La prueba se monta una sola vez por sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alTocar = (e: EventoPuntero<HTMLDivElement>) => {
    if (e.button > 0) return;
    e.preventDefault();
    const s = sesion.current;
    if (!s) return;
    const celda = (e.target as HTMLElement).closest<HTMLElement>('[data-celda]');
    entradas.current.add(e.pointerType === 'mouse' ? 'raton' : 'tactil');
    s.pulsar(instante(e), celda ? Number(celda.dataset.celda) : null);
  };

  const total = p.filas * p.columnas;

  // En un portal sobre todo lo demás: si el navegador no da pantalla completa, igual tapa la UI.
  return createPortal(
    <div
      role="application"
      aria-label={t.instruccionPrueba}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-fondo-profundo p-4"
    >
      <div className="flex w-full max-w-[min(82vh,92vw)] items-center justify-between gap-3 text-[0.82rem] text-tinta-tenue">
        <p>{t.instruccionPrueba}</p>
        <span ref={restante} className="tabular-nums" aria-hidden="true" />
      </div>
      <div
        onPointerDown={alTocar}
        onContextMenu={(e) => e.preventDefault()}
        className="grid aspect-square w-full max-w-[min(82vh,92vw)] border border-linea"
        style={{
          gridTemplateColumns: `repeat(${p.columnas}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${p.filas}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            data-celda={i}
            ref={(el) => {
              celdas.current[i] = el;
            }}
            className="celda-pvt"
          >
            <span
              ref={(el) => {
                contadores.current[i] = el;
              }}
              className="text-[clamp(0.7rem,2.2vmin,1.25rem)] font-semibold tabular-nums"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onSalir}
        className="flex items-center gap-1.5 rounded-md border border-linea px-3 py-1.5 text-[0.8rem] text-tinta-suave hover:border-tinta-tenue hover:text-tinta"
      >
        <X size={14} aria-hidden="true" />
        {t.salirPrueba}
      </button>
    </div>,
    document.body,
  );
}
