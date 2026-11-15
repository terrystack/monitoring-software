import type { ConfigAyni, Dispositivo } from '../../config/esquemas';
import type { EstadoMotor, EstadoZona } from '../../datos/tipos';
import { conUnidad } from '../../motor/frases';
import { peorEstado } from '../../motor/reglas';

export type SensorDispositivo = NonNullable<Dispositivo['sensores']>[number];

/** Primer dispositivo con sensores (el chaleco AYNI). */
export function dispositivoConSensores(config: ConfigAyni): Dispositivo | undefined {
  return config.dispositivos.find((d) => d.sensores?.length);
}

/** Peor estado de los indicadores que mide el sensor (sin indicadores: sin dato). */
export function estadoSensor(sensor: SensorDispositivo, motor: EstadoMotor | null): EstadoZona {
  return peorEstado(sensor.indicadores.map((i) => motor?.indicadores[i]?.estado ?? 'sin_dato'));
}

/** Valor actual del primer indicador del sensor con lectura ("69 lpm"), o null. */
export function valorSensor(
  sensor: SensorDispositivo,
  motor: EstadoMotor | null,
  config: ConfigAyni,
): string | null {
  for (const id of sensor.indicadores) {
    const ev = motor?.indicadores[id];
    const ind = config.indicadores.find((i) => i.id === id);
    if (ev && ind) return conUnidad(ev.valor, ind.unidad, config.frases);
  }
  return null;
}

/** Sensor del chaleco que cubre alguno de los indicadores dados (agenda, "Medir ahora"). */
export function sensorParaIndicadores(
  config: ConfigAyni,
  indicadores: string[],
): SensorDispositivo | undefined {
  return dispositivoConSensores(config)?.sensores?.find((s) =>
    s.indicadores.some((i) => indicadores.includes(i)),
  );
}
