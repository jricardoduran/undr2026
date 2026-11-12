# Spec · Fase 1 — Enmienda E1–E8: proyecciones como preguntas y precisiones del núcleo

**Fecha:** 2026‑11‑11 (redactada el 12‑nov) · **Autor:** agente matemático de Kobalt · **Estado:** borrador para el ciclo verificador → implementador.
**Enmienda a:** `kobalt/specs/2026-11-11_fase1-nucleo.md` (incluido su Anexo). Prevalece sobre ella solo en lo que esta enmienda dice explícitamente. Todo lo demás sigue vigente.
**Por qué ahora.** El núcleo **no** está integrado (la revisión conceptual dio `OBJECIONES`). Corregirlo ahora no viola la métrica «el núcleo no cambia en las fases 2 a 8» (`CONSOLIDACION_Y_PLAN.md`, Parte IV). Esa métrica empieza a contar cuando se integre el núcleo enmendado.
**Specs que se apoyan en esta:** `2026-11-11_fase2-preguntas.md` (E1) y `2026-11-11_fase3-forma-y-flujo.md` (E3, E4).

**Etiquetas.** [T] teorema con demostración aquí · [V] comprobado con `node` (scripts en el scratchpad de la sesión, fuera del repositorio) · [D] doctrina o decisión de diseño · [P] propuesta · [L] límite.

**Regla de vocabulario.** Sin cambios: el `grep` de dominio sobre `kobalt/src/nucleo/` debe seguir vacío.

**Supuestos prohibidos vigilados.** Prohibido 8 (escribir en una proyección): E1 no añade ninguna ruta de escritura hacia `Γ`. Prohibido 12 (semántica de negocio en un kernel): E3 y E4 son mecanismos sin dominio. Prohibido 9 (dos `put()` = transacción): E1 conserva M4 (un registro `(acum, checkpoint)` es una sola unidad).

---

## Resumen de la enmienda

| Id | Cambio | Motivo (contraejemplo o ley) | Tipo |
|---|---|---|---|
| **E1** | `Π` general en **forma monoidal**: `(f, M, obs, leeEstado)` con ventana `(i, j]`. La forma `π : S → Y` pasa a ser un caso particular | Una pregunta sobre `Γ` en general **no** es función de `S` (Teorema E1.1). Sin E1, la fase 2 tendría que meter reportes dentro de `D` (contra L32) o crear otro motor de resolución | Cambio de interfaz |
| **E2** | El predicado estable `nucleo.sid` se define sobre la **trayectoria**: `∃ i ≤ k : e_i.sid = s₀` | `sid ∈ Sids_Y` deja de valer si una época posterior cambia `nucleo.retenciónSids` a `ventana(N)` (Teorema E2.1). Corrige los Teoremas 7.7(c) y 7.8 (Δ3) | Corrección |
| **E3** | `tipos` de una regla admite **claves patrón** (`'Prefijo*'`) | Con la Forma y la Red como parámetros (fase 3), los tipos finos (`Disparar:Vender`) no se conocen al registrar la regla (Teorema E3.1) | Extensión compatible |
| **E4** | Autorización de acciones **compuestas**: hook opcional `tiposInternos(e)`, y G1 exige capacidad para cada tipo interno | Un `Lote` autorizado solo por su tipo externo deja pasar acciones internas sin capacidad (Teorema E4.1). Generaliza lo que G1 ya hace con `FijarParámetro(m)` | Extensión compatible |
| **E5** | `S_k` se obtiene **solo** por `Fold` o por un snapshot validado contra `h_k` | Un estado en caché sin ligar a `h_k` es una proyección sin checkpoint (L22, L27) | Precisión de implementación |
| **E6** | `incorporar` toma `readmitir` de `nodo.verificarAlIncorporar` (o explícito), sin literal en el código | L31: un valor de configuración solo puede aparecer como `valorInicial` de un `Σ` | Precisión de implementación |
| **E7** | `diferencia` deduplica por la clave `hex(CV(id(o)))` | Con identidades compuestas (listas), `Map`/`Set` comparan por referencia y no deduplican (L13) | Precisión de implementación |
| **E8** | `componer` rechaza dos aportes con el mismo `StreamID` | El coproducto se indexa por `StreamID` (L25). Dos aportes del mismo `StreamID` son dos copias, no dos ámbitos | Precisión |

