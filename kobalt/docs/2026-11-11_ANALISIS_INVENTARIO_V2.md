# Kobalt — Análisis del Sistema de Inventario v2 y mejora por claridad (no por mecanismos)

**Fecha:** 2026‑11‑11 · **Objeto:** paquete `KOBALT_SISTEMA_INVENTARIO_V2_COMPLETO` (HTML autónomo, `Fuentes/core.js`, `Fuentes/app.js`, manual, API, flujos y verificación).
**Criterio:** menos mecanismos y más claridad. Cada propuesta **quita** piezas y explica la ley que las sustituye.

---

## 1. Qué es la v2 (lectura fiel)

- **Una Trayectoria local** (`events` en IndexedDB) con `seq`, `opId`, `actor`, `v`, `kind`, `data`, `prevHash` y `hash` (`sha256/240` sobre JSON canónico). El compromiso es atómico: la cabecera y el evento se escriben en una transacción.
- **El estado es `replay(log)`.** Fichas, Flat y filtros son proyecciones. La UI y las automatizaciones entran por la **misma API** (`window.KobaltAPI`: `command`, `query`, `verify`, `exportBackup`, `restoreBackup`, `subscribe`, `media`).
- **22 tipos de acción**, en un `switch` de `core.js:41–103`:
  - usuarios y clientes;
  - producto y variante;
  - campos personalizados;
  - medios;
  - existencias;
  - ventas (crear, reservar, despachar, cancelar, cobrar);
  - devoluciones (crear, recibir, reembolsar);
  - `BATCH`.
- **14 consultas cableadas** (`app.js:32–100`).
- **Pruebas:** 50/50 del núcleo y 32/32 de la API con IndexedDB simulado. Faltan las del navegador real.

### Lo que está bien y se conserva
1. La Trayectoria constituye y la ficha expresa (interacción 3), aplicado de verdad: no hay escritura directa a proyecciones.
2. Una sola puerta para la UI y las automatizaciones.
3. Distinciones comerciales correctas, con verificaciones que lo demuestran:
   - venta ≠ asignación ≠ despacho ≠ cobro;
   - devolución ≠ recepción ≠ reembolso;
   - **precio acordado ≠ precio sugerido**.
4. Idempotencia por `opId`; slots que no se reutilizan; cero conocido al crear.
5. Honestidad epistémica sobre lo que no prueba: autenticación, consenso, banco, Drive.

---

## 2. Diagnóstico: dónde hay más mecanismo que claridad

| # | En la v2 | Evidencia | Ley que lo sustituye |
|---|---|---|---|
| a | **Seis contadores de identidad**: `nextProduct`, `nextSlot`, `nextUser`, `nextCustomer`, `nextSale`, `nextReturn`. Cada acción exige «ID consecutivo» | `core.js:21`, comprobaciones en `:43–:94` | **Una ley (L28 generalizada):** la identidad de toda entidad es **la posición `n` de su compromiso de nacimiento** en `Γ`. Solo las variantes necesitan además un *slot* denso para los Flat. Desaparecen cinco contadores y sus validaciones, y el cliente ya no propone IDs |
| b | **Dos regímenes de campos:** campos fijos validados a mano (`PRODUCT_UPDATE` y `VARIANT_UPDATE` con listas blancas) y campos personalizados `namespace:clave` sin tipo (`cleanCustom`) | `core.js:14`, `:54–:61` | **Una Forma:** toda característica, canónica (`core:color`) o del comercio (`comercio:temporada`), se declara con su **clase** y su tipo. `PRODUCT_UPDATE`, `VARIANT_UPDATE`, `CUSTOM_SET`, `PRODUCT_RETIRE` y `STOCK_MIN` son la misma acción `Fijar(e,k,v)` |
| c | **`STOCK_MIN` dentro de la familia de existencias** | `core.js:72–76` | El mínimo es una **característica de asignación** (umbral). «Bajo stock» es una fibra (L32), no una operación de stock |
| d | **~12 validaciones ad hoc de cantidades y dinero**: «excede despachado», «sin asignación», «pago excede», «reembolso supera», «recepción excede»… | `core.js:82–100` | **Una ley de conservación** (§3): unidades y dinero son **fichas en depósitos**; ninguna transición deja un depósito restringido por debajo de cero. Verificado: **0 discrepancias en 23.182 acciones** |
| e | `MEDIA_ATTACH` y `MEDIA_DETACH` como acciones propias | `core.js:66–71` | Clase **referencia**: `Añadir` y `Quitar` sobre la característica `galería` |
| f | **14 consultas cableadas** | `app.js:32–100` | **Una puerta de preguntas** `(φ, f, M, obs, ventana)` (L32). `catalog.search` = fibras; `stock.vector` = columna; `stock.metrics` = sección de depósitos; `timeline.at` = corte; `timeline.events` = ventana de `Γ`; `verify` = pregunta de integridad |
| g | **Cada `command` carga la trayectoria entera, la verifica y la reinterpreta** (y busca `opId` recorriéndola) | `app.js:15–19` | Coste O(n) por compromiso, **O(n²) en total**, cuando la arquitectura ya lo resuelve: checkpoint `(n, h_n)` + verificación del sufijo + `sid` en el estado (L4, L9, L13, L22) |
| h | **Formato de hash propio** (`sha256/240` sobre JSON canónico), distinto del núcleo de la fase 1 (codificación CV + derivación KOB2) | `core.js:15–20` | **Un solo contrato de derivación** (Exacto). Dos formatos de hash serían dos mecanismos de identidad de bytes |
| i | **`SALE_CANCEL`** prohíbe cancelar si hay algo despachado o cobrado | `core.js:88` | Con depósitos, cancelar es **mover lo pendiente y lo asignado a `cancelada`**. Lo despachado se devuelve y lo cobrado se reembolsa por sus propias transiciones; desaparece la excepción |

