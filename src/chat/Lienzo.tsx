import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { ConfigAyni, IdCapa, ModoCapa } from '../config/esquemas';
import type { Seleccion } from '../estado/seleccion';
import { useAyni, type Pestana } from '../estado/store';
import { GraficoComparacion } from '../graficos/GraficoComparacion';
import { GraficoIndicador } from '../graficos/GraficoIndicador';
import { ResumenHoy } from '../pestanas/Monitoreo/ResumenHoy';
import { IconoEstado } from '../ui/IconoEstado';
import { plantilla } from '../ui/textos';
import type { DiasRango, EstadoLienzo } from './tipos';
import { tituloLienzo } from './tituloLienzo';

const Escena = lazy(() => import('../escena3d/Escena'));
const GuiaLienzo = lazy(() => import('./GuiaLienzo'));

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

const PESTANA_DE: Record<EstadoLienzo['tipo'], Pestana | null> = {
  vacio: null,
  cuerpo: 'cuerpo3d',
  grafico: 'monitoreo',
  comparacion: 'monitoreo',
  dispositivo: 'medicion',
  resumen: 'monitoreo',
};

const iguales = (a: EstadoLienzo, b: EstadoLienzo) => JSON.stringify(a) === JSON.stringify(b);

/** Lienzo del agente (AYNI_FUSION.md §8.11): lo que AYNI usa para explicar cada respuesta. */
export function Lienzo({ config, seleccion }: Props) {
  const lienzo = useAyni((s) => s.lienzo);
  const { setLienzo } = useAyni.getState();
  const { textos } = config.escena;
  const [historial, setHistorial] = useState<EstadoLienzo[]>([]);
  const [indice, setIndice] = useState(-1);
  const navegando = useRef(false);

  useEffect(() => {
    if (lienzo.tipo === 'vacio') return;
    if (navegando.current) {
      navegando.current = false;
      return;
    }
    setHistorial((h) => {
      const base = h.slice(0, indice + 1);
      if (base.length && iguales(base[base.length - 1], lienzo)) return base;
      const nuevo = [...base, lienzo];
      setIndice(nuevo.length - 1);
      return nuevo;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lienzo]);

  const ir = (paso: -1 | 1) => {
    const destino = indice + paso;
    if (destino < 0 || destino >= historial.length) return;
    navegando.current = true;
    setIndice(destino);
    setLienzo(historial[destino]);
  };

  const pestana = PESTANA_DE[lienzo.tipo];
  const abrirEnPestana = () => {
    const s = useAyni.getState();
    if (lienzo.tipo === 'dispositivo') {
      if (lienzo.dispositivo) s.setDispositivoActivo(lienzo.dispositivo);
      s.setPasoDispositivo(lienzo.paso - 1);
      s.setSensorSeleccionado(lienzo.sensor);
    }
    if (lienzo.tipo === 'grafico') {
      s.setZonaFiltro(config.indicadores.find((i) => i.id === lienzo.indicador)?.zonas[0] ?? null);
      s.setRangoDias(lienzo.dias);
    }
    if (pestana) s.setPestana(pestana);
  };

  return (
    <section aria-labelledby="lienzo-titulo" className="relative flex h-full min-h-0 flex-col">
      <header className="z-10 flex items-center gap-2 border-b border-linea/40 bg-fondo-profundo/70 px-4 py-2.5">
        <h2
          id="lienzo-titulo"
          className="min-w-0 flex-1 truncate text-[0.92rem] font-semibold text-tinta"
        >
          {tituloLienzo(lienzo, config)}
        </h2>
        <button
          type="button"
          onClick={() => ir(-1)}
          disabled={indice <= 0}
          aria-label={textos.vistaAnterior}
          className="grid h-8 w-8 place-items-center rounded-md text-tinta-suave hover:bg-white/5 hover:text-tinta disabled:opacity-30"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => ir(1)}
          disabled={indice >= historial.length - 1}
          aria-label={textos.vistaSiguiente}
          className="grid h-8 w-8 place-items-center rounded-md text-tinta-suave hover:bg-white/5 hover:text-tinta disabled:opacity-30"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        {pestana && (
          <button
            type="button"
            onClick={abrirEnPestana}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-linea px-2.5 py-1 text-[0.8rem] text-tinta-suave hover:text-tinta"
          >
            <ExternalLink size={13} aria-hidden="true" />
            {textos.abrirEnPestana}
          </button>
        )}
      </header>
      <div
        key={JSON.stringify(lienzo)}
        className="relative min-h-0 flex-1 animate-[aparecer_200ms_ease-out]"
      >
        <Suspense
          fallback={
            <p className="grid h-full place-items-center text-sm text-tinta-suave">
              {textos.cargandoEscena}
            </p>
          }
        >
          <Vista lienzo={lienzo} config={config} seleccion={seleccion} />
        </Suspense>
      </div>
    </section>
  );
}

function Vista({ lienzo, config, seleccion }: { lienzo: EstadoLienzo } & Props) {
  const { textos } = config.escena;
  const setLienzo = useAyni((s) => s.setLienzo);
  switch (lienzo.tipo) {
    case 'vacio':
      return (
        <p className="grid h-full place-items-center px-8 text-center text-[0.9rem] leading-relaxed text-tinta-suave">
          {textos.lienzoVacio}
        </p>
      );
    case 'cuerpo':
      return <VistaCuerpo lienzo={lienzo} config={config} />;
    case 'grafico': {
      const ind = config.indicadores.find((i) => i.id === lienzo.indicador);
      return (
        <div className="h-full overflow-y-auto p-4">
          <SelectorDias
            config={config}
            dias={lienzo.dias}
            alCambiar={(dias) => setLienzo({ ...lienzo, dias })}
          />
          <GraficoIndicador
            config={config}
            seleccion={seleccion}
            indicadorId={lienzo.indicador}
            dias={lienzo.dias}
            conPrediccion={lienzo.prediccion}
            alto={320}
          />
          {ind && (
            <p className="mt-3 max-w-[60ch] text-[0.82rem] leading-relaxed text-tinta-suave">
              {ind.textos.queEs} {ind.textos.queSignifica}
            </p>
          )}
        </div>
      );
    }
    case 'comparacion':
      return (
        <div className="h-full overflow-y-auto p-4">
          <SelectorDias
            config={config}
            dias={lienzo.dias}
            alCambiar={(dias) => setLienzo({ ...lienzo, dias })}
          />
          <GraficoComparacion
            config={config}
            seleccion={seleccion}
            indicadores={lienzo.indicadores}
            dias={lienzo.dias}
            alto={340}
          />
        </div>
      );
    case 'dispositivo':
      return (
        <GuiaLienzo
          config={config}
          paso={lienzo.paso}
          sensor={lienzo.sensor}
          dispositivo={lienzo.dispositivo}
        />
      );
    case 'resumen':
      return (
        <div className="h-full overflow-y-auto p-4">
          <ResumenHoy config={config} compacto />
        </div>
      );
  }
}

function SelectorDias({
  config,
  dias,
  alCambiar,
}: {
  config: ConfigAyni;
  dias: DiasRango;
  alCambiar: (d: DiasRango) => void;
}) {
  const { textos } = config.escena;
  return (
    <div
      role="radiogroup"
      aria-label={textos.rango}
      className="mb-3 inline-flex overflow-hidden rounded-md border border-linea text-[0.82rem]"
    >
      {([7, 14, 30] as DiasRango[]).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={dias === n}
          onClick={() => alCambiar(n)}
          className={`px-3 py-1 ${dias === n ? 'bg-acento/20 text-tinta' : 'text-tinta-suave hover:text-tinta'}`}
        >
          {plantilla(textos.dias, { n })}
        </button>
      ))}
    </div>
  );
}

