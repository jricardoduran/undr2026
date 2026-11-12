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

**Entidades fundamentales (actualización 11‑nov, `docs/2026-11-11_ANALISIS_PRODUCTO_Y_TRAYECTORIA.md`):**
- el **Producto**, que es forma más identidad y nace una vez;
- la **Trayectoria** `Γ`, que contiene todas las acciones comprometidas.

Todo lo demás es Actualidad y proyecciones.

En la v1 hay **una sola Trayectoria local** (decisión del usuario en la interacción 3: *la trayectoria constituye; la ficha expresa*). Contiene altas, cambios de atributos y movimientos de existencias. Es el bloque más grueso del retículo de particiones válidas (L20). Separarla en `Cat_O` / `Inv_W` (o por producto, que es el «modelo A», o por bodega) es **configuración** (L31), para cuando las autoridades difieran. El núcleo admite cualquier partición sin cambios.

| Constituye | Constituyente (capacidades, §13) |
|---|---|
| Productos, variantes, características, retiro, existencias y sus movimientos | Propietario (todo); cajero (ventas, devoluciones y lectura) |

Precios de terceros, solicitudes remotas, ofertas y pedidos multiproveedor son ámbitos **posteriores**: se añaden por coproducto sin tocar esta Trayectoria (L25).

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

## Parte III — Lo que la matemática fija y lo que abre

**Principio (L31).** La matemática hace dos cosas distintas:
- **fija** leyes, que no se configuran;
- **abre** un espacio de posibilidades.

El código implementa el **mecanismo general que cubre todo el espacio abierto**. La **configuración** elige dentro de él de forma manual y mínima. Nada de lo abierto se convierte en una decisión preestablecida en el código, y por eso nada de lo abierto bloquea el desarrollo.

### 10. Lo que la matemática fija (no configurable)
Append‑only (L3). Coordenadas emergentes (L28). Alineación implícita (L29). Un sucesor por cabeza dentro del ámbito (L8). Actualidad = `Fold` y proyecciones derivadas, con la reconstrucción como oráculo (L4, L9). Toda tarea es una `Δ` (L30). Identidad ≠ coordenada ≠ material (L26). Autoridad previa (L16). Guardas ≠ invariantes (L7).

### 11. La configuración también emerge: es el propio contrato
La configuración no es un subsistema nuevo. Es el contrato `C_ε` de cada ámbito.
- Cambiarla es una acción comprometida **en la misma trayectoria `Γ_s` del ámbito** (por L20: las guardas leen los parámetros atómicamente, así que una revocación es inmediata), con autoridad del propietario, y abre la época `ε+1` (spec de la fase 1, Corolario 2.2).
- Lo que no cambia ninguna respuesta (snapshots, cuándo se materializa, cuánto se verifica) es configuración **del nodo**, en su propia trayectoria local.
- Cada proyección registra en su checkpoint la época con la que se construyó.

Así, cambiar la configuración tiene historia, autoridad y reconstrucción **sin un mecanismo de configuración aparte**.

### 12. La generalidad fija la representación
La representación debe admitir **todo** el espacio abierto, no solo el valor elegido. Ejemplo: como alguna configuración de guardas permite vender por debajo de cero, `Stock` es `int32` aunque hoy la guarda elegida lo impida. Como el valor por defecto puede ser «desconocido», las fibras llevan la máscara de conocidos.

### 13. Espacio de configuración (con valor inicial editable)

