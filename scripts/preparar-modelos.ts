/**
 * Genera public/modelos/cuerpo.glb a partir de modelos anatómicos libres (sección 5.2):
 * filtra por licencia, fusiona cada grupo de estructuras en una malla con el nombre del
 * contrato (4.3), alinea BodyParts3D con Z-Anatomy, encaja la piel CC0 en posición
 * anatómica, simplifica y comprime con Draco.
 *
 *   npm run modelos              genera los archivos
 *   npm run modelos -- --revisar solo informa qué estructura va a cada malla
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO, type Node as NodoGltf } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { simplifyPrimitive, weld } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import mapeoJson from './mallas-anatomia.json';
import { clasificar, esquemaMapeo, expandirReglas, type ReglaExpandida } from './mapeoAnatomia';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FUENTES = join(raiz, 'assets-fuente');
const SALIDA = join(raiz, 'public', 'modelos');
const revisar = process.argv.includes('--revisar');

const mapeo = esquemaMapeo.parse(mapeoJson);
const reglas = expandirReglas(mapeo);

// --- Geometría acumulada por nombre de contrato -----------------------------------

interface Acumulado {
  pos: number[];
  idx: number[];
  estructuras: string[];
}
const acumulados = new Map<string, Acumulado>();
/** Recorridos de flujo (centro de vasos alargados) en coordenadas del cuerpo. */
const recorridos: { tipo: 'arteria' | 'vena'; puntos: number[][] }[] = [];

function acumular(
  nombre: string,
  estructura: string,
  pos: ArrayLike<number>,
  idx: ArrayLike<number>,
) {
  const a = acumulados.get(nombre) ?? { pos: [], idx: [], estructuras: [] };
  const base = a.pos.length / 3;
  for (let i = 0; i < pos.length; i++) a.pos.push(pos[i]);
  for (let i = 0; i < idx.length; i++) a.idx.push(idx[i] + base);
  a.estructuras.push(estructura);
  acumulados.set(nombre, a);
}

/** Transforma posiciones con una matriz e invierte el sentido de los triángulos si refleja. */
function transformar(pos: ArrayLike<number>, idx: ArrayLike<number>, m: THREE.Matrix4) {
  const v = new THREE.Vector3();
  const salidaPos = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    v.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(m);
    salidaPos[i] = v.x;
    salidaPos[i + 1] = v.y;
    salidaPos[i + 2] = v.z;
  }
  const salidaIdx = Uint32Array.from(idx);
  if (m.determinant() < 0) {
    for (let i = 0; i < salidaIdx.length; i += 3) {
      const t = salidaIdx[i + 1];
      salidaIdx[i + 1] = salidaIdx[i + 2];
      salidaIdx[i + 2] = t;
    }
  }
  return { pos: salidaPos, idx: salidaIdx };
}

function caja(pos: ArrayLike<number>) {
  const b = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.length; i += 3) b.expandByPoint(v.set(pos[i], pos[i + 1], pos[i + 2]));
  return b;
}

/**
 * Línea central de un vaso alargado: eje principal (PCA) dividido en tramos.
 * Devuelve null si la estructura no es lo bastante alargada.
 */
