import * as echarts from 'echarts/core';
import { LineChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Registro modular: solo lo que usan los gráficos de AYNI, para un bundle más liviano.
echarts.use([
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  LegendComponent,
  CanvasRenderer,
]);

export { echarts };

/** Color de un token CSS (`--tinta`, `--acento`…) como `rgb()`/`rgba()`. */
export function colorToken(nombre: string, alfa = 1): string {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(`--${nombre}`).trim();
  return alfa === 1 ? `rgb(${valor})` : `rgb(${valor} / ${alfa})`;
}