**Lo que la enmienda NO cambia** (y por qué no hace falta) [T]:
- **Posición en `T_r`.** La fase 3 necesita la posición `i` de la entrada que hace nacer una entidad (identidad por nacimiento). `T_r(D, e, parámetros)` no recibe `i`, pero lo puede calcular: `i = nd + e.ε + 1`, donde `nd` es el número de entradas de dominio anteriores, que la regla lleva en su `D`. *Demostración:* por V4, `e.ε` es el número de entradas de contrato anteriores a `i`. Las entradas anteriores a `i` son de contrato o de dominio, así que `i − 1 = e.ε + nd`. ∎ [V: 2.000 secuencias aleatorias con entradas de contrato intercaladas, posición e identidades `(i, j)` correctas y únicas]. Obligación de la regla: toda `Migra` conserva `nd`.
- La cadena de hashes, CV, `AppendIfHead`, `Incorporar`, `Resolver`, los cortes y la diferencia `Δ` (salvo E7) no cambian.

---

## 1. Pregunta

La enmienda no añade preguntas nuevas al núcleo. Cambia **la forma** de `q_proy(Π, σ)` (fase 1 §1): la proyección deja de ser solo `π(S_σ)` y pasa a ser `obs(f*(Γ_{i:j}))`, es decir, una pregunta `(φ, f, M, obs, ventana)` de L32 en la que `φ` se pliega dentro de `f` (Teorema E1.3).

| `q` | Pregunta | Para quién |
|---|---|---|
| `q_proy(Π, (i, j])` | ¿Cuánto vale `Π` en la ventana `(i, j]` de `s`? ¿Se reutiliza, se actualiza o se reconstruye? | Fase 2 (toda pregunta), fase 3 (catálogo, Flat, disponibilidades), UI |
| `q_aportes(Π, (i, j])` | ¿Qué aporta cada entrada `e_k`, `k ∈ (i, j]`, a `Π`? | Fase 2 (tablas de prefijos, segmentos), verificador |
| `q_estable(Y, k, sid)` | ¿Estaba comprometida la solicitud `sid` en `Γ_Y` hasta `k`? | Guardas con `deps` (E2) |

---

## 2. Ámbitos (L20)

Sin cambios respecto de la fase 1 §2 (Teorema 2.1). E1 añade lecturas, no escrituras. Una proyección multi‑trayectoria en forma monoidal lee varias `Γ_X` en un corte cerrado (L21) y no crea aristas de co‑acceso, porque no constituye nada. [T]

---

## 3. Contrato por ámbito

Sin cambios en `C_ε` ni en los papeles de L16. Hay dos ampliaciones de la **interfaz de una regla** (fase 1 §3.1).

| Componente | Firma | Obligación |
|---|---|---|
| `tipos` (E3) | `{ tipo \| 'prefijo*' ↦ (args, tipo) → bool }` | Las claves exactas tienen prioridad sobre las de patrón. Si varias claves de patrón coinciden, gana el prefijo más largo. Ningún patrón puede coincidir con `FijarParámetro` ni con `Sellar` (reservados del núcleo) |
| `tiposInternos` (E4, opcional) | `(e) → [tipo]` | Pura. Solo se llama si `e` pasó G5. Devuelve los tipos de las acciones que `e` compone |

**Autorización (G1) enmendada [D]:**

```
Authorized_{C_ε}(u, e) ⟺ ∀ τ ∈ {tipo(e)} ∪ tiposInternos(e) : ∃ π ∈ capacidades(u) : coincide(π, τ)
```

Para `FijarParámetro(m)`, la regla de la fase 1 queda igual: `tiposInternos = {FijarParámetro:p : p ∈ dom m}`. Es el mismo principio.
Solicita `u`; constituye el mecanismo `C_ε.constituyente`. E4 no cambia quién constituye, solo qué capacidades se comprueban (L16).

---

## 4. Estado `S`

El estado del núcleo no cambia: `S = (n, ε, C_ε, sellado, Sids, D)`.

