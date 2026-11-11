# Kobalt — leyes formales (fuente de verdad matemática)

Cada ley tiene un identificador estable `Lk` que deben citar las especificaciones, los tests y las revisiones.
Etiquetas de certeza (las mismas del Atlas):

- **[T]** teorema con demostración corta aquí mismo.
- **[V]** verificada por pruebas automáticas (probetas del 10‑nov‑2026 o `kobalt-verificar-leyes/ejemplo`).
- **[D]** doctrina de diseño consolidada; se exige, pero no se demuestra.
- **[P]** propuesta o candidata; requiere probeta antes de depender de ella.
- **[L]** límite: algo que **no** se puede inferir.

---

## 0. Objetos

| Símbolo | Definición |
|---|---|
| `E`, `K`, `V_k` | entidades (p. ej. variantes), características, valores admitidos de `k` |
| `R ⊆ ∐_k E×{k}×V_k` | relación de incidencias. Si `k` es univaluada, `R` restringida a `k` es una función parcial `f_k : E ⇀ V_k`; si es multivaluada (categorías, etiquetas), es una relación |
| `R_e = {(k,v) : (e,k,v)∈R}` | **sección** (por entidad: la ficha) |
| `R_k = {(e,v) : (e,k,v)∈R}` | **columna** (por característica: el vector) |
| `F_{k,v} = {e : (e,k,v)∈R}` | **fibra** (por valor: el filtro) |
| `A` | alfabeto de acciones de un ámbito |
| `Γ = (a_1,…,a_n) ∈ A*` | **trayectoria** de compromisos (monoide libre, concatenación `‖`) |
| `Γ ⪯ Γ'` | `Γ` es prefijo de `Γ'` |
| `T_C : S × A ⇀ S` | transformación determinista (parcial) del contrato `C` |
| `Fold(S_0, Γ)` | `T(…T(T(S_0,a_1),a_2)…,a_n)`; `Fold(S, ε) = S` |
| `Accept_C(u,a,S)` | `Authorized_C(u,a) ∧ Admissible_C(a,S)` |
| `Π_q : S → Y_q` | proyección que responde la pregunta `q` (incluye política, ámbito, vista y tiempo de referencia) |
| `h_0 = H(dom ‖ StreamID ‖ génesis)`, `h_{n+1} = H(h_n ‖ Frame(Encode(a_{n+1})))` | cadena de hashes del prefijo, con separación de dominio y encuadre inyectivo |
| `Checkpoint = (StreamID, n, h_n, versiónRegla [, t_ref])` | identidad de lo ya procesado por una proyección |
| `𝒦 = (C, Q, Γ, T, Π)` | contrato, solicitudes, trayectoria, interpretación, proyecciones: **un ámbito** |

Fórmula rectora:

```
Contrato ⊢ Γ  ──Fold──▶  S  ──Π──▶  secciones · columnas · fibras · POS · web
R_σ = Compose( Interpret_{C_1}(Γ_{1,σ_1}), …, Interpret_{C_m}(Γ_{m,σ_m}) )
```

---

## I. Fibra: incidencias y orientaciones

**L1 [T] Reconstrucción por orientación.** Si se conservan todas las incidencias con sus ámbitos y valores,
`Reconstruct(Sections(R)) = Reconstruct(Columns(R)) = R`.
*Demostración:* `R = ⋃_e {e}×R_e = ⋃_k {(e,k,v) : (e,v)∈R_k}`; ambas son particiones de `R`.
*[L]:* una fibra aislada no reconstruye `R`; un agregado (“stock total 50”) no recupera el reparto por bodega.

**L2 [T] Los filtros son álgebra booleana.** `F_{k,v} ∩ F_{k',v'}`, `∪`, y el complemento **relativo al universo conocido** `U`: `¬F = U ∖ F`.
Con coordenadas estables, cada fibra es un vector de bits (500 variantes → 63 B). Sin máscara de «conocidos», el complemento es incorrecto (incluye entidades ausentes o fuera de ámbito).

**L17 [D] Tres dimensiones independientes.**
*Orientación* (cómo se recorre: sección/columna/fibra) ⟂ *Autoridad* (dónde se constituye un cambio) ⟂ *Materialidad* (cómo se guardan los bytes). Ninguna determina a las otras. La ficha es una composición `Ficha(P) = Π(Datos_P, Color_P, Stock_W(P), Oferta_B(P))`, no una autoridad.

