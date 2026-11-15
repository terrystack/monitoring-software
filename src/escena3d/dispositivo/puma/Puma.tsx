import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Parte } from '../despiece';
import { cinta, corrugado, superficie, tubo, tuboVariable, useGeometrias } from '../geometria';
import { crearMateriales, type Variante } from '../materiales';
import type { Perfil } from '../medidas';
import {
  CAMARA,
  CARCASA,
  CENTRO_CABEZA,
  enCamara,
  HEBILLAS,
  hayPlaca,
  LINEA_LATON,
  MANGUERA_DER,
  MANGUERA_IZQ,
  MODULO_TRASERO,
  montantes,
  MONTAJE,
  PUERTO,
  puntoMascara,
  puntoPlaca,
  rutaCorreaCorona,
  rutaCorreaLateral,
  rutasMuestra,
  rutaUmbilical,
  SENSORES,
  T,
} from './geometria';

/**
 * PUMA (AYNI_DISPOSITIVOS_3D.md §5) reconstruido de 3 vistas con img2threejs: máscara oronasal
 * azul con puerto inferior, barra en T blanca, mangueras corrugadas transparentes, cámara de
 * flujo ahumada con dos sensores negros colgantes y líneas de muestra ámbar (izquierda), carcasa
 * blanca con disipador (derecha), placas craneales transparentes perforadas sobre un arnés azul
 * marino, línea de latón sobre la coronilla y umbilical trenzado hasta la cadera.
 *
 * `fase` permite revisar el modelado por pasadas (blockout → estructura → completo).
 */

export type FasePuma = 'blockout' | 'estructura' | 'completo';

interface Props {
  torso: Perfil;
  variante?: Variante;
  fase?: FasePuma;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const desde = (dir: THREE.Vector3, eje = v(0, 1, 0)) =>
  new THREE.Quaternion().setFromUnitVectors(eje, dir.clone().normalize());
const haciaAfuera = (p: THREE.Vector3) => p.clone().sub(CENTRO_CABEZA).normalize();

function crearMaterialesPuma(variante: Variante, fase: FasePuma) {
  const base = crearMateriales(variante);
  if (variante === 'fantasma') {
    return {
      ...base,
      azul: base.tela,
      borde: base.tela,
      marfil: base.tela,
      beige: base.tela,
      ahumado: base.tela,
      marino: base.tela,
      negro: base.tela,
      gris: base.tela,
      gamuza: base.tela,
      disipador: base.tela,
      laton: base.tela,
      ambar: base.tela,
      trenza: base.tela,
      transparente: base.tela,
    };
  }
  if (fase === 'blockout') {
    const g = new THREE.MeshStandardMaterial({
      color: '#9AA3AE',
      roughness: 0.7,
      side: THREE.DoubleSide,
    });
    return {
      ...base,
      azul: g,
      borde: g,
      marfil: g,
      beige: g,
      ahumado: g,
      marino: g,
      negro: g,
      gris: g,
      gamuza: g,
      disipador: g,
      laton: g,
      ambar: g,
      trenza: g,
      transparente: g,
    };
  }
  const fisico = (color: string, opacidad: number, rugosidad: number) =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: rugosidad,
      transparent: true,
      opacity: opacidad,
      side: THREE.DoubleSide,
      depthWrite: false,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
    });
  const std = (color: string, rugosidad: number, metal = 0, side: THREE.Side = THREE.FrontSide) =>
    new THREE.MeshStandardMaterial({ color, roughness: rugosidad, metalness: metal, side });
  return {
    ...base,
    azul: fisico('#4F9BEB', 0.6, 0.15),
    borde: fisico('#7FBEF5', 0.85, 0.25),
    transparente: fisico('#E3EEF7', 0.34, 0.1),
    ahumado: fisico('#3E424D', 0.68, 0.12),
    marfil: std('#EFEDE6', 0.55),
    beige: std('#E4DAC4', 0.55),
    marino: std('#1F2A6B', 0.9, 0, THREE.DoubleSide),
    negro: std('#141516', 0.85, 0, THREE.DoubleSide),
    gris: std('#BFC4CA', 0.5),
    gamuza: std('#9EA0A3', 0.95),
    disipador: std('#3B3F45', 0.45, 0.6),
    laton: std('#C9A44C', 0.3, 0.9),
    ambar: fisico('#C98A5A', 0.85, 0.3),
    trenza: std('#121212', 0.7),
  };
}

type MatsPuma = ReturnType<typeof crearMaterialesPuma>;

