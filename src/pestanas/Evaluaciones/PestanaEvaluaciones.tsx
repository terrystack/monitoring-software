import type { ConfigAyni } from '../../config/esquemas';
import type { Seleccion } from '../../estado/seleccion';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

/** Pestaña Evaluaciones · la evaluación vive en public/sleep_assessment.html (HTML, CSS y JS propios). */
export function PestanaEvaluaciones({ config }: Props) {
  const titulo = config.escena.textos.pestanaEvaluaciones;

  return (
    <div className="absolute inset-0">
      <h1 className="sr-only">{titulo}</h1>
      <iframe
        title={titulo}
        src="/sleep_assessment.html"
        className="h-full w-full border-0 bg-[#f2f6f7]"
      />
    </div>
  );
}