| Parámetro del contrato | Posibilidades que emergen | Qué implica cada una (matemática) | Valor inicial |
|---|---|---|---|
| Clave de reconocimiento `κ` | Cualquier característica o tupla cuya fibra `F_{κ,v}` tenga a lo sumo un elemento entre las activas | Reconocer = consultar la fibra; la unicidad es una guarda de `Cat` (condición C2) | `sku` |
| Guarda de cada acción por capacidad y canal | `H ≥ q`, `verdadero`, `H−A−P ≥ q`… | **Teorema:** `H ≥ 0` es invariante ⟺ toda acción que reduce `H` lleva la guarda `H ≥ q`. Si no, el negativo es un descuadre visible | POS presencial: `verdadero`; remoto: `H ≥ q` |
| Acción que emite la importación para las existencias | `FijarExistencias` (absoluta) / `Ingresar(sid)` (relativa) | Absoluta ⇒ `Δ = ∅` al reimportar cualquier archivo; relativa ⇒ solo con los mismos bytes (mismo `sid`) | `FijarExistencias` |
| Base de la diferencia `Δ` | Actualidad (dos vías) / última importación de la fuente (tres vías) | Dos vías: el archivo prevalece y revierte las ediciones manuales; tres vías: las conserva | tres vías |
| Celda vacía; filas duplicadas | Ignorar / declarar vacío; `Incompatible` / consolidar | Ignorar nunca borra; declarar vacío borra explícitamente | ignorar; `Incompatible` |
| Orientación `ω(k)` | Cualquier ámbito constituyente de `k` | Mismo ámbito ⇒ solo cambia la forma de la acción; otro ámbito ⇒ otra autoridad; cambiarla = transición de época (L18) | descriptivo y precio en `Cat`; existencias en `Inv` |
| Ámbitos de inventario | Cualquier conjunto `{W_1…W_n}` (coproducto) | `n` trayectorias independientes; el total es una proyección suma; trasladar = dos pasos o ámbito común | `{W_1}` |
| Valor por defecto de cada característica | Valor reconocido / desconocido | L29: el alta no toca otros ámbitos; «desconocido» excluye de los complementos (L2) | existencias: `0` |
| Disponibilidad mostrada por canal | `no_asignada` / `prudente` / ambas | L11: `prudente ≤ no_asignada`; es la pregunta, no otro inventario | `no_asignada` |
| Capacidades `O_κ` por actor | Cualquier subconjunto de acciones | L16: solicitar ≠ constituir | propietario: todo; cajero: `Vender`, `Devolver`, leer |
| Materialización de proyecciones | Bajo demanda / por notificación / anticipada | Mismo mecanismo `Δ`; solo cambia cuándo se invoca | bajo demanda |
| Frecuencia de snapshots | Cada `N` compromisos / bajo demanda | L4: correctos por construcción con cualquier `N` | bajo demanda |

Los valores iniciales no se discuten antes de construir: se fijan, se usan y se cambian como cualquier otro hecho del contrato. Solo quedan por **verificar** (no por decidir) los supuestos empíricos de Drive (`decisiones-abiertas.md`).

### Acciones v1 (completas)

`Cat_O`:
- `CrearProducto(atributos, variantes[], imágenes Q[])`: acción compuesta y atómica en `Cat`; asigna slots consecutivos. Guardas: unicidad de `κ`.
- `FijarAtributo(i|p, k, v)` y `FijarColumna(k, {i ↦ v})`.
- `RetirarVariante(i)` y `ReactivarVariante(i)`.
- `DefinirCaracterística(k, tipo, univaluada|multivaluada, defecto)`.

`Inv_W`:
- `FijarExistencias(i, n)`.
- `Ingresar(i, q, sid)`.
- `Vender(i, q, sid, canal)`.
- `Devolver(i, q, sid, venta)`.

Guardas y capacidades: las del contrato (§13). Guarda estructural común: `i ∈ T` (lectura estable de `Cat`, §4).

`Contrato_s`: `FijarParámetro(p, v)` abre una época.

Proyecciones v1:
- `T`;
- catálogo consolidado;
- `Stock_W` Flat `int32` alineado con `T`;
- ficha;
- listado;
- fibras y filtros (bitsets con máscaras de activos y de conocidos);
- disponibilidad por canal y descuadre `max(0,−H)`;
- faltantes del alta;
- `Δ` de importación.

---

## Parte IV — Plan de desarrollo

Cada fase usa el mismo ciclo de agentes (`CLAUDE.md`): **matemático → verificador (las pruebas fallan primero) → implementadores en worktrees → verificador (`PASS`) → revisor (`CONFORME`)**.
Tecnología: módulos ES nativos, sin dependencias; `node --test` para el núcleo; un HTML único para cada probeta de navegador (como las probetas del 10‑nov).

