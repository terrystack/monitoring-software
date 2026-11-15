import { useEffect, useRef } from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import { echarts } from './echarts';

/** Monta un gráfico ECharts en `ref`, lo redimensiona con su contenedor y lo libera al salir. */
export function useEChart(option: EChartsCoreOption) {
  const ref = useRef<HTMLDivElement>(null);
  const grafico = useRef<ReturnType<typeof echarts.init>>();

  useEffect(() => {
    if (!ref.current) return;
    const instancia = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    grafico.current = instancia;
    const observador = new ResizeObserver(() => instancia.resize());
    observador.observe(ref.current);
    return () => {
      observador.disconnect();
      instancia.dispose();
      grafico.current = undefined;
    };
  }, []);

  useEffect(() => {
    grafico.current?.setOption(option, true);
  }, [option]);

  return ref;
}