function lineaCentral(pos: ArrayLike<number>): number[][] | null {
  const n = pos.length / 3;
  if (n < 30) return null;
  const media = new THREE.Vector3();
  for (let i = 0; i < pos.length; i += 3)
    media.add(new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]));
  media.divideScalar(n);
  const c = [0, 0, 0, 0, 0, 0]; // xx, xy, xz, yy, yz, zz
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i] - media.x,
      y = pos[i + 1] - media.y,
      z = pos[i + 2] - media.z;
    c[0] += x * x;
    c[1] += x * y;
    c[2] += x * z;
    c[3] += y * y;
    c[4] += y * z;
    c[5] += z * z;
  }
  const eje = new THREE.Vector3(1, 1, 1).normalize();
  for (let k = 0; k < 30; k++) {
    eje
      .set(
        c[0] * eje.x + c[1] * eje.y + c[2] * eje.z,
        c[1] * eje.x + c[3] * eje.y + c[4] * eje.z,
        c[2] * eje.x + c[4] * eje.y + c[5] * eje.z,
      )
      .normalize();
  }
  let min = Infinity,
    max = -Infinity,
    radial = 0;
  const p = new THREE.Vector3();
  const proy: number[] = [];
  for (let i = 0; i < pos.length; i += 3) {
    p.set(pos[i], pos[i + 1], pos[i + 2]).sub(media);
    const t = p.dot(eje);
    proy.push(t);
    min = Math.min(min, t);
    max = Math.max(max, t);
    radial += p.addScaledVector(eje, -t).length();
  }
  const largo = max - min;
  radial /= n;
  if (largo < 0.06 || largo / Math.max(radial, 1e-4) < 7) return null;
  const tramos = Math.max(4, Math.min(30, Math.round(largo / 0.02)));
  const sumas = Array.from({ length: tramos }, () => [0, 0, 0, 0]);
  proy.forEach((t, j) => {
    const b = Math.min(tramos - 1, Math.floor(((t - min) / largo) * tramos));
    sumas[b][0] += pos[j * 3];
    sumas[b][1] += pos[j * 3 + 1];
    sumas[b][2] += pos[j * 3 + 2];
    sumas[b][3]++;
  });
  return sumas
    .filter((s) => s[3] > 0)
    .map((s) => [s[0] / s[3], s[1] / s[3], s[2] / s[3]].map((x) => +x.toFixed(4)));
}

const CORAZON = new THREE.Vector3(0.02, 1.29, 0.03);

function registrarFlujo(regla: ReglaExpandida, pos: ArrayLike<number>) {
  if (!regla.flujo) return;
  const linea = lineaCentral(pos);
  if (!linea) return;
  const dist = (q: number[]) => CORAZON.distanceTo(new THREE.Vector3(q[0], q[1], q[2]));
  // Arterias: del corazón hacia fuera. Venas: hacia el corazón.
  const desdeCorazon = dist(linea[0]) <= dist(linea[linea.length - 1]);
  const ordenada = desdeCorazon === (regla.flujo === 'arteria') ? linea : [...linea].reverse();
  recorridos.push({ tipo: regla.flujo, puntos: ordenada });
}

// --- Z-Anatomy (GLB con Draco) --------------------------------------------------------

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});

const nombreDe = (n: NodoGltf) => (n.getExtras()?.za_name as string | undefined) ?? n.getName();

/** Cajas y vértices de estructuras de Z-Anatomy usadas como referencias para alinear otras fuentes. */
const referencias = new Map<string, THREE.Box3>();
const verticesReferencia = new Map<string, Float32Array>();
const REFERENCIAS = new Set([
  'Kidney.l',
  'Kidney.r',
  'Pons.l',
  'Pons.r',
  'Medulla oblongata.l',
  'Medulla oblongata.r',
  'Humerus.l',
  'Humerus.r',
  'Radius.l',
  'Radius.r',
  'Ulna.l',
  'Ulna.r',
  'Femur.l',
  'Femur.r',
  'Tibia.l',
  'Tibia.r',
  'Frontal bone',
  'Parietal bone.l',
  'Parietal bone.r',
  'Body of sternum',
  'Fifth rib.l',
  'Fifth rib.r',
]);
const sinRegla = new Map<string, string[]>();

async function procesarZAnatomy(fuente: string, archivo: string) {
  const doc = await io.read(join(FUENTES, archivo));
  for (const nodo of doc.getRoot().listNodes()) {
    const malla = nodo.getMesh();
    if (!malla) continue;
    const estructura = nombreDe(nodo);
    const prim = malla.listPrimitives()[0];
    const posAcc = prim?.getAttribute('POSITION');
    const idxAcc = prim?.getIndices();
    if (!prim || !posAcc || !idxAcc) continue;
    const m = new THREE.Matrix4().fromArray(nodo.getWorldMatrix());
    const necesitaReferencia = REFERENCIAS.has(estructura);
    const regla = clasificar(estructura, fuente, reglas, mapeo.excluir);
    if (!regla && !necesitaReferencia) {
      sinRegla.set(fuente, [...(sinRegla.get(fuente) ?? []), estructura]);
      continue;
    }
    const t = transformar(posAcc.getArray()!, idxAcc.getArray()!, m);
    if (necesitaReferencia) {
      referencias.set(estructura, caja(t.pos));
      verticesReferencia.set(estructura, t.pos);
    }
    if (!regla) continue;
    if (!revisar) acumular(regla.nombre, estructura, t.pos, t.idx);
    else acumular(regla.nombre, estructura, [], []);
    if (!revisar) registrarFlujo(regla, t.pos);
  }
}

