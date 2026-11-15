import type { ConfigAyni } from '../config/esquemas';
import type { EstadoZona } from '../datos/tipos';
import { construirTarjeta } from '../motor/tarjetaAccion';
import {
  densidadOseaDe,
  gravedadDe,
  velocidadNerviosDe,
  type EstadoCuerpo,
} from './estadoDesdeMotor';

/** Estado de ejemplo: fatiga multiseñal (corazón y cerebro en atención). */
export const MOCK_ZONAS: Record<string, EstadoZona> = {
  cerebro: 'atencion',
  nervios: 'normal',
  corazon: 'atencion',
  pulmones: 'normal',
  metabolismo: 'normal',
  rinones: 'sin_dato',
  vascular: 'normal',
  huesos: 'normal',
  musculos: 'normal',
  piel_inmune: 'normal',
  todo_cuerpo: 'normal',
};

/** Las tarjetas del mock usan los textos de configuración, sin mediciones. */
export function crearMockEstadoCuerpo(config: ConfigAyni): EstadoCuerpo {
  const tarjetas = Object.fromEntries(
    config.zonas.map((zona) => [
      zona.id,
      construirTarjeta({
        zona,
        estado: MOCK_ZONAS[zona.id] ?? 'sin_dato',
        indicadores: config.indicadores,
        evaluaciones: {},
      }),
    ]),
  );
  return {
    origen: 'mock',
    zonas: MOCK_ZONAS,
    tarjetas,
    pulsoLpm: 72,
    fraccionDosis: 0.08,
    velocidadNervios: velocidadNerviosDe(MOCK_ZONAS.nervios),
    densidadOsea: densidadOseaDe(MOCK_ZONAS.huesos),
    gravedad: gravedadDe(config, config.tripulantes.tripulantes[0]?.id ?? ''),
    alertas: [['corazon', 'cerebro']],
  };
}