Lo que cambia es el **estado de una proyección**: el valor guardado es el **acumulado** `acum ∈ M` (no `obs(acum)`) junto con su checkpoint.

| Forma | Valor guardado | Por qué es suficiente (Nerode) |
|---|---|---|
| Monoidal, `leeEstado = false` | `acum(i, j) ∈ M` | `acum(i, j') = acum(i, j) ⊗ f*(Γ_{j:j'})` (asociatividad). `obs` se aplica al leer [T] |
| Monoidal, `leeEstado = true` | `acum(i, j)`, y `S_j` se obtiene por L4 (snapshot `≤ j` + sufijo) | La contribución `f(e_k, S_{k−1})` necesita `S_{k−1}`. El par `(S, acum)` es la acción del producto en corona (Teorema E1.2) |
| Clásica `π : S → Y` | `Y = π(S_j)` | Igual que en la fase 1 (§7.1, L10) |

E5 [D]: dentro del núcleo, `S_k` **solo** se obtiene como `Fold(S_0, Γ_k)` o como `Fold(restaurarSnapshot(snap), Γ_{n_snap+1:k})`, con un snapshot validado contra `h_{n_snap}` (§7.2 de la fase 1). Una lista de estados en caché (`Γ.estados`) es una proyección. Solo se usa si su checkpoint `(k, h_k)` coincide con la `Γ` local verificada (L22, L27). Si no, se ignora.

---

## 5. Acciones `A`

No hay acciones comprometidas nuevas. Las guardas G0–G5 de la fase 1 §5.1 se enmiendan así:

| Id | Guarda enmendada | Cambio |
|---|---|---|
| G1 | `Authorized` con `tiposInternos` (§3) | E4 |
| G4 | La lectura estable `nucleo.sid(s₀)` en `(Y, k, h)` vale `∃ i ≤ k : e_{Y,i}.sid = s₀` | E2 |
| G5 | `tipo` coincide con una clave **exacta o patrón** de `tipos(r_ε)`, y `validador(args, tipo)` acepta | E3 |

El orden de evaluación del Anexo de la fase 1 no cambia: G0 → G5 → G1 → G2 → G3 → G4 → guarda de la acción. `tiposInternos` se evalúa dentro de G1, así que ya ha pasado G5, que garantiza la forma. [D]

Operaciones no comprometidas (API):

| Operación | Cambio |
|---|---|
| `resolverProyeccion` | Admite ventana `(i, j]` y forma monoidal (§7) |
| `aportes` (nueva) | `aportes(Π, Γ, i, j, registro, snapshots?) → [f(e_k, ctx_k)]_{k=i+1..j}`. Pura. Es la única definición de la contribución; `resolverProyeccion` la usa |
| `proyectarCorte` | Admite una `Π` monoidal sobre varias trayectorias **solo** si `M` declara `conmutativo` (P4, Teorema E1.4). Si no, devuelve `NO_CONMUTATIVO` |
| `componer` | Si hay dos aportes con el mismo `StreamID`, devuelve `STREAM_DUPLICADO` (E8) |
| `diferencia` | Las identidades se comparan por `hex(CV(id(o)))`. Si una `id` no es un valor CV, lanza un error (E7) |
| `incorporar` | `readmitir := ctx.readmitir` si viene explícito; si no, `ctx.nodo.parametros['nodo.verificarAlIncorporar'] = 'cadena+readmisión'`; si tampoco viene `ctx.nodo`, el `inicial` de `REGLA_NODO.sigma['nodo.verificarAlIncorporar']` (E6) |

---

## 6. Invariantes `V_C`

V1–V9 de la fase 1 siguen igual. Se corrige un predicado estable y se añade una invariante de proyección.

