import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ExternalLink, MessageCircle, X } from 'lucide-react';
import type { ConfigAyni } from '../../config/esquemas';
import { sensorParaIndicadores } from '../../escena3d/dispositivo/estadoSensor';
import type { Seleccion } from '../../estado/seleccion';
import { useAyni } from '../../estado/store';
import { IconoEstado } from '../../ui/IconoEstado';
import { plantilla } from '../../ui/textos';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

const TONO_AVISO = {
  atencion: 'border-estado-atencion/55 bg-estado-atencion/[0.08]',
  critico: 'border-estado-critico/60 bg-estado-critico/[0.1]',
} as const;

/** Cuerpo con scroll que se desvanece abajo mientras queda contenido por ver. */
function CuerpoDesplazable({ children }: { children: ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const [hayMas, setHayMas] = useState(false);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setHayMas(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    el.addEventListener('scroll', medir, { passive: true });
    return () => {
      observador.disconnect();
      el.removeEventListener('scroll', medir);
    };
  }, []);
  return (
    <div
      ref={caja}
      className={`flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4 pt-4 ${
        hayMas ? '[mask-image:linear-gradient(to_bottom,black_82%,transparent)]' : ''
      }`}
    >
      {children}
    </div>
  );
}

function Apartado({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-[0.82rem] font-semibold text-tinta-suave">{titulo}</h3>
      {children}
    </section>
  );
}

/**
 * Tarjeta de acción (6.1) leída como un procedimiento de a bordo: qué cambió, pasos que se
 * marcan al hacerlos, bloque de aviso al médico de vuelo, por qué pasa en el espacio y fuente.
 */
