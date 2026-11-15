---
name: AYNI
description: Autoevaluación de salud para astronautas; el cuerpo 3D es la interfaz y los paneles 2D son su consola de a bordo.
colors:
  acento: "#22D3EE"
  acento-velo: "#22D3EE26"
  estado-normal: "#34D399"
  estado-atencion: "#FBBF24"
  estado-critico: "#F87171"
  estado-sinDato: "#64748B"
  fondo-profundo: "#050816"
  fondo-medio: "#0B1026"
  superficie: "#090B1A"
  linea: "#22344A"
  tinta: "#ECEEF4"
  tinta-suave: "#B8BDCD"
  tinta-tenue: "#8A90A6"
  velo-hover: "#FFFFFF0D"
typography:
  wordmark:
    fontFamily: "Biryani, system-ui, Segoe UI, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.32em"
  headline:
    fontFamily: "Biryani, system-ui, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  title:
    fontFamily: "Biryani, system-ui, Segoe UI, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Biryani, system-ui, Segoe UI, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "-0.012em"
  body-sm:
    fontFamily: "Biryani, system-ui, Segoe UI, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.012em"
  data:
    fontFamily: "Biryani, system-ui, Segoe UI, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.012em"
    fontFeature: "\"tnum\""
  label:
    fontFamily: "Biryani, system-ui, Segoe UI, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "7": "1.75rem"
components:
  panel:
    backgroundColor: "#090B1AE0"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "0.875rem 1rem 0.75rem"
  tarjeta-accion:
    backgroundColor: "#090B1AE0"
    textColor: "{colors.tinta}"
    rounded: "{rounded.lg}"
    padding: "1rem 1.25rem"
  button-primary:
    backgroundColor: "{colors.acento-velo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "0.625rem 0.75rem"
  button-primary-hover:
    backgroundColor: "#22D3EE40"
    textColor: "{colors.tinta}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "0.625rem 0.75rem"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-suave}"
    rounded: "{rounded.md}"
    size: "2rem"
  button-icon-hover:
    backgroundColor: "{colors.velo-hover}"
    textColor: "{colors.tinta}"
  segmento:
    backgroundColor: "transparent"
    textColor: "{colors.tinta-tenue}"
    padding: "0.25rem 0.5rem"
  segmento-activo:
    backgroundColor: "{colors.acento-velo}"
    textColor: "{colors.tinta}"
  chip-sintetico:
    backgroundColor: "transparent"
    textColor: "{colors.acento}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.625rem"
  avatar:
    backgroundColor: "#22D3EE1A"
    textColor: "{colors.tinta}"
    rounded: "{rounded.full}"
    size: "2rem"
  insignia-alerta:
    backgroundColor: "{colors.estado-critico}"
    textColor: "{colors.fondo-profundo}"
    rounded: "{rounded.full}"
    height: "1rem"
  paso-hecho:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.fondo-profundo}"
    rounded: "{rounded.sm}"
    size: "1.1rem"
  aviso-atencion:
    backgroundColor: "#FBBF2414"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  aviso-critico:
    backgroundColor: "#F871711A"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  interruptor:
    backgroundColor: "{colors.velo-hover}"
    rounded: "{rounded.full}"
    width: "2.25rem"
    height: "1.25rem"
  interruptor-activo:
    backgroundColor: "#22D3EE4D"
  campo-select:
    backgroundColor: "{colors.fondo-profundo}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  etiqueta-zona:
    backgroundColor: "#050816CC"
    textColor: "{colors.tinta}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.625rem"
---

# Design System: AYNI

## Overview

**Creative North Star: "Consola de a bordo"**

La interfaz 2D de AYNI es la consola que rodea un holograma médico. El protagonista es el cuerpo anatómico 3D, luminoso y semitransparente sobre un vacío azul noche; la capa 2D no compite con él: son paneles de vidrio oscuro tintado, con filetes finos color pizarra, que se apoyan en los bordes de la pantalla y dejan el centro al cuerpo. Se lee como instrumentación de nave, no como panel de métricas: tablas compactas, cifras tabulares, procedimientos numerados que se marcan al hacerlos y un bloque de precaución para el médico de vuelo.

