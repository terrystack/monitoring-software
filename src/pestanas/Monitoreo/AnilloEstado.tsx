import type { ConfigAyni } from '../../config/esquemas';
import { estadoDePuntaje } from '../../motor/puntaje';
import { IconoEstado } from '../../ui/IconoEstado';
import { plantilla } from '../../ui/textos';

interface Props {
  config: ConfigAyni;
  puntaje: number;
  motivo: string;
}

const RADIO = 46;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/** Estado general 0–100 con su color de estado, ícono y palabra (nunca solo color). */
export function AnilloEstado({ config, puntaje, motivo }: Props) {
  const { textos, estados } = config.escena;
  const estado = estados.find((e) => e.id === estadoDePuntaje(puntaje));
  return (
    <div className="flex items-center gap-5">
      <svg
        width="116"
        height="116"
        viewBox="0 0 116 116"
        role="img"
        aria-label={plantilla(textos.estadoGeneral, { puntaje })}
        className="shrink-0"
      >
        <circle cx="58" cy="58" r={RADIO} fill="none" strokeWidth="9" className="stroke-linea/70" />
        <circle
          cx="58"
          cy="58"
          r={RADIO}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke={estado?.color}
          strokeDasharray={`${(puntaje / 100) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
          transform="rotate(-90 58 58)"
          className="transition-[stroke-dasharray] duration-700"
        />
        <text
          x="58"
          y="58"
          textAnchor="middle"
          className="fill-tinta text-[1.5rem] font-bold tabular-nums"
        >
          {puntaje}
        </text>
        <text x="58" y="78" textAnchor="middle" className="fill-tinta-tenue text-[0.72rem]">
          {textos.puntajeDe}
        </text>
      </svg>
      <div className="min-w-0">
        <h2 className="text-[1.05rem] font-semibold text-tinta">{textos.hoy}</h2>
        {estado && (
          <p
            className="mt-0.5 flex items-center gap-1.5 text-[0.84rem] font-semibold"
            style={{ color: estado.color }}
          >
            <IconoEstado estado={estado.id} color={estado.color} tamano={13} />
            {estado.etiqueta}
          </p>
        )}
        <p className="mt-1.5 text-[0.82rem] leading-relaxed text-tinta-suave">{motivo}</p>
      </div>
    </div>
  );
}
