# Spec · Fase 2 — Álgebra de preguntas (genérica, sin dominio)

**Fecha:** 2026‑11‑11 (redactada el 12‑nov) · **Autor:** agente matemático de Kobalt · **Estado:** borrador para el ciclo verificador → implementador.
**Destino del código:** `kobalt/src/preguntas/` (fase 2 de `kobalt/CONSOLIDACION_Y_PLAN.md`, Parte IV).
**Se apoya en:**
- `2026-11-11_fase1-nucleo.md` (con su Anexo);
- **`2026-11-11_fase1-enmienda-preguntas.md` (E1)**: esta spec **no** tiene motor de resolución propio. Toda pregunta se compila a una `Π` monoidal del núcleo y se resuelve con `resolverProyeccion`.

**Teoría:** `kobalt/docs/2026-11-11_ALGEBRA_DE_PREGUNTAS.md` (P1–P7) y las leyes L9, L10, L32–L34.

**Etiquetas.** [T] teorema con demostración aquí · [V] comprobado con `node` (scripts `f2.mjs` y `f2b.mjs` en el scratchpad de la sesión, fuera del repositorio) · [D] doctrina o decisión de diseño · [P] propuesta · [L] límite.

**Regla de vocabulario [D].** `kobalt/src/preguntas/` no contiene palabras de dominio. Revisión estática:
`grep -niE 'producto|variante|stock|sku|bodega|precio|inventario|catálogo|venta|cliente|depósito' kobalt/src/preguntas/` debe salir vacío.
Las palabras de dominio de esta spec aparecen solo en ejemplos marcados como tales.

**Supuestos prohibidos vigilados.**
- Prohibido 8 (escribir en una proyección): las materializaciones de esta fase no tienen ruta hacia `Γ`.
- Prohibido 6 (combinar con `min`, `max` o suma de agregados de nodos): la ley de distribución (§7.6) exige trayectorias disjuntas o un monoide idempotente.
- Prohibido 7 («último gana» por timestamp como autoridad): §7.3, monoide `último`.
- Prohibido 12: regla de vocabulario.

**Precisiones a documentos previos (no son contradicciones con leyes):**
1. `ALGEBRA_DE_PREGUNTAS.md`, P3, escribe `Q(i,j) = P_j · P_i⁻¹`. Es correcto solo en grupos **conmutativos**. En general, `Q(i,j) = P_i⁻¹ · P_j` (Teorema 7.2) [V].
2. `ALGEBRA_DE_PREGUNTAS.md` §2 y L32 hablan de levantar a `End(S) × M`. El monoide exacto es el **producto en corona** `M^S ⋊ End(S)` (Teorema E1.2 de la enmienda) [T][V]. En la práctica no cambia nada, porque solo se evalúa sobre la ejecución real.
3. «Ventana `t ≤ 31‑oct`» es un **prefijo** solo si el sello de tiempo es monótono en `n`. Si no, es un **filtro** (Teorema 7.4) [V].

---

## 1. Pregunta

El módulo responde **preguntas sobre trayectorias** sin saber qué significan las acciones.

| `q` | Pregunta | Para quién |
|---|---|---|
| `q_resp(q, s, ventana)` | ¿Cuánto vale `obs(f*(φ(Γ_{i:j})))` para la pregunta `q` en la ventana pedida? | Explorador de preguntas (fase 6), proyecciones de la fase 3, automatizaciones |
| `q_ventana(q, s, i, j)` | Lo mismo con `(i, j]` arbitraria, en `O(1)` (grupos) u `O(log n)` (monoides) si hay materialización | Reportes por período |
| `q_tiempo(q, s, t₁, t₂)` | La ventana delimitada por un sello de tiempo declarado en las entradas | Reportes por fecha |
| `q_producto([q₁…q_m], s, ventana)` | Varias preguntas en **una** pasada por `Γ` (P5) | UI, exportaciones |
| `q_distrib(q, σ)` | La pregunta sobre un corte cerrado de varias trayectorias, si es distribuible (P4) | Totales entre ámbitos (fases 8+) |
| `q_identidad(q)` | ¿Qué identidad tiene la pregunta? (`ContentId` de su definición) | Checkpoints: dos preguntas iguales comparten materialización |
| `q_materializar(q)` | ¿Qué hay que guardar para responder rápido? (cociente de Nerode, L34) | Configuración del nodo |
| `q_leyes(M)` | ¿`M` es conmutativo, idempotente o grupo? ¿Qué ventanas y qué distribución admite? | El propio módulo («preguntar a la arquitectura») |

