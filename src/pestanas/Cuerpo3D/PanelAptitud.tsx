import type { ConfigAyni } from '../../config/esquemas';
import { useAyni } from '../../estado/store';
import { IconoEstado } from '../../ui/IconoEstado';

interface Props {
  config: ConfigAyni;
}

/** Aptitud del día (6.3): tres semáforos calculados por el motor. */
export function PanelAptitud({ config }: Props) {
  const aptitud = useAyni((s) => s.motor?.aptitud);
  const { textos, estados, etiquetasAptitud } = config.escena;
  const filas =
    aptitud ??
    config.reglasCompuestas.aptitud.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      estado: 'sin_dato' as const,
    }));

  return (
    <section aria-labelledby="aptitud-titulo" className="panel px-4 pb-3 pt-3.5">
      <h2 id="aptitud-titulo" className="text-[0.92rem] font-semibold text-tinta">
        {textos.aptitudDelDia}
      </h2>
      <ul className="mt-2 divide-y divide-linea/50">
        {filas.map((a) => {
          const estado = estados.find((e) => e.id === a.estado);
          const nombre =
            config.reglasCompuestas.aptitud.find((x) => x.id === a.id)?.nombre ?? a.nombre;
          return (
            <li key={a.id} className="flex items-center gap-3 py-2 text-[0.86rem]">
              <span className="text-tinta">{nombre}</span>
              <span
                className={`ml-auto flex items-center gap-1.5 whitespace-nowrap text-[0.8rem] font-semibold ${
                  a.estado === 'sin_dato' ? 'text-tinta-tenue' : ''
                }`}
                style={a.estado === 'sin_dato' ? undefined : { color: estado?.color }}
              >
                {estado && <IconoEstado estado={estado.id} color={estado.color} tamano={13} />}
                {etiquetasAptitud[a.estado]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
