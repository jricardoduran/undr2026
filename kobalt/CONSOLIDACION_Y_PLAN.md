# Kobalt Inventario — Consolidación conceptual y plan de desarrollo

**Fecha:** 2026‑11‑11 · **Estado:** documento rector del desarrollo. Prevalece sobre la planificación anterior; las leyes siguen en `.claude/skills/kobalt-kernels/references/leyes.md`.
**Fuentes:** conversaciones «Comparar kernels para inventario» (6–10 nov) y «Reconstruir Kernels Kobalt» (10 nov), nota de análisis Drive, atlas de los tres kernels y spec `specs/2026-11-11_catalogo-alta-importacion.md`.

> **Pregunta rectora.** No «¿cuántas estructuras necesitamos para administrar productos?», sino:
> **¿qué información hay que constituir una sola vez para que todas las demás representaciones se deduzcan sin repetirla?**

---

## Parte I — Matemática: el núcleo irreducible

### 1. Una sola estructura, usada dos veces

Todo el sistema descansa sobre **una** construcción: la secuencia append‑only con cabeza verificable.

```
Γ_s = (a_1, …, a_n) ∈ A_s*        Γ_n ⪯ Γ_{n+1}         cabeza (n, h_n),  h_{n+1} = H(h_n ‖ Frame(Encode(a_{n+1})))
AppendIfHead(Γ_s, (n,h_n), u, a)  ⟺  cabeza intacta ∧ a ∈ O_κ(u) ∧ Admissible_s(a, S_n)
S_n = Fold_s(S_0, Γ_n)            Respuesta(q) = Π_q(S_{n_1}, …, S_{n_m})
```

En la primera versión hay exactamente **dos ámbitos** `s` (dos fronteras de autoridad, L20):

| Ámbito | Constituye | Constituyente |
|---|---|---|
| `Cat_O` (catálogo del propietario `O`) | productos, variantes, atributos descriptivos, relaciones, retiro | propietario |
| `Inv_W` (inventario de la bodega `W` de `O`) | existencias y sus movimientos | propietario (todo); cajero (solo ventas y devoluciones) |

Precios de terceros, solicitudes remotas, ofertas y pedidos multiproveedor son ámbitos **posteriores**: se añaden sin tocar estos dos (coproducto, L25).

### 2. Teorema de coordenadas emergentes [T]

Sea `crea(a)` el conjunto de variantes que crea la acción `a` en `Γ_Cat` (en orden fijo dentro de la acción). Se define

```
slot(e) := 1 + |{ variantes creadas antes que e en Γ_Cat }|        T_n := (e_1, e_2, …)  = Π_coord(Γ_Cat,n)
```

**Teorema.** (i) `Γ ⪯ Γ' ⇒ T(Γ) ⪯ T(Γ')`: ninguna posición cambia de significado. (ii) Ninguna posición se reutiliza.
*Demostración.* (i) `slot(e)` depende solo del prefijo de `Γ` hasta la creación de `e`, y ese prefijo no cambia al extender `Γ` (L3). (ii) Retirar es una acción nueva que no elimina la creación anterior, así que la posición queda ocupada para siempre. ∎

**Consecuencias:**
- **No existe un «generador de IDs».** El ID es `(O, slot)`: la coordenada **emerge del orden de la trayectoria del catálogo**. Una alta fallida no consume coordenada, porque no hay compromiso.
- El SKU es un **atributo** (reconocimiento comercial). El slot es la **coordenada** (representación compacta). Corregir un SKU no mueve nada.
- Varios catálogos asignan coordenadas sin coordinarse: `(A,23) ≠ (B,23)` (coproducto, L25).

Convención (alineada con Minimal): los slots son 1‑based y el `0` está reservado. En las acciones se codifican con el `varuint` canónico de Minimal (1 B hasta 127, 2 B hasta 16.383, 3 B hasta 2.097.151). Eso **elimina el problema de ampliar de 16 a 32 bits**: no hay ancho fijo que migrar.

### 3. Teorema de alineación implícita [T]

Un vector transversal es una terna

```
V = (TableIdentity = (O, Cat), Values, Corte)          Values[i] = valor de la variante T[i]
```

