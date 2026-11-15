import type { ConfigAyni } from '../config/esquemas';
import { plantilla } from '../ui/textos';
import type { EstadoLienzo } from './tipos';

/** Título corto de lo que muestra el lienzo (cabecera y chips de los mensajes). */
export function tituloLienzo(lienzo: EstadoLienzo, config: ConfigAyni): string {
  const { textos } = config.escena;
  const indicador = (id: string) => config.indicadores.find((i) => i.id === id)?.nombre ?? id;
  switch (lienzo.tipo) {
    case 'vacio':
      return textos.lienzo;
    case 'cuerpo':
      return lienzo.zona
        ? (config.zonas.find((z) => z.id === lienzo.zona)?.nombre ?? lienzo.zona)
        : textos.pestanaCuerpo;
    case 'grafico':
      return `${indicador(lienzo.indicador)} · ${plantilla(textos.dias, { n: lienzo.dias })}`;
    case 'comparacion':
      return `${textos.comparar}: ${indicador(lienzo.indicadores[0])} / ${indicador(lienzo.indicadores[1])}`;
    case 'dispositivo': {
      const disp =
        config.dispositivos.find((d) => d.id === lienzo.dispositivo) ??
        config.dispositivos.find((d) => d.sensores?.length);
      return `${disp?.nombre ?? textos.guiaDispositivo} · ${lienzo.paso}`;
    }
    case 'resumen':
      return textos.resumenHoy;
  }
}
