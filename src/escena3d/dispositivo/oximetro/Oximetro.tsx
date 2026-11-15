import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Parte } from '../despiece';
import { crearMateriales, type Variante } from '../materiales';
import { DEDO_INDICE_IZQ } from '../medidas';
import { ROTACION } from './geometria';

/**
 * Pulsioxímetro de dedo (vistas isométrica, superior y lateral) en el índice izquierdo.
 * Marco local: Z hacia la punta del dedo (bisagra), Y hacia el dorso (uña, pantalla), X = Y × Z.
 * Medidas de un modelo típico: ≈ 58 × 34 × 33 mm. Carcasa blanca con borde gris, pantalla OLED
 * con SpO₂ y pulso del motor, botón ovalado del lado de la bisagra y almohadillas de silicona.
 */

interface Props {
  variante?: Variante;
  spo2: number | null;
  pulso: number | null;
  /** Duración (ms) de la animación de colocar: la pinza se abre y se cierra; null = cerrada. */
  colocar?: number | null;
  /** Cambia para relanzar la animación. */
  repeticion?: string;
  reducido: boolean;
}

/** Medidas (m) en el marco local. */
const L = 0.058;
const W = 0.034;
/** Hueco del dedo medido en la piel: de −7,8 a +10,9 mm alrededor del centro de la falange. */
const SUPERIOR = { desde: 0.0108, hasta: 0.0255 };
const INFERIOR = { desde: -0.0228, hasta: -0.0083 };
const BISAGRA_Z = L / 2 - 0.004;
const PANTALLA = { ancho: 0.019, largo: 0.034, z: -0.0045 };
const BOTON_Z = 0.0175;

/** Placa de esquinas redondeadas (vista superior) extruida en altura, centrada en x y z. */
function placa(ancho: number, largo: number, radio: number, alto: number, bisel = 0.0015) {
  const w = ancho / 2 - bisel;
  const l = largo / 2 - bisel;
  const r = Math.min(radio, w, l);
  const s = new THREE.Shape();
  s.moveTo(-w + r, -l);
  s.lineTo(w - r, -l);
  s.quadraticCurveTo(w, -l, w, -l + r);
  s.lineTo(w, l - r);
  s.quadraticCurveTo(w, l, w - r, l);
  s.lineTo(-w + r, l);
  s.quadraticCurveTo(-w, l, -w, l - r);
  s.lineTo(-w, -l + r);
  s.quadraticCurveTo(-w, -l, -w + r, -l);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(1e-4, alto - 2 * bisel),
    bevelEnabled: bisel > 0,
    bevelSize: bisel,
    bevelThickness: bisel,
    bevelSegments: 3,
    curveSegments: 10,
  });
  // Forma en XY, extrusión en +Z → largo a lo largo de Z y alto hacia +Y.
  g.rotateX(-Math.PI / 2);
  g.translate(0, bisel, 0);
  return g;
}

/** Plano en XZ mirando a +Y con el texto leyéndose hacia la punta (+Z) y "arriba" hacia +X. */
const ORIENTACION_PANTALLA = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
  ),
);

