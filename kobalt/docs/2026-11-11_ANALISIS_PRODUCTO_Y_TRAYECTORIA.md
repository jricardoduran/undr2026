# Kobalt — Análisis: el Producto, la Trayectoria y lo que emerge al recorrerlos

**Fecha:** 2026‑11‑11 · **Tipo:** análisis conceptual previo al plan (sin código).
**Parte de:**
- la decisión ya tomada por el usuario en la interacción 3: *«el cambio existe cuando se ejecuta en la trayectoria causal; la ficha expresa»*;
- las conversaciones «Reconstruir Kernels Kobalt», «Comparar kernels para inventario» y «Últimas tres interacciones»;
- el atlas de los tres kernels;
- las specs ya escritas.

---

## 0. Los nombres que fijamos (para recordarlos)

| Nombre | Qué es | Símbolo |
|---|---|---|
| **Producto** | El sujeto: tiene identidad estable, forma (qué características tiene) y variantes | `P`, `v`, `slot` |
| **Trayectoria** (trayectoria causal) | El registro de solo‑añadir de **todas** las acciones comprometidas | `Γ = (a₁,…,aₙ)` |
| **Compromiso** | Una acción admitida e incorporada a la Trayectoria | `aᵢ` |
| **Cauce** | El mecanismo que admite y compromete: el contrato decide y se añade **una** acción por cabeza | `AppendIfHead` |
| **Actualidad** | Lo que la Trayectoria dice que es verdad hasta un corte | `R_n = Fold(Γ_n)` |
| **Fibra** | El mecanismo que recorre la Actualidad por entidad, por característica o por valor | `Section`, `Column`, `Fiber` |
| **Proyección / archivo de optimización** | Una respuesta materializada y reconstruible; nunca escribe | `Π_q`, con su checkpoint |

> **Frase para recordarlo:** *el Cauce compromete, la Trayectoria recuerda, la Fibra recorre.*

---

## Parte I — Matemática

### 1. Las dos realidades fundamentales y por qué no son del mismo tipo

**El Producto es espacial**: responde a *qué existe y cómo está hecho*.
**La Trayectoria es temporal**: responde a *qué cambió, en qué orden y bajo qué autoridad*.

No son dos fuentes de verdad sobre lo mismo. Cada una tiene un papel distinto:

```
Trayectoria  Γ ∈ A*                (temporal, solo crece, constituye)
      │  Fold bajo el contrato C
      ▼
Actualidad   R_n ⊆ ∐_k E×{k}×V_k  (espacial: productos, variantes, características, valores)
      │  Fibra
      ▼
Proyecciones: ficha · columna · fibra · stock · listado · POS · kardex
```

**¿Dónde está entonces «el Producto»?** Tiene dos caras, y separarlas es la clave de todo el análisis:

| Cara del Producto | Qué contiene | Cómo nace | Carácter |
|---|---|---|---|
| **Forma** | Qué características admite el producto, de qué tipo, cardinalidad y si son del producto o de la variante; la relación producto → variantes | La acción de nacimiento `CrearProducto` y, después, `DefinirCaracterística` | Identidad y estructura: lo que hace que algo **sea** este producto |
| **Valores** | Color = verde, talla = 4, existencias = 8… | Acciones posteriores en `Γ` | Actualidad: proyección `Π_P(R_n)` |

La **entidad Producto** que pediste es la Forma más la identidad. Se constituye **una vez** (al nacer) y su slot emerge del orden de nacimiento (L28). Sus valores son siempre lo que dice la Trayectoria.

### 2. Teorema de la autoridad única (por qué la arquitectura «pide» el modelo B) [T]

**Enunciado.** Supongamos dos constituyentes del mismo hecho `(e,k)`: la ficha escrita directamente y la Trayectoria. Entonces no se pueden cumplir a la vez:
- (i) reconstrucción: `Π(Fold(Γ)) = ficha`;
- (ii) historia completa: todo cambio de `(e,k)` está en `Γ`.

**Demostración.** Si la ficha cambia sin una acción en `Γ`, (ii) falla. Si además cambia `Γ`, hay dos sucesores posibles de `(e,k)` sin un orden común, y (i) falla en el primer cambio concurrente. Para que ambas se cumplan, la ficha solo puede **emitir propósitos**, nunca constituir. ∎

