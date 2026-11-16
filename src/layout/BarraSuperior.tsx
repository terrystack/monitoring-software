import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import type { ConfigAyni } from '../config/esquemas';
import { IDIOMAS } from '../config/idioma';
import { diaMision, type Seleccion } from '../estado/seleccion';
import { useAyni } from '../estado/store';
import { IconoEstado } from '../ui/IconoEstado';
import { iniciales, plantilla } from '../ui/textos';
import { Navegacion } from './Navegacion';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

/** Barra fija (sección 9): marca, pestañas, tripulante, día, entorno, datos sintéticos, alertas, perfil. */
export function BarraSuperior({ config, seleccion }: Props) {
  const { textos } = config.escena;
  const tripulante = config.tripulantes.tripulantes.find((t) => t.id === seleccion.tripulanteId);
  const entorno = config.entornos.find((e) => e.id === seleccion.entornoId);
  const setPerfilAbierto = useAyni((s) => s.setPerfilAbierto);
  const nombre = tripulante?.nombre ?? '';

  return (
    <header className="relative z-[60] flex shrink-0 flex-wrap items-center gap-x-4 border-b border-acento/25 bg-fondo-profundo/80 px-4 lg:h-12 lg:flex-nowrap">
      <a href="/" className="flex shrink-0 items-center py-2 lg:py-0" aria-label="Hanan Pacha">
        <img
          src="/marca/hanan-pacha.png"
          alt="Hanan Pacha"
          className="h-8 w-auto object-contain sm:h-9"
          width={180}
          height={36}
          decoding="async"
        />
      </a>
      <div className="order-last -mx-4 h-11 w-[calc(100%+2rem)] overflow-x-auto border-t border-linea/50 px-1 lg:order-none lg:mx-0 lg:ml-3 lg:h-full lg:w-auto lg:overflow-visible lg:border-0 lg:px-0">
        <Navegacion textos={textos} />
      </div>

      <div className="ml-auto flex items-center gap-2 text-[0.82rem] sm:gap-3">
        <SelectorIdioma etiqueta={textos.idioma} />
        <p className="hidden items-center gap-2 whitespace-nowrap text-tinta-suave lg:flex">
          <span className="text-tinta">{nombre}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {plantilla(textos.diaMision, { dia: diaMision(config, seleccion) })}
          </span>
          <span aria-hidden="true">·</span>
          <span>{entorno?.nombre}</span>
        </p>
        <span className="whitespace-nowrap rounded-md border border-acento/45 px-2 py-1 text-[0.72rem] text-acento sm:px-2.5 sm:text-[0.8rem]">
          {textos.datosSinteticos}
        </span>
        <Campana config={config} />
        <button
          type="button"
          onClick={() => setPerfilAbierto(true)}
          aria-label={plantilla(textos.abrirPerfil, { nombre })}
          aria-haspopup="dialog"
          className="grid h-8 w-8 place-items-center rounded-full border border-acento/50 bg-acento/10 text-[0.85rem] font-semibold text-tinta transition-colors hover:bg-acento/20"
        >
          {iniciales(nombre)}
        </button>
      </div>
    </header>
  );
}

function SelectorIdioma({ etiqueta }: { etiqueta: string }) {
  const idioma = useAyni((s) => s.idioma);
  const setIdioma = useAyni((s) => s.setIdioma);
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="flex overflow-hidden rounded-md border border-linea text-[0.72rem] font-semibold"
    >
      {IDIOMAS.map((id) => (
        <button
          key={id}
          type="button"
          lang={id}
          aria-pressed={idioma === id}
          onClick={() => setIdioma(id)}
          className={`px-2 py-1 uppercase transition-colors ${
            idioma === id ? 'bg-acento/15 text-tinta' : 'text-tinta-tenue hover:text-tinta'
          }`}
        >
          {id}
        </button>
      ))}
    </div>
  );
}

/** Campana con las zonas fuera de tu normal; elegir una la abre en el cuerpo 3D. */
function Campana({ config }: { config: ConfigAyni }) {
  const [abierta, setAbierta] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const zonasEstado = useAyni((s) => s.estadoCuerpo?.zonas);
  const { textos, estados } = config.escena;
  const alertas = config.zonas.filter((z) => {
    const e = zonasEstado?.[z.id];
    return e === 'atencion' || e === 'critico';
  });

  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierta(false);
    };
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierta(false);
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierta]);

  const elegir = (id: string) => {
    const s = useAyni.getState();
    s.setPestana('cuerpo3d');
    s.seleccionarZona(id);
    setAbierta(false);
  };

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-expanded={abierta}
        aria-label={`${textos.alertas}: ${alertas.length}`}
        onClick={() => setAbierta((v) => !v)}
        className="relative grid h-8 w-8 place-items-center rounded-md text-tinta-suave transition-colors hover:bg-white/5 hover:text-tinta"
      >
        <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
        {alertas.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-estado-critico px-1 text-[0.72rem] font-bold leading-none tabular-nums text-fondo-profundo">
            {alertas.length}
          </span>
        )}
      </button>
      {abierta && (
        <div className="panel absolute right-0 top-10 w-72 p-2 shadow-[0_12px_32px_rgb(0_0_0/0.45)]">
          <p className="rotulo px-2 pb-1.5 pt-1">{textos.alertas}</p>
          {alertas.length === 0 ? (
            <p className="px-2 pb-2 text-[0.82rem] text-tinta-suave">{textos.sinAlertas}</p>
          ) : (
            <ul>
              {alertas.map((z) => {
                const estado = estados.find((e) => e.id === zonasEstado?.[z.id]);
                return (
                  <li key={z.id}>
                    <button
                      type="button"
                      onClick={() => elegir(z.id)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[0.82rem] hover:bg-white/5"
                    >
                      {estado && <IconoEstado estado={estado.id} color={estado.color} />}
                      <span className="text-tinta">{z.nombre}</span>
                      <span className="ml-auto text-[0.78rem]" style={{ color: estado?.color }}>
                        {estado?.etiqueta}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
