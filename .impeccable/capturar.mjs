// Captura de revisión: Edge headless controlado por CDP (Node 22, WebSocket global).
// Uso: node .impeccable/capturar.mjs <url> <ancho> <alto> <salida.png> [movil]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, ancho, alto, salida, movil] = process.argv.slice(2);
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const puerto = 9300 + Math.floor(Math.random() * 500);
const perfil = mkdtempSync(join(tmpdir(), 'ayni-cdp-'));
const proceso = spawn(edge, [
  '--headless=new',
  `--remote-debugging-port=${puerto}`,
  `--user-data-dir=${perfil}`,
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--hide-scrollbars',
  '--window-size=1600,1200',
  'about:blank',
]);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let pagina;
for (let i = 0; i < 40 && !pagina; i++) {
  await esperar(250);
  try {
    const lista = await (await fetch(`http://127.0.0.1:${puerto}/json`)).json();
    pagina = lista.find((p) => p.type === 'page');
  } catch {}
}
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pendientes = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pendientes.has(m.id)) {
    pendientes.get(m.id)(m);
    pendientes.delete(m.id);
  }
});
const cdp = (method, params = {}, limiteMs = 45000) =>
  new Promise((r) => {
    const n = ++id;
    pendientes.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
    setTimeout(() => {
      if (!pendientes.has(n)) return;
      console.error(`CDP ${method} sin respuesta en ${limiteMs} ms`);
      proceso.kill();
      process.exit(1);
    }, limiteMs);
  });
const evaluar = async (expression) =>
  (await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result
    ?.result?.value;

await cdp('Emulation.setDeviceMetricsOverride', {
  width: Number(ancho),
  height: Number(alto),
  deviceScaleFactor: 1,
  mobile: movil === 'movil',
});
await cdp('Page.navigate', { url });
// Espera a que la escena exista y avanza fotogramas hasta que el cuerpo esté dibujado.
let lista = false;
for (let i = 0; i < 60 && !lista; i++) {
  await esperar(500);
  lista = await evaluar('!!window.__ayni?.r3f && !!window.__ayni.store.getState().motor');
}
if (!lista) {
  console.error(`La app no cargó en ${url}; no se escribe ninguna captura.`);
  proceso.kill();
  process.exit(1);
}
await esperar(4000);
await evaluar(
  `(() => { const v = window.__ayni.r3f.get(); let t = performance.now(); for (let i = 0; i < 60; i++) { t += 16.7; v.advance(t / 1000, true); } return true; })()`,
);
await esperar(1500);
const medida = await evaluar(
  'JSON.stringify({ ancho: innerWidth, scrollWidth: document.documentElement.scrollWidth, alto: document.documentElement.scrollHeight })',
);
const { ancho: a, scrollWidth } = JSON.parse(medida);
const archivos = [];
if (movil === 'movil') {
  // Por tramos: la página desplaza su contenedor principal, no el documento.
  const total = await evaluar(
    `(() => { const c = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 4 && getComputedStyle(d).overflowY === 'auto'); window.__contenedor = c; return c ? c.scrollHeight : 0; })()`,
  );
  const paso = Number(alto) - 140;
  for (let y = 0, n = 1; y < total; y += paso, n++) {
    await evaluar(`(() => { window.__contenedor.scrollTop = ${y}; return true; })()`);
    await esperar(600);
    const r = await cdp('Page.captureScreenshot', { format: 'png' });
    const archivo = n === 1 ? salida : salida.replace(/\.png$/, `-${n}.png`);
    writeFileSync(archivo, Buffer.from(r.result.data, 'base64'));
    archivos.push(archivo);
  }
} else {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(salida, Buffer.from(r.result.data, 'base64'));
  archivos.push(salida);
}
console.log(JSON.stringify({ archivos, innerWidth: a, scrollWidth }));
ws.close();
proceso.kill();
process.exit(0);
