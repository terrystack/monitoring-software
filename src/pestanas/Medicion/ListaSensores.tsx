import type { ConfigAyni, Dispositivo } from '../../config/esquemas';
import { estadoSensor, valorSensor } from '../../escena3d/dispositivo/estadoSensor';
import { useAyni } from '../../estado/store';
import { IconoEstado } from '../../ui/IconoEstado';
import { plantilla } from '../../ui/textos';

interface Props {
  config: ConfigAyni;
  dispositivo: Dispositivo;
}

/** Sensores del chaleco con su estado; el elegido muestra dónde va y qué mide. */
export function ListaSensores({ config, dispositivo }: Props) {
  const motor = useAyni((s) => s.motor);
  const elegido = useAyni((s) => s.sensorSeleccionado);
  const { setSensorSeleccionado } = useAyni.getState();
  const { textos, estados } = config.escena;
  const nombre = (id: string) => config.indicadores.find((i) => i.id === id)?.nombre ?? id;

  return (
    <section aria-labelledby="sensores-titulo" className="panel px-4 py-3.5">
      <h2 id="sensores-titulo" className="text-[0.92rem] font-semibold text-tinta">
        {textos.sensores}
      </h2>
      <p className="mt-0.5 text-[0.72rem] text-tinta-tenue">{textos.tocaUnSensor}</p>
      <ul className="mt-2 flex flex-col">
        {(dispositivo.sensores ?? []).map((s) => {
          const estado = estados.find((e) => e.id === estadoSensor(s, motor));
          const activo = s.id === elegido;
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={activo}
                onClick={() => setSensorSeleccionado(activo ? null : s.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.82rem] transition-colors ${
                  activo ? 'bg-acento/10' : 'hover:bg-white/5'
                }`}
              >
                {s.indicadores.length > 0 && estado ? (
                  <IconoEstado estado={estado.id} color={estado.color} tamano={13} />
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-[13px] w-[13px] shrink-0 rounded-full border border-acento"
                  />
                )}
                <span className="text-tinta">{s.nombre}</span>
                <span className="ml-auto whitespace-nowrap tabular-nums text-tinta-suave">
                  {valorSensor(s, motor, config) ?? ''}
                </span>
              </button>
              {activo && (
                <div className="mx-2 mb-1.5 mt-1 rounded-md border border-linea/60 px-3 py-2 text-[0.8rem] leading-snug">
                  <p className="text-tinta">{s.donde}</p>
                  <p className="mt-1 text-tinta-tenue">
                    {s.indicadores.length
                      ? plantilla(textos.mide, { lista: s.indicadores.map(nombre).join(', ') })
                      : textos.sinIndicadores}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
