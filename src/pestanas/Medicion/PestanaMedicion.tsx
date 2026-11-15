import { lazy, Suspense } from 'react';
import type { ConfigAyni } from '../../config/esquemas';
import { dispositivoConSensores } from '../../escena3d/dispositivo/estadoSensor';
import type { Seleccion } from '../../estado/seleccion';
import { useAyni } from '../../estado/store';
import { AgendaDia } from './AgendaDia';
import { FichaDispositivo } from './FichaDispositivo';
import { GuiaPasos } from './GuiaPasos';
import { ListaSensores } from './ListaSensores';
import { RegistroManual } from './RegistroManual';
import { SelectorDispositivo } from './SelectorDispositivo';

const EscenaMedicion = lazy(() => import('../../escena3d/dispositivo/EscenaMedicion'));

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

/** Pestaña 3 · Medición con el chaleco HANAN PACHA (AYNI_FUSION.md §7.2). */
export function PestanaMedicion({ config, seleccion }: Props) {
  const { textos } = config.escena;
  const activo = useAyni((s) => s.dispositivoActivo);
  const disp = dispositivoConSensores(config, activo);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <h1 className="sr-only">{textos.pestanaMedicion}</h1>
      <div className="flex flex-col gap-3 p-3 lg:grid lg:h-full lg:grid-cols-[24%_1fr_30%] lg:grid-rows-[minmax(0,1fr)_auto] lg:p-4">
        <div className="order-3 min-h-0 lg:order-1 lg:overflow-y-auto">
          <AgendaDia config={config} seleccion={seleccion} />
        </div>
        <div className="relative order-1 h-[55vh] overflow-hidden rounded-lg border border-linea/50 lg:order-2 lg:h-auto">
          {disp && <SelectorDispositivo config={config} activo={disp.id} />}
          <Suspense
            fallback={
              <p className="grid h-full place-items-center text-sm text-tinta-suave">
                {textos.cargandoEscena}
              </p>
            }
          >
            <EscenaMedicion config={config} />
          </Suspense>
        </div>
        <div className="order-2 flex min-h-0 flex-col gap-3 lg:order-3 lg:overflow-y-auto">
          {disp && <FichaDispositivo config={config} dispositivo={disp} />}
          {disp && <GuiaPasos key={disp.id} config={config} dispositivo={disp} />}
          {disp && <ListaSensores config={config} dispositivo={disp} />}
        </div>
        <div className="order-4 lg:col-span-3">
          <RegistroManual config={config} seleccion={seleccion} />
          <p className="px-1 pt-2 text-[0.72rem] text-tinta-tenue">{textos.noDiagnostico}</p>
        </div>
      </div>
    </div>
  );
}
