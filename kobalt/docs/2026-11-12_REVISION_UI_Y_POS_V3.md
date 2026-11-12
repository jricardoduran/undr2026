# Kobalt — Revisión de la lógica de Kobalt UI 2.2.1 y del POS V3 (venta por acciones), y su adaptación a páginas específicas

**Fecha:** 2026‑11‑12 · **Objeto:**
- `KOBALT_UI_V2_2_1_DEMO_COMPLETO` (librería visual: `kobalt.css`, `kobalt.js`, contratos, Studio, 8 apps de demostración);
- `KOBALT_POS_V3_VENTA_POR_ACCIONES` (páginas `operar/*.html`, `tienda/*.html`, controladores `Interfaz/*.js`, doc `07_VENTA_COMO_SECUENCIA_DE_ACCIONES.md`).

**Método.** Se leyó el código y la doctrina de ambos y se renderizó la librería en Chromium. Los hechos [V] se comprobaron con `node` o en el navegador el 12‑nov.

---

## Parte I — Matemática

### 1. La frontera correcta: observables hacia arriba, propuestas hacia abajo

La librería declara su tesis como `L →Π_L→ 𝒪 →Visual→ UI`: recibe **observables semánticos** de «cualquier lógica de dominio» y no sabe de dónde vienen. Nuestra arquitectura tiene exactamente ese hueco:

```
Γ ──Fold──▶ S ──Π_q──▶ respuestas(q, corte)      ⇒  𝒪   (lo que la UI recibe)
UI ──intención──▶ plantilla δ ──AppendIfHead──▶ Γ        (lo que la UI emite: propuestas)
```

**Teorema 1 (puerta única) [D].** Toda página es `Π(realidad@corte, capacidades, propósito)` y solo tiene dos verbos hacia el dominio:
- `preguntar(q, corte)`: lectura pura, un homomorfismo (L32);
- `proponer(plantilla, args, sid)`: admisión y compromiso (L16).

Más dos auxiliares que no constituyen nada: `previsualizar` (admitir sobre una copia) y `suscribir` (avisar de un corte nuevo). No hay un tercer canal: ni escribir una proyección, ni un estado propio de página que pase por hecho.

### 2. La venta como secuencia de acciones (POS V3) es una pregunta sobre una referencia

El POS V3 fija: una venta es una **referencia** `ρ` común; cada **acción** admitida es un compromiso que la cita (una variante, una cantidad, un precio pactado); la atomicidad corta por «el efecto de cada acción sobre una variante», no por el carrito; la proyección de la venta recorre los compromisos de `ρ` en orden de trayectoria.

En nuestro lenguaje:

| POS V3 | Kobalt |
|---|---|
| Referencia de venta `ρ` | Identidad por nacimiento (L28) de una entidad que agrupa |
| Acción admitida | Un `δ` comprometido (`Nacer:venta` + sus transiciones) que cita `ρ` |
| Proyección de venta | Pregunta `(φ: ref = ρ, …)` sobre `Γ` |
| Propuesta | Intención con `sid`; vive en la interfaz hasta que se admite |
| «Rechazo visible en el borrador» | Una propuesta rechazada **no es un hecho** (L14): se queda en la página |
| «Total = Σ qᵢpᵢ» | Pregunta de suma en `ℤ` (grupo): materializable, ventana en O(1) |
| Estado de cumplimiento | Marcado de los depósitos de cada línea (pend, asig, desp, porCobrar, cobrado) |

**Teorema 2 (la atomicidad del carrito es configuración) [T].** Sea una propuesta `π = (a₁,…,a_m)`. Hay dos realizaciones legítimas, ambas plantillas sobre la misma Red:
- **todo‑o‑nada:** `Lote{a₁…a_m}`, atómico (L20);
- **por acción:** `m` compromisos independientes, cada uno con su guarda.

Difieren solo en qué prefijos de `π` pueden quedar comprometidos: `{∅, π}` frente a `{a₁…a_k : k ≤ m}` con huecos por rechazo. Como ninguna es consecuencia de la matemática, es un **parámetro del contrato** (L31). Valor inicial: **por acción**, porque el caso «100 productos válidos, uno agotado» es legítimo y no debe impedir los otros 99. El `Lote` sigue disponible y se elige cuando el caso de uso exige todo‑o‑nada.

**Teorema 3 (reintento = diferencia) [T].** Sea `sid_i = 𝔇(ρ, i)` el identificador determinista de la acción `i`. Tras una respuesta perdida, lo que falta es `Δ(π, Γ) = { a_i : sid_i ∉ Γ }` (L30; predicado `nucleo.sid` sobre la trayectoria, E2). Reenviar `Δ` es idempotente: no hace falta «conservar el intento y retomar antes de avanzar» como mecanismo aparte.

**Teorema 4 (la vista previa de una secuencia es un plegado de admisiones) [T].** `previsualizar(π)` evalúa `admisible(S_{k+i−1}, a_i)` sobre una copia, aplicando `T` a cada acción admitida. Coincide con la confirmación si el corte no cambia. Si cambia entre ambos momentos, la diferencia **no es un error**: es L8 (un sucesor por cabeza), y es exactamente el caso «la quinta propuesta fue rechazada por un conteo posterior».

