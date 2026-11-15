import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/* ------------------------------------------------------------------------------------------
 * Materiales compartidos (tokens de DESIGN.md)
 * ---------------------------------------------------------------------------------------- */

export const COLORES = {
  tela: '#3A4A63',
  telaBrillo: '#0F1D30',
  plastico: '#1E293B',
  plasticoClaro: '#CBD5E1',
  silicona: '#94A3B8',
  acento: '#22D3EE',
  banda: '#FBBF24',
  fibra: '#FB923C',
  led: '#F87171',
  metal: '#9CA3AF',
  error: '#F87171',
};

export type Variante = 'normal' | 'fantasma';

export function crearMateriales(variante: Variante) {
  if (variante === 'fantasma') {
    const f = new THREE.MeshBasicMaterial({
      color: COLORES.error,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    return {
      tela: f,
      plastico: f,
      plasticoClaro: f,
      silicona: f,
      transparente: f,
      acento: f,
      banda: f,
      fibra: f,
      led: f,
      metal: f,
    };
  }
  return {
    tela: new THREE.MeshStandardMaterial({
      color: COLORES.tela,
      emissive: COLORES.telaBrillo,
      roughness: 0.75,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
    plastico: new THREE.MeshStandardMaterial({
      color: COLORES.plastico,
      roughness: 0.45,
      metalness: 0.2,
    }),
    plasticoClaro: new THREE.MeshStandardMaterial({
      color: COLORES.plasticoClaro,
      roughness: 0.4,
      metalness: 0.1,
    }),
    silicona: new THREE.MeshStandardMaterial({
      color: COLORES.silicona,
      roughness: 0.6,
      transparent: true,
      opacity: 0.85,
    }),
    transparente: new THREE.MeshPhysicalMaterial({
      color: '#DCEAF5',
      roughness: 0.15,
      metalness: 0,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    acento: new THREE.MeshStandardMaterial({
      color: COLORES.acento,
      emissive: COLORES.acento,
      emissiveIntensity: 0.6,
    }),
    banda: new THREE.MeshStandardMaterial({
      color: COLORES.banda,
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
    fibra: new THREE.MeshStandardMaterial({
      color: COLORES.fibra,
      emissive: COLORES.fibra,
      emissiveIntensity: 0.35,
    }),
    led: new THREE.MeshStandardMaterial({
      color: COLORES.led,
      emissive: COLORES.led,
      emissiveIntensity: 1.6,
    }),
    metal: new THREE.MeshStandardMaterial({
      color: COLORES.metal,
      roughness: 0.3,
      metalness: 0.8,
    }),
  };
}

export type Materiales = ReturnType<typeof crearMateriales>;

export function useMateriales(variante: Variante): Materiales {
  const m = useMemo(() => crearMateriales(variante), [variante]);
  useEffect(() => () => new Set(Object.values(m)).forEach((x) => x.dispose()), [m]);
  return m;
}
