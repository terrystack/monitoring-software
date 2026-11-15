import type { ConfigAyni, Dispositivo } from '../../config/esquemas';
import type { EstadoMotor, EstadoZona } from '../../datos/tipos';
import { conUnidad } from '../../motor/frases';
import { peorEstado } from '../../motor/reglas';

export type SensorDispositivo = NonNullable<Dispositivo['sensores']>[number];

/** Dispositivos con sensores y modelo 3D (PUMA, arnés ECG y diadema EEG). */
export function dispositivosConSensores(config: ConfigAyni): Dispositivo[] {
  return config.dispositivos.filter((d) => d.sensores?.length);
}

/** Dispositivo con sensores pedido (o el primero si no existe o no se indica). */
export function dispositivoConSensores(
  config: ConfigAyni,
  id?: string | null,
): Dispositivo | undefined {
  const lista = dispositivosConSensores(config);
  return lista.find((d) => d.id === id) ?? lista[0];
}

/** Dispositivo que contiene un sensor. */
export function dispositivoDeSensor(config: ConfigAyni, sensor: string): Dispositivo | undefined {
  return dispositivosConSensores(config).find((d) => d.sensores?.some((s) => s.id === sensor));
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

/** Sensor (y su dispositivo) que cubre alguno de los indicadores dados (agenda, "Medir ahora"). */
export function sensorParaIndicadores(
  config: ConfigAyni,
  indicadores: string[],
): (SensorDispositivo & { dispositivo: string }) | undefined {
  for (const d of dispositivosConSensores(config)) {
    const s = d.sensores?.find((x) => x.indicadores.some((i) => indicadores.includes(i)));
    if (s) return { ...s, dispositivo: d.id };
  }
  return undefined;
}