El color está racionado. Todo es tinta clara sobre navy salvo dos voces: el cian, que significa "seleccionado / acción / foco", y la paleta de estado (verde, ámbar, coral, pizarra), que solo aparece donde hay un estado que comunicar y siempre con forma de ícono y palabra. La densidad es alta pero respirada: escala tipográfica pequeña y precisa (base de 14 a 17 px según el ancho), una sola familia, Biryani, y jerarquía construida con peso y tono de tinta más que con tamaño.

La calma es parte del sistema: sin sombras en reposo, sin gradientes en la UI, transiciones cortas de color y un modo de movimiento reducido que las anula. Los ajustes de texto grande y alto contraste reescriben los mismos tokens desde la raíz, de modo que cualquier superficie nueva que use los tokens los hereda gratis.

**Key Characteristics:**
- Fondo espacial en degradado vertical de `fondo-medio` a `fondo-profundo`; el cuerpo 3D ocupa el lienzo completo detrás de la UI.
- Paneles translúcidos (`superficie` al 88 %) con filete `linea` al 70 % y esquinas de 8 px; planos, sin sombra.
- Cian `acento` reservado a selección, foco, acción principal, enlaces y numeración de pasos.
- Paleta de estado fija, siempre acompañada de `IconoEstado` (forma distinta por estado) y su etiqueta.
- Una sola familia (Biryani 400/600/700), cifras tabulares en todo dato.
- Tamaños en `rem` sobre una raíz fluida; texto grande y alto contraste como clases en `:root`.

## Colors

Navy profundo y tinta lunar como base, un cian de instrumento como única voz de interfaz y una paleta de estado semántica que nunca se usa como decoración.

### Primary
- **Cian de selección** (`acento`): el único color de interacción. Marca la pestaña activa (subrayado de 2 px), el foco visible (contorno de 2 px), el botón de acción principal, la casilla de un paso hecho, los números de paso, los enlaces y la etiqueta "Datos sintéticos". También tiñe la selección de texto.
- **Velo cian** (`acento-velo`, el cian al 15 %): relleno de lo seleccionado o activo: botón principal, segmento activo, fila de zona elegida (al 10 %), avatar (al 10 %). El sistema usa una escalera de opacidades del cian (10, 15, 20, 25 % para rellenos; 45, 50, 60, 70 % para bordes), nunca un cian sólido como fondo de botón.

### Secondary
Paleta de estado semántica; valores fijados por la especificación y leídos desde `src/config/escena.json`, nunca escritos en componentes.
- **Verde nominal** (`estado-normal`): zona o indicador dentro de su normal personal.
- **Ámbar de atención** (`estado-atencion`): fuera de la normal, requiere acción. Tiñe también el bloque de aviso médico al 8 % con borde al 55 %.
- **Coral crítico** (`estado-critico`): fuera de rango crítico; insignia de conteo en la campana de alertas; bloque de aviso al 10 % con borde al 60 %.
- **Pizarra sin dato** (`estado-sinDato`): ausencia de medición. Se usa para el ícono (círculo con guion); el texto "Sin dato" se escribe en `tinta-tenue`.

