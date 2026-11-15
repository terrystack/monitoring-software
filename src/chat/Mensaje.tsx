import { Play, WifiOff } from 'lucide-react';
import type { ConfigAyni } from '../config/esquemas';
import { useAyni } from '../estado/store';
import { efectoDeLlamada } from './acciones';
import { urlDeImagen } from './imagen';
import type { MensajeChat } from './tipos';
import { tituloLienzo } from './tituloLienzo';
import { idsValidos } from './useAgente';
import { hablar, puedeHablar } from './voz';

interface Props {
  mensaje: MensajeChat;
  config: ConfigAyni;
  alResponder: (texto: string) => void;
  deshabilitado: boolean;
}

export function Mensaje({ mensaje, config, alResponder, deshabilitado }: Props) {
  const idioma = useAyni((s) => s.idioma);
  const { textos } = config.escena;
  const delUsuario = mensaje.rol === 'usuario';
  const ids = idsValidos(config);
  const vistas = (mensaje.llamadas ?? [])
    .map((l) => efectoDeLlamada(l, ids)?.lienzo)
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <li className={`flex flex-col gap-1.5 ${delUsuario ? 'items-end' : 'items-start'}`}>
      <span className="sr-only">{delUsuario ? textos.tu : textos.pestanaAgente}:</span>
      {mensaje.imagen && (
        <img
          src={urlDeImagen(mensaje.imagen)}
          alt=""
          className="max-h-40 rounded-md border border-linea/70 object-contain"
        />
      )}
      {mensaje.texto && (
        <div
          className={`max-w-[92%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-[0.9rem] leading-relaxed ${
            delUsuario
              ? 'bg-acento/15 text-tinta'
              : 'border border-linea/70 bg-fondo-profundo/60 text-tinta'
          }`}
        >
          {mensaje.texto}
        </div>
      )}
      {!delUsuario && (
        <div className="flex max-w-[92%] flex-wrap items-center gap-1.5">
          {puedeHablar() && (
            <button
              type="button"
              onClick={() => hablar(mensaje.texto, idioma)}
              aria-label={textos.leerEnVoz}
              title={textos.leerEnVoz}
              className="grid h-7 w-7 place-items-center rounded-md text-tinta-suave hover:bg-white/5 hover:text-tinta"
            >
              <Play size={14} aria-hidden="true" />
            </button>
          )}
          {vistas.map((v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => useAyni.getState().setLienzo(v)}
              className="rounded-full border border-acento/40 px-2.5 py-0.5 text-[0.72rem] text-acento hover:bg-acento/10"
            >
              {textos.mostradoEnLienzo}: {tituloLienzo(v, config)}
            </button>
          ))}
          {mensaje.sinConexion && (
            <span className="flex items-center gap-1 text-[0.72rem] text-tinta-tenue">
              <WifiOff size={12} aria-hidden="true" />
              {textos.modoSinConexion}
            </span>
          )}
        </div>
      )}
      {!delUsuario && (mensaje.respuestasRapidas?.length ?? 0) > 0 && (
        <div className="flex max-w-[92%] flex-wrap gap-1.5">
          {mensaje.respuestasRapidas!.map((r) => (
            <button
              key={r}
              type="button"
              disabled={deshabilitado}
              onClick={() => alResponder(r)}
              className="rounded-md border border-linea px-2.5 py-1 text-[0.8rem] text-tinta-suave transition-colors hover:border-acento/60 hover:text-tinta disabled:opacity-50"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