con un **contrato de completitud**: toda posición `i ≤ |T|` sin valor explícito vale el **valor por defecto** de la característica (para las existencias, `0` reconocido).

**Teorema.** Si `T` solo crece por extensión (Teorema 2), entonces:
- un `V` construido con `T_n` sigue siendo correcto con `T_m`, para todo `m ≥ n`, sin reescribirlo;
- dar de alta una variante **no** requiere ninguna acción en ningún inventario;
- el vector no almacena identificadores: la identidad está en la geometría.

*Demostración.* Las posiciones `1..|T_n|` conservan su significado (Teorema 2), y las posiciones `|T_n|+1..|T_m|` toman el valor por defecto por contrato. ∎

**Contraejemplo que delimita el teorema:** un catálogo reordenado `T' = [P2,P0,P1]` interpretado con el vector antiguo `[8,12,5]` asigna mal las existencias. Por eso `V` lleva su `TableIdentity`, y un `T` que no extiende al anterior es un error de continuidad (L22), nunca una reinterpretación.

### 4. Lectura estable entre ámbitos [T] (de la spec, §2.3)

`Inv_W` necesita saber que el slot `i` existe. «Existir en `T`» es un predicado **estable** (ninguna acción lo invalida), así que `Inv_W` lo puede leer de `Cat` **sin transacción común**: basta registrar el checkpoint de `Cat` del que depende. En cambio, «no retirada» **no** es estable; si un ámbito la necesita como guarda, esa guarda debe vivir en `Cat`.

### 5. La diferencia: la única operación de «trabajo» [T]

Casi todo lo que en un sistema tradicional es un proceso de fondo es una instancia de una sola operación:

```
Δ(objetivo, actualidad) = lo requerido por el objetivo que la actualidad aún no reconoce
```

| Instancia | Objetivo | Actualidad | Δ |
|---|---|---|---|
| Importar | hechos interpretados del archivo | `Fold(Γ_Cat)`, `Fold(Γ_Inv)` | solicitudes por ámbito; `Δ = ∅` al reimportar |
| Faltantes del alta | componentes del propósito | compromisos por `sid` | lo que la UI muestra pendiente |
| Sincronizar un nodo | cabeza remota `(n', h_{n'})` | checkpoint local `(n, h_n)` | sufijo `Γ_{n+1:n'}`, verificado por la cadena |
| Actualizar una proyección | corte pedido | checkpoint de la proyección | reutilizar, aplicar el delta o reconstruir |
| Adquirir material | `Required(Want)` (clausura de dependencias) | material local verificado por `Q` | descargas pendientes |

**Ley de idempotencia general.** Si el objetivo ya está reconocido, `Δ = ∅`. Reintentar es seguro **si** la diferencia se calcula contra la actualidad (o se deduplica por identidad `sid`), y no se repite a ciegas el delta.

### 6. Las cinco frases que lo resumen

```
Escribir:    Propósito → Contrato → Compromiso            (AppendIfHead en el ámbito que corresponde)
Leer:        Compromisos → Actualidad → Pregunta          (Fold, Π con checkpoint)
Trabajar:    Objetivo ⊖ Actualidad → Δ                    (importar, sincronizar, adquirir, faltantes)
Coordenar:   slot = orden de creación en Γ_Cat            (vectores alineados implícitamente)
Coordinar:   solo donde dos acciones compiten por una restricción compartida
```

---

## Parte II — Concepto: lo que en lo tradicional son mecanismos, aquí emerge

Esta tabla es el **criterio de revisión** de todo el desarrollo: si alguien implementa la columna izquierda como un componente propio, está fuera de la arquitectura.

