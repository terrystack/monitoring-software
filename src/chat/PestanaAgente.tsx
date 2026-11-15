import { useEffect, useState } from 'react';
import type { ConfigAyni } from '../config/esquemas';
import type { Seleccion } from '../estado/seleccion';
import { useAyni } from '../estado/store';
import { zonasFuera } from '../motor/puntaje';
import { Lienzo } from './Lienzo';
import { PanelChat } from './PanelChat';
import { detenerVoz } from './voz';

interface Props {
  config: ConfigAyni;
  seleccion: Seleccion;
}

/** Pestaña 4 · Agente HANAN PACHA: chat a la izquierda y lienzo a la derecha (AYNI_FUSION.md §8). */
export function PestanaAgente({ config, seleccion }: Props) {
  const motor = useAyni((s) => s.motor);
  const [lienzoVisible, setLienzoVisible] = useState(true);
  const { textos } = config.escena;

  useEffect(() => {
    const s = useAyni.getState();
    if (s.lienzo.tipo === 'vacio' && motor) {
      const peor = zonasFuera(motor)[0];
      if (peor) s.setLienzo({ tipo: 'cuerpo', zona: peor });
    }
  }, [motor]);

  useEffect(() => () => detenerVoz(), []);

  return (
    <div className="flex h-full min-h-0 flex-col lg:grid lg:grid-cols-2">
      <h1 className="sr-only">{textos.pestanaAgente}</h1>
      <div className="order-2 flex min-h-0 flex-1 flex-col lg:order-1">
        <PanelChat config={config} seleccion={seleccion} />
      </div>
      <div className="order-1 flex flex-col lg:order-2 lg:min-h-0">
        <button
          type="button"
          aria-expanded={lienzoVisible}
          onClick={() => setLienzoVisible((v) => !v)}
          className="border-b border-linea/40 px-4 py-1.5 text-left text-[0.8rem] text-tinta-suave lg:hidden"
        >
          {lienzoVisible ? textos.ocultarLienzo : textos.mostrarLienzo}
        </button>
        <div className={`${lienzoVisible ? 'h-[45vh]' : 'hidden'} lg:block lg:h-full lg:min-h-0`}>
          <Lienzo config={config} seleccion={seleccion} />
        </div>
      </div>
    </div>
  );
}
