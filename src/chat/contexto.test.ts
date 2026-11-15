import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../config/esquemas';
import { configEnIdioma } from '../config/idioma';
import { generarLecturas } from '../datos/generador';
import { evaluarSeleccion, resolverSeleccion } from '../estado/seleccion';
import { construirContexto } from './contexto';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config = resultado.config;
const lecturas = generarLecturas(config);
const seleccion = resolverSeleccion(config, { tripulanteId: null, entornoId: null, dia: null });
const motor = evaluarSeleccion(lecturas, config, seleccion);

const base = {
  config,
  seleccion,
  motor,
  lecturas,
  idioma: 'es' as const,
  pestanaAnterior: 'cuerpo3d',
  zonaSeleccionada: null,
  lienzo: { tipo: 'vacio' as const },
  ahoraHHMM: '12:00',
};

describe('contexto del agente', () => {
  it('se construye sin red con los datos del motor del tripulante activo', () => {
    const c = construirContexto(base);
    expect(c.tripulante).toMatchObject({ id: 'A01', diaMision: 139 });
    expect(c.zonas.find((z) => z.id === 'corazon')?.estado).toBe('atencion');
    expect(c.alertas.map((a) => a.id)).toEqual(['fatiga']);
    const pulso = c.indicadores.find((i) => i.id === 'pulso_reposo')!;
    expect(pulso.valor).toBe(Math.round(motor.indicadores.pulso_reposo.valor * 10) / 10);
    expect(pulso.ultimos14).toHaveLength(14);
    expect(pulso.prediccion7).toHaveLength(7);
    expect(pulso.normal!.inf).toBeLessThan(pulso.normal!.sup);
    expect(c.limites.radiacionCarreraMSv).toBe(600);
  });

  it('solo trae tarjetas de zonas fuera de lo normal y de la seleccionada', () => {
    const c = construirContexto({ ...base, zonaSeleccionada: 'huesos' });
    expect(Object.keys(c.tarjetas).sort()).toEqual(['cerebro', 'corazon', 'huesos']);
  });

  it('no incluye datos de otros tripulantes', () => {
    const c = construirContexto(base);
    const texto = JSON.stringify(c);
    for (const otro of config.tripulantes.tripulantes.filter((t) => t.id !== 'A01'))
      expect(texto).not.toContain(otro.nombre);
  });

  it('pesa menos de 25 KB y respeta el idioma', () => {
    expect(JSON.stringify(construirContexto(base)).length).toBeLessThan(25_000);
    const en = configEnIdioma(config, 'en');
    const c = construirContexto({
      ...base,
      config: en,
      motor: evaluarSeleccion(lecturas, en, seleccion),
      idioma: 'en',
    });
    expect(c.zonas.find((z) => z.id === 'corazon')?.nombre).toBe('Heart');
  });
});