| Mecanismo tradicional (definido a priori) | En Kobalt emerge de… | Ley |
|---|---|---|
| Generador de IDs / autoincrement | orden de creación en `Γ_Cat` | Teorema 2 |
| Claves foráneas en la tabla de stock | alineación implícita de vectores con `T` | Teorema 3 |
| Borrado lógico y prevención de reutilización | `Retirar` como acción, sobre un historial append‑only | L3, Teorema 2 |
| `UPDATE stock` y tabla de existencias | `Fold(Γ_Inv)` → Flat | L4 |
| Log de auditoría | la trayectoria misma | L3 |
| Locks, transacciones, colas de escritura | `AppendIfHead` dentro del ámbito; coordinación solo por co‑acceso | L8, L19, L20 |
| Restricción UNIQUE de SKU | guarda de `Cat` sobre la fibra `F_{sku,v}` | L2, L20 |
| Búsqueda, índices, filtros | fibras como bitsets sobre `T`, bajo demanda | L1, L2 |
| Upsert y deduplicación de importaciones | reconocimiento = consulta de fibra SKU; `Δ` contra la actualidad | §5, L24 |
| Motor de sincronización o replicación | sufijo de `Γ` desde el checkpoint, verificado | L22 |
| Invalidación de caché | comparar checkpoints (reutilizar, actualizar o reconstruir) | L9, L27 |
| Claves de idempotencia y reintentos | `sid` en el estado y guarda `sid ∉ Sids` | L13 |
| Stock disponible y reservas | `Π_no_asignada`, `Π_prudente` | L11, L12 |
| Roles y permisos | capacidades `O_κ ⊆ O_S` del contrato | L16 |
| POS, tienda web, panel de administración | `UI = Π(Realidad, Capacidades, Propósito)` | L17 |
| Cola de descargas o precarga | `Required(Want) − Local` | §5 |
| Lista de tareas pendientes del alta | `Δ(propósito, compromisos)` | §5 |
| Snapshots y backups | `(S_n, n, h_n)`, correctos por construcción | L4 |

**Principio de parsimonia** (de la conversación del 10‑nov): *antes de crear un mecanismo hay que demostrar qué propiedad falta y por qué no se obtiene componiendo los existentes.* Y la composición no hereda propiedades gratis: `P(M₁) ∧ Q(M₂) ∧ C(M₁,M₂) ⇒ R(M₁∘M₂)`, donde la condición de compatibilidad `C` hay que nombrarla.

### 7. Ontología mínima del dominio

| Realidad | Pregunta | Dónde vive en la v1 |
|---|---|---|
| Producto | ¿Qué bien es? | `Cat`; agrupa variantes y atributos compartidos |
| Variante | ¿Qué diferencia vendible concreta? | `Cat`; tiene slot, que es su coordenada |
| Característica | Talla, color, material, categoría, SKU… | definida en `Cat`; **no** una clase por característica |
| Existencias | ¿Cuántas unidades bajo control de `W`? | `Inv_W`; Flat alineado con `T` |
| Imagen | ¿Qué bytes exactos? | material `Q = ContentId(B)`; el catálogo solo guarda `Q` |
| Oferta, pedido, pago, entrega | — | **fuera de la v1**, son ámbitos futuros |

Los atributos compartidos se declaran en el producto y las variantes los heredan; los particulares, en la variante. La ficha es una **composición** `Ficha(i) = Π(Sección_Cat(i), Stock_W[i], imágenes Q)`, nunca una autoridad.

### 8. Orientación dentro de un mismo ámbito

Si color y categoría se constituyen **ambos** en `Cat`, la pregunta «¿se constituye por producto o por columna?» deja de ser de autoridad: es solo la **forma de la acción** (`SetAttr(i,k,v)` frente a `SetColumn(k, {i↦v})`), y las dos comprometen en la misma `Γ_Cat`. La configuración general `ω` de la spec (orientaciones repartidas entre ámbitos distintos, con migración en cuatro pasos) sigue siendo válida, pero la v1 usa el **perfil mínimo**: lo descriptivo en `Cat` y las existencias en `Inv`. La migración de orientación queda para cuando un atributo cambie de autoridad (por ejemplo, el precio pasando a ofertas de terceros); es posible porque las identidades son estables.

### 9. Ámbito de coordenadas: añadir, retirar, trasladar

