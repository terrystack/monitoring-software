---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pestanas/Cuerpo3D/PestanaCuerpo3D.tsx"]
---

Scope: HANAN PACHA app shell (top bar, tabs, profile panel) and tab 1 "Cuerpo 3D". Visitor mode: Operate.
Audience: astronaut on a long mission doing a daily self-check; Space Apps judges in a short projected laptop demo.
Task: see which body zone departs from the personal 14-day normal, open its procedure, act, know when to call the flight surgeon.
Constraints: palette and 3D world pinned by docs/AYNI_SPEC.md section 5; texts from src/config (ES base, EN overlay); "Datos sintÃ©ticos" and "No es un diagnÃ³stico mÃ©dico" always visible; offline except chat; reduced motion; AA contrast.
Approved comp: .impeccable/mocks/decision/procedimiento.jpg (structure "Procedimiento de a bordo", original variant).

## Direction contract

THESIS: The action card is an onboard procedure the astronaut executes, not a report to read; refuses the dashboard of metric tiles around a body.
OWN-WORLD: Deep-space navy ground, the live holographic anatomical body as the center, tinted dark panels with hairline cyan-slate rules, Biryani type, state colors only where they carry meaning, cyan for selection and the primary action.
STORY: The astronaut sees today's readiness and the zone board, picks the amber zone (on the body or the table), reads what changed against their normal, ticks the steps as done and knows exactly when to call the flight surgeon.
FIRST VIEWPORT: Top bar with wordmark, three tabs, crew, mission day, environment, synthetic-data chip, alerts bell, avatar. Left 27%: readiness (three rows) above the zone table (zone, status with icon and word, value, your normal). Center: full-height 3D body with floating labels on alert zones. Right 31%: procedure card (title with state, what changed, numbered checkable steps, caution block for the flight surgeon, why in space, source, Ver evoluciÃ³n / Medir ahora). Layers and front view as a compact control bottom-center.
FORM: Procedimiento de a bordo, position 3 of the ordered structure list, seed key 32053ed9.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisión de primera vista

El usuario aceptó la primera vista como dirección visual el 2026-11-11. Pregunta: "¿Aceptas esta primera vista como dirección visual de HANAN PACHA, aunque la comparación automática con la maqueta se quede en 70,6 %?". Respuesta: "Sí, la acepto; aplica las correcciones del revisor y cierra la fase". La revisión automática de primera vista de Impeccable no puede capturar esta app (WebGL, CSV y GLB cargados en tiempo de ejecución), por eso la fase hero queda abierta en state.json.

Tras la revisión final (7 de 8 correcciones resueltas y 2 regresiones corregidas, commit 142e833) la comparación con la maqueta quedó en 64 %. Pregunta: "Con 7 de 8 correcciones resueltas, las 2 regresiones corregidas y la comparación con la maqueta en 64 %, ¿cómo seguimos?". Respuesta del usuario: "Cerrar la fase 4 así (aceptar el 64 %), terminar el DESIGN.md y pasar a la fase 5". Veredicto del revisor sin cambios: fix (solo queda abierta la persistencia del estado de Impeccable).
