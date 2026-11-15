import type { ConfigAyni } from '../../config/esquemas';
import { useAyni } from '../../estado/store';
import { numero } from '../../motor/frases';
import { plantilla } from '../../ui/textos';

interface Props {
  config: ConfigAyni;
}

/** Dosis acumulada frente al límite de la regla `presupuesto` (NASA-STD-3001). */
export function PresupuestoRadiacion({ config }: Props) {
  const indicadores = useAyni((s) => s.motor?.indicadores);
  const { textos, estados } = config.escena;
  const ind = config.indicadores.find((i) => i.reglas.some((r) => r.tipo === 'presupuesto'));
  const regla = ind?.reglas.find((r) => r.tipo === 'presupuesto');
  if (!ind || !regla || regla.tipo !== 'presupuesto') return null;

  const ev = indicadores?.[ind.id];
  const dosis = ev?.valor ?? 0;
  const pct = Math.min(100, (dosis / regla.limite) * 100);
  const color = estados.find((e) => e.id === (ev?.estado ?? 'normal'))?.color;

  return (
    <section aria-labelledby="radiacion-titulo" className="panel px-4 py-3.5">
      <h2 id="radiacion-titulo" className="text-[0.92rem] font-semibold text-tinta">
        {textos.presupuestoRadiacion}
      </h2>
      <p className="mt-2 text-[1.5rem] font-bold leading-none tabular-nums text-tinta">
        {numero(dosis, config.frases)}{' '}
        <span className="text-[0.82rem] font-semibold text-tinta-tenue">
          {textos.mSvAcumulados}
        </span>
      </p>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={regla.limite}
        aria-valuenow={Math.round(dosis)}
        aria-label={textos.presupuestoRadiacion}
        className="relative mt-3 h-2 w-full rounded-full bg-linea/60"
      >
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        <span
          aria-hidden="true"
          className="absolute -top-1 h-4 w-px bg-estado-atencion"
          style={{ left: `${regla.ambarPct}%` }}
        />
      </div>
      <p className="mt-2 text-[0.72rem] text-tinta-tenue">
        {plantilla(textos.limiteCarrera, { limite: regla.limite })}
      </p>
    </section>
  );
}
