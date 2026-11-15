import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../../config/esquemas';
import type { EstadoMotor } from '../../datos/tipos';
import { modeloDe, posicionSensor, puntosDe } from './modelos';
import {
  dispositivoConSensores,
  dispositivoDeSensor,
  dispositivosConSensores,
  estadoSensor,
  sensorParaIndicadores,
  valorSensor,
} from './estadoSensor';
import {
  CARA,
  DEDO_INDICE_IZQ,
  medirPerfil,
  PERFIL_CABEZA,
  PERFIL_TORSO,
  puntoSuperficie,
  seccionEn,
} from './medidas';
import { CAMARA, CARCASA, MASCARA, PUERTO, puntoMascara, rutaUmbilical, T } from './puma/geometria';

const resultado = cargarConfig();
if (!resultado.ok) throw new Error('config inválida');
const config = resultado.config;
const lista = dispositivosConSensores(config);

describe('dispositivos de la pestaña Medición', () => {
  it('son Astroskin, PUMA y oxímetro, con pasos que apuntan a sensores válidos', () => {
    expect(lista.map((d) => d.id)).toEqual(['astroskin', 'puma', 'oximetro']);
    for (const d of lista) {
      const ids = new Set(d.sensores!.map((s) => s.id));
      for (const p of d.pasos) if (p.sensor) expect(ids.has(p.sensor)).toBe(true);
      expect(d.ficha?.mide.length).toBeGreaterThan(0);
      expect(Object.keys(d.partes ?? {}).length).toBeGreaterThan(3);
    }
  });

  it('elige el dispositivo pedido o el primero', () => {
    expect(dispositivoConSensores(config, 'puma')?.id).toBe('puma');
    expect(dispositivoConSensores(config, 'no_existe')?.id).toBe('astroskin');
    expect(dispositivoConSensores(config)?.id).toBe('astroskin');
    expect(dispositivoDeSensor(config, 'pinza')?.id).toBe('oximetro');
  });

  it('cada sensor queda fuera de la piel y cada pieza tiene posición', () => {
    for (const d of lista) {
      const piezas = puntosDe(modeloDe(d), PERFIL_TORSO);
      for (const s of d.sensores!) {
        if (s.posicion.tipo === 'pieza') expect(piezas[s.posicion.pieza]).toBeDefined();
        const p = posicionSensor(s, PERFIL_TORSO, PERFIL_CABEZA, piezas);
        if (s.posicion.tipo === 'torso' || s.posicion.tipo === 'cabeza') {
          const perfil = s.posicion.tipo === 'torso' ? PERFIL_TORSO : PERFIL_CABEZA;
          const sec = seccionEn(perfil, p.y);
          expect(Math.hypot(p.x / sec.rx, (p.z - sec.cz) / sec.rz)).toBeGreaterThan(1);
        }
        expect(Number.isFinite(p.x + p.y + p.z)).toBe(true);
      }
    }
  });

  it('el estado del sensor es el peor de sus indicadores y sin motor no hay dato', () => {
    const ecg = dispositivoConSensores(config, 'astroskin')!.sensores!.find((s) => s.id === 'ecg')!;
    expect(estadoSensor(ecg, null)).toBe('sin_dato');
    const motor = {
      indicadores: Object.fromEntries(
        ecg.indicadores.map((id, i) => [id, { estado: i === 0 ? 'normal' : 'critico', valor: 1 }]),
      ),
    } as unknown as EstadoMotor;
    expect(estadoSensor(ecg, motor)).toBe('critico');
    expect(valorSensor(ecg, motor, config)).not.toBeNull();
  });

  it('encuentra el sensor y el dispositivo que miden un indicador', () => {
    expect(sensorParaIndicadores(config, ['vo2'])).toMatchObject({ id: 'o2', dispositivo: 'puma' });
    expect(sensorParaIndicadores(config, ['frecuencia_respiratoria'])?.dispositivo).toBe(
      'astroskin',
    );
  });
});

describe('medidas del cuerpo', () => {
  it('interpola las secciones y satura en los extremos', () => {
    const a = seccionEn(PERFIL_TORSO, 1.23);
    expect(a.rx).toBeGreaterThan(0.144);
    expect(a.rx).toBeLessThan(0.158);
    expect(seccionEn(PERFIL_TORSO, 0.5).rx).toBe(PERFIL_TORSO[0].rx);
  });

  it('el punto a 0° está al frente y a +90° a la izquierda', () => {
    const frente = puntoSuperficie(PERFIL_TORSO, 1.3, 0);
    const izq = puntoSuperficie(PERFIL_TORSO, 1.3, 90);
    expect(frente.z).toBeGreaterThan(0.1);
    expect(Math.abs(frente.x)).toBeLessThan(1e-9);
    expect(izq.x).toBeGreaterThan(0.15);
  });

  it('sin malla de piel devuelve el perfil por defecto', () => {
    expect(medirPerfil(undefined, PERFIL_TORSO)).toBe(PERFIL_TORSO);
  });
});

describe('geometría de PUMA', () => {
  it('la máscara cubre del puente nasal al mentón y queda delante de la nariz', () => {
    const vertice = puntoMascara(0, 0);
    expect(vertice.z).toBeGreaterThan(CARA.nariz.z + 0.02);
    expect(MASCARA.cy + MASCARA.ay).toBeGreaterThan(CARA.nariz.y + 0.04);
    expect(MASCARA.cy - MASCARA.ay).toBeLessThan(CARA.menton.y);
  });
  it('la barra en T está bajo el mentón, delante del puerto y más ancha que la cara', () => {
    expect(T.barra[2].y).toBeLessThan(PUERTO.centro.y);
    expect(T.barra[2].z).toBeGreaterThan(PUERTO.centro.z);
    expect(T.barra[4].x - T.barra[0].x).toBeGreaterThan(0.14);
  });
  it('lados asimétricos: cámara de flujo a la izquierda (+X), carcasa a la derecha (−X)', () => {
    expect(CAMARA.hasta.x).toBeGreaterThan(0.1);
    expect(CAMARA.hasta.z).toBeLessThan(CAMARA.desde.z);
    expect(CARCASA.centro.x).toBeLessThan(-0.1);
  });
  it('el umbilical baja por la espalda hasta la cadera izquierda', () => {
    const ruta = rutaUmbilical(PERFIL_TORSO);
    const fin = ruta[ruta.length - 1];
    expect(fin.y).toBeLessThan(1.0);
    expect(fin.x).toBeGreaterThan(0.1);
    expect(Math.min(...ruta.map((p) => p.z))).toBeLessThan(-0.08);
  });
});

describe('oxímetro', () => {
  it('su sensor queda junto al índice izquierdo', () => {
    const p = puntosDe('oximetro', PERFIL_TORSO).pinza;
    expect(p.distanceTo(DEDO_INDICE_IZQ.centro)).toBeLessThan(0.05);
  });
});
