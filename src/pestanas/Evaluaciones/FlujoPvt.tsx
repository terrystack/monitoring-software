import { useState } from 'react';
import type { ConfigAyni } from '../../config/esquemas';
import { guardarLecturasManuales, guardarSesionPvt } from '../../datos/almacen';
import type { Seleccion } from '../../estado/seleccion';
import { useAyni } from '../../estado/store';
import {
  contextoDeMomento,
  lecturasDeSesionPvt,
  momentoSugerido,
  resumirPvt,
  type EntradaPvt,
  type IntentoPvt,
  type SesionPvtGuardada,
} from '../../evaluaciones/pvt';
import { numero } from '../../motor/frases';
import { PruebaPvt } from './PruebaPvt';
import { ResultadosPvt } from './ResultadosPvt';
import { fechaHoraRegistro, horaActual } from './tiempo';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

type Paso = 'inicio' | 'previo' | 'listo' | 'prueba' | 'resultados';

const botonPrincipal =
  'rounded-md border border-acento/60 bg-acento/15 px-4 py-2 text-[0.88rem] font-semibold text-tinta hover:bg-acento/25 disabled:opacity-40';
const botonSecundario =
  'rounded-md border border-linea px-4 py-2 text-[0.88rem] text-tinta hover:border-tinta-tenue';

/**
 * PVT-B (guía para el equipo, §3–4): primero el estrés de 0 a 100 (nunca después), las horas
 * de sueño si es la toma al despertar, luego 3 minutos de prueba y el resultado en un solo
 * registro.
 */
