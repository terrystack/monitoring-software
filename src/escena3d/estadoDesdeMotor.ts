import type { ConfigAyni } from '../config/esquemas';
import type { EstadoMotor, EstadoZona, TarjetaAccion } from '../datos/tipos';

/** Lo que la escena necesita para colorear y animar el cuerpo. */
export interface EstadoCuerpo {
  origen: 'mock' | 'motor';
  zonas: Record<string, EstadoZona>;
  tarjetas: Record<string, TarjetaAccion>;
  /** Latido del corazón 3D. */
  pulsoLpm: number;
  /** Dosis acumulada / límite del presupuesto (0 = nada, 1 = límite). */
  fraccionDosis: number;
  /** Multiplicador de la velocidad de los pulsos nerviosos (1 = normal). */
  velocidadNervios: number;
  /** Opacidad del hueso (más translúcido = más pérdida estimada). */
  densidadOsea: number;
  /** Gravedad del entorno en g (0 = microgravedad). */
  gravedad: number;
  /** Zonas de cada alerta multiseñal activa (pulsan a la vez). */
  alertas: string[][];
}

const PULSO_POR_DEFECTO = 64;

const VELOCIDAD_NERVIOS: Record<EstadoZona, number> = {
  normal: 1,
  atencion: 0.6,
  critico: 0.35,
  sin_dato: 1,
};

const DENSIDAD_OSEA: Record<EstadoZona, number> = {
  normal: 0.85,
  atencion: 0.6,
  critico: 0.4,
  sin_dato: 0.7,
};

export function velocidadNerviosDe(estado: EstadoZona | undefined): number {
  return VELOCIDAD_NERVIOS[estado ?? 'sin_dato'];
}

export function densidadOseaDe(estado: EstadoZona | undefined): number {
  return DENSIDAD_OSEA[estado ?? 'sin_dato'];
}

/** Límite del presupuesto de radiación configurado para la zona `todo_cuerpo`. */
function presupuestoRadiacion(config: ConfigAyni): { indicador: string; limite: number } | null {
  for (const ind of config.indicadores) {
    if (!ind.zonas.includes('todo_cuerpo')) continue;
    const regla = ind.reglas.find((r) => r.tipo === 'presupuesto');
    if (regla && regla.tipo === 'presupuesto') return { indicador: ind.id, limite: regla.limite };
  }
  return null;
}

export function gravedadDe(config: ConfigAyni, tripulanteId: string): number {
  const trip = config.tripulantes.tripulantes.find((t) => t.id === tripulanteId);
  return config.entornos.find((e) => e.id === trip?.entorno)?.gravedad ?? 0;
}

/** Traduce la salida del motor al estado visual del cuerpo (función pura). */
export function estadoDesdeMotor(motor: EstadoMotor, config: ConfigAyni): EstadoCuerpo {
  const zonas = Object.fromEntries(Object.entries(motor.zonas).map(([id, z]) => [id, z.estado]));
  const tarjetas = Object.fromEntries(
    Object.entries(motor.zonas).map(([id, z]) => [id, z.tarjeta]),
  );
  const presupuesto = presupuestoRadiacion(config);
  const dosis = presupuesto ? motor.indicadores[presupuesto.indicador]?.valor : undefined;
  return {
    origen: 'motor',
    zonas,
    tarjetas,
    pulsoLpm: motor.indicadores.pulso_reposo?.valor ?? PULSO_POR_DEFECTO,
    fraccionDosis: presupuesto && dosis !== undefined ? Math.max(0, dosis / presupuesto.limite) : 0,
    velocidadNervios: velocidadNerviosDe(zonas.nervios),
    densidadOsea: densidadOseaDe(zonas.huesos),
    gravedad: gravedadDe(config, motor.tripulanteId),
    alertas: motor.alertas.map((a) => a.zonas),
  };
}
