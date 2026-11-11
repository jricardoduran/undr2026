# KOBALT — tres enfoques, atlas técnico completo

**Preparado:** 2026-11-10, UTC−5. Archivos ejecutables originales conservados íntegros.

## Documento principal

Leer primero **`Documentacion/2026-11-10_2043_KOBALT_TRES_KERNELS_ATLAS_TECNICO_COMPLETO.md`**. Es el atlas integral (~9.380 palabras) con propiedades, geometría matemática, tamaños, APIs, criptografía, flujos, invariantes, mecanismos, pruebas, ejemplos, límites e interoperabilidad de:

- **KOB2 9.0.1:** archivo de kernel y mecanismos ejecutables originales.
- **Kobalt Minimal Flat 1.0.0:** archivo de kernel ejecutable original.
- **Kobalt Exacto:** únicamente contrato conceptual; **no existe aquí un kernel Exacto `.js` independiente verificado**.

## Comprobaciones

- `node Verificacion/2026-11-10_2043_RUN_KOB2_TESTS.js` ejecuta la suite real publicada de KOB2 y sus mecanismos y genera el reporte JSON.
- `Verificacion/2026-11-10_2043_MINIMAL_PRUEBA_BASICA.html` es una pequeña prueba complementaria que se puede abrir en navegador. **No sustituye la verificación histórica 38/38 del Minimal original**.
- `SHA256SUMS.txt` documenta los hashes de todos los archivos que contiene este paquete, salvo el propio manifiesto.

## Precauciones

- No se modificaron los tres JavaScript originales.
- Las integraciones, los adapters de storage y las propiedades distribuidas no están implementadas por el mero hecho de disponer del núcleo.
- No confundir el término «kernel» del contrato Exacto con una tercera release ejecutable.
