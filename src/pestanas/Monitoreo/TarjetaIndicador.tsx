import type { ConfigAyni, Indicador } from '../../config/esquemas';
import type { Seleccion } from '../../estado/seleccion';
import { useAyni } from '../../estado/store';
import { GraficoIndicador } from '../../graficos/GraficoIndicador';
import { useSeries } from '../../graficos/useSeries';
import { conUnidad } from '../../motor/frases';
import { cruceProbable } from '../../prediccion/prediccionSimple';
import { usePredicciones } from '../../prediccion/usePredicciones';
import { IconoEstado } from '../../ui/IconoEstado';
import { plantilla } from '../../ui/textos';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
  indicador: Indicador;
  dias: number;
}

/** Un indicador: valor, estado, motivo del motor, gráfico con predicción y posible cruce. */
export function TarjetaIndicador({ config, seleccion, indicador, dias }: Props) {
  const ev = useAyni((s) => s.motor?.indicadores[indicador.id]);
  const serie = useSeries([indicador.id], config, seleccion)[indicador.id] ?? [];
  const fuentePred = usePredicciones(config);
  const { textos, estados } = config.escena;
  const estado = estados.find((e) => e.id === (ev?.estado ?? 'sin_dato'));
  const cruce = cruceProbable(
    serie,
    fuentePred.predecir(indicador, serie, seleccion.tripulanteId),
    indicador,
  );

  const verEnCuerpo = () => {
    const s = useAyni.getState();
    s.seleccionarZona(indicador.zonas[0]);
    s.setPestana('cuerpo3d');
  };

  return (
    <article
      aria-labelledby={`ind-${indicador.id}`}
      className="panel flex flex-col px-4 pb-3 pt-3.5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`ind-${indicador.id}`} className="text-[0.92rem] font-semibold text-tinta">
            {indicador.nombre}
          </h3>
          <p className="mt-0.5 text-[1.5rem] font-bold leading-tight tabular-nums text-tinta">
            {ev ? conUnidad(ev.valor, indicador.unidad, config.frases) : textos.sinValor}
          </p>
        </div>
        {estado && (
          <span
            className={`mt-0.5 flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[0.72rem] font-semibold ${
              estado.id === 'sin_dato' ? 'text-tinta-tenue' : ''
            }`}
            style={estado.id === 'sin_dato' ? undefined : { color: estado.color }}
          >
            <IconoEstado estado={estado.id} color={estado.color} tamano={13} />
            {estado.etiqueta}
          </span>
        )}
      </header>
      {ev?.motivo && (
        <p className="mt-1 line-clamp-2 text-[0.78rem] leading-snug text-tinta-tenue">
          {ev.motivo}
        </p>
      )}
      <div className="mt-2">
        <GraficoIndicador
          config={config}
          seleccion={seleccion}
          indicadorId={indicador.id}
          dias={dias}
          compacto
          alto={150}
        />
      </div>
      <footer className="mt-1 flex items-end justify-between gap-3">
        <p className="text-[0.78rem] leading-snug text-tinta-suave">
          {cruce
            ? plantilla(cruce.dias === 1 ? textos.siSigueAsiManana : textos.siSigueAsi, {
                nombre: indicador.nombre,
                n: cruce.dias,
              })
            : ''}
        </p>
        <button
          type="button"
          onClick={verEnCuerpo}
          className="shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-[0.78rem] text-acento underline decoration-acento/40 underline-offset-4 hover:decoration-acento"
        >
          {textos.verEnElCuerpo}
        </button>
      </footer>
    </article>
  );
}