---

## 2. Ámbitos (L20)

- **Esta fase no constituye ningún hecho.** No hay `AppendIfHead` ni acciones comprometidas. Por eso no añade vértices ni aristas al grafo de co‑acceso. [T]
- Lee cualquier `Γ_s` verificada, y varias solo sobre un **corte cerrado** (L21).
- **La definición de una pregunta no es un hecho de `Γ`.** Es un **valor** CV (§4.1). Guardar una pregunta (un «reporte guardado») no cambia ninguna respuesta, así que es configuración del nodo en `Γ_{Nodo_d}` (fase 1 §3.4). Si algún día una pregunta guardada fuese un compromiso comercial (por ejemplo, un cierre de caja firmado), sería una **acción** de un ámbito, no una pregunta. [D]

---

## 3. Contrato por ámbito

- **Quién solicita / quién constituye (L16).** Ninguna operación de esta fase solicita ni constituye. Una respuesta **no** confiere autoridad: una pregunta que diga «último precio» no es la autoridad del precio (L16, prohibido 7). [D]
- **Lectura.** El núcleo no tiene control de lectura. Quien tiene una copia de `Γ` puede responder cualquier pregunta. [L] (L23: ni hash ni cifrado son control de acceso.) Una pregunta puede **filtrar por actor o por época** (`φ`), pero eso es una orientación, no una protección.
- **Contrato por entrada.** Cada contribución `f(e_k)` se evalúa con `C_{ε_{k−1}}`, el contrato de su propia entrada (E1, `ctx_k`). Así las preguntas de autoridad («qué se hizo bajo la época 3») salen sin mecanismo aparte. [T por E1.4]

---

## 4. Estado `S`

### 4.1 Una pregunta es un dato

```
q = ( φ, aporte, M, obs [, sello] )                         valor CV; la ventana NO forma parte de q
id(q)  = 𝔇("kobalt:preguntas:q:1", CV(q))                   identidad Exacta de la pregunta
```

| Componente | Forma (CV) | Significado |
|---|---|---|
| `φ` | expresión booleana (§4.2) | filtro de entradas |
| `aporte` | expresión, o `{clave: expr, valor: expr}` para los monoides por clave | `f(e)` |
| `M` | `{nombre, parámetros}` del catálogo §7.3 | monoide |
| `obs` | `{nombre, parámetros}` del catálogo de observaciones §7.5 | qué se lee |
| `sello` | expresión entera opcional | sello de tiempo declarado, para ventanas por tiempo (§7.4) |

`leeEstado(q)` se **deriva**: vale verdadero si y solo si alguna expresión usa `lee` con un lector **de estado** (§4.2). No se declara, así que no puede mentir. [D]

**Compilación al núcleo (E1) [D]:**

```
Π_q = ( id = "preguntas:" ‖ hex(id(q)),  ver = hex(id(q)),
        f(e, ctx)   = eval(φ, e, ctx) ? eval(aporte, e, ctx) : M.unidad,
        monoide     = catálogo[M],  obs = catálogo[obs],
        leeEstado   = leeEstado(q),  sensibleAEpoca = false,  sensibleATiempo = (obs usa tRef) )
```

- `ver = id(q)`: cambiar cualquier componente cambia el checkpoint, y por tanto no se reutiliza nada guardado con otra pregunta (L22). [T]
- `sensibleAEpoca = false` siempre (Teorema E1.4a).

### 4.2 Lenguaje de expresiones (genérico; lo **reutiliza la fase 3**)

```
expr ::= {v: c}                                    constante CV
       | {e: "tipo"|"u"|"epoca"|"sid"|"clase"|"k"}   campo de la entrada (k = posición)
       | {a: [ruta…]}                              args[ruta] (null si no existe)
       | {p: nombre}                               parámetro del contrato de la entrada, C_{ε_{k−1}}
       | {x: nombre}                               variable ligada por el contexto (p. ej. "u" actor, "it" elemento)
       | {lee: idLector, con: [expr…]}             lector registrado: «de entrada» (e, k) o «de estado» (S_{k−1}; implica leeEstado)
       | {op: o, de: [expr…]}                      o ∈ { +, −, ×, =, ≠, <, ≤, y, o, no, si, en, prefijo, long, lista, mapa, campo, nulo? }
```

