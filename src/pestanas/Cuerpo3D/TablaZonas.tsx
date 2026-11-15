import type { ConfigAyni } from '../../config/esquemas';
import type { EvaluacionIndicador } from '../../datos/tipos';
import { useAyni } from '../../estado/store';
import { conUnidad, numero } from '../../motor/frases';
import { RANGO_ESTADO } from '../../motor/reglas';
import { normalDe } from '../../motor/series';
import { IconoEstado } from '../../ui/IconoEstado';

interface Props {
  config: ConfigAyni;
}

/**
 * Tablero de las zonas: estado, valor del indicador principal y tu normal.
 * Pasar por una fila resalta la zona en el cuerpo; elegirla abre su procedimiento.
 */
export function TablaZonas({ config }: Props) {
  const zonas = useAyni((s) => s.estadoCuerpo?.zonas);
  const tarjetas = useAyni((s) => s.estadoCuerpo?.tarjetas);
  const seleccionada = useAyni((s) => s.zonaSeleccionada);
  const { seleccionarZona, setZonaHover } = useAyni.getState();
  const { textos, estados } = config.escena;

  const filas = config.zonas
    .map((zona, orden) => ({ zona, orden, estado: zonas?.[zona.id] ?? 'sin_dato' }))
    .sort((a, b) => RANGO_ESTADO[b.estado] - RANGO_ESTADO[a.estado] || a.orden - b.orden);

  const valorDe = (ev: EvaluacionIndicador | undefined) => {
    const ind = config.indicadores.find((i) => i.id === ev?.indicador);
    if (!ev || !ind) return { valor: textos.sinValor, normal: textos.sinValor };
    const banda = normalDe(ind, ev.lineaBase);
    return {
      valor: conUnidad(ev.valor, ind.unidad, config.frases),
      normal: banda
        ? `${numero(banda.inf, config.frases)}–${numero(banda.sup, config.frases)}`
        : textos.sinValor,
    };
  };

  return (
    <section
      aria-labelledby="zonas-titulo"
      className="panel flex min-h-0 min-w-0 flex-col px-2 pb-2 pt-3"
    >
      <h2 id="zonas-titulo" className="sr-only">
        {textos.zonasDelCuerpo}
      </h2>
      <div className="min-h-0 overflow-auto">
        <table className="w-full border-collapse text-[0.8rem]">
          <thead>
            <tr className="whitespace-nowrap text-left text-[0.72rem] text-tinta-tenue">
              <th scope="col" className="w-7 pb-2 pl-2 font-normal">
                <span className="sr-only">#</span>
              </th>
              <th scope="col" className="pb-2 font-normal">
                {textos.columnaZona}
              </th>
              <th scope="col" className="pb-2 font-normal">
                {textos.columnaEstado}
              </th>
              <th scope="col" className="pb-2 text-right font-normal">
                {textos.columnaValor}
              </th>
              <th scope="col" className="pb-2 pr-2 text-right font-normal">
                {textos.columnaNormal}
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ zona, estado }, i) => {
              const e = estados.find((x) => x.id === estado);
              const { valor, normal } = valorDe(
                tarjetas?.[zona.id]?.indicadores.find((ev) =>
                  config.indicadores.find((i) => i.id === ev.indicador)?.zonas.includes(zona.id),
                ),
              );
              const activa = zona.id === seleccionada;
              return (
                <tr
                  key={zona.id}
                  onClick={() => seleccionarZona(activa ? null : zona.id)}
                  onMouseEnter={() => setZonaHover(zona.id)}
                  onMouseLeave={() => setZonaHover(null)}
                  className={`cursor-pointer border-t border-linea/45 transition-colors ${
                    activa ? 'bg-acento/10' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <td className="py-[0.45rem] pl-2 tabular-nums text-tinta-tenue">{i + 1}</td>
                  <th
                    scope="row"
                    className="whitespace-nowrap py-[0.45rem] pr-2 text-left font-normal"
                  >
                    <button
                      type="button"
                      aria-pressed={activa}
                      onFocus={() => setZonaHover(zona.id)}
                      onBlur={() => setZonaHover(null)}
                      className={`text-left ${activa ? 'font-semibold text-tinta' : 'text-tinta'}`}
                    >
                      {zona.nombre}
                    </button>
                  </th>
                  <td className="py-2 pr-2">
                    <span
                      className={`flex items-center gap-1.5 whitespace-nowrap text-[0.74rem] ${
                        estado === 'sin_dato' ? 'text-tinta-tenue' : ''
                      }`}
                      style={estado === 'sin_dato' ? undefined : { color: e?.color }}
                    >
                      {e && <IconoEstado estado={e.id} color={e.color} tamano={13} />}
                      {e?.etiqueta}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums text-tinta">
                    {valor}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums text-tinta-suave">
                    {normal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
