import type { EstadoZona } from '../datos/tipos';

interface Props {
  estado: EstadoZona;
  color: string;
  tamano?: number;
}

/** Ícono de estado: forma distinta por estado para no depender solo del color. */
export function IconoEstado({ estado, color, tamano = 14 }: Props) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      {estado === 'normal' && (
        <>
          <circle cx="8" cy="8" r="7" fill={color} />
          <path d="M4.5 8.2l2.3 2.3 4.7-4.9" stroke="#050816" strokeWidth="1.8" fill="none" />
        </>
      )}
      {estado === 'atencion' && (
        <>
          <path d="M8 1.2l7 13H1z" fill={color} />
          <path d="M8 5.5v4.2M8 11.4v1.3" stroke="#050816" strokeWidth="1.8" />
        </>
      )}
      {estado === 'critico' && (
        <>
          <path d="M5 1h6l4 4v6l-4 4H5l-4-4V5z" fill={color} />
          <path d="M8 4.3v5M8 11v1.4" stroke="#050816" strokeWidth="1.9" />
        </>
      )}
      {estado === 'sin_dato' && (
        <>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke={color} strokeWidth="1.6" />
          <path d="M5 8h6" stroke={color} strokeWidth="1.8" />
        </>
      )}
    </svg>
  );
}
