---
name: kobalt-kernels
description: Canon matemático y conceptual de Kobalt (Contrato, Cauce/Trayectoria, Fibra, proyecciones H/A/P, kernels Exacto, Minimal Flat y KOB2). Cárgala ANTES de diseñar, especificar, programar, revisar o testear cualquier parte del sistema Kobalt de inventario, POS o ecommerce, o cuando aparezcan stock, disponibilidad, solicitudes, asignaciones, productos, características, filtros, importación, sincronización, Google Drive, IndexedDB, Minimal, Exacto o KOB2. Define las leyes L1–L27 que todo código debe respetar y los supuestos «tradicionales» prohibidos.
---

# Kobalt — canon de kernels e ideas clave

Este proyecto **no** es un inventario tradicional (tabla `productos` con una columna `stock` que se sobrescribe).
Antes de escribir una sola línea, tu trabajo debe poder expresarse con los objetos y leyes de esta skill.
Orden obligatorio: **1) claridad matemática → 2) claridad conceptual → 3) código.**

## 1. Matemática mínima (memorízala)

```
𝒦 = (C, Q, Γ, T, Π)                 un ámbito de compromiso
Accept_C(u,a,S) ⟺ Authorized_C(u,a) ∧ Admissible_C(a,S)
Γ_{n+1} = Γ_n ‖ a_{n+1}   (Γ_n ⪯ Γ_{n+1})      S_n = Fold(S_0, Γ_n)      Respuesta(q) = Π_q(S_n)
Π(Fold(S_0,Γ_m)) = Update(Π(Fold(S_0,Γ_n)), Γ_{n+1:m})          ← la reconstrucción es el oráculo
D_no_asignada = max(0,H−A)    D_prudente = max(0,H−A−P)    Déficit = max(0,A−H)
R ⊆ ∐_k E×{k}×V_k :  sección R_e (ficha) · columna R_k (vector) · fibra F_{k,v} (filtro)
R_σ = Compose(Interpret_{C_i}(Γ_{i,σ_i}))     con σ un corte causalmente cerrado
```

Las leyes completas, numeradas y con su grado de certeza están en **`references/leyes.md`**. Cítalas por número (`L7`, `L10`…) en especificaciones, tests, commits y revisiones. Las más violadas:

- **L7 Guardas ≠ invariantes.** `H ≥ A` es guarda de `Asignar`, no invariante: un conteo físico puede dejar `H < A`.
- **L10 Incrementalidad ⟺ congruencia.** Una proyección se actualiza sin consultar el estado sólo si su núcleo es una congruencia. `max(0,H−A)` no lo es.
- **L12 Sin doble descuento.** `Asignar` una solicitud pendiente mueve `q` de `P` a `A`: `D_prudente` no cambia.
- **L13 Unión, no mínimo.** Las solicitudes de varios nodos se unen por identidad; `min(D_B, D_C)` es incorrecto.
- **L16 Autoridad previa.** El orden de llegada, una copia o una caché no dan autoridad.
- **L17 Orientación ⟂ autoridad ⟂ materialidad.**

## 2. Glosario (usa estas palabras y sólo con este significado)

| Término | Significa | No es |
|---|---|---|
| **Contrato** `C` | Ámbito, quién puede constituir qué, operaciones, admisión y continuidad. Se declara **antes** | Un permiso inferido del flujo |
| **Propósito** | Lo que alguien pretende conseguir | Un hecho |
| **Solicitud** | Expresión persistible de un propósito, con identidad | Asignación ni reserva |
| **Compromiso** | Acción admitida e incorporada a una trayectoria | «Ejecutado en el mundo físico» |
| **Trayectoria / Cauce** `Γ` | Secuencia append‑only de compromisos de un ámbito | El vector de cantidades |
| **Actualidad** `S` | `Fold(S_0, Γ)`: estado interpretado hasta un corte | Otra fuente de verdad |
| **Proyección** `Π_q` | Representación reconstruible que responde la pregunta `q` | Escritor autorizado |
| **Fibra** | Conjunto de entidades que comparten un valor; en general, el álgebra sección/columna/fibra | Un índice canónico |
| **Sección / Columna** | Lectura por entidad / por característica | La autoridad del hecho |
| **Checkpoint** | `(StreamID, n, h_n, versiónRegla[, t_ref])` | Un hash suelto |
| **Corte** `σ` | Conjunto de checkpoints causalmente cerrado | Un «ahora» global |
| **Irradiación** | Distribución de compromisos reconocidos hacia otros nodos | Constitución |
| **Ámbito** | Componente conexa del grafo de co‑acceso atómico (L20) | Una tabla |
| **Coproducto** | Composición disjunta que conserva procedencia | Consenso ni unión de valores |
| **Época** | Vigencia de una versión de contrato; las migraciones cambian de época | Una versión de software |
| `H`, `A`, `P` | Existencias físicas, asignadas no despachadas, pendientes elegibles | Columnas editables |
| `I`, `Q`, `N` | Identidad longitudinal, contenido exacto, nombre o coordenada | Intercambiables |

