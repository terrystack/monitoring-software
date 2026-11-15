import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../../config/esquemas';
import type { EstadoMotor } from '../../datos/tipos';
import {
  dispositivoConSensores,
  estadoSensor,
  sensorParaIndicadores,
  valorSensor,
} from './estadoSensor';
import { ALTURA_CHALECO, posicionSensor } from './torso';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config = resultado.config;
const chaleco = dispositivoConSensores(config)!;

describe('chaleco AYNI', () => {
  it('existe con sensores y cada paso apunta a un sensor válido', () => {
    expect(chaleco.id).toBe('chaleco_ayni');
    const ids = new Set(chaleco.sensores!.map((s) => s.id));
    for (const p of chaleco.pasos) if (p.sensor) expect(ids.has(p.sensor)).toBe(true);
  });

  it('los sensores del torso quedan dentro de la altura del chaleco y fuera de la piel', () => {
    const medidas = { rx: 0.17, rz: 0.13, cz: 0.01 };
    for (const s of chaleco.sensores!) {
      if (s.posicion.tipo !== 'torso') continue;
      const p = posicionSensor(s, medidas);
      expect(p.y).toBeGreaterThanOrEqual(ALTURA_CHALECO.desde);
      expect(p.y).toBeLessThanOrEqual(ALTURA_CHALECO.hasta);
      const r = Math.hypot(p.x / medidas.rx, (p.z - medidas.cz) / medidas.rz);
      expect(r).toBeGreaterThan(1);
    }
  });

  it('el estado del sensor es el peor de sus indicadores y sin motor no hay dato', () => {
    const ecg = chaleco.sensores!.find((s) => s.indicadores.length > 1) ?? chaleco.sensores![0];
    expect(estadoSensor(ecg, null)).toBe('sin_dato');
    const motor = {
      indicadores: Object.fromEntries(
        ecg.indicadores.map((id, i) => [id, { estado: i === 0 ? 'normal' : 'critico', valor: 1 }]),
      ),
    } as unknown as EstadoMotor;
    expect(estadoSensor(ecg, motor)).toBe(ecg.indicadores.length > 1 ? 'critico' : 'normal');
    expect(valorSensor(ecg, motor, config)).not.toBeNull();
  });

  it('encuentra el sensor que mide un indicador', () => {
    const s = chaleco.sensores![0];
    expect(sensorParaIndicadores(config, [s.indicadores[0]])?.id).toBe(s.id);
    expect(sensorParaIndicadores(config, ['no_existe'])).toBeUndefined();
  });
});
