import { useMemo } from 'react';
import type { ConfigAyni } from '../config/esquemas';
import { useMovimientoReducido } from '../escena3d/calidad';
import { diaMision, type Seleccion } from '../estado/seleccion';
import { conUnidad } from '../motor/frases';
import { plantilla } from '../ui/textos';
import { colorToken } from './echarts';
import { useEChart } from './useEChart';
import { useSeries } from './useSeries';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
  indicadores: [string, string];
  dias: number;
  alto?: number;
}

/** Dos indicadores en los mismos días con doble eje Y (pestaña 2 y lienzo del agente). */
export function GraficoComparacion({ config, seleccion, indicadores, dias, alto = 260 }: Props) {
  const [idA, idB] = indicadores;
  const series = useSeries([idA, idB], config, seleccion);
  const reducido = useMovimientoReducido();
  const indA = config.indicadores.find((i) => i.id === idA);
  const indB = config.indicadores.find((i) => i.id === idB);

  const option = useMemo(() => {
    if (!indA || !indB) return {};
    const a = (series[idA] ?? []).slice(-dias);
    const b = (series[idB] ?? []).slice(-dias);
    const numDias = [...new Set([...a, ...b].map((p) => p.numDia))].sort((x, y) => x - y);
    const valor = (s: typeof a, n: number) => s.find((p) => p.numDia === n)?.valor ?? null;
    const tenue = colorToken('tinta-tenue');
    const colorA = colorToken('acento');
    const colorB = colorToken('tinta');
    const eje = (color: string) => ({
      type: 'value',
      scale: true,
      axisLabel: { color: tenue, fontSize: 11 },
      axisLine: { show: true, lineStyle: { color } },
      splitLine: { lineStyle: { color: colorToken('linea', 0.3) } },
    });
    return {
      animation: !reducido,
      grid: { left: 52, right: 52, top: 36, bottom: 30 },
      legend: {
        top: 0,
        textStyle: { color: colorToken('tinta-suave'), fontFamily: 'Biryani, system-ui' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: colorToken('superficie', 0.96),
        borderColor: colorToken('linea', 0.6),
        textStyle: { color: colorToken('tinta'), fontFamily: 'Biryani, system-ui', fontSize: 12 },
        valueFormatter: (v: number) => String(v),
      },
      xAxis: {
        type: 'category',
        data: numDias.map((n) => String(diaMision(config, { ...seleccion, dia: n }))),
        axisLabel: { color: tenue, fontSize: 11 },
        axisLine: { lineStyle: { color: colorToken('linea', 0.6) } },
      },
      yAxis: [eje(colorA), eje(colorB)],
      series: [
        {
          name: `${indA.nombre} (${indA.unidad})`,
          type: 'line',
          yAxisIndex: 0,
          symbolSize: 5,
          lineStyle: { color: colorA, width: 2 },
          itemStyle: { color: colorA },
          data: numDias.map((n) => valor(a, n)),
        },
        {
          name: `${indB.nombre} (${indB.unidad})`,
          type: 'line',
          yAxisIndex: 1,
          symbolSize: 5,
          lineStyle: { color: colorB, width: 2, type: 'dashed' },
          itemStyle: { color: colorB },
          data: numDias.map((n) => valor(b, n)),
        },
      ],
    };
  }, [indA, indB, idA, idB, series, dias, reducido, config, seleccion]);

  const ref = useEChart(option);
  if (!indA || !indB) return null;
  const ultimo = (id: string, ind: typeof indA) => {
    const p = (series[id] ?? []).at(-1);
    return p ? `${ind.nombre} ${conUnidad(p.valor, ind.unidad, config.frases)}` : ind.nombre;
  };

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${plantilla(config.escena.textos.dias, { n: dias })}: ${ultimo(idA, indA)} · ${ultimo(idB, indB)}`}
      style={{ height: alto, width: '100%' }}
    />
  );
}
