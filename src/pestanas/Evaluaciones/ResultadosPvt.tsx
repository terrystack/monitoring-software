import { useMemo } from 'react';
import type { ConfigAyni } from '../../config/esquemas';
import { useMovimientoReducido } from '../../escena3d/calidad';
import type { SesionPvtGuardada } from '../../evaluaciones/pvt';
import { colorToken } from '../../graficos/echarts';
import { useEChart } from '../../graficos/useEChart';
import { numero } from '../../motor/frases';
import { plantilla } from '../../ui/textos';

interface Props {
  config: ConfigAyni;
  sesion: SesionPvtGuardada;
  /** Mensaje de confirmación tras guardar (solo justo después de la prueba). */
  aviso?: string;
}

/** Resultados de una sesión del PVT-B: medidas y TR por intento. */
export function ResultadosPvt({ config, sesion, aviso }: Props) {
  const t = config.evaluaciones.textos;
  const { frases } = config;
  const r = sesion.resumen;
  const sinValor = config.escena.textos.sinValor;
  const ms = (v: number | null) => (v === null ? sinValor : `${Math.round(v)} ms`);
  const nombreEntrada = {
    teclado: t.entradaTeclado,
    tactil: t.entradaTactil,
    raton: t.entradaRaton,
    mixta: `${t.entradaTactil} + ${t.entradaTeclado}`,
  }[sesion.entrada];

  const datos: { etiqueta: string; valor: string; ayuda?: string; principal?: boolean }[] = [
    {
      etiqueta: t.velocidad,
      valor: r.velocidad === null ? sinValor : `${numero(r.velocidad, frases, 2)} /s`,
      ayuda: t.ayudaVelocidad,
      principal: true,
    },
    { etiqueta: t.trMedio, valor: ms(r.trMedioMs) },
    {
      etiqueta: t.lapsos,
      valor: String(r.lapsos),
      ayuda: plantilla(t.ayudaLapsos, { ms: sesion.umbrales.umbralLapsoMs }),
    },
    {
      etiqueta: t.salidasFalsas,
      valor: String(r.salidasFalsas),
      ayuda: plantilla(t.ayudaSalidas, { ms: sesion.umbrales.umbralFalsaMs }),
    },
    { etiqueta: t.estresReportado, valor: `${sesion.estres}/100` },
    {
      etiqueta: t.sueno,
      valor: sesion.horasSueno === null ? sinValor : `${numero(sesion.horasSueno, frases)} h`,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {aviso && (
        <p role="status" className="text-[0.82rem] text-estado-normal">
          {aviso}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {datos.map((d) => (
          <div key={d.etiqueta} className="flex flex-col gap-0.5">
            <dt className="text-[0.76rem] text-tinta-tenue">{d.etiqueta}</dt>
            <dd
              className={`tabular-nums text-tinta ${
                d.principal ? 'text-[1.5rem] font-semibold leading-tight' : 'text-[1.1rem]'
              }`}
            >
              {d.valor}
            </dd>
            {d.ayuda && <dd className="text-[0.72rem] text-tinta-tenue">{d.ayuda}</dd>}
          </div>
        ))}
      </dl>
      <p className="text-[0.82rem] leading-relaxed text-tinta-suave">{t.avisoResultados}</p>
      <p className="text-[0.76rem] text-tinta-tenue">
        {t.intentos}: <span className="tabular-nums">{r.estimulos}</span> · {t.entrada}:{' '}
        {nombreEntrada}
        {sesion.entrada !== 'teclado' && <> · {t.avisoTactil}</>}
      </p>

      <section aria-labelledby="pvt-grafico">
        <h3 id="pvt-grafico" className="rotulo">
          {t.graficoIntentos}
        </h3>
        <GraficoIntentos sesion={sesion} />
      </section>
    </div>
  );
}

function GraficoIntentos({ sesion }: { sesion: SesionPvtGuardada }) {
  const reducido = useMovimientoReducido();
  const option = useMemo(() => {
    const respuestas = sesion.intentos.filter((i) => i.type === 'response' && i.rt_ms !== null);
    const tinta = colorToken('tinta-suave');
    const tenue = colorToken('tinta-tenue');
    const linea = colorToken('linea', 0.6);
    const acento = colorToken('acento');
    const { umbralLapsoMs, umbralFalsaMs } = sesion.umbrales;
    const max = Math.max(500, ...respuestas.map((i) => i.rt_ms as number));
    return {
      animation: !reducido,
      grid: { left: 44, right: 12, top: 14, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: colorToken('superficie', 0.96),
        borderColor: linea,
        textStyle: { color: colorToken('tinta'), fontFamily: 'Biryani, system-ui', fontSize: 12 },
        valueFormatter: (v: number) => `${v} ms`,
      },
      xAxis: {
        type: 'category',
        data: respuestas.map((i) => i.trial),
        axisLine: { lineStyle: { color: linea } },
        axisLabel: { color: tenue, fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: Math.ceil(max / 100) * 100,
        splitLine: { lineStyle: { color: linea, type: 'dashed' } },
        axisLabel: { color: tenue, fontSize: 10 },
      },
      series: [
        {
          type: 'line',
          data: respuestas.map((i) => i.rt_ms),
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: acento, width: 1.5 },
          itemStyle: { color: acento },
          markLine: {
            silent: true,
            symbol: 'none',
            label: { color: tinta, fontSize: 10, formatter: '{c} ms', position: 'insideEndTop' },
            lineStyle: { color: tenue, type: 'dashed' },
            data: [{ yAxis: umbralLapsoMs }, { yAxis: umbralFalsaMs }],
          },
        },
      ],
    };
  }, [sesion, reducido]);
  const ref = useEChart(option);
  return <div ref={ref} className="mt-2 h-[200px] w-full" />;
}
