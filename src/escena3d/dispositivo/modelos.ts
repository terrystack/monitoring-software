import * as THREE from 'three';
import type { Dispositivo } from '../../config/esquemas';
import { ANCLAJES } from '../cuerpo/anclajes';
import { puntosArnes } from './arnes/geometria';
import { puntosEeg } from './eeg/geometria';
import type { SensorDispositivo } from './estadoSensor';
import { puntoSuperficie, type Perfil } from './medidas';
import { puntosPuma } from './puma/geometria';

export type Modelo = 'puma' | 'arnes' | 'eeg';

export function modeloDe(d: Dispositivo | undefined): Modelo {
  const m = d?.modelo.replace('procedural:', '');
  return m === 'arnes' || m === 'eeg' ? m : 'puma';
}

/** Posición (mundo) de un sensor según su tipo de posición. */
export function posicionSensor(
  s: SensorDispositivo,
  torso: Perfil,
  cabeza: Perfil,
  piezas: Record<string, THREE.Vector3>,
): THREE.Vector3 {
  switch (s.posicion.tipo) {
    case 'torso':
      return puntoSuperficie(torso, s.posicion.altura, s.posicion.angulo, 0.022);
    case 'cabeza':
      return puntoSuperficie(cabeza, s.posicion.altura, s.posicion.angulo, 0.022);
    case 'anclaje':
      return ANCLAJES[s.posicion.anclaje].clone();
    case 'pieza':
      return piezas[s.posicion.pieza]?.clone() ?? new THREE.Vector3(0, 1.3, 0.2);
  }
}

export function puntosDe(modelo: Modelo, torso: Perfil) {
  if (modelo === 'arnes') return puntosArnes();
  if (modelo === 'eeg') return puntosEeg();
  return puntosPuma(torso);
}