- **Total y determinista** [D].
  - Solo enteros seguros, texto, booleanos, `null`, listas y mapas (los valores CV; no hay reales).
  - Una operación mal tipada o un desbordamiento devuelve `null`, y `null` es falso en contexto booleano.
  - El evaluador no tiene reloj, ni azar, ni E/S.
- **Lectores registrados.** Es un registro `idLector@versión ↦ {clase: "entrada" | "estado", fn}`, inmutable por identificador (como el registro de reglas, fase 1 §3.1) y puro.
  - Un lector **de entrada** recibe `(e, k, …args)`. Sirve para descomponer `args` estructurados, por ejemplo las acciones internas de un lote. **No** implica `leeEstado`.
  - Un lector **de estado** recibe `(S_{k−1}, …args)` en las contribuciones y `(S_j, …args)` en `obs`. Implica `leeEstado`.
  - La fase 3 registra los suyos (`nacimientos`, `carac`, `movimientos`, `dueño`…). Esta fase solo define el mecanismo. [D]
- La **composición de filtros** es la expresión `{op: "y" | "o" | "no", de: [φ₁, φ₂, …]}`. No hay otra (P6).

### 4.3 Lo que se guarda (cociente de Nerode, L34)

| Materialización | Valor guardado | Checkpoint (E1) |
|---|---|---|
| Respuesta de `q` en la ventana `(i, j]` | `acum(i, j) ∈ M` | `(s, j, h_j, id(q), ε_j [, i, h_i])` |
| Tabla de prefijos de `q` (grupos) | `escaneo(M)`: `([P_0…P_j], P_j)` | igual, con la pregunta derivada `q^▷` (§7.2) |
| Índice de segmentos de `q` (monoides) | `segmentos(M)`: bloques alineados (§7.2) | igual, con `q^▦` |
| Pregunta con `leeEstado` | `acum` (el estado `S_j` se obtiene por L4) | igual |

**Minimalidad [T].** Lo que hay que guardar es `acum` **o** un cociente más pequeño, `κ : M → K`, con la condición de que `κ(m) = κ(m') ⇒ ∀w: obs(m ⊗ f*(w)) = obs(m' ⊗ f*(w))`. Es la congruencia de L10 aplicada a la pregunta. El catálogo indica el cociente conocido de cada `obs` (§7.5). Si una pregunta declara un `κ` propio, es una **obligación de prueba** (búsqueda exhaustiva en universos pequeños).
*Contraejemplo de cociente imposible: la mediana [V].* `med([1,5,9]) = med([5,5,5]) = 5`, pero tras añadir `[0,0]` dan `1` y `5`. No hay cociente más pequeño que el multiconjunto.

---

## 5. Acciones `A`

**No hay acciones comprometidas.** Las operaciones son lecturas puras con precondiciones (guardas de uso, no de admisión):

| Operación | Precondición | Resultado |
|---|---|---|
| `compilar(q)` | `q` es CV; `M` y `obs` existen en el catálogo; las expresiones están bien formadas; `lee` solo con lectores registrados (de entrada o de estado); `sello` es una expresión entera | `Π_q` (§4.1) o `PREGUNTA_INVÁLIDA(motivo)` |
| `responder(q, Γ, (i, j], guardados?)` | `0 ≤ i ≤ j ≤ n_local` | `obs(acum(i, j))` vía `resolverProyeccion` (E1) y el nuevo registro `(acum, checkpoint)` |
| `prefijos(q, Γ, j)` | `M` declara `inv` (grupo) | Materialización `q^▷` hasta `j` |
| `ventana(q, (i, j], mat)` | `mat` es una materialización `q^▷` o `q^▦` con checkpoint `≥ j` y continuidad verificada | `obs(P_i⁻¹ ⊗ P_j)` en `O(1)`, o `obs(⊗ bloques)` en `O(log n)` |
| `porTiempo(q, Γ, t₁, t₂)` | `q.sello` definido | `(i, j]` por búsqueda binaria sobre el sello efectivo (§7.4) |
| `producto([q₁…q_m])` | todas compilables | `q_×` con `M = M₁ × … × M_m` (P5) |
| `distribuir(q, σ)` | `σ` cerrado (L21); `M.conmutativo` | `obs(⊗_X acum_X)` (E1.5), o `NO_CONMUTATIVO` |

