import { describe, expect, it } from 'vitest';
import { efectoDeLlamada, efectosDeRespuesta, type IdsValidos } from './acciones';

const ids: IdsValidos = {
  zonas: ['corazon', 'cerebro'],
  indicadores: ['pulso_reposo', 'sueno_horas'],
  capas: ['piel', 'organos'],
  sensores: ['ecg'],
  pasos: 6,
};

describe('acciones del agente sobre el lienzo', () => {
  it('convierte cada visualización válida en su lienzo', () => {
    expect(
      efectoDeLlamada(
        { nombre: 'mostrar_zona_3d', args: { zona: 'corazon', capas: ['organos'] } },
        ids,
      ),
    ).toEqual({
      lienzo: { tipo: 'cuerpo', zona: 'corazon', capas: ['organos'] },
    });
    expect(
      efectoDeLlamada({ nombre: 'mostrar_grafico', args: { indicador: 'sueno_horas' } }, ids),
    ).toEqual({
      lienzo: { tipo: 'grafico', indicador: 'sueno_horas', dias: 14, prediccion: true },
    });
    expect(
      efectoDeLlamada(
        {
          nombre: 'comparar_indicadores',
          args: { indicadores: ['sueno_horas', 'pulso_reposo'], dias: 7 },
        },
        ids,
      ),
    ).toEqual({
      lienzo: { tipo: 'comparacion', indicadores: ['sueno_horas', 'pulso_reposo'], dias: 7 },
    });
    expect(
      efectoDeLlamada({ nombre: 'mostrar_guia_dispositivo', args: { sensor: 'ecg' } }, ids),
    ).toEqual({
      lienzo: { tipo: 'dispositivo', paso: 1, sensor: 'ecg' },
    });
    expect(efectoDeLlamada({ nombre: 'mostrar_resumen', args: {} }, ids)).toEqual({
      lienzo: { tipo: 'resumen' },
    });
    expect(
      efectoDeLlamada({ nombre: 'abrir_pestana', args: { pestana: 'monitoreo' } }, ids),
    ).toEqual({
      pestana: 'monitoreo',
    });
  });

  it('ignora ids desconocidos, días no permitidos y pasos fuera de rango', () => {
    expect(efectoDeLlamada({ nombre: 'mostrar_zona_3d', args: { zona: 'bazo' } }, ids)).toBeNull();
    expect(
      efectoDeLlamada(
        { nombre: 'mostrar_grafico', args: { indicador: 'pulso_reposo', dias: 9 } },
        ids,
      ),
    ).toBeNull();
    expect(
      efectoDeLlamada({ nombre: 'mostrar_guia_dispositivo', args: { paso: 9 } }, ids),
    ).toBeNull();
    expect(
      efectoDeLlamada({ nombre: 'abrir_pestana', args: { pestana: 'ajustes' } }, ids),
    ).toBeNull();
  });

  it('de una respuesta toma el primer lienzo válido y la pestaña pedida', () => {
    expect(
      efectosDeRespuesta(
        [
          { nombre: 'mostrar_zona_3d', args: { zona: 'bazo' } },
          { nombre: 'mostrar_grafico', args: { indicador: 'pulso_reposo', dias: 30 } },
          { nombre: 'mostrar_resumen', args: {} },
        ],
        ids,
      ),
    ).toEqual({
      lienzo: { tipo: 'grafico', indicador: 'pulso_reposo', dias: 30, prediccion: true },
      pestana: undefined,
    });
  });
});