function dibujarPantalla(c: CanvasRenderingContext2D, spo2: number | null, pulso: number | null) {
  const { width: w, height: h } = c.canvas;
  c.fillStyle = '#05070A';
  c.fillRect(0, 0, w, h);
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#F5C518';
  c.font = '700 40px Biryani, system-ui, sans-serif';
  c.fillText('%SpO₂', 26, 58);
  c.textAlign = 'right';
  c.fillText('bpmPR', w - 26, 58);
  c.textAlign = 'left';
  c.beginPath();
  c.arc(w / 2 - 6, 44, 17, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#05070A';
  c.lineWidth = 3;
  c.beginPath();
  [
    [-6, -9],
    [3, -2],
    [-4, 4],
    [-4, -10],
    [3, -4],
    [-6, 3],
  ].forEach(([x, y]) => c.lineTo(w / 2 - 6 + x, 44 + y + 3));
  c.stroke();
  c.fillStyle = '#22D3EE';
  c.font = '800 128px Biryani, system-ui, sans-serif';
  c.fillText(spo2 == null ? '--' : String(Math.round(spo2)), 34, 196);
  c.textAlign = 'right';
  c.font = '800 112px Biryani, system-ui, sans-serif';
  c.fillText(pulso == null ? '--' : String(Math.round(pulso)), w - 26, 196);
  c.textAlign = 'left';
  // Barra de intensidad del pulso y onda pletismográfica.
  c.fillRect(14, 150, 10, 48);
  c.strokeStyle = '#22D3EE';
  c.lineWidth = 5;
  c.lineJoin = 'round';
  c.beginPath();
  for (let x = 30; x <= w - 30; x += 4) {
    const f = ((x - 30) / 58) % 1;
    const y = 252 - 24 * (f < 0.45 ? f / 0.45 : 1 - (f - 0.45) / 0.55);
    c.lineTo(x, y);
  }
  c.stroke();
}

function crearMaterialesOximetro(variante: Variante) {
  const base = crearMateriales(variante);
  if (variante === 'fantasma')
    return { ...base, blanco: base.tela, gris: base.tela, negro: base.tela, boton: base.tela };
  const std = (color: string, rugosidad: number, brillo = '#000000') =>
    new THREE.MeshPhysicalMaterial({
      color,
      emissive: brillo,
      roughness: rugosidad,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
    });
  return {
    ...base,
    blanco: std('#FFFFFF', 0.38, '#3B3E44'),
    gris: std('#8E9298', 0.55, '#1C1E22'),
    negro: std('#0B0D10', 0.15),
    boton: std('#3A3D42', 0.4),
  };
}

export function Oximetro({
  variante = 'normal',
  spo2,
  pulso,
  colocar = null,
  repeticion,
  reducido,
}: Props) {
  const m = useMemo(() => crearMaterialesOximetro(variante), [variante]);
  useEffect(
    () => () => new Set(Object.values(m) as THREE.Material[]).forEach((x) => x.dispose()),
    [m],
  );
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const superior = useRef<THREE.Group>(null);
  const inicio = useRef<number | null>(null);
  useEffect(() => {
    inicio.current = null;
  }, [colocar, repeticion]);

  const g = useMemo(() => {
    const altoSup = SUPERIOR.hasta - SUPERIOR.desde;
    const altoInf = INFERIOR.hasta - INFERIOR.desde;
    return {
      // Carcasa superior: cuerpo blanco, borde gris arriba y placa blanca con la pantalla.
      cuerpoSup: placa(W - 0.001, L - 0.003, 0.012, altoSup * 0.62),
      bordeSup: placa(W + 0.0015, L + 0.0015, 0.0135, altoSup * 0.5, 0.0022),
      placaSup: placa(W - 0.0025, L - 0.004, 0.0118, 0.0016, 0.0006),
      marcoPantalla: placa(PANTALLA.ancho + 0.002, PANTALLA.largo + 0.002, 0.004, 0.0008, 0.0003),
      // Carcasa inferior: cuerpo blanco y base gris.
      cuerpoInf: placa(W - 0.002, L - 0.006, 0.011, altoInf * 0.72),
      baseInf: placa(W - 0.0015, L - 0.005, 0.0115, altoInf * 0.38, 0.002),
      almohadilla: placa(0.022, 0.042, 0.008, 0.002, 0.0007),
      puente: placa(W - 0.006, 0.011, 0.004, SUPERIOR.desde - INFERIOR.hasta + 0.004, 0.0015),
      botonAro: placa(0.0075, 0.011, 0.0037, 0.0012, 0.0004),
      boton: placa(0.0055, 0.009, 0.0027, 0.0018, 0.0005),
    };
  }, []);
  useEffect(() => () => Object.values(g).forEach((x) => x.dispose()), [g]);

  const pantalla = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 288;
    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = 4;
    return { canvas, textura };
  }, []);
  useEffect(() => {
    const ctx = pantalla.canvas.getContext('2d');
    if (!ctx) return;
    dibujarPantalla(ctx, spo2, pulso);
    pantalla.textura.needsUpdate = true;
  }, [pantalla, spo2, pulso]);
  useEffect(() => () => pantalla.textura.dispose(), [pantalla]);

  useFrame((state) => {
    if (superior.current) {
      let apertura = 0;
      if (colocar && !reducido) {
        inicio.current ??= state.clock.elapsedTime;
        const t = (state.clock.elapsedTime - inicio.current) / (colocar / 1000);
        apertura = t < 1 ? 0.42 * Math.sin(Math.PI * t) : 0;
      }
      superior.current.rotation.x = apertura;
    }
    if (!led.current) return;
    if (reducido) {
      led.current.emissiveIntensity = 1.4;
      return;
    }
    const fase = (state.clock.elapsedTime * ((pulso ?? 70) / 60)) % 1;
    led.current.emissiveIntensity = 0.6 + 2.2 * Math.exp(-fase * 7);
  });

  const fantasma = variante === 'fantasma';
  const altoSup = SUPERIOR.hasta - SUPERIOR.desde;
  const topeSup = SUPERIOR.desde + altoSup * 0.62;
  const altoInf = INFERIOR.hasta - INFERIOR.desde;

  return (
    <group position={DEDO_INDICE_IZQ.centro} quaternion={ROTACION}>
      {/* La mitad superior gira sobre la bisagra (lado de la punta) al abrirse. */}
      <group position={[0, 0.0012, BISAGRA_Z]}>
        <group ref={superior}>
          <group position={[0, -0.0012, -BISAGRA_Z]}>
            <Parte id="carcasa_superior" separar={[0, 0.03, 0]} ancla={[0.024, 0.02, -0.01]}>
              <mesh geometry={g.cuerpoSup} position={[0, SUPERIOR.desde, 0]} material={m.blanco} />
              <mesh
                geometry={g.bordeSup}
                position={[0, topeSup - altoSup * 0.5 + 0.0012, 0]}
                material={m.gris}
              />
              <mesh geometry={g.placaSup} position={[0, topeSup + 0.0011, 0]} material={m.blanco} />
              <group position={[0, topeSup + 0.0027, BOTON_Z]}>
                <mesh geometry={g.botonAro} material={m.blanco} />
                <mesh geometry={g.boton} position={[0, 0.0002, 0]} material={m.boton} />
              </group>
              {!fantasma && (
                <mesh position={[0, SUPERIOR.desde - 0.0003, 0.002]} rotation={[Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.0035, 20]} />
                  <meshStandardMaterial
                    ref={led}
                    color="#F87171"
                    emissive="#F87171"
                    emissiveIntensity={1.4}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              )}
            </Parte>
            <Parte id="pantalla" separar={[0, 0.055, 0]} ancla={[0, 0.032, PANTALLA.z]}>
              <mesh
                geometry={g.marcoPantalla}
                position={[0, topeSup + 0.0026, PANTALLA.z]}
                material={m.negro}
              />
              {!fantasma && (
                <mesh
                  position={[0, topeSup + 0.0035, PANTALLA.z]}
                  quaternion={ORIENTACION_PANTALLA}
                >
                  <planeGeometry args={[PANTALLA.largo * 0.94, PANTALLA.ancho * 0.9]} />
                  <meshBasicMaterial map={pantalla.textura} toneMapped={false} />
                </mesh>
              )}
            </Parte>
            <Parte id="almohadilla" separar={[0, 0.014, 0]}>
              <mesh
                geometry={g.almohadilla}
                position={[0, SUPERIOR.desde - 0.0018, -0.004]}
                material={m.silicona}
              />
            </Parte>
          </group>
        </group>
      </group>
      <Parte id="carcasa_inferior" separar={[0, -0.03, 0]} ancla={[0.022, -0.022, -0.004]}>
        <mesh
          geometry={g.cuerpoInf}
          position={[0, INFERIOR.hasta - altoInf * 0.72, -0.0015]}
          material={m.blanco}
        />
        <mesh geometry={g.baseInf} position={[0, INFERIOR.desde, -0.0015]} material={m.gris} />
        <mesh
          geometry={g.almohadilla}
          position={[0, INFERIOR.hasta - 0.0002, -0.004]}
          material={m.silicona}
        />
      </Parte>
      <Parte id="bisagra" separar={[0, 0, 0.03]} ancla={[0, 0, 0.034]}>
        <mesh
          geometry={g.puente}
          position={[0, INFERIOR.hasta - 0.002, BISAGRA_Z - 0.0015]}
          material={m.blanco}
        />
        <mesh position={[0, 0.0012, BISAGRA_Z]} rotation={[0, 0, Math.PI / 2]} material={m.gris}>
          <cylinderGeometry args={[0.0055, 0.0055, W * 0.6, 20]} />
        </mesh>
        <mesh
          position={[0, 0, BISAGRA_Z + 0.002]}
          rotation={[0, Math.PI / 2, 0]}
          material={m.metal}
        >
          <torusGeometry args={[0.0058, 0.0008, 6, 18]} />
        </mesh>
      </Parte>
    </group>
  );
}
