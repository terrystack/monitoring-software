# HANAN PACHA · Salud del astronauta

Plataforma web de autoevaluación de salud para astronautas. Compara cada medición con **tu normal** (tu propia línea base de 14 días), muestra en un cuerpo 3D qué zona cambió y dice qué hacer y cuándo avisar al médico de vuelo.

NASA Space Apps Challenge 2026 · Reto [_Create Health Monitoring Software for Astronauts on Space Missions_](https://www.spaceappschallenge.org/2026/challenges/create-health-monitoring-software-for-astronauts-on-space-missions/).

> **HANAN PACHA no es un dispositivo médico ni da diagnósticos.** Es una herramienta de autoevaluación y apoyo a la decisión; ante cualquier duda, manda el médico de vuelo.

Demo: https://ayni-vert.vercel.app

## Las 4 pestañas

| Pestaña                    | Qué hace                                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Cuerpo 3D**              | Cuerpo anatómico por capas (piel, músculos, esqueleto, órganos, nervios, vasos), rotable y clicable. Cada zona se colorea según sus indicadores. Al tocar una zona se abre la tarjeta de acción: qué cambió, qué hacer ahora, cuándo avisar al médico. |
| **Monitoreo y predicción** | Estado general del día, presupuesto de radiación, gráficos por indicador con la banda de tu normal (media ± 2σ) y una predicción simple a 7 días; comparación de dos indicadores; deslizador para moverse por los días.                                |
| **Medición**               | Chaleco biométrico HANAN PACHA en 3D sobre el mismo cuerpo, con 8 sensores que muestran su estado y valor, guía de colocación paso a paso con errores comunes, agenda del día y registro manual (mediciones y ánimo).                                         |
| **Agente HANAN PACHA**            | Chat con texto, imagen y voz, a la izquierda; a la derecha, un lienzo que el agente controla (zona 3D, gráfico, comparación, guía del chaleco o resumen). Usa solo los datos de HANAN PACHA; sin clave o sin red responde un respaldo local por reglas.       |

## Cómo correrlo

Requiere Node 20 o superior.

```bash
npm i
npm run dev        # app en http://localhost:5173 (el chat usa el respaldo local)
npm run dev:full   # app + /api/chat y /api/stt con Vercel dev (agente con modelo de lenguaje)
```

Otros scripts: `npm test` (Vitest), `npm run lint`, `npm run build`, `npm run datos` (regenera el CSV sintético), `npm run modelos` (prepara los GLB anatómicos).

## Variables de entorno (solo servidor)

El modelo, Whisper y TTS se llaman solo desde `api/chat.ts`, `api/stt.ts` y `api/tts.ts`. Las claves **nunca** llevan prefijo `VITE_` ni llegan al navegador. En local van en `.env.local`; en Vercel, en _Settings → Environment Variables_ (Production y Preview).

| Variable              | Uso                                                                 |
| --------------------- | ------------------------------------------------------------------- |
| `GEMINI_API_KEY`      | Agente (Flash-Lite) y TTS (`gemini-3.8-flash-lite-tts`)             |
| `GROQ_API_KEY`        | Respaldo del agente (`openai/gpt-oss-120b`) y STT Whisper           |
| `LLM_MODEL`           | Opcional; por defecto `gemini-3.5-flash-lite`                       |
| `LLM_FALLBACK_MODEL`  | Opcional; por defecto `openai/gpt-oss-120b`                         |
| `TTS_MODEL`           | Opcional; por defecto `gemini-3.8-flash-lite-tts`                   |
| `TTS_VOICE`           | Opcional; por defecto `Kore`                                        |
| `CHAT_MAX_TOKENS`     | Límite de la respuesta (por defecto 600)                            |

Voz: dictado con Whisper (`/api/stt`) y respaldo Web Speech; lectura solo con Gemini TTS (`/api/tts`). Ver `.env.example`.

## Datos sintéticos

Todas las lecturas (`public/data/sinteticos.csv`) son **sintéticas**, generadas con semilla fija para 3 tripulantes y 5 entornos (nave en tránsito, estación orbital, rover de superficie, base lunar y base marciana). La app lo indica con el chip "Datos sintéticos". Las mediciones manuales se guardan solo en el navegador (IndexedDB) y se pueden borrar desde el perfil. Umbrales, textos e indicadores viven en `src/config/*.json`; las referencias de límites citan NASA-STD-3001 y NASA OCHMO.

## Cómo está hecho

- Vite + React + TypeScript, Tailwind, Zustand.
- 3D con three.js, React Three Fiber y drei; un solo Canvas montado a la vez.
- Gráficos con ECharts (modular).
- Motor de reglas puro y testeado (`src/motor/`): línea base, reglas por indicador, reglas multiseñal, aptitud del día y tarjeta de acción.
- Agente: `api/chat.ts` (Vercel Function) con Gemini Flash-Lite (AI Studio) y respaldo Groq; Whisper STT en `api/stt.ts`; Gemini TTS en `api/tts.ts`; respaldo local en `src/chat/respaldoLocal.ts`. Batería de pruebas en `src/chat/pruebas.md`.
- Español e inglés (`src/config/idiomas/en.json`).
- Especificaciones: `docs/AYNI_SPEC.md` y `docs/AYNI_FUSION.md`. Diseño: `DESIGN.md`.

## Equipo

- **Mateo Andrade Ballen**
- **Marisol** ([@MarisolVizu](https://github.com/MarisolVizu)), coautora: tablero de monitoreo, chaleco con sensores y guía de pasos, registro manual y asistente original ([repositorio](https://github.com/MarisolVizu/ayni)), integrados en esta versión.

## Licencias y créditos

- **Código:** MIT (ver `LICENSE`).
- **Modelos 3D:** derivados de [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) (CC BY-SA 4.0, convertidos por [3D Anatomy](https://github.com/nqwrc/3d-anatomy)) y [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/) (CC BY-SA 2.1 JP), con cuerpo base de MakeHuman adaptado por Innerscene (CC0). El `cuerpo.glb` derivado se comparte bajo **CC BY-SA 4.0**. Detalle por estructura en `public/modelos/creditos.json` y en la página de créditos de la app.
- Tipografía Biryani (SIL Open Font License), íconos Lucide (ISC).
