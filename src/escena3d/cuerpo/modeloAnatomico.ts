import * as THREE from 'three';
import type { IdCapa, Zona } from '../../config/esquemas';
import { zonaDeMalla } from '../interaccion/zonaDeMalla';
import {
  crearMaterialHolografico,
  crearMaterialNervio,
  crearMaterialOrgano,
  crearMaterialSoloProfundidad,
  crearMaterialTranslucido,
  ORDEN_RENDER,
  sinRaycast,
} from './materiales';

export const URL_CUERPO = '/modelos/cuerpo.glb';
export const URL_FLUJO = '/modelos/flujo.json';
export const DECODIFICADOR_DRACO = '/draco/';

const MARFIL = '#EFE6CF';
const MUSCULO = '#B8484B';
const ARTERIA = '#E5484D';
const VENA = '#3E7BFA';
const CEREBRO = '#E3B5C8';
const COLOR_ORGANO: Record<string, string> = {
  organo_corazon: '#B83246',
  organo_pulmon_izq: '#E8A3AE',
  organo_pulmon_der: '#E8A3AE',
  organo_via_aerea: '#E7C3C8',
  organo_higado: '#8C3A2B',
  organo_estomago: '#D8907E',
  organo_pancreas: '#E6BE78',
  organo_intestino: '#D79A8C',
  organo_rinon_izq: '#9C4646',
  organo_rinon_der: '#9C4646',
};

export const CAPAS: IdCapa[] = [
  'piel',
  'musculos',
  'esqueleto',
  'organos',
  'nervioso',
  'vascular',
  'halo',
];

type MaterialEmisivo = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;

export interface CuerpoPreparado {
  raiz: THREE.Group;
  grupos: Map<IdCapa, THREE.Group>;
  /** Materiales con opacidad propia por capa (piel y nervios usan uniforms aparte). */
  materialesCapa: Map<IdCapa, THREE.Material[]>;
  porZona: Map<string, MaterialEmisivo[]>;
  organos: THREE.MeshPhysicalMaterial[];
  hueso: THREE.MeshStandardMaterial;
  piel: THREE.ShaderMaterial;
  nervios: THREE.ShaderMaterial;
  corazon: THREE.Mesh | null;
  liberar: () => void;
}

/**
 * Prepara la escena del GLB anatómico una sola vez: normales, materiales por capa, grupos
 * por capa (para animar su opacidad), corazón centrado para el latido y pasada de
 * profundidad de la piel. Se guarda en userData para reutilizarla al remontar.
 */
export function prepararCuerpo(escena: THREE.Group, zonas: Zona[]): CuerpoPreparado {
  const previo = escena.userData.ayni as CuerpoPreparado | undefined;
  if (previo) return previo;

  const capaDe = new Map(zonas.map((z) => [z.id, z.capa]));
  const raiz = new THREE.Group();
  raiz.name = 'cuerpo_anatomico';
  const grupos = new Map<IdCapa, THREE.Group>(
    CAPAS.map((c) => {
      const g = new THREE.Group();
      g.name = `capa_${c}`;
      raiz.add(g);
      return [c, g];
    }),
  );

  const hueso = crearMaterialTranslucido(MARFIL, { roughness: 0.6 });
  const musculo = crearMaterialTranslucido(MUSCULO, { roughness: 0.7 });
  const arteria = crearMaterialTranslucido(ARTERIA, { roughness: 0.35 });
  const vena = crearMaterialTranslucido(VENA, { roughness: 0.35 });
  const cerebro = crearMaterialOrgano(CEREBRO, 0);
  const piel = crearMaterialHolografico();
  const profundidad = crearMaterialSoloProfundidad();
  const nervios = crearMaterialNervio({ radial: true });
  const organos: THREE.MeshPhysicalMaterial[] = [cerebro];

  const materialesCapa = new Map<IdCapa, THREE.Material[]>([
    ['esqueleto', [hueso]],
    ['musculos', [musculo]],
    ['vascular', [arteria, vena]],
    ['organos', []],
    ['nervioso', [cerebro]],
  ]);
  const porZona = new Map<string, MaterialEmisivo[]>();
  const agregarZona = (zona: string, m: MaterialEmisivo) => {
    const lista = porZona.get(zona) ?? [];
    if (!lista.includes(m)) lista.push(m);
    porZona.set(zona, lista);
  };

  let corazon: THREE.Mesh | null = null;
  const mallas: THREE.Mesh[] = [];
  escena.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) mallas.push(o as THREE.Mesh);
  });

  for (const malla of mallas) {
    const zona = zonaDeMalla(malla.name, zonas);
    const capa = zona ? capaDe.get(zona) : undefined;
    if (!zona || !capa) continue;
    malla.geometry.computeVertexNormals();
    malla.renderOrder = ORDEN_RENDER.interno;
    let material: THREE.Material;
    switch (capa) {
      case 'piel': {
        material = piel;
        malla.renderOrder = ORDEN_RENDER.piel;
        const previa = new THREE.Mesh(malla.geometry, profundidad);
        previa.name = malla.name;
        previa.raycast = sinRaycast;
        previa.renderOrder = ORDEN_RENDER.pielProfundidad;
        grupos.get('piel')!.add(previa);
        break;
      }
      case 'esqueleto':
        material = hueso;
        agregarZona(zona, hueso);
        break;
      case 'musculos':
        material = musculo;
        agregarZona(zona, musculo);
        break;
      case 'vascular': {
        const m = malla.name.startsWith('vaso_vena') ? vena : arteria;
        material = m;
        agregarZona(zona, m);
        break;
      }
      case 'nervioso':
        if (malla.name === 'nervio_cerebro') {
          material = cerebro;
          agregarZona(zona, cerebro);
        } else {
          material = nervios;
        }
        break;
      case 'organos': {
        const m = crearMaterialOrgano(COLOR_ORGANO[malla.name] ?? '#C07070', 0);
        organos.push(m);
        materialesCapa.get('organos')!.push(m);
        material = m;
        agregarZona(zona, m);
        if (malla.name === 'organo_corazon') {
          // Centra la geometría para que el latido escale el corazón sobre sí mismo.
          malla.geometry.computeBoundingBox();
          const centro = malla.geometry.boundingBox!.getCenter(new THREE.Vector3());
          malla.geometry.translate(-centro.x, -centro.y, -centro.z);
          malla.position.copy(centro);
          corazon = malla;
        }
        break;
      }
      default:
        continue;
    }
    malla.material = material;
    grupos.get(capa)!.add(malla);
  }

  const preparado: CuerpoPreparado = {
    raiz,
    grupos,
    materialesCapa,
    porZona,
    organos,
    hueso,
    piel,
    nervios,
    corazon,
    liberar: () => {
      [hueso, musculo, arteria, vena, piel, profundidad, nervios, ...organos].forEach((m) =>
        m.dispose(),
      );
    },
  };
  escena.userData.ayni = preparado;
  return preparado;
}

/** Recorridos de flujo extraídos de las líneas centrales de los vasos (flujo.json). */
export interface ArchivoFlujo {
  recorridos: { tipo: 'arteria' | 'vena'; puntos: number[][] }[];
}
