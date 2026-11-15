import { useMemo } from 'react';
import type { ConfigAyni } from '../config/esquemas';
import { useMovimientoReducido } from '../escena3d/calidad';
import { diaMision, type Seleccion } from '../estado/seleccion';
import { useAyni } from '../estado/store';
import { conUnidad, numero } from '../motor/frases';
import { umbralesDe } from '../motor/series';
import { usePredicciones } from '../prediccion/usePredicciones';
import { plantilla } from '../ui/textos';
import { colorToken } from './echarts';
import { useEChart } from './useEChart';
import { useSeries } from './useSeries';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
  indicadorId: string;
  dias: number;
  compacto?: boolean;
  conPrediccion?: boolean;
  alto?: number;
}

/**
 * Valores diarios con la banda de tu normal (media ± 2σ), puntos fuera en color de estado,
 * lecturas manuales con borde blanco, predicción punteada con su banda y umbrales fijos.
 */
export function GraficoIndicador({
  config,
  seleccion,
  indicadorId,
  dias,
  compacto = false,
  conPrediccion = true,
  alto = 180,
}: Props) {
  const ind = config.indicadores.find((i) => i.id === indicadorId);
  const serieCompleta = useSeries([indicadorId], config, seleccion)[indicadorId] ?? [];
  const fuentePred = usePredicciones(config);
  const reducido = useMovimientoReducido();
  const estadoIndicador = useAyni((s) => s.motor?.indicadores[indicadorId]?.estado);
  const { textos, estados } = config.escena;
  const color = (id: string) => estados.find((e) => e.id === id)?.color ?? '#94a3b8';

  const serie = serieCompleta.slice(-dias);
  const prediccion =
    conPrediccion && ind ? fuentePred.predecir(ind, serieCompleta, seleccion.tripulanteId) : null;

  const option = useMemo(() => {
    if (!ind) return {};
    const diaDe = (n: number) => diaMision(config, { ...seleccion, dia: n });
    const fmt = (v: number) => conUnidad(v, ind.unidad, config.frases);
    const reales = serie.length;
    const predichos = prediccion?.puntos ?? [];
    const categorias = [...serie.map((p) => p.numDia), ...predichos.map((p) => p.numDia)];
    const relleno = (n: number) => Array<null>(n).fill(null);
    const tinta = colorToken('tinta');
    const tenue = colorToken('tinta-tenue');
    const linea = colorToken('linea', 0.6);
    const acento = colorToken('acento');
    const ultimo = serie[reales - 1];
    const fueraColor = estadoIndicador === 'critico' ? color('critico') : color('atencion');

    return {
      animation: !reducido,
      grid: compacto
        ? { left: 38, right: 10, top: 10, bottom: 22 }
        : { left: 48, right: 16, top: 16, bottom: 30 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: colorToken('superficie', 0.96),
        borderColor: linea,
        textStyle: { color: tinta, fontFamily: 'Biryani, system-ui', fontSize: 12 },
        formatter: (items: { dataIndex: number }[]) => {
          const i = items[0]?.dataIndex ?? 0;
          const lineas = [plantilla(textos.diaMision, { dia: diaDe(categorias[i]) })];
          const real = serie[i];
          if (real) {
            lineas.push(`<b>${fmt(real.valor)}</b>`);
            if (real.banda)
              lineas.push(
                `${textos.columnaNormal}: ${numero(real.banda.inf, config.frases)}–${numero(real.banda.sup, config.frases)}`,
              );
          }
          const pred = predichos[i - reales];
          if (pred)
            lineas.push(
              `${textos.prediccion}: ${fmt(pred.valor)} (${numero(pred.inf, config.frases)}–${numero(pred.sup, config.frases)})`,
            );
          return lineas.join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        data: categorias.map((n) => String(diaDe(n))),
        boundaryGap: false,
        axisLabel: { color: tenue, fontSize: compacto ? 9 : 11 },
        axisLine: { lineStyle: { color: linea } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: tenue, fontSize: compacto ? 9 : 11 },
        splitLine: { lineStyle: { color: colorToken('linea', 0.35) } },
      },
      series: [
        {
          name: 'banda_inf',
          type: 'line',
          stack: 'banda',
          symbol: 'none',
          silent: true,
          lineStyle: { opacity: 0 },
          data: serie.map((p) => p.banda?.inf ?? null),
        },
        {
          name: textos.columnaNormal,
          type: 'line',
          stack: 'banda',
          symbol: 'none',
          silent: true,
          lineStyle: { opacity: 0 },
          areaStyle: { color: colorToken('acento', 0.14) },
          data: serie.map((p) => (p.banda ? p.banda.sup - p.banda.inf : null)),
        },
        {
          name: 'pred_inf',
          type: 'line',
          stack: 'prediccion',
          symbol: 'none',
          silent: true,
          lineStyle: { opacity: 0 },
          data: [...relleno(reales), ...predichos.map((p) => p.inf)],
        },
        {
          name: 'pred_banda',
          type: 'line',
          stack: 'prediccion',
          symbol: 'none',
          silent: true,
          lineStyle: { opacity: 0 },
          areaStyle: { color: colorToken('acento', 0.07) },
          data: [...relleno(reales), ...predichos.map((p) => p.sup - p.inf)],
        },
        {
          name: textos.prediccion,
          type: 'line',
          symbol: 'none',
          lineStyle: { color: acento, type: 'dashed', width: 1.5 },
          data: predichos.length
            ? [...relleno(reales - 1), ultimo?.valor ?? null, ...predichos.map((p) => p.valor)]
            : [],
        },
        {
          name: ind.nombre,
          type: 'line',
          symbol: 'circle',
          symbolSize: compacto ? 4 : 6,
          lineStyle: { color: tinta, width: 1.75 },
          itemStyle: { color: tinta },
          data: serie.map((p) => ({
            value: p.valor,
            symbolSize: p.fuera ? (compacto ? 8 : 10) : undefined,
            itemStyle: {
              color: p.fuera ? fueraColor : tinta,
              borderColor: p.manual ? '#ffffff' : undefined,
              borderWidth: p.manual ? 2 : 0,
            },
          })),
          markLine: {
            silent: true,
            symbol: 'none',
            label: { show: false },
            data: [
              ...(ultimo
                ? [{ xAxis: reales - 1, lineStyle: { color: acento, type: 'dashed', width: 1 } }]
                : []),
              ...umbralesDe(ind).map((u) => ({
                yAxis: u.valor,
                lineStyle: { color: color(u.estado), type: 'dotted', width: 1 },
              })),
            ],
          },
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ind,
    serie.length,
    serieCompleta,
    prediccion,
    compacto,
    reducido,
    estadoIndicador,
    config,
    seleccion,
  ]);

  const ref = useEChart(option);
  if (!ind) return null;

  const ultimo = serie[serie.length - 1];
  const estado = estados.find((e) => e.id === estadoIndicador);
  const resumen = ultimo
    ? `${ind.nombre}: ${conUnidad(ultimo.valor, ind.unidad, config.frases)}${estado ? ` · ${estado.etiqueta}` : ''}`
    : `${ind.nombre}: ${textos.sinMedicionesRango}`;

  return (
    <figure className="relative m-0">
      <div ref={ref} role="img" aria-label={resumen} style={{ height: alto, width: '100%' }} />
      {serie.length === 0 && (
        <p className="absolute inset-0 grid place-items-center text-[0.82rem] text-tinta-tenue">
          {textos.sinMedicionesRango}
        </p>
      )}
      <table className="sr-only">
        <caption>{resumen}</caption>
        <tbody>
          {serie.slice(-7).map((p) => (
            <tr key={p.dia}>
              <th scope="row">
                {plantilla(textos.diaMision, {
                  dia: diaMision(config, { ...seleccion, dia: p.numDia }),
                })}
              </th>
              <td>{conUnidad(p.valor, ind.unidad, config.frases)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