export function FlujoPvt({ config, seleccion }: Props) {
  const t = config.evaluaciones.textos;
  const [paso, setPaso] = useState<Paso>('inicio');
  const [momento, setMomento] = useState(() => momentoSugerido(config, horaActual()));
  const [estres, setEstres] = useState<number | null>(null);
  const [sueno, setSueno] = useState('');
  const [resultado, setResultado] = useState<SesionPvtGuardada | null>(null);
  const [vista, setVista] = useState<SesionPvtGuardada | null>(null);
  const sesiones = useAyni((s) => s.sesionesPvt);
  const propias = (sesiones ?? [])
    .filter((s) => s.tripulanteId === seleccion.tripulanteId)
    .slice()
    .reverse();

  const nombreMomento = (id: string) =>
    id === 'despertar' ? t.momentoDespertar : id === 'noche' ? t.momentoNoche : t.momentoLibre;
  const momentos = [...config.evaluaciones.pvt.momentos.map((m) => m.id), 'libre'];
  const horasSueno = (() => {
    const v = Number(sueno.replace(',', '.'));
    return sueno.trim() && Number.isFinite(v) && v >= 0 && v <= 24 ? v : null;
  })();

  const reiniciar = () => {
    setEstres(null);
    setSueno('');
    setResultado(null);
    setVista(null);
    setPaso('inicio');
  };

  const iniciar = () => {
    // Pantalla completa dentro del gesto del usuario; si el navegador no deja, sigue igual.
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    setPaso('prueba');
  };

  const salirPantallaCompleta = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };

  const terminar = async (intentos: IntentoPvt[], entrada: EntradaPvt) => {
    salirPantallaCompleta();
    const p = config.evaluaciones.pvt;
    const umbrales = { umbralLapsoMs: p.umbralLapsoMs, umbralFalsaMs: p.umbralFalsaMs };
    const sesion: SesionPvtGuardada = {
      id: `${Date.now()}`,
      tripulanteId: seleccion.tripulanteId,
      fechaHora: fechaHoraRegistro(config, seleccion.dia),
      momento,
      contexto: contextoDeMomento(config, momento),
      entrada,
      estres: estres ?? 0,
      horasSueno: momento === 'despertar' ? horasSueno : null,
      duracionS: p.duracionS,
      umbrales,
      cuadricula: { filas: p.filas, columnas: p.columnas },
      resumen: resumirPvt(intentos, umbrales),
      intentos,
    };
    setResultado(sesion);
    setPaso('resultados');
    const s = useAyni.getState();
    s.setSesionesPvt(await guardarSesionPvt(sesion));
    s.setLecturasManuales(await guardarLecturasManuales(lecturasDeSesionPvt(config, sesion)));
  };

  if (paso === 'prueba') {
    return (
      <PruebaPvt
        config={config}
        onFin={(intentos, entrada) => void terminar(intentos, entrada)}
        onSalir={() => {
          salirPantallaCompleta();
          setPaso('listo');
        }}
      />
    );
  }

  if (paso === 'resultados' && resultado) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-[1.1rem] font-semibold text-tinta">
          {t.resultados} · {nombreMomento(resultado.momento)}
        </h2>
        <ResultadosPvt config={config} sesion={resultado} aviso={t.guardado} />
        <div className="flex gap-2">
          <button type="button" className={botonPrincipal} onClick={reiniciar}>
            {t.volver}
          </button>
        </div>
      </div>
    );
  }

  if (vista) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-[1.1rem] font-semibold text-tinta">
          {t.resultados} · {nombreMomento(vista.momento)} ·{' '}
          <span className="tabular-nums">{vista.fechaHora.slice(0, 10)}</span>
        </h2>
        <ResultadosPvt config={config} sesion={vista} />
        <div>
          <button type="button" className={botonSecundario} onClick={() => setVista(null)}>
            {t.volver}
          </button>
        </div>
      </div>
    );
  }

  if (paso === 'previo') {
    return (
      <form
        className="flex max-w-xl flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (estres !== null) setPaso('listo');
        }}
      >
        <h2 className="text-[1.1rem] font-semibold text-tinta">{t.antesDeLaPrueba}</h2>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[0.95rem] font-semibold text-tinta">{t.preguntaEstres}</legend>
          <p id="ayuda-estres" className="text-[0.82rem] text-tinta-suave">
            {t.ayudaEstres}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-[0.76rem] text-tinta-tenue">{t.estresNada}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={estres ?? 50}
              aria-describedby="ayuda-estres"
              aria-valuetext={estres === null ? t.sinResponder : `${estres}`}
              onChange={(e) => setEstres(Number(e.target.value))}
              onPointerDown={(e) => setEstres(Number(e.currentTarget.value))}
              className={`flex-1 accent-[rgb(var(--acento))] ${estres === null ? 'opacity-50' : ''}`}
            />
            <span className="text-[0.76rem] text-tinta-tenue">{t.estresMucho}</span>
            <output className="w-10 text-right text-[1.25rem] font-semibold tabular-nums text-tinta">
              {estres ?? t.sinResponder}
            </output>
          </div>
        </fieldset>
        {momento === 'despertar' && (
          <label className="flex flex-col gap-1 text-[0.82rem] text-tinta-suave">
            {t.horasSueno}
            <span className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={sueno}
                onChange={(e) => setSueno(e.target.value)}
                className="w-24 rounded-md border border-linea bg-fondo-profundo px-3 py-1.5 text-[0.88rem] tabular-nums text-tinta"
              />
              <span className="text-tinta-tenue">h</span>
            </span>
          </label>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={estres === null} className={botonPrincipal}>
            {t.continuar}
          </button>
          <button type="button" className={botonSecundario} onClick={reiniciar}>
            {t.cancelar}
          </button>
        </div>
      </form>
    );
  }

  if (paso === 'listo') {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <h2 className="text-[1.1rem] font-semibold text-tinta">{t.listoTitulo}</h2>
        <p className="text-[0.9rem] leading-relaxed text-tinta-suave">{t.listoTexto}</p>
        <p className="text-[0.82rem] text-tinta-tenue">
          {t.estresReportado}: <span className="tabular-nums text-tinta">{estres}/100</span>
          {momento === 'despertar' && horasSueno !== null && (
            <>
              {' '}
              · {t.sueno}:{' '}
              <span className="tabular-nums text-tinta">{numero(horasSueno, config.frases)} h</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button type="button" className={botonPrincipal} onClick={iniciar}>
            {t.iniciarPrueba}
          </button>
          <button type="button" className={botonSecundario} onClick={reiniciar}>
            {t.cancelar}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="pvt-como" className="flex flex-col gap-3">
        <h2 id="pvt-como" className="rotulo">
          {t.comoFunciona}
        </h2>
        <ol className="flex max-w-prose flex-col gap-2">
          {t.pvtPasos.map((texto, i) => (
            <li key={texto} className="flex gap-3 text-[0.9rem] leading-relaxed text-tinta">
              <span className="font-semibold tabular-nums text-acento">{i + 1}</span>
              {texto}
            </li>
          ))}
        </ol>
        <p className="text-[0.82rem] text-tinta-suave">{t.pvtSinAviso}</p>
      </section>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[0.76rem] text-tinta-tenue">
          {t.momento}
          <select
            value={momento}
            onChange={(e) => setMomento(e.target.value)}
            className="rounded-md border border-linea bg-fondo-profundo px-3 py-1.5 text-[0.86rem] text-tinta"
          >
            {momentos.map((m) => (
              <option key={m} value={m}>
                {nombreMomento(m)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={botonPrincipal} onClick={() => setPaso('previo')}>
          {t.empezar}
        </button>
      </div>

      <section aria-labelledby="pvt-historial" className="flex flex-col gap-2">
        <h2 id="pvt-historial" className="rotulo">
          {t.historial}
        </h2>
        {propias.length === 0 ? (
          <p className="text-[0.82rem] text-tinta-suave">{t.sinSesiones}</p>
        ) : (
          <table className="w-full text-left text-[0.8rem]">
            <thead className="text-tinta-tenue">
              <tr>
                <th className="py-1 font-normal">{t.fecha}</th>
                <th className="py-1 font-normal">{t.momento}</th>
                <th className="py-1 text-right font-normal">{t.velocidad}</th>
                <th className="py-1 text-right font-normal">{t.lapsos}</th>
                <th className="py-1 text-right font-normal">{t.estresReportado}</th>
              </tr>
            </thead>
            <tbody>
              {propias.slice(0, 10).map((s) => (
                <tr key={s.id} className="border-t border-linea/45 hover:bg-white/[0.04]">
                  <td className="py-1.5 tabular-nums text-tinta">
                    <button
                      type="button"
                      className="text-left underline decoration-linea underline-offset-2 hover:decoration-acento"
                      onClick={() => setVista(s)}
                    >
                      {s.fechaHora.slice(0, 10)}
                    </button>
                  </td>
                  <td className="py-1.5 text-tinta-suave">{nombreMomento(s.momento)}</td>
                  <td className="py-1.5 text-right tabular-nums text-tinta">
                    {s.resumen.velocidad === null
                      ? config.escena.textos.sinValor
                      : numero(s.resumen.velocidad, config.frases, 2)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-tinta">{s.resumen.lapsos}</td>
                  <td className="py-1.5 text-right tabular-nums text-tinta">{s.estres}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <p className="text-[0.72rem] text-tinta-tenue">{t.fuentePvt}</p>
    </div>
  );
}