---

## II. Cauce: trayectoria y estado

**L3 [D] Append‑only.** `Γ_n ⪯ Γ_{n+1}` y `Γ_{n+1} = Γ_n ‖ a_{n+1}`. Corregir es añadir una acción, nunca editar ni borrar `a_i`.

**L4 [T][V] `Fold` es acción del monoide.** `Fold(S, Γ‖Δ) = Fold(Fold(S,Γ), Δ)` y `Fold(S, ε) = S`.
*Demostración:* inducción sobre `|Δ|`. *Corolario:* un snapshot `(S_n, n, h_n)` es correcto por construcción: `Fold(S_0, Γ_m) = Fold(S_n, Γ_{n+1:m})`. Un snapshot **no** es otra fuente de verdad.

**L5 [T] Monotonía de la historia ⇏ monotonía de los valores.** `Γ` sólo crece; `S` puede subir, bajar o quedar igual.

**L6 [T] Invariante inductivo.** Si `S_0 ∈ V_C`, y `S ∈ V_C ∧ Accept_C(u,a,S) ⇒ T_C(S,a) ∈ V_C`, y los compromisos se hacen atómicamente en un orden único **por ámbito**, entonces `∀n: S_n ∈ V_C`.
*Demostración:* inducción sobre `n`. *[L]:* prueba coherencia respecto de las invariantes especificadas, no que el mundo físico coincida.

**L7 [T][V] Guardas ≠ invariantes.** Una *guarda* es condición de admisión de una acción concreta; una *invariante* vale en todo estado alcanzable.
`H ≥ A` es guarda de `Asignar`, **no** invariante: `CorregirConteo(h)` registra la realidad física y puede dejar `H < A`. El déficit `max(0, A−H)` debe ser representable.
*Consecuencia de código:* prohibido codificar una guarda como restricción del tipo de estado (unsigned, `CHECK stock >= 0`, aserción en el constructor).

**L8 [D][V] Atomicidad por cabeza.** `AppendIfHead(Γ, (n,h_n), a)`: se acepta sólo si la cabeza sigue siendo `(n,h_n)`. Hay **un sucesor comprometido por posición dentro del ámbito que comparte la restricción**; no un escritor global. Si falla, la solicitud se reevalúa sobre la nueva cabeza.

**L14 [D] Niveles de hecho distintos.** `Solicitud ≠ Asignación ≠ Despacho ≠ Pago ≠ Conteo`. Cada acción constituye exactamente el hecho que define su contrato y ningún otro hecho externo no observado.

---

## III. Proyecciones

**L9 [T][V] Coherencia incremental.** Para `m ≥ n`:
`Π(Fold(S_0, Γ_m)) = Update(Π(Fold(S_0, Γ_n)), Γ_{n+1:m})`.
La reconstrucción completa es el **oráculo**; la incremental es una optimización que debe coincidir con él en todo corte.

**L10 [T][V] Criterio de incrementalidad (Myhill–Nerode).** Sea `π : S → Y`. Existen `g_a : Y → Y` con `π ∘ T_a = g_a ∘ π` para toda acción `a` **si y sólo si** `ker π` es una congruencia: `π(s) = π(s') ⇒ π(T_a s) = π(T_a s')`.
*Demostración (⇐):* se define `g_a(π(s)) := π(T_a s)`, bien definida por la congruencia. *(⇒):* `π(T_a s) = g_a(π(s)) = g_a(π(s')) = π(T_a s')`.
*Corolarios verificados:*
- `D = max(0, H−A)` **no** es actualizable desde sí misma: `(H=2,A=5)` y `(H=3,A=3)` dan `D=0`; tras `Ingresar 2` dan `0` y `2`.
- El estado mínimo suficiente es el cociente de Nerode respecto de las preguntas. `P` agregado no basta si las acciones nombran solicitudes concretas (`Asignar(id)`): hace falta el mapa de solicitudes abiertas.