**Consecuencia.** «Modificar directamente el producto» significa actuar **desde** la ficha y **sobre** el producto (la acción tiene al producto como objetivo). Nunca significa escribir el archivo de la ficha.

### 3. Teorema de granularidad: el modelo A es el B con otra partición [T]

Una partición de `Γ` en bloques `{Γ_1,…,Γ_m}` es válida si cada componente del grafo de co‑acceso cae entera en un solo bloque (L20). Las particiones válidas forman un **retículo**:

```
una sola Γ  ⊒  {Γ_Catálogo, Γ_Inventario}  ⊒  {Γ_P por producto}  ⊒  {Γ_(e,k) por hecho}
(máxima simplicidad)                                                 (máxima concurrencia)
```

- **Modelo B** («una trayectoria constituye»): el bloque más grueso.
- **Modelo A** («el producto constituye»): un bloque **por producto**. La ficha de `P` es entonces la actualidad de `Γ_P`. Es exactamente lo que hace **Minimal Flat**: cada producto es una continuidad con slot `C` y sus versiones `V` son la trayectoria de ese producto.

**Conclusión:** A y B no son dos ontologías. Son dos puntos del mismo retículo, y elegir uno es **configuración** (L31), no diseño. El núcleo de la fase 1 ya admite cualquier partición.

### 4. Teorema de la actualización perdida: por qué un vector de **acciones** y no de **estados** [T]

Una trayectoria de **estados** (cada versión guarda el valor entero, como en Minimal) es un caso particular de `Γ`: aquella en la que todas las acciones son absolutas (`Reemplazar(s)`).

**Enunciado.** Para cantidades con escritores concurrentes, una trayectoria de estados pierde hechos que una de acciones conserva.
**Contraejemplo.** Partimos de `stock = 10`. Dos ventas parten de la misma lectura:
- como estados, ambas escriben `9`: se pierde una venta;
- como acciones, `Vender(1) ‖ Vender(1)` da `8`.

**Por qué.** La acción conserva la **intención** (restar 1). El estado conserva solo el **resultado** (escribir 9). ∎

Consecuencia: la Trayectoria **debe** registrar acciones con significado (`Vender`, `Ingresar`, `FijarExistencias`), no copias de la ficha. Las acciones absolutas (`FijarExistencias`, `FijarAtributo`) siguen siendo útiles cuando la intención **es** fijar un valor, como en un conteo físico.

### 5. El álgebra de cada característica: la propiedad que diferencia sin multiplicar mecanismos

A la Trayectoria no le importa qué significa una acción. A la **interpretación** (`Fold`) sí, y la interpretación de cada característica está determinada por el **álgebra de sus acciones**. Esta es la «propiedad específica» que buscábamos: diferencia el stock del color **sin crear un motor para cada uno**.

| Clase de característica | Ejemplos | Acciones | Álgebra | `Fold` de la columna | Lo que emerge |
|---|---|---|---|---|---|
| **Asignación** (univaluada) | nombre, color, talla, SKU, precio, umbral | `Fijar(k,v)` | Monoide «el último gana» (en el orden de `Γ`) | Último valor | Columna; fibras disjuntas (partición del universo); unicidad = fibra de tamaño ≤ 1 |
| **Cantidad** | existencias por bodega | `Ingresar(+q)`, `Vender(−q)`, `Devolver(+q)`, `FijarExistencias(=h)` | Grupo abeliano `(ℤ,+)` más reinicios | Suma desde el último reinicio | Flat denso; los deltas conmutan, así que **solo** las guardas exigen orden (L19); cuotas offline posibles |
| **Conjunto** (multivaluada) | categorías, etiquetas, canales | `Añadir(x)`, `Quitar(x)` | Retículo de conjuntos | Unión y diferencia acumuladas | Relación; fibras **solapadas**; navegación por categoría |
| **Ciclo de vida** | activo / retirado | `Retirar`, `Reactivar` | Máquina de estados finita | Estado vigente | Máscara de activos; el slot nunca se reutiliza |
| **Referencia** | imágenes `Q`, padre de variante | `Vincular(Q)`, `Desvincular(Q)` | Conjunto o asignación de referencias exactas | Referencias vigentes | Galería; reutilización de material (Exacto) |
| **Demanda** (fase posterior) | solicitudes y asignaciones | `Solicitar`, `Asignar`, `Rechazar`, `Despachar` | Máquina de estados por `sid` + cantidades | H/A/P | Disponibilidad prudente / no asignada (L11–L13) |