**Teorema E2.1 (corrección de 7.7c) [T].** «`sid₀ ∈ dom Sids_Y`» **no** es estable, aunque en `k` la retención sea ilimitada. En cambio, `P_sid(s₀, k) :⟺ ∃ i ≤ k : e_{Y,i}.sid = s₀` sí es estable.
*Contraejemplo de lo primero.* En `Γ_Y`, `s₀` se compromete en la posición 1 con retención ilimitada. En la posición 2, `FijarParámetro(nucleo.retenciónSids ↦ ventana(1))`. En la posición 3, otra acción. En `S_3`, `s₀ ∉ dom Sids`. El predicado pasó de verdadero a falso, así que no es estable.
*Demostración de lo segundo.* Por L3, `Γ_{Y,k} ⪯ Γ_{Y,k'}` para todo `k' ≥ k`. Una entrada `e_i` con `i ≤ k` sigue existiendo, y por tanto el predicado se conserva. No depende de ningún parámetro, así que también lo conservan las acciones de contrato y las migraciones. ∎
*Consecuencias.*
- El Teorema 7.8 (Δ3) usa `rec_id` sobre `Sids`. Se reescribe sobre `P_sid`, que es monótona por L3 **sin** hipótesis de retención.
- Δ4 (reintento seguro) **sí** sigue dependiendo de la retención, porque G2 deduplica con `Sids`. El contraejemplo de §4.3 de la fase 1 sigue valiendo.

**V10 (corrección de una proyección guardada) [T].** Todo registro `(acum, c)` que `resolverProyeccion` devuelve cumple `acum = f*(Γ_{c.i : c.n})` evaluado con los `ctx_k` de §7.
*Demostración:* por casos sobre la tabla de §7.3, como en el Teorema 7.1, usando el Teorema E1.3. ∎

---

## 7. Proyecciones `Π_q` (núcleo de E1)

### 7.1 Forma general

```
Π = ( id, ver, f, M, obs, leeEstado, sensibleAÉpoca, sensibleATiempo )        forma monoidal
M = ( unidad, ⊗ [, inv] [, conmutativo] [, idempotente] )                        leyes declaradas como dato
ctx_k = { k, parámetros: C_{ε_{k−1}}  [, S: S_{k−1} si leeEstado] }               contexto de la contribución de e_k
acum(i, j) = f(e_{i+1}, ctx_{i+1}) ⊗ … ⊗ f(e_j, ctx_j)      (= unidad si i = j)
Y(i, j)    = obs( acum(i, j), { parámetros: C_{ε_j} [, S: S_j si leeEstado] [, tRef] } )
```

- `f` **no** recibe `tRef`, ni otras trayectorias, ni reloj, ni azar. `obs` sí puede recibir `tRef`. [D]
- El filtro `φ` no es un componente del núcleo. Se pliega en `f` con `f_φ(e) = φ(e) ? f(e) : unidad` (Teorema E1.3). La fase 2 lo compone como dato.
- **Forma clásica** `(id, ver, pi, g?, sensibleAÉpoca, sensibleATiempo)`. Es el caso `M = {unidad}`, `leeEstado = true` y `obs(_, {S}) = pi(S)`. Conserva la semántica y la tabla de resolución de la fase 1 §7.4, con su `g` congruente opcional (L10). Es la realización de `M = End(S)` **por su acción sobre `S`**: no se guardan endomorfismos, se guarda `S_j = S_0 · f*(Γ_j)` (L4). [T]

### 7.2 Teoremas

**Teorema E1.1 (una pregunta no es, en general, función de `S`) [T].** Existen `Γ ≠ Γ'` con `Fold(S_0, Γ) = Fold(S_0, Γ')` y `f*(Γ) ≠ f*(Γ')`.
*Contraejemplo.* Con la regla de juguete `contador@1`, sean `Γ = (sumar(1), sumar(−1))` y `Γ' = ε`. Llegan al mismo estado, pero la pregunta «número de acciones `sumar`» vale 2 y 0. Por tanto, una proyección `π : S → Y` no puede responderla. Responderla con `π` exige meter el conteo dentro de `D`, es decir, preestablecer un reporte en la regla (contra L32 y L34). ∎

