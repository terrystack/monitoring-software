import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Parte } from '../despiece';
import { cinta, superficie, tubo, useGeometrias } from '../geometria';
import { useMateriales, type Variante } from '../materiales';
import {
  normalSuperficie,
  PERFIL_CABEZA,
  puntoSuperficie,
  seccionEn,
  type Perfil,
} from '../medidas';
import {
  ALTO,
  BANDA_CABEZA_Y,
  BOLSILLO,
  bordeSuperior,
  ELECTRODOS,
  HOLGURA,
  orientar,
  RIP,
  TEMP,
} from './geometria';

/**
 * Astroskin (AYNI_DISPOSITIVOS_3D.md §4): camiseta sin mangas con 4 electrodos textiles de ECG,
 * dos bandas de respiración (RIP), temperatura de piel, registrador en el bolsillo lateral
 * izquierdo y banda de cabeza con PPG/SpO₂ en la frente. Representación inspirada en el
 * sistema Bio-Monitor de la CSA; sin marcas.
 */

interface Props {
  perfil: Perfil;
  variante?: Variante;
}

export function Astroskin({ perfil, variante = 'normal' }: Props) {
  const m = useMateriales(variante);

  const g = useGeometrias(() => {
    const camiseta = superficie(
      (u, v) => {
        const tope = bordeSuperior(u * 360);
        const y = ALTO.desde + (tope - ALTO.desde) * v;
        return puntoSuperficie(perfil, y, u * 360, HOLGURA);
      },
      240,
      40,
      { cerradaU: true },
    );
    const ribete = tubo(
      Array.from({ length: 240 }, (_, i) => {
        const a = (i / 240) * 360;
        return puntoSuperficie(perfil, bordeSuperior(a), a, HOLGURA + 0.0005);
      }),
      0.0018,
      true,
      480,
    );

    const centroHombros = new THREE.Vector3(0, 1.36, 0.0);
    const tirante = (lado: 1 | -1) =>
      cinta(
        [
          puntoSuperficie(perfil, bordeSuperior(lado * 46) - 0.015, lado * 46, HOLGURA),
          new THREE.Vector3(lado * 0.1, 1.505, 0.045),
          new THREE.Vector3(lado * 0.108, 1.528, 0.0),
          new THREE.Vector3(lado * 0.1, 1.505, -0.045),
          puntoSuperficie(perfil, bordeSuperior(lado * 140) - 0.015, lado * 140, HOLGURA),
        ],
        (p) => p.clone().sub(centroHombros).normalize(),
        0.042,
        false,
        40,
      );

    const anillo = (y: number, extra: number, radio: number) =>
      tubo(
        Array.from({ length: 48 }, (_, i) => puntoSuperficie(perfil, y, (i / 48) * 360, extra)),
        radio,
        true,
        120,
      );

    const cables = ELECTRODOS.map((e) =>
      tubo(
        Array.from({ length: 10 }, (_, i) => {
          const t = i / 9;
          const y = e.y + (BOLSILLO.y + 0.02 - e.y) * t;
          const a = e.a + (BOLSILLO.a - 4 - e.a) * t;
          return puntoSuperficie(perfil, y, a, HOLGURA + 0.0016);
        }),
        0.0011,
        false,
        40,
      ),
    );

    const cabeza = Array.from({ length: 48 }, (_, i) =>
      puntoSuperficie(PERFIL_CABEZA, BANDA_CABEZA_Y, (i / 48) * 360, 0.004),
    );
    const bandaCabeza = cinta(
      cabeza,
      (p) => {
        const s = seccionEn(PERFIL_CABEZA, BANDA_CABEZA_Y);
        return new THREE.Vector3(p.x / s.rx ** 2, 0, (p.z - s.cz) / s.rz ** 2).normalize();
      },
      0.026,
      true,
      120,
    );

    return {
      camiseta,
      ribete,
      tiranteIzq: tirante(1),
      tiranteDer: tirante(-1),
      ripTorax: anillo(RIP[0], HOLGURA + 0.007, 0.0055),
      ripAbdomen: anillo(RIP[1], HOLGURA + 0.007, 0.0055),
      dobladillo: anillo(ALTO.desde + 0.002, HOLGURA + 0.001, 0.0022),
      cable0: cables[0],
      cable1: cables[1],
      cable2: cables[2],
      cable3: cables[3],
      bandaCabeza,
    };
  }, [perfil]);

  const electrodos = ELECTRODOS.map((e) => ({
    ...e,
    p: puntoSuperficie(perfil, e.y, e.a, HOLGURA + 0.0012),
    q: orientar(normalSuperficie(perfil, e.y, e.a)),
  }));
  const temp = {
    p: puntoSuperficie(perfil, TEMP.y, TEMP.a, HOLGURA + 0.0015),
    q: orientar(normalSuperficie(perfil, TEMP.y, TEMP.a)),
  };
  const nBolsillo = normalSuperficie(perfil, BOLSILLO.y, BOLSILLO.a);
  const qBolsillo = orientar(nBolsillo);
  const pBolsillo = puntoSuperficie(perfil, BOLSILLO.y, BOLSILLO.a, HOLGURA + 0.014);
  const pRegistrador = puntoSuperficie(perfil, BOLSILLO.y + 0.022, BOLSILLO.a, HOLGURA + 0.013);
  const frente = puntoSuperficie(PERFIL_CABEZA, BANDA_CABEZA_Y, 0, 0.0115);
  const fantasma = variante === 'fantasma';

  return (
    <group name="astroskin">
      <Parte id="camiseta" separar={[0, 0, 0.05]} ancla={[0.0, 1.2, 0.18]}>
        <mesh geometry={g.camiseta} material={m.tela} />
        <mesh geometry={g.tiranteIzq} material={m.tela} />
        <mesh geometry={g.tiranteDer} material={m.tela} />
        <mesh geometry={g.dobladillo} material={m.acento} />
        <mesh geometry={g.ribete} material={m.acento} />
      </Parte>
      <Parte id="banda_rip_torax" separar={[0, 0.03, 0.09]} ancla={[-0.12, RIP[0], 0.16]}>
        <mesh geometry={g.ripTorax} material={m.banda} />
      </Parte>
      <Parte id="banda_rip_abdomen" separar={[0, -0.03, 0.09]} ancla={[-0.12, RIP[1], 0.16]}>
        <mesh geometry={g.ripAbdomen} material={m.banda} />
      </Parte>
      <Parte id="electrodos" separar={[0, 0, 0.13]} ancla={[0.07, 1.42, 0.13]}>
        {electrodos.map((e) => (
          <group key={e.id} position={e.p} quaternion={e.q}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.7]} material={m.metal}>
              <cylinderGeometry args={[0.016, 0.016, 0.0016, 28]} />
            </mesh>
            {!fantasma && (
              <mesh position={[0, 0, 0.0009]} scale={[1, 0.7, 1]} material={m.acento}>
                <ringGeometry args={[0.0145, 0.0165, 28]} />
              </mesh>
            )}
          </group>
        ))}
        <mesh geometry={g.cable0} material={m.acento} />
        <mesh geometry={g.cable1} material={m.acento} />
        <mesh geometry={g.cable2} material={m.acento} />
        <mesh geometry={g.cable3} material={m.acento} />
      </Parte>
      <Parte id="temp_piel" separar={[0.06, 0, 0]} ancla={[temp.p.x + 0.02, temp.p.y, temp.p.z]}>
        <group position={temp.p} quaternion={temp.q}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.metal}>
            <cylinderGeometry args={[0.007, 0.007, 0.003, 20]} />
          </mesh>
        </group>
      </Parte>
      <Parte
        id="registrador"
        separar={[0.09, 0.03, 0]}
        ancla={[pRegistrador.x + 0.03, pRegistrador.y + 0.05, pRegistrador.z]}
      >
        <group position={pRegistrador} quaternion={qBolsillo}>
          <RoundedBox
            args={[0.055, 0.085, 0.022]}
            radius={0.007}
            smoothness={4}
            material={m.plastico}
          />
          {!fantasma && (
            <>
              <mesh position={[0, 0.03, 0.0112]} material={m.acento}>
                <circleGeometry args={[0.0028, 16]} />
              </mesh>
              <mesh position={[0, 0.012, 0.0112]} material={m.metal}>
                <planeGeometry args={[0.032, 0.0035]} />
              </mesh>
            </>
          )}
        </group>
      </Parte>
      <Parte id="bolsillo" separar={[0.05, 0, 0]}>
        <group position={pBolsillo} quaternion={qBolsillo}>
          <RoundedBox
            args={[0.066, 0.068, 0.027]}
            radius={0.006}
            smoothness={3}
            material={m.tela}
          />
        </group>
      </Parte>
      <Parte id="banda_cabeza" separar={[0, 0.06, 0]} ancla={[0.09, BANDA_CABEZA_Y + 0.01, 0.03]}>
        <mesh geometry={g.bandaCabeza} material={m.tela} />
      </Parte>
      <Parte
        id="modulo_ppg"
        separar={[0, 0.06, 0.06]}
        ancla={[0, frente.y + 0.025, frente.z + 0.01]}
      >
        <group position={frente}>
          <RoundedBox
            args={[0.03, 0.018, 0.007]}
            radius={0.003}
            smoothness={3}
            material={m.plastico}
          />
          {!fantasma && (
            <mesh position={[0.009, 0, 0.0037]} material={m.acento}>
              <circleGeometry args={[0.0018, 14]} />
            </mesh>
          )}
        </group>
      </Parte>
    </group>
  );
}
