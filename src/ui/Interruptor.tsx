interface Props {
  etiqueta: string;
  activo: boolean;
  alCambiar: (activo: boolean) => void;
}

/** Interruptor accesible (role="switch") con la etiqueta a la izquierda. */
export function Interruptor({ etiqueta, activo, alCambiar }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => alCambiar(!activo)}
      className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-left text-[0.88rem] text-tinta"
    >
      {etiqueta}
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 ${
          activo ? 'border-acento bg-acento/30' : 'border-linea bg-white/5'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-transform duration-200 ${
            activo ? 'translate-x-[1.05rem] bg-acento' : 'translate-x-0.5 bg-tinta-tenue'
          }`}
        />
      </span>
    </button>
  );
}