**Teorema E1.2 (preguntas que dependen del estado: producto en corona) [T][V].** Si la contribución depende del estado previo, `c : S × A → M`, el monoide adecuado es `M^S ⋊ End(S)`, cuyos elementos son pares `(τ, μ)` con `τ ∈ End(S)` y `μ : S → M`, y con
`(τ₁, μ₁) · (τ₂, μ₂) = (τ₂ ∘ τ₁, s ↦ μ₁(s) ⊗ μ₂(τ₁ s))` y unidad `(id, s ↦ 1)`.
*Precisión de L32 y de `ALGEBRA_DE_PREGUNTAS.md` §2.* El producto **directo** `End(S) × M` no basta: en él la componente `M` no puede depender del estado.
*Contraejemplo:* la merma de `conteo(1)` vale 4 desde `H = 5` y 1 desde `H = 2` [V].
*Realización:* no se guardan funciones. Se evalúa la acción sobre `S_0`, de modo que el acumulado es el par `(S_j, acum)`, con `acum(i, j) = ⊗ c(S_{k−1}, e_k)` (forma monoidal con `leeEstado`).
*[V]:* asociatividad y unidad en 5.000 ternas con `|S| = 4`, `M = (ℤ, +)`.

**Teorema E1.3 (incrementalidad sin condición) [T].** Sea una forma monoidal y `c` un checkpoint con `c.i = i`, `c.n = j₀ ≤ j` y continuidad verificada. Entonces `acum(i, j) = acum(i, j₀) ⊗ f*(Γ_{j₀:j})`, y la congruencia (L10) se cumple siempre.
*Demostración.* `Γ` es el monoide libre y `k ↦ f(e_k, ctx_k)` está determinado por `Γ_k`: `C_{ε_{k−1}}` y `S_{k−1}` son funciones de `Γ_{k−1}` (Teorema 4.2 de la fase 1). La igualdad es la asociatividad de `⊗`. El núcleo de la «proyección» `Γ ↦ acum` es una congruencia del monoide libre, porque `acum(Γ‖w) = acum(Γ) ⊗ f*(w)`. ∎
*Corolario (L10 se traslada a `obs`).* `obs` no necesita ser congruente: nunca se actualiza `obs(acum)`, se recalcula al leer. Así, `max(0, H−A)` es correcta como `obs` de un acumulado `(H, A)` aunque no sea incremental por sí misma (L10, L11). [T]
*[V]:* actualizar desde cualquier checkpoint coincide con reconstruir en 1.000 casos con `(suma, mínimo prefijo)`.

**Teorema E1.4 (sensibilidad a época y a tiempo) [T].**
- (a) En forma monoidal, `sensibleAÉpoca` no hace falta. `acum` depende solo de `Γ_{i:j}`, y cada `f(e_k)` usa el contrato de **su** entrada. Lo que dependa del contrato vigente lo lee `obs` al responder.
- (b) Si solo `obs` lee `tRef`, el checkpoint **no** necesita `tRef`: el valor guardado no depende de él. La respuesta se identifica por `(checkpoint, tRef)`. Es L15 llevado a lo que se guarda.
- (c) En forma clásica, las reglas de la fase 1 siguen igual (`tRef` en el checkpoint si `sensibleATiempo`).
*Demostración:* (a) por el Teorema E1.3; (b) `acum` es función de `Γ_{i:j}` solamente. ∎

**Teorema E1.5 (multi‑trayectoria) [T][V].** Sea `σ` un corte cerrado sobre trayectorias disjuntas `X₁…X_m`. Si `M` es conmutativo, `acum(σ) := ⊗_X acum_X(0, σ_X)` no depende del orden de las `X` ni del entrelazado de sus entradas. Si `M` no es conmutativo, el valor depende de un orden que entre trayectorias no existe (L21), así que `proyectarCorte` lo rechaza.
*Demostración:* un monoide conmutativo factoriza por el monoide conmutativo libre (multiconjuntos de entradas), y las trayectorias son disjuntas (coproducto, L25). ∎
*[V]:* suma sobre particiones aleatorias, 1.000/1.000. Con **solape** (la misma entrada en dos réplicas), la suma falla (328/1.000 correctas) y la unión no (1.000/1.000). Por eso el núcleo solo combina trayectorias distintas, nunca copias (E8).

### 7.3 Checkpoint y resolución

```
checkpoint = ( streamId, n = j, h = h_j, ver, epoca = ε_j  [, i, hI = h_i   si i > 0]  [, tRef   si forma clásica ∧ sensibleATiempo] )
guardado   = { acum, checkpoint }   (forma monoidal)        { Y, checkpoint }   (forma clásica)
```

Con `i = 0`, el checkpoint es idéntico al de la fase 1. Así se minimiza el cambio en las pruebas. [D]

