import type { ConfigAyni } from '../../config/esquemas';
import { useAyni } from '../../estado/store';
import { puntajeGeneral, zonasFuera } from '../../motor/puntaje';
import { IconoEstado } from '../../ui/IconoEstado';
import { PanelAptitud } from '../Cuerpo3D/PanelAptitud';
import { AnilloEstado } from './AnilloEstado';
import { PresupuestoRadiacion } from './PresupuestoRadiacion';

interface Props {
  config: ConfigAyni;
  compacto?: boolean;
}

/** Resumen de hoy: estado 0–100, aptitud, radiación y alertas (AYNI_FUSION.md §6.2). */
export function ResumenHoy({ config, compacto = false }: Props) {
  const motor = useAyni((s) => s.motor);
  const { textos, estados } = config.escena;
  if (!motor) return null;

  const puntaje = puntajeGeneral(motor);
  const fuera = zonasFuera(motor);
  const nombreZona = (id: string) => config.zonas.find((z) => z.id === id)?.nombre ?? id;
  const motivo =
    fuera.length === 0
      ? config.frases.dentroDeTuNormal
      : `${textos.fueraDeTuNormal}: ${fuera.map(nombreZona).join(', ')}.`;

  const abrirZona = (id: string) => {
    const s = useAyni.getState();
    s.seleccionarZona(id);
    s.setPestana('cuerpo3d');
  };

  return (
    <div
      className={`grid gap-3 ${compacto ? 'grid-cols-1' : 'md:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]'}`}
    >
      <section className="panel px-4 py-4">
        <AnilloEstado config={config} puntaje={puntaje} motivo={motivo} />
      </section>
      <PanelAptitud config={config} />
      <PresupuestoRadiacion config={config} />
      <section aria-labelledby="alertas-titulo" className="panel px-4 py-3.5">
        <h2 id="alertas-titulo" className="text-[0.92rem] font-semibold text-tinta">
          {textos.alertas}
        </h2>
        {fuera.length === 0 && motor.alertas.length === 0 ? (
          <p className="mt-2 text-[0.84rem] text-tinta-suave">{textos.sinAlertas}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {motor.alertas.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => abrirZona(a.zonas[0])}
                  className="w-full rounded-md px-2 py-1.5 text-left text-[0.84rem] font-semibold text-tinta hover:bg-white/5"
                >
                  {config.reglasCompuestas.multisenal.find((m) => m.id === a.id)?.nombre ??
                    a.nombre}
                </button>
              </li>
            ))}
            {fuera.map((id) => {
              const estado = estados.find((e) => e.id === motor.zonas[id]?.estado);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => abrirZona(id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[0.84rem] hover:bg-white/5"
                  >
                    {estado && <IconoEstado estado={estado.id} color={estado.color} tamano={13} />}
                    <span className="text-tinta">{nombreZona(id)}</span>
                    <span className="ml-auto text-[0.78rem]" style={{ color: estado?.color }}>
                      {estado?.etiqueta}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
