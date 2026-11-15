import { lazy, Suspense } from 'react';
import type { ConfigAyni } from '../../config/esquemas';
import type { Seleccion } from '../../estado/seleccion';
import { RUTA_CREDITOS } from '../../layout/PaginaCreditos';
import { ControlCapas } from './ControlCapas';
import { PanelAptitud } from './PanelAptitud';
import { TablaZonas } from './TablaZonas';
import { TarjetaAccion } from './TarjetaAccion';

const Escena = lazy(() => import('../../escena3d/Escena'));

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

/**
 * Pestaña 1 (sección 9): resumen a la izquierda, cuerpo 3D al centro y procedimiento de la
 * zona elegida a la derecha. En pantallas estrechas los paneles bajan bajo la escena.
 */
export function PestanaCuerpo3D({ config, seleccion }: Props) {
  const { textos } = config.escena;

  return (
      <div className="h-full overflow-y-auto overflow-x-hidden lg:overflow-hidden">
        <div className="relative h-[62vh] lg:absolute lg:inset-0 lg:h-auto">
          <Suspense
            fallback={
              <p className="absolute inset-0 grid place-items-center text-sm text-tinta-suave">
                {textos.cargandoEscena}
              </p>
            }
          >
            <Escena />
          </Suspense>
          <div className="absolute bottom-3 left-1/2 z-[45] -translate-x-1/2">
            <ControlCapas escena={config.escena} />
          </div>
        </div>

        <div className="relative z-[45] flex flex-col gap-3 px-3 pt-3 lg:absolute lg:bottom-[7%] lg:left-[0.8%] lg:top-[2%] lg:w-[27.3%] lg:gap-2.5 lg:p-0">
          <PanelAptitud config={config} />
          <TablaZonas config={config} />
        </div>

        <div className="relative z-[45] px-3 pt-3 lg:pointer-events-none lg:absolute lg:bottom-[7%] lg:right-[1.1%] lg:top-[2%] lg:flex lg:w-[31%] lg:flex-col lg:justify-center lg:p-0">
          <div className="min-h-0 lg:pointer-events-auto lg:flex lg:flex-col">
            <TarjetaAccion config={config} seleccion={seleccion} />
          </div>
        </div>

        <footer className="relative z-[45] flex items-baseline gap-4 px-4 py-4 text-[0.72rem] text-tinta-tenue lg:absolute lg:bottom-2 lg:left-3 lg:p-0">
          <p>{textos.noDiagnostico}</p>
          <a
            href={RUTA_CREDITOS}
            className="underline decoration-tinta-tenue/60 underline-offset-4 transition-colors hover:text-tinta"
          >
            {textos.creditos}
          </a>
        </footer>
      </div>
    );
}