### Neutral
- **Vacío profundo** (`fondo-profundo`): fondo del documento, base del degradado, fondo de la barra superior al 80 %, del velo modal al 60 %, de campos `select` y de las etiquetas flotantes. También es el color del trazo interior de los íconos de estado y del texto sobre cian o coral sólidos.
- **Azul de órbita** (`fondo-medio`): extremo superior del degradado de fondo; hover de las etiquetas flotantes.
- **Vidrio de consola** (`superficie`): fondo de `.panel` al 88 % (`--opacidad-panel`). Deja ver el espacio detrás sin perder legibilidad.
- **Filete pizarra** (`linea`): bordes de paneles (70 %), divisores de filas (45–60 %), contornos de controles y separadores verticales.
- **Tinta luna** (`tinta`): texto principal, valores, títulos.
- **Tinta niebla** (`tinta-suave`): texto secundario, títulos de apartado de la tarjeta, pestañas inactivas, íconos en reposo, columna "Tu normal".
- **Tinta ceniza** (`tinta-tenue`): metadatos, rótulos en mayúsculas, cabeceras de tabla, números de fila, pasos tachados, pie legal.
- **Velo de paso** (`velo-hover`, blanco al 5 %): hover de botones de ícono, filas de menú y opciones no seleccionadas (al 4 % en filas de tabla). Pista del interruptor apagado.

**Modo alto contraste** (clase `alto-contraste` en `:root`): `superficie` #02030A, `linea` #96AAC4, `tinta` #FFFFFF, `tinta-suave` #ECF0F8, `tinta-tenue` #CED4E2, opacidad de panel 0.97. Fondo, cian y estados no cambian.

### Named Rules
**La Regla del Color con Significado.** Los colores de estado solo aparecen donde hay un estado, y siempre con su ícono de forma propia y su palabra. Nunca como acento decorativo, nunca solos.

**La Regla del Cian es Selección.** El cian significa "elegido, enfocado o la acción principal". Si algo es cian y no se puede elegir ni accionar, sobra.

**La Regla del Velo, no del Bloque.** Lo activo se marca con un velo translúcido del color (10–25 %) y un borde más intenso, no con relleno sólido. Las únicas superficies sólidas de color son la casilla de paso hecho (cian) y la insignia de alertas (coral).

## Typography

**Display Font:** Biryani (con system-ui, Segoe UI, sans-serif)
**Body Font:** Biryani (misma familia)

**Character:** Una sola humanista de ojos abiertos, autoalojada en 400, 600 y 700. La jerarquía sale del peso y del tono de tinta, con un leve tracking negativo global (−0.012em) que la compacta sin endurecerla.

La raíz es fluida: `font-size: clamp(14px, 0.47vw + 8px, 17px)` (14 px en una laptop de 1280, 17 px en 1920). Con texto grande pasa a `clamp(16px, 0.55vw + 9.5px, 20px)`. Todos los tamaños de la UI se expresan en `rem` para que ambos ajustes escalen la interfaz entera.

### Hierarchy
- **Wordmark** (700, 1.05rem, tracking 0.32em): solo la marca "AYNI" en la barra superior.
- **Headline** (600, 1.5rem, interlineado 1.25): título de la tarjeta de acción (zona · estado). La pestaña "próximamente" usa 1.6rem y créditos 1.875rem; son las únicas variantes.
- **Title** (600, 0.92rem): título de panel ("Aptitud del día"). El nombre del perfil sube a 1.1rem. Los títulos de apartado de la tarjeta usan 0.86rem/600 en `tinta-suave`.
- **Body** (400, 0.9rem, interlineado 1.625): texto de procedimiento, "qué cambió", aviso médico, pasos. Texto secundario a 0.86rem en `tinta-suave`. Ancho máximo cómodo de 30ch en el estado vacío de la tarjeta; `max-w-prose` en páginas de lectura.
- **Body-sm** (400, 0.82rem): metadatos (función de la zona, fuente, datos de barra superior, pie a 0.76rem).
- **Data** (400, 0.8rem, cifras tabulares): celdas de tabla, valores, día de misión, rangos de la línea base. Estados en tabla a 0.74rem.
- **Label** (600, 0.72rem, tracking 0.08em, MAYÚSCULAS, `tinta-tenue`): la clase `.rotulo`. Título de sección dentro de paneles, menús y del bloque de aviso médico; cabeceras de tabla usan el mismo tamaño en 400 y sin mayúsculas.