Ninguna operación escribe en `Γ`. Las materializaciones se guardan con `guardar(clave, registro)` de la materialidad, en un solo registro (M4). [D]

---

## 6. Invariantes `V_C`

Al no haber acciones comprometidas, las invariantes son propiedades de **toda materialización alcanzable** que produce el módulo. Se demuestran por inducción sobre las operaciones `responder`, `prefijos` y `ventana`, que son las únicas que producen registros.

**VQ1 (respuesta = oráculo) [T].** Todo registro `(acum, c)` cumple `acum = f*(φ(Γ_{c.i : c.n}))`. Esto incluye las preguntas con `leeEstado`, evaluadas sobre la ejecución real.
*Demostración:* V10 de la enmienda (Teorema E1.3). ∎

**VQ2 (tabla de prefijos) [T][V].** Toda materialización `q^▷` hasta `j` es `([P_0…P_j], P_j)`, con `P_k = acum(0, k)`.
*Demostración.* `escaneo(M)`, con elementos `(L, t)` y `(L₁,t₁)·(L₂,t₂) = (L₁ ‖ t₁⊗L₂, t₁⊗t₂)`, es un monoide [V: 3.000 ternas]. Con la contribución `f^▷(e) = ([f(e)], f(e))`, se tiene `f^▷*(Γ_j) = ([P_1…P_j], P_j)`. Con `P_0 = unidad`, se obtiene por inducción sobre `j`. ∎
*Consecuencia:* la tabla de prefijos **es una pregunta**, materializada por el mismo `resolverProyeccion`. No hay un segundo motor.

**VQ3 (índice de segmentos) [T][V].** Toda materialización `q^▦` hasta `j` contiene, para cada nivel `ℓ` y cada bloque alineado `b` con `(b+1)·2^ℓ ≤ j`, el producto `⊗_{k ∈ (b·2^ℓ, (b+1)·2^ℓ]} f(e_k)`.
*Demostración.* `q^▦` es la pregunta con `M = M*` (listas de contribuciones, concatenación) y `obs` = índice de bloques. El acumulado es la lista. El índice es una función de la lista, y su mantenimiento al anexar completa a lo sumo `⌈log₂ j⌉` bloques (`O(1)` amortizado). ∎

**VQ4 (leyes del monoide declaradas) [D, obligación de prueba].** Cada entrada del catálogo cumple asociatividad, unidad y los indicadores que declara (`conmutativo`, `idempotente`, `inv`). No es una invariante de estado: es una obligación del catálogo, comprobada por propiedades.
*[V]:* los 12 monoides de §7.3 cumplen asociatividad y unidad en 3.000 ternas cada uno. La conmutatividad declarada coincide con la real en todos.

**Lo que NO es invariante:**
- «`P_j ⊗ P_i⁻¹` es la ventana» (falso en grupos no conmutativos, §7.2).
- «una ventana por tiempo es un prefijo» (falso sin un sello monótono, §7.4).

---

## 7. Proyecciones `Π_q`

### 7.1 Fórmula general

```
Respuesta(q, (i, j]) = obs( ⊗_{k=i+1..j, φ(e_k)} aporte(e_k, ctx_k) ,  ctx_j )            (L32, E1)
```

Checkpoint: el de E1, con `ver = id(q)`. Incrementalidad: siempre (Teorema E1.3). `t_ref`: solo en `obs`; el checkpoint no lo lleva (E1.4b, L15).

### 7.2 Ventanas

**Teorema 7.1 (prefijo = recorrido directo) [T].** Para `(0, j]`, `responder` con un checkpoint `c.n ≤ j` coincide con el recorrido completo (E1.3). Es el criterio de salida de la fase 2 en el plan.

