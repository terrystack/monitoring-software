import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../src/config/esquemas';
import { zonaDeMalla } from '../src/escena3d/interaccion/zonaDeMalla';
import mapeoJson from './mallas-anatomia.json';
import { clasificar, esquemaMapeo, expandirReglas } from './mapeoAnatomia';

const r = cargarConfig();
if (!r.ok) throw new Error('config inválida');
const { zonas } = r.config;
const mapeo = esquemaMapeo.parse(mapeoJson);
const reglas = expandirReglas(mapeo);
const nombreDe = (estructura: string, fuente: string) =>
  clasificar(estructura, fuente, reglas, mapeo.excluir)?.nombre ?? null;

describe('mallas-anatomia.json', () => {
  it('cada nombre de contrato casa con una zona de zonas.json y no se repite', () => {
    const nombres = reglas.map((x) => x.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const n of nombres) expect(zonaDeMalla(n, zonas), n).not.toBeNull();
  });

  it('todas las zonas tienen al menos una malla (salvo el halo, que es un efecto)', () => {
    const cubiertas = new Set(reglas.map((x) => zonaDeMalla(x.nombre, zonas)));
    for (const z of zonas) if (z.capa !== 'halo') expect(cubiertas.has(z.id), z.id).toBe(true);
  });

  it('cada regla apunta a una fuente con su crédito', () => {
    for (const regla of mapeo.mallas) {
      const fuente = mapeo.fuentes[regla.fuente];
      expect(fuente, regla.nombre).toBeDefined();
      expect(mapeo.creditos[fuente.credito], regla.nombre).toBeDefined();
    }
  });

  it('expande los lados (.l = izquierdo, +X)', () => {
    expect(nombreDe('Femur.l', 'esqueleto')).toBe('hueso_femur_izq');
    expect(nombreDe('Femur.r', 'esqueleto')).toBe('hueso_femur_der');
    expect(nombreDe('Left subclavian artery', 'cardiovascular')).toBe('vaso_arteria_brazo_izq');
    expect(nombreDe('Superior lobe of right lung', 'visceras')).toBe('organo_pulmon_der');
    expect(nombreDe('Gluteus maximus muscle.r', 'muscular')).toBe('musculo_gluteo_der');
  });

  it('gana la primera regla: lo específico antes que lo general', () => {
    expect(nombreDe('Right coronary artery', 'cardiovascular')).toBe('organo_corazon');
    expect(nombreDe('Thoracic aorta', 'cardiovascular')).toBe('vaso_aorta');
    expect(nombreDe('Femoral artery.l', 'cardiovascular')).toBe('vaso_arteria_pierna_izq');
    expect(nombreDe('Left renal artery', 'cardiovascular')).toBe('vaso_arteria_tronco');
    expect(nombreDe('Rectus abdominis muscle.l', 'muscular')).toBe('musculo_abdominal');
  });

  it('evita coincidencias por subcadena (maxillary ≠ axillary, segmental ≠ mental)', () => {
    expect(nombreDe('Maxillary artery.l', 'cardiovascular')).toBe('vaso_arteria_cabeza');
    expect(nombreDe('Maxillary nerve.l', 'nervioso')).toBe('nervio_periferico_craneal');
    expect(nombreDe('Anterior basal segmental artery of left lung', 'cardiovascular')).toBe(
      'vaso_arteria_tronco',
    );
    expect(nombreDe('Artery of pterygoid canal.l', 'cardiovascular')).toBe('vaso_arteria_cabeza');
    expect(nombreDe('(Opponens digiti minimi muscle of foot).l', 'muscular')).toBe(
      'musculo_pierna_izq',
    );
    expect(nombreDe('Aortic arch', 'cardiovascular')).toBe('vaso_aorta');
  });

  it('excluye lo que no es CC BY-SA y el ruido (fascias, bolsas)', () => {
    expect(nombreDe('Kidney.l', 'visceras')).toBeNull();
    expect(nombreDe('Cochlear nerve.l', 'nervioso')).toBeNull();
    expect(nombreDe('Incus.l', 'esqueleto')).toBeNull();
    expect(nombreDe('Intrarenal arteries of left kidney', 'cardiovascular')).toBeNull();
    expect(nombreDe('Deltoid fascia.l', 'muscular')).toBeNull();
    expect(nombreDe('Superior frontal gyrus.l', 'nervioso')).toBeNull();
  });
});