**Tabla de resolución para la forma monoidal** (la clásica conserva la tabla de la fase 1 §7.4):

| Caso | Acción |
|---|---|
| Sin `guardado`; o `ver` distinta; o `c.i ≠ i`; o (`i > 0` y `c.hI ≠ h_i`) | RECONSTRUIR: `acum = ⊗ aportes(Π, Γ, i, j)` |
| `c.n > n_local` o `h(c.n) ≠ c.h` o `c.epoca ≠ ε(Γ_{c.n})` | DISCONTINUIDAD: no se aplican deltas (L22); se RECONSTRUYE y se informa |
| `c.n > j` | RECONSTRUIR (retroceder con `inv` es una optimización de la fase 2, no del núcleo) |
| `c.n = j` | REUTILIZAR |
| `c.n < j` | ACTUALIZAR: `acum ⊗ ⊗ aportes(Π, Γ, c.n, j)` |

- Con `leeEstado`, `aportes` desde `a` necesita `S_a`. Se obtiene con el mayor snapshot válido `≤ a` y el sufijo (E5). [D]
- `Y = obs(acum, ctx_j)` se calcula **siempre** al responder. [T por E1.4]

**Corolario (resolución = Δ) [T].** La tabla es la instancia «actualizar proyección» de `Δ` (Corolario 7.10 de la fase 1), con la identidad de posición ampliada a `(i, k, h_k)`.

### 7.4 Proyecciones del núcleo

`PROYECCIONES.{cabeza, hashes, epoca, sids}` siguen en forma clásica, sin cambios.
`hashes` admite también la forma monoidal (`M` = listas, `f(e_k) = [h_k]`), pero no es necesaria. [D]

---

## 8. Leyes aplicables (para `kobalt-verificador`)

| Ley | Cómo se verifica |
|---|---|
| **L9 / V10** | Para proyecciones monoidales de juguete (conteo por tipo, `(suma, mínimo prefijo)`, último, una levantada con `leeEstado`), en todo corte y para toda ventana `(i, j]`, `resolverProyeccion` = `obs(⊗ aportes)` desde la génesis, partiendo de cualquier checkpoint guardado (válido, adelantado, de otra `i`, manipulado) |
| **L10** | La forma monoidal **nunca** necesita `g`. Mutante «aplicar `obs` antes de guardar y actualizar sobre `obs`» con `obs = max(0, ·)` ⇒ falla en el contraejemplo de L10 |
| **L15** | En forma monoidal con `obs` dependiente de `tRef`, el checkpoint no lleva `tRef` y el mismo `acum` responde a dos `tRef` distintos. Mutante «`f` lee `tRef`» ⇒ rechazado en revisión estática (firma de `f`) y detectado por una prueba que cambia `tRef` entre dos actualizaciones |
| **L21 / L25** | `proyectarCorte` con `M` conmutativo = suma por trayectoria, en cualquier orden. Con `M` no conmutativo ⇒ `NO_CONMUTATIVO`. `componer` con `StreamID` duplicado ⇒ `STREAM_DUPLICADO` |
| **L22** | Un checkpoint manipulado (`h`, `hI`, `epoca` o `i`) no se actualiza a ciegas |
| **L27 / E5** | Una trayectoria con `estados` en caché alterados da los mismos resultados que sin caché (`appendIfHead`, `incorporar`, `estado`, `resolverProyeccion`) |
| **L3 / E2** | Caso dirigido del Teorema E2.1: `s₀` en la posición 1, retención cambiada a `ventana(1)` en la 2, una acción en la 3. `lect.estable(Y, 'nucleo.sid', s₀)` en `k = 3` es **verdadero**. Mutante «sobre `Sids`» ⇒ falso ⇒ la prueba falla |
| **L13 / E7** | `diferencia` con identidades lista `[a, 1]` repetidas en dos objetos distintos ⇒ un solo requisito. Con contenido distinto ⇒ `Conflictos` |
| **L16 / E4** | Regla de juguete con acción compuesta `par(a, b)` y `tiposInternos = [a, b]`. Un actor con capacidad `par` y `a`, pero sin `b` ⇒ `NO_AUTORIZADO`. Con las tres ⇒ admitida |
| **E3** | Regla de juguete con `tipos = {'hacer:*': v}`. `hacer:x` se valida con `v(args, 'hacer:x')`. `deshacer` ⇒ `INADMISIBLE('forma')`. Un patrón `'*'` no captura `FijarParámetro` |
| **L31 / E6** | Revisión estática: no hay literal `true` como valor por defecto de `readmitir`. `incorporar` con `ctx.nodo` cuyo parámetro vale `'cadena'` no re‑admite |
| **Posición** | Una regla de juguete que guarda `i = nd + e.ε + 1` al recibir cada entrada coincide con la posición real, con entradas de contrato intercaladas |