**L11 [T][V] Disponibilidades.**
`D_no_asignada = max(0, H−A)`, `D_prudente = max(0, H−A−P)`, `Déficit = max(0, A−H)`.
Como `P ≥ 0`: `0 ≤ D_prudente ≤ D_no_asignada`, y `D_prudente` es el extremo inferior del intervalo `[max(0,H−A−P), max(0,H−A)]` condicionado a la demanda **conocida** (no es el peor caso absoluto). Además, `Déficit · D_no_asignada = 0`.
Mostrar una u otra es **configuración de la pregunta**, no otro inventario.

**L12 [T][V] Efecto de cada transición.**

| Acción | H | A | P | `D_prudente` | `D_no_asignada` |
|---|---|---|---|---|---|
| `Solicitar(q)` | · | · | +q | baja o igual | igual |
| `Asignar(id)` (pendiente→asignada) | · | +q | −q | **igual** (sin doble descuento) | baja o igual |
| `Rechazar(id)` | · | · | −q | sube o igual | igual |
| `AsignarInterna(q)` | · | +q | · | baja o igual | baja o igual |
| `Despachar(id)` | −q | −q | · | **igual** | **igual** |
| `Ingresar(q)` | +q | · | · | sube o igual | sube o igual |
| `CorregirConteo(h)` | =h | · | · | cualquiera | cualquiera |

**L13 [T][V] Unión, no mínimo; identidad, no conteo.** Con solicitudes conocidas por varios nodos, `P = Σ_{q ∈ Q_B ∪ Q_C, pendiente} cantidad(q)`, deduplicando por identidad. `min(D_B, D_C)` es incorrecto (10−2 y 10−3 ⇒ 7; correcto 10−5 = 5). Una misma solicitud nunca se cuenta dos veces.

**L15 [D] Elegibilidad y tiempo.** Sólo cuentan para `P` solicitudes identificadas, admitidas, no duplicadas y vigentes. La caducidad es una acción explícita **o** una proyección con `t_ref`; en el segundo caso el checkpoint debe incluir `t_ref`, porque `h_n` por sí solo ya no identifica el resultado.

---

## IV. Contrato y autoridad

**L16 [D][V] La autoridad se declara antes de aceptar.**
«El contrato declara la autoridad; el cauce constituye los cambios; la fibra los reorganiza.»
- Muchos pueden **solicitar**; un mecanismo **constituye** el compromiso.
- Las solicitudes viajan **hacia** la autoridad; los compromisos se **irradian** desde ella.
- El orden de llegada, publicar primero o tener una copia **no** confieren autoridad.
- Una réplica que añade a su copia un compromiso reconocido **no** lo constituye.
- La interfaz de origen (ficha individual o tabla transversal) no decide la autoridad: dirige la intención al constituyente.

**L18 [D][P] Migración de orientación.** Cambiar dónde se constituye una característica es una transición de contrato `C_e → C_{e+1}` con: estado transferido, último corte causal reconocido, tratamiento de solicitudes pendientes, y **ningún intervalo con dos constituyentes simultáneos**. Las identidades no cambian.

**L19 [T] Arbitraje y cuotas (escrow).** Hace falta arbitraje ⟺ la restricción compartida no se descompone en restricciones locales.
Si `Σ_d Q_d ≤ H − A` y cada dispositivo `d` admite ventas sólo con la guarda local `vendido_d + q ≤ Q_d`, entonces `Σ_d vendido_d ≤ H − A` sin coordinar.
*Demostración:* suma de las guardas locales. *Dicotomía:* un nodo lógico con varios dispositivos ⇒ compromiso exclusivo; un nodo por dispositivo ⇒ partición del recurso.

**L20 [D] Partición en ámbitos de compromiso.** Dos hechos van en la misma trayectoria si alguna acción debe leerlos o escribirlos atómicamente. Los ámbitos son las componentes conexas del grafo de co‑acceso. (Sustituye a la pregunta «¿producto canónico o vector canónico?».)

**L21 [D] Cortes causales.** Entre ámbitos sólo hay orden parcial. Un conjunto de checkpoints `σ` es válido si es **causalmente cerrado**: si incluye un compromiso que depende de `x`, incluye `x`. Una ficha que depende de varias trayectorias guarda `{(Stream_i, n_i, h_i)}`.

**L25 [D] Composición con procedencia.** `Compose` es un coproducto: conserva el ámbito de cada hecho y **rechaza** dos autoridades sobre el mismo hecho. No es una unión de valores. La misma coordenada local en dos ámbitos no designa el mismo sujeto.

