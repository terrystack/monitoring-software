import type { EstadoMotor, EstadoZona } from '../datos/tipos';

const RESTA_ATENCION = 10;
const RESTA_CRITICO = 25;
const RESTA_ALERTA = 5;
const UMBRAL_NORMAL = 80;
const UMBRAL_ATENCION = 55;

/**
 * Estado general 0–100 del resumen de hoy (AYNI_FUSION 6.2):
 * 100 − 10 × zonas en atención − 25 × zonas en crítico − 5 × alertas multiseñal, mínimo 0.
 */
export function puntajeGeneral(motor: Pick<EstadoMotor, 'zonas' | 'alertas'>): number {
  const estados = Object.values(motor.zonas).map((z) => z.estado);
  const atencion = estados.filter((e) => e === 'atencion').length;
  const critico = estados.filter((e) => e === 'critico').length;
  return Math.max(
    0,
    100 - RESTA_ATENCION * atencion - RESTA_CRITICO * critico - RESTA_ALERTA * motor.alertas.length,
  );
}

/** Color del puntaje: ≥ 80 normal, ≥ 55 atención, < 55 crítico. */
export function estadoDePuntaje(puntaje: number): EstadoZona {
  return puntaje >= UMBRAL_NORMAL ? 'normal' : puntaje >= UMBRAL_ATENCION ? 'atencion' : 'critico';
}

/** Zonas fuera de lo normal, peores primero, para el motivo del resumen. */
export function zonasFuera(motor: Pick<EstadoMotor, 'zonas'>): string[] {
  const criticas = Object.entries(motor.zonas).filter(([, z]) => z.estado === 'critico');
  const atencion = Object.entries(motor.zonas).filter(([, z]) => z.estado === 'atencion');
  return [...criticas, ...atencion].map(([id]) => id);
}
