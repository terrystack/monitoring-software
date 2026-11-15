import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, Brain, Check, Clock, Timer } from 'lucide-react';
import type { ConfigAyni, Tarea } from '../../config/esquemas';
import { leerSesionesMhcl, leerSesionesPvt } from '../../datos/almacen';
import { fechaDeDia } from '../../datos/generador';
import type { Seleccion } from '../../estado/seleccion';
import type { Idioma } from '../../config/idioma';
import { useAyni } from '../../estado/store';
import { agendaDelDia, type EstadoTarea } from '../../motor/agenda';
import { diaDe } from '../../motor/lineaBase';
import { CuestionarioMhcl } from './CuestionarioMhcl';
import { FlujoPvt } from './FlujoPvt';
import { horaActual } from './tiempo';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

type IdEvaluacion = 'pvt' | 'mhcl';

/** Nombre del día de la semana ISO (1 = lunes … 7 = domingo) en el idioma activo. */
function nombreDiaSemana(dow: number, idioma: Idioma): string {
  // 2026-11-16 fue lunes.
  const fecha = new Date(Date.UTC(2026, 10, 15 + dow));
  return new Intl.DateTimeFormat(idioma, { weekday: 'long', timeZone: 'UTC' }).format(fecha);
}

/** Pestaña Evaluaciones: PVT-B dos veces al día y MHCL una vez por semana. */
export function PestanaEvaluaciones({ config, seleccion }: Props) {
  const t = config.evaluaciones.textos;
  const { textos } = config.escena;
  const [activa, setActiva] = useState<IdEvaluacion>('pvt');
  const lecturas = useAyni((s) => s.lecturas);
  const manuales = useAyni((s) => s.lecturasManuales);
  const idioma = useAyni((s) => s.idioma);
  const [ahora, setAhora] = useState(horaActual);

  useEffect(() => {
    const s = useAyni.getState();
    if (s.sesionesPvt === null) void leerSesionesPvt().then(s.setSesionesPvt);
    if (s.sesionesMhcl === null) void leerSesionesMhcl().then(s.setSesionesMhcl);
    const id = window.setInterval(() => setAhora(horaActual()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const todas = [...lecturas, ...manuales];
  const agenda = agendaDelDia(config, todas, seleccion.tripulanteId, seleccion.dia, ahora);
  const estadoDe = (id: string) => agenda.find((a) => a.tarea.id === id)?.estado;
  const tarea = (id: string) => config.rutina.find((r) => r.id === id);

  const tareasPvt = config.evaluaciones.pvt.momentos
    .map((m) => ({ momento: m.id, tarea: tarea(m.tarea) }))
    .filter((x): x is { momento: string; tarea: Tarea } => Boolean(x.tarea));

  // MHCL: hecha si hay una lectura de sus subescalas en los últimos 7 días de datos.
  const tareaMhcl = tarea(config.evaluaciones.mhcl.tarea);
  const fecha = fechaDeDia(config, seleccion.dia).slice(0, 10);
  const hace7 = new Date(`${fecha}T00:00:00Z`);
  hace7.setUTCDate(hace7.getUTCDate() - 6);
  const desde = hace7.toISOString().slice(0, 10);
  const indicadoresMhcl = new Set(config.evaluaciones.mhcl.subescalas.map((s) => s.indicador));
  const mhclHecha = todas.some(
    (l) =>
      l.tripulanteId === seleccion.tripulanteId &&
      indicadoresMhcl.has(l.indicador) &&
      diaDe(l.fechaHora) >= desde &&
      diaDe(l.fechaHora) <= fecha,
  );

  const nombreMomento = (id: string) => (id === 'despertar' ? t.momentoDespertar : t.momentoNoche);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <h1 className="sr-only">{t.titulo}</h1>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 p-3 lg:grid lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-start lg:gap-4 lg:p-4">
        <div className="flex flex-col gap-3">
          <p className="px-1 text-[0.82rem] leading-relaxed text-tinta-suave">{t.intro}</p>
          <div role="tablist" aria-label={t.titulo} className="flex flex-col gap-3">
            <Opcion
              id="pvt"
              activa={activa === 'pvt'}
              onElegir={setActiva}
              icono={<Timer size={18} aria-hidden="true" />}
              nombre={t.pvtNombre}
              resumen={t.pvtResumen}
              rotulo={t.hoy}
              filas={tareasPvt.map((x) => ({
                etiqueta: nombreMomento(x.momento),
                hora: x.tarea.hora,
                estado: estadoDe(x.tarea.id),
              }))}
              textos={textos}
            />
            <Opcion
              id="mhcl"
              activa={activa === 'mhcl'}
              onElegir={setActiva}
              icono={<Brain size={18} aria-hidden="true" />}
              nombre={t.mhclNombre}
              resumen={t.mhclResumen}
              rotulo={t.estaSemana}
              filas={
                tareaMhcl
                  ? [
                      {
                        etiqueta: (tareaMhcl.diasSemana ?? [])
                          .map((d) => nombreDiaSemana(d, idioma))
                          .join(', '),
                        hora: tareaMhcl.hora,
                        estado: mhclHecha ? 'hecha' : (estadoDe(tareaMhcl.id) ?? 'pendiente'),
                      },
                    ]
                  : []
              }
              textos={textos}
            />
          </div>
        </div>

        <section
          id={`panel-eval-${activa}`}
          role="tabpanel"
          aria-labelledby={`opcion-eval-${activa}`}
          className="panel min-w-0 px-4 py-4 lg:px-5"
        >
          {activa === 'pvt' ? (
            <FlujoPvt key={seleccion.tripulanteId} config={config} seleccion={seleccion} />
          ) : (
            <CuestionarioMhcl key={seleccion.tripulanteId} config={config} seleccion={seleccion} />
          )}
        </section>
        <p className="px-1 text-[0.72rem] text-tinta-tenue lg:col-span-2">{textos.noDiagnostico}</p>
      </div>
    </div>
  );
}

interface FilaHorario {
  etiqueta: string;
  hora: string;
  estado: EstadoTarea | undefined;
}

interface PropsOpcion {
  id: IdEvaluacion;
  activa: boolean;
  onElegir: (id: IdEvaluacion) => void;
  icono: ReactNode;
  nombre: string;
  resumen: string;
  rotulo: string;
  filas: FilaHorario[];
  textos: ConfigAyni['escena']['textos'];
}

function Opcion({
  id,
  activa,
  onElegir,
  icono,
  nombre,
  resumen,
  rotulo,
  filas,
  textos,
}: PropsOpcion) {
  const estilo: Record<EstadoTarea, { texto: string; clase: string; Icono: typeof Check }> = {
    hecha: { texto: textos.hecha, clase: 'text-estado-normal', Icono: Check },
    pendiente: { texto: textos.pendiente, clase: 'text-tinta-suave', Icono: Clock },
    atrasada: { texto: textos.atrasada, clase: 'text-estado-atencion', Icono: AlertCircle },
  };
  return (
    <button
      type="button"
      role="tab"
      id={`opcion-eval-${id}`}
      aria-selected={activa}
      aria-controls={`panel-eval-${id}`}
      onClick={() => onElegir(id)}
      className={`panel flex flex-col gap-2 px-4 py-3.5 text-left transition-colors duration-150 ${
        activa ? '!border-acento/60 !bg-acento/10' : 'hover:!border-tinta-tenue'
      }`}
    >
      <span className="flex items-center gap-2 text-[0.95rem] font-semibold text-tinta">
        <span className={activa ? 'text-acento' : 'text-tinta-suave'}>{icono}</span>
        {nombre}
      </span>
      <span className="text-[0.8rem] leading-relaxed text-tinta-suave">{resumen}</span>
      {filas.length > 0 && (
        <span className="mt-1 flex flex-col">
          <span className="rotulo mb-1">{rotulo}</span>
          {filas.map((f) => {
            const e = f.estado ? estilo[f.estado] : null;
            return (
              <span
                key={f.etiqueta}
                className="flex items-center justify-between gap-2 border-t border-linea/45 py-1.5 text-[0.8rem]"
              >
                <span className="text-tinta">
                  {f.etiqueta} <span className="tabular-nums text-tinta-tenue">{f.hora}</span>
                </span>
                {e && (
                  <span className={`flex items-center gap-1 text-[0.74rem] ${e.clase}`}>
                    <e.Icono size={13} aria-hidden="true" />
                    {e.texto}
                  </span>
                )}
              </span>
            );
          })}
        </span>
      )}
    </button>
  );
}
