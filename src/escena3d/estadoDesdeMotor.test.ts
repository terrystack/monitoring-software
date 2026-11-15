import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../config/esquemas';
import { fechaDeDia, generarLecturas } from '../datos/generador';
import { evaluarMotor } from '../motor/estadoZonas';
import { estadoDesdeMotor } from './estadoDesdeMotor';
import { crearMockEstadoCuerpo } from './mockEstadoCuerpo';

const r = cargarConfig();
if (!r.ok) throw new Error('config inválida');
const config = r.config;
const lecturas = generarLecturas(config);

function enDemo(escenarioId: string) {
  const esc = config.escenarios.find((e) => e.id === escenarioId)!;
  const propias = lecturas.filter((l) => l.tripulanteId === esc.tripulanteId);
  return estadoDesdeMotor(evaluarMotor(propias, config, fechaDeDia(config, esc.diaDemo)), config);
}

describe('estadoDesdeMotor', () => {
  it('fatiga: corazón y cerebro en atención y alerta que pulsa en ambos', () => {
    const e = enDemo('multisenal_fatiga');
    expect(e.origen).toBe('motor');
    expect(e.zonas.corazon).toBe('atencion');
    expect(e.zonas.cerebro).toBe('atencion');
    expect(e.alertas).toEqual([['corazon', 'cerebro']]);
    expect(e.tarjetas.corazon.zona).toBe('corazon');
    expect(e.pulsoLpm).toBeGreaterThan(60);
    expect(e.gravedad).toBe(0.38);
  });

  it('evento solar: la fracción de dosis sale de la regla presupuesto', () => {
    const e = enDemo('evento_solar');
    expect(e.zonas.todo_cuerpo).toBe('critico');
    expect(e.fraccionDosis).toBeGreaterThan(0.03);
    expect(e.fraccionDosis).toBeLessThan(0.1);
  });

  it('preparación de aterrizaje: nervios en atención frena los pulsos nerviosos', () => {
    const e = enDemo('preparacion_aterrizaje');
    expect(e.zonas.nervios).toBe('atencion');
    expect(e.velocidadNervios).toBeLessThan(1);
    expect(e.densidadOsea).toBeLessThan(0.85);
  });
});

describe('mock', () => {
  it('cubre todas las zonas con su tarjeta y respeta EstadoZona', () => {
    const e = crearMockEstadoCuerpo(config);
    expect(e.origen).toBe('mock');
    for (const zona of config.zonas) {
      expect(['normal', 'atencion', 'critico', 'sin_dato']).toContain(e.zonas[zona.id]);
      expect(e.tarjetas[zona.id].funcion).toBe(zona.funcion);
    }
  });
});