### Named Rules
**La Regla de la Cifra Tabular.** Todo número que se compara (valores, rangos, días, conteos, numeración de filas y pasos) lleva cifras tabulares.

**La Regla del Rótulo como Título.** El rótulo en mayúsculas es el título de su sección, nunca un antetítulo apilado sobre otro encabezado.

**La Regla de los Tres Pesos.** Solo existen 400, 600 y 700 porque son los únicos que se cargan. 700 es exclusivo de la marca y de la insignia numérica.

## Layout

Lienzo completo con la UI flotando encima. El documento es una columna flexible: barra superior fija de 3rem (48 px a la base) y debajo el panel de la pestaña ocupando el resto.

**Escritorio (≥ 1024 px, `lg`)**: la escena 3D llena todo el panel de la pestaña. La UI 2D se coloca con porcentajes del viewport para que el cuerpo quede libre en el centro:
- Columna izquierda: `left 0.8%`, ancho 27.3 %, de `top 2%` a `bottom 7%`, con panel de aptitud sobre la tabla de zonas (separación 0.625rem).
- Columna derecha: `right 1.1%`, ancho 31 %, misma altura, tarjeta de acción centrada verticalmente y con desplazamiento interno.
- Control de capas centrado abajo (a 0.75rem del borde); aviso "No es un diagnóstico médico" y enlace a créditos en la esquina inferior izquierda.
- Barra superior en una línea: marca, pestañas, y a la derecha idioma, tripulante · día · entorno, chip de datos sintéticos, campana y avatar (separación 0.75rem).

**Estrecho (< 1024 px)**: la barra superior se parte; las pestañas bajan a una fila propia de 2.75rem con desplazamiento horizontal y filete superior. La pestaña se vuelve una columna con scroll: escena a 62vh con el control de capas encima, y debajo aptitud, tabla de zonas y tarjeta apiladas con márgenes de 0.75rem. Tripulante, día y entorno se ocultan de la barra (viven en el perfil).

**Ritmo**: escala de Tailwind en `rem`. 0.25–0.5rem dentro de controles, 0.75rem entre controles, 1rem de relleno en paneles de resumen, 1.25rem en la tarjeta de acción y el perfil, 1.75rem entre secciones del perfil. Las filas de tabla son densas (≈0.45rem de relleno vertical) con divisores, no tarjetas.

## Elevation & Depth

La profundidad la pone el espacio 3D, no la UI. Los paneles en reposo son planos: separan el contenido del fondo por translucidez tintada (`superficie` al 88 %) y un filete fino, sin sombra. La sombra aparece solo en lo que flota sobre otra UI: menús desplegables y el panel lateral del perfil. Las etiquetas flotantes del cuerpo usan desenfoque de fondo porque viven sobre la escena.

### Shadow Vocabulary
- **Menú flotante** (`box-shadow: 0 12px 32px rgb(0 0 0 / 0.45)`): desplegable de alertas y menú de capas.
- **Panel lateral** (`box-shadow: -16px 0 40px rgb(0 0 0 / 0.45)`): cajón del perfil que entra desde la derecha, sobre un velo de `fondo-profundo` al 60 %.

### Named Rules
**La Regla del Vidrio sobre el Espacio.** Un panel en reposo es vidrio oscuro con filete, nunca una tarjeta con sombra. La sombra se gana flotando encima de otra interfaz.

## Shapes

Geometría contenida de esquinas suaves y filetes de 1 px. Dos radios hacen casi todo: 8 px (`rounded.lg`) para contenedores (`.panel`, tarjeta, menús) y 6 px (`rounded.md`) para controles (botones, segmentos, chip, campo, bloque de aviso, filas seleccionables). 4 px (`rounded.sm`) para la casilla de paso y el contorno de foco. El redondeo completo se reserva para lo que es un punto o una píldora: avatar, insignia de alertas, interruptor, subrayado de pestaña y etiquetas flotantes sobre el cuerpo. El cajón del perfil anula el radio y los bordes salvo el izquierdo, porque es un borde de pantalla.

