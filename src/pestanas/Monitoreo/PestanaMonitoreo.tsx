import type { ConfigAyni } from '../../config/esquemas';
import type { Seleccion } from '../../estado/seleccion';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

/** Pestaña 2 · el tablero vive en public/monitoreo.html (HTML, CSS y JS propios). */
export function PestanaMonitoreo({ config }: Props) {
  const titulo = config.escena.textos.pestanaMonitoreo;

  return (
    <div className="absolute inset-0">
      <h1 className="sr-only">{titulo}</h1>
      <iframe title={titulo} src="/monitoreo.html" className="h-full w-full border-0 bg-[#0c1214]" />
    </div>
  );
}