### 3. Dónde la librería lleva semántica de dominio que no es la nuestra

La librería es una teoría visual limpia, pero `KobaltSemantics` y su «mundo» incorporan dominio de forma tradicional [V, `kobalt.js:289–341`]:

| En la librería | Por qué difiere | En Kobalt |
|---|---|---|
| `stockState(stock, target)`: `≤0` agotado; `stock/target ≤ 0.3` bajo | El `0.3` y el `target` son decisiones incrustadas | `target` es una **característica** de la variante (asignación); «bajo» es la fibra `H ≤ umbral`; la proporción es parámetro de la pregunta (L31) |
| `order.status` como una etiqueta única (paid, pending, shipped…) | Es un campo escrito, no derivado | **No existe como campo.** Es `obs` sobre el marcado de depósitos: una tabla `marcado → etiqueta` como dato |
| `orderTotal = Σ lines.q·unitPrice` | Recalcula a mano | Pregunta de suma sobre las acciones de la referencia |
| Producto con un único `stock` y `stockState` precalculado en el proveedor | Acopla la tarjeta a la forma de su mundo. [V] La tarjeta que rendericé mostró `UNDEFINED · 10` porque `stockStatus` lee `product.stockState` | Existencias por (bodega, variante) de la red; el estado lo calcula una pregunta y entra como observable |
| `customerSummaries`, `revenueSeries`, `analytics` como «observaciones» del mundo | Precalculadas fuera | Preguntas (flujos, frecuencias, conjuntos) calculadas al leer, con el corte elegido |
| `facts` primarios (`catalog.products`, `inventory.positions`) y `demo.data.patch.js` que edita datos | Hechos como autoridad y edición directa | Los hechos son proyecciones; editar es proponer (L16, L27) |
| Carrito `Map(productoId → cantidad)` | Por producto, sin precio pactado | Propuesta por **variante**, con precio pactado y modalidad |

**Regla de adaptación.** Se conserva **toda la realización visual** (CSS, geometría, componentes, temas, densidad, contratos de componente) y se descarta **su semántica de dominio y su mundo**. El runtime visual recibe observables ya listos.

### 4. La doctrina visual ya es la nuestra

No es una coincidencia sino la misma disciplina:
- «`λ_req ∈ Λ_C`, `λ_eff = Admit_C(ξ, λ_req, ℐ_C)`; customizar = elegir un punto admisible del espacio de parámetros» **es L31**: la matemática abre un espacio, la configuración manual elige dentro.
- «requested ≠ effective», «Identity(C) ≠ Position(C)», «Metric ≠ Paint» son nuestras distinciones aplicadas a lo visual.
- «Un componente no contiene sus layouts» es «una funcionalidad no contiene su mecanismo».

Por eso la unión es limpia: el **contrato de componente** de la librería y el **contrato de capacidades** nuestro hablan de lo mismo desde lados distintos.

### 5. Hecho técnico sobre los archivos recibidos [V]
- **Las etiquetas HTML se perdieron al unificar el `.txt`**: `index.html`, `estructura*.html` y `thema-lab.html` llegaron como texto sin marcado (0 caracteres `<` en `index` y en las tres `estructura*`; 2 en `thema-lab`). El CSS y los JS están íntegros y `node --check` los acepta.
- **El shell** (`index.html`, 11 KB) hay que reconstruirlo desde los selectores `data-k-*` que consume `kobalt.js`, o recuperarlo del zip original.
- **Viabilidad visual comprobada:** `body.k-body` + `kobalt.css` + `kobalt.js` reproduce en Chromium el aspecto del demo (tarjetas con halo, panel de propuesta, botón sólido). Chromium **sí** funciona en este entorno, así que podemos verificar visualmente lo que el POS V3 dejó pendiente.

---

## Parte II — Concepto

### 6. Qué se conserva, qué se cambia, qué se descarta

| De | Se conserva | Se cambia | Se descarta |
|---|---|---|---|
| **Kobalt UI** | `kobalt.css`, componentes (`productCard`, métricas, paneles, tablas adaptativas, galería), temas claro/oscuro, densidades, doctrina de contratos | `stockStatus`/`orderStatus` pasan a recibir el estado ya calculado como observable | `KobaltSemantics`, el «mundo» y sus 8 apps de demostración |
| **POS V3** | Páginas separadas (`inventario`, `pos`, `ventas`, `producto`, `tienda`); venta como referencia + acciones; la propuesta vive en la interfaz; vista previa sobre copia; **`AGENTS.md`: la pregunta de coherencia** | La API de 14 consultas y 22 comandos → la puerta (preguntar/proponer); el carrito pasa a variantes con modalidad | `core.js`, `api.js` (reemplazados por nuestros módulos) |
| **Nuestro** | Núcleo, preguntas, dominio | El dominio debe aceptar la **referencia** que agrupa las acciones de una venta (ver §7) | — |

