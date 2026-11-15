import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type * as THREE from 'three';
import type { EstadoZona } from '../../datos/tipos';
import { useAyni } from '../../estado/store';
import { IconoEstado } from '../../ui/IconoEstado';
import { registroZonas } from './useSeleccionZona';

/** Desplazamiento en píxeles de pantalla: no crece cuando la cámara se acerca. */
const SEPARACION_PX = 96;
/** Con la cámara más cerca que esto de la zona elegida, su tarjeta ya la nombra. */
const DISTANCIA_CERCANA_M = 1.8;
const EN_ALERTA: EstadoZona[] = ['atencion', 'critico'];

interface PropsEtiqueta {
  centro: THREE.Vector3;
  lado: 1 | -1;
  color: string;
  ocultarDeCerca: boolean;
  alElegir: () => void;
  children: ReactNode;
}

function EtiquetaAlerta({
  centro,
  lado,
  color,
  ocultarDeCerca,
  alElegir,
  children,
}: PropsEtiqueta) {
  const boton = useRef<HTMLButtonElement>(null);
  useFrame(({ camera }) => {
    if (!boton.current) return;
    const oculta = ocultarDeCerca && camera.position.distanceTo(centro) < DISTANCIA_CERCANA_M;
    boton.current.style.visibility = oculta ? 'hidden' : 'visible';
  });
  return (
    <Html position={[centro.x, centro.y, centro.z]} center zIndexRange={[30, 10]}>
      <button
        ref={boton}
        type="button"
        onClick={alElegir}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-fondo-profundo/80 px-2.5 py-1 text-xs text-tinta backdrop-blur hover:bg-fondo-medio focus-visible:outline focus-visible:outline-2 focus-visible:outline-acento"
        style={{ borderColor: color, transform: `translateX(${lado * SEPARACION_PX}px)` }}
      >
        {children}
      </button>
    </Html>
  );
}

function useEtiquetaEstado() {
  const estados = useAyni((s) => s.config?.escena.estados);
  return (estado: EstadoZona) => estados?.find((e) => e.id === estado);
}

/**
 * Etiquetas flotantes sobre las zonas en ámbar o rojo (5.3, punto 5) y tooltip de hover
 * con el nombre de la zona y su estado (punto 3). Color siempre con ícono y texto.
 */
export function EtiquetasZona() {
  const config = useAyni((s) => s.config);
  const estadoCuerpo = useAyni((s) => s.estadoCuerpo);
  const zonaHover = useAyni((s) => s.zonaHover);
  const zonaSeleccionada = useAyni((s) => s.zonaSeleccionada);
  const seleccionarZona = useAyni((s) => s.seleccionarZona);
  useAyni((s) => s.versionZonas);
  const estadoDe = useEtiquetaEstado();
  if (!config || !estadoCuerpo) return null;

  const enAlerta = config.zonas.filter((z) => EN_ALERTA.includes(estadoCuerpo.zonas[z.id]));
  const hover = zonaHover ? config.zonas.find((z) => z.id === zonaHover) : undefined;
  const registroHover = hover ? registroZonas.get(hover.id) : undefined;

  return (
    <>
      {enAlerta.map((zona, i) => {
        const registro = registroZonas.get(zona.id);
        const estado = estadoCuerpo.zonas[zona.id];
        const info = estadoDe(estado);
        if (!registro || !info) return null;
        return (
          <EtiquetaAlerta
            key={zona.id}
            centro={registro.centro}
            lado={i % 2 === 0 ? 1 : -1}
            color={info.color}
            ocultarDeCerca={zona.id === zonaSeleccionada}
            alElegir={() => seleccionarZona(zona.id)}
          >
            <IconoEstado estado={estado} color={info.color} />
            <span>{zona.nombre}</span>
            <span className="text-tinta-tenue">·</span>
            <span style={{ color: info.color }}>{info.etiqueta}</span>
          </EtiquetaAlerta>
        );
      })}

      {hover && registroHover && !enAlerta.includes(hover) && (
        <Html
          position={[
            registroHover.centro.x,
            registroHover.centro.y + Math.min(0.12, registroHover.radio),
            registroHover.centro.z,
          ]}
          center
          zIndexRange={[40, 30]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-fondo-profundo/90 px-2 py-1 text-xs text-tinta shadow-[0_12px_32px_rgb(0_0_0/0.45)]">
            {(() => {
              const estado = estadoCuerpo.zonas[hover.id] ?? 'sin_dato';
              const info = estadoDe(estado);
              return info ? (
                <>
                  <IconoEstado estado={estado} color={info.color} />
                  <span>{hover.nombre}</span>
                  <span className="text-tinta-tenue">·</span>
                  <span
                    className={estado === 'sin_dato' ? 'text-tinta-tenue' : undefined}
                    style={estado === 'sin_dato' ? undefined : { color: info.color }}
                  >
                    {info.etiqueta}
                  </span>
                </>
              ) : (
                <span>{hover.nombre}</span>
              );
            })()}
          </div>
        </Html>
      )}
    </>
  );
}