// --- BodyParts3D (OBJ en mm) ---------------------------------------------------------

function leerObj(ruta: string) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    if (linea.startsWith('v ')) {
      const [, x, y, z] = linea.trim().split(/\s+/);
      pos.push(+x, +y, +z);
    } else if (linea.startsWith('f ')) {
      const v = linea
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((s) => parseInt(s, 10) - 1);
      for (let i = 1; i + 1 < v.length; i++) idx.push(v[0], v[i], v[i + 1]);
    }
  }
  return { pos, idx };
}

/**
 * Busca la transformación BodyParts3D → Z-Anatomy (permutación y signo de ejes, escala
 * uniforme y traslación) que mejor superpone estructuras presentes en ambas fuentes.
 */
function alinearBodyParts3D(): THREE.Matrix4 {
  const carpeta = join(FUENTES, mapeo.fuentes.bp3d.carpeta!);
  const pares: [string, string[]][] = [
    ['FJ3145_BP21596_FMA7205_Left kidney.obj', ['Kidney.l']],
    ['FJ3147_BP23801_FMA7204_Right kidney.obj', ['Kidney.r']],
    ['FJ1775_BP22028_FMA67943_Pons.obj', ['Pons.l', 'Pons.r']],
    [
      'FJ1769_BP23201_FMA62004_Medulla oblongata.obj',
      ['Medulla oblongata.l', 'Medulla oblongata.r'],
    ],
  ];
  const origen: THREE.Vector3[] = [];
  const destino: THREE.Vector3[] = [];
  for (const [archivo, nombres] of pares) {
    const cajaZa = new THREE.Box3();
    for (const n of nombres) {
      const b = referencias.get(n);
      if (!b) throw new Error(`Falta la referencia ${n} en Z-Anatomy`);
      cajaZa.union(b);
    }
    origen.push(caja(leerObj(join(carpeta, archivo)).pos).getCenter(new THREE.Vector3()));
    destino.push(cajaZa.getCenter(new THREE.Vector3()));
  }
  const ejes = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
  let mejor = { error: Infinity, m: new THREE.Matrix4() };
  for (const p of ejes)
    for (let signos = 0; signos < 8; signos++) {
      const sg = [signos & 1 ? -1 : 1, signos & 2 ? -1 : 1, signos & 4 ? -1 : 1];
      const rot = new THREE.Matrix4();
      const e = rot.elements;
      e.fill(0);
      for (let fila = 0; fila < 3; fila++) e[p[fila] * 4 + fila] = sg[fila];
      e[15] = 1;
      const o = origen.map((v) => v.clone().applyMatrix4(rot));
      const mo = o.reduce((s, v) => s.add(v), new THREE.Vector3()).divideScalar(o.length);
      const md = destino
        .reduce((s, v) => s.add(v), new THREE.Vector3())
        .divideScalar(destino.length);
      let num = 0,
        den = 0;
      o.forEach((v, i) => {
        const a = v.clone().sub(mo);
        num += a.dot(destino[i].clone().sub(md));
        den += a.lengthSq();
      });
      const s = num / den;
      if (s <= 0) continue;
      const t = md.clone().sub(mo.clone().multiplyScalar(s));
      const error = o.reduce(
        (acc, v, i) => acc + v.clone().multiplyScalar(s).add(t).distanceToSquared(destino[i]),
        0,
      );
      if (error < mejor.error) {
        mejor = {
          error,
          m: new THREE.Matrix4()
            .makeTranslation(t.x, t.y, t.z)
            .multiply(new THREE.Matrix4().makeScale(s, s, s))
            .multiply(rot),
        };
      }
    }
  console.log(
    `  BodyParts3D → Z-Anatomy: error medio ${(Math.sqrt(mejor.error / origen.length) * 1000).toFixed(1)} mm`,
  );
  return mejor.m;
}