**Teorema 7.2 (grupos: ventana por prefijos) [T][V].** Si `M` es un grupo, `acum(i, j) = P_i⁻¹ ⊗ P_j`.
*Demostración:* `P_j = P_i ⊗ acum(i, j)`; se multiplica a la izquierda por `P_i⁻¹`. ∎
*[V]:* en el grupo simétrico `S₃` (no conmutativo), `P_i⁻¹·P_j` es correcta en 2.000/2.000 ventanas, y `P_j·P_i⁻¹` solo en 1.518/2.000.
*Extensión a los monoides por clave `ℕ^X`:* se calcula en `ℤ^X` (su grupo envolvente), donde está la resta.

**Teorema 7.3 (monoides: ventana por segmentos) [T][V].** Para cualquier `M`, `acum(i, j)` es el producto **en orden** de a lo sumo `2⌈log₂ n⌉` bloques alineados de `q^▦`.
*Demostración:* descomposición estándar de `(i, j]` en bloques diádicos alineados, en orden creciente; por asociatividad. ∎
*[V]:* coincide con el plegado directo en 2.000/2.000 ventanas, con los monoides no conmutativos `(suma, mín prefijo)`, `(A, Q)`, secuencia y último.

**Retroceso [P, optimización].** Si `M` es un grupo y el checkpoint guardado está adelantado (`c.n > j`), `acum(i, j) = acum(i, c.n) ⊗ acum(j, c.n)⁻¹`. El núcleo reconstruye en ese caso (E1 §7.3). Esta fase puede usar el retroceso **con** la tabla de prefijos.

### 7.3 Catálogo mínimo de monoides genéricos

| `M` (nombre) | Elementos, `⊗`, unidad | Conm. | Idemp. | Grupo | Nerode / tamaño | Ventana | Distribución (§7.6) |
|---|---|---|---|---|---|---|---|
| `suma` | `(ℤ, +, 0)` | Sí | No | Sí | 1 entero | prefijos `O(1)` | partición |
| `sumaPorClave` | `(ℤ^X, +, 0)`, mapas dispersos | Sí | No | Sí | `|claves tocadas|` | prefijos | partición |
| `conteo` | `(ℕ^X, +)` ⊂ `sumaPorClave` (aporte 1) | Sí | No | en `ℤ^X` | ídem | prefijos | partición |
| `mínimo`, `máximo` | `(ℤ ∪ {±∞}, min/max)` | Sí | Sí | No | 1 valor | segmentos | cualquier cubrimiento |
| `último` | `X ∪ {1}`, `x ⊗ y = y` si `y ≠ 1` | **No** | Sí | No | 1 valor | segmentos | **no** (solo por trayectoria) |
| `máximoPor(orden)` | `(clave, v)` con máximo lexicográfico | Sí | Sí | No | 1 par | segmentos | cualquier cubrimiento, **solo como lectura** (§7.6) |
| `extremoPrefijo(mín\|máx)` | `(s, e)`, `(s₁,e₁)⊗(s₂,e₂) = (s₁+s₂, min(e₁, s₁+e₂))`, unidad `(0, +∞)` | No | No | No | 2 enteros | segmentos | no |
| `unión` | `(𝒫(X), ∪, ∅)` | Sí | Sí | No | `|X tocado|` | segmentos | cualquier cubrimiento |
| `conjuntoAQ` | `(A, Q)`, `(A₁,Q₁)⊗(A₂,Q₂) = ((A₁∖Q₂)∪A₂, (Q₁∖A₂)∪Q₂)` | No | Sí | No | `|A|+|Q|` | segmentos | no |
| `secuencia` | `(A*, ‖, ε)` filtrado | No | No | No | **toda la lista** | segmentos | no |
| `producto(M₁…M_m)` | componente a componente | si todos | si todos | si todos | suma de tamaños | la más débil | la más débil |
| `mapa(etiquetas)` | mapas `X ⇀ M_τ`; cada valor lleva su etiqueta `τ` (un monoide del catálogo) y `⊗` es puntual. Unidad: el mapa vacío. Dos valores con distinta etiqueta en la misma clave ⇒ `null` (pregunta mal formada) | si todos los `M_τ` usados | si todos | si todos | `|claves tocadas|` | la más débil | la más débil |
| `escaneo(M)`, `segmentos(M)` | §6 VQ2 y VQ3 | No | No | No | `O(j)` | — | — |

