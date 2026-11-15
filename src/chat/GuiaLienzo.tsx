import { lazy, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ConfigAyni } from '../config/esquemas';
import { dispositivoConSensores } from '../escena3d/dispositivo/estadoSensor';
import { useAyni } from '../estado/store';

const EscenaMedicion = lazy(() => import('../escena3d/dispositivo/EscenaMedicion'));

interface Props {
  config: ConfigAyni;
  paso: number;
  sensor: string | null;
  dispositivo?: string;
}

/** Guía del dispositivo en el lienzo: la escena de Medición en el paso o sensor pedido. */
export default function GuiaLienzo({ config, paso, sensor, dispositivo }: Props) {
  const activo = useAyni((s) => s.dispositivoActivo);
  const disp = dispositivoConSensores(config, activo);
  const { textos } = config.escena;

  useEffect(() => {
    const s = useAyni.getState();
    if (dispositivo) s.setDispositivoActivo(dispositivo);
    s.setPasoDispositivo(Math.max(0, paso - 1));
    s.setSensorSeleccionado(sensor);
  }, [paso, sensor, dispositivo]);

  if (!disp) return null;
  const p = disp.pasos[Math.min(paso, disp.pasos.length) - 1];
  return (
    <div className="relative h-full">
      <EscenaMedicion config={config} />
      {p && (
        <div className="panel absolute bottom-4 left-4 right-4 max-w-md px-4 py-3">
          <p className="text-[0.82rem] leading-relaxed text-tinta">
            <span className="mr-2 font-semibold tabular-nums text-acento">{paso}</span>
            {p.texto}
          </p>
          {p.error && (
            <p className="mt-1.5 flex gap-2 text-[0.8rem] leading-snug text-tinta-suave">
              <AlertTriangle
                size={14}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-estado-atencion"
              />
              <span>
                <span className="font-semibold text-estado-atencion">{textos.errorComun}: </span>
                {p.error}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