**Teorema (incrementalidad por álgebra) [T].**
- Las columnas de clase **Asignación**, **Cantidad**, **Conjunto** y **Ciclo de vida** se actualizan con el sufijo nuevo sin mirar el resto del estado: su núcleo es una congruencia (L10).
- Las proyecciones **agregadas** de clase Cantidad (`|F|`, `max(0, H−A)`) no se pueden actualizar desde sí mismas; necesitan el estado de la columna (contraejemplo ya verificado en L10).

Por eso el stock merece un Flat persistente (alta frecuencia y álgebra aditiva compacta), mientras que el color puede recalcularse bajo demanda.

**La forma de un producto es entonces una lista de características con su clase:**

```
Característica k = (clave, clase ∈ {asignación, cantidad, conjunto, ciclo, referencia}, tipo de valor,
                    nivel ∈ {producto, variante}, valor por defecto)
```

Añadir una característica nueva (por ejemplo «material») es **un dato**, no código: su clase ya dice cómo se interpreta, se filtra y se materializa.

### 6. Qué lleva cada acción de la Trayectoria (mínimo suficiente)

| Campo | Para qué | ¿Obligatorio? |
|---|---|---|
| `n`, `h_{n−1} → h_n` | Orden y continuidad verificable (cadena de hashes) | Sí (lo pone el Cauce) |
| `sid` | Identidad del intento: los reintentos no duplican | Sí |
| `época` | Contrato vigente cuando se admitió | Sí (registrada) |
| `actor` | Quién la propuso; la capacidad se comprueba con el contrato | Sí |
| `tipo` | Qué acción; determina su clase y su álgebra | Sí |
| `objetivo` | Slots de variante o producto (`varuint`, 1–3 B); en un nacimiento, los slots que nacen | Sí |
| `datos` | Valor, cantidad o referencia `Q` | Según el tipo |
| `deps` | Checkpoints de otros ámbitos que la acción leyó (L21) | Solo si lee otro ámbito |
| `t_hecho` | Cuándo ocurrió en el mundo (no ordena; el orden lo da `n`) | Opcional |

Una acción **no** lleva la ficha ni identificadores de 32 bytes: el objetivo es un slot y el contexto lo da el ámbito. Esto es lo que hace pequeña la Trayectoria.

---

## Parte II — Concepto: qué tiene un inventario tradicional y si emerge

Criterio de clasificación:
- **E**: emerge recorriendo hechos que ya existen (una proyección).
- **E+**: emerge con los mismos mecanismos añadiendo **un tipo de acción o una característica** (dato).
- **Á**: requiere **otro ámbito** con su propia autoridad (proveedor, cliente, pago); se compone por coproducto con los mismos mecanismos.

Ninguna funcionalidad requiere un mecanismo nuevo. Esa es la tesis, y la tabla es su comprobación.

### 7. Catálogo

| Funcionalidad tradicional | Hechos | Cómo emerge | Clase |
|---|---|---|---|
| Alta de producto con variantes | Nacimiento | `CrearProducto` (una acción compuesta) → slots consecutivos | E |
| Edición de atributos | Asignaciones | `Fijar(k,v)` desde la ficha o desde la tabla: misma acción | E |
| SKU y código de barras únicos | Asignación + unicidad | Guarda: la fibra `F_{sku,v}` tiene tamaño ≤ 1 | E |
| Categorías y etiquetas | Conjunto | `Añadir` y `Quitar`; navegación = fibras | E |
| Atributos heredados (producto → variante) | Nivel de la característica | Composición de la sección: si la variante no tiene valor, se usa el del producto | E |
| Imágenes | Referencias `Q` | `Vincular(Q)`; bytes exactos aparte | E |
| Retirar y reactivar | Ciclo de vida | Máscara de activos | E |
| Precio | Asignación | `Fijar(precio,v)`; con revendedores pasa a ámbito Oferta | E / Á |
| Unidades de medida y empaques | Característica + factor | Asignación; la conversión es una proyección | E+ |
| Kits, combos y lotes de venta | Relación de componentes | Característica de conjunto con cantidades; el stock de un kit es una proyección (mínimo de sus componentes) | E+ |

