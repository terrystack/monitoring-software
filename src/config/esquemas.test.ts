import { describe, expect, it } from 'vitest';
import { cargarConfig, configCruda, formatearErrorConfig, validarConfig } from './esquemas';

const copia = () => structuredClone(configCruda) as unknown as Record<string, unknown>;

describe('esquemas de configuración', () => {
  it('la configuración del repositorio es válida', () => {
    const r = cargarConfig();
    if (!r.ok) throw new Error(r.errores.map(formatearErrorConfig).join('\n'));
    expect(r.config.indicadores).toHaveLength(28);
    expect(r.config.zonas).toHaveLength(11);
    expect(r.config.escenarios.map((e) => e.id)).toEqual([
      'normal',
      'deterioro_sueno',
      'multisenal_fatiga',
      'co2_alto_cefalea',
      'evento_solar',
      'preparacion_aterrizaje',
    ]);
  });

  it('un tipo de regla desconocido da un error con archivo y ruta', () => {
    const crudo = copia();
    const indicadores = crudo.indicadores as { reglas: { tipo: string }[] }[];
    indicadores[0].reglas[0].tipo = 'inventada';
    const r = validarConfig(crudo as never);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(formatearErrorConfig(r.errores[0])).toBe(
      'indicadores.json > [0] (pulso_reposo).reglas[0].tipo: tipo no válido; opciones: linea_base, limite_fijo, tendencia, porcentaje_cambio, meta_diaria, presupuesto',
    );
  });

  it('rechaza campos que no están en el contrato', () => {
    const crudo = copia();
    (crudo.zonas as Record<string, unknown>[])[0].color = 'rojo';
    const r = validarConfig(crudo as never);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores[0]).toMatchObject({ archivo: 'zonas.json', ruta: '[0] (cerebro)' });
    expect(r.errores[0].mensaje).toContain('color');
  });

  it('detecta referencias rotas entre archivos', () => {
    const crudo = copia();
    (crudo.indicadores as { zonas: string[] }[])[0].zonas = ['bazo'];
    const r = validarConfig(crudo as never);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(formatearErrorConfig(r.errores[0])).toBe(
      'indicadores.json > [0] (pulso_reposo).zonas[0]: zona "bazo" no existe en zonas.json',
    );
  });

  it('exige valorFinal en las alteraciones en rampa', () => {
    const crudo = copia();
    const escenarios = crudo.escenarios as { alteraciones: Record<string, unknown>[] }[];
    delete escenarios[1].alteraciones[0].valorFinal;
    const r = validarConfig(crudo as never);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores[0]).toMatchObject({
      archivo: 'escenarios.json',
      ruta: '[1] (deterioro_sueno).alteraciones[0].valorFinal',
      mensaje: 'el modo rampa requiere valorFinal',
    });
  });
});