Los íconos de estado son formas, no glifos: círculo con check (normal), triángulo con exclamación (atención), octógono con exclamación (crítico) y círculo vacío con guion (sin dato), con el trazo interior en `fondo-profundo`. Los íconos de interfaz son lucide-react de trazo fino (1.8), 15–18 px.

### Named Rules
**La Regla de los Dos Radios.** 8 px contiene, 6 px se pulsa. La píldora solo para avatares, insignias, interruptores y etiquetas sobre el cuerpo.

## Components

### Buttons
Discretos y táctiles: bordes finos y velos, nunca bloques de color.
- **Shape:** esquinas suaves (6 px), relleno 0.625rem × 0.75rem (1rem horizontal en botones sueltos), texto 0.88rem.
- **Primary:** velo cian al 15 % con borde cian al 60 %, texto `tinta` en 600 ("Medir ahora", "Volver al cuerpo"). Hover sube el velo al 25 %.
- **Secondary:** transparente con borde `linea`, texto `tinta` en 400 ("Ver evolución"). Hover cambia el borde a `tinta-tenue`.
- **Icon:** 2rem × 2rem, transparente, ícono en `tinta-suave`; hover con `velo-hover` y tinta plena. Variante con borde `linea` para los pasos de día; deshabilitado al 40 %.
- **Hover / Focus:** transiciones de color de 150 ms; foco global de 2 px en cian con 2 px de separación y 4 px de radio.
- En la tarjeta, los dos botones comparten fila a partes iguales bajo un filete `linea` al 60 %.

### Chips
- **Datos sintéticos:** borde cian al 45 %, texto cian a 0.72–0.76rem, sin relleno, radio 6 px. Es una etiqueta de honestidad siempre visible, no un control.
- **Segmentos (ES/EN, modos de capa):** grupo con borde `linea` y radio 6 px recortado; opción activa con velo cian (15–20 %) y tinta plena, inactivas en `tinta-tenue` con hover a tinta.

### Cards / Containers
- **Corner Style:** 8 px.
- **Background:** `superficie` al 88 % (97 % en alto contraste).
- **Shadow Strategy:** ninguna en reposo (ver Elevation & Depth).
- **Border:** 1 px `linea` al 70 %.
- **Internal Padding:** 1rem en paneles de resumen, 1.25rem en la tarjeta de acción, 0.5rem en la tabla (las celdas aportan el resto).
- Las listas dentro de paneles son filas con divisores `linea` al 50 %, etiqueta a la izquierda y estado o valor alineado a la derecha.

### Inputs / Fields
- **Select:** fondo `fondo-profundo`, borde `linea`, radio 6 px, relleno 0.5rem × 0.75rem, texto 0.9rem.
- **Range:** nativo con `accent-color` cian.
- **Interruptor:** pista de 2.25 × 1.25rem en píldora; apagado con borde `linea` y `velo-hover`, perilla `tinta-tenue`; encendido con borde cian, pista cian al 30 % y perilla cian. Transición de 200 ms. Etiqueta a la izquierda, ancho completo.
- **Focus:** el contorno cian global; las casillas ocultas lo proyectan sobre su caja visible.

### Navigation
- **Pestañas:** texto 0.86rem, inactivas en `tinta-suave` con hover a tinta; activa en 600 y `tinta` con subrayado cian de 2 px redondeado, inset 0.75rem, que aparece por opacidad en 200 ms. Ocupan la altura completa de la barra. Flechas, Inicio y Fin mueven el foco.
- **Barra superior:** `fondo-profundo` al 80 % con filete inferior cian al 25 %, la única línea cian estructural del sistema.
- **Móvil:** las pestañas pasan a una fila desplazable de 2.75rem bajo la marca.

