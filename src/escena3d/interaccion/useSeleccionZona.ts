import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { IdCapa, ModoCapa, Zona } from '../../config/esquemas';
import { useAyni } from '../../estado/store';
import { sinRaycast } from '../cuerpo/materiales';
import { zonaDeMalla } from './zonaDeMalla';

/** Capas que envuelven al cuerpo, de la más cercana a la más externa. */
const CAPAS_ENVOLVENTES: IdCapa[] = ['piel', 'halo'];

/** Desplazamiento máximo (px) para que un pointerup cuente como clic y no como arrastre. */
const UMBRAL_ARRASTRE_PX = 5;

export interface RegistroZona {
  centro: THREE.Vector3;
  radio: number;
  mallas: THREE.Object3D[];
}

/** Centro, tamaño y mallas de cada zona, medidos sobre la escena montada. */
export const registroZonas = new Map<string, RegistroZona>();

export function visibleEnArbol(objeto: THREE.Object3D | null): boolean {
  for (let o = objeto; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/** Recorre el cuerpo montado y registra cada zona (excluye mallas auxiliares sin raycast). */
export function registrarZonas(raiz: THREE.Object3D, zonas: Zona[]) {
  raiz.updateWorldMatrix(true, true);
  const cajas = new Map<string, THREE.Box3>();
  const mallas = new Map<string, THREE.Object3D[]>();
  raiz.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh || o.raycast === sinRaycast || !o.name) return;
    const zona = zonaDeMalla(o.name, zonas);
    if (!zona) return;
    const caja = cajas.get(zona) ?? new THREE.Box3();
    caja.expandByObject(o);
    cajas.set(zona, caja);
    mallas.set(zona, [...(mallas.get(zona) ?? []), o]);
  });
  registroZonas.clear();
  cajas.forEach((caja, zona) => {
    const esfera = caja.getBoundingSphere(new THREE.Sphere());
    registroZonas.set(zona, {
      centro: esfera.center,
      radio: esfera.radius,
      mallas: mallas.get(zona)!,
    });
  });
  useAyni.getState().marcarZonasRegistradas();
}

/**
 * Prioridad de un impacto (menor = preferido): capa interna visible, capa interna
 * semitransparente (se hace clic "a través" de ella), piel y, por último, halo.
 */
function prioridad(capa: IdCapa, modoCapa: Partial<Record<IdCapa, ModoCapa>>): number {
  const envolvente = CAPAS_ENVOLVENTES.indexOf(capa);
  if (envolvente >= 0) return 2 + envolvente;
  return modoCapa[capa] === 'translucida' ? 1 : 0;
}

/** Capas finas que recubren otras estructuras (los vasos tapan cerebro, pulmones, nervios). */
const CAPAS_FINAS = new Set<IdCapa>(['vascular']);
/** Si tras una capa fina hay otra estructura a menos de esta profundidad, gana esa. */
const PROFUNDIDAD_PREFERENTE_M = 0.03;

/**
 * Zona elegida por un rayo: el impacto visible de menor prioridad y, a igualdad, el más
 * cercano; salvo que sea un vaso con otra estructura justo detrás.
 */
export function zonaDesdeIntersecciones(
  intersecciones: { object: THREE.Object3D; distance?: number }[],
  zonas: Zona[],
  modoCapa: Partial<Record<IdCapa, ModoCapa>> = {},
): string | null {
  const capaDe = new Map(zonas.map((z) => [z.id, z.capa]));
  const candidatos: { zona: string; capa: IdCapa; prioridad: number; distancia: number }[] = [];
  for (const { object, distance } of intersecciones) {
    if (!visibleEnArbol(object)) continue;
    const zona = zonaDeMalla(object.name, zonas);
    const capa = zona ? capaDe.get(zona) : undefined;
    if (!zona || !capa) continue;
    candidatos.push({ zona, capa, prioridad: prioridad(capa, modoCapa), distancia: distance ?? 0 });
  }
  if (candidatos.length === 0) return null;
  const minima = Math.min(...candidatos.map((c) => c.prioridad));
  const mismos = candidatos.filter((c) => c.prioridad === minima);
  const primero = mismos[0];
  if (CAPAS_FINAS.has(primero.capa)) {
    const detras = mismos.find(
      (c) =>
        !CAPAS_FINAS.has(c.capa) && c.distancia - primero.distancia <= PROFUNDIDAD_PREFERENTE_M,
    );
    if (detras) return detras.zona;
  }
  return primero.zona;
}

function cursor(valor: string) {
  document.body.style.cursor = valor;
}

/** Manejadores de hover y clic para el grupo del cuerpo (5.3, puntos 3 y 4). */
export function useSeleccionZona() {
  return useMemo(() => {
    const zonaDe = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
      const { config, modoCapa } = useAyni.getState();
      return zonaDesdeIntersecciones(e.intersections, config?.zonas ?? [], modoCapa);
    };
    return {
      onPointerMove: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const zona = zonaDe(e);
        const { zonaHover, setZonaHover } = useAyni.getState();
        if (zona !== zonaHover) setZonaHover(zona);
        cursor(zona ? 'pointer' : 'auto');
      },
      onPointerOut: () => {
        useAyni.getState().setZonaHover(null);
        cursor('auto');
      },
      onClick: (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > UMBRAL_ARRASTRE_PX) return;
        const zona = zonaDe(e);
        if (zona) useAyni.getState().seleccionarZona(zona);
      },
    };
  }, []);
}
