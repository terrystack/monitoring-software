import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarConfig, formatearErrorConfig } from '../src/config/esquemas';
import { generarLecturas, lecturasACsv } from '../src/datos/generador';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = resolve(raiz, 'public/data/sinteticos.csv');

const resultado = cargarConfig();
if (!resultado.ok) {
  console.error('Configuración inválida; no se generó el CSV:');
  for (const e of resultado.errores) console.error(`  - ${formatearErrorConfig(e)}`);
  process.exit(1);
}

const { config } = resultado;
const lecturas = generarLecturas(config);
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, lecturasACsv(lecturas), 'utf8');

const { semilla, fechaInicio, dias } = config.tripulantes.generador;
console.log(
  `sinteticos.csv: ${lecturas.length} lecturas · ${config.tripulantes.tripulantes.length} tripulantes · ` +
    `${dias} días desde ${fechaInicio} · semilla ${semilla}`,
);
