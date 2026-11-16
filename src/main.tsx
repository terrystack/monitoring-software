import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/biryani/latin-400.css';
import '@fontsource/biryani/latin-600.css';
import '@fontsource/biryani/latin-700.css';
import App from './App.tsx';
import { cargarConfig } from './config/esquemas';
import { configEnIdioma } from './config/idioma';
import { useAyni } from './estado/store';
import { Analytics } from '@vercel/analytics/react';
import './index.css';

const resultadoConfig = cargarConfig();
if (resultadoConfig.ok) {
  const { setConfig, idioma } = useAyni.getState();
  setConfig(configEnIdioma(resultadoConfig.config, idioma));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Analytics />
    <App resultadoConfig={resultadoConfig} />
  </StrictMode>,
);