| Fase | Entregable | Specs y leyes | Salida (criterio de terminado) |
|---|---|---|---|
| **0. Consolidación** *(este documento)* | Leyes fijas y espacio de configuración con valores iniciales (Parte III) | L31 | Hecho: no bloquea; la configuración se ajusta en cualquier momento |
| **1. Núcleo general** | `kobalt/src/nucleo/`: `secuencia` (Γ, `AppendIfHead`, cadena de hashes, verificación de sufijo), `contrato` (capacidades + guardas + T), `proyeccion` (checkpoint: reutilizar, actualizar o reconstruir), `diferencia` | L3, L4, L8, L9, L22, L27 | Sin una sola palabra de dominio: el núcleo no sabe qué es un producto |
| **2. Álgebra de preguntas** | `kobalt/src/preguntas/` (genérico, sin dominio, **sobre** el núcleo): pregunta = `(φ, f, M, obs, ventana)`; filtros componibles; ventanas por prefijos (grupos) o segmentos (monoides); producto de preguntas en una pasada (`docs/2026-11-11_ALGEBRA_DE_PREGUNTAS.md`) | L32–L34, L9, L10 | Las familias de §6 de ese documento (flujos, extremos, frecuencias, conjuntos, últimos, secuencias) con reglas de juguete; ventana por prefijos = recorrido directo |
| **3. Forma y red de flujo** | `kobalt/src/dominio/`: la **Forma** (tipos de entidad y características por clase: asignación, conjunto, ciclo, referencia), la **red de flujo** (depósitos y transiciones con nombre: unidades y dinero, L35) y la identidad por nacimiento, sobre la **única** `Γ`. Cinco verbos genéricos (`Nacer`, `Fijar`, `Añadir`, `Quitar`, `Disparar`) + `Lote`. Proyecciones: `T`, catálogo consolidado y Flat (L29). **Oráculo de aceptación:** los 50 escenarios y los flujos F0–F9 de la v2 (`docs/2026-11-11_ANALISIS_INVENTARIO_V2.md`) | L1, L2, L7, L17, L26, L28, L29, L33, L35 | Las reglas comerciales de la v2 se reproducen como dato (Forma + Red) sin código por acción; característica, depósito o transición nueva = dato |
| **4. Alta e importación** | Formulario o CSV → hechos → `Δ` → acciones en `Γ`; faltantes | L16, L24, L30 | Importar dos veces = 0 compromisos; reanudar equivale a no interrumpir |
| **5. Materialidad local** | Adapter IndexedDB (Γ, snapshots, checkpoints); imágenes por `Q` con `Want − Local` | L22, L23, L27 | Probeta en navegador real: recargar, reconstruir y verificar la cadena |
| **6. Proyecciones de interfaz** | HTML: alta, listado, ficha, tabla transversal editable, POS de cajero y **explorador de preguntas** (cualquier corte o ventana) | L16, L17, L32 | El POS, el panel y los reportes son la misma realidad con capacidades y preguntas distintas |
| **7. Probeta 0 · Drive** | Irradiación de `Γ` por Drive (ver `decisiones-abiertas.md`) | L8, L22 | Los cinco supuestos de Drive verificados o refutados |
| **8+. Comercio cooperativo** | Partición de `Γ` por autoridad, solicitudes remotas (H/A/P), ofertas de terceros, cuotas, pedidos multiproveedor, integración con KOB2 | L11–L15, L18–L21 | Fases posteriores, sin tocar el núcleo |

**Paralelismo real:** las fases 2 (preguntas, genérica) y 3 (dominio) se pueden implementar en paralelo, porque ambas dependen solo del núcleo. Dentro de la fase 3, cada monoide de clase es independiente. El núcleo no se reparte: es pequeño y debe tener una sola voz.

**Métrica de éxito global:** que el núcleo de la fase 1 **no cambie** en las fases 2 a 8, y que ninguna funcionalidad requiera algo distinto de una pregunta `(φ, f, M, obs, ventana)`, una acción o una característica. Si una fase obliga a tocarlo, o falta una propiedad (y hay que demostrarlo) o se ha colado un mecanismo tradicional.

---

## Parte V — Fronteras [L]

- Pruebas de un solo proceso: **no** demuestran exclusión entre dispositivos, consenso ni durabilidad física.
- `AppendIfHead` necesita una realización material (transacción IndexedDB local; en Drive está por verificar en la fase 6).
- Ningún kernel trae firmas: la autoridad material la da hoy el control de acceso del almacenamiento.
- La completitud offline es siempre relativa a una clausura, una versión y un ámbito; el navegador puede desalojar datos.

