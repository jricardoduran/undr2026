# Kobalt Exacto — contrato conceptual, NO release ejecutable

**Fecha de síntesis:** 2026-11-10 (America/Bogota).  
**Estado:** recuperación y formalización documental del concepto trabajado; no se ha localizado ni verificado un ejecutable independiente llamado «Kobalt Exacto». **Este archivo no es un kernel implementado.**

## Pregunta

¿Qué material exacto es este conjunto de bytes, sin introducir automáticamente historia, actualidad, propietario o continuidad?

## Reducción mínima

Para una secuencia finita de bytes `B` y una derivación válida en el contexto/vista `D`:

`Q = ContentId_D(B)`

- `Q` reconoce la **realización material exacta** de `B` en ese contexto de derivación.
- Se pueden guardar y reutilizar objetos inmutables por `Q` y verificar un objeto recibido recalculando su `ContentId`.
- El mismo `B` bajo el mismo contrato de derivación produce el mismo `Q`.
- Si cambia `B`, normalmente cambia `Q`; las funciones hash no garantizan matemáticamente ausencia absoluta de colisiones.
- `Q` no es, por sí solo, la identidad longitudinal de un producto, una cuenta ni una continuidad mutable.

## Lo que no constituye

No introduce por defecto `HEAD`, `Current`, versiones, propietario, permisos, actualización de estado, trayectoria, almacenamiento ni red. Tampoco promete identidad semántica entre documentos de bytes diferentes.

## Relación con los otros kernels

- **Minimal Flat:** constituye coordenadas y versiones; un objeto exacto puede ser material de una versión, pero la versión no se deduce del hash.
- **KOB2:** distingue identidad `I`, contenido exacto `Q`, `Cell` y gramática `EMIT`/`EXPAND`/`FOLLOW`; no es una implementación de «Exacto» independiente.

## Importante

Este documento describe **un contrato**, no una API congelada. No incluye ningún archivo `.js` propio de «Exacto» porque no hay evidencia de una release autónoma verificada. La interoperabilidad formal de los tres enfoques tampoco está verificada.

Fuentes recuperadas: discusiones sobre «Kobalt Exacto / Álgebra Exacta de Artefactos» de octubre de 2026; `2026-11-10_1236_KOBALT_FIBRA_ANCLAJE_CAUCE_CONSOLIDADO_CONCEPTUAL.md`; `2026-11-09_1613_KOBALT_MINIMAL_DISENO_ADQUISICION_COMPLETITUD_Y_COMERCIO.md`.