/** Tornillos (cabezas metálicas) en fila sobre una cara. */
function Tornillos({
  puntos,
  normal,
  m,
}: {
  puntos: THREE.Vector3[];
  normal: THREE.Vector3;
  m: MatsPuma;
}) {
  const q = desde(normal);
  return (
    <>
      {puntos.map((p, i) => (
        <mesh key={i} position={p} quaternion={q} material={m.metal}>
          <cylinderGeometry args={[0.0032, 0.0032, 0.0018, 14]} />
        </mesh>
      ))}
    </>
  );
}

export function Puma({ torso, variante = 'normal', fase = 'completo' }: Props) {
  const m = useMemo(() => crearMaterialesPuma(variante, fase), [variante, fase]);
  useEffect(() => () => new Set(Object.values(m)).forEach((x) => x.dispose()), [m]);
  const detalle = fase !== 'blockout';
  const fantasma = variante === 'fantasma';

  const g = useGeometrias(() => {
    const mascara = superficie((u, w) => puntoMascara(u, w), 72, 20, { cerradaU: true });
    const sello = tubo(
      Array.from({ length: 64 }, (_, i) => puntoMascara(i / 64, 1, -0.001)),
      0.0045,
      true,
      128,
    );
    const placa = (lado: 1 | -1) =>
      superficie((u, w) => puntoPlaca(lado, u, w), 120, 80, {
        visible: detalle ? hayPlaca : undefined,
      });
    const bordePlaca = (lado: 1 | -1) => {
      const borde: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) borde.push(puntoPlaca(lado, i / 16, 0));
      for (let i = 1; i <= 12; i++) borde.push(puntoPlaca(lado, 1, i / 12));
      for (let i = 15; i >= 0; i--) borde.push(puntoPlaca(lado, i / 16, 1));
      for (let i = 11; i >= 1; i--) borde.push(puntoPlaca(lado, 0, i / 12));
      return tubo(borde, 0.0018, true, 200);
    };
    const correaLateral = rutaCorreaLateral();
    const lateral = cinta(correaLateral, haciaAfuera, 0.03, false, 140);
    const forro = cinta(
      correaLateral.map((p) => p.clone().sub(haciaAfuera(p).multiplyScalar(0.003))),
      haciaAfuera,
      0.038,
      false,
      140,
    );
    const corona = (x: number) => cinta(rutaCorreaCorona(x), haciaAfuera, 0.024, false, 60);
    const almohadilla = cinta(
      rutaCorreaCorona(0)
        .slice(2, 6)
        .map((p) => p.clone().add(haciaAfuera(p).multiplyScalar(0.003))),
      haciaAfuera,
      0.066,
      false,
      30,
    );
    const hebilla = (s: 1 | -1) => {
      const h = HEBILLAS(s);
      return {
        sup: tubo([h.superior.centro, h.superior.hacia], 0.004, false, 8),
        inf: tubo([h.inferior.centro, h.inferior.hacia], 0.004, false, 8),
      };
    };
    const hi = hebilla(1);
    const hd = hebilla(-1);
    const muestra = rutasMuestra();
    const cable = tubo(
      [
        CARCASA.disipador.centro.clone().add(v(0, -0.03, 0.01)),
        v(-0.191, 1.53, 0.09),
        v(-0.173, 1.508, 0.09),
        CARCASA.soporte.centro.clone().add(v(-0.017, -0.005, 0)),
      ],
      0.0018,
      false,
      30,
    );
    return {
      mascara,
      sello,
      tCuello: tubo(T.cuello, 0.012, false, 8),
      tBarra: tubo(T.barra, 0.016, false, 60),
      mangueraIzq: tuboVariable(MANGUERA_IZQ, detalle ? corrugado(0.0115, 14) : () => 0.0115, 140),
      mangueraDer: tuboVariable(MANGUERA_DER, detalle ? corrugado(0.0115, 14) : () => 0.0115, 140),
      camara: tuboVariable(
        [CAMARA.desde, enCamara(0.5), CAMARA.hasta],
        detalle
          ? (t) =>
              CAMARA.radio *
              (1 +
                0.12 * Math.exp(-(((t - 0.08) / 0.05) ** 2)) +
                0.12 * Math.exp(-(((t - 0.55) / 0.05) ** 2)))
          : () => CAMARA.radio,
        60,
        24,
      ),
      placaIzq: placa(1),
      placaDer: placa(-1),
      bordeIzq: bordePlaca(1),
      bordeDer: bordePlaca(-1),
      lateral,
      forro,
      almohadilla,
      coronaA: corona(0.019),
      coronaB: corona(-0.019),
      laton: tubo(LINEA_LATON, 0.0028, false, 60),
      umbilical: tubo(rutaUmbilical(torso), 0.0068, false, 160),
      muestraA: tubo(muestra[0], 0.0018, false, 40),
      muestraB: tubo(muestra[1], 0.0018, false, 40),
      cable,
      correaHi1: hi.sup,
      correaHi2: hi.inf,
      correaHd1: hd.sup,
      correaHd2: hd.inf,
      ...Object.fromEntries(
        ([1, -1] as const).flatMap((lado) =>
          montantes(lado).map((par, i) => [`montante${lado}${i}`, tubo(par, 0.0035, false, 8)]),
        ),
      ),
    };
  }, [torso, detalle]);

  const qPuerto = desde(PUERTO.eje);
  const dirCamara = CAMARA.hasta.clone().sub(CAMARA.desde).normalize();
  const extremoIzq = MANGUERA_IZQ[0];
  const extremoDer = MANGUERA_DER[MANGUERA_DER.length - 1];

  return (
    <group name="puma">
      <Parte id="mascara" separar={[0, 0, 0.06]} ancla={[0.07, 1.68, 0.19]}>
        <mesh geometry={g.mascara} material={m.azul} renderOrder={3} />
      </Parte>
      <Parte id="sello" separar={[0, 0, 0.03]} ancla={[-0.075, 1.66, 0.15]}>
        <mesh geometry={g.sello} material={m.borde} />
      </Parte>
      <Parte id="puerto" separar={[0, -0.02, 0.07]} ancla={[0.04, 1.585, 0.2]}>
        <group position={PUERTO.centro} quaternion={qPuerto}>
          <mesh material={m.transparente}>
            <cylinderGeometry args={[0.016, 0.017, 0.018, 28, 1, true]} />
          </mesh>
          <mesh material={m.borde} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.0165, 0.0022, 8, 28]} />
          </mesh>
        </group>
        {detalle && (
          <mesh
            position={v(0.016, 1.582, 0.186)}
            rotation={[0.5, 0, -0.5]}
            material={m.transparente}
          >
            <cylinderGeometry args={[0.0032, 0.0032, 0.018, 10]} />
          </mesh>
        )}
      </Parte>
      <Parte id="manifold" separar={[0, -0.03, 0.09]} ancla={[0, 1.515, 0.23]}>
        <mesh geometry={g.tCuello} material={m.marfil} />
        <mesh geometry={g.tBarra} material={m.marfil} />
        <mesh position={T.tapa.centro} rotation={[Math.PI / 2, 0, 0]} material={m.marfil}>
          <cylinderGeometry args={[0.012, 0.013, T.tapa.largo, 20]} />
        </mesh>
        {detalle && (
          <mesh position={v(0, 1.562, 0.234)} material={m.marfil}>
            <cylinderGeometry args={[0.006, 0.006, 0.01, 14]} />
          </mesh>
        )}
      </Parte>
      <Parte id="manguera_izq" separar={[0.05, -0.01, 0.05]} ancla={[0.12, 1.585, 0.16]}>
        <mesh geometry={g.mangueraIzq} material={m.transparente} />
      </Parte>
      <Parte id="manguera_der" separar={[-0.05, -0.01, 0.05]} ancla={[-0.12, 1.53, 0.17]}>
        <mesh geometry={g.mangueraDer} material={m.transparente} />
      </Parte>
      <Parte id="camara_flujo" separar={[0.07, 0.02, 0]} ancla={[0.17, 1.585, 0.06]}>
        <mesh geometry={g.camara} material={m.ahumado} renderOrder={2} />
      </Parte>
      {detalle && (
        <>
          {SENSORES.map((s, i) => (
            <Parte
              key={i}
              id={i === 0 ? 'sensor_o2' : 'sensor_co2'}
              separar={[0.05, -0.05, i === 0 ? 0.03 : -0.03]}
              ancla={[s.arriba.x + 0.03, s.arriba.y - 0.06, s.arriba.z]}
            >
              <group position={s.arriba}>
                <mesh position={[0, 0.004, 0]} material={m.negro}>
                  <cylinderGeometry args={[0.007, 0.007, 0.01, 14]} />
                </mesh>
                <mesh position={[0, -s.largo / 2, 0]} material={m.negro}>
                  <cylinderGeometry args={[s.radio, s.radio, s.largo, 24]} />
                </mesh>
                <mesh position={[0, -0.006, 0]} material={m.beige}>
                  <cylinderGeometry args={[s.radio * 0.35, s.radio * 0.35, 0.0015, 12]} />
                </mesh>
                <mesh position={[0, -s.largo - 0.005, 0]} material={m.beige}>
                  <cylinderGeometry args={[s.radio * 0.92, s.radio * 0.75, 0.01, 20]} />
                </mesh>
                <mesh position={[0, -s.largo - 0.02, 0]} material={m.negro}>
                  <cylinderGeometry args={[0.0045, 0.0055, 0.022, 12]} />
                </mesh>
              </group>
            </Parte>
          ))}
          <Parte id="lineas_muestra" separar={[0.04, -0.06, 0]} ancla={[0.15, 1.445, 0.02]}>
            <mesh geometry={g.muestraA} material={m.ambar} />
            <mesh geometry={g.muestraB} material={m.ambar} />
          </Parte>
          <Parte id="bloque_trasero" separar={[0.07, 0, -0.05]} ancla={[0.17, 1.62, -0.05]}>
            <RoundedBox
              args={MONTAJE.tamano}
              radius={0.004}
              smoothness={3}
              position={MONTAJE.centro}
              material={m.beige}
            />
            <Tornillos
              m={m}
              normal={v(1, 0, 0)}
              puntos={[0.026, 0.009, -0.009, -0.026].map((dy) =>
                MONTAJE.centro.clone().add(v(MONTAJE.tamano[0] / 2 + 0.0008, dy, 0.006)),
              )}
            />
            <RoundedBox
              args={MODULO_TRASERO.tamano}
              radius={0.004}
              smoothness={3}
              position={MODULO_TRASERO.centro}
              material={m.marfil}
            />
            <Tornillos
              m={m}
              normal={v(1, 0, 0)}
              puntos={[0.016, -0.016].map((dy) =>
                MODULO_TRASERO.centro
                  .clone()
                  .add(v(MODULO_TRASERO.tamano[0] / 2 + 0.0008, dy, -0.02)),
              )}
            />
          </Parte>
        </>
      )}
      <Parte id="carcasa_der" separar={[-0.08, 0.02, 0.02]} ancla={[-0.15, 1.64, 0.1]}>
        <RoundedBox
          args={CARCASA.tamano}
          radius={0.006}
          smoothness={3}
          position={CARCASA.centro}
          material={m.marfil}
        />
        <mesh position={CARCASA.canister.centro} material={m.marfil}>
          <cylinderGeometry
            args={[CARCASA.canister.radio, CARCASA.canister.radio, CARCASA.canister.alto, 20]}
          />
        </mesh>
        {detalle && (
          <>
            <mesh
              position={CARCASA.canister.centro.clone().add(v(0, 0.019, 0))}
              material={m.marfil}
            >
              <cylinderGeometry args={[0.004, 0.005, 0.008, 12]} />
            </mesh>
            <mesh
              position={CARCASA.soporte.centro.clone().add(new THREE.Vector3(0, 0.024, 0))}
              material={m.marfil}
            >
              <cylinderGeometry args={[0.008, 0.008, 0.016, 14]} />
            </mesh>
            <RoundedBox
              args={CARCASA.soporte.tamano}
              radius={0.003}
              smoothness={2}
              position={CARCASA.soporte.centro}
              material={m.marfil}
            />
            <Tornillos
              m={m}
              normal={v(-1, 0, 0)}
              puntos={[0.012, -0.012].map((dy) =>
                CARCASA.soporte.centro
                  .clone()
                  .add(v(-CARCASA.soporte.tamano[0] / 2 - 0.0008, dy, 0.008)),
              )}
            />
            <mesh
              position={extremoDer.clone().lerp(CARCASA.centro, 0.35)}
              quaternion={desde(CARCASA.centro.clone().sub(extremoDer))}
              material={m.marfil}
            >
              <cylinderGeometry args={[0.0135, 0.0135, 0.03, 18]} />
            </mesh>
            <mesh geometry={g.cable} material={m.negro} />
          </>
        )}
      </Parte>
      <Parte id="disipador" separar={[-0.07, 0, 0]} ancla={[-0.2, 1.6, 0.08]}>
        <RoundedBox
          args={CARCASA.disipador.tamano}
          radius={0.002}
          smoothness={2}
          position={CARCASA.disipador.centro}
          material={m.disipador}
        />
        {detalle && !fantasma && (
          <>
            {[-0.018, -0.009, 0, 0.009, 0.018].map((dz) => (
              <mesh
                key={dz}
                position={CARCASA.disipador.centro.clone().add(v(-0.0083, 0, dz))}
                rotation={[0, -Math.PI / 2, 0]}
                material={m.negro}
              >
                <planeGeometry args={[0.003, 0.046]} />
              </mesh>
            ))}
            <Tornillos
              m={m}
              normal={v(-1, 0, 0)}
              puntos={[
                [0.022, 0.022],
                [0.022, -0.022],
                [-0.022, 0.022],
                [-0.022, -0.022],
              ].map(([dy, dz]) => CARCASA.disipador.centro.clone().add(v(-0.0085, dy, dz)))}
            />
          </>
        )}
      </Parte>
      <Parte id="placas" separar={[0, 0.03, -0.03]} ancla={[0.13, 1.74, -0.03]}>
        <mesh geometry={g.placaIzq} material={m.transparente} renderOrder={1} />
        <mesh geometry={g.placaDer} material={m.transparente} renderOrder={1} />
        {detalle && (
          <>
            <mesh geometry={g.bordeIzq} material={m.transparente} />
            <mesh geometry={g.bordeDer} material={m.transparente} />
            {([1, -1] as const).flatMap((lado) =>
              [0, 1].map((i) => (
                <mesh
                  key={`${lado}${i}`}
                  geometry={g[`montante${lado}${i}` as keyof typeof g]}
                  material={m.transparente}
                />
              )),
            )}
            {([1, -1] as const).flatMap((lado) =>
              montantes(lado).flatMap((par) =>
                [0.3, 0.75].map((t) => (
                  <mesh
                    key={`${lado}${par[0].z}${t}`}
                    position={par[0].clone().lerp(par[1], t)}
                    rotation={[0, 0, Math.PI / 2]}
                    material={m.marfil}
                  >
                    <cylinderGeometry args={[0.0055, 0.0055, 0.012, 12]} />
                  </mesh>
                )),
              ),
            )}
          </>
        )}
      </Parte>
      <Parte id="arnes" separar={[0, 0.05, 0]} ancla={[0.0, 1.81, 0.0]}>
        <mesh geometry={g.lateral} material={m.marino} />
        <mesh geometry={g.coronaA} material={m.marino} />
        <mesh geometry={g.coronaB} material={m.marino} />
        {detalle && (
          <>
            <mesh geometry={g.forro} material={m.negro} />
            <mesh geometry={g.almohadilla} material={m.gamuza} />
            {([1, -1] as const).map((s) => {
              const h = HEBILLAS(s);
              return [h.superior, h.inferior].map((x, i) => (
                <group
                  key={`${s}${i}`}
                  position={x.centro}
                  quaternion={desde(x.hacia.clone().sub(x.centro), v(0, 0, 1))}
                >
                  <RoundedBox
                    args={[0.02, 0.024, 0.004]}
                    radius={0.0015}
                    smoothness={2}
                    material={m.gris}
                  />
                </group>
              ));
            })}
            <mesh geometry={g.correaHi1} material={m.negro} />
            <mesh geometry={g.correaHi2} material={m.negro} />
            <mesh geometry={g.correaHd1} material={m.negro} />
            <mesh geometry={g.correaHd2} material={m.negro} />
          </>
        )}
      </Parte>
      {detalle && (
        <Parte id="linea_laton" separar={[0, 0.06, 0.02]} ancla={[0.02, 1.81, 0.04]}>
          <mesh geometry={g.laton} material={m.laton} />
          <mesh
            position={LINEA_LATON[0]}
            quaternion={desde(LINEA_LATON[1].clone().sub(LINEA_LATON[0]))}
            material={m.laton}
          >
            <cylinderGeometry args={[0.0048, 0.0048, 0.02, 14]} />
          </mesh>
        </Parte>
      )}
      <Parte id="umbilical" separar={[0.06, 0, -0.04]} ancla={[0.2, 1.25, -0.12]}>
        <mesh geometry={g.umbilical} material={m.trenza} />
        {detalle && (
          <group position={v(0.168, 0.958, 0.024)} rotation={[0.35, 0, 0]}>
            <mesh material={m.marfil}>
              <cylinderGeometry args={[0.0115, 0.0105, 0.055, 18]} />
            </mesh>
            <mesh position={[0, -0.04, 0]} material={m.metal}>
              <cylinderGeometry args={[0.0038, 0.0038, 0.028, 12]} />
            </mesh>
          </group>
        )}
      </Parte>
      {/* Codo blanco de la manguera izquierda al salir de la T. */}
      {detalle && (
        <mesh position={extremoIzq} quaternion={desde(dirCamara)} material={m.marfil}>
          <cylinderGeometry args={[0.0128, 0.0128, 0.008, 16]} />
        </mesh>
      )}
    </group>
  );
}