function procesarBodyParts3D(m: THREE.Matrix4) {
  const carpeta = join(FUENTES, mapeo.fuentes.bp3d.carpeta!);
  const disponibles = new Set(readdirSync(carpeta));
  for (const regla of reglas.filter((r) => r.fuente === 'bp3d')) {
    for (const archivo of regla.archivos) {
      if (!disponibles.has(archivo)) throw new Error(`Falta ${archivo} en ${carpeta}`);
      if (revisar) {
        acumular(regla.nombre, archivo, [], []);
        continue;
      }
      const obj = leerObj(join(carpeta, archivo));
      const t = transformar(obj.pos, obj.idx, m);
      acumular(regla.nombre, archivo, t.pos, t.idx);
    }
  }
}

// --- Piel CC0 (MakeHuman) en posición anatómica ---------------------------------------

/** Eje principal (PCA) de uno o varios huesos largos, orientado hacia abajo. */
function ejeHaciaAbajo(nombres: string[]): THREE.Vector3 {
  const todos: number[] = [];
  for (const n of nombres) todos.push(...verticesReferencia.get(n)!);
  const media = new THREE.Vector3();
  for (let i = 0; i < todos.length; i += 3)
    media.add(new THREE.Vector3(todos[i], todos[i + 1], todos[i + 2]));
  media.divideScalar(todos.length / 3);
  const c = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < todos.length; i += 3) {
    const x = todos[i] - media.x,
      y = todos[i + 1] - media.y,
      z = todos[i + 2] - media.z;
    c[0] += x * x;
    c[1] += x * y;
    c[2] += x * z;
    c[3] += y * y;
    c[4] += y * z;
    c[5] += z * z;
  }
  const eje = new THREE.Vector3(0, -1, 0);
  for (let k = 0; k < 40; k++) {
    eje
      .set(
        c[0] * eje.x + c[1] * eje.y + c[2] * eje.z,
        c[1] * eje.x + c[3] * eje.y + c[4] * eje.z,
        c[2] * eje.x + c[4] * eje.y + c[5] * eje.z,
      )
      .normalize();
  }
  return eje.y > 0 ? eje.negate() : eje;
}