- *Leyes:* [V] 3.000 ternas por monoide (asociatividad, unidad y conmutatividad declarada = real).
- **`secuencia` no se materializa nunca** [D, L34]: su cociente de Nerode es la propia subsecuencia de `Γ`. El kárdex o la historia de una entidad **es** `Γ` filtrada.
- **Preguntas que dependen del estado** (`leeEstado`). No son un monoide más del catálogo: son cualquier `M` del catálogo cuyo `aporte` usa `lee`. El monoide exacto es la corona `M^S ⋊ End(S)` (Teorema E1.2). Sobre una `Γ` **fija**, las contribuciones realizadas `c_k = aporte(e_k, S_{k−1})` son una sucesión fija, así que las ventanas por prefijos (grupos) y por segmentos siguen valiendo. [V: 1.000/1.000 ventanas de «merma» por diferencia de prefijos.] Lo que **no** vale es la distribución (§7.6).

### 7.4 Ventanas por tiempo

Sea `sello(e)` el tiempo declarado en una entrada (dato de la acción; el núcleo no tiene reloj). Se define el **sello efectivo** `τ_k := max_{k' ≤ k} sello(e_{k'})`, que es la pregunta `máximo` y es monótono por construcción.

**Teorema 7.4 [T][V].**
- (a) `{k : τ_k ≤ t}` es un **prefijo** `(0, j(t)]`, y `j(t)` se halla por búsqueda binaria sobre `τ`.
- (b) Si los sellos declarados son monótonos, ese prefijo coincide con el filtro `sello(e_k) ≤ t`. Si no, no coincide.

*Contraejemplo de (b) [V]:* `sello = [10, 20, 15, 30]` y `t = 17`. El prefijo por `τ` tiene 1 entrada; el filtro, las entradas `{1, 3}`.

Dos lecturas, ambas legítimas, que la pregunta elige como dato (`ventanaTiempo ∈ {prefijo, filtro}`, §10):
- **`prefijo`**: «lo que se sabía hasta `t`». Sirve para el estado en una fecha.
- **`filtro`**: «hechos declarados entre `t₁` y `t₂`». Si `M` no es conmutativo, el filtro **no** reproduce un estado histórico. [L]

### 7.5 Catálogo de observaciones (`obs`) genéricas

| `obs` | Sobre | Cociente conocido |
|---|---|---|
| `identidad` | cualquier `M` | `acum` |
| `componente(clave)` | `sumaPorClave`, `conteo` | el mapa |
| `ordenDesc(n)` (ranking) | `conteo` | el mapa (no hay cociente más pequeño) |
| `fibra(universo, máscaraConocidos)` | `unión`, `conjuntoAQ` | bitset sobre `T` con máscara de conocidos. El complemento es relativo a los conocidos (L2) |
| `aplicar(x₀)` | `extremoPrefijo` | `(s, e)` ⇒ `x₀ + min(0, e)` (mínimo alcanzado desde `x₀`) |
| `cociente(a, b)` | `producto(suma, suma)` | el par (p. ej. promedio = Σ/n) |
| `umbral(op, valor)` | `suma`, `máximo`… | **no** es congruente por sí sola: se guarda `acum` (Corolario de E1.3) |
| `lista(con saldos)` | `secuencia` | la secuencia |

### 7.6 Ley de distribución (P4 precisada) [T][V]

Sea un corte cerrado `σ` sobre trayectorias **disjuntas** `X₁…X_m` (coproducto, L25):

| `M` | ¿Cómo se combina? | Por qué |
|---|---|---|
| Conmutativo | `⊗_X acum_X` en cualquier orden | factoriza por multiconjuntos (E1.5) [V 1.000/1.000] |
| Conmutativo **e idempotente** (semirretículo) | cualquier **cubrimiento**, incluso réplicas con solape | `x ⊗ x = x` [V: unión 1.000/1.000] |
| Conmutativo no idempotente con solape | **deduplicar por identidad** `(StreamID, k)` antes de combinar | si no, cuenta dos veces [V: suma correcta solo 328/1.000 con solape] (L13) |
| No conmutativo | solo por trayectoria; entre trayectorias no hay orden (L21) | `NO_CONMUTATIVO` |
| `leeEstado` | solo por trayectoria | las contribuciones dependen del orden a través de `S` (contraejemplo: `Ingresar 5; Contar 1` da merma 4; en el otro orden, 0) |

