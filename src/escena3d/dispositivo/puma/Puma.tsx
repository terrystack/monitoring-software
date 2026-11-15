import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Parte } from '../despiece';
import { cinta, superficie, tubo, useGeometrias } from '../geometria';
import { useMateriales, type Variante } from '../materiales';
import { PERFIL_CABEZA, puntoSuperficie, seccionEn, type Perfil } from '../medidas';
import { alinear, CAJA, CENTRO_CABEZA, CINTURON_Y, geometriaPuma, puntoMascara } from './geometria';

/**
 * PUMA, Portable Unit for Metabolic Analysis (AYNI_DISPOSITIVOS_3D.md §5), inspirado en el
 * desarrollo de NASA Glenn: máscara oronasal con arnés; del manifold salen dos canales. El
 * izquierdo lleva O₂ (fluorescencia por fibra óptica) y CO₂ (infrarrojo); el derecho, flujo
 * ultrasónico. Un cable con la fibra baja a la caja electrónica con batería en la cadera.
 */

interface Props {
  torso: Perfil;
  variante?: Variante;
}

export function Puma({ torso, variante = 'normal' }: Props) {
  const m = useMateriales(variante);
  const base = geometriaPuma(torso);
  const fantasma = variante === 'fantasma';

  const g = useGeometrias(() => {
    const geo = geometriaPuma(torso);
    const mascara = superficie((u, v) => puntoMascara(u, v), 64, 18, { cerradaU: true });
    const sello = tubo(
      Array.from({ length: 48 }, (_, i) => puntoMascara(i / 48, 1, -0.001)),
      0.0042,
      true,
      96,
    );
    const canalIzq = tubo([geo.izq.desde, geo.izq.hasta], 0.0105, false, 8);
    const canalDer = tubo([geo.der.desde, geo.der.hasta], 0.0105, false, 8);

    const sobreCabeza = (y: number, a: number) => puntoSuperficie(PERFIL_CABEZA, y, a, 0.004);
    const correa = (lado: 1 | -1, puntos: [number, number][], inicio: THREE.Vector3) =>
      cinta(
        [inicio, ...puntos.map(([y, a]) => sobreCabeza(y, lado * a))],
        (p) => p.clone().sub(CENTRO_CABEZA).normalize(),
        0.017,
        false,
        48,
      );
    const bordeSup = (lado: 1 | -1) => puntoMascara(lado === 1 ? 0.14 : 0.36, 1, 0.003);
    const bordeInf = (lado: 1 | -1) => puntoMascara(lado === 1 ? 0.88 : 0.62, 1, 0.003);
    const superior: [number, number][] = [
      [1.66, 62],
      [1.705, 92],
      [1.735, 125],
      [1.735, 158],
    ];
    const inferior: [number, number][] = [
      [1.582, 72],
      [1.59, 100],
      [1.615, 135],
      [1.645, 165],
    ];

    const cableRuta = [
      geo.der.hasta.clone(),
      new THREE.Vector3(-0.048, 1.505, 0.112),
      puntoSuperficie(torso, 1.4, -30, 0.02),
      puntoSuperficie(torso, 1.24, -38, 0.022),
      puntoSuperficie(torso, 1.1, -55, 0.022),
      puntoSuperficie(torso, CAJA.y + 0.05, CAJA.a + 12, 0.03),
      geo.caja.clone().add(new THREE.Vector3(0, 0.035, 0)),
    ];
    const fibraRuta = [
      geo.o2.clone().add(new THREE.Vector3(0.007, 0.004, 0.02)),
      geo.o2.clone().add(new THREE.Vector3(0.0, -0.01, 0.03)),
      geo.der.hasta.clone().add(new THREE.Vector3(0.012, -0.004, 0.012)),
      ...cableRuta.slice(1).map((p) => p.clone().add(new THREE.Vector3(0.006, 0, 0.004))),
    ];

    const cinturon = cinta(
      Array.from({ length: 48 }, (_, i) =>
        puntoSuperficie(torso, CINTURON_Y, (i / 48) * 360, 0.006),
      ),
      (p) => {
        const s = seccionEn(torso, CINTURON_Y);
        return new THREE.Vector3(p.x / s.rx ** 2, 0, (p.z - s.cz) / s.rz ** 2).normalize();
      },
      0.034,
      true,
      120,
    );

    return {
      mascara,
      sello,
      canalIzq,
      canalDer,
      supIzq: correa(1, superior, bordeSup(1)),
      supDer: correa(-1, superior, bordeSup(-1)),
      infIzq: correa(1, inferior, bordeInf(1)),
      infDer: correa(-1, inferior, bordeInf(-1)),
      cable: tubo(cableRuta, 0.003, false, 96),
      fibra: tubo(fibraRuta, 0.0012, false, 96),
      cinturon,
    };
  }, [torso]);

  const qIzq = alinear(base.izq.dir);
  const qDer = alinear(base.der.dir);
  const qCaja = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), base.nCaja);
  const placa = puntoSuperficie(PERFIL_CABEZA, 1.69, 180, 0.006);
  const perpDer = new THREE.Vector3()
    .crossVectors(base.der.dir, new THREE.Vector3(0, 0, 1))
    .normalize();

  return (
    <group name="puma">
      <Parte id="mascara" separar={[0, 0, 0.05]} ancla={[0.06, 1.64, 0.2]}>
        <mesh geometry={g.mascara} material={m.transparente} renderOrder={2} />
      </Parte>
      <Parte id="sello" separar={[0, 0, 0.025]} ancla={[-0.06, 1.65, 0.16]}>
        <mesh geometry={g.sello} material={m.silicona} />
      </Parte>
      <Parte
        id="manifold"
        separar={[0, 0.0, 0.09]}
        ancla={[0, base.manifold.y + 0.03, base.manifold.z + 0.02]}
      >
        <mesh position={base.manifold} rotation={[Math.PI / 2, 0, 0]} material={m.plastico}>
          <cylinderGeometry args={[0.015, 0.015, 0.022, 28]} />
        </mesh>
        <mesh
          position={base.manifold.clone().add(new THREE.Vector3(0, 0, 0.0112))}
          material={m.acento}
        >
          <ringGeometry args={[0.009, 0.0105, 28]} />
        </mesh>
      </Parte>
      <Parte id="canal_izq" separar={[0.05, -0.02, 0.08]}>
        <mesh geometry={g.canalIzq} material={m.plasticoClaro} />
        <Parte
          id="sensor_o2"
          separar={[0.03, 0.03, 0.02]}
          ancla={[base.o2.x + 0.05, base.o2.y + 0.02, base.o2.z + 0.03]}
        >
          <group position={base.o2} quaternion={qIzq}>
            <mesh material={m.plastico}>
              <cylinderGeometry args={[0.0135, 0.0135, 0.018, 24]} />
            </mesh>
            <mesh position={[0.004, 0, 0.016]} rotation={[Math.PI / 2, 0, 0]} material={m.plastico}>
              <cylinderGeometry args={[0.0055, 0.0055, 0.012, 16]} />
            </mesh>
            <mesh position={[0.004, 0, 0.0222]} material={m.acento}>
              <circleGeometry args={[0.0055, 16]} />
            </mesh>
          </group>
        </Parte>
        <Parte
          id="sensor_co2"
          separar={[0.05, -0.01, 0.02]}
          ancla={[base.co2.x + 0.025, base.co2.y - 0.02, base.co2.z + 0.015]}
        >
          <group position={base.co2} quaternion={qIzq}>
            <RoundedBox
              args={[0.026, 0.03, 0.02]}
              radius={0.003}
              smoothness={3}
              material={m.plastico}
            />
            {!fantasma && (
              <mesh position={[0, 0, 0.0102]} material={m.led}>
                <planeGeometry args={[0.014, 0.004]} />
              </mesh>
            )}
          </group>
        </Parte>
      </Parte>
      <Parte id="canal_der" separar={[-0.05, -0.02, 0.08]}>
        <mesh geometry={g.canalDer} material={m.plasticoClaro} />
        <Parte
          id="sensor_flujo"
          separar={[-0.04, 0, 0.02]}
          ancla={[base.flujo.x - 0.06, base.flujo.y, base.flujo.z + 0.02]}
        >
          <group position={base.flujo} quaternion={qDer}>
            <mesh material={m.plastico}>
              <cylinderGeometry args={[0.0135, 0.0135, 0.04, 24]} />
            </mesh>
          </group>
          {[1, -1].map((s) => (
            <mesh
              key={s}
              position={base.flujo
                .clone()
                .add(perpDer.clone().multiplyScalar(0.015 * s))
                .add(base.der.dir.clone().multiplyScalar(0.01 * s))}
              quaternion={alinear(
                perpDer.clone().multiplyScalar(s).add(base.der.dir.clone().multiplyScalar(-s)),
              )}
              material={m.metal}
            >
              <cylinderGeometry args={[0.005, 0.005, 0.014, 16]} />
            </mesh>
          ))}
        </Parte>
      </Parte>
      <Parte id="arnes" separar={[0, 0.02, -0.05]} ancla={[0.09, 1.72, -0.02]}>
        <mesh geometry={g.supIzq} material={m.tela} />
        <mesh geometry={g.supDer} material={m.tela} />
        <mesh geometry={g.infIzq} material={m.tela} />
        <mesh geometry={g.infDer} material={m.tela} />
        <group position={placa}>
          <RoundedBox
            args={[0.05, 0.075, 0.004]}
            radius={0.0019}
            smoothness={2}
            material={m.plastico}
          />
        </group>
      </Parte>
      <Parte id="cable" separar={[-0.03, 0, 0.05]} ancla={[-0.12, 1.25, 0.16]}>
        <mesh geometry={g.cable} material={m.plastico} />
        <mesh geometry={g.fibra} material={m.fibra} />
      </Parte>
      <Parte id="cinturon" separar={[0, -0.04, 0]}>
        <mesh geometry={g.cinturon} material={m.tela} />
      </Parte>
      <Parte
        id="caja_electronica"
        separar={[-0.09, 0.02, 0]}
        ancla={[base.caja.x - 0.06, base.caja.y + 0.05, base.caja.z]}
      >
        <group position={base.caja} quaternion={qCaja}>
          <RoundedBox
            args={[0.11, 0.07, 0.035]}
            radius={0.008}
            smoothness={4}
            material={m.plastico}
          />
          {!fantasma && (
            <>
              <mesh position={[0.038, 0.022, 0.0177]} material={m.acento}>
                <circleGeometry args={[0.003, 16]} />
              </mesh>
              {[-0.012, -0.004, 0.004, 0.012].map((y) => (
                <mesh key={y} position={[-0.015, y, 0.0177]} material={m.metal}>
                  <planeGeometry args={[0.05, 0.0022]} />
                </mesh>
              ))}
            </>
          )}
        </group>
      </Parte>
      <Parte
        id="bateria"
        separar={[-0.07, -0.05, 0]}
        ancla={[base.caja.x - 0.05, base.caja.y - 0.07, base.caja.z]}
      >
        <group position={base.caja} quaternion={qCaja}>
          <RoundedBox
            args={[0.07, 0.04, 0.02]}
            radius={0.004}
            smoothness={3}
            position={[0, -0.055, -0.006]}
            material={m.plasticoClaro}
          />
        </group>
      </Parte>
    </group>
  );
}
