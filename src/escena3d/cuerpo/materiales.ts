import * as THREE from 'three';

export const CIAN_HOLOGRAMA = '#22D3EE';

/** Las capas internas se dibujan antes que la piel; el halo, al final. */
export const ORDEN_RENDER = {
  interno: 0,
  pielProfundidad: 9,
  piel: 10,
  halo: 20,
} as const;

/** Para mallas decorativas o auxiliares que no deben recibir clics. */
export function sinRaycast() {}

export function crearMaterialSoloProfundidad(): THREE.MeshBasicMaterial {
  // transparent: entra en la lista transparente, así respeta renderOrder frente a las capas internas.
  return new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: true,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

/** Material translúcido con emisivo de estado (huesos, músculos, vasos). */
export function crearMaterialTranslucido(
  color: string,
  opciones: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    ...opciones,
  });
}

/** Órganos (5.2): MeshPhysicalMaterial con transmisión baja y emisivo de estado. */
export function crearMaterialOrgano(
  color: string,
  transmision: number,
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.35,
    transmission: transmision,
    thickness: 0.04,
    transparent: true,
    depthWrite: false,
  });
}

/**
 * Vías nerviosas (5.2): línea luminosa con pulsos de señal que viajan a lo largo del tubo
 * (uv.x). `uVelocidad` baja cuando el tiempo de reacción empeora.
 */
export function crearMaterialNervio(
  opciones: { radial?: boolean; origen?: THREE.Vector3 } = {},
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#7DD3FC') },
      uColorEstado: { value: new THREE.Color('#7DD3FC') },
      uMezclaEstado: { value: 0 },
      uTiempo: { value: 0 },
      uVelocidad: { value: 1 },
      uPulsos: { value: 1 },
      uOpacidad: { value: 1 },
      // Modo radial (mallas sin UV a lo largo del nervio): el recorrido se aproxima por la
      // distancia al origen (el cerebro), así los pulsos salen del cerebro hacia el cuerpo.
      uRadial: { value: opciones.radial ? 1 : 0 },
      uOrigen: { value: opciones.origen ?? new THREE.Vector3(0, 1.66, 0) },
    },
    vertexShader: /* glsl */ `
      uniform float uRadial;
      uniform vec3 uOrigen;
      varying float vRecorrido;
      void main() {
        vec4 mundo = modelMatrix * vec4(position, 1.0);
        vRecorrido = mix(uv.x, distance(mundo.xyz, uOrigen) * 1.3, uRadial);
        gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uColorEstado;
      uniform float uMezclaEstado;
      uniform float uTiempo;
      uniform float uVelocidad;
      uniform float uPulsos;
      uniform float uOpacidad;
      varying float vRecorrido;
      void main() {
        float t = fract(vRecorrido * 3.0 - uTiempo * 0.55 * uVelocidad);
        float pulso = uPulsos * smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.06, 0.24, t));
        vec3 base = mix(uColor, uColorEstado, uMezclaEstado);
        gl_FragColor = vec4(base * (0.55 + 1.0 * pulso), (0.5 + 0.5 * pulso) * uOpacidad);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

/** Halo de radiación (5.2): ruido 3D animado en el borde; intensidad = dosis / límite. */
export function crearMaterialHalo(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(CIAN_HOLOGRAMA) },
      uTiempo: { value: 0 },
      uIntensidad: { value: 0.2 },
      uOpacidad: { value: 1 },
    },
    vertexShader: VERTICE_MUNDO,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTiempo;
      uniform float uIntensidad;
      uniform float uOpacidad;
      varying vec3 vNormalW;
      varying vec3 vPosW;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float ruido(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
              mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
          mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
              mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
          f.z);
      }

      void main() {
        vec3 alOjo = normalize(cameraPosition - vPosW);
        // Exponente alto: en fondo oscuro, sumas lineales pequeñas ya se ven tras pasar a sRGB.
        float borde = pow(1.0 - abs(dot(alOjo, normalize(vNormalW))), 5.0);
        float n = ruido(vPosW * 6.0 + vec3(0.0, uTiempo * 0.35, uTiempo * 0.2)) * 0.6
                + ruido(vPosW * 15.0 - vec3(uTiempo * 0.5)) * 0.4;
        float alfa = borde * (0.6 + n * 0.9) * uIntensidad * uOpacidad;
        gl_FragColor = vec4(uColor * (0.6 + n * 0.8), min(alfa, 1.0));
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    // Mezcla normal: con el EffectComposer la aditiva rellenaba todo el interior del halo.
    blending: THREE.NormalBlending,
    toneMapped: false,
  });
}

const VERTICE_MUNDO = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mundo = modelMatrix * vec4(position, 1.0);
    vPosW = mundo.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    // Mismo cálculo que los materiales de three, para coincidir con la pasada de profundidad.
    gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0));
  }
`;

/**
 * Piel holográfica (5.2): borde Fresnel cian, líneas horizontales finas y una línea de
 * escaneo vertical animada. `uColorEstado` tiñe el borde cuando piel_inmune no es normal.
 */
export function crearMaterialHolografico(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(CIAN_HOLOGRAMA) },
      uColorEstado: { value: new THREE.Color(CIAN_HOLOGRAMA) },
      uMezclaEstado: { value: 0 },
      uOpacidad: { value: 1 },
      uTiempo: { value: 0 },
      uEscaneo: { value: 1 },
      uAltura: { value: 1.78 },
    },
    vertexShader: VERTICE_MUNDO,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uColorEstado;
      uniform float uMezclaEstado;
      uniform float uOpacidad;
      uniform float uTiempo;
      uniform float uEscaneo;
      uniform float uAltura;
      varying vec3 vNormalW;
      varying vec3 vPosW;

      void main() {
        vec3 alOjo = normalize(cameraPosition - vPosW);
        float fresnel = pow(1.0 - abs(dot(alOjo, normalize(vNormalW))), 1.6);
        float lineas = 0.85 + 0.15 * sin(vPosW.y * 260.0);
        float yEscaneo = (fract(uTiempo * 0.12) * 1.3 - 0.15) * uAltura;
        float escaneo = uEscaneo * (1.0 - smoothstep(0.0, 0.035, abs(vPosW.y - yEscaneo)));
        vec3 color = mix(uColor, uColorEstado, uMezclaEstado * fresnel);
        float alfa = mix(0.06, 0.32, fresnel * fresnel) * lineas + escaneo * 0.18;
        gl_FragColor = vec4(color * (0.7 + 0.45 * fresnel + escaneo * 0.35), alfa * uOpacidad);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false,
  });
}
