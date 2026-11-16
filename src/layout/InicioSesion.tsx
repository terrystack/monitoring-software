import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';

interface Props {
  /** Se invoca al pulsar LOGIN; oculta el inicio de sesión y muestra la aplicación. */
  onEntrar: () => void;
}

interface Estrella {
  arriba: number;
  izquierda: number;
  tamano: number;
  opacidad: number;
  difuminado: number;
  brillo: number;
  /** Profundidad en el eje Z: las estrellas cercanas se desplazan más que las lejanas. */
  profundidad: number;
}

/** Generador pseudoaleatorio con semilla para que el cielo estrellado sea estable. */
function aleatorio(semilla: number): () => number {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function crearEstrellas(cantidad: number): Estrella[] {
  const azar = aleatorio(20261115);
  return Array.from({ length: cantidad }, () => {
    const grande = azar() > 0.86;
    const tamano = grande ? 3.5 + azar() * 2.5 : 1.2 + azar() * 1.6;
    return {
      arriba: azar() * 100,
      izquierda: azar() * 100,
      tamano,
      opacidad: 0.25 + azar() * (grande ? 0.75 : 0.5),
      difuminado: grande ? 1.5 + azar() * 1.5 : 0.3 + azar() * 0.7,
      brillo: grande ? 10 + azar() * 12 : 3 + azar() * 4,
      profundidad: -60 - azar() * 340,
    };
  });
}

/** Pantalla de acceso simple (sin autenticación real). Es lo primero que se ve al entrar. */
export function InicioSesion({ onEntrar }: Props) {
  const estrellas = useMemo(() => crearEstrellas(120), []);
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const cieloRef = useRef<HTMLDivElement>(null);

  // Paralaje 3D: el cielo estrellado rota levemente siguiendo al puntero.
  useEffect(() => {
    const cielo = cieloRef.current;
    if (!cielo) return;

    let frame = 0;
    const mover = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;

      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        cielo.style.setProperty('--giro-x', `${(-y * 7).toFixed(2)}deg`);
        cielo.style.setProperty('--giro-y', `${(x * 7).toFixed(2)}deg`);
      });
    };

    window.addEventListener('mousemove', mover);
    return () => {
      window.removeEventListener('mousemove', mover);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onEntrar();
  };

  return (
    <div
      className="relative flex h-full items-center justify-center overflow-hidden bg-fondo-profundo"
      style={{ perspective: '900px' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-fondo-profundo via-[#070b1c] to-fondo-medio"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 22% 18%, rgba(34,211,238,0.10), transparent 70%),' +
            'radial-gradient(50% 40% at 82% 82%, rgba(99,102,241,0.12), transparent 72%)',
        }}
      />
      <div
        ref={cieloRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-transform duration-200 ease-out"
        style={{
          transform: 'rotateX(var(--giro-x, 0deg)) rotateY(var(--giro-y, 0deg))',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {estrellas.map((e, i) => (
          <span
            key={i}
            className="absolute block rounded-full bg-white"
            style={{
              top: `${e.arriba}%`,
              left: `${e.izquierda}%`,
              width: `${e.tamano}px`,
              height: `${e.tamano}px`,
              opacity: e.opacidad,
              filter: `blur(${e.difuminado}px)`,
              boxShadow: `0 0 ${e.brillo}px ${e.brillo / 2}px rgba(226,240,255,0.85)`,
              transform: `translateZ(${e.profundidad}px)`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 px-4">
        <img
          src="/marca/hanan-pacha.png"
          alt="Hanan Pacha"
          className="h-20 w-auto object-contain sm:h-24"
          width={400}
          height={96}
          decoding="async"
        />

        <form
          onSubmit={enviar}
          aria-label="Inicio de sesión"
          className="panel flex w-full flex-col gap-4 px-6 py-7 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold text-tinta">Iniciar sesión</h1>
            <p className="text-[0.8rem] text-tinta-suave">Accede al monitoreo de salud del astronauta.</p>
          </div>

          <label className="flex flex-col gap-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-tinta-tenue">
            Usuario o correo
            <input
              type="text"
              name="usuario"
              autoComplete="username"
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="astronauta@hanan.pacha"
              className="rounded-md border border-linea bg-fondo-profundo/70 px-3 py-2 text-[0.9rem] font-normal normal-case tracking-normal text-tinta placeholder:text-tinta-tenue focus:border-acento"
            />
          </label>

          <label className="flex flex-col gap-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-tinta-tenue">
            Contraseña
            <input
              type="password"
              name="contrasena"
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              className="rounded-md border border-linea bg-fondo-profundo/70 px-3 py-2 text-[0.9rem] font-normal normal-case tracking-normal text-tinta placeholder:text-tinta-tenue focus:border-acento"
            />
          </label>

          <button
            type="submit"
            className="mt-1 flex items-center justify-center gap-2 rounded-md border border-acento bg-acento px-4 py-2.5 text-[0.9rem] font-semibold text-fondo-profundo transition-colors hover:bg-acento/85"
          >
            <LogIn size={18} aria-hidden="true" />
            LOGIN
          </button>
        </form>
      </div>
    </div>
  );
}
