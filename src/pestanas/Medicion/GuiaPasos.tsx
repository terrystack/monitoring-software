import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { ConfigAyni, Dispositivo } from '../../config/esquemas';
import { useMovimientoReducido } from '../../escena3d/calidad';
import { useAyni } from '../../estado/store';

interface Props {
  config: ConfigAyni;
  dispositivo: Dispositivo;
}

/** Pasos de la guía con el activo abierto, su error común y la navegación (§7.2). */
export function GuiaPasos({ config, dispositivo }: Props) {
  const paso = useAyni((s) => s.pasoDispositivo);
  const repeticion = useAyni((s) => s.repeticionPaso);
  const { setPasoDispositivo, setSensorSeleccionado, repetirPaso } = useAyni.getState();
  const reducido = useMovimientoReducido();
  const { textos } = config.escena;
  const total = dispositivo.pasos.length;
  const actual = Math.min(paso, total - 1);
  const pasoActual = dispositivo.pasos[actual];
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    if (pasoActual?.animacion !== 'medir') return;
    if (reducido) {
      setProgreso(100);
      return;
    }
    const inicio = performance.now();
    let marco = requestAnimationFrame(function avanzar(ahora) {
      const p = Math.min(100, ((ahora - inicio) / pasoActual.duracionMs) * 100);
      setProgreso(p);
      if (p < 100) marco = requestAnimationFrame(avanzar);
    });
    return () => cancelAnimationFrame(marco);
  }, [actual, repeticion, pasoActual, reducido]);

  const ir = (i: number) => {
    setSensorSeleccionado(null);
    setPasoDispositivo(Math.max(0, Math.min(total - 1, i)));
  };

  const verResultado = () => {
    const s = useAyni.getState();
    if (pasoActual?.resaltarZona) s.seleccionarZona(pasoActual.resaltarZona);
    s.setPestana('cuerpo3d');
  };

  return (
    <section aria-labelledby="guia-titulo" className="panel flex flex-col px-4 py-3.5">
      <h2 id="guia-titulo" className="text-[0.92rem] font-semibold text-tinta">
        {textos.guiaDispositivo}
      </h2>
      <ol className="mt-2.5 flex flex-col gap-1.5">
        {dispositivo.pasos.map((p, i) => {
          const activo = i === actual;
          return (
            <li key={p.texto}>
              <button
                type="button"
                aria-current={activo ? 'step' : undefined}
                onClick={() => ir(i)}
                className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors ${
                  activo ? 'border-acento/60 bg-acento/10' : 'border-transparent hover:bg-white/5'
                }`}
              >
                <span className="w-4 shrink-0 font-semibold tabular-nums text-acento">{i + 1}</span>
                <span
                  className={`text-[0.82rem] leading-snug ${activo ? 'text-tinta' : 'text-tinta-suave'}`}
                >
                  {p.texto}
                </span>
              </button>
              {activo && p.animacion === 'medir' && (
                <div className="mx-3 mt-2">
                  <p className="text-[0.72rem] text-tinta-tenue">{textos.midiendo}</p>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progreso)}
                    aria-label={textos.midiendo}
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-linea/60"
                  >
                    <div
                      className="h-full rounded-full bg-acento"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                </div>
              )}
              {activo && p.error && (
                <p className="mx-3 mt-2 flex gap-2 rounded-md border border-estado-atencion/50 bg-estado-atencion/[0.08] px-3 py-2 text-[0.8rem] leading-snug text-tinta">
                  <AlertTriangle
                    size={14}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-estado-atencion"
                  />
                  <span>
                    <span className="font-semibold text-estado-atencion">
                      {textos.errorComun}:{' '}
                    </span>
                    {p.error}
                  </span>
                </p>
              )}
              {activo && p.animacion === 'mostrar_resultado' && (
                <button
                  type="button"
                  onClick={verResultado}
                  className="mx-3 mt-2 rounded-md border border-acento/60 bg-acento/15 px-3 py-1.5 text-[0.82rem] font-semibold text-tinta hover:bg-acento/25"
                >
                  {textos.verEnElCuerpo}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex gap-2 border-t border-linea/60 pt-3">
        <button
          type="button"
          onClick={() => ir(actual - 1)}
          disabled={actual === 0}
          className="flex items-center gap-1.5 rounded-md border border-linea px-3 py-1.5 text-[0.82rem] text-tinta disabled:opacity-40"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          {textos.anterior}
        </button>
        <button
          type="button"
          onClick={repetirPaso}
          className="flex items-center gap-1.5 rounded-md border border-linea px-3 py-1.5 text-[0.82rem] text-tinta"
        >
          <RotateCcw size={14} aria-hidden="true" />
          {textos.repetirPaso}
        </button>
        <button
          type="button"
          onClick={() => ir(actual + 1)}
          disabled={actual === total - 1}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-acento/60 bg-acento/15 px-3 py-1.5 text-[0.82rem] font-semibold text-tinta disabled:opacity-40"
        >
          {textos.siguientePaso}
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