export function TarjetaAccion({ config, seleccion }: Props) {
  const zonaId = useAyni((s) => s.zonaSeleccionada);
  const tarjeta = useAyni((s) => (zonaId ? s.estadoCuerpo?.tarjetas[zonaId] : undefined));
  const pasosHechos = useAyni((s) => s.pasosHechos);
  const { seleccionarZona, alternarPaso, setPestana } = useAyni.getState();
  const { textos, estados } = config.escena;

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useAyni.getState().seleccionarZona(null);
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, []);

  if (!zonaId || !tarjeta) {
    return (
      <aside className="panel px-5 py-5">
        <p className="max-w-[30ch] text-[0.9rem] leading-relaxed text-tinta-suave">
          {textos.eligeZona}
        </p>
      </aside>
    );
  }

  const zona = config.zonas.find((z) => z.id === zonaId);
  const estado = estados.find((e) => e.id === tarjeta.estado);
  const fuera = tarjeta.estado === 'atencion' || tarjeta.estado === 'critico';
  const clavePaso = (i: number) => `${seleccion.tripulanteId}|${seleccion.dia}|${zonaId}|${i}`;

  return (
    <aside aria-labelledby="tarjeta-titulo" className="panel flex max-h-full min-h-0 flex-col">
      <CuerpoDesplazable key={zonaId}>
        <header className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="tarjeta-titulo"
              className="flex items-center gap-2.5 text-[1.5rem] font-semibold leading-tight text-tinta"
            >
              {estado && <IconoEstado estado={estado.id} color={estado.color} tamano={20} />}
              <span>
                {zona?.nombre}
                {estado && (
                  <>
                    <span className="text-tinta-tenue"> · </span>
                    <span style={{ color: estado.color }}>{estado.etiqueta}</span>
                  </>
                )}
              </span>
            </h2>
            <p className="mt-1 text-[0.82rem] text-tinta-tenue">{tarjeta.funcion}</p>
          </div>
          <button
            type="button"
            onClick={() => seleccionarZona(null)}
            aria-label={textos.cerrar}
            className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-tinta-suave hover:bg-white/5 hover:text-tinta"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <Apartado titulo={textos.queCambio}>
          <p className="mt-1.5 text-[0.9rem] leading-relaxed text-tinta">{tarjeta.queCambio}</p>
          {tarjeta.queSignifica && (
            <p className="mt-2 text-[0.82rem] leading-relaxed text-tinta-suave">
              {tarjeta.queSignifica}
            </p>
          )}
        </Apartado>

        {tarjeta.acciones.length > 0 && (
          <Apartado titulo={textos.acciones}>
            <ol className="mt-2 flex flex-col gap-1">
              {tarjeta.acciones.map((accion, i) => {
                const hecho = Boolean(pasosHechos[clavePaso(i)]);
                return (
                  <li key={accion}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md py-1.5 pr-1 text-[0.9rem]">
                      <input
                        type="checkbox"
                        checked={hecho}
                        onChange={() => alternarPaso(clavePaso(i))}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 grid h-[1.1rem] w-[1.1rem] shrink-0 place-items-center rounded-[4px] border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento ${
                          hecho ? 'border-acento bg-acento text-fondo-profundo' : 'border-acento/70'
                        }`}
                      >
                        {hecho && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span className="w-4 shrink-0 font-semibold tabular-nums text-acento">
                        {i + 1}
                      </span>
                      <span
                        className={
                          hecho
                            ? 'text-tinta-tenue line-through decoration-tinta-tenue/60'
                            : 'text-tinta'
                        }
                      >
                        {accion}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ol>
          </Apartado>
        )}

        {tarjeta.avisoMedico && (
          <section
            className={`rounded-md border px-4 py-3 ${
              fuera ? TONO_AVISO[tarjeta.estado as keyof typeof TONO_AVISO] : 'border-linea/70'
            }`}
          >
            <h3 className="rotulo" style={fuera && estado ? { color: estado.color } : undefined}>
              {textos.avisoMedico}
            </h3>
            <p className="mt-1.5 text-[0.9rem] leading-relaxed text-tinta">{tarjeta.avisoMedico}</p>
          </section>
        )}

        {tarjeta.porQueEspacio && (
          <Apartado titulo={textos.porQueEspacio}>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-tinta-suave">
              {tarjeta.porQueEspacio}
            </p>
            {tarjeta.fuente && (
              <p className="mt-2 text-[0.82rem] text-tinta-tenue">
                {textos.fuente}:{' '}
                <a
                  href={tarjeta.fuente}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-acento underline decoration-acento/40 underline-offset-4 hover:decoration-acento"
                >
                  {tarjeta.fuenteNombre || tarjeta.fuente}
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </p>
            )}
          </Apartado>
        )}
      </CuerpoDesplazable>

      <div className="flex shrink-0 flex-wrap gap-3 border-t border-linea/60 px-5 pb-5 pt-4">
        <button
          type="button"
          onClick={() => {
            const s = useAyni.getState();
            s.setBorradorAgente(plantilla(textos.preguntaZona, { zona: zona?.nombre ?? zonaId }));
            s.setLienzo({ tipo: 'cuerpo', zona: zonaId });
            s.setPestana('agente');
          }}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[0.84rem] text-acento underline decoration-acento/40 underline-offset-4 hover:decoration-acento"
        >
          <MessageCircle size={15} aria-hidden="true" />
          {textos.preguntarAyni}
        </button>
        <button
          type="button"
          onClick={() => {
            useAyni.getState().setZonaFiltro(zonaId);
            setPestana('monitoreo');
          }}
          className="flex-1 whitespace-nowrap rounded-md border border-linea px-3 py-2.5 text-[0.88rem] text-tinta transition-colors hover:border-tinta-tenue"
        >
          {textos.verEvolucion}
        </button>
        <button
          type="button"
          onClick={() => {
            const s = useAyni.getState();
            const indicadores = config.indicadores
              .filter((i) => i.zonas.includes(zonaId))
              .map((i) => i.id);
            const sensor = sensorParaIndicadores(config, indicadores);
            if (sensor) s.setDispositivoActivo(sensor.dispositivo);
            s.setPasoDispositivo(0);
            s.setSensorSeleccionado(sensor?.id ?? null);
            setPestana('medicion');
          }}
          className="flex-1 whitespace-nowrap rounded-md border border-acento/60 bg-acento/15 px-3 py-2.5 text-[0.88rem] font-semibold text-tinta transition-colors hover:bg-acento/25"
        >
          {textos.medirAhora}
        </button>
      </div>
    </aside>
  );
}