---

## 9. Fronteras [L]

- E1 no da consenso ni orden entre trayectorias. Las preguntas no conmutativas solo existen por trayectoria o sobre un orden declarado como dato de la pregunta, nunca como autoridad (prohibido 7).
- `obs` puede ser costosa (por ejemplo, ordenar para un ranking). El núcleo no la memoiza, y memoizarla es configuración del nodo.
- Las preguntas con `leeEstado` cuestan `O(sufijo desde el snapshot)` en la reconstrucción.
- E4 comprueba capacidades, no autoría (L23).

---

## 10. Espacio de configuración (L31)

La enmienda no abre parámetros de contrato nuevos. Precisa uno ya existente y uno de diseño:

| Parámetro | Dónde | Posibilidades | Implicación | Valor inicial |
|---|---|---|---|---|
| `nodo.verificarAlIncorporar` | `C(Nodo_d)` | `cadena` / `cadena+readmisión` | E6: es la única fuente del valor; `ctx.readmitir` explícito lo sustituye en una llamada | `cadena+readmisión` |
| `nucleo.retenciónSids` | `C(s)` | `ilimitada` / `ventana(N)` | Con E2, ya no afecta a la estabilidad de `nucleo.sid`. Sí afecta a G2 (Δ4) | `ilimitada` |

**Contradicciones con leyes:** ninguna. **Supuestos empíricos nuevos:** ninguno.

---

## Anexo · Cambios al encabezado de API de `kobalt/tests/leyes/nucleo.impl.test.mjs` (para el verificador)

1. **`API`**: añadir `'aportes'`.
2. **§2 Regla.**
   - `tipos: {tipo | 'prefijo*' ↦ (args, tipo) → bool}`. Una clave exacta gana; entre patrones, el prefijo más largo. Los patrones nunca coinciden con `'FijarParámetro'` ni con `'Sellar'`.
   - Añadir `tiposInternos?(e) → [tipo]`. G1 exige capacidad para `tipo(e)` **y** para cada tipo interno; si falta alguna, `NO_AUTORIZADO`.
3. **§2 `lect.estable`.** `'nucleo.sid'(sidHex)` = `∃ i ≤ k : entradas[i−1].sid = sidHex` en `Γ_Y`. No depende de `nucleo.retenciónSids`.
4. **§3 `incorporar`.** `ctx:{registro, readmitir?, nodo?}`. Se elimina «`readmitir? = true`». El valor por defecto se toma de `ctx.nodo.parametros['nodo.verificarAlIncorporar']` y, si no hay `ctx.nodo`, de `REGLA_NODO.sigma['nodo.verificarAlIncorporar'].inicial`.
5. **§3 (nota de implementación).** Ningún `S_k` se toma de una caché no ligada a `(k, h_k)`. Prueba: alterar `Γ.estados` no cambia ningún resultado.
6. **§4 Proyección.**
   - `Proyección = {id, ver, sensibleAEpoca, sensibleATiempo}` más **una** de estas dos formas:
     - clásica: `{pi(S, ctx), g?(Y, e, ctx)}`;
     - monoidal: `{f(e, ctx), monoide: {unidad, op(a, b), inv?(a), conmutativo?, idempotente?}, obs(acum, ctx), leeEstado?}`.
   - `ctx` de `f` = `{k, parametros (C_ε antes de e), S (solo si leeEstado)}`.
   - `ctx` de `obs` = `{parametros (C_{ε_j}), S (solo si leeEstado), tRef}`.