### 8. Existencias

| Funcionalidad tradicional | Hechos | Cómo emerge | Clase |
|---|---|---|---|
| Existencias actuales | Cantidad | `Fold` → Flat | E |
| Multi‑bodega | Cantidad por ámbito | Un Flat por bodega; el total es una proyección suma | E |
| Entradas de mercancía | `Ingresar` | Acción | E |
| Salidas y ventas | `Vender`, `Despachar` | Acción | E |
| Ajustes y conteo físico | `FijarExistencias` | Acción absoluta; el descuadre se ve | E |
| Transferencias entre bodegas | Dos acciones o un ámbito común | `Despachar(W1)` + `Recibir(W2)`; «en tránsito» es una proyección | E+ |
| Kardex / historial por producto | La Trayectoria | Recorrido de `Γ` filtrado por objetivo | **E (gratis)** |
| Existencias a una fecha pasada | La Trayectoria | `Fold` hasta el corte de esa fecha | **E (gratis)** |
| Bajo stock / punto de reorden | Cantidad + umbral (asignación) | Predicado `H ≤ umbral` → fibra | E |
| Reservas y apartados | Demanda | H/A/P | E+ |
| Disponible para vender | Proyección | `max(0, H−A)` o prudente, según el canal | E |
| Lotes, series, caducidad | Cantidad indexada por lote | Coordenada compuesta `(slot, lote)` o característica de conjunto; FEFO = orden de una proyección | E+ |
| Rotación, días de inventario | Trayectoria + cantidades | Proyección temporal sobre `Γ` | E |

### 9. Operación, valoración y control

| Funcionalidad tradicional | Hechos | Cómo emerge | Clase |
|---|---|---|---|
| POS | Proyección + capacidad de vender | `UI = Π(Actualidad, Capacidades, Propósito)` | E |
| Devoluciones | `Devolver(…, venta)` referenciada | Acción con guarda acotada por la venta | E |
| Importar y exportar | Hechos externos | Importar = `Δ(archivo, actualidad)`; exportar = proyección | E |
| Auditoría / trazabilidad | La Trayectoria | Verificar la cadena: quién, qué, cuándo y bajo qué época | **E (gratis)** |
| Usuarios y permisos | Capacidades del contrato | `O_κ ⊆ O_S`; cambiar permisos es una acción (época) | E |
| Sincronización entre dispositivos | Sufijos de `Γ` | `Δ` contra el checkpoint, verificada | E |
| Funcionar sin conexión | Material local + cuotas | Lectura completa local; vender offline con cuotas (L19) | E / E+ |
| Valoración (costo promedio, FIFO) | Costo en cada `Ingresar` | `datos` de `Ingresar` incluye el costo; la política de valoración es una proyección (configuración) | E+ |
| Margen y utilidad | Costo + precio de venta | Proyección | E+ |
| Órdenes de compra a proveedores | Compromisos con otro ámbito | Ámbito Proveedor; la recepción es `Ingresar` con `deps` | Á |
| Pedidos de clientes y ecommerce | Solicitudes | H/A/P y ámbito Pedido | E+ / Á |
| Pagos y facturación | Hechos económicos y fiscales | Ámbito Pago o Fiscal: otra autoridad y otra evidencia | Á |
| Alertas y notificaciones | Predicados | Fibra de un predicado evaluada al cambiar el corte | E |

**Lo que la tradición no da y aquí sale gratis:** existencias a cualquier fecha, kardex, auditoría verificable, reconstrucción tras fallo, importación idempotente y la misma acción desde la ficha o desde la tabla. Todo sale de que la Trayectoria es una entidad de pleno derecho.

**La frontera honesta.** Ningún recorrido inventa hechos que no se registraron: sin costo en `Ingresar` no hay valoración, y una salida física no prueba un pago. Por eso la regla de crecimiento es: *una funcionalidad nueva = un tipo de acción, una característica o un ámbito, y una proyección. Nunca un mecanismo.*

---

## Parte III — Las preguntas: cinco orientaciones de recorrido

Con solo el Producto y la Trayectoria podemos hacer **cinco tipos de preguntas**. Las tres primeras recorren la Actualidad; las dos últimas recorren la Trayectoria misma, y son las que un sistema tradicional no tiene.