---

## Parte VI — Entrega desplegable (fase 6c): un `.zip` para probar en GoDaddy y publicado en GitHub

**Requisito del usuario (12‑nov):** al terminar, un `.zip` descargable, también en GitHub, para probarlo en GoDaddy.

**Qué significa técnicamente [D].** La aplicación es *local‑first*: todo el estado vive en IndexedDB del navegador y no hay servidor de aplicación. Un alojamiento estático basta (subir archivos a `public_html/`). Eso también implica que **cada navegador y cada origen tienen su propia base**; el respaldo exportable es la forma de moverla.

**Restricciones de diseño que se aplican desde ya:**
1. **Rutas relativas** en todas las páginas y scripts, para que funcione igual en la raíz de un dominio que en una subcarpeta (`https://dominio/kobalt/`). Comprobación obligatoria bajo subruta.
2. **Tipo MIME de módulos.** Apache puede servir `.mjs` como `application/octet-stream`, y el navegador **rechaza** los módulos con ese tipo. El empaquetado emite los módulos con extensión **`.js`** (reescribiendo los `import`) **y** un `.htaccess` con `AddType text/javascript .js .mjs`. La verificación sirve el paquete con un servidor que devuelve `.mjs` mal a propósito, para demostrar que no depende de ello.
3. **Los módulos solo se habían probado en Node.** El empaquetado debe probarse en **Chromium real**: sin `node:`, sin `Buffer`, sin APIs de servidor. (El núcleo calcula SHA‑256 en JS puro, así que no exige contexto seguro; aun así se recomienda HTTPS.)
4. **Sin dependencias ni pasos de compilación** en el servidor.

> **Corrección posterior (12‑nov, noche):** el entorno **bloqueó** copiar al repositorio los archivos subidos por el usuario (la librería Kobalt UI y los paquetes de referencia), aunque la autorización de publicar sigue vigente. Mientras no se levante el bloqueo: la librería **sigue sin versionarse** (carpeta `kobalt/app/ui/` ignorada, instalada con `instalar-ui`), el paquete `sin-ui` se publica en GitHub y el paquete `con-ui` se entrega directamente al usuario. El usuario puede subir esos archivos él mismo o añadir una regla de permiso.

> **Actualización (12‑nov, noche):** el usuario autorizó publicar todo de forma permanente. La librería Kobalt UI se **versiona sin modificar** en `kobalt/app/ui/` con sus hashes, y **ambos paquetes** pueden publicarse. La decisión «¿va también el paquete con la librería a GitHub?» queda **resuelta: sí**. El resto de esta parte sigue vigente.

**Dos paquetes, según de quién es cada pieza:**

| Paquete | Contiene | Destino |
|---|---|---|
| `kobalt-app-con-ui.zip` | Nuestras páginas y módulos **más** la librería Kobalt UI (tuya, no publicada) | Para ti: subir a GoDaddy y probar. Se te entrega directamente |
| `kobalt-app-sin-ui.zip` | Lo mismo **sin** la librería, con el instalador | Apto para GitHub (repositorio público) |

**(Resuelta por el usuario: sí, se publica.)** Texto original: si el paquete **con** la librería también debe subirse a GitHub. El repositorio es público: lo que se sube puede copiarse e indexarse aunque después se borre. Hasta que lo autorices, solo se publica el paquete sin librería.

**Cómo se entrega:** un script `kobalt/app/empaquetar.mjs` (sin dependencias) genera ambos `.zip` en `dist/`, con un `LEEME-GODADDY.md` (subir el zip al Administrador de archivos de cPanel, extraer en `public_html/`, abrir la URL; qué esperar: datos locales por navegador, exportar respaldo; HTTPS recomendado). El `.zip` sin librería se versiona en `dist/` y se enlaza por su URL `raw` de GitHub; el completo se te envía como archivo.

**Criterio de terminado:** el paquete se extrae en una carpeta **cualquiera**, se sirve como lo haría Apache de GoDaddy (MIME de `.mjs` incorrecto, bajo subruta) y la verificación visual en Chromium pasa en escritorio y móvil, claro y oscuro, sin errores de consola.