async function procesarPiel(regla: ReglaExpandida) {
  if (revisar) {
    acumular(regla.nombre, 'MakeHuman', [], []);
    return;
  }
  // Quita texturas para poder parsear el GLB en Node con GLTFLoader.
  const doc = await io.read(join(FUENTES, mapeo.fuentes.piel.archivo!));
  doc
    .getRoot()
    .listTextures()
    .forEach((t) => t.dispose());
  const binario = await io.writeBinary(doc);
  const gltf = await new GLTFLoader().parseAsync(
    binario.buffer.slice(
      binario.byteOffset,
      binario.byteOffset + binario.byteLength,
    ) as ArrayBuffer,
    '',
  );
  const escena = gltf.scene;
  let piel: THREE.SkinnedMesh | null = null;
  escena.traverse((o) => {
    const s = o as THREE.SkinnedMesh;
    if (
      s.isSkinnedMesh &&
      (!piel || s.geometry.attributes.position.count > piel.geometry.attributes.position.count)
    )
      piel = s;
  });
  if (!piel) throw new Error('La piel no tiene SkinnedMesh');
  const malla = piel as THREE.SkinnedMesh;
  escena.updateMatrixWorld(true);

  const hueso = (re: RegExp) => {
    const b = malla.skeleton.bones.find((x) => re.test(x.name));
    if (!b) throw new Error(`Sin hueso ${re}`);
    return b;
  };
  /** Gira `desde` para que el segmento desde→hacia apunte en la dirección `dir` (mundo). */
  const apuntar = (desde: THREE.Bone, hacia: THREE.Object3D, dir: THREE.Vector3) => {
    escena.updateMatrixWorld(true);
    const a = desde.getWorldPosition(new THREE.Vector3());
    const b = hacia.getWorldPosition(new THREE.Vector3());
    const q = new THREE.Quaternion().setFromUnitVectors(
      b.sub(a).normalize(),
      dir.clone().normalize(),
    );
    const qPadre = desde.parent!.getWorldQuaternion(new THREE.Quaternion());
    const qHueso = desde.getWorldQuaternion(new THREE.Quaternion());
    desde.quaternion.copy(qPadre.invert().multiply(q).multiply(qHueso));
    escena.updateMatrixWorld(true);
  };
  // GLTFLoader quita los puntos de los nombres de nodo: "upperarm01.L" llega como "upperarm01L".
  const h = (base: string, s: string) => hueso(new RegExp(`^${base}\\.?${s}$`));
  for (const { s, l } of [
    { s: 'L', l: 'l' },
    { s: 'R', l: 'r' },
  ]) {
    apuntar(h('upperarm01', s), h('lowerarm01', s), ejeHaciaAbajo([`Humerus.${l}`]));
    apuntar(h('lowerarm01', s), h('wrist', s), ejeHaciaAbajo([`Radius.${l}`, `Ulna.${l}`]));
    apuntar(h('upperleg01', s), h('lowerleg01', s), ejeHaciaAbajo([`Femur.${l}`]));
    apuntar(h('lowerleg01', s), h('foot', s), ejeHaciaAbajo([`Tibia.${l}`]));
  }
  malla.skeleton.update();

  // Hornea la pose en una geometría estática (coordenadas de mundo).
  const geo = malla.geometry;
  const n = geo.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(geo.attributes.position as THREE.BufferAttribute, i);
    malla.applyBoneTransform(i, v);
    v.applyMatrix4(malla.matrixWorld);
    pos[i * 3] = v.x;
    pos[i * 3 + 1] = v.y;
    pos[i * 3 + 2] = v.z;
  }
  const idx = Uint32Array.from(geo.index!.array);

  // Escala por altura (coronilla de Z-Anatomy + cuero cabelludo) y centra el torso.
  const cajaPiel = caja(pos);
  const craneo = new THREE.Box3();
  ['Frontal bone', 'Parietal bone.l', 'Parietal bone.r'].forEach((x) =>
    craneo.union(referencias.get(x)!),
  );
  const escala = (craneo.max.y + 0.008) / (cajaPiel.max.y - cajaPiel.min.y);
  const torsoPiel = new THREE.Box3();
  for (let i = 0; i < n; i++) {
    const y = (pos[i * 3 + 1] - cajaPiel.min.y) * escala;
    if (y > 1.1 && y < 1.35 && Math.abs(pos[i * 3]) < 0.14)
      torsoPiel.expandByPoint(v.set(pos[i * 3] * escala, y, pos[i * 3 + 2] * escala));
  }
  const torax = new THREE.Box3();
  ['Body of sternum', 'Fifth rib.l', 'Fifth rib.r'].forEach((x) =>
    torax.union(referencias.get(x)!),
  );
  const dz = torax.getCenter(v).z - torsoPiel.getCenter(new THREE.Vector3()).z;
  for (let i = 0; i < n; i++) {
    pos[i * 3] *= escala;
    pos[i * 3 + 1] = (pos[i * 3 + 1] - cajaPiel.min.y) * escala;
    pos[i * 3 + 2] = pos[i * 3 + 2] * escala + dz;
  }
  console.log(
    `  piel: escala ${escala.toFixed(3)}, desplazamiento z ${(dz * 100).toFixed(1)} cm, altura ${(craneo.max.y + 0.008).toFixed(3)} m`,
  );
  acumular(regla.nombre, 'MakeHuman', pos, idx);
}

// --- Ejecución -------------------------------------------------------------------------

console.log(revisar ? 'Revisión del mapeo (sin generar archivos)…' : 'Preparando modelos…');
for (const [fuente, f] of Object.entries(mapeo.fuentes)) {
  if (f.archivo?.endsWith('.glb') && fuente !== 'piel') {
    console.log(`  leyendo ${f.archivo}`);
    await procesarZAnatomy(fuente, f.archivo);
  }
}
procesarBodyParts3D(revisar ? new THREE.Matrix4() : alinearBodyParts3D());
for (const regla of reglas.filter((r) => r.fuente === 'piel')) await procesarPiel(regla);

