import { useMemo, useState, type FormEvent } from 'react';
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
    };
  });
}

/** Pantalla de acceso simple (sin autenticación real). Es lo primero que se ve al entrar. */
export function InicioSesion({ onEntrar }: Props) {
  const estrellas = useMemo(() => crearEstrellas(120), []);
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onEntrar();
  };

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-fondo-profundo">
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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
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
            }}
          />
        ))}
      </div>

      <form
        onSubmit={enviar}
        aria-label="Inicio de sesión"
        className="panel relative z-10 flex w-full max-w-sm flex-col gap-4 px-6 py-7 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
      >
        <div className="flex flex-col gap-1">
          <span className="rotulo">HANAN PACHA</span>
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
  );
}
