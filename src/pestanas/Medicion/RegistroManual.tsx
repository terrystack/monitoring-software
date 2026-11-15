import { useState } from 'react';
import { Angry, Frown, Laugh, Meh, Smile } from 'lucide-react';
import type { ConfigAyni } from '../../config/esquemas';
import { guardarLecturaManual } from '../../datos/almacen';
import { fechaDeDia } from '../../datos/generador';
import type { Lectura } from '../../datos/tipos';
import type { Seleccion } from '../../estado/seleccion';
import { useAyni } from '../../estado/store';
import { conUnidad, numero, rellenar } from '../../motor/frases';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

const CARAS = [Angry, Frown, Meh, Smile, Laugh];

/** Registro manual de mediciones y del ánimo (AYNI_FUSION.md §7.5). */
export function RegistroManual({ config, seleccion }: Props) {
  const { textos, indicadoresRegistro, escalaAnimo, indicadorAnimo } = config.escena;
  const opciones = config.indicadores.filter(
    (i) => i.id !== indicadorAnimo && indicadoresRegistro.includes(i.id),
  );
  const animo = config.indicadores.find((i) => i.id === indicadorAnimo);
  const [indicadorId, setIndicadorId] = useState(opciones[0]?.id ?? '');
  const [valor, setValor] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [animoHoy, setAnimoHoy] = useState<number | null>(null);
  const ind = opciones.find((i) => i.id === indicadorId);

  const guardar = async (id: string, v: number) => {
    const indicador = config.indicadores.find((i) => i.id === id);
    if (!indicador) return;
    const { min, max } = indicador.validacion;
    if (!Number.isFinite(v) || v < min || v > max) {
      setAviso({
        tipo: 'error',
        texto: rellenar(config.frases.fueraDeRango, {
          nombre: indicador.nombre,
          valor: conUnidad(v, indicador.unidad, config.frases),
          min: numero(min, config.frases),
          max: numero(max, config.frases),
        }),
      });
      return;
    }
    const lectura: Lectura = {
      tripulanteId: seleccion.tripulanteId,
      fechaHora: `${fechaDeDia(config, seleccion.dia).slice(0, 10)}T${new Date().toISOString().slice(11, 19)}Z`,
      indicador: id,
      valor: v,
      unidad: indicador.unidad,
      fuente: 'manual',
      contexto: 'reposo',
    };
    const nuevas = await guardarLecturaManual(lectura);
    useAyni.getState().setLecturasManuales(nuevas);
    setAviso({ tipo: 'ok', texto: textos.medicionGuardada });
  };

  return (
    <section aria-labelledby="registro-titulo" className="panel px-4 py-3.5">
      <h2 id="registro-titulo" className="text-[0.92rem] font-semibold text-tinta">
        {textos.registrarMedicion}
      </h2>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-4">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void guardar(indicadorId, Number(valor.replace(',', '.')));
          }}
        >
          <label className="flex flex-col gap-1 text-[0.72rem] text-tinta-tenue">
            {textos.indicador}
            <select
              value={indicadorId}
              onChange={(e) => {
                setIndicadorId(e.target.value);
                setAviso(null);
              }}
              className="rounded-md border border-linea bg-fondo-profundo px-3 py-1.5 text-[0.82rem] text-tinta"
            >
              {opciones.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[0.72rem] text-tinta-tenue">
            {textos.valor}
            <span className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setAviso(null);
                }}
                aria-describedby="registro-aviso"
                className="w-28 rounded-md border border-linea bg-fondo-profundo px-3 py-1.5 text-[0.82rem] tabular-nums text-tinta"
              />
              <span className="text-[0.82rem] text-tinta-suave">
                {ind?.unidad.startsWith('escala_') ? `/${ind.unidad.split('_')[2]}` : ind?.unidad}
              </span>
            </span>
          </label>
          <button
            type="submit"
            disabled={!valor.trim()}
            className="rounded-md border border-acento/60 bg-acento/15 px-4 py-1.5 text-[0.82rem] font-semibold text-tinta hover:bg-acento/25 disabled:opacity-40"
          >
            {textos.guardar}
          </button>
        </form>

        {animo && (
          <fieldset className="flex flex-col gap-1">
            <legend className="text-[0.72rem] text-tinta-tenue">{textos.animoHoy}</legend>
            <div role="radiogroup" aria-label={textos.animoHoy} className="flex gap-1.5">
              {CARAS.map((Cara, i) => {
                const v = i + 1;
                const activo = animoHoy === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    aria-label={escalaAnimo[i]}
                    title={escalaAnimo[i]}
                    onClick={() => {
                      setAnimoHoy(v);
                      void guardar(indicadorAnimo, v);
                    }}
                    className={`grid h-10 w-10 place-items-center rounded-md border transition-colors ${
                      activo
                        ? 'border-acento bg-acento/20 text-tinta'
                        : 'border-linea text-tinta-suave hover:text-tinta'
                    }`}
                  >
                    <Cara size={20} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>
      <p
        id="registro-aviso"
        role={aviso?.tipo === 'error' ? 'alert' : 'status'}
        className={`mt-2 min-h-[1.2em] text-[0.8rem] ${
          aviso?.tipo === 'error' ? 'text-estado-atencion' : 'text-estado-normal'
        }`}
      >
        {aviso?.texto}
      </p>
    </section>
  );
}
