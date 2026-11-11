# Los tres kernels: qué aportan y qué NO

Código original (no modificar; hashes en `kobalt/kernels/SHA256SUMS.txt`):

| Kernel | Archivo | Estado |
|---|---|---|
| KOB2 9.0.1 | `kobalt/kernels/KOB2/2026-09-18_0100_KOB2_KERNEL_9_0_1.js` | [E] 26/26 pruebas |
| Kobalt Mechanisms 1.0.0 | `kobalt/kernels/KOB2/2026-09-18_0100_KOBALT_MECHANISMS_1_0_0.js` | [E] 11/11 pruebas |
| Minimal Flat 1.0.0 | `kobalt/kernels/Minimal/2026-09-11_0014_kobalt-minimal-flat-1.0.0.js` | [E] 38/38 (histórico) |
| Exacto | `kobalt/kernels/Exacto/…_CONTRATO_CONCEPTUAL_NO_RELEASE.md` | [D] **solo contrato, sin `.js`** |

Para el detalle exhaustivo (formatos, APIs, constantes): `kobalt/docs/2026-11-10_2043_KOBALT_TRES_KERNELS_ATLAS_TECNICO_COMPLETO.md`.

## Tres preguntas irreducibles

| Kernel | Pregunta | Reducción |
|---|---|---|
| **Exacto** | ¿Qué material exacto es este conjunto de bytes? | `Q = ContentId_𝒟(B)` |
| **Minimal Flat** | ¿Cómo localizo y versiono material de forma compacta bajo una jurisdicción? | `(U,N,A,C,V) ↦ Name ↦ Material`; `Coordinate + Version + Transform` |
| **KOB2** | ¿Cómo reconozco, sigo y compongo identidades y realizaciones? | `Cell = descriptorSlot[4] ‖ referent[32]`; `EMIT / EXPAND / FOLLOW` |

## Exacto (contrato)
- **Aporta:** identidad de bytes reproducible, reverificación al adquirir, deduplicación e inmutabilidad por referencia. Sirve para imágenes, documentos, assets y para identificar prefijos.
- **No aporta:** `Current`, historia, propietario, permisos, canonicalización semántica ni almacenamiento. «Exacto» **no** equivale a `JSON.stringify` ni a `SHA256(B)` sin contexto: hay que fijar el contrato de derivación (dominio, algoritmo, encuadre).
- Implementación real disponible hoy: `KOB2.Derivation.contentId(view, B)`, que **no** es una release de Exacto.

## Minimal Flat 1.0.0
- **Carga:** IIFE sobre `globalThis.KobaltMinimalFlat`; en Node: `require(ruta); const M = globalThis.KobaltMinimalFlat`.
- **API:** `identity.{generic,user,app,continuity}`, `randomNodeId`, `registrarPrefix`, `table.{empty,count,get,find,ensure}`, `varuint.{encode,decode,decodeAt}`, `names.{userTable,userPrefix,nodePrefix,appPrefix,appTable,continuityTable,continuityBase,version,decode,latestVersion}`, `version.{nextTimestamp,stateFingerprint,coordinate,encodeTimestamp,decodeTimestamp}`, `seal`, `open`.
- **Aporta:** slots compactos (varuint, 1‑based, 0 reservado para tablas), nombres prefijables `registrarPrefix ‖ varuint(user) ‖ nodeId ‖ varuint(app) ‖ varuint(cont) ‖ ts[8] ‖ fp[8]`, coproducto de escritores por registrador/usuario/nodo, AES‑256‑GCM con el nombre como AAD.
- **No aporta:** consenso, single‑writer impuesto, almacenamiento (`get/put/list` los pone un adapter), firmas, ACL, detección de `FORK`. `latestVersion` (mayor timestamp) es un criterio local, no autoridad. `seal` no comprueba que el fingerprint del nombre corresponda al payload; `open` tampoco: **hay que recomprobarlo al leer**.

## KOB2 9.0.1 + Mechanisms 1.0.0
- **Carga:** `const K = require(…KOB2_KERNEL_9_0_1.js); const M = require(…MECHANISMS_1_0_0.js)`; pruebas: `node kobalt/kernels/Verificacion/2026-11-10_2043_RUN_KOB2_TESTS.js`.
- **Aporta:** `I` (identidad longitudinal) ≠ `Q` (contenido) ≠ `N` (nombre de una Cell); `Trajectory` (historia; solo `EMIT/EXPAND`, sin `FOLLOW` dentro) frente a `Index` (composición espacial); `Recognition` (accepted, otherCell, rejected); `Resolution` (NO_EVIDENCE, UNRECOGNIZED, EXACT, EMPTY, CHAIN, FORK). Mechanisms: `Continuity`, `Publication` (realización ≺ FOLLOW, que **no** es atómico), `CoordinateTable`, `Coproduct`, `Evidence` (FOUND, ABSENT, NO_CLAIM), `Closure`, `DescriptorTable`, `Principal/Domain/Authority` con verificador inyectado.
- **No aporta:** semántica de inventario o precios, transacciones entre storages, consenso, firmas ni durabilidad. `Keyed` usa AEAD determinista, que revela la igualdad de objetos. FOLLOW reescribe toda la trayectoria (coste O(n) por publicación).

## Uso decidido para el inventario (estado al 10‑nov‑2026)
| Necesidad | Kernel candidato | Condición |
|---|---|---|
| Coordenadas compactas de entidades y características (bitsets de fibra) | Minimal (slots) | Tablas append‑only; el slot no se reasigna |
| Identidad de bytes (imágenes, sobres, prefijos) | Exacto vía `KOB2.Derivation.contentId` o SHA‑256 con un contrato de derivación explícito | Fijar el dominio y el encuadre |
| Historia y evidencia de continuidad | Ideas de KOB2 (prefijo, FORK) | No usar FOLLOW monolítico para trayectorias largas |
| Contrato, admisión, solicitudes, H/A/P, proyecciones | **Mecanismos nuevos** (no los traen los kernels) | Verificados contra las leyes L3–L16 |

**Regla:** la arquitectura comercial **no** es automáticamente una implementación de estos kernels. Se reutiliza su código sólo después de verificar la correspondencia, y nunca se introduce semántica de negocio dentro de un kernel.