---

## 3. La claridad central: una red de flujo (red de Petri)

### 3.1 Matemática

Una **red de flujo** `𝒩 = (L, T, W)` se define así:
- `L`: depósitos (lugares), por ejemplo `H_v` físico apto, `asig_s`, `pend_s`, `desp_s`, `noApto_v`, `porCobrar_s`, `cobrado_s`, `cupo_d`;
- `T`: transiciones con nombre de dominio (`Vender`, `Asignar`, `Despachar`…);
- `W : T → ℤ^L`: cuánto mueve cada transición.

El **marcado** `m ∈ ℤ^L` es la actualidad de todas las cantidades. Disparar `t` da `m' = m + W(t)`.

**Guarda universal:** `t` se admite si `m + W(t) ≥ 0` en los depósitos **restringidos**. Qué depósitos están restringidos es configuración (L31): por ejemplo, `H_v` puede no estarlo en el POS presencial.

| Transición (nombre de la v2) | Mueve |
|---|---|
| `Ingresar` (`STOCK_RECEIVE`) | `exterior → H_v` |
| `Vender` (`SALE_CREATE`) | `+q → pend_s` y `+q·p → porCobrar_s` (el precio **acordado** queda en las fichas de dinero) |
| `Asignar` (`SALE_RESERVE`) | `pend_s → asig_s`, con guarda `H_v − A_v ≥ q` |
| `Despachar` (`SALE_FULFILL`) | `asig_s → desp_s` y `H_v → exterior` |
| `Cobrar` (`SALE_PAYMENT`) | `porCobrar_s → cobrado_s` |
| `Devolver` (`RETURN_CREATE`) | `desp_s → sol_d` y `+q·p → cupo_d` |
| `Recibir` (`RETURN_RECEIVE`) | `sol_d → H_v` si es apta, o `→ noApto_v` |
| `Reembolsar` (`RETURN_REFUND`) | `cupo_d → ∅` y `cobrado_s → ∅` (ambos restringidos) |
| `Contar` (`STOCK_COUNT`) | `H_v → descuadre_v` por la diferencia: **la merma es un depósito**, no un reinicio |

**Comprobación [V]** (script de trabajo; el código de la v2 sin modificar):
- se ejecutaron en paralelo el `core.js` de la v2 y la red `𝒩` declarada como datos;
- 600 trayectorias aleatorias, con 23.182 acciones (14.332 admitidas);
- **0 discrepancias**, tanto en admitido/rechazado como en `H`, `A`, `P` y `noApto` tras cada paso.

Límites de la comprobación [L]: actor propietario; no incluye `SALE_CANCEL` ni la autoridad simulada.