- **Añadir** una variante: un solo compromiso en `Γ_Cat` (`CrearProducto` con sus variantes es **una acción compuesta**). `T` crece y todos los inventarios la ven con `0` por contrato, sin hacer nada.
- **Retirar**: `RetirarVariante(i)` en `Γ_Cat`. El slot no se reutiliza. Una variante retirada **con** existencias es un estado representable y visible, no un error (L7).
- **Trasladar entre bodegas `W1 → W2` del mismo `O`**: misma coordenada `i`, dos ámbitos. O bien un ámbito común con un vector por bodega, o bien un protocolo en dos pasos `Despachar(W1)` / `Recibir(W2)`, donde «en tránsito» es una proyección (decisión del usuario).
- **Producto de otro catálogo** (proveedor `B`): se referencia como `(B, j)`, nunca con un slot propio. Los vectores no mezclan espacios de coordenadas.

---

## Parte III — Perfil v1: decisiones que este documento propone cerrar

Cada fila resuelve una decisión abierta de la spec anterior. **Requieren tu confirmación** (✔ = recomendación).

| # | Decisión | Propuesta v1 | Por qué |
|---|---|---|---|
| D1 | Clave de reconocimiento en la importación | ✔ `SKU`, único entre las variantes de `Cat` (guarda de `Cat`); `(fuente, idExterno)` opcional como atributo | El reconocimiento es una consulta de fibra; la guarda vive en el ámbito que crea (condición C2) |
| D3 | Cómo entran las existencias iniciales e importadas | ✔ `FijarExistencias(i, n)` absoluta, solo para el propietario; una variante nueva empieza en `0` reconocido | Es absoluta ⇒ importar es idempotente aunque se reexporte el archivo; evita `H = 48` |
| D6 | Diff de la importación | ✔ a tres vías (contra la última importación de esa fuente) | El bidireccional revierte ediciones manuales |
| D2/D7 | Duplicados y ambiguas; celdas vacías | ✔ `Incompatible` (se revisan a mano); celda vacía = ignorar | Condición C5; no se borra nada implícitamente |
| D5/D4 | Partición | ✔ dos ámbitos `Cat_O` e `Inv_W`; una sola bodega en la v1 | Perfil mínimo (§8) |
| D18 | Persistencia | ✔ trayectoria canónica + actualidad derivada + snapshots | Teorema 2 lo exige para el catálogo |
| D‑POS | Venta presencial con existencias reconocidas `< q` | ✔ se admite y `H` queda **negativo = descuadre visible** que pide un conteo (`FijarExistencias`). El artículo estaba en la mano, así que lo que estaba mal era el registro. Los canales remotos sí exigen `H ≥ q`. Consecuencia: `H ≥ 0` **no** es invariante y el Flat es `int32` | Las guardas no pueden falsear la realidad (L7) |
| D‑precio | Dónde vive el precio | ✔ atributo de `Cat` en la v1 (propietario único); pasa a `Of_B` cuando haya revendedores (migración, L18) | Mínimo ahora, extensible luego |
| D14 | Capacidades | ✔ propietario: todo; cajero: `Vender`, `Devolver` y lectura | Depende de la decisión abierta 2 (cajeros con cuenta propia) |

Las demás decisiones (D8–D13, D15–D17 de la spec) no afectan a la v1.

### Acciones v1 (completas)

`Cat_O`:
- `CrearProducto(atributos, variantes[], imágenes Q[])`: acción compuesta y atómica en `Cat`; asigna slots consecutivos. Guardas: SKUs nuevos y no repetidos dentro de la acción.
- `FijarAtributo(i|p, k, v)` y `FijarColumna(k, {i ↦ v})`.
- `RetirarVariante(i)` y `ReactivarVariante(i)`.
- `DefinirCaracterística(k, tipo, univaluada|multivaluada, defecto)`.

`Inv_W`:
- `FijarExistencias(i, n)`: solo el propietario.
- `Ingresar(i, q, sid)`.
- `Vender(i, q, sid)`: el cajero; en POS se admite con déficit (D‑POS).
- `Devolver(i, q, sid, venta)`: con límite por la venta referenciada.

Guarda común: `i ∈ T` (lectura estable de `Cat`, §4).

Proyecciones v1:
- `T`;
- catálogo consolidado (JSON);
- `Stock_W` Flat (`int32` alineado con `T`; negativo solo si D‑POS lo admite);
- ficha;
- listado;
- fibras y filtros (bitsets con máscaras de activos y de conocidos);
- disponibilidad `max(0,H)` y descuadre `max(0,−H)`;
- faltantes del alta;
- `Δ` de importación.