`último` se vuelve conmutativo como `máximoPor(orden)` **solo** con una clave de orden explícita. Dentro de una trayectoria, la clave `k` es exacta. Entre trayectorias, una clave temporal da una **lectura** («el último sello declarado»), nunca una **autoridad** (L16, prohibido 7). [D]

### 7.7 Producto de preguntas (P5) [T]

`(f₁, …, f_m)*` en `M₁ × … × M_m` es igual a `(f₁*, …, f_m*)`, por la propiedad universal aplicada componente a componente. Se responden `m` preguntas en una pasada. La pregunta producto tiene su propio `id`, igual a `id(lista de los q_i)`, y su propio checkpoint. También puede materializarse cada componente por separado: son equivalentes. [V: `producto(suma, extremoPrefijo)` asociativo, 3.000 ternas.]

### 7.8 Familias de `ALGEBRA_DE_PREGUNTAS.md` §6 con reglas de juguete (criterio de salida)

Con `contador@1` (acciones `sumar(k)` y `fijar(k)`) y `conjunto@1` del modelo de la fase 1:

| Familia | `φ` | `aporte` / `M` | `obs` | Comprobación |
|---|---|---|---|---|
| Flujos | `tipo = sumar` | `a.k` / `suma` | identidad | ventana por prefijos = recorrido |
| Frecuencias | — | `{clave: e.tipo, valor: 1}` / `conteo` | `ordenDesc` | igual a contar a mano |
| Extremos | `tipo = sumar` | `[a.k, a.k]` / `extremoPrefijo(mín)` | `aplicar(0)` | mínimo del camino |
| Conjuntos | — | `[a.clave]` / `unión` | `fibra` | tocados; complemento sobre conocidos |
| Últimos | `tipo = fijar` | `a.k` / `último` | identidad | última fijación |
| Secuencias | `a.clave = c` | `[e]` / `secuencia` | `lista` | = `Γ` filtrada |
| Dependiente del estado | `tipo = fijar` | `max(0, lee(valor,clave) − a.k)` / `suma` | identidad | «merma» de juguete |
| Autoridad | `e.u = x ∧ e.epoca = 3` | cualquiera | — | composición de filtros |

---

## 8. Leyes aplicables (para `kobalt-verificador`)

**Oráculo:** `obs(⊗_{k ∈ (i,j], φ} aporte(e_k, ctx_k))` calculado recorriendo `Γ` con `Fold` en paralelo (para `ctx_k.S`). **Generador:** trayectorias de la fase 1 con reglas de juguete, épocas y rechazos intercalados; preguntas generadas desde el catálogo. Semilla `KOBALT_SEED`.

