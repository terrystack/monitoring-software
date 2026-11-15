import { useState } from 'react';
import type { ConfigAyni } from '../../config/esquemas';
import type { Seleccion } from '../../estado/seleccion';
import { useAyni } from '../../estado/store';
import { GraficoComparacion } from '../../graficos/GraficoComparacion';
import { RANGO_ESTADO } from '../../motor/reglas';
import { usePredicciones } from '../../prediccion/usePredicciones';
import { plantilla } from '../../ui/textos';
import { ContenedorPestana } from '../ContenedorPestana';
import { FiltrosMonitoreo } from './FiltrosMonitoreo';
import { ResumenHoy } from './ResumenHoy';
import { TarjetaIndicador } from './TarjetaIndicador';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

/** Pestaña 2 · Monitoreo y predicción (AYNI_FUSION.md §6). */
export function PestanaMonitoreo({ config, seleccion }: Props) {
  const evaluaciones = useAyni((s) => s.motor?.indicadores);
  const zonaFiltro = useAyni((s) => s.zonaFiltro);
  const rangoDias = useAyni((s) => s.rangoDias);
  const fuentePred = usePredicciones(config);
  const { textos, indicadoresDestacados } = config.escena;

  const destacado = (id: string) => {
    const i = indicadoresDestacados.indexOf(id);
    return i < 0 ? indicadoresDestacados.length : i;
  };
  const visibles = config.indicadores
    .map((ind, orden) => ({ ind, orden, estado: evaluaciones?.[ind.id]?.estado ?? 'sin_dato' }))
    .filter(({ ind }) => !zonaFiltro || ind.zonas.includes(zonaFiltro))
    .sort(
      (a, b) =>
        RANGO_ESTADO[b.estado] - RANGO_ESTADO[a.estado] ||
        destacado(a.ind.id) - destacado(b.ind.id) ||
        a.orden - b.orden,
    );

  const [comparar, setComparar] = useState<[string, string]>(['sueno_horas', 'pulso_reposo']);
  const selectorComparar = (i: 0 | 1) => (
    <select
      value={comparar[i]}
      aria-label={`${textos.comparar} ${i + 1}`}
      onChange={(e) =>
        setComparar((c) => (i === 0 ? [e.target.value, c[1]] : [c[0], e.target.value]))
      }
      className="rounded-md border border-linea bg-fondo-profundo px-3 py-1.5 text-[0.82rem] text-tinta"
    >
      {config.indicadores.map((ind) => (
        <option key={ind.id} value={ind.id}>
          {ind.nombre}
        </option>
      ))}
    </select>
  );

  return (
    <ContenedorPestana titulo={textos.pestanaMonitoreo}>
      <div className="mx-auto flex max-w-[110rem] flex-col gap-3 p-3 lg:p-4">
        <ResumenHoy config={config} />
        <FiltrosMonitoreo config={config} seleccion={seleccion} />
        <p className="px-1 text-[0.74rem] text-tinta-tenue">
          {textos.prediccion} ·{' '}
          {plantilla(textos.entrenadoCon, { modelo: fuentePred.modelo, datos: fuentePred.datos })}
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibles.map(({ ind }) => (
            <TarjetaIndicador
              key={ind.id}
              config={config}
              seleccion={seleccion}
              indicador={ind}
              dias={rangoDias}
            />
          ))}
        </div>
        <section aria-labelledby="comparar-titulo" className="panel px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="comparar-titulo" className="mr-2 text-[0.92rem] font-semibold text-tinta">
              {textos.comparar}
            </h2>
            {selectorComparar(0)}
            {selectorComparar(1)}
          </div>
          <div className="mt-3">
            <GraficoComparacion
              config={config}
              seleccion={seleccion}
              indicadores={comparar}
              dias={rangoDias}
            />
          </div>
        </section>
        <p className="px-1 pb-2 text-[0.72rem] text-tinta-tenue">{textos.noDiagnostico}</p>
      </div>
    </ContenedorPestana>
  );
}