| Orientación | Pregunta tipo | Recorrido | Ejemplos |
|---|---|---|---|
| **Por entidad** | ¿Qué es y cómo está `P`? | `Section(R, P)` | Ficha, POS al escanear un código |
| **Por característica** | ¿Cuánto vale `k` para todos? | `Column(R, k)` | Vector de stock, lista de precios, exportación |
| **Por valor** | ¿Quiénes cumplen `φ`? | `Fiber` y álgebra booleana | Filtros, búsqueda, bajo stock, categoría |
| **Por tiempo (corte)** | ¿Cómo era todo en el momento `t`? | `Fold(Γ_{≤t})` y luego cualquiera de las tres anteriores | Inventario al cierre de mes, comparar dos fechas |
| **Por acción** | ¿Qué pasó, quién lo hizo y por qué cambió? | Filtrar `Γ` por objetivo, tipo, actor o época | Kardex, auditoría, ventas del día, deshacer con una acción inversa |

Y una sexta que es una operación entre dos realidades:

| **Por diferencia** | ¿Qué falta o qué cambió entre `X` y la Actualidad? | `Δ(X, R)` | Importar, sincronizar, faltantes del alta, imágenes por descargar |

---

## Parte IV — Los archivos de optimización y sus propiedades

Todos tienen la misma forma: `Π = (valores, checkpoint (StreamID, n, h_n, versiónRegla, época), regla)`. Todos son reconstruibles, ninguno se escribe directamente y su resolución es siempre reutilizar, aplicar el sufijo o reconstruir.

| Archivo | Clase de la que nace | Orientación | ¿Materializar en la v1? | Por qué |
|---|---|---|---|---|
| **Tabla de coordenadas `T`** | Nacimientos | — | Sí | La necesitan todos los vectores (L28, L29) |
| **Catálogo consolidado** (secciones) | Asignación, conjunto, referencia | Entidad | Sí | Navegación y búsqueda offline completas |
| **Flat de existencias por bodega** | Cantidad | Característica | Sí | Alta frecuencia; 2–4 B por variante |
| **Snapshots** | Todas | Tiempo | Bajo demanda | Correctos por construcción (L4) |
| Columnas de asignación | Asignación | Característica | Bajo demanda | 500 variantes se recorren en microsegundos |
| Fibras / filtros (bitsets) | Asignación, conjunto, ciclo | Valor | Bajo demanda | 63 B por fibra; cálculo trivial |
| Índice de texto | Asignación (texto) | Valor | Bajo demanda | Se materializa solo si la búsqueda lo exige |
| Kardex | Trayectoria | Acción | Nunca | **Es** la Trayectoria filtrada |

---

## Parte V — Los elementos que realmente necesitamos

```
Entidades fundamentales (2):   Producto (forma + identidad)          Trayectoria Γ (acciones comprometidas)
Ley que las une (1):           Contrato C (dato, versionado en épocas dentro de Γ)
Mecanismos generales (4):      Cauce (admitir + AppendIfHead)  ·  Fold (interpretar por álgebra)
                               Fibra (sección, columna, fibra, corte, acción)  ·  Δ (diferencia)
Clases de característica (5):  asignación · cantidad · conjunto · ciclo de vida · referencia   (+ demanda, después)
Archivos de optimización:      T · catálogo consolidado · Flat por bodega   (lo demás, bajo demanda)
Configuración (L31):           partición del retículo (v1: una sola Γ local) · guardas · capacidades · defectos
```

No colapsamos en un único mecanismo. Hay dos entidades con propiedades distintas (una espacial, otra temporal), una ley y cuatro mecanismos con responsabilidades separadas. Lo que **no** hay es un motor por cada funcionalidad tradicional.

### Impacto en lo ya construido
- **Núcleo (fase 1):** sin cambios. Ya es agnóstico de la partición y de las clases; la Trayectoria y el Cauce **son** sus piezas `secuencia` y `contrato`.
- **Consolidación, perfil v1:** donde decía dos ámbitos `Cat` e `Inv`, la v1 pasa a **una sola Trayectoria local** (el bloque más grueso del retículo, coherente con la interacción 3). La separación en `Cat` e `Inv` queda como configuración, para cuando las autoridades difieran.
- **Fases 2a/2b:** se reorganizan **por clase de característica**, no por catálogo e inventario: una regla de interpretación por clase sobre la misma `Γ`.