/** Cuerpo 3D con la zona pedida; aplica las capas solo mientras esta vista está montada. */
function VistaCuerpo({
  lienzo,
  config,
}: {
  lienzo: Extract<EstadoLienzo, { tipo: 'cuerpo' }>;
  config: ConfigAyni;
}) {
  const estadoZona = useAyni((s) => (lienzo.zona ? s.motor?.zonas[lienzo.zona] : undefined));
  const capas = lienzo.capas?.join(',') ?? '';

  useEffect(() => {
    const s = useAyni.getState();
    s.seleccionarZona(lienzo.zona);
    if (!capas) return;
    const anterior = s.modoCapa;
    const pedidas = new Set(capas.split(',') as IdCapa[]);
    s.setModosCapa(
      Object.fromEntries(
        config.escena.capas.map((c): [IdCapa, ModoCapa] => [
          c.id,
          pedidas.has(c.id) ? 'visible' : c.id === 'piel' ? 'translucida' : 'oculta',
        ]),
      ),
    );
    return () => useAyni.getState().setModosCapa(anterior);
  }, [lienzo.zona, capas, config]);

  const zona = config.zonas.find((z) => z.id === lienzo.zona);
  const estado = config.escena.estados.find((e) => e.id === estadoZona?.estado);
  return (
    <div className="relative h-full">
      <Escena />
      {zona && estadoZona && (
        <div className="panel absolute bottom-4 left-4 right-4 max-w-md px-4 py-3">
          <p className="flex items-center gap-2 text-[0.92rem] font-semibold text-tinta">
            {estado && <IconoEstado estado={estado.id} color={estado.color} />}
            {zona.nombre}
            {estado && (
              <span style={{ color: estado.id === 'sin_dato' ? undefined : estado.color }}>
                · {estado.etiqueta}
              </span>
            )}
          </p>
          <p className="mt-1 line-clamp-3 text-[0.82rem] leading-relaxed text-tinta-suave">
            {estadoZona.tarjeta.queCambio}
          </p>
        </div>
      )}
    </div>
  );
}