| Ley | Cómo se verifica |
|---|---|
| **L32** | Para toda pregunta generada, `responder` = oráculo en toda ventana `(i, j]`. Una pregunta es CV: `compilar(q)` dos veces da la misma `id`. Cambiar un byte de `q` cambia `id` y no reutiliza la materialización |
| **L33** | Leyes de cada monoide del catálogo (asociatividad, unidad, `conmutativo`, `idempotente`, `inv`) en 3.000 ternas. Mutante «declarar `último` conmutativo» ⇒ `distribuir` da resultados distintos según el orden de las trayectorias ⇒ falla |
| **L34** | Cada `obs` con un cociente declarado: búsqueda exhaustiva en universos pequeños de la congruencia `κ(m) = κ(m') ⇒ obs(m ⊗ w) = obs(m' ⊗ w)`. Caso de la mediana: no hay cociente. `secuencia` no tiene materialización (revisión) |
| **L9 / L10** | `responder` desde cualquier checkpoint (válido, adelantado, de otra `i` o de otra pregunta) = oráculo. Mutante «guardar `obs(acum)` y actualizar sobre él» con `umbral` ⇒ falla |
| **P3 (Teorema 7.2)** | Grupo no conmutativo de juguete (`S₃`): `ventana` = `P_i⁻¹ ⊗ P_j`. Mutante «`P_j ⊗ P_i⁻¹`» ⇒ falla |
| **Teorema 7.3** | `ventana` por segmentos = plegado directo, con monoides no conmutativos, para `n ≤ 200` y todas las ventanas |
| **VQ2 / VQ3** | La materialización de prefijos o segmentos, actualizada por sufijos arbitrarios = reconstruida |
| **P4 (§7.6)** | Particiones aleatorias de entradas en trayectorias disjuntas: conmutativo ⇒ igual; no conmutativo ⇒ `NO_CONMUTATIVO`; suma con réplicas solapadas sin deduplicar ⇒ distinto (prueba documental de L13); unión con solape ⇒ igual |
| **P5** | `producto` = componentes por separado, con **una** sola pasada (instrumentar el número de llamadas a `aportes`) |
| **P6** | `φ₁ ∧ φ₂` = aplicar `φ₂` sobre la subsecuencia de `φ₁` |
| **Teorema 7.4** | Sellos monótonos ⇒ prefijo = filtro; sellos no monótonos ⇒ el caso `[10,20,15,30]`, `t = 17` |
| **L15** | `obs` con `tRef`: el mismo `acum` responde a dos `tRef` sin reconstruir; el checkpoint no lleva `tRef` |
| **L21** | `distribuir` con un corte no cerrado ⇒ rechazo (lo exige el núcleo) |
| **L16** | Revisión: ninguna operación del módulo llama a `appendIfHead` ni a `anexarSiCabeza` |
| **Vocabulario** | `grep` de la cabecera vacío |

---

## 9. Fronteras [L]

1. **Sin control de lectura.** Una pregunta filtrada por actor no protege nada (L23).
2. **Hechos ausentes.** Ninguna pregunta inventa un hecho que `Γ` no tenga. Sin costo en las entradas no hay valoración, y sin sello declarado no hay ventanas por fecha (`ALGEBRA_DE_PREGUNTAS.md` §9.4).
3. **Sellos declarados.** El sello es una afirmación del solicitante, no un reloj verificado. El sello efectivo es monótono, pero puede adelantarse si un dispositivo tiene el reloj adelantado.
4. **Preguntas no distribuibles.** Las no conmutativas y las que dependen del estado no se combinan entre trayectorias.
5. **Coste.** `obs` (rankings, fibras) se recalcula al leer. Las materializaciones `escaneo` y `segmentos` ocupan `O(n)`.
6. **Lectores.** Su pureza e inmutabilidad por versión son obligaciones de quien los registra (fase 3). Esta fase no puede imponerlas: se verifican por pruebas.

---

## 10. Espacio de configuración (L31)

Ninguno de estos parámetros cambia una respuesta: solo cuándo y cómo se calcula. Por eso viven en el contrato del nodo `C(Nodo_d)` (fase 1 §3.4), salvo la elección de la lectura temporal, que es **parte de la pregunta** (dato de `q`).

| Parámetro | Dónde | Posibilidades | Qué implica | Valor inicial |
|---|---|---|---|---|
| Materialización de `q` | `C(Nodo_d)` (`nodo.materialización`, por pregunta) | ninguna / respuesta en prefijo / prefijos (grupos) / segmentos | Teoremas 7.1–7.3; L34: solo si el tiempo de respuesta lo exige | ninguna (bajo demanda) |
| Umbral para materializar | `C(Nodo_d)` | milisegundos de recorrido tolerados | Criterio de L34 | 50 ms |
| Lectura temporal | dato de `q` (`ventanaTiempo`) | `prefijo` / `filtro` | Teorema 7.4 | `prefijo` |
| Retroceso con inverso | `C(Nodo_d)` | usar / no usar `inv` con un checkpoint adelantado | §7.2: mismo resultado | no usar |
| Cociente declarado | dato de `obs` | ninguno / `κ` con prueba | §4.3 | ninguno |
| Orden de combinación entre trayectorias | — | **no configurable**: §7.6 lo fija la conmutatividad | — | — |

**Contradicciones con leyes:** ninguna. Las tres precisiones de la cabecera corrigen documentos, no leyes.
**Supuestos empíricos:** ninguno.
**Dependencia con la fase 3:** el lenguaje de expresiones (§4.2) y el registro de lectores son la **única** pieza que la fase 3 reutiliza. Debe implementarse primero (§4.2 es autocontenido).
