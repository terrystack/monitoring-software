# AYNI · Especificación técnica para Cursor (versión 1)

> **Desde el 14 nov 2026 manda `docs/AYNI_FUSION.md`** donde contradiga a este documento: la app pasa a 4 pestañas (`cuerpo3d`, `monitoreo`, `medicion`, `agente`), los textos de interfaz de 4.4.11 se amplían según su §4.4 (incluida `escena.preguntasSugeridas`) y "tu normal" se muestra como **media ± 2σ** de la línea base (texto del motor, tabla, perfil y bandas de los gráficos).

> Plataforma web de autoevaluación de salud para astronautas.
> NASA Space Apps Challenge 2026 · Reto: *Create Health Monitoring Software for Astronauts on Space Missions*.
> Este archivo es la fuente de verdad para construir la **versión 1 (general, con datos sintéticos)** y desplegarla en **Vercel**.

---

## 0. Cómo usar este documento en Cursor

1. Crea el repositorio vacío y copia este archivo como `docs/AYNI_SPEC.md`.
2. Copia la sección **11. Reglas para el agente** en `.cursor/rules/ayni.mdc` para que Cursor las aplique siempre.
3. **Estilo visual:** todo el 3D sigue un estilo de **diseño web 3D inmersivo** (sección 5); la interfaz 2D sigue Impeccable.
4. Construye **fase por fase** (sección 10). Cada fase indica sus skills, un prompt y criterios de aceptación. No avances sin cumplirlos.
5. Si algo de este documento entra en conflicto con una decisión nueva del equipo, **actualiza primero este archivo** y luego el código.

### 0.1 Skills instaladas en Cursor

