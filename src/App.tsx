import { useEffect } from 'react';
import { formatearErrorConfig, type ConfigAyni, type ResultadoConfig } from './config/esquemas';
import { configEnIdioma } from './config/idioma';
import { useAyni } from './estado/store';
import { useFuenteEstado } from './estado/useFuenteEstado';
import { BarraSuperior } from './layout/BarraSuperior';
import { PaginaCreditos, RUTA_CREDITOS } from './layout/PaginaCreditos';
import { PanelPerfil } from './layout/PanelPerfil';
import { PestanaAgente } from './chat/PestanaAgente';
import { PestanaCuerpo3D } from './pestanas/Cuerpo3D/PestanaCuerpo3D';
import { PestanaMedicion } from './pestanas/Medicion/PestanaMedicion';
import { PestanaMonitoreo } from './pestanas/Monitoreo/PestanaMonitoreo';
import { PestanaEvaluaciones } from './pestanas/Evaluaciones/PestanaEvaluaciones';

interface Props {
  resultadoConfig: ResultadoConfig;
}

export default function App({ resultadoConfig }: Props) {
  if (!resultadoConfig.ok) {
    return (
      <main
        className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-4 p-6"
        role="alert"
      >
        <h1 className="text-xl font-semibold text-estado-critico">
          La configuración de HANAN PACHA no es válida
        </h1>
        <p className="text-tinta-suave">
          Corrige estos archivos de <code>src/config/</code> y recarga la página:
        </p>
        <ul className="space-y-1 font-mono text-sm text-tinta">
          {resultadoConfig.errores.map((e) => (
            <li key={formatearErrorConfig(e)}>{formatearErrorConfig(e)}</li>
          ))}
        </ul>
      </main>
    );
  }
  return <Aplicacion base={resultadoConfig.config} />;
}

/** Aplica idioma y accesibilidad al documento y mantiene la configuración traducida. */
function usePreferenciasDocumento(base: ConfigAyni) {
  const idioma = useAyni((s) => s.idioma);
  const textoGrande = useAyni((s) => s.textoGrande);
  const altoContraste = useAyni((s) => s.altoContraste);
  const movimientoReducido = useAyni((s) => s.movimientoReducido);

  useEffect(() => {
    useAyni.getState().setConfig(configEnIdioma(base, idioma));
    document.documentElement.lang = idioma;
  }, [base, idioma]);

  useEffect(() => {
    const raiz = document.documentElement.classList;
    raiz.toggle('texto-grande', textoGrande);
    raiz.toggle('alto-contraste', altoContraste);
    raiz.toggle('movimiento-reducido', movimientoReducido);
  }, [textoGrande, altoContraste, movimientoReducido]);
}

function Aplicacion({ base }: { base: ConfigAyni }) {
  usePreferenciasDocumento(base);
  const config = useAyni((s) => s.config) ?? base;
  const seleccion = useFuenteEstado(config);
  const pestana = useAyni((s) => s.pestana);

  if (window.location.pathname === RUTA_CREDITOS) return <PaginaCreditos config={config} />;

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-fondo-medio to-fondo-profundo">
      <BarraSuperior config={config} seleccion={seleccion} />
      <main
        id={`panel-${pestana}`}
        role="tabpanel"
        aria-labelledby={`pestana-${pestana}`}
        className="relative min-h-0 flex-1"
      >
        {pestana === 'cuerpo3d' && <PestanaCuerpo3D config={config} seleccion={seleccion} />}
        {pestana === 'monitoreo' && <PestanaMonitoreo config={config} seleccion={seleccion} />}
        {pestana === 'medicion' && <PestanaMedicion config={config} seleccion={seleccion} />}
        {pestana === 'evaluaciones' && (
          <PestanaEvaluaciones config={config} seleccion={seleccion} />
        )}
        {pestana === 'agente' && <PestanaAgente config={config} seleccion={seleccion} />}
      </main>
      <PanelPerfil config={config} seleccion={seleccion} />
    </div>
  );
}