7. **§4 `resolverProyeccion`.**
   - Argumentos: `{proy, guardado, trayectoria, i? = 0, m, registro, snapshots?, tRef?}`.
   - `guardado` = `{Y, checkpoint}` (clásica) o `{acum, checkpoint}` (monoidal).
   - Devuelve `{accion, Y, acum?, checkpoint, desde}`.
   - `checkpoint` lleva además `i, hI` cuando `i > 0`.
   - En forma monoidal no lleva `tRef`.
8. **§4 nueva** `aportes(proy, trayectoria, i, j, registro, snapshots?) → [m_k]` (pura).
9. **§4 `proyectarCorte`.** Acepta una proyección monoidal en lugar de `φ`. Si `!monoide.conmutativo`, devuelve `{resultado: 'NO_CONMUTATIVO'}`.
10. **§4 `componer`.** Si hay `StreamID` duplicados en `aportes`, devuelve `{resultado: 'STREAM_DUPLICADO', streamId}`.
11. **§5 `diferencia`.** Las identidades son valores CV y se comparan por `hex(CV(id))`. Una `id` que no es CV ⇒ lanza un error.

**Pruebas existentes afectadas** (las dos suites: `nucleo.leyes.test.mjs` contra el modelo y `nucleo.impl.test.mjs` contra la implementación):
- las de `lect.estable('nucleo.sid')` con retención en ventana;
- las de `incorporar` sin `readmitir` explícito;
- las de `resolverProyeccion` que comparan el objeto devuelto con `deepEqual` (por el nuevo campo `acum` en la forma monoidal; con la forma clásica e `i = 0`, el checkpoint no cambia);
- las de `diferencia` con identidades no escalares;
- las de `componer`;
- y G5/G1 con las nuevas reglas de juguete.

El modelo de referencia `kobalt/tests/modelos/nucleo.modelo.mjs` debe implementar E1–E8 **antes** que la implementación (fase 1 del verificador).

---

## Anexo B · Precisiones fijadas por el verificador (2026‑11‑12)
Las fuerzan las pruebas `kobalt/tests/leyes/nucleo.*`.
1. **Corrección del ejemplo de E1.1:** `(sumar(1), sumar(−1))` frente a `ε` **no** llega al mismo `S`: difieren `n`, `Sids` y `D.orden`. El teorema vale con este contraejemplo: `(fijar(a,1), sumar(a,1))` frente a `(fijar(a,2), fijar(a,2))`, con los mismos `sid`.
2. `NO_CONMUTATIVO` se juzga **antes** que el cierre del corte.
3. En `proyectarCorte` monoidal, `valor = ⊗ acum` **sin** `obs`, porque `C_ε` difiere entre trayectorias.
4. Un checkpoint con `c.n < i` es `DISCONTINUIDAD`. `desde` vale `i` al reconstruir y `c.n` al reutilizar o actualizar. La forma clásica exige `i = 0`.
5. `STREAM_DUPLICADO` se comprueba antes que los conflictos y devuelve el primer StreamID repetido.
6. Si `tiposInternos` no devuelve una lista de textos, el resultado es `NO_AUTORIZADO`.
7. `conflictos` y `exceso` devuelven identidades, en orden de primera aparición.

---

## Anexo C · Pendientes del núcleo (observaciones del revisor, no bloqueantes) — 2026‑11‑12
El núcleo enmendado `2e8d0d3` quedó integrado con **PASS** (113/113, 5 semillas, 44/45 mutantes detectados; el vivo es equivalente) y **CONFORME**. Para el siguiente ciclo del núcleo quedan estas observaciones:
1. `readmitirDe` debe lanzar un error si `ctx.nodo` no es un estado de `nucleo.nodo@1` o si el valor está fuera del dominio de Σ. Hoy desactiva la readmisión sin avisar.
2. Pasar `S` congelado o clonado a `f` cuando hay `leeEstado`, igual que se hace con `acum` para `obs`.
3. Al reutilizar, `responder` reconstruye `S_m` aunque solo necesite `C_{ε_m}`. Usar `parametrosEn` (rendimiento; L34).
4. Las leyes del monoide (asociatividad, conmutatividad) son declaraciones de cada pregunta: deben probarse en la fase 2.