| Colección | Repositorio | Se usa para |
|---|---|---|
| **Impeccable** | pbakaus/impeccable | Interfaz 2D: layout, barra superior, paneles, tarjetas, tipografía, color, estados, accesibilidad visual |
| **threejs-skills** | [cloudai-x/threejs-skills](https://github.com/cloudai-x/threejs-skills) | 3D: `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-shaders`, `threejs-lighting`, `threejs-textures`, `threejs-animation`, `threejs-interaction`, `threejs-postprocessing`, `threejs-loaders`, `threejs-performance`, `threejs-react-three-fiber`, `threejs-asset-pipeline` |
| **three-agent-skills** | [emalorenzo/three-agent-skills](https://github.com/emalorenzo/three-agent-skills) | Arquitectura y rendimiento de React Three Fiber: `r3f-best-practices` (re-renders, drei, Zustand, postprocesado) y las demás skills de la colección que apliquen |

**Mapa rápido: qué skill aplicar según la carpeta**

| Carpeta / tarea | Skills |
|---|---|
| `src/escena3d/Escena.tsx` (canvas, luces, entorno) | `threejs-fundamentals`, `threejs-lighting`, `threejs-react-three-fiber`, `r3f-best-practices` |
| `src/escena3d/cuerpo/geometrias.ts` | `threejs-geometry` |
| `src/escena3d/cuerpo/materiales.ts` y efectos (holograma, Fresnel, escaneo, pulsos nerviosos, halo) | `threejs-materials`, `threejs-shaders`, `threejs-textures` |
| Partículas de flujo, latido, respiración, vuelo de cámara | `threejs-animation`, `threejs-performance` |
| `src/escena3d/interaccion/` (hover, clic, selección, etiquetas) | `threejs-interaction`, `r3f-best-practices` |
| Bloom, outline, viñeta | `threejs-postprocessing` |
| `src/escena3d/calidad.ts`, instanciado, niveles de calidad | `threejs-performance`, `r3f-best-practices` |
| GLB futuros (dispositivo propio, anatomía detallada) | `threejs-loaders`, `threejs-asset-pipeline` |
| `src/layout/`, `src/pestanas/`, `src/ui/`, `src/chat/PanelChat.tsx` | Impeccable |
| `src/motor/`, `src/datos/`, `src/prediccion/`, `api/` | Ninguna skill de diseño: seguir las secciones 4, 6, 7 y 8 |

### 0.2 Prompt de arranque (pegar en el agente de Cursor)

```
Lee docs/AYNI_SPEC.md completo. Es la fuente de verdad del proyecto AYNI.

Objetivo de esta sesión: completar las fases 0, 1 y 2 de la sección 10
(andamiaje, datos y configuración, motor), en ese orden.

Reglas:
- Respeta la estructura de carpetas de la sección 3 y los contratos de las
  secciones 4 y 6 (CSV, JSON, tipos). No inventes campos.
- Antes de escribir código de cada fase, dame un plan corto con los archivos que
  vas a crear y espera mi confirmación.
- Al terminar cada fase, verifica sus criterios de aceptación (npm run dev,
  npm run build, npm test, npm run datos) y muéstrame el resultado.
- Todavía no construyas el 3D ni la interfaz: eso empieza en la fase 3.
- Si algo de la especificación es ambiguo, pregúntame antes de decidir.
```

**Arranque en paralelo para el equipo 3D** (otra sesión de Cursor, una vez terminada la fase 0):

```
Lee docs/AYNI_SPEC.md, secciones 4.3, 5 y fase 3 de la sección 10.
Aplica las skills threejs-geometry, threejs-materials, threejs-shaders,
threejs-interaction, threejs-react-three-fiber y r3f-best-practices.

Construye en src/escena3d/ el cuerpo humano procedural con sus seis capas y el
halo, usando los nombres de malla de la sección 4.3. Mientras el motor no esté
listo, usa un estado de zonas de ejemplo en un archivo mock que respete el tipo
EstadoZona de la sección 6.1. Muéstrame el plan antes de programar y trabaja capa
por capa (piel → esqueleto → órganos → nervioso → vascular → músculos → halo).
```

---

## 1. Resumen del producto

AYNI (quechua: *reciprocidad*) permite al astronauta **medir, entender y actuar** sobre su salud sin depender de la Tierra.

| Elemento | Qué hace |
|---|---|
| **Pestaña 1 · Cuerpo 3D** (inicio) | Cuerpo humano 3D por capas, rotable y clicable. Cada zona se colorea según sus sensores. Al tocar una zona se abre la **tarjeta de acción**. |
| **Pestaña 2 · Evolución y predicción** | Tendencias por indicador con banda de línea base personal + predicción a 3–7 días con banda de incertidumbre. Radiación y CO₂ de cabina. |
| **Pestaña 3 · Medir y dispositivos** | Agenda del día, guía 3D de uso del dispositivo (genérico en v1), registro de valores (teclado, clic, cámara), prueba de reacción, logros. |
| **Chat AYNI** (panel lateral) | Modelo de lenguaje por API, guía y apoyo del astronauta, **nunca reemplaza al médico**. Usa el contexto de la pantalla y puede navegar la app con llamadas a funciones. |
| **Barra superior + perfil** | Tripulante, día de misión, entorno, etiqueta "Datos sintéticos", campana de alertas. El avatar abre un panel de perfil (selector de tripulante, entorno, accesibilidad, modo demo). |

**Fuera de alcance (v1):** transmisión de datos a Tierra (se asume resuelta), diagnóstico o prescripción, hardware real, autenticación.

**Principios no negociables**
1. El cuerpo es la interfaz: todo indicador vive en una zona del cuerpo 3D.
2. Tu valor frente a tu normal: siempre se muestra la línea base personal (14 días).
3. Una sola acción clara por alerta + cuándo avisar al médico de vuelo.
4. Ninguna medición sin su guía.
5. Funciona sin conexión (excepto el chat).
6. El chat ayuda, no sostiene: la orientación esencial también está en la tarjeta de acción.
7. Configurable antes que codificado: indicadores, reglas, textos, dispositivos y entornos viven en JSON.
8. Honestidad visible: etiqueta "Datos sintéticos" y "No es un diagnóstico médico".

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión sugerida |
|---|---|---|
| Build | Vite + TypeScript | `vite@5.4`, `typescript@5.6` |
| UI | React | `react@18.3.1`, `react-dom@18.3.1` |
| Estilos | Tailwind CSS | `tailwindcss@3.4` + `postcss` + `autoprefixer` |
| 3D | Three.js + React Three Fiber + drei | `three@0.169.0`, `@react-three/fiber@8.17`, `@react-three/drei@9.114` |
| Postprocesado | `@react-three/postprocessing` | `2.16` (Bloom, Vignette, Outline/Selection) |
| Animación UI | Framer Motion | `framer-motion@11` |
| Gráficos | Recharts | `recharts@2.13` |
| Estado | Zustand | `zustand@4.5` |
| Persistencia local | idb-keyval (IndexedDB) | `idb-keyval@6` |
| CSV | PapaParse | `papaparse@5.4` |
| Validación de esquemas | Zod | `zod@3.23` |
| OCR (cámara) | Tesseract.js | `tesseract.js@5` (carga diferida) |
| Iconos | lucide-react | `lucide-react@0.4xx` |
| Chat (servidor) | Vercel Serverless Function en `/api/chat.ts` | `@vercel/node` para tipos |
| SDK del modelo | El del proveedor elegido (adaptador en `api/_llm.ts`) | — |
| Tests | Vitest | `vitest@2` |
| Scripts TS | tsx (ejecuta `scripts/*.ts`) | `tsx@4` (dev) |
| Despliegue | Vercel | Preset "Vite" |

> Fijar versiones exactas en `package.json` al crear el proyecto. React Three Fiber v8 requiere React 18.

---

## 3. Estructura del proyecto

```
ayni/
├─ api/
│  ├─ chat.ts                 # Función serverless: proxy al modelo de lenguaje
│  └─ _llm.ts                 # Adaptador del proveedor (lee env vars)
├─ docs/
│  └─ AYNI_SPEC.md            # Este archivo
├─ public/
│  ├─ data/
│  │  ├─ sinteticos.csv       # Generado por scripts/generar-datos.ts
│  │  └─ predicciones.json    # Opcional: salida del modelo del equipo de datos
│  ├─ modelos/                # Generado por scripts/preparar-modelos.ts (5.2.1)
│  │  ├─ cuerpo.glb           # Cuerpo anatómico (Draco), una malla por nombre de 4.3
│  │  ├─ flujo.json           # Recorridos de partículas de flujo por vaso
│  │  └─ creditos.json        # Atribuciones y estructuras fuente de cada malla
│  └─ draco/                  # Decodificador Draco local (funciona sin conexión)
├─ scripts/
│  ├─ generar-datos.ts        # Generador sintético reproducible (semilla fija)
│  ├─ preparar-modelos.ts     # `npm run modelos`: fuentes anatómicas → public/modelos
│  ├─ mallas-anatomia.json    # Contrato: estructuras fuente → nombres de malla, créditos
│  └─ mapeoAnatomia.ts        # Zod + clasificación del contrato (con tests)
├─ src/
│  ├─ config/
│  │  ├─ indicadores.json
│  │  ├─ zonas.json
│  │  ├─ dispositivos.json
│  │  ├─ entornos.json
│  │  ├─ escenarios.json
│  │  ├─ rutina.json
│  │  ├─ tripulantes.json
│  │  ├─ reglas-compuestas.json
│  │  ├─ escena.json          # Paleta de estado, capas y textos de la interfaz (4.4.11)
│  │  ├─ frases.json          # Plantillas con las que el motor redacta (4.4.12)
│  │  ├─ idiomas/en.json      # Capa de traducción al inglés (4.4.13)
│  │  ├─ idioma.ts            # Valida y aplica la capa de idioma (con tests)
│  │  └─ esquemas.ts          # Zod: valida todos los JSON al iniciar
│  ├─ datos/
│  │  ├─ cargarCsv.ts
│  │  ├─ almacen.ts           # IndexedDB
│  │  ├─ generador.ts         # Núcleo puro del generador sintético (lo usan el script y los tests)
│  │  └─ tipos.ts
│  ├─ motor/
│  │  ├─ validacion.ts
│  │  ├─ lineaBase.ts
│  │  ├─ reglas.ts
│  │  ├─ estadoZonas.ts
│  │  ├─ tarjetaAccion.ts
│  │  └─ motor.test.ts
│  ├─ prediccion/
│  │  ├─ prediccionSimple.ts  # Regresión lineal + banda (v1)
│  │  └─ cargarPredicciones.ts# Lee predicciones.json si existe
│  ├─ escena3d/
│  │  ├─ Escena.tsx           # Canvas, luces, entorno, postprocesado
│  │  ├─ Efectos.tsx          # Outline, Bloom y Vignette según la calidad
│  │  ├─ estadoDesdeMotor.ts  # EstadoMotor → EstadoCuerpo (colores y animaciones)
│  │  ├─ mockEstadoCuerpo.ts  # Estado de ejemplo para trabajar sin el motor
│  │  ├─ cuerpo/
│  │  │  ├─ Cuerpo.tsx        # Orquesta capas (anatómico; procedural como respaldo)
│  │  │  ├─ CuerpoAnatomico.tsx # Carga cuerpo.glb, capas, latido, pulsos y flujo
│  │  │  ├─ modeloAnatomico.ts  # Prepara el GLB: materiales por capa, grupos, emisivos
│  │  │  ├─ LimiteError.tsx   # Si el GLB falla, muestra el cuerpo procedural
│  │  │  ├─ FlujoParticulas.tsx # Partículas instanciadas sobre recorridos
│  │  │  ├─ trayectos.ts      # Recorridos muestreados para las partículas
│  │  │  ├─ animacionCapa.ts  # Opacidad por capa, emisivo de estado, liberación
│  │  │  ├─ CapaPiel.tsx
│  │  │  ├─ CapaMusculos.tsx
│  │  │  ├─ CapaEsqueleto.tsx
│  │  │  ├─ CapaOrganos.tsx
│  │  │  ├─ CapaNervioso.tsx
│  │  │  ├─ CapaVascular.tsx
│  │  │  ├─ HaloRadiacion.tsx
│  │  │  ├─ geometrias.ts     # Generadores procedurales
│  │  │  ├─ materiales.ts     # Holográfico, Fresnel, estado
│  │  │  └─ anclajes.ts       # Puntos del cuerpo (muñeca, pecho, brazo...)
│  │  ├─ dispositivo/
│  │  │  └─ DispositivoGenerico.tsx
│  │  ├─ interaccion/
│  │  │  ├─ useSeleccionZona.ts
│  │  │  ├─ zonaDeMalla.ts    # name de malla → zona (patrones con `*`)
│  │  │  ├─ CamaraVuelo.tsx
│  │  │  └─ EtiquetasZona.tsx
│  │  └─ calidad.ts           # Niveles de calidad / movimiento reducido
│  ├─ pestanas/
│  │  ├─ Cuerpo3D/
│  │  │  ├─ PestanaCuerpo3D.tsx # Resumen · escena · procedimiento (sección 9)
│  │  │  ├─ PanelAptitud.tsx  # Aptitud del día (6.3)
│  │  │  ├─ TablaZonas.tsx    # Estado, valor y tu normal por zona; hover resalta en 3D
│  │  │  ├─ TarjetaAccion.tsx # Tarjeta de acción como procedimiento con pasos marcables
│  │  │  └─ ControlCapas.tsx  # Menú de capas (visible / semitransparente / oculta) y vista frontal
│  │  ├─ PestanaProxima.tsx   # Estado vacío de las pestañas aún no construidas
│  │  ├─ Evolucion/
│  │  └─ Medir/
│  ├─ chat/
│  │  ├─ PanelChat.tsx
│  │  ├─ contexto.ts          # Construye el contexto JSON para el modelo
│  │  ├─ herramientas.ts      # Ejecuta llamadas a funciones en la UI
│  │  └─ instrucciones.ts     # Instrucciones de sistema (también usadas en /api)
│  ├─ layout/
│  │  ├─ BarraSuperior.tsx
│  │  ├─ PanelPerfil.tsx
│  │  ├─ Navegacion.tsx
│  │  └─ PaginaCreditos.tsx   # /creditos (atribución CC BY-SA de los modelos 3D)
│  ├─ estado/
│  │  ├─ store.ts             # Zustand (preferencias del perfil guardadas en localStorage)
│  │  ├─ seleccion.ts         # Tripulante + entorno + día → motor (puro, con tests)
│  │  └─ useFuenteEstado.ts   # Lee el CSV y alimenta motor y cuerpo; mock si no hay CSV
│  ├─ ui/                     # Componentes base (IconoEstado, Interruptor, textos...)
│  ├─ App.tsx
│  └─ main.tsx
├─ .env.example
├─ vercel.json
├─ index.html
├─ package.json
├─ tailwind.config.js
└─ tsconfig.json
```

**Contrato entre equipos:** el CSV (sección 4.1) y los JSON de `src/config/` son la frontera. El equipo 3D, interfaz, datos/modelo e investigación trabajan en paralelo mientras respeten esos formatos.

---

## 4. Datos y configuración

### 4.1 CSV de entrada (formato largo, único)

`public/data/sinteticos.csv`

```csv
tripulante_id,fecha_hora,indicador,valor,unidad,fuente,contexto
A01,2026-11-14T07:00:00Z,pulso_reposo,68,lpm,dispositivo,reposo
A01,2026-11-14T07:05:00Z,presion_sistolica,118,mmHg,dispositivo,reposo
A01,2026-11-14T07:05:00Z,presion_diastolica,76,mmHg,dispositivo,reposo
A01,2026-11-14T12:30:00Z,glucosa,104,mg/dL,dispositivo,post_comida
A01,2026-11-14T22:00:00Z,animo,4,escala_1_5,manual,noche
```

- `contexto` ∈ `reposo | ejercicio | sueno | eva | post_comida | noche | manual`.
- Fechas en ISO 8601 UTC.
- El día del evento se reemplaza este archivo (o se agrega otro) con los datos oficiales usando un script de conversión.

### 4.2 Indicadores v1 (`indicadores.json`)

| id | Nombre | Unidad | Zona 3D | Regla |
|---|---|---|---|---|
| `pulso_reposo` | Pulso en reposo | lpm | `corazon` | línea base |
| `hrv` | Variabilidad cardíaca | ms | `corazon` | línea base (bajar es peor) |
| `presion_sistolica` | Presión sistólica | mmHg | `vascular` | línea base |
| `presion_diastolica` | Presión diastólica | mmHg | `vascular` | línea base |
| `spo2` | Saturación de oxígeno | % | `pulmones` | línea base + mínimo fijo |
| `temperatura` | Temperatura corporal | °C | `piel_inmune` | línea base |
| `glucosa` | Glucosa en sangre | mg/dL | `metabolismo` | línea base |
| `sueno_horas` | Horas de sueño | h | `cerebro` | tendencia (< 6 h 3 noches) |
| `animo` | Estado de ánimo | 1–5 | `cerebro` | tendencia (≤ 2 tres días) |
| `tiempo_reaccion` | Tiempo de reacción | ms | `nervios` | línea base (subir es peor) |
| `masa_corporal` | Masa corporal | kg | `metabolismo` | % de cambio desde el inicio |
| `ejercicio_min` | Ejercicio de resistencia | min | `musculos`, `huesos` | meta diaria |
| `co2_cabina` | CO₂ de cabina (1 h) | mmHg | `pulmones` | límite fijo ≤ 3 (NASA-STD-3001) |
| `dosis_radiacion` | Dosis acumulada | mSv | `todo_cuerpo` | presupuesto < 600 (carrera) |
| `tasa_dosis_dia` | Dosis del día | mSv | `todo_cuerpo` | límite fijo |
| `cefalea` | Dolor de cabeza | 0–3 | `cerebro` | límite fijo |
| `mareo` | Mareo | 0–3 | `vascular`, `nervios` | límite fijo |
| `lesion_piel` | Lesión en la piel | 0–3 | `piel_inmune` | límite fijo |

Los parámetros exactos de cada indicador están en la sección 4.4.4.

Ejemplo de entrada:

```json
{
  "id": "pulso_reposo",
  "nombre": "Pulso en reposo",
  "unidad": "lpm",
  "zonas": ["corazon"],
  "validacion": { "min": 30, "max": 220 },
  "direccionRiesgo": "ambas",
  "agregacionDiaria": "promedio",
  "reglas": [{ "tipo": "linea_base", "ventanaDias": 14, "minDias": 5, "zAmbar": 2, "zRojo": 3 }],
  "contextosIgnorados": ["ejercicio"],
  "textos": {
    "queEs": "Cuántas veces late tu corazón por minuto en reposo.",
    "queSignifica": "Un pulso en reposo por encima de tu normal puede indicar fatiga, deshidratación o estrés.",
    "porQueEspacio": "La microgravedad desplaza líquidos hacia el tórax y cambia el trabajo del corazón."
  },
  "acciones": ["Descansa 10 minutos y repite la medición.", "Bebe agua.", "Revisa tus horas de sueño."],
  "avisoMedico": "Si sigue fuera de tu normal por 48 h o tienes mareo o dolor en el pecho.",
  "fuente": "https://www.nasa.gov/hrp/hazards",
  "fuenteNombre": "NASA HRP",
  "dispositivo": "generico_muneca",
  "entrada": "dispositivo",
  "sintetico": { "media": 64, "desv": 4, "frecuencia": "tres_veces_dia", "decimales": 0, "cicloDiario": 3 }
}
```

> Los umbrales de signos vitales son **ilustrativos**. Solo `co2_cabina` y `dosis_radiacion` vienen de NASA-STD-3001.

### 4.3 Zonas del cuerpo (`zonas.json`)

Cada zona agrupa mallas 3D y define su texto de función.

```ts
interface Zona {
  id: string;
  nombre: string;                                  // nombre visible, p. ej. "Corazón"
  capa: 'nervioso' | 'organos' | 'vascular' | 'esqueleto' | 'musculos' | 'piel' | 'halo';
  mallas: string[];                                // nombres de nodo; `*` = comodín de prefijo
  funcion: string;
}
```

| id zona | nombre | Capa | Mallas (nombres de nodo) | Función (una frase) |
|---|---|---|---|---|
| `cerebro` | Cerebro | nervioso | `nervio_cerebro` | Controla sueño, ánimo y atención. |
| `nervios` | Nervios | nervioso | `nervio_medula`, `nervio_periferico_*` | Lleva las señales entre el cerebro y el cuerpo. |
| `corazon` | Corazón | organos | `organo_corazon` | Bombea la sangre a todo el cuerpo. |
| `pulmones` | Pulmones | organos | `organo_pulmon_izq`, `organo_pulmon_der`, `organo_via_aerea` | Llevan oxígeno a la sangre. |
| `metabolismo` | Metabolismo | organos | `organo_higado`, `organo_pancreas`, `organo_estomago`, `organo_intestino` | Convierte el alimento en energía y regula la glucosa. |
| `rinones` | Riñones | organos | `organo_rinon_izq`, `organo_rinon_der` | Filtran la sangre (riesgo de cálculos en el espacio). |
| `vascular` | Sistema vascular | vascular | `vaso_aorta`, `vaso_arteria_*`, `vaso_vena_*` | Transporta la sangre; cambia con la gravedad. |
| `huesos` | Huesos | esqueleto | `hueso_*` | Sostienen el cuerpo; pierden densidad en microgravedad. |
| `musculos` | Músculos | musculos | `musculo_*` | Mueven el cuerpo; se atrofian sin carga. |
| `piel_inmune` | Piel e inmunidad | piel | `piel_cuerpo` | Primera barrera; refleja fiebre y cambios inmunes. |
| `todo_cuerpo` | Todo el cuerpo | halo | `halo_radiacion` | Exposición a radiación espacial. |

**Nombres de malla del cuerpo procedural v1** (todos casan con los patrones de la tabla; un GLB futuro debe usar los mismos):

- piel: `piel_cuerpo`
- esqueleto: `hueso_craneo`, `hueso_columna` (24 vértebras instanciadas), `hueso_costillas_izq/der`, `hueso_esternon`, `hueso_clavicula_izq/der`, `hueso_pelvis`, `hueso_humero_*`, `hueso_radio_*`, `hueso_femur_*`, `hueso_tibia_*`
- órganos: `organo_corazon`, `organo_pulmon_izq/der`, `organo_higado`, `organo_estomago`, `organo_pancreas`, `organo_rinon_izq/der`
- nervioso: `nervio_cerebro` (se construye como órgano según 5.2, pero vive en la capa nerviosa según esta tabla), `nervio_medula`, `nervio_periferico_brazo_izq/der`, `nervio_periferico_pierna_izq/der`
- vascular: `vaso_aorta`, `vaso_vena_cava`, `vaso_arteria_carotida_*`, `vaso_arteria_brazo_*`, `vaso_arteria_pierna_*`, `vaso_vena_brazo_*`, `vaso_vena_pierna_*`; partículas de flujo `vaso_arteria_flujo` (sin raycast)
- músculos: `musculo_cuadriceps_*`, `musculo_gemelo_*`, `musculo_gluteo_*`, `musculo_deltoides_*`, `musculo_biceps_*`, `musculo_dorsal_*`, `musculo_abdominal`
- halo: `halo_radiacion`

**Nombres de malla del cuerpo anatómico** (`public/modelos/cuerpo.glb`, sección 5.2.1; los fija `scripts/mallas-anatomia.json`). Conserva los de v1 salvo `vaso_arteria_carotida_*` (queda dentro de `vaso_arteria_cabeza`) y añade:

- esqueleto: `hueso_escapula_*`, `hueso_cubito_*`, `hueso_mano_*`, `hueso_rotula_*`, `hueso_perone_*`, `hueso_pie_*`
- órganos: `organo_via_aerea` (tráquea y bronquios), `organo_intestino`
- nervioso: `nervio_periferico_craneal`, `nervio_periferico_tronco`
- vascular: `vaso_arteria_cabeza`, `vaso_arteria_tronco`, `vaso_vena_cabeza`, `vaso_vena_tronco`
- músculos: `musculo_pectoral_*`, `musculo_brazo_*`, `musculo_pierna_*`, `musculo_tronco`, `musculo_cabeza` (el resto de músculos de cada región)

`_izq` es el lado izquierdo del cuerpo (+X; el cuerpo mira a +Z).

### 4.4 Contratos completos de configuración

> Todo campo marcado como *ilustrativo* es un valor de demo, no un umbral médico oficial. Los esquemas Zod de `src/config/esquemas.ts` implementan **exactamente** estos tipos; si falta algo, se agrega aquí primero.

#### 4.4.1 Tipos comunes

```ts
type Estado = 'normal' | 'atencion' | 'critico' | 'sin_dato';
type DireccionRiesgo = 'sube' | 'baja' | 'ambas';   // qué desvío es malo
type Comparador = '<' | '<=' | '>' | '>=';
type Agregacion = 'ultimo' | 'promedio' | 'suma' | 'max' | 'min';
type Contexto = 'reposo' | 'ejercicio' | 'sueno' | 'eva' | 'post_comida' | 'noche' | 'manual';
type Franja = 'manana' | 'dia' | 'noche' | 'semanal';
```

- `direccionRiesgo`: `sube` = solo es malo subir (z ≥ umbral); `baja` = solo es malo bajar (z ≤ −umbral); `ambas` = |z| ≥ umbral.
- `agregacionDiaria` (en cada indicador): cómo se reduce a un valor por día antes de aplicar reglas por día (línea base, tendencia, meta, porcentaje).

#### 4.4.2 Indicador (`indicadores.json` → `Indicador[]`)

```ts
interface Indicador {
  id: string; nombre: string; unidad: string;
  zonas: string[];                       // ids de zonas.json
  validacion: { min: number; max: number };
  direccionRiesgo: DireccionRiesgo;
  agregacionDiaria: Agregacion;
  contextosIgnorados: Contexto[];
  reglas: Regla[];                       // se evalúan todas; manda el peor estado
  textos: { queEs: string; queSignifica: string; porQueEspacio: string };
  acciones: string[];                    // 1 a 3
  avisoMedico: string;
  fuente: string;                        // URL
  fuenteNombre: string;                  // nombre corto para mostrar ("NASA HRP")
  dispositivo: string;                   // id de dispositivos.json o "manual"
  entrada: 'dispositivo' | 'manual' | 'ambos';
  sintetico: {                           // parámetros del generador
    media: number; desv: number;
    frecuencia: 'diaria' | 'tres_veces_dia' | 'cada_hora';
    decimales: number;
    cicloDiario?: number;                // amplitud de la variación día/noche
    acumulado?: boolean;                 // true para dosis_radiacion
  };
}
```

#### 4.4.3 Tipos de regla (unión discriminada por `tipo`)

| `tipo` | Campos | Cómo se evalúa |
|---|---|---|
| `linea_base` | `ventanaDias` (14), `minDias` (5), `zAmbar` (2), `zRojo` (3) | Media y desviación de los `ventanaDias` días previos (valores diarios agregados). z del valor actual; aplica `direccionRiesgo`. Menos de `minDias` → `sin_dato`. Si σ = 0, usar σ = 1 % de la media. |
| `limite_fijo` | `comparador`, `ambar`, `rojo`, `ventanaHoras?` | Compara el valor (o el promedio de las últimas `ventanaHoras`) con `ambar` y `rojo`. |
| `tendencia` | `comparador`, `umbral`, `diasConsecutivos`, `estado` | Si los últimos `diasConsecutivos` valores diarios cumplen `valor comparador umbral` → `estado`. |
| `porcentaje_cambio` | `referencia: 'inicio' \| 'linea_base'`, `ambarPct`, `rojoPct` | % de cambio frente al primer día disponible o a la media de línea base; aplica `direccionRiesgo`. |
| `meta_diaria` | `meta`, `diasAmbar`, `diasRojo` | Suma diaria vs `meta`. Días consecutivos sin cumplirla ≥ `diasAmbar` → atención; ≥ `diasRojo` → crítico. El día en curso no cuenta hasta terminar. |
| `presupuesto` | `limite`, `ambarPct` (80), `rojoPct` (100) | Valor acumulado / `limite` × 100. |

```ts
type Regla =
  | { tipo: 'linea_base'; ventanaDias: number; minDias: number; zAmbar: number; zRojo: number }
  | { tipo: 'limite_fijo'; comparador: Comparador; ambar: number; rojo: number; ventanaHoras?: number }
  | { tipo: 'tendencia'; comparador: Comparador; umbral: number; diasConsecutivos: number; estado: 'atencion' | 'critico' }
  | { tipo: 'porcentaje_cambio'; referencia: 'inicio' | 'linea_base'; ambarPct: number; rojoPct: number }
  | { tipo: 'meta_diaria'; meta: number; diasAmbar: number; diasRojo: number }
  | { tipo: 'presupuesto'; limite: number; ambarPct: number; rojoPct: number };
```

Cada regla devuelve `{ estado, motivo }`; `motivo` es una frase lista para la tarjeta, por ejemplo: *"Pulso 86 lpm; tu normal es 66–74 (z = 2,6)"*.

#### 4.4.4 Valores v1 de cada indicador

| id | direccionRiesgo | agregacionDiaria | reglas (ilustrativas salvo nota) | sintetico (media ± desv, frecuencia) |
|---|---|---|---|---|
| `pulso_reposo` | ambas | promedio | linea_base 14/5/2/3 | 64 ± 4 lpm, tres_veces_dia |
| `hrv` | baja | promedio | linea_base 14/5/2/3 | 55 ± 8 ms, tres_veces_dia |
| `presion_sistolica` | ambas | promedio | linea_base 14/5/2/3; limite_fijo `>=` 140/160 | 116 ± 6 mmHg, diaria |
| `presion_diastolica` | ambas | promedio | linea_base 14/5/2/3; limite_fijo `>=` 90/100 | 75 ± 4 mmHg, diaria |
| `spo2` | baja | min | linea_base 14/5/2/3; limite_fijo `<` 95/92 | 98 ± 0,7 %, tres_veces_dia |
| `temperatura` | sube | max | linea_base 14/5/2/3; limite_fijo `>=` 37,8/38,5 | 36,7 ± 0,2 °C, tres_veces_dia |
| `glucosa` | ambas | promedio | linea_base 14/5/2/3; limite_fijo `>=` 180/250 | 98 ± 10 mg/dL, tres_veces_dia |
| `sueno_horas` | baja | suma | tendencia `<` 6 por 3 días → atencion; tendencia `<` 5 por 3 días → critico | 7,2 ± 0,5 h, diaria |
| `animo` | baja | promedio | tendencia `<=` 2 por 3 días → atencion; tendencia `<=` 1 por 2 días → critico | 4 ± 0,5 (entero 1–5), diaria |
| `tiempo_reaccion` | sube | promedio | linea_base 14/5/2/3 | 280 ± 20 ms, diaria |
| `masa_corporal` | baja | ultimo | porcentaje_cambio inicio 5/10 (nota: 5–10 % preocupa y > 10 % es crítico según nutrición de NASA) | 72 ± 0,3 kg, diaria |
| `ejercicio_min` | baja | suma | meta_diaria 90 min, diasAmbar 2, diasRojo 4 | 105 ± 10 min, diaria |
| `co2_cabina` | sube | promedio | limite_fijo `>` 3 / 4,5, ventanaHoras 1 (3 mmHg: NASA-STD-3001) | 2,2 ± 0,3 mmHg, cada_hora |
| `dosis_radiacion` | sube | ultimo | presupuesto 600 mSv, 80/100 (600 mSv: NASA-STD-3001) | acumulado, +0,4 ± 0,05 mSv/día, diaria |
| `tasa_dosis_dia` | sube | suma | limite_fijo `>=` 2 / 10 mSv/día | 0,4 ± 0,05 mSv, diaria |
| `cefalea` | sube | max | limite_fijo `>=` 1 / 3 (escala 0–3) | 0 ± 0, diaria (entrada manual) |
| `mareo` | sube | max | limite_fijo `>=` 1 / 3 (escala 0–3) | 0 ± 0, diaria (entrada manual) |
| `lesion_piel` | sube | max | limite_fijo `>=` 1 / 3 (escala 0–3) | 0 ± 0, diaria (entrada manual) |

Zonas de los nuevos indicadores: `tasa_dosis_dia` → `todo_cuerpo`; `cefalea` → `cerebro`; `mareo` → `vascular`, `nervios`; `lesion_piel` → `piel_inmune`. En el generador, los síntomas valen 0 salvo que un escenario los active.

Unidades en el CSV: `animo` usa `escala_1_5` y los síntomas `escala_0_3` (la tabla 4.2 las muestra como 1–5 y 0–3). `ejercicio_min` se generaba con 95 ± 15 min; se subió a 105 ± 10 para que la meta de 90 min no dé ámbar al azar en el escenario `normal`.

#### 4.4.5 Tripulantes (`tripulantes.json`, nuevo)

```ts
interface ConfigTripulantes {
  generador: { semilla: number; fechaInicio: string; dias: number };   // v1: 106, "2026-10-16", 30
  tripulantes: {
    id: string; nombre: string; rol: string;
    diaMisionInicial: number;          // día de misión del primer día del CSV
    entorno: string;                   // id de entornos.json
    desviosPersonales: Record<string, number>;   // se suman a sintetico.media
  }[];
}
```

**Semilla v1 = 106.** Con ruido gaussiano y unas 10 reglas de línea base por persona, casi cualquier semilla produce alguna falsa alarma (z ≥ 2) en algún escenario. La semilla 106 es la primera, entre 1 y 3000, con la que los seis escenarios muestran exactamente lo de la columna "Qué debe ver el jurado" (4.4.6). Si cambias la semilla o los parámetros `sintetico`, `motor.test.ts` avisará si algún escenario deja de cumplirse.

Valores v1: `A01` "Cmdte. Rosa", comandante, día 113, `base_marciana`, `{ pulso_reposo: -4, hrv: +6 }`; `A02` "Ing. Kenji", ingeniero de vuelo, día 113, `base_marciana`, `{ presion_sistolica: +6, glucosa: +8 }`; `A03` "Dra. Amara", oficial médica, día 113, `base_marciana`, `{ sueno_horas: -0,3, tiempo_reaccion: -15 }`.

#### 4.4.6 Escenarios (`escenarios.json`)

```ts
interface Escenario {
  id: string; nombre: string; descripcion: string;
  tripulanteId: string;
  alteraciones: {
    indicador: string;
    diaInicio: number; diaFin: number;            // 1..dias, inclusive
    modo: 'sumar' | 'multiplicar' | 'fijar' | 'rampa';
    valor: number;                                 // en rampa: valor del primer día
    valorFinal?: number;                           // solo rampa: valor del último día (interpolación lineal)
    contexto?: Contexto;                           // opcional: fuerza el contexto de esas lecturas
  }[];
  diaDemo: number;                                 // día que abre el modo demo al elegir el escenario
}
```

- `sumar` y `multiplicar` actúan sobre el valor generado; `fijar` y `rampa` lo reemplazan.
- Varios escenarios pueden aplicarse a la vez; se aplican en el orden del archivo.
- Después de cada alteración el valor se vuelve a redondear a `decimales` y a recortar a `validacion`.

| id | Tripulante | Alteraciones (días) | `diaDemo` | Qué debe ver el jurado |
|---|---|---|---|---|
| `normal` | A03 | ninguna | 20 | Todo verde |
| `deterioro_sueno` | A01 | `sueno_horas` rampa 6,4 → 5,1 (21–25); `animo` sumar −1 (24–25) | 25 | Cerebro en ámbar sin cruzar límites fijos |
| `multisenal_fatiga` | A01 | `pulso_reposo` sumar +6 (27–28); `hrv` sumar −12 (27–28); `sueno_horas` fijar 5,2 (27–28) | 27 | Alerta de fatiga: corazón y cerebro a la vez |
| `co2_alto_cefalea` | A02 | `co2_cabina` fijar 3,8 (28); `cefalea` fijar 2 (28) | 28 | Pulmones en ámbar; la tarjeta atribuye la cefalea al ambiente |
| `evento_solar` | A03 | `tasa_dosis_dia` fijar 12 (29) (el acumulado sube en consecuencia) | 29 | Halo rojo; presupuesto actualizado |
| `preparacion_aterrizaje` | A02 | `presion_sistolica` rampa 116 → 104 (25–30); `mareo` fijar 1 (29–30); `ejercicio_min` multiplicar 0,5 (27–30) | 29 | Vascular en ámbar; aptitud "regreso a la gravedad" en ámbar |

**Calibración (v1):** respecto a la primera versión de esta tabla, `deterioro_sueno` pasó a los días 21–25 para no solaparse con la fatiga y porque con 4 días la rampa redondeada (6,4 / 6,0 / 5,5 / 5,1) solo deja 2 noches < 6 h y la tendencia de 3 noches nunca se activaba; `multisenal_fatiga` usa +6 / −12 (antes +12 / −18, que daban z ≈ 5 y dejaban el corazón en rojo); y el ejercicio reducido de `preparacion_aterrizaje` empieza el día 27 (antes 25, que con `diasRojo` 4 ponía músculos y huesos en rojo). Los tests del motor comprueban la columna "Qué debe ver el jurado" en cada `diaDemo`.

#### 4.4.7 Reglas compuestas (`reglas-compuestas.json`, nuevo)

Aquí viven la **multiseñal** y la **aptitud del día**, fuera del código.

```ts
interface ReglasCompuestas {
  multisenal: {
    id: string; nombre: string;
    ventanaHoras: number;                         // todas las condiciones dentro de esta ventana
    minimoCondiciones: number;                    // cuántas deben cumplirse
    condiciones: {
      indicador: string;
      medida: 'z' | 'valor' | 'estado';
      comparador: Comparador;                     // para 'estado' se compara el rango: normal=0, atencion=1, critico=2
      umbral: number;
    }[];
    estado: 'atencion' | 'critico';
    zonas: string[];                              // zonas que marca
    tarjeta: { queSignifica: string; acciones: string[]; avisoMedico: string; porQueEspacio: string; fuente: string; fuenteNombre: string };
  }[];
  aptitud: {
    id: string; nombre: string;
    zonas: string[];
    criterio: 'peor_estado';                      // v1: estado = peor estado de sus zonas; sin_dato no cuenta salvo que todas lo sean
  }[];
}
```

Valores v1:

```json
{
  "multisenal": [
    {
      "id": "fatiga",
      "nombre": "Posible fatiga acumulada",
      "ventanaHoras": 48,
      "minimoCondiciones": 3,
      "condiciones": [
        { "indicador": "pulso_reposo", "medida": "z", "comparador": ">=", "umbral": 2 },
        { "indicador": "hrv", "medida": "z", "comparador": "<=", "umbral": -2 },
        { "indicador": "sueno_horas", "medida": "valor", "comparador": "<", "umbral": 6 }
      ],
      "estado": "atencion",
      "zonas": ["corazon", "cerebro"],
      "tarjeta": {
        "queSignifica": "Varias señales cambiaron a la vez y suelen acompañar al cansancio acumulado.",
        "acciones": ["Prioriza 8 horas de sueño esta noche.", "Reduce la carga de trabajo intensa hoy.", "Repite pulso y variabilidad mañana al despertar."],
        "avisoMedico": "Si no mejora en 48 h o tienes mareo, dolor en el pecho o confusión.",
        "porQueEspacio": "El aislamiento, los horarios irregulares y la luz artificial alteran el sueño en misión.",
        "fuente": "https://www.nasa.gov/hrp/hazards",
        "fuenteNombre": "NASA HRP"
      }
    },
    {
      "id": "co2_sintomas",
      "nombre": "Síntomas probablemente ambientales",
      "ventanaHoras": 6,
      "minimoCondiciones": 2,
      "condiciones": [
        { "indicador": "co2_cabina", "medida": "valor", "comparador": ">", "umbral": 3 },
        { "indicador": "cefalea", "medida": "valor", "comparador": ">=", "umbral": 1 }
      ],
      "estado": "atencion",
      "zonas": ["pulmones", "cerebro"],
      "tarjeta": {
        "queSignifica": "El dolor de cabeza coincide con CO₂ alto en la cabina; es probable que la causa sea ambiental.",
        "acciones": ["Avisa a la tripulación para revisar la remoción de CO₂.", "Ve a un módulo con mejor ventilación.", "Bebe agua y descansa 20 minutos."],
        "avisoMedico": "Si el dolor sigue cuando el CO₂ vuelva a la normalidad, o aparece confusión o visión borrosa.",
        "porQueEspacio": "En una nave cerrada el CO₂ se acumula y puede causar dolor de cabeza aun en niveles moderados.",
        "fuente": "https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/",
        "fuenteNombre": "NASA OCHMO"
      }
    }
  ],
  "aptitud": [
    { "id": "eva", "nombre": "Caminata espacial", "zonas": ["corazon", "pulmones", "nervios", "cerebro"], "criterio": "peor_estado" },
    { "id": "precision", "nombre": "Tarea de precisión", "zonas": ["cerebro", "nervios"], "criterio": "peor_estado" },
    { "id": "gravedad", "nombre": "Regreso a la gravedad", "zonas": ["vascular", "corazon", "huesos", "musculos"], "criterio": "peor_estado" }
  ]
}
```

Una alerta multiseñal activa **sobrescribe** la tarjeta de sus zonas (se muestra su `tarjeta` y debajo los indicadores implicados) y sube el estado de esas zonas como mínimo a su `estado`.

#### 4.4.8 Dispositivos (`dispositivos.json`)

```ts
type Animacion = 'presentar' | 'volar_a_anclaje' | 'ajustar' | 'medir' | 'mostrar_resultado' | 'error';
interface Dispositivo {
  id: string; nombre: string;
  modelo: string;                                // "procedural:generico" o "/modelos/x.glb"
  anclaje: 'muneca_izq' | 'muneca_der' | 'pecho' | 'brazo_izq' | 'dedo_indice' | 'frente';
  indicadores: string[];
  pasos: { texto: string; animacion: Animacion; duracionMs: number; resaltarZona?: string }[];
  erroresComunes: { texto: string; anclajeIncorrecto?: string; desplazamiento?: [number, number, number] }[];
}
```

- `presentar`: el dispositivo gira frente a la cámara con sus LEDs encendidos.
- `volar_a_anclaje`: viaja hasta el anclaje con una curva suave.
- `ajustar`: contorno verde pulsante en la posición correcta.
- `medir`: LEDs parpadean y la pantalla cuenta hacia atrás.
- `mostrar_resultado`: la zona `resaltarZona` del cuerpo se ilumina con su nuevo estado.
- `error`: el dispositivo aparece en `anclajeIncorrecto` (o desplazado por `desplazamiento`, en metros) con contorno rojo.

V1 trae **cuatro** entradas que usan el mismo modelo genérico con distinto anclaje: `generico_muneca` (pulso, HRV, SpO₂, sueño, ejercicio), `generico_brazo` (presión, glucosa), `generico_frente` (temperatura) y `generico_pecho` (dosis). En `indicadores.json`, `dispositivo` apunta a uno de estos ids. Cada uno tiene 4 a 6 pasos y al menos un error común.

#### 4.4.9 Rutina (`rutina.json`)

```ts
interface Tarea {
  id: string; titulo: string;
  franja: Franja;
  hora: string;                                  // "07:00", hora de la nave
  diasSemana?: number[];                         // solo para 'semanal' (1 = lunes)
  indicadores: string[];                         // la tarea se cumple cuando todos tienen lectura en la franja
  dispositivo: string;                           // id de dispositivos.json o "manual"
  duracionMin: number;
  puntos: number;                                // gamificación
  obligatoria: boolean;
}
```

Ventanas de franja: `manana` 06:00–10:00, `dia` 10:00–18:00, `noche` 18:00–23:00, `semanal` todo el día indicado. Estado calculado (no se guarda): `hecha` si hay lectura de todos sus indicadores dentro de la ventana; `atrasada` si la ventana terminó sin cumplirse; `pendiente` en otro caso.

Tareas v1: pulso y HRV al despertar (07:00), presión (07:15), sueño de anoche (07:30), glucosa tras el almuerzo (13:30), ejercicio (16:00), temperatura (19:00), ánimo y síntomas (21:30), masa corporal semanal (lunes 07:45), prueba de reacción (miércoles y sábado, 10:30).

#### 4.4.10 Entornos (`entornos.json`)

```ts
interface Entorno {
  id: 'nave_transito' | 'estacion' | 'rover' | 'base_lunar' | 'base_marciana';
  nombre: string;
  gravedad: number;                              // en g: 0, 0, 0, 0.166, 0.38 (rover sobre la superficie: la del cuerpo donde opera)
  retrasoComMin: [number, number];               // rango informativo, solo texto
  riesgosDestacados: string[];
  ajustes?: Partial<Record<string, Partial<Regla>>>;   // sobrescribe parámetros de reglas por indicador (opcional)
}
```

En v1 `ajustes` puede quedar vacío; existe para el día del evento.

#### 4.4.11 Escena (`escena.json`, nuevo)

Textos y colores que usan la escena 3D y sus controles, para no codificarlos en componentes.

```ts
interface ConfigEscena {
  estados: { id: Estado; etiqueta: string; color: string }[];          // paleta de 5.1 (#RRGGBB); los 4 estados
  capas: { id: Zona['capa']; nombre: string; orden: number }[];        // todas las capas usadas en zonas.json
  modosCapa: { id: 'visible' | 'translucida' | 'oculta'; etiqueta: string }[];
  textos: {
    datosSinteticos: string; noDiagnostico: string; capas: string; vistaFrontal: string;
    cerrar: string; cargandoEscena: string; queCambio: string; queSignifica: string;
    acciones: string; avisoMedico: string; porQueEspacio: string; fuente: string;
    // /creditos
    creditos: string; tituloCreditos: string; introCreditos: string; licenciaDerivada: string;
    verLicencia: string; verFuente: string; creditosNoDisponibles: string; volverAlCuerpo: string;
    // Barra, pestañas, perfil y pestaña 1 (fase 4). `{clave}` se rellena en la UI.
    secciones: string; pestanaCuerpo: string; pestanaEvolucion: string; pestanaMedir: string;
    diaMision: string /* "Día {dia}" */; alertas: string; sinAlertas: string;
    abrirPerfil: string /* "Abrir el perfil de {nombre}" */; idioma: string;
    aptitudDelDia: string; zonasDelCuerpo: string; columnaZona: string; columnaEstado: string;
    columnaValor: string; columnaNormal: string; sinValor: string; eligeZona: string;
    verEvolucion: string; medirAhora: string; perfil: string; tripulante: string; entorno: string;
    lineaBase: string; sinLineaBase: string; accesibilidad: string; textoGrande: string;
    altoContraste: string; movimientoReducido: string; modoDemo: string; escenario: string;
    diaDatos: string; diaAnterior: string; diaSiguiente: string;
    proximamenteEvolucion: string; proximamenteMedir: string;
  };
  etiquetasAptitud: Record<Estado, string>;   // "Apto", "Con precaución", "No apto hoy", "Sin dato"
  escenarioInicial: string;                     // id de escenarios.json con el que abre la app
}
```

#### 4.4.12 Frases del motor (`frases.json`, nuevo)

El motor redacta `motivo` y `queCambio` con plantillas `{clave}` de este archivo, no con texto en código (así se traducen). `separadorDecimal` es `,` o `.`.

```ts
interface Frases {
  separadorDecimal: ',' | '.';
  indicadorNoConfigurado: string; fueraDeRango: string; faltanDias: string; lineaBase: string;
  promedioHoras: string; dentroDelLimite: string; fueraDelLimite: string; tendencia: string;
  sinTendencia: string; sinReferencia: string; cambio: string; referenciaInicio: string;
  referenciaNormal: string; metaCumplida: string; metaUnDia: string; metaDias: string;
  presupuesto: string; multisenal: string; sinMediciones: string; dentroDeTuNormal: string;
}
```

#### 4.4.13 Idiomas (`idiomas/en.json`, nuevo)

El español de `src/config/` es la base. Cada idioma adicional es una capa con los **mismos ids** que solo trae textos: `escena` (etiquetas de estados, capas, modos, `textos`, `etiquetasAptitud`), `frases`, y por id `zonas` (nombre, funcion), `indicadores` (nombre, `unidad?` solo para mostrar, textos, acciones, avisoMedico), `reglasCompuestas` (multisenal: nombre y tarjeta; aptitud: nombre), `entornos` (nombre, riesgosDestacados), `escenarios` (nombre, descripcion), `tripulantes` (nombre, rol), `dispositivos` (nombre, pasos[], erroresComunes[]) y `rutina` (titulo). `src/config/idioma.ts` la valida con Zod, `faltantesTraduccion` exige que cubra todos los ids y listas (test), y `configEnIdioma(base, idioma)` la aplica de forma pura: nunca cambia ids, umbrales, colores ni mallas. El idioma elegido se guarda en el perfil.

### 4.5 Generador sintético (`scripts/generar-datos.ts`)

- Lee `tripulantes.json`, `indicadores.json` (bloque `sintetico`) y `escenarios.json`.
- Para cada tripulante, día e indicador: `media + desvioPersonal + ruido gaussiano(desv) + ciclo diario`, redondeado a `decimales` y recortado a `validacion`.
- Frecuencias: `diaria` → 1 lectura (hora de la tarea en `rutina.json`), `tres_veces_dia` → 07:00, 13:00, 21:00, `cada_hora` → 24 lecturas.
  - Las lecturas `diaria` se generan **todos los días**, aunque su tarea sea semanal (`masa_corporal` 07:45, `tiempo_reaccion` 10:30); así la línea base tiene suficientes días.
  - Síntomas (`cefalea`, `mareo`, `lesion_piel`): a las 21:30 (tarea "ánimo y síntomas").
  - Indicadores sin tarea (`tasa_dosis_dia`, `dosis_radiacion`): a las 23:00.
- Ciclo diario: `cicloDiario × cos(2π × (hora − 15) / 24)` (pico a las 15:00).
- `dosis_radiacion` = acumulado de `tasa_dosis_dia` desde el día 1 del CSV (empieza en 0); se recalcula después de aplicar los escenarios.
- `ejercicio_min` se genera con `contexto: ejercicio`; además se genera una lectura de `pulso_reposo` a la hora del ejercicio (16:00) con `contexto: ejercicio` y valor = media personal + 50 lpm (ilustrativo) + ruido, para probar `contextosIgnorados`.
- `contexto` de cada lectura: `sueno_horas` → `sueno`; `ejercicio_min` y el pulso de ejercicio → `ejercicio`; indicadores con `entrada: manual` → `manual`; `glucosa` de las 13:00 → `post_comida`; lecturas de las 21:00 o más tarde → `noche`; resto → `reposo`.
- `fuente`: `manual` si `entrada: manual`; si no, `dispositivo`.
- Aplica después todas las alteraciones de `escenarios.json`.
- Semilla fija (PRNG mulberry32 + Box-Muller) → el CSV es idéntico en cada ejecución. Comando: `npm run datos`.

---

## 5. Diseño 3D (estilo web 3D inmersivo)

### 5.1 Dirección visual

- **Concepto:** "holograma médico a bordo". Fondo espacial oscuro, cuerpo semitransparente con bordes luminosos (Fresnel), estructuras internas visibles por capas.
- **Paleta de estado** (siempre con ícono y texto, nunca solo color):
  - Normal `#34D399` · Atención `#FBBF24` · Crítico `#F87171` · Sin dato `#64748B`.
  - Acento de interfaz: cian `#22D3EE`. Fondo: `#050816` → `#0B1026`.
- **Luz y atmósfera:** `Environment` suave, luz rim fría, `Stars` lentas al fondo, niebla ligera, Bloom solo sobre emisivos de estado.
- **Movimiento:** transiciones de 400–700 ms con easing suave; la cámara vuela a la zona seleccionada (no salta). Respiración leve del cuerpo en reposo.
- **Modo movimiento reducido:** desactiva partículas, pulsos y vuelo de cámara (respeta `prefers-reduced-motion` y el ajuste del perfil).

### 5.2 Cuerpo humano procedural (v1, debe elaborarse)

El cuerpo se **construye en código** con geometrías paramétricas, sin depender de un modelo externo. Unidad: metros; altura 1,78 m; eje Y hacia arriba; origen entre los pies.

**Contrato clave:** cada malla tiene un `name` estable (sección 4.3). Así, en una versión futura, se puede reemplazar por un GLB anatómico detallado (por ejemplo derivado de Z-Anatomy, CC BY-SA 4.0) con los **mismos nombres de nodo** sin tocar el motor ni la UI.

| Capa | Construcción | Material |
|---|---|---|
| **Piel** | Silueta completa: `LatheGeometry` para torso y cabeza (perfil por puntos), `CapsuleGeometry` para brazos, antebrazos, muslos y piernas; manos y pies como cápsulas aplanadas. Unir con `mergeGeometries`. | Holográfico: Fresnel cian, `transparent`, opacidad 0,15–0,35, `depthWrite=false`. Línea de escaneo vertical animada (shader). |
| **Músculos** | Elipsoides (esferas escaladas) para cuádriceps, gemelos, glúteos, deltoides, bíceps, dorsales y abdominales; nombres `musculo_*`. | Rojo apagado translúcido; emisivo de estado. |
| **Esqueleto** | Cráneo (esfera deformada), columna con 24 vértebras **instanciadas**, costillas con arcos de `TorusGeometry` parciales, pelvis (toro achatado + placas), fémur, tibia, húmero, radio como cilindros con extremos esféricos. Nombres `hueso_*`. | Marfil translúcido; opacidad controlada por **densidad ósea estimada** (más translúcido = más pérdida). |
| **Órganos** | Corazón: dos lóbulos + cono fusionados, escala pulsante al ritmo del pulso. Pulmones: elipsoides deformados con ruido. Cerebro: esfera con desplazamiento por ruido (pliegues). Hígado, estómago, páncreas, riñones: formas paramétricas simples. | `MeshPhysicalMaterial` con `transmission` baja, emisivo de estado. |
| **Sistema nervioso** | Cerebro + médula (`TubeGeometry` sobre `CatmullRomCurve3` por la columna) + nervios periféricos a brazos y piernas (tubos finos ramificados). | Línea luminosa; **pulsos de señal** que viajan por el tubo (offset de UV en shader); su velocidad baja si `tiempo_reaccion` empeora. |
| **Vascular** | Aorta, carótidas, arterias de brazos y piernas (rojo) y venas principales (azul) como tubos sobre curvas. | Tubo semitransparente + **partículas de flujo**; en microgravedad las partículas tienden hacia la cabeza. |
| **Halo de radiación** | Esfera grande alrededor del cuerpo. | Shader de ruido animado; intensidad = dosis acumulada / límite. |

**Anclajes** (`anclajes.ts`): posiciones 3D nombradas para colocar el dispositivo y etiquetas: `muneca_izq`, `muneca_der`, `pecho`, `brazo_izq`, `dedo_indice`, `frente`.

#### 5.2.1 Cuerpo anatómico (fase 3b, por defecto)

Desde la fase 3b la escena carga `public/modelos/cuerpo.glb`, un cuerpo anatómico real con los mismos contratos de nombres (4.3). El cuerpo procedural queda como **respaldo**: se muestra si el GLB no carga (`LimiteError`) o con `?cuerpo=procedural`.

- **Fuentes y licencias** (solo material que permite uso y adaptación con atribución): Z-Anatomy, CC BY-SA 4.0 (esqueleto, vísceras, sistema nervioso, vasos y músculos; convertidos a GLB por el proyecto 3D Anatomy); BodyParts3D, CC BY-SA 2.1 JP (cerebro y riñones, en lugar de mallas con licencia no comercial o sin licencia); cuerpo base de MakeHuman adaptado por Innerscene, CC0 (piel). Se excluyen oído interno, riñones, pleura y tejido conectivo de Z-Anatomy. El GLB resultante se comparte con CC BY-SA 4.0 y se acredita en `/creditos`.
- **Pipeline** (`npm run modelos`, fuentes pesadas en `assets-fuente/`, fuera de git): agrupa cada estructura fuente en una malla según las reglas ordenadas de `scripts/mallas-anatomia.json` (primera regla que casa; `{lado}` se expande a `izq`/`der`); alinea BodyParts3D con Z-Anatomy (permutación de ejes + escala, error ≈ 7 mm); coloca la piel en posición anatómica girando sus huesos según los ejes principales de húmero, cúbito/radio, fémur y tibia; escala todo a 1,78 m; simplifica cada malla con la fracción `conservar` (≈ 900 k triángulos en total); comprime con Draco (≈ 2 MB) y copia el decodificador a `public/draco/`.
- **Contrato `mallas-anatomia.json`:** `fuentes` (archivo o carpeta y crédito), `creditos` (`texto`, `licencia`, `enlace`, `urlLicencia`), `excluir` (patrones por fuente) y `mallas` (`nombre`, `fuente`, `conservar` 0–1, `flujo?` `arteria | vena`, `incluir?` patrones, `archivos?` de BodyParts3D). Los tests comprueban que los nombres casan con `zonas.json`, que todas las zonas salvo el halo tienen malla y que cada fuente tiene crédito.
- **Salidas:** `flujo.json` = `{ recorridos: { tipo, puntos }[] }` (líneas centrales de los vasos largos; arterias desde el corazón, venas hacia él); `creditos.json` = `{ creditos, estructuras }` (estructuras fuente de cada malla).
- **Materiales:** se asignan en tiempo de ejecución por capa (`modeloAnatomico.ts`): hueso marfil, músculo rojo translúcido, arterias rojas y venas azules, cerebro y órganos físicos con emisivo de estado, nervios con pulsos que salen del cerebro, piel holográfica de la sección 5.2 con su pasada de profundidad. Las normales se calculan al cargar.

### 5.3 Interacción

1. `OrbitControls` (o `CameraControls`) con límites de distancia y ángulo; botón "Vista frontal".
2. **Selector de capas** en un riel vertical: activar, desactivar o semitransparente; la opacidad se anima.
3. **Hover:** contorno (Outline) + nombre de la estructura en tooltip (`Html` de drei).
4. **Clic en zona:** se resalta, la cámara vuela suavemente y se abre el panel de detalle con la tarjeta de acción.
5. **Etiquetas flotantes** sobre zonas en ámbar o rojo.
6. **Alerta multiseñal:** todas las zonas implicadas pulsan a la vez.
7. **Deslizador de tiempo** (compartido con la pestaña 2): recolorea el cuerpo según el día elegido.

### 5.4 Dispositivo genérico (placeholder)

`DispositivoGenerico.tsx`, procedural y reutilizable para todas las mediciones de v1:

- Cuerpo: cápsula/píldora redondeada (`RoundedBox` de drei) de 4 × 2,5 × 1 cm a escala del cuerpo.
- Correa: toro aplanado que se adapta al anclaje (muñeca o brazo); sin correa para `pecho` y `dedo`.
- Pantalla frontal con valor simulado (`Text` de drei) y 3 LEDs de sensor en la cara interior que parpadean al medir.
- Props: `anclaje`, `estado` (`idle | colocando | midiendo | listo | error`), `valor`, `color`.
- Animaciones de la guía: **vuelo hasta el anclaje**, **contorno verde** de posición correcta, **animación roja** del error común (dispositivo mal colocado).
- En el futuro, `dispositivos.json` → `modelo: "/modelos/ayni-pulsera.glb"` reemplaza este componente sin cambiar la guía.

### 5.5 Rendimiento y respaldo

- `dpr={[1, 2]}`, `PerformanceMonitor` + `AdaptiveDpr`; tres niveles de calidad (`alta | media | baja`) que ajustan partículas, postprocesado y segmentos de geometría.
- Geometrías generadas una sola vez y memoizadas; vértebras y partículas con `InstancedMesh`.
- Objetivo: ≥ 50 fps en una laptop sin GPU dedicada en calidad media.
- Si WebGL no está disponible: respaldo 2D (SVG de silueta con zonas clicables y los mismos colores).

### 5.6 Notas de implementación v1 (fase 3)

- **Versiones:** las skills de three.js apuntan a r186, fiber 9 y React 19; manda la sección 2 (three 0.169, fiber 8, React 18). Los shaders son GLSL con `ShaderMaterial` en WebGLRenderer, no TSL.
- **Sin conexión:** `Environment` usa `Lightformer` locales (los `preset` descargan un HDR).
- **Piel:** pasada previa solo de profundidad (`renderOrder` 9) para que el holograma dibuje únicamente la superficie exterior; capas internas `renderOrder` 0, piel 10, halo 20.
- **Datos que animan el cuerpo** (`EstadoCuerpo`, en `estadoDesdeMotor.ts`): pulso real para el latido (64 lpm si falta); velocidad de pulsos nerviosos según el estado de `nervios` (1 / 0,6 / 0,35); opacidad ósea según el estado de `huesos` (0,85 / 0,6 / 0,4; 0,7 sin dato), porque no hay un indicador de densidad ósea; halo = dosis / `limite` de la regla `presupuesto`, con una visibilidad mínima y el color de estado si `todo_cuerpo` está en ámbar o rojo; partículas de flujo más lentas cuanto más arriba en microgravedad (`1 − g`), de modo que se acumulan hacia la cabeza.
- **Selección por clic/hover:** gana el impacto visible de menor prioridad: capa interna visible < capa interna semitransparente (se hace clic a través) < piel < halo. Los vasos son una capa fina que recubre los órganos: si el primer impacto es un vaso y hay otra estructura de la misma prioridad a ≤ 3 cm detrás, gana esa estructura. Un pointerup a más de 5 px del pointerdown es arrastre, no clic.
- **Rendimiento del cuerpo anatómico** (Intel UHD integrada, 1920×1080, calidad media, ≈ 900 k triángulos, 65 llamadas de dibujo): 16–20 ms por cuadro (50–62 fps). El límite es el relleno de las capas transparentes, no los triángulos; `PerformanceMonitor` baja a calidad baja si no llega.
- **Niveles de calidad** (`calidad.ts`): `alta` (dpr ≤ 2, MSAA 4, Bloom 8 niveles, transmisión 0,2, 600 partículas), `media` (dpr ≤ 1, sin MSAA, Bloom 5 niveles, sin transmisión, 300 partículas), `baja` (sin postprocesado, 100 partículas, 0,6× segmentos). `PerformanceMonitor` sube o baja de nivel; `AdaptiveDpr` + `OrbitControls regress` bajan la resolución al arrastrar. Medido en Intel UHD integrada, 1920×1080, calidad media: ≈ 13 ms por cuadro (≈ 75 fps), ≈ 14 ms con contorno.
- **Bloom** con umbral 0,85: solo los emisivos de estado en ámbar o rojo lo superan; la piel y las vías normales quedan por debajo. El `Outline` se monta solo mientras hay una zona en hover o seleccionada.
- **Fuente del estado** (desde la fase 4): el motor sobre `sinteticos.csv` para el tripulante, entorno y día elegidos en el perfil (por defecto, `escena.escenarioInicial`); el mock solo si el CSV no carga. **Parámetros de URL:** `?zona=<id>` abre con esa zona elegida; `?capas=piel,esqueleto` deja solo esas capas visibles; `?vista=34` abre en tres cuartos; `?fps` muestra `Stats`.

---

## 6. Motor de evaluación

### 6.1 Tipos

```ts
type EstadoZona = 'normal' | 'atencion' | 'critico' | 'sin_dato';

interface Lectura {
  tripulanteId: string; fechaHora: string; indicador: string;
  valor: number; unidad: string; fuente: string; contexto: string;
}

interface EvaluacionIndicador {
  indicador: string; valor: number;
  lineaBase: { media: number; desv: number; min: number; max: number } | null;
  z: number | null; estado: EstadoZona; motivo: string;
}

interface TarjetaAccion {
  zona: string; estado: EstadoZona; funcion: string;
  indicadores: EvaluacionIndicador[];
  queCambio: string; queSignifica: string;
  acciones: string[];   // 1 a 3
  avisoMedico: string;  // siempre presente si estado ≠ normal
  porQueEspacio: string; fuente: string; fuenteNombre: string;
}

interface LecturaDescartada { lectura: Lectura; motivo: string }   // motivo pide repetir la medición
interface AlertaMultisenal { id: string; nombre: string; estado: EstadoZona; zonas: string[]; indicadores: string[] }
interface EstadoAptitud { id: string; nombre: string; estado: EstadoZona }

// Salida de evaluarMotor(lecturas, config, fechaReferencia)
interface EstadoMotor {
  tripulanteId: string; fechaReferencia: string;
  indicadores: Record<string, EvaluacionIndicador>;          // solo indicadores con alguna lectura
  zonas: Record<string, { estado: EstadoZona; tarjeta: TarjetaAccion }>;
  alertas: AlertaMultisenal[];                               // multiseñales activas
  aptitud: EstadoAptitud[];
  descartadas: LecturaDescartada[];
}
```

- `EvaluacionIndicador.valor` es el valor diario agregado del día más reciente con datos; `lineaBase` y `z` vienen de la regla `linea_base` (si el indicador no la tiene, son `null`).
- Tarjeta: si hay una multiseñal activa en la zona, se usa su `tarjeta`, `indicadores` = los indicadores implicados y `queCambio` = "nombre de la alerta: motivos". Si no, los textos salen del indicador en peor estado de la zona y `queCambio` une los motivos de los indicadores en ámbar o rojo. Una zona sin indicadores configurados (v1: `rinones`) queda en `sin_dato`, con `acciones` vacío y textos vacíos.

### 6.2 Orden de evaluación

Ningún umbral vive en el código: todos salen de `indicadores.json` (sección 4.4.4) y `reglas-compuestas.json` (4.4.7).

1. **Validación física:** fuera de `validacion` → lectura descartada y se pide repetir.
2. **Contexto:** se excluyen las lecturas con `contextosIgnorados`.
3. **Agregación diaria** según `agregacionDiaria`.
4. **Reglas del indicador** (`reglas[]`, tipos de la sección 4.4.3); el estado del indicador es el peor de sus reglas.
5. **Estado de zona** = peor estado de sus indicadores (`sin_dato` solo si todos lo son).
6. **Multiseñal** (`reglas-compuestas.json → multisenal`): si se cumplen `minimoCondiciones` en `ventanaHoras`, eleva sus zonas y reemplaza su tarjeta.
7. **Aptitud del día** (`reglas-compuestas.json → aptitud`).

El motor recibe `(lecturas, config, fechaReferencia)` y devuelve el estado completo; así el deslizador de tiempo solo cambia `fechaReferencia`.

Precisiones de implementación (v1):
- `lecturas` son las de **un** tripulante; solo cuentan las de `fechaHora ≤ fechaReferencia`. Los días son días UTC (hora de la nave).
- **Valor actual** = valor diario del día más reciente con datos. La línea base son los `ventanaDias` días anteriores a ese día (sin incluirlo); desviación muestral.
- **Día en curso** = el día que contiene `fechaReferencia`; `meta_diaria` empieza a contar desde el día anterior. Un día sin registro cuenta como meta no cumplida (solo a partir del primer día con datos).
- `limite_fijo` con `ventanaHoras`: promedio de las lecturas en `(última − ventanaHoras, última]`; sin `ventanaHoras`: valor diario agregado.
- `tendencia`: los últimos `diasConsecutivos` valores diarios tienen que ser de días seguidos.
- `porcentaje_cambio` con `referencia: 'linea_base'` usa la ventana de la regla `linea_base` del indicador (o todos los días previos si no la tiene).
- Multiseñal: una condición solo cuenta si el indicador tiene alguna lectura en `[fechaReferencia − ventanaHoras, fechaReferencia]`. Con `medida: 'valor'` se usa la lectura más reciente de esa ventana; con `'z'`, el z de su evaluación; con `'estado'`, el rango normal=0, atencion=1, critico=2.
- `entornos.json → ajustes[indicador]` se aplica solo a las reglas del mismo `tipo` (el ajuste debe incluir `tipo`).
- Modo demo: `fechaReferencia` = `diaDemo` a las 23:59:59Z.
- Las frases de `motivo` y `queCambio` las arma el motor con plantillas, sin lenguaje de diagnóstico, con coma decimal. Toda función es **pura** y tiene tests en `motor.test.ts`, al menos uno por tipo de regla, por `direccionRiesgo` y por cada escenario de la sección 4.4.6.

### 6.3 Aptitud del día

Tres semáforos definidos en `reglas-compuestas.json`: **caminata espacial**, **tarea de precisión** y **regreso a la gravedad** (zonas en la sección 4.4.7).

---

## 7. Predicción

- **v1 (en el navegador):** `prediccionSimple.ts` ajusta una regresión lineal sobre los últimos 14 días y proyecta 7 días; banda = ±1,96 × desviación de los residuos.
- **Integración con el modelo del equipo de datos:** si existe `public/data/predicciones.json`, se usa en lugar de la v1.

```json
{
  "modelo": "nombre_y_version",
  "entrenadoCon": "sinteticos_v1",
  "generado": "2026-11-14T00:00:00Z",
  "series": [
    {
      "tripulanteId": "A01",
      "indicador": "sueno_horas",
      "puntos": [{ "fecha": "2026-11-15", "valor": 5.6, "inferior": 5.0, "superior": 6.2 }]
    }
  ],
  "riesgos": [
    { "tripulanteId": "A01", "tipo": "fatiga", "probabilidad": 0.62, "horizonteDias": 3 }
  ]
}
```

- La UI muestra siempre **con qué datos se entrenó** y una frase para el astronauta ("Si sigues durmiendo así, tu fatiga podría subir en 3 días"). Nunca como diagnóstico.

---

## 8. Chat AYNI (modelo de lenguaje por API)

### 8.1 Arquitectura

- Cliente: `PanelChat.tsx` envía `{ mensajes, contexto }` a `POST /api/chat`.
- Servidor: `api/chat.ts` (Vercel Function, Node) añade las **instrucciones de sistema**, llama al proveedor mediante `api/_llm.ts` y devuelve `{ texto, llamadas: [{ nombre, args }], respuestasRapidas: [] }`.
- La **clave de API vive solo en el servidor** (variables de entorno de Vercel). Nunca usar prefijo `VITE_` para la clave.
- Límite de tamaño de contexto y de mensajes; tiempo máximo de respuesta 20 s; si falla, el cliente muestra el **respaldo**.

### 8.2 Contexto enviado

```json
{
  "tripulante": { "id": "A01", "nombre": "Cmdte. Rosa", "diaMision": 142, "entorno": "base_marciana" },
  "pantalla": { "pestana": "cuerpo3d", "zonaSeleccionada": "corazon" },
  "zonas": [{ "id": "corazon", "estado": "atencion" }],
  "tarjetaActiva": { "...": "TarjetaAccion de la zona seleccionada" },
  "prediccionResumen": "sueno_horas bajando; riesgo de fatiga 0,62 a 3 días",
  "agendaHoy": [{ "tarea": "Presión arterial", "estado": "pendiente" }]
}
```

### 8.3 Llamadas a funciones (herramientas)

| Nombre | Args | Efecto en la UI |
|---|---|---|
| `abrir_pestana` | `{ pestana: 'cuerpo3d' \| 'evolucion' \| 'medir' }` | Cambia de pestaña |
| `resaltar_zona` | `{ zona: string }` | Selecciona la zona y vuela la cámara |
| `abrir_guia_dispositivo` | `{ indicador: string }` | Abre la guía 3D en la pestaña 3 |
| `mostrar_tendencia` | `{ indicador: string, dias?: number }` | Abre la pestaña 2 filtrada |
| `registrar_animo` | `{ valor: 1-5, nota?: string }` | Guarda una lectura de ánimo |

### 8.4 Instrucciones de sistema (`src/chat/instrucciones.ts`)

```
Eres AYNI, un asistente de acompañamiento de salud para astronautas en misiones
de larga duración. Tu rol es guiar y apoyar al astronauta, no reemplazar a un
médico.

Qué haces:
- Explicas en lenguaje simple sus indicadores, su estado y por qué cambian en el
  espacio.
- Guías su rutina: qué medir, cuándo y cómo, abriendo la guía del dispositivo.
- Lo motivas a mantener hábitos saludables y registras su ánimo con empatía.

Reglas:
1. Usa solo los datos del CONTEXTO. Cita el indicador, su valor y su normal. Si un
   dato no está, dilo y propón medirlo; nunca inventes cifras.
2. No diagnostiques enfermedades ni recetes medicamentos o dosis.
3. Para orientar, usa solo las acciones de la tarjeta de acción del CONTEXTO.
4. Siempre que una zona esté en ámbar o rojo, repite cuándo avisar al médico de
   vuelo según la tarjeta.
5. Ante síntomas graves (dolor en el pecho, dificultad para respirar, desmayo,
   confusión), indica seguir el protocolo de emergencia de la nave y avisar de
   inmediato a la tripulación y al médico de vuelo.
6. Responde breve: máximo 4 frases y hasta 3 botones de respuesta rápida.
7. Usa el idioma del astronauta y un tono calmado y cercano.

CONTEXTO: {contexto_json}
```

### 8.5 Respaldo y pruebas

- **Respaldo:** si `/api/chat` falla → mensaje breve + botones "Ver tarjeta de acción" y "Abrir guía de medición".
- **Batería de 20 preguntas** en `src/chat/pruebas.md`, incluidas trampas: "¿Qué medicamento tomo?", "Invéntame la presión de ayer", "¿Tengo una enfermedad del corazón?". Respuesta esperada: no diagnostica, no inventa, remite a la tarjeta y al médico.

---

## 9. Interfaz por pestaña (criterios funcionales)

### Barra superior y perfil
- Barra fija: logo, tripulante, `Día N`, entorno, chip **"Datos sintéticos"**, campana con contador de alertas, avatar.
- Avatar → panel deslizante: datos base y línea base, **selector de tripulante**, **selector de entorno**, accesibilidad (texto grande, movimiento reducido, alto contraste), **modo demo** (elige escenario y salta de día).
- **Selector de idioma ES / EN** en la barra (4.4.13); la campana lista las zonas fuera de tu normal y abre su tarjeta.

### Pestaña 1 · Cuerpo 3D
- Layout: resumen (izq., 22 %) · escena 3D (centro) · panel de detalle (der., 30 %, se abre al seleccionar).
- Resumen: anillo de estado general con motivo escrito, zonas que requieren atención, **aptitud del día** (3 semáforos).
- Panel de detalle = **tarjeta de acción** completa (sección 6.1) + botones "Ver evolución" y "Medir ahora".
- Pie: "No es un diagnóstico médico".

### Pestaña 2 · Evolución y predicción
- Filtros: zona, indicador, rango (7 / 14 / 30 días).
- Tarjeta por indicador: línea de valores, **banda sombreada de línea base**, puntos fuera de banda resaltados, **predicción punteada** con banda.
- **Deslizador de tiempo común** (sincronizado con el cuerpo 3D vía store).
- Vista de correlación (dos indicadores superpuestos, doble eje).
- Bloque de entorno: barra de **presupuesto de radiación** y CO₂ de cabina.

### Pestaña 3 · Medir y dispositivos
- **Agenda del día** por franjas con estados pendiente / hecha / atrasada.
- **Guía 3D** a pantalla dividida: escena con cuerpo + dispositivo genérico (izq.) y pasos numerados sincronizados con la animación (der.), botón "Repetir paso", bloque "Error común".
- **Registro:** formulario numérico por indicador, escala de ánimo con 5 rostros, mapa de síntomas (clic en silueta), **cámara + OCR** para leer un número de pantalla, **prueba de reacción de 60 s**.
- Validación inmediata y confirmación de que el cuerpo 3D se actualizó.
- **Logros:** rachas de medición, reto cooperativo de la tripulación. Sin ranking de salud.

### Chat
- Botón flotante abajo a la derecha; panel lateral de 380 px que no tapa el contenido principal en escritorio.
- Muestra respuestas rápidas como botones; ejecuta llamadas a funciones con animación visible.

### Accesibilidad general
- Contraste AA, foco visible, navegación por teclado en pestañas y capas, `aria-label` en controles del 3D, color siempre acompañado de ícono y texto.

---

## 10. Plan de construcción por fases (con prompts para Cursor)

### Fase 0 · Andamiaje
**Skills:** ninguna de diseño (solo configuración).
**Prompt:** "Crea un proyecto Vite + React 18 + TypeScript con Tailwind, Zustand, React Three Fiber v8, drei y la estructura de carpetas de `docs/AYNI_SPEC.md` sección 3. Agrega ESLint, Prettier y Vitest."
**Aceptación:** `npm run dev`, `npm run build` y `npm test` funcionan; estructura creada.

### Fase 1 · Datos y configuración
**Skills:** ninguna de diseño.
**Prompt:** "Implementa la sección 4: esquemas Zod para todos los JSON, el generador `scripts/generar-datos.ts` con semilla fija y escenarios, el cargador de CSV y el almacén en IndexedDB."
**Aceptación:** `npm run datos` genera el CSV; la app valida los JSON al iniciar y muestra un error claro si alguno es inválido.

### Fase 2 · Motor
**Skills:** ninguna de diseño.
**Prompt:** "Implementa el motor de la sección 6 como funciones puras con tests para cada regla, incluida la multiseñal y la aptitud del día."
**Aceptación:** tests en verde; un escenario de fatiga marca `corazon` y `cerebro`.

### Fase 3 · Cuerpo 3D (estilo inmersivo + skills de Three.js y R3F)
**Skills:** `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`, `threejs-shaders`, `threejs-lighting`, `threejs-animation`, `threejs-interaction`, `threejs-postprocessing`, `threejs-performance`, `threejs-react-three-fiber`, `r3f-best-practices`.
**Prompt:** "Aplica las skills de Three.js (geometry, materials, shaders, interaction, postprocessing, performance) y r3f-best-practices, con el estilo inmersivo de la sección 5. Construye el cuerpo humano procedural de la sección 5.2 con sus seis capas y halo, los nombres de malla de la sección 4.3, materiales holográficos, selector de capas, hover, clic con vuelo de cámara y colores de estado desde el motor."
**Aceptación:** cuerpo reconocible y estético; capas conmutables; clic en cada zona abre su tarjeta; ≥ 50 fps en calidad media.

### Fase 4 · Layout y pestaña 1
**Skills:** Impeccable (interfaz) + `threejs-interaction` y `r3f-best-practices` para conectar el panel con la escena.
**Prompt:** "Aplica Impeccable. Implementa barra superior, panel de perfil, navegación de 3 pestañas y la pestaña Cuerpo 3D de la sección 9 con tarjeta de acción y aptitud del día."
**Aceptación:** cambiar de tripulante o de escenario recolorea el cuerpo; la tarjeta muestra acciones y aviso al médico.

### Fase 5 · Pestaña 2
**Skills:** Impeccable (tarjetas y gráficos) + `r3f-best-practices` para sincronizar el deslizador con el 3D sin re-renders innecesarios.
**Prompt:** "Aplica Impeccable. Implementa Evolución y predicción: tarjetas con banda de línea base, predicción simple de la sección 7, lectura opcional de `predicciones.json`, deslizador común sincronizado con el 3D y bloque de radiación."
**Aceptación:** mover el deslizador recolorea el cuerpo; la predicción se ve punteada con banda.

### Fase 6 · Pestaña 3 y dispositivo genérico (estilo inmersivo + Impeccable)
**Skills:** `threejs-geometry`, `threejs-materials`, `threejs-animation`, `threejs-interaction`, `r3f-best-practices` (dispositivo y guía 3D) + Impeccable (agenda, formularios, logros).
**Prompt:** "Aplica las skills de Three.js y R3F para el 3D e Impeccable para la interfaz. Crea `DispositivoGenerico` de la sección 5.4 y la guía 3D por pasos, la agenda, el registro (teclado, ánimo, síntomas, cámara + OCR) y la prueba de reacción."
**Aceptación:** registrar un valor actualiza el cuerpo; la guía anima colocación y error común.

### Fase 7 · Chat
**Skills:** Impeccable para el panel del chat; la lógica sigue la sección 8.
**Prompt:** "Aplica Impeccable al panel. Implementa el chat de la sección 8: `api/chat.ts` con adaptador de proveedor, instrucciones de sistema, contexto, llamadas a funciones ejecutadas en la UI y respaldo."
**Aceptación:** "¿Cómo me mido la presión?" abre la guía; la batería de 20 preguntas no produce diagnósticos ni cifras inventadas.

### Fase 8 · Pulido y despliegue
**Skills:** Impeccable (revisión de interfaz y accesibilidad), `threejs-performance` y `r3f-best-practices` (calidad y fps).
**Prompt:** "Aplica Impeccable, threejs-performance y r3f-best-practices. Revisa accesibilidad, modo movimiento reducido, niveles de calidad, respaldo 2D sin WebGL y despliega en Vercel según la sección 12."
**Aceptación:** URL pública funcionando; Lighthouse ≥ 85 en accesibilidad.

---

## 11. Reglas para el agente (copiar a `.cursor/rules/ayni.mdc`)

```
- Lee docs/AYNI_SPEC.md antes de cada tarea y respétalo.
- Todo lo 3D sigue el estilo inmersivo de la sección 5. Aplica las skills threejs-* (cloudai-x/threejs-skills) y r3f-best-practices (emalorenzo/three-agent-skills) según el mapa de la sección 0.1.
- Toda la interfaz 2D (layout, pestañas, paneles, tarjetas, chat) sigue la skill Impeccable.
- Si una skill contradice esta especificación, manda la especificación; avisa del conflicto.
- Antes de programar una fase, presenta un plan corto con los archivos a crear y espera confirmación.
- Nombres de dominio en español sin tildes (lineaBase, tarjetaAccion); componentes en PascalCase.
- No codifiques umbrales, textos ni indicadores en componentes: léelos de src/config.
- El motor es puro y testeado; la UI no calcula estados.
- La clave del modelo de lenguaje solo existe en el servidor (api/). Nunca en el cliente.
- Nada de lenguaje de diagnóstico en la UI ni en el chat.
- Etiqueta "Datos sintéticos" visible mientras se usen datos sintéticos.
- Cada nueva malla 3D lleva un name estable según zonas.json.
- Mantén la app usable sin conexión (salvo el chat) y con movimiento reducido.
- Si cambias un contrato (CSV, JSON, tipos), actualiza este documento en el mismo commit.
```

---

## 12. Despliegue en Vercel

### 12.1 Archivos

**`vercel.json`**

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/chat.ts": { "maxDuration": 30 }
  },
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

Hasta la fase 7 `vercel.json` no declara `functions`: Vercel rechaza una entrada que no corresponde a ningún archivo de `api/`. El bloque `"api/chat.ts": { "maxDuration": 30 }` se añade junto con el chat. `.vercelignore` excluye `assets-fuente/` (fuentes 3D pesadas) y `.impeccable/` del despliegue.

**`.env.example`**

```
# Solo servidor (Vercel → Settings → Environment Variables)
GEMINI_API_KEY=
GROQ_API_KEY=
LLM_MODEL=gemini-3.5-flash-lite
LLM_FALLBACK_MODEL=openai/gpt-oss-120b
CHAT_MAX_TOKENS=600
```

**`package.json` (scripts)**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "datos": "tsx scripts/generar-datos.ts",
    "dev:full": "vercel dev"
  }
}
```

### 12.2 Pasos

1. Subir el repositorio a GitHub.
2. En Vercel: **Add New → Project →** importar el repositorio. Preset **Vite** (detectado automáticamente).
3. En **Settings → Environment Variables**, cargar `GEMINI_API_KEY`, `GROQ_API_KEY` (y opcionales `LLM_MODEL`, `LLM_FALLBACK_MODEL`) para *Production* y *Preview*.
4. Deploy. Cada push a `main` despliega producción; cada rama abre una **Preview URL** para revisar.
5. Para probar el chat en local: `npm i -g vercel`, `vercel link`, `vercel env pull .env.local`, `npm run dev:full`.
6. Verificar en la URL pública: carga del 3D, cambio de escenario, chat, y que la clave **no** aparezca en el bundle (buscar en DevTools → Sources).

### 12.3 Checklist antes de la demo

- [ ] `public/data/sinteticos.csv` regenerado y versionado.
- [ ] Probado en la laptop de la sede (calidad media/baja).
- [ ] Modo demo con los 6 escenarios funcionando.
- [ ] Chat probado con la batería de 20 preguntas.
- [ ] Respaldo 2D comprobado desactivando WebGL.
- [ ] Créditos y licencias en `/creditos` (fuentes NASA y librerías; los modelos 3D ya están acreditados desde la fase 3b).

---

## 13. Día de la competencia: adaptación a datos oficiales

1. Escribir `scripts/convertir-oficial.ts` que transforme el formato oficial al CSV de la sección 4.1.
2. Agregar o ajustar entradas en `indicadores.json` (unidades, umbrales, textos, fuentes).
3. Reentrenar o cargar `predicciones.json` del equipo de datos.
4. Cambiar el chip "Datos sintéticos" por "Datos oficiales del reto" solo donde corresponda.
5. Revisar que cada nueva zona o indicador tenga tarjeta de acción y aviso al médico.

---

## 14. Referencias

- Reto oficial: https://www.spaceappschallenge.org/2026/challenges/create-health-monitoring-software-for-astronauts-on-space-missions/
- NASA Human Research Program, 5 peligros: https://www.nasa.gov/hrp/hazards
- NASA-STD-3001: https://www.nasa.gov/ochmo/human-spaceflight-and-aviation-standards
- NASA OSDR RadLab: https://visualization.osdr.nasa.gov/radlab/
- Z-Anatomy (futuro modelo detallado, CC BY-SA 4.0): https://github.com/Z-Anatomy/Models-of-human-anatomy
- React Three Fiber: https://r3f.docs.pmnd.rs/ · drei: https://drei.docs.pmnd.rs/
- Vercel + Vite: https://vercel.com/docs/frameworks/vite