---

## V. Materialidad, identidad y continuidad

**L22 [T][V] Continuidad verificable.** Ante un checkpoint `(n, h_n)`: si el prefijo coincide, se reutiliza la proyección; si es anterior, se aplican **sólo** las acciones faltantes, verificando la cadena; si no se puede verificar la continuidad, **no** se aplican deltas a ciegas.
*[L]:* que dos hashes sean distintos no prueba que uno extienda al otro: hay que recorrer las acciones intermedias (o usar una prueba de consistencia Merkle, RFC 9162).

**L23 [D] Integridad ≠ autoridad ≠ autoría.** Un hash reconoce bytes; el cifrado protege bajo una clave; ninguno prueba quién publicó ni si tenía derecho. Ningún kernel actual trae firmas.

**L24 [D][P] Importación.** `Archivo externo → Hechos interpretados → Contratos → Compromisos → Proyecciones`. El formato de entrada no decide la autoridad: cada columna de un CSV se dirige a su constituyente. **Idempotencia:** reimportar el mismo archivo no genera compromisos nuevos.

**L26 [D] Identidad ≠ coordenada ≠ realización.** `I` (sujeto longitudinal) ≠ `Q` (bytes exactos) ≠ `N` (nombre/coordenada) ≠ slot. «Hash = producto» es un error. La identidad es estable al migrar orientación o almacenamiento.

**L27 [D] Persistir causas; reconstruir consecuencias.** Índices, vistas, agregados y cachés son reconstruibles. Persistir una proyección por rendimiento **no** la convierte en escritor autorizado. Si una proyección se interrumpe, se conserva la anterior válida y se reconstruye.

---

## V‑bis. Coordenadas y diferencia (consolidación 2026‑11‑11, `kobalt/CONSOLIDACION_Y_PLAN.md`)

**L28 [T] Coordenadas emergentes.** `slot(e) := 1 + |{variantes creadas antes que e en Γ_Cat}|`. Entonces `Γ ⪯ Γ' ⇒ T(Γ) ⪯ T(Γ')`, y ninguna posición se reutiliza (retirar es una acción nueva). No hay generador de IDs: `ID = (ámbito, slot)`. El SKU es un atributo y el slot es una coordenada. Los slots se codifican con el `varuint` canónico de Minimal, 1‑based, con `0` reservado.

**L29 [T] Alineación implícita.** Un vector transversal `V = (TableIdentity, Values, Corte)` con valor por defecto por contrato para las posiciones `i ≤ |T|` sin valor explícito sigue siendo válido con cualquier extensión de `T`, sin reescribirse. El alta de una variante no requiere acciones en otros ámbitos. Un `T` que no extiende al anterior es un error de continuidad, nunca una reinterpretación.

**L30 [T] Diferencia.** Importar, sincronizar, actualizar proyecciones, adquirir material y calcular faltantes son instancias de `Δ(objetivo, actualidad)`. Si el objetivo ya está reconocido, `Δ = ∅`. Reintentar es seguro si `Δ` se calcula contra la actualidad o se deduplica por identidad, nunca si se repite el delta a ciegas.

---

## VI. Hechos de los kernels que condicionan el diseño ([V] el 10‑nov‑2026)

- Minimal `varuint` canónico: 1 B hasta 127, 2 B hasta 16.383, 3 B hasta 2.097.151; rechaza formas no canónicas.
- Minimal `seal/open` añade 28 B (IV 12 + tag 16). **`open` acepta un sobre cuyo payload no corresponde a la huella del nombre**: al leer hay que recalcular `stateFingerprint` y compararlo.
- KOB2: cada `FOLLOW` reescribe la trayectoria completa (36 B por acción). 18.250 acciones ⇒ último FOLLOW de 642 KB y ≈6 GB escritos en total. Hace falta segmentar o usar una cadena de hashes.
- KOB2 `Resolution`: `NO_EVIDENCE | UNRECOGNIZED | EXACT | EMPTY | CHAIN | FORK`. Un `FORK` no se resuelve por heurística ni por timestamp.
- Minimal `latestVersion` desempata por fingerprint: **no** es causalidad ni autoridad.
