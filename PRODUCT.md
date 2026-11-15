# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Usuario real:** astronauta en una misión de larga duración (estación, base lunar o marciana) que se autoevalúa sin depender de la Tierra. Mide, entiende y actúa sobre su salud a diario, a menudo cansado, con poco tiempo y sin médico a su lado.
- **Audiencia inmediata:** el jurado del NASA Space Apps Challenge 2026 (reto *Create Health Monitoring Software for Astronauts on Space Missions*), que verá una demo corta proyectada desde una laptop. Es internacional: la interfaz debe poder leerse en inglés.

## Product Purpose

AYNI (quechua: *reciprocidad*) permite al astronauta **medir, entender y actuar** sobre su salud. El éxito es que, en segundos, sepa qué zona de su cuerpo se aparta de su normal, por qué pasa en el espacio, qué hacer ahora y cuándo avisar al médico de vuelo.

## Positioning

El cuerpo es la interfaz: cada indicador vive en una zona de un cuerpo anatómico 3D por capas, coloreada según los sensores frente a la **línea base personal de 14 días** del propio tripulante, no frente a una norma poblacional. Cada alerta trae una sola acción clara y su criterio de aviso médico.

## Operating Context

- Tres pestañas: **Cuerpo 3D** (inicio), **Evolución y predicción**, **Medir y dispositivos**; un **chat AYNI** lateral; barra superior con tripulante, día de misión, entorno, etiqueta de datos sintéticos, alertas y un panel de perfil (tripulante, entorno, accesibilidad, modo demo).
- Uso a bordo: rutina diaria de mediciones con dispositivos genéricos (muñeca, brazo, frente) y registros manuales (ánimo, síntomas, prueba de reacción).
- Demo: el modo demo elige escenario (p. ej., fatiga) y salta de día para mostrar cómo cambia el cuerpo.
- Pantalla principal: laptop o escritorio, proyectada; el móvil debe funcionar pero no es el escenario principal.

## Capabilities and Constraints

- Web con Vite + React 18, Tailwind, Zustand y React Three Fiber; desplegada en Vercel. Especificación completa en `docs/AYNI_SPEC.md`, fuente de verdad.
- Motor de evaluación puro y testeado; la interfaz no calcula estados.
- Indicadores, umbrales, textos, dispositivos y entornos viven en JSON de `src/config/`; nada de eso se codifica en componentes.
- Funciona sin conexión salvo el chat; la clave del modelo de lenguaje solo existe en el servidor.
- Idiomas: español e inglés con selector.
- Fuera de alcance: transmisión a Tierra, diagnóstico o prescripción, hardware real, autenticación.

## Brand Commitments

- Nombre **AYNI**.
- Dirección 3D fijada por la especificación: "holograma médico a bordo" (fondo espacial oscuro, cuerpo anatómico semitransparente con bordes luminosos, capas). La paleta de estado es fija y siempre va con ícono y texto: Normal `#34D399`, Atención `#FBBF24`, Crítico `#F87171`, Sin dato `#64748B`; acento cian `#22D3EE`; fondo `#050816` → `#0B1026`.
- Voz calmada, cercana y simple; nunca lenguaje de diagnóstico.

## Evidence on Hand

- Datos **sintéticos** reproducibles (`public/data/sinteticos.csv`, escenarios en `src/config/escenarios.json`) y tripulantes de ejemplo (`src/config/tripulantes.json`). No hay datos reales de astronautas, usuarios, testimonios ni validación clínica: no se deben inventar.
- Fuentes citables: NASA Human Research Program (enlaces por indicador en `src/config/indicadores.json`).
- Modelo anatómico 3D con licencias CC BY-SA / CC0 acreditado en `/creditos`.

## Product Principles

1. El cuerpo es la interfaz: todo indicador vive en una zona del cuerpo 3D.
2. Tu valor frente a tu normal: siempre se ve la línea base personal.
3. Una sola acción clara por alerta, más cuándo avisar al médico de vuelo.
4. Ninguna medición sin su guía.
5. Honestidad visible: "Datos sintéticos" y "No es un diagnóstico médico" siempre presentes.

## Accessibility & Inclusion

Contraste AA, foco visible, navegación por teclado en pestañas y capas, `aria-label` en los controles del 3D, color siempre acompañado de ícono y texto, modo de movimiento reducido (respeta `prefers-reduced-motion` y el ajuste del perfil), texto grande y alto contraste como ajustes del perfil. Objetivo Lighthouse ≥ 85 en accesibilidad.
