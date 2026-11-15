import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cargarConfig } from '../../config/esquemas';
import { zonaDeMalla } from '../interaccion/zonaDeMalla';

const r = cargarConfig();
if (!r.ok) throw new Error('config inválida');
const { zonas } = r.config;
const carpeta = resolve(__dirname, '../../../public/modelos');
const glb = resolve(carpeta, 'cuerpo.glb');

/** Lee el bloque JSON de un .glb (cabecera de 12 bytes + cabecera de bloque de 8). */
function jsonDeGlb(ruta: string) {
  const b = readFileSync(ruta);
  const largo = b.readUInt32LE(12);
  return JSON.parse(b.subarray(20, 20 + largo).toString('utf8')) as {
    nodes: { name: string; mesh?: number }[];
    extensionsRequired?: string[];
  };
}

describe.skipIf(!existsSync(glb))('cuerpo.glb generado (npm run modelos)', () => {
  const json = jsonDeGlb(glb);
  const nombres = json.nodes.filter((n) => n.mesh !== undefined).map((n) => n.name);

  it('cada malla tiene un name único del contrato 4.3', () => {
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const n of nombres) expect(zonaDeMalla(n, zonas), n).not.toBeNull();
  });

  it('cubre todas las zonas (el halo es un efecto aparte)', () => {
    const cubiertas = new Set(nombres.map((n) => zonaDeMalla(n, zonas)));
    for (const z of zonas) if (z.capa !== 'halo') expect(cubiertas.has(z.id), z.id).toBe(true);
  });

  it('pesa poco y usa Draco con decodificador local', () => {
    expect(readFileSync(glb).byteLength).toBeLessThan(6e6);
    expect(json.extensionsRequired).toContain('KHR_draco_mesh_compression');
    expect(existsSync(resolve(carpeta, '../draco/draco_decoder.wasm'))).toBe(true);
  });

  it('incluye recorridos de flujo y créditos de las tres fuentes', () => {
    const flujo = JSON.parse(readFileSync(resolve(carpeta, 'flujo.json'), 'utf8'));
    expect(flujo.recorridos.length).toBeGreaterThan(20);
    const creditos = JSON.parse(readFileSync(resolve(carpeta, 'creditos.json'), 'utf8'));
    expect(creditos.creditos.map((c: { licencia: string }) => c.licencia)).toEqual([
      'CC BY-SA 4.0',
      'CC BY-SA 2.1 JP',
      'CC0 1.0',
    ]);
  });
});
