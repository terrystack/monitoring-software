import { ExternalLink } from 'lucide-react';
import type { ConfigAyni, Dispositivo } from '../../config/esquemas';

interface Props {
  config: ConfigAyni;
  dispositivo: Dispositivo;
}

/** Ficha del dispositivo: en qué se inspira, qué mide, peso y autonomía (§8). */
export function FichaDispositivo({ config, dispositivo }: Props) {
  const { textos } = config.escena;
  const f = dispositivo.ficha;
  return (
    <section aria-labelledby="ficha-titulo" className="panel px-4 py-3.5">
      <h2 id="ficha-titulo" className="text-[0.95rem] font-semibold text-tinta">
        {dispositivo.nombre}
      </h2>
      {f && (
        <>
          <p className="mt-1 text-[0.78rem] leading-snug text-tinta-suave">
            <span className="text-tinta-tenue">{textos.inspiradoEn}: </span>
            {f.inspiradoEn}{' '}
            <a
              href={f.fuente}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-acento underline-offset-2 hover:underline"
            >
              {textos.verFuente}
              <ExternalLink size={11} aria-hidden="true" />
            </a>
          </p>
          <h3 className="mt-2.5 text-[0.74rem] font-semibold uppercase tracking-wide text-tinta-tenue">
            {textos.queMide}
          </h3>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {f.mide.map((m) => (
              <li
                key={m}
                className="rounded-full border border-linea/70 px-2 py-0.5 text-[0.74rem] text-tinta-suave"
              >
                {m}
              </li>
            ))}
          </ul>
          {(f.peso || f.autonomia) && (
            <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[0.76rem]">
              {f.peso && (
                <>
                  <dt className="text-tinta-tenue">{textos.peso}</dt>
                  <dd className="text-tinta-suave">{f.peso}</dd>
                </>
              )}
              {f.autonomia && (
                <>
                  <dt className="text-tinta-tenue">{textos.autonomia}</dt>
                  <dd className="text-tinta-suave">{f.autonomia}</dd>
                </>
              )}
            </dl>
          )}
          <p className="mt-2 text-[0.7rem] text-tinta-tenue">{textos.noEsReplica}</p>
        </>
      )}
    </section>
  );
}
