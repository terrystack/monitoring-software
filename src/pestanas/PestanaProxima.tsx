import { useAyni } from '../estado/store';

interface Props {
  titulo: string;
  texto: string;
}

/** Pestañas que llegan en fases siguientes: estado vacío honesto con vuelta al cuerpo. */
export function PestanaProxima({ titulo, texto }: Props) {
  const volver = useAyni((s) => s.config?.escena.textos.volverAlCuerpo);
  const setPestana = useAyni((s) => s.setPestana);
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-md">
        <h1 className="text-balance text-[1.6rem] font-semibold leading-tight text-tinta">
          {titulo}
        </h1>
        <p className="mt-3 text-pretty leading-relaxed text-tinta-suave">{texto}</p>
        <button
          type="button"
          onClick={() => setPestana('cuerpo3d')}
          className="mt-6 rounded-md border border-acento/60 bg-acento/15 px-4 py-2.5 text-[0.9rem] font-semibold text-tinta transition-colors hover:bg-acento/25"
        >
          {volver}
        </button>
      </div>
    </div>
  );
}