if (revisar) {
  for (const regla of reglas) {
    const a = acumulados.get(regla.nombre);
    console.log(
      `${regla.nombre.padEnd(34)} ${String(a?.estructuras.length ?? 0).padStart(4)}  ${(a?.estructuras ?? []).slice(0, 6).join(' | ')}`,
    );
  }
  for (const [fuente, lista] of sinRegla) {
    console.log(`\n[${fuente}] sin regla (${lista.length}): ${lista.slice(0, 80).join(' | ')}`);
  }
  process.exit(0);
}

// Escala todo a la altura de la spec (5.2: 1,78 m, pies en y = 0).
const ALTURA_SPEC = 1.78;
const coronilla = new THREE.Box3();
['Frontal bone', 'Parietal bone.l', 'Parietal bone.r'].forEach((x) =>
  coronilla.union(referencias.get(x)!),
);
const factorAltura = ALTURA_SPEC / (coronilla.max.y + 0.008);
for (const a of acumulados.values())
  for (let i = 0; i < a.pos.length; i++) a.pos[i] *= factorAltura;
for (const r of recorridos)
  r.puntos = r.puntos.map((p) => p.map((x) => +(x * factorAltura).toFixed(4)));
console.log(`  escala a ${ALTURA_SPEC} m: ×${factorAltura.toFixed(3)}`);

// Documento de salida: un nodo por nombre de contrato.
const salida = new Document();
const buffer = salida.createBuffer();
const escena = salida.createScene('ayni');
let trianglesAntes = 0;
for (const regla of reglas) {
  const a = acumulados.get(regla.nombre);
  if (!a || a.idx.length === 0) throw new Error(`La malla ${regla.nombre} quedó vacía`);
  trianglesAntes += a.idx.length / 3;
  const prim = salida
    .createPrimitive()
    .setAttribute(
      'POSITION',
      salida.createAccessor().setType('VEC3').setArray(Float32Array.from(a.pos)).setBuffer(buffer),
    )
    .setIndices(
      salida.createAccessor().setType('SCALAR').setArray(Uint32Array.from(a.idx)).setBuffer(buffer),
    );
  const malla = salida.createMesh(regla.nombre).addPrimitive(prim);
  escena.addChild(salida.createNode(regla.nombre).setMesh(malla));
}
await salida.transform(weld());
await MeshoptSimplifier.ready;
let trianglesDespues = 0;
for (const malla of salida.getRoot().listMeshes()) {
  const regla = reglas.find((r) => r.nombre === malla.getName())!;
  for (const prim of malla.listPrimitives()) {
    // error: desviación máxima relativa al tamaño de la malla (0,8 %).
    if (regla.conservar < 1)
      simplifyPrimitive(prim, {
        simplifier: MeshoptSimplifier,
        ratio: regla.conservar,
        error: 0.008,
      });
    trianglesDespues += prim.getIndices()!.getCount() / 3;
  }
}
salida
  .createExtension(KHRDracoMeshCompression)
  .setRequired(true)
  .setEncoderOptions({
    method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
    encodeSpeed: 5,
    decodeSpeed: 5,
    quantizationBits: { POSITION: 14 },
  });

mkdirSync(SALIDA, { recursive: true });
await io.write(join(SALIDA, 'cuerpo.glb'), salida);
writeFileSync(join(SALIDA, 'flujo.json'), JSON.stringify({ recorridos }));
writeFileSync(
  join(SALIDA, 'creditos.json'),
  JSON.stringify(
    {
      creditos: Object.values(mapeo.creditos),
      estructuras: Object.fromEntries([...acumulados].map(([n, a]) => [n, a.estructuras])),
    },
    null,
    1,
  ),
);
const draco = join(raiz, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf');
mkdirSync(join(raiz, 'public', 'draco'), { recursive: true });
for (const f of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js'])
  copyFileSync(join(draco, f), join(raiz, 'public', 'draco', f));

const peso = readFileSync(join(SALIDA, 'cuerpo.glb')).byteLength;
console.log(
  `cuerpo.glb: ${reglas.length} mallas · ${Math.round(trianglesAntes / 1000)}k → ${Math.round(trianglesDespues / 1000)}k triángulos · ${(peso / 1e6).toFixed(1)} MB · ${recorridos.length} recorridos de flujo`,
);
