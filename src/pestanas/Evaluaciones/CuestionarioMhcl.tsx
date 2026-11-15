import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ConfigAyni } from '../../config/esquemas';
import { guardarLecturasManuales, guardarSesionMhcl } from '../../datos/almacen';
import type { Seleccion } from '../../estado/seleccion';
import { useAyni } from '../../estado/store';
import {
  barajar,
  lecturasDeSesionMhcl,
  mhclCompleta,
  puntuarMhcl,
  referenciaSubescala,
  type SesionMhclGuardada,
} from '../../evaluaciones/mhcl';
import { numero } from '../../motor/frases';
import { plantilla } from '../../ui/textos';
import { fechaHoraRegistro } from './tiempo';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

type Paso = 'inicio' | 'preguntas' | 'resultados';

const botonPrincipal =
  'rounded-md border border-acento/60 bg-acento/15 px-4 py-2 text-[0.88rem] font-semibold text-tinta hover:bg-acento/25 disabled:opacity-40';
const botonSecundario =
  'flex items-center gap-1 rounded-md border border-linea px-3 py-2 text-[0.86rem] text-tinta hover:border-tinta-tenue disabled:opacity-40';

/** Lista de salud mental (MHCL) semanal: 23 ítems de 0 a 10 en orden aleatorio. */
export function CuestionarioMhcl({ config, seleccion }: Props) {
  const { mhcl, textos: t } = config.evaluaciones;
  const [paso, setPaso] = useState<Paso>('inicio');
  const [orden, setOrden] = useState<string[]>([]);
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [vista, setVista] = useState<SesionMhclGuardada | null>(null);
  const sesiones = useAyni((s) => s.sesionesMhcl);
  const propias = (sesiones ?? [])
    .filter((s) => s.tripulanteId === seleccion.tripulanteId)
    .slice()
    .reverse();

  const empezar = () => {
    setOrden(barajar(mhcl.items.map((i) => i.id)));
    setRespuestas({});
    setIndice(0);
    setVista(null);
    setPaso('preguntas');
  };

  const terminar = async () => {
    const sesion: SesionMhclGuardada = {
      id: `${Date.now()}`,
      tripulanteId: seleccion.tripulanteId,
      fechaHora: fechaHoraRegistro(config, seleccion.dia),
      orden,
      respuestas,
      puntajes: puntuarMhcl(mhcl, respuestas),
    };
    setVista(sesion);
    setPaso('resultados');
    const s = useAyni.getState();
    s.setSesionesMhcl(await guardarSesionMhcl(sesion));
    s.setLecturasManuales(await guardarLecturasManuales(lecturasDeSesionMhcl(config, sesion)));
  };

  if (paso === 'preguntas') {
    const id = orden[indice];
    const item = mhcl.items.find((i) => i.id === id);
    const valor = respuestas[id];
    const ultimo = indice === orden.length - 1;
    const opciones = Array.from(
      { length: mhcl.escalaMax - mhcl.escalaMin + 1 },
      (_, k) => mhcl.escalaMin + k,
    );
    const anclaDe = (v: number) => t.mhclAnclas.find((a) => a.valor === v)?.texto;
    const responder = (v: number) => {
      setRespuestas((r) => ({ ...r, [id]: v }));
      if (!ultimo)
        window.setTimeout(() => setIndice((i) => Math.min(i + 1, orden.length - 1)), 180);
    };
    return (
      <div className="flex max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.82rem] tabular-nums text-tinta-tenue">
            {plantilla(t.preguntaDe, { n: indice + 1, total: orden.length })}
          </p>
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-linea/50"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={orden.length}
            aria-valuenow={Object.keys(respuestas).length}
          >
            <div
              className="h-full bg-acento/70 transition-[width] duration-200"
              style={{ width: `${(Object.keys(respuestas).length / orden.length) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-[0.9rem] text-tinta-suave">{t.mhclInstruccion}</p>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-[1.5rem] font-semibold leading-tight text-tinta">
            {item?.texto}
          </legend>
          <div role="radiogroup" aria-label={item?.texto} className="grid grid-cols-11 gap-1">
            {opciones.map((v) => {
              const activo = valor === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  aria-label={anclaDe(v) ? `${v}, ${anclaDe(v)}` : String(v)}
                  onClick={() => responder(v)}
                  className={`h-11 rounded-md border text-[0.95rem] tabular-nums transition-colors ${
                    activo
                      ? 'border-acento bg-acento/20 font-semibold text-tinta'
                      : 'border-linea text-tinta-suave hover:bg-white/[0.05] hover:text-tinta'
                  }`}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <div aria-hidden="true" className="grid grid-cols-11 gap-1">
            {t.mhclAnclas.map((ancla) => {
              const columna = ancla.valor - mhcl.escalaMin + 1;
              const alineacion =
                ancla.valor === mhcl.escalaMin
                  ? 'justify-self-start text-left'
                  : ancla.valor === mhcl.escalaMax
                    ? 'justify-self-end text-right'
                    : 'justify-self-center text-center';
              return (
                <span
                  key={ancla.valor}
                  style={{ gridColumn: `${columna} / span 1`, gridRow: 1 }}
                  className={`flex w-max max-w-[6.5rem] flex-col text-[0.76rem] leading-tight text-tinta-suave ${alineacion}`}
                >
                  <span aria-hidden="true" className="text-tinta-tenue">
                    ▲
                  </span>
                  {ancla.texto}
                </span>
              );
            })}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={botonSecundario}
            disabled={indice === 0}
            onClick={() => setIndice((i) => i - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            {t.anterior}
          </button>
          {ultimo ? (
            <button
              type="button"
              className={botonPrincipal}
              disabled={!mhclCompleta(mhcl, respuestas)}
              onClick={() => void terminar()}
            >
              {t.terminar}
            </button>
          ) : (
            <button
              type="button"
              className={botonSecundario}
              disabled={valor === undefined}
              onClick={() => setIndice((i) => i + 1)}
            >
              {t.siguiente}
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
          <button type="button" className={botonSecundario} onClick={() => setPaso('inicio')}>
            {t.cancelar}
          </button>
        </div>
      </div>
    );
  }

  if (vista) {
    const anteriores = propias.filter((s) => s.id !== vista.id).slice(0, 4);
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-[1.1rem] font-semibold text-tinta">
          {t.resultados} · <span className="tabular-nums">{vista.fechaHora.slice(0, 10)}</span>
        </h2>
        {paso === 'resultados' && (
          <p role="status" className="text-[0.82rem] text-estado-normal">
            {t.guardado}
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          {mhcl.subescalas.map((s) => {
            const p = vista.puntajes.find((x) => x.id === s.id);
            const ref = referenciaSubescala(mhcl, s.id);
            return (
              <article key={s.id} className="rounded-md border border-linea/70 px-3.5 py-3">
                <h3 className="text-[0.9rem] font-semibold text-tinta">{s.nombre}</h3>
                <p className="mt-1 text-[1.5rem] font-semibold leading-tight tabular-nums text-tinta">
                  {p?.promedio === null || p === undefined
                    ? config.escena.textos.sinValor
                    : numero(p.promedio, config.frases)}
                  <span className="text-[0.82rem] font-normal text-tinta-tenue">
                    {' '}
                    /{mhcl.escalaMax}
                  </span>
                </p>
                <p className="text-[0.72rem] text-tinta-tenue">{t.promedioSubescala}</p>
                <p className="mt-2 text-[0.82rem] leading-relaxed text-tinta-suave">
                  {s.descripcion}
                </p>
                {ref !== null && (
                  <p className="mt-2 text-[0.72rem] tabular-nums text-tinta-tenue">
                    {plantilla(t.referenciaEstudio, { v: numero(ref, config.frases) })}
                  </p>
                )}
                {anteriores.length > 0 && (
                  <p className="mt-1 text-[0.72rem] tabular-nums text-tinta-tenue">
                    {t.historial}:{' '}
                    {anteriores
                      .map((a) => a.puntajes.find((x) => x.id === s.id)?.promedio)
                      .map((v) => (v == null ? '–' : numero(v, config.frases)))
                      .join(' · ')}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        <p className="text-[0.82rem] leading-relaxed text-tinta-suave">{t.mhclAviso}</p>
        <div>
          <button
            type="button"
            className={botonSecundario}
            onClick={() => {
              setVista(null);
              setPaso('inicio');
            }}
          >
            {t.volver}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="mhcl-que" className="flex flex-col gap-3">
        <h2 id="mhcl-que" className="rotulo">
          {t.comoFunciona}
        </h2>
        <p className="max-w-prose text-[0.9rem] leading-relaxed text-tinta">{t.mhclResumen}</p>
        <ul className="flex flex-col divide-y divide-linea/50">
          {mhcl.subescalas.map((s) => (
            <li key={s.id} className="py-2">
              <p className="text-[0.88rem] font-semibold text-tinta">{s.nombre}</p>
              <p className="text-[0.82rem] text-tinta-suave">{s.descripcion}</p>
            </li>
          ))}
        </ul>
      </section>
      <div>
        <button type="button" className={botonPrincipal} onClick={empezar}>
          {t.empezar}
        </button>
      </div>
      <section aria-labelledby="mhcl-historial" className="flex flex-col gap-2">
        <h2 id="mhcl-historial" className="rotulo">
          {t.historial}
        </h2>
        {propias.length === 0 ? (
          <p className="text-[0.82rem] text-tinta-suave">{t.sinSesiones}</p>
        ) : (
          <table className="w-full text-left text-[0.8rem]">
            <thead className="text-tinta-tenue">
              <tr>
                <th className="py-1 font-normal">{t.fecha}</th>
                {mhcl.subescalas.map((s) => (
                  <th key={s.id} className="py-1 text-right font-normal">
                    {s.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propias.slice(0, 8).map((sesion) => (
                <tr key={sesion.id} className="border-t border-linea/45 hover:bg-white/[0.04]">
                  <td className="py-1.5 tabular-nums">
                    <button
                      type="button"
                      className="text-left text-tinta underline decoration-linea underline-offset-2 hover:decoration-acento"
                      onClick={() => setVista(sesion)}
                    >
                      {sesion.fechaHora.slice(0, 10)}
                    </button>
                  </td>
                  {mhcl.subescalas.map((s) => {
                    const v = sesion.puntajes.find((x) => x.id === s.id)?.promedio;
                    return (
                      <td key={s.id} className="py-1.5 text-right tabular-nums text-tinta">
                        {v == null ? config.escena.textos.sinValor : numero(v, config.frases)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <p className="text-[0.72rem] text-tinta-tenue">{t.fuenteMhcl}</p>
    </div>
  );
}
