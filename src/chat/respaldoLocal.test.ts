import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../config/esquemas';
import { configEnIdioma } from '../config/idioma';
import { generarLecturas } from '../datos/generador';
import { evaluarSeleccion, resolverSeleccion } from '../estado/seleccion';
import { construirContexto } from './contexto';
import { responderLocal } from './respaldoLocal';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const base = resultado.config;
const lecturas = generarLecturas(base);
const seleccion = resolverSeleccion(base, { tripulanteId: null, entornoId: null, dia: null });

function contexto(idioma: 'es' | 'en') {
  const config = configEnIdioma(base, idioma);
  const motor = evaluarSeleccion(lecturas, config, seleccion);
  return {
    config,
    c: construirContexto({
      config,
      seleccion,
      motor,
      lecturas,
      idioma,
      pestanaAnterior: 'agente',
      zonaSeleccionada: null,
      lienzo: { tipo: 'vacio' },
      ahoraHHMM: '12:00',
    }),
  };
}

const es = contexto('es');
const preguntar = (p: string) => responderLocal(p, es.c, es.config);

describe('respaldo local del agente', () => {
  it('¿Cómo estoy hoy? → puntaje, zonas fuera y resumen', () => {
    const r = preguntar('¿Cómo estoy hoy?');
    expect(r.texto).toContain(String(es.c.puntaje));
    expect(r.texto).toContain('Corazón');
    expect(r.llamadas).toEqual([{ nombre: 'mostrar_resumen', args: {} }]);
  });

  it('¿Por qué mi corazón está en ámbar? → qué cambió, aviso médico y zona 3D', () => {
    const r = preguntar('¿Por qué mi corazón está en ámbar?');
    expect(r.texto).toContain('Corazón: Atención');
    expect(r.texto).toContain('médico de vuelo');
    expect(r.llamadas[0]).toEqual({ nombre: 'mostrar_zona_3d', args: { zona: 'corazon' } });
  });

  it('Muéstrame mi sueño de las últimas 2 semanas → gráfico de 14 días con su normal', () => {
    const r = preguntar('Muéstrame mi sueño de las últimas 2 semanas');
    expect(r.llamadas[0]).toEqual({
      nombre: 'mostrar_grafico',
      args: { indicador: 'sueno_horas', dias: 14, prediccion: true },
    });
    expect(r.texto).toContain('Horas de sueño hoy');
  });

  it('¿Cómo me pongo el chaleco? → paso 1 de la guía', () => {
    const r = preguntar('¿Cómo me pongo el chaleco?');
    expect(r.llamadas[0]).toEqual({ nombre: 'mostrar_guia_dispositivo', args: { paso: 1 } });
  });

  it('¿Debo avisar al médico de vuelo? → avisos de las zonas fuera de lo normal', () => {
    const r = preguntar('¿Debo avisar al médico de vuelo?');
    expect(r.texto).toContain(es.c.tarjetas.corazon.avisoMedico);
  });

  it('síntomas graves → solo el protocolo de emergencia', () => {
    const r = preguntar('Me duele el pecho y me falta el aire');
    expect(r.texto).toBe(es.config.escena.respaldo.emergencia);
    expect(r.llamadas).toEqual([]);
  });

  it('sueño y pulso → comparación sin afirmar causa', () => {
    const r = preguntar('¿Mi sueño tiene que ver con mi pulso?');
    expect(r.llamadas[0].nombre).toBe('comparar_indicadores');
    expect(r.llamadas[0].args.indicadores).toEqual(
      expect.arrayContaining(['sueno_horas', 'pulso_reposo']),
    );
  });

  it('oxímetro con un valor raro → paso del oxímetro, error común y repetir', () => {
    const r = preguntar('El oxímetro marca 88 %, ¿está bien?');
    expect(r.llamadas[0]).toEqual({
      nombre: 'mostrar_guia_dispositivo',
      args: { paso: 3, sensor: 'oximetro' },
    });
    expect(r.texto).toContain(es.config.escena.respaldo.repetirMedicion);
  });

  it('radiación y CO₂ → valor frente a su límite con la fuente', () => {
    expect(preguntar('¿Cuánta radiación llevo?').texto).toMatch(/600 mSv/);
    expect(preguntar('¿El CO₂ de la cabina está bien?').texto).toContain('NASA-STD-3001');
  });

  it('agenda → siguiente tarea o agenda completa y abre Medición', () => {
    const r = preguntar('¿Qué tengo que medir ahora?');
    expect(r.llamadas[0]).toEqual({ nombre: 'abrir_pestana', args: { pestana: 'medicion' } });
  });

  it('trampas: no receta, no inventa, no diagnostica, sin internet, solo el tripulante activo', () => {
    const t = es.config.escena.respaldo;
    expect(preguntar('¿Qué medicamento tomo para dormir?').texto).toContain(t.noMedicamento);
    const inventa = preguntar('Invéntame la presión de ayer');
    expect(inventa.texto).toContain('No invento');
    expect(inventa.llamadas[0].nombre).toBe('mostrar_grafico');
    expect(preguntar('¿Tengo una enfermedad del corazón?').texto.startsWith(t.noDiagnostico)).toBe(
      true,
    );
    const web = preguntar('Busca en internet qué es la HRV');
    expect(web.texto).toContain(t.sinInternet);
    expect(web.llamadas[0].args).toMatchObject({ indicador: 'hrv' });
    expect(preguntar('¿Cómo está el ingeniero Kenji?').texto).toContain(es.c.tripulante.nombre);
  });

  it('ánimo bajo → empatía y gráfico de ánimo', () => {
    const r = preguntar('Estoy desanimado');
    expect(r.texto).toContain(es.config.escena.respaldo.animo);
    expect(r.llamadas[0].args).toMatchObject({ indicador: es.config.escena.indicadorAnimo });
  });

  it('responde en inglés con la configuración en inglés', () => {
    const en = contexto('en');
    const r = responderLocal('How is my sleep this week?', en.c, en.config);
    expect(r.texto).toContain('Hours of sleep today');
    expect(r.llamadas[0].args).toMatchObject({ indicador: 'sueno_horas', dias: 7 });
  });
});
