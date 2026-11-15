import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Parte } from '../despiece';
import { useMateriales, type Variante } from '../materiales';
import { DEDO_INDICE_IZQ } from '../medidas';
import { ROTACION } from './geometria';

/**
 * Pulsioxímetro de dedo (AYNI_DISPOSITIVOS_3D.md §6) en el índice izquierdo.
 * Marco local: Z hacia la punta del dedo, Y hacia el dorso (uña), X = Y × Z.
 * Medidas de un modelo comercial típico: ≈ 58 × 33 × 32 mm.
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

function dibujarPantalla(ctx: CanvasRenderingContext2D, spo2: number | null, pulso: number | null) {
  const { width: w, height: h } = ctx.canvas;
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#64748B';
  ctx.font = '600 24px Biryani, system-ui, sans-serif';
  ctx.fillText('SpO₂%', 16, 30);
  ctx.fillText('PR', w - 64, 30);
  ctx.fillStyle = '#22D3EE';
  ctx.font = '700 92px Biryani, system-ui, sans-serif';
  ctx.fillText(spo2 == null ? '--' : String(Math.round(spo2)), 12, h * 0.5);
  ctx.fillStyle = '#FBBF24';
  ctx.font = '700 46px Biryani, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(pulso == null ? '--' : String(Math.round(pulso)), w - 14, h * 0.83);
  ctx.textAlign = 'left';
}

export function Oximetro({
  variante = 'normal',
  spo2,
  pulso,
  colocar = null,
  repeticion,
  reducido,
}: Props) {
  const m = useMateriales(variante);
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const superior = useRef<THREE.Group>(null);
  const inicio = useRef<number | null>(null);
  useEffect(() => {
    inicio.current = null;
  }, [colocar, repeticion]);

  const pantalla = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 200;
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
    const hz = (pulso ?? 70) / 60;
    const fase = (state.clock.elapsedTime * hz) % 1;
    led.current.emissiveIntensity = 0.6 + 2.2 * Math.exp(-fase * 7);
  });

  const fantasma = variante === 'fantasma';

  return (
    <group position={DEDO_INDICE_IZQ.centro} quaternion={ROTACION}>
      {/* La mitad superior gira sobre la bisagra (lado de la punta) al abrirse. */}
      <group position={[0, 0, 0.024]}>
        <group ref={superior}>
          <group position={[0, 0, -0.024]}>
            <Parte id="carcasa_superior" separar={[0, 0.03, 0]} ancla={[0.024, 0.017, -0.006]}>
              <RoundedBox
                args={[0.033, 0.016, 0.058]}
                radius={0.006}
                smoothness={4}
                position={[0, 0.0175, -0.006]}
                material={m.plastico}
              />
              {!fantasma && (
                <mesh position={[0, 0.0095, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.004, 20]} />
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
            {!fantasma && (
              <Parte id="pantalla" separar={[0, 0.055, 0]} ancla={[0, 0.03, -0.006]}>
                <mesh position={[0, 0.0258, -0.01]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.026, 0.0203]} />
                  <meshBasicMaterial map={pantalla.textura} toneMapped={false} />
                </mesh>
              </Parte>
            )}
            <Parte id="almohadilla" separar={[0, 0.014, 0]}>
              <RoundedBox
                args={[0.024, 0.004, 0.044]}
                radius={0.0018}
                smoothness={3}
                position={[0, 0.0108, -0.004]}
                material={m.silicona}
              />
            </Parte>
          </group>
        </group>
      </group>
      <Parte id="carcasa_inferior" separar={[0, -0.03, 0]} ancla={[0.022, -0.017, -0.004]}>
        <RoundedBox
          args={[0.031, 0.014, 0.052]}
          radius={0.005}
          smoothness={4}
          position={[0, -0.0165, -0.004]}
          material={m.plasticoClaro}
        />
        <RoundedBox
          args={[0.024, 0.004, 0.044]}
          radius={0.0018}
          smoothness={3}
          position={[0, -0.0108, -0.004]}
          material={m.silicona}
        />
      </Parte>
      <Parte id="bisagra" separar={[0, 0, 0.03]} ancla={[0, 0, 0.03]}>
        <mesh position={[0, 0, 0.024]} rotation={[0, 0, Math.PI / 2]} material={m.metal}>
          <cylinderGeometry args={[0.003, 0.003, 0.03, 14]} />
        </mesh>
        <mesh position={[0, 0.004, 0.025]} rotation={[0, Math.PI / 2, 0]} material={m.acento}>
          <torusGeometry args={[0.004, 0.0008, 6, 18]} />
        </mesh>
      </Parte>
    </group>
  );
}