**La pregunta de coherencia del POS V3 se adopta tal cual** (va a `CLAUDE.md`):
> ¿Es coherente esta decisión con la arquitectura de base? ¿Qué estamos heredando de la implementación anterior o de la práctica habitual, y qué razón del dominio o de la trayectoria justifica conservarlo?

### 7. La referencia de venta y la spec de la fase 3

Hoy la spec de la fase 3 modela `venta` como **una línea con una variante**. El POS V3 tiene razón en que una venta del mundo real reúne varias variantes. Solución con **menos mecanismos** (cumple L35: datos, no código):

- **Opción elegida [P]:** una entidad `pedido` en la Forma, con `cliente`, `canal` y `actor` como características de asignación, que **nace en el mismo compromiso** que su primera línea admitida (`Lote{Nacer:pedido, Nacer:venta}`); las líneas siguientes son `Nacer:venta` con `pedido = ρ`. La referencia `ρ` es el ID `(i,j)` del `pedido`.
- Así se cumple «el primer compromiso admitido establece el contexto de la referencia» sin una restricción entre entidades: el contexto vive en `pedido`, que es inmutable por la Forma.
- La proyección de la venta es `Section(pedido) + fibra(venta.pedido = ρ)`.
- Es **solo un cambio de datos** en `FORMA_INICIAL`; la Red no cambia, porque opera por línea.

La alternativa (un atributo `referencia` en cada `venta` más una restricción de contexto entre líneas) exige una restricción nueva en el lenguaje de guardas. Se descarta mientras la primera baste.

### 8. Páginas específicas: qué pregunta y qué propone cada una

| Página | Preguntas (lectura) | Propuestas (plantillas) | Apariencia |
|---|---|---|---|
| **`inventario.html`** | Existencias por (bodega, variante) en la lectura global; fibras derivadas de la Forma; kárdex de cada valor; panel «Ahora» (marcado de depósitos intermedios y alertas) | `Contar`, `Ingresar`, `Transferir` | Tabla adaptativa matriz/registros, métricas, tarjetas de alerta |
| **`pos.html`** | Catálogo = fibra «vendible» en la lectura elegida; saldo libre por variante; vista previa de la secuencia | `Vender` por variante con modalidad (entregar ahora, apartar, pedido, registrar); confirmación por acción | Cuadrícula de tarjetas y panel lateral de propuesta, como el POS del demo |
| **`ventas.html`** | Historial = pregunta por referencia `ρ`; total; estado de cada acción desde el marcado | `Despachar`, `Cobrar`, `Devolver`, `Cancelar`, `Recibir` sobre la acción elegida | Panel con lista y detalle por acción |
| **`producto.html`** | Ficha como sección; filtros; historia de cada valor | `Nacer` (producto + primera variante + conteo en un `Lote`), `Fijar`, `Añadir`, `Quitar`, fotos por `Q` | Galería, formulario por disclosure |
| **`tienda/index.html`, `tienda/producto.html`** | Proyección pública (capacidades de visitante); disponibilidad libre | ninguna (solo lectura) | Catálogo y ficha de visitante |
| **Barra común** | — | — | Corte · lectura · perfil, para todas las páginas; navegación lateral/compacta por contexto |

Cada página lleva un **controlador fino** que solo traduce eventos a `proponer`/`preguntar` y observables a componentes. Ninguna página contiene una regla de negocio.

### 9. Qué resuelve cada hallazgo (resumen)
- Venta por referencia + acciones → entidad `pedido` (datos) + Teoremas 2–4.
- Atomicidad del carrito → parámetro (por acción | todo‑o‑nada).
- Reintento → `Δ` por `sid` determinista.
- Estado de venta → `obs` sobre el marcado, no un campo.
- Estado de stock → pregunta con umbral como característica.
- Intentos rechazados → propuestas de la página (L14). Si luego se quiere auditarlos, el lugar es la trayectoria **local del nodo** (`Nodo_d`), no la de dominio [P].
- Shell de la librería perdido → reconstruir desde selectores o pedir el zip original.

---

## Parte III — Plan

1. **Spec de la puerta y de las páginas** (matemático): contrato de `preguntar/proponer/previsualizar/suscribir`, el modo de carrito, `sid` determinista, el `pedido`, y la tabla `marcado → etiqueta`.
2. **Dominio rehecho** (fase 3, en curso) con el anexo C **más** el tipo `pedido` y las modalidades de venta como plantillas.
3. **Adaptador IndexedDB** (fase 5): M1 con compare‑and‑append, y una versión en memoria para pruebas.
4. **Puerta** (pruebas de leyes y contrato; implementación).
5. **Páginas** sobre `kobalt.css`, con verificación visual en Chromium (capturas a escritorio y móvil).

**Regla de publicación.** La librería y el POS V3 son material tuyo no publicado. Las páginas las referencian por una ruta relativa `kobalt/app/ui/`, ignorada por git, con un script `instalar-ui` que la extrae de tu zip. El repositorio público contiene nuestras páginas y controladores, no tu librería.
