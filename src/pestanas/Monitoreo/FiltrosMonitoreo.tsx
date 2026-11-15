import type { DiasRango } from '../../chat/tipos';
import type { ConfigAyni } from '../../config/esquemas';
import type { Seleccion } from '../../estado/seleccion';
import { useAyni } from '../../estado/store';
import { plantilla } from '../../ui/textos';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

const RANGOS: DiasRango[] = [7, 14, 30];

/** Zona, rango y el deslizador de día (el mismo `dia` del cuerpo 3D y del perfil). */
export function FiltrosMonitoreo({ config, seleccion }: Props) {
  const zonaFiltro = useAyni((s) => s.zonaFiltro);
  const rangoDias = useAyni((s) => s.rangoDias);
  const { setZonaFiltro, setRangoDias, setDia } = useAyni.getState();
  const { textos } = config.escena;
  const total = config.tripulantes.generador.dias;

  return (
    <div className="panel flex flex-wrap items-end gap-x-6 gap-y-3 px-4 py-3">
      <label className="flex flex-col gap-1 text-[0.78rem] text-tinta-tenue">
        {textos.columnaZona}
        <select
          value={zonaFiltro ?? ''}
          onChange={(e) => setZonaFiltro(e.target.value || null)}
          className="rounded-md border border-linea bg-fondo-profundo px-3 py-1.5 text-[0.88rem] text-tinta"
        >
          <option value="">{textos.todasLasZonas}</option>
          {config.zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1 text-[0.78rem] text-tinta-tenue">
        <span id="rango-etiqueta">{textos.rango}</span>
        <div
          role="radiogroup"
          aria-labelledby="rango-etiqueta"
          className="flex overflow-hidden rounded-md border border-linea text-[0.84rem]"
        >
          {RANGOS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rangoDias === n}
              onClick={() => setRangoDias(n)}
              className={`px-3 py-1.5 transition-colors ${
                rangoDias === n ? 'bg-acento/20 text-tinta' : 'text-tinta-suave hover:text-tinta'
              }`}
            >
              {plantilla(textos.dias, { n })}
            </button>
          ))}
        </div>
      </div>

      <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-[0.78rem] text-tinta-tenue">
        <span className="tabular-nums">
          {plantilla(textos.diaDeTotal, { dia: seleccion.dia, total })}
        </span>
        <input
          type="range"
          min={1}
          max={total}
          value={seleccion.dia}
          onChange={(e) => setDia(Number(e.target.value))}
          className="accent-acento"
        />
      </label>
    </div>
  );
}
