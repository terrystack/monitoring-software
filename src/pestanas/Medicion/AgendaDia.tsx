import { useEffect, useState } from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';
import type { ConfigAyni, Franja } from '../../config/esquemas';
import { sensorParaIndicadores } from '../../escena3d/dispositivo/estadoSensor';
import type { Seleccion } from '../../estado/seleccion';
import { useAyni } from '../../estado/store';
import { agendaDelDia, type EstadoTarea } from '../../motor/agenda';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

const FRANJAS: Franja[] = ['manana', 'dia', 'noche', 'semanal'];

/** Agenda del día seleccionado por franjas, con su estado (AYNI_FUSION.md §7.4). */
export function AgendaDia({ config, seleccion }: Props) {
  const lecturas = useAyni((s) => s.lecturas);
  const manuales = useAyni((s) => s.lecturasManuales);
  const [ahora, setAhora] = useState(() => new Date().toTimeString().slice(0, 5));
  const { textos } = config.escena;

  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date().toTimeString().slice(0, 5)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const agenda = agendaDelDia(
    config,
    [...lecturas, ...manuales],
    seleccion.tripulanteId,
    seleccion.dia,
    ahora,
  );
  const nombreFranja: Record<Franja, string> = {
    manana: textos.franjaManana,
    dia: textos.franjaDia,
    noche: textos.franjaNoche,
    semanal: textos.franjaSemanal,
  };
  const estilo: Record<EstadoTarea, { texto: string; clase: string; icono: typeof Check }> = {
    hecha: { texto: textos.hecha, clase: 'text-estado-normal', icono: Check },
    pendiente: { texto: textos.pendiente, clase: 'text-tinta-suave', icono: Clock },
    atrasada: { texto: textos.atrasada, clase: 'text-estado-atencion', icono: AlertCircle },
  };

  const abrirTarea = (indicadores: string[]) => {
    const s = useAyni.getState();
    const sensor = sensorParaIndicadores(config, indicadores);
    if (sensor) s.setDispositivoActivo(sensor.dispositivo);
    s.setPasoDispositivo(0);
    s.setSensorSeleccionado(sensor?.id ?? null);
  };

  return (
    <section aria-labelledby="agenda-titulo" className="panel px-4 py-3.5">
      <h2 id="agenda-titulo" className="text-[0.92rem] font-semibold text-tinta">
        {textos.agendaHoy}
      </h2>
      {FRANJAS.map((f) => {
        const tareas = agenda.filter((t) => t.tarea.franja === f);
        if (tareas.length === 0) return null;
        return (
          <div key={f} className="mt-3">
            <h3 className="rotulo">{nombreFranja[f]}</h3>
            <ul className="mt-1 flex flex-col">
              {tareas.map(({ tarea, estado }) => {
                const e = estilo[estado];
                const Icono = e.icono;
                return (
                  <li key={tarea.id}>
                    <button
                      type="button"
                      onClick={() => abrirTarea(tarea.indicadores)}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.82rem] hover:bg-white/5"
                    >
                      <span className="w-10 shrink-0 tabular-nums text-tinta-tenue">
                        {tarea.hora}
                      </span>
                      <span className="min-w-0 flex-1 text-tinta">{tarea.titulo}</span>
                      <span
                        className={`flex shrink-0 items-center gap-1 text-[0.72rem] font-semibold ${e.clase}`}
                      >
                        <Icono size={12} aria-hidden="true" />
                        {e.texto}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
