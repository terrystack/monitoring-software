import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ConfigAyni } from '../config/esquemas';
import { diaMision, type Seleccion } from '../estado/seleccion';
import { useAyni } from '../estado/store';
import { conUnidad, numero } from '../motor/frases';
import { Interruptor } from '../ui/Interruptor';
import { iniciales, plantilla } from '../ui/textos';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

/** Panel deslizante del avatar (sección 9): tripulante, entorno, modo demo, línea base y accesibilidad. */
export function PanelPerfil({ config, seleccion }: Props) {
  const abierto = useAyni((s) => s.perfilAbierto);
  const setAbierto = useAyni((s) => s.setPerfilAbierto);
  const panel = useRef<HTMLDivElement>(null);
  const origen = useRef<Element | null>(null);

  useEffect(() => {
    if (!abierto) return;
    origen.current = document.activeElement;
    panel.current?.querySelector<HTMLElement>('button, select, input')?.focus();
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
      if (e.key !== 'Tab' || !panel.current) return;
      const focos = panel.current.querySelectorAll<HTMLElement>('button, select, input, a[href]');
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', alPulsar);
    return () => {
      document.removeEventListener('keydown', alPulsar);
      (origen.current as HTMLElement | null)?.focus?.();
    };
  }, [abierto, setAbierto]);

  if (!abierto) return null;
  const { textos } = config.escena;
  const tripulante = config.tripulantes.tripulantes.find((t) => t.id === seleccion.tripulanteId);
  const entorno = config.entornos.find((e) => e.id === seleccion.entornoId);

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-fondo-profundo/60"
        onClick={() => setAbierto(false)}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${textos.perfil}: ${tripulante?.nombre ?? ''}`}
        className="panel relative flex h-full w-[min(100%,24rem)] flex-col overflow-y-auto rounded-none border-y-0 border-r-0 shadow-[-16px_0_40px_rgb(0_0_0/0.45)]"
      >
        <header className="flex items-start gap-3 border-b border-linea/70 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-acento/50 bg-acento/10 text-lg font-semibold">
            {iniciales(tripulante?.nombre ?? '')}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="perfil-titulo" className="text-[1.1rem] font-semibold leading-tight text-tinta">
              {tripulante?.nombre}
            </h2>
            <p className="mt-0.5 text-[0.84rem] text-tinta-suave">
              {tripulante?.rol} ·{' '}
              <span className="tabular-nums">
                {plantilla(textos.diaMision, { dia: diaMision(config, seleccion) })}
              </span>{' '}
              · {entorno?.nombre}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label={textos.cerrar}
            className="grid h-8 w-8 place-items-center rounded-md text-tinta-suave hover:bg-white/5 hover:text-tinta"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="flex flex-col gap-7 p-5">
          <Tripulantes config={config} seleccion={seleccion} />
          <Entorno config={config} seleccion={seleccion} />
          <ModoDemo config={config} seleccion={seleccion} />
          <LineaBase config={config} />
          <Accesibilidad config={config} />
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="rotulo">{titulo}</h3>
      {children}
    </section>
  );
}

function Tripulantes({ config, seleccion }: Props) {
  const setTripulante = useAyni((s) => s.setTripulante);
  return (
    <Seccion titulo={config.escena.textos.tripulante}>
      <div
        role="radiogroup"
        aria-label={config.escena.textos.tripulante}
        className="flex flex-col gap-1"
      >
        {config.tripulantes.tripulantes.map((t) => {
          const activo = t.id === seleccion.tripulanteId;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => setTripulante(t.id)}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                activo ? 'border-acento/60 bg-acento/10' : 'border-transparent hover:bg-white/5'
              }`}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full border border-linea text-[0.8rem] font-semibold">
                {iniciales(t.nombre)}
              </span>
              <span className="flex flex-col">
                <span className="text-[0.9rem] text-tinta">{t.nombre}</span>
                <span className="text-[0.78rem] text-tinta-tenue">{t.rol}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Seccion>
  );
}