### Tarjeta de acción (Signature Component)
El procedimiento de a bordo. Encabezado con ícono de estado de 20 px, "Zona · Estado" en headline (el estado en su color) y la función de la zona en `tinta-tenue`; botón de cerrar. Apartados en orden fijo: qué cambió (body en tinta, explicación en `tinta-suave`), qué hacer ahora (pasos numerados), aviso al médico de vuelo, por qué pasa en el espacio y fuente (enlace cian subrayado con ícono externo de 12 px). Separación de 1.25rem entre apartados; el cuerpo desplaza y el pie de acciones queda fijo.
- **Pasos:** casilla de 1.1rem con radio 4 px y borde cian al 70 %; hecha, se rellena de cian con check en `fondo-profundo`. Número en cian 600 tabular; el texto hecho pasa a `tinta-tenue` tachado.
- **Aviso médico:** bloque con radio 6 px y relleno 0.75rem × 1rem. Fuera de la normal toma el velo y borde del estado (ámbar 8 %/55 %, coral 10 %/60 %) y su rótulo se escribe en el color del estado; en normal, solo borde `linea` al 70 %.
- **Estado vacío:** panel con una frase en `tinta-suave` que invita a elegir una zona.

### Tabla de zonas
Tablero denso ordenado por gravedad: número de fila en `tinta-tenue`, zona como botón, estado con ícono de 13 px y palabra en su color, valor en tinta y "Tu normal" en `tinta-suave`, ambos tabulares y alineados a la derecha. Filas con filete `linea` al 45 %; hover al 4 % de blanco; fila elegida con velo cian al 10 % y nombre en 600. Pasar por una fila resalta la zona en el cuerpo.

### Etiqueta de zona
Píldora sobre el cuerpo 3D para zonas en alerta: `fondo-profundo` al 80 % con desenfoque de fondo, borde del color del estado, ícono, nombre y estado separados por un punto medio en `tinta-tenue`, texto 0.75rem. El tooltip de hover usa la misma composición con radio 6 px y sin borde.

## Do's and Don'ts

### Do:
- **Do** usar los tokens `tinta`, `tinta-suave`, `tinta-tenue`, `linea` y `superficie` (vía variables CSS) para todo texto, filete y superficie, para que alto contraste funcione sin trabajo extra.
- **Do** acompañar cada color de estado con `IconoEstado` y la palabra del estado, leídos de `src/config`.
- **Do** marcar lo activo con un velo cian (10–25 %) y un borde cian (45–70 %), con texto en `tinta`.
- **Do** contener en `.panel` (8 px, `superficie` al 88 %, filete `linea` al 70 %) y titular secciones internas con `.rotulo`.
- **Do** expresar tamaños en `rem` y números con cifras tabulares.
- **Do** limitar las transiciones a color, opacidad y desplazamiento corto (150–200 ms) y dejar que el modo de movimiento reducido las anule.
- **Do** mantener visibles la etiqueta "Datos sintéticos" en la barra y "No es un diagnóstico médico" en el pie.

### Don't:
- **Don't** usar la escala gris o slate de Tailwind ni blancos o negros literales para texto y filetes; rompen el modo alto contraste.
- **Don't** rellenar botones con cian sólido ni pintar fondos de panel con colores de estado; el único tinte de estado sobre superficie es el bloque de aviso (8–10 %).
- **Don't** escribir texto en `estado-sinDato`; su contraste sobre el fondo no llega a AA en tamaños pequeños. El texto "Sin dato" va en `tinta-tenue`.
- **Don't** poner sombra a un panel en reposo; la sombra es solo para menús y el cajón del perfil.
- **Don't** usar pesos fuera de 400, 600 y 700 (no se cargan) ni una segunda familia tipográfica.
- **Don't** usar el rótulo en mayúsculas como antetítulo encima de otro encabezado.
- **Don't** usar el cian para decorar: si es cian, se puede elegir, accionar o está enfocado.
