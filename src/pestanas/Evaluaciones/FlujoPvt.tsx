import type { ConfigAyni } from '../../config/esquemas';
import type { Seleccion } from '../../estado/seleccion';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

/** PVT-B · la prueba vive en public/sleep_assessment.html (HTML, CSS y JS propios). */
export function FlujoPvt({ config }: Props) {
  const titulo = config.evaluaciones.textos.pvtNombre;

  return (
    <div className="relative h-[72vh] min-h-[30rem]">
      <h1 className="sr-only">{titulo}</h1>
      <iframe
        title={titulo}
        src="/sleep_assessment.html"
        className="absolute inset-0 h-full w-full rounded-md border-0 bg-[#050816]"
      />
    </div>
  );
}