function Entorno({ config, seleccion }: Props) {
  const setEntorno = useAyni((s) => s.setEntorno);
  const entorno = config.entornos.find((e) => e.id === seleccion.entornoId);
  return (
    <Seccion titulo={config.escena.textos.entorno}>
      <select
        value={seleccion.entornoId}
        onChange={(e) => setEntorno(e.target.value)}
        aria-label={config.escena.textos.entorno}
        className="rounded-md border border-linea bg-fondo-profundo px-3 py-2 text-[0.9rem] text-tinta"
      >
        {config.entornos.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </select>
      {entorno && (
        <ul className="list-disc space-y-0.5 pl-5 text-[0.82rem] text-tinta-suave">
          {entorno.riesgosDestacados.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

function ModoDemo({ config, seleccion }: Props) {
  const elegirEscenario = useAyni((s) => s.elegirEscenario);
  const setDia = useAyni((s) => s.setDia);
  const { textos } = config.escena;
  const dias = config.tripulantes.generador.dias;
  const cambiarDia = (d: number) => setDia(Math.min(dias, Math.max(1, d)));

  return (
    <Seccion titulo={textos.modoDemo}>
      <p className="text-[0.8rem] text-tinta-tenue">{textos.escenario}</p>
      <div className="flex flex-col gap-1">
        {config.escenarios.map((e) => {
          const activo = e.tripulanteId === seleccion.tripulanteId && e.diaDemo === seleccion.dia;
          return (
            <button
              key={e.id}
              type="button"
              aria-pressed={activo}
              onClick={() => elegirEscenario(e.tripulanteId, e.diaDemo)}
              className={`rounded-md border px-3 py-2 text-left transition-colors ${
                activo ? 'border-acento/60 bg-acento/10' : 'border-transparent hover:bg-white/5'
              }`}
            >
              <span className="block text-[0.88rem] text-tinta">{e.nombre}</span>
              <span className="block text-[0.78rem] leading-snug text-tinta-tenue">
                {e.descripcion}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => cambiarDia(seleccion.dia - 1)}
          disabled={seleccion.dia <= 1}
          aria-label={textos.diaAnterior}
          className="grid h-8 w-8 place-items-center rounded-md border border-linea text-tinta-suave hover:text-tinta disabled:opacity-40"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <label className="flex flex-1 flex-col gap-1">
          <span className="flex justify-between text-[0.8rem] text-tinta-suave">
            <span>{textos.diaDatos}</span>
            <span className="tabular-nums text-tinta">
              {seleccion.dia} · {plantilla(textos.diaMision, { dia: diaMision(config, seleccion) })}
            </span>
          </span>
          <input
            type="range"
            min={1}
            max={dias}
            value={seleccion.dia}
            onChange={(e) => cambiarDia(Number(e.target.value))}
            className="accent-acento"
          />
        </label>
        <button
          type="button"
          onClick={() => cambiarDia(seleccion.dia + 1)}
          disabled={seleccion.dia >= dias}
          aria-label={textos.diaSiguiente}
          className="grid h-8 w-8 place-items-center rounded-md border border-linea text-tinta-suave hover:text-tinta disabled:opacity-40"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </Seccion>
  );
}

function LineaBase({ config }: { config: ConfigAyni }) {
  const indicadores = useAyni((s) => s.motor?.indicadores);
  const { textos } = config.escena;
  const conLineaBase = config.indicadores.filter((i) =>
    i.reglas.some((r) => r.tipo === 'linea_base'),
  );
  return (
    <Seccion titulo={textos.lineaBase}>
      <dl className="divide-y divide-linea/50 text-[0.84rem]">
        {conLineaBase.map((i) => {
          const lb = indicadores?.[i.id]?.lineaBase;
          return (
            <div key={i.id} className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="text-tinta-suave">{i.nombre}</dt>
              <dd className="whitespace-nowrap tabular-nums text-tinta">
                {lb
                  ? `${numero(lb.min, config.frases)}–${conUnidad(lb.max, i.unidad, config.frases)}`
                  : textos.sinLineaBase}
              </dd>
            </div>
          );
        })}
      </dl>
    </Seccion>
  );
}

function Accesibilidad({ config }: { config: ConfigAyni }) {
  const textoGrande = useAyni((s) => s.textoGrande);
  const altoContraste = useAyni((s) => s.altoContraste);
  const movimientoReducido = useAyni((s) => s.movimientoReducido);
  const { setTextoGrande, setAltoContraste, setMovimientoReducido } = useAyni.getState();
  const { textos } = config.escena;
  return (
    <Seccion titulo={textos.accesibilidad}>
      <Interruptor etiqueta={textos.textoGrande} activo={textoGrande} alCambiar={setTextoGrande} />
      <Interruptor
        etiqueta={textos.altoContraste}
        activo={altoContraste}
        alCambiar={setAltoContraste}
      />
      <Interruptor
        etiqueta={textos.movimientoReducido}
        activo={movimientoReducido}
        alCambiar={setMovimientoReducido}
      />
    </Seccion>
  );
}
