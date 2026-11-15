import { useEffect, useState } from 'react';
import type { ConfigAyni } from '../config/esquemas';

export const RUTA_CREDITOS = '/creditos';
const URL_CREDITOS = '/modelos/creditos.json';

interface Credito {
  texto: string;
  licencia: string;
  enlace: string;
  urlLicencia: string;
}

type Carga = { tipo: 'cargando' } | { tipo: 'listo'; creditos: Credito[] } | { tipo: 'error' };

const claseEnlace =
  'text-acento underline decoration-acento/40 underline-offset-4 transition-colors hover:decoration-acento focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acento';

interface Props {
  config: ConfigAyni;
}

/** Atribución de los modelos 3D que exige CC BY-SA (fase 7 añade fuentes NASA y librerías). */
export function PaginaCreditos({ config }: Props) {
  const { textos } = config.escena;
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' });

  useEffect(() => {
    let vigente = true;
    fetch(URL_CREDITOS)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(
        (d: { creditos: Credito[] }) =>
          vigente && setCarga({ tipo: 'listo', creditos: d.creditos }),
      )
      .catch(() => vigente && setCarga({ tipo: 'error' }));
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <main className="h-full overflow-y-auto bg-gradient-to-b from-fondo-medio to-fondo-profundo selection:bg-acento/30">
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12 sm:py-20">
        <a href="/" className={`self-start text-sm ${claseEnlace}`}>
          {textos.volverAlCuerpo}
        </a>

        <header className="flex flex-col gap-4">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-tinta">
            {textos.tituloCreditos}
          </h1>
          <p className="max-w-prose text-pretty leading-relaxed text-tinta-suave">
            {textos.introCreditos}
          </p>
        </header>

        {carga.tipo === 'error' && (
          <p role="alert" className="text-sm text-estado-atencion">
            {textos.creditosNoDisponibles}
          </p>
        )}
        {carga.tipo === 'listo' && (
          <ul className="flex flex-col divide-y divide-linea/60 border-y border-linea/60">
            {carga.creditos.map((c) => (
              <li key={c.enlace} className="flex flex-col gap-3 py-6">
                <p className="leading-relaxed text-tinta">
                  {c.texto.replace(/\s*\(https?:\/\/[^)]+\)/g, '')}
                </p>
                <p className="flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm">
                  <span className="font-semibold tabular-nums text-tinta-suave">{c.licencia}</span>
                  <a href={c.urlLicencia} target="_blank" rel="noreferrer" className={claseEnlace}>
                    {textos.verLicencia}
                  </a>
                  <a href={c.enlace} target="_blank" rel="noreferrer" className={claseEnlace}>
                    {textos.verFuente}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="max-w-prose text-sm leading-relaxed text-tinta-tenue">
          {textos.licenciaDerivada}
        </p>
      </div>
    </main>
  );
}