---

## Parte IV — Plan de desarrollo

Cada fase usa el mismo ciclo de agentes (`CLAUDE.md`): **matemático → verificador (las pruebas fallan primero) → implementadores en worktrees → verificador (`PASS`) → revisor (`CONFORME`)**.
Tecnología: módulos ES nativos, sin dependencias; `node --test` para el núcleo; un HTML único para cada probeta de navegador (como las probetas del 10‑nov).

| Fase | Entregable | Specs y leyes | Salida (criterio de terminado) |
|---|---|---|---|
| **0. Consolidación** *(este documento)* | Decisiones de la Parte III confirmadas; la spec del catálogo reducida al perfil v1 | — | Tu confirmación |
| **1. Núcleo general** | `kobalt/src/nucleo/`: `secuencia` (Γ, `AppendIfHead`, cadena de hashes, verificación de sufijo), `contrato` (capacidades + guardas + T), `proyeccion` (checkpoint: reutilizar, actualizar o reconstruir), `diferencia` | L3, L4, L8, L9, L22, L27 | Sin una sola palabra de dominio: el núcleo no sabe qué es un producto |
| **2a. Catálogo** (paralelo a 2b) | `dominio/catalogo`: acciones `Cat`, `T` emergente, catálogo consolidado, secciones, columnas, fibras bitset | Teoremas 2 y 3, L1, L2, L17, L26 | Unicidad de SKU; slot estable bajo retiro; filtros = oráculo de conjuntos |
| **2b. Inventario** (paralelo a 2a) | `dominio/inventario`: acciones `Inv`, Flat alineado, disponibilidad y descuadre | L6, L7, L11, L13, Teorema 3 | Alta sin tocar inventario; descuadre representable; `sid` sin doble efecto |
| **3. Alta e importación** | `flujos/alta`, `flujos/importar`: formulario o CSV → hechos → `Δ` → solicitudes por ámbito; faltantes | §5, L16, L24, Teorema 7.5 de la spec | Importar dos veces = 0 compromisos; reanudar equivale a no interrumpir; mismas solicitudes desde la ficha y desde la tabla |
| **4. Materialidad local** | Adapter IndexedDB (Γ, snapshots, checkpoints); imágenes por `Q` con `Want − Local` | L22, L23, L27 | Probeta en navegador real: recargar, reconstruir y verificar la cadena |
| **5. Proyecciones de interfaz** | HTML: alta, listado, ficha, tabla transversal editable y POS de cajero | L16, L17 | El POS y el panel son la misma realidad con capacidades distintas |
| **6. Probeta 0 · Drive** | Irradiación de `Γ` por Drive (ver `decisiones-abiertas.md`) | L8, L22 | Los cinco supuestos de Drive verificados o refutados |
| **7+. Comercio cooperativo** | Solicitudes remotas (H/A/P), ofertas de terceros, cuotas, pedidos multiproveedor, migración de orientación, integración con KOB2 | L11–L15, L18, L19, L21 | Fases posteriores, sin tocar el núcleo |

**Paralelismo real:** 2a y 2b se reparten entre dos implementadores (ámbitos distintos, unidos solo por una lectura estable). Dentro de la fase 1 no conviene repartir: el núcleo es pequeño y debe tener una sola voz.

**Métrica de éxito global:** que el núcleo de la fase 1 **no cambie** en las fases 2 a 7. Si una fase obliga a tocarlo, o falta una propiedad (y hay que demostrarlo) o se ha colado un mecanismo tradicional.

---

## Parte V — Fronteras [L]

- Pruebas de un solo proceso: **no** demuestran exclusión entre dispositivos, consenso ni durabilidad física.
- `AppendIfHead` necesita una realización material (transacción IndexedDB local; en Drive está por verificar en la fase 6).
- Ningún kernel trae firmas: la autoridad material la da hoy el control de acceso del almacenamiento.
- La completitud offline es siempre relativa a una clausura, una versión y un ámbito; el navegador puede desalojar datos.