## 3. Supuestos tradicionales PROHIBIDOS

Si tu diseño o código contiene alguno, está mal aunque las pruebas pasen:

1. `UPDATE productos SET stock = stock - 1`, o cualquier estado mutable sin una trayectoria que lo explique.
2. Un objeto «Producto» canónico que guarda todo (color, categoría, stock, precio) como autoridad. La ficha es una composición.
3. Editar o borrar compromisos para corregir. La corrección es una nueva acción.
4. Codificar guardas como invariantes de tipo: `unsigned`, `CHECK (stock >= 0)`, aserciones en el constructor del estado (viola L7).
5. Descontar una solicitud al registrarla y otra vez al asignarla (viola L12).
6. Combinar disponibilidades de varios nodos con `min`, `max` o suma de agregados (viola L13).
7. «El timestamp mayor gana» o last‑write‑wins como autoridad. Resolver un `FORK` por heurística.
8. Escribir directamente en un índice, filtro, vector derivado, caché o snapshot como si fuera la fuente.
9. «Hash = identidad del producto»; «cifrado = propietario»; «dos `put()` ordenados = transacción».
10. Una transacción global para un alta que toca varios ámbitos (catálogo, inventario, oferta). Cada ámbito compromete lo suyo; la UI muestra qué falta.
11. Un importador que decide la autoridad por el formato del archivo, o que no es idempotente (L24).
12. Meter semántica de negocio (producto, bodega, precio) dentro de un kernel.
13. Mutar un archivo «cabeza» en Google Drive esperando ETag o If‑Match.
14. Afirmar garantías distribuidas (consenso, exclusión entre dispositivos, durabilidad) a partir de pruebas de un solo proceso.

## 4. Kernels: resumen operativo

- **Exacto**: `Q = ContentId_𝒟(B)`. Es solo un contrato, **no hay `.js`**. Hoy se realiza con `KOB2.Derivation.contentId` o con SHA‑256 bajo un contrato de derivación explícito.
- **Minimal Flat 1.0.0**: coordenadas compactas, nombres prefijables y versiones selladas (AES‑GCM, +28 B). **Al leer hay que recomprobar `stateFingerprint`.**
- **KOB2 9.0.1 + Mechanisms 1.0.0**: `EMIT/EXPAND/FOLLOW`, `Trajectory ≠ Index`, `Recognition`, `Resolution` con `FORK`. FOLLOW cuesta O(n) por publicación.
- Contrato, admisión, solicitudes, H/A/P y proyecciones son **mecanismos nuevos**: ningún kernel los trae.

Detalle en `references/kernels.md`. Los originales están en `kobalt/kernels/`: **nunca se modifican** (comprobar con `sha256sum -c kobalt/kernels/SHA256SUMS.txt`).

## 5. Procedimiento obligatorio para cualquier tarea

1. **Ubica la tarea**: ¿qué ámbitos (L20) toca? ¿Qué contrato rige cada hecho? ¿Qué preguntas `q` se responden?
2. **Escribe la matemática primero**: estado `S`, acciones `A` con sus guardas, `T`, invariantes `V_C` (separadas de las guardas), proyecciones `Π_q` y, si es incremental, su congruencia (L10).
3. **Enumera las leyes aplicables** por número y cómo se verificará cada una (ver la skill `kobalt-verificar-leyes`).
4. Solo entonces escribe el diseño conceptual y, al final, el código.
5. Etiqueta cada afirmación con su certeza: **[T] [V] [D] [P] [L]**. Nunca presentes como garantizado algo [P] o [L].
6. Si dependes de una decisión de `references/decisiones-abiertas.md`, **detente y pregunta**. No la decidas tú.

## 6. Fuentes
- `references/leyes.md`: leyes L1–L27, objetos y demostraciones.
- `references/kernels.md`: qué aporta y qué no cada kernel.
- `references/decisiones-abiertas.md`: decisiones del usuario y supuestos de Drive por verificar.
- `kobalt/docs/…ATLAS_TECNICO_COMPLETO.md`: atlas exhaustivo de los tres kernels.
- `kobalt/docs/…ANALISIS_KERNELS_Y_DRIVE_NOTA.md`: nota de análisis del inventario y Drive.