### 3.2 Lo que emerge de la red sin construir nada

| Emerge | Por qué [T] |
|---|---|
| **El doble descuento es imposible por construcción** | Una unidad está en exactamente un depósito |
| **Todas las validaciones de cantidad y dinero** | Son la guarda universal `m ≥ 0` en depósitos restringidos |
| **Auditoría por conservación** (invariantes de lugar) | `Σ ingresado = H + Σ despachado − Σ recibido apto + descuadre`, y así con el dinero. Si no cuadra, la historia está corrupta: es una pregunta gratuita (L32) |
| **Merma, descuadre, no apto** | Son depósitos: sus saldos y flujos son preguntas de la familia Flujos (O(1) por prefijos, L33) |
| **Disponibilidades** (libre, prudente) | Combinaciones lineales del marcado (L11) |
| **Multi‑bodega y transferencias** | Más depósitos (`H_{w,v}`) y una transición `Transferir: H_{w1,v} → transito_v → H_{w2,v}`. «En tránsito» es un depósito, no un estado especial |
| **Conmutatividad y coordinación** | Los movimientos son vectores en `ℤ^L` y conmutan. Solo las guardas sobre depósitos compartidos exigen orden (L19 exacto, L33). Las cuotas offline son depósitos `cuota_d` |
| **Kardex** | La secuencia de disparos filtrada por depósito |

### 3.3 Lo que esto cambia en nuestras clases de característica

La clase **cantidad** (`{+q}∪{=h}`) se generaliza a la **clase flujo**: una característica cuantitativa es un **depósito**, y las acciones son **transiciones** que mueven entre depósitos. El reinicio `=h` deja de ser primitivo: `Contar` mueve la diferencia al depósito `descuadre`. Así, todo cambio de cantidad conserva la masa total, incluida la exterior.

---

## 4. La v2 reformulada: cuántos mecanismos quedan

| | v2 | Reformulada |
|---|---|---|
| Registro constitutivo | 1 trayectoria | 1 Trayectoria `Γ` (igual) |
| Identidad | 6 contadores + validaciones «consecutivo» | 1 ley: ID = `n` del nacimiento; slot denso solo para variantes |
| Esquema | Campos fijos + `custom` sin tipo | 1 **Forma** (dato): tipos de entidad y características por clase |
| Cantidades y dinero | ~12 validaciones a mano en 9 acciones | 1 **Red de flujo** (dato) + 1 guarda universal `m ≥ 0` |
| Verbos constitutivos | 22 `case` | 5 genéricos: `Nacer`, `Fijar`, `Añadir`, `Quitar`, `Disparar(t)` (+ `Lote`). Los **nombres de dominio** (`Vender`, `Despachar`…) son transiciones **declaradas como dato** |
| Autoridad | `owner()`, `canWrite()`, `canProduct()`, `canSale()` dispersos | Capacidades del contrato (una tabla de dato), `O_κ ⊆ O_S` |
| Consultas | 14 cableadas | 1 puerta de preguntas `(φ, f, M, obs, ventana)` |
| Verificación por compromiso | Toda la cadena, O(n) | Sufijo desde el checkpoint, O(1) amortizado |

**Las reglas comerciales siguen siendo exactamente las mismas** (lo comprueba §3.1); lo que cambia es **dónde viven**. Viven en **dos datos** (Forma y Red) leídos por cinco verbos, no en 22 ramas de código. Añadir «descuento por línea», «transferencia entre bodegas» o «cuota de revendedor» es añadir una característica, un depósito o una transición: dato, no código.

---

## 5. Qué hacemos con la v2 en nuestro plan

1. **Sus 50 escenarios de núcleo y sus 10 flujos (F0–F9) son el oráculo de aceptación comercial** de nuestra fase 3. Cada uno se traduce a la Forma y la Red y debe dar el mismo resultado. La v2 conoce bien el dominio; nuestra arquitectura aporta la reducción.
2. **Su interfaz y su API de una sola puerta** inspiran la fase 6, cambiando las 14 consultas por la puerta de preguntas.
3. **No adoptamos** su formato de hash propio, los seis contadores ni la verificación completa por compromiso.
4. La fase 3 del plan pasa a ser **Forma + Red de flujo** sobre la única `Γ`. Ley nueva **L35** en el canon.
