# Spec · Fase 3 — Forma + red de flujo sobre la única Trayectoria

**Fecha:** 2026‑11‑11 (redactada el 12‑nov) · **Autor:** agente matemático de Kobalt · **Estado:** borrador para el ciclo verificador → implementador.
**Destino del código:** `kobalt/src/dominio/` (fase 3 de `kobalt/CONSOLIDACION_Y_PLAN.md`, Parte IV).

**Se apoya en:**
- `2026-11-11_fase1-nucleo.md` (interfaz `Regla`, §3.1), con la enmienda `2026-11-11_fase1-enmienda-preguntas.md` (E1 proyecciones monoidales, E3 tipos patrón, E4 `tiposInternos`);
- `2026-11-11_fase2-preguntas.md` (lenguaje de expresiones §4.2, catálogo de monoides §7.3).

**Fuentes de dominio:**
- `kobalt/docs/2026-11-11_ANALISIS_INVENTARIO_V2.md` y `…_ANALISIS_PRODUCTO_Y_TRAYECTORIA.md`;
- el paquete v2 del usuario (`core.js`, `tests.js`, `03_FLUJOS.md`), leído **solo como referencia**: no se copia nada al repositorio.

**Etiquetas.** [T] teorema con demostración aquí · [V] comprobado con `node` (scripts `red2.cjs` y otros en el scratchpad de la sesión, fuera del repositorio; ejecutan el `core.js` de la v2 sin modificarlo) · [D] doctrina o decisión de diseño · [P] propuesta · [L] límite.

**Regla «dato, no código» [D].** Las reglas comerciales viven en **dos valores**, la Forma y la Red, que son parámetros del contrato. Las leen **cinco verbos genéricos** y `Lote`. Revisión estática:
- fuera del archivo que declara la Forma y la Red iniciales (`kobalt/src/dominio/inicial.mjs`), ningún módulo de `kobalt/src/dominio/` contiene nombres de transiciones ni de características (`Vender|Asignar|Despachar|Cancelar|Cobrar|Devolver|Recibir|Reembolsar|Transferir|Contar|Ingresar|sku|precio|color`);
- no hay `switch` ni `if` sobre el nombre de una transición.

**Supuestos prohibidos vigilados.**
- 1 (`UPDATE stock`): el marcado es `Fold(Γ)`.
- 2 (Producto canónico): la ficha es una composición en `obs`.
- 4 (guardas como invariantes de tipo): marcado en `ℤ`, Flat `int32` con negativos.
- 5 (doble descuento): imposible por construcción (§6).
- 8 (escribir en proyecciones): no hay ruta.
- 10 (transacción entre ámbitos): `Lote` vive dentro de **un** ámbito.
- 12 (negocio en un kernel): el dominio es una **regla** registrada, no el núcleo.

**Contradicciones y precisiones encontradas** (detalle en §10.2). Ninguna contradice una ley. Hay cinco precisiones de documentos:
- P‑A: complemento `libre` para que «`H−A ≥ q`» sea una guarda de depósito;
- P‑B: restricción por transición (`Contar` sin restricción, por L7);
- P‑C: disparo nulo de `Contar` admitido;
- P‑D: identidad `(i, j)`;
- P‑E: las capacidades iniciales del cajero deben incluir `Asignar` y `Despachar` sobre ventas propias.

Hay además dos cambios del núcleo, ya recogidos en la enmienda (E3, E4).

---

## 1. Pregunta

| `q` | Pregunta | Para quién |
|---|---|---|
| `q_T` | ¿Qué variantes existen y en qué orden (slot)? | Todo vector (L28, L29) |
| `q_ficha(e)` | ¿Qué es `e` y cómo está? (sección efectiva con herencia, más existencias e imágenes) | POS, panel, web |
| `q_cat` | Catálogo consolidado: secciones propias de todas las entidades | Listado, búsqueda offline |
| `q_flat(w)` | Existencias físicas `H[w, ·]` alineadas con `T` | POS, tabla transversal |
| `q_disp(w, v)` | `H`, `A`, `P`, `D_no_asignada`, `D_prudente`, déficit, no apto, descuadre | Canal de venta (configuración de la pregunta, L11) |
| `q_fibra(φ)` | ¿Qué entidades cumplen `φ`? (filtros, bajo umbral, categoría) | Búsqueda |
| `q_auditoría` | ¿Se conservan las invariantes de lugar en este corte? | Verificador, propietario |
| `q_admite(u, a)` | ¿Se admitiría `a` sobre la cabeza? ¿Por qué no? | Vista previa en la UI |
| `q_venta(s)`, `q_dev(d)` | Estado de una venta o devolución: pendiente, asignado, despachado, cobrado, por cobrar, cupo | POS, cajero |
| `q_flujos`, `q_kardex`, `q_merma`… | Preguntas de la fase 2 sobre esta `Γ` | Reportes (fase 6) |

**Para quién:** propietario, cajero, vendedor (perfil v2), automatizaciones (la misma puerta, fase 6) y el verificador.

---

## 2. Ámbitos (L20)

**Hechos.** La Forma `Φ` y la Red `𝒩` (parámetros); el registro de entidades; las secciones (valores por `(e,k)`); el marcado `m`.

**Grafo de co‑acceso (acciones que leen o escriben atómicamente):**

| Acción | Lee | Escribe |
|---|---|---|
| `Nacer(tipo, …)` | `Φ`, registro (referencias, `padre`), fibra `κ` (unicidad), filtros `admite` (secciones de otras entidades: `público`, `estado`) | registro, secciones, `m` (vía `alNacer`) |
| `Fijar`, `Añadir`, `Quitar` | `Φ`, sección de `e` y de su `padre`, fibra `κ`, dueño | secciones |
| `Disparar(t)` | `𝒩`, `m` de los lugares tocados, características inmutables de las entidades indexadas (`bodega(s)`, `variante(s)`, `precio(s)`) | `m` |
| `Vender` (dentro del lote de nacimiento de la venta) | estado **vigente** de la variante y del producto (`admite`) | `m` |

**Teorema 2.1 (una componente en la v1) [T].** Con la Forma y la Red iniciales, el grafo es **conexo**:
- `Nacer(venta)` lee el estado (no estable) de la variante y del producto;
- `Asignar` acopla todas las ventas de una `(w,v)` a través de `libre[w,v]`;
- la unicidad de `κ` acopla todas las variantes.

Así que la v1 es **una sola `Γ`**, que coincide con la decisión del usuario en la interacción 3.
*Demostración.* «`v` no retirada» no es estable (Retirar/Reactivar), así que no admite lectura estable (plan §4). Por L20, la venta y el catálogo van en la misma componente. Las demás aristas las da la tabla. ∎

**Retículo (L20, `ANALISIS_PRODUCTO_Y_TRAYECTORIA.md` §3).** Separar `{Cat, Inv_w}` es válido **solo** si ninguna guarda de `Inv` lee un predicado no estable de `Cat`. Eso ocurre, por ejemplo, si `admite` de `venta.variante` solo exige «existe» (estable), o si la guarda de actividad se traslada a `Cat`. Es un parámetro (§10), con valor inicial «una `Γ`».

---

## 3. Contrato por ámbito

**Regla:** `kobalt.dominio@1`. Es una sola regla registrada, cuyo comportamiento depende de los parámetros `Σ_r` siguientes (el núcleo ya trae `nucleo.*`):

| Parámetro | Contenido | Valor inicial |
|---|---|---|
| `dominio.forma` | la Forma `Φ` (§5.2) | Anexo A |
| `dominio.red` | la Red `𝒩` (§5.3) | §5.3 |
| `dominio.liberaciones` | restricción por canal (§5.3) | `[{transiciones: [Asignar, Despachar], canal: "POS", familias: [libre, H]}]` (plan §13) |
| `dominio.alcancePropio` | `u ↦ [patrones de tipo]`: esas acciones exigen `dueño(objetivo) = u` | `{}` |
| `dominio.propietarios` | principales que las expresiones `admite` tratan como dueños de todo | `[constituyente de la génesis]` |
| `dominio.lote` | `{máximo, guarda: cadaPaso\|final}` | `{máximo: 50, guarda: cadaPaso}` |
| `dominio.conjunto` | `{añadirExistente, quitarAusente: rechazar\|sinEfecto}` | `rechazar`, `rechazar` |

**¿Por qué la Forma y la Red son parámetros y no hechos de dominio? [D]** Determinan `T`: son «la regla elige el módulo y los parámetros eligen dentro de él» (fase 1 §3.1). Como parámetros:
- cambiarlos es `FijarParámetro`, que abre una época (L31);
- cada entrada se interpreta con la Forma y la Red de **su** época (Fold con `C_{ε_{i−1}}`), así que la historia no se reinterpreta.

**Guarda de parámetros `G^par` (compatibilidad de épocas) [D]:**
- `Φ'` extiende `Φ`: no se quita ningún tipo ni característica con valores; no cambia la clase, el tipo de valor ni el `destino` de una característica con valores; no se relaja `inmutable`;
- un cambio de `κ` exige que la fibra nueva ya sea única entre los activos;
- `𝒩'` conserva las familias con marcado no nulo y su especie;
- todo movimiento de `𝒩'` es intra‑especie;
- toda invariante declarada en `𝒩'.auditoría` se conserva (§6, VF6–VF8; comprobación estática [P] o se retira la declaración).

**Tipos de acción y capacidades (E3).** El tipo de una acción es una cadena fina, y las capacidades del núcleo (`nucleo.capacidades`, patrones con `*`) la autorizan directamente:

| Verbo | Tipo | Validador de forma (`tipos`) |
|---|---|---|
| Nacer | `Nacer:<tipo>` | `'Nacer:*'` |
| Fijar | `Fijar:<tipo>.<k>` | `'Fijar:*'` |
| Añadir / Quitar | `Añadir:<tipo>.<k>` / `Quitar:<tipo>.<k>` | `'Añadir:*'`, `'Quitar:*'` |
| Disparar | `Disparar:<t>` | `'Disparar:*'` |
| Lote | `Lote`, con `tiposInternos(e) = [tipo de cada acción interna]` (E4) | `'Lote'` |

- **Coherencia del tipo [T].** La guarda de la regla exige que la cadena coincida con el objetivo real; por ejemplo, `Fijar:` + `tipo(e)` + `.` + `k`. Si no coincide, devuelve `INADMISIBLE('tipoIncoherente')`.
  Por tanto, un solicitante que declare una cadena falsa para pasar G1 nunca compromete: G1 y la guarda son conjuntivas.
- **Dueño.** `dueño(x) := creador(raíz(x))`, donde `raíz` sigue la cadena `padre` (variante → producto).
  - El **objetivo** de una acción es:
    - `e`, para Fijar, Añadir y Quitar;
    - el `padre`, para Nacer;
    - la expresión `objetivo` de la transición, para Disparar.
  - `alcancePropio` exige `dueño(objetivo) = u`. Es una guarda de admisión (`INADMISIBLE('ajeno')`), no una capacidad: la capacidad dice **qué** puede pedir `u`, y el alcance dice **sobre qué** entidades.

**Actores (L16).**

| Papel | Capacidades (valor de `nucleo.capacidades`) | Alcance propio |
|---|---|---|
| Propietario (constituyente) | `["*"]` | — |
| Cajero (plantilla del plan §13, precisada, P‑E) | `Lote`, `Nacer:venta`, `Nacer:cliente`, `Nacer:devolución`, `Disparar:Vender`, `Disparar:Asignar`, `Disparar:Despachar`, `Disparar:Cobrar`, `Disparar:Devolver` | `Disparar:*` |
| Vendedor (perfil v2, para el oráculo) | `Lote`, `Nacer:producto`, `Nacer:variante`, `Nacer:cliente`, `Nacer:venta`, `Nacer:devolución`, `Fijar:producto.*`, `Fijar:variante.*`, `Añadir:producto.galería`, `Quitar:producto.galería`, `Disparar:Vender`, `Disparar:Cobrar`, `Disparar:Cancelar`, `Disparar:Devolver` | `Fijar:*`, `Nacer:variante`, `Disparar:*` |
| Lector | `[]` | — |

- **Solicita** cualquiera de estos principales, desde la UI o desde una automatización. **Constituye** el mecanismo del constituyente: el dispositivo del dueño en la v1 (`decisiones-abiertas.md`). Un cajero en otro dispositivo solo **solicita** (fase 7). [D]
- **Usuario ≠ capacidad.** `Nacer:usuario` registra a una persona (nombre, principal). Sus capacidades se fijan aparte, con `FijarParámetro(nucleo.capacidades)`. Son **dos** compromisos, porque una acción de dominio no puede ser de contrato (fase 1 §5.2), y cada uno es correcto por sí solo. La diferencia `Δ(propósito «alta de usuario», compromisos)` muestra qué falta (L30). [D]

---

## 4. Estado `S` (el `D` de la regla)

```
D = ( nd   : ℕ                                             entradas de dominio comprometidas
      ent  : ID ⇀ { tipo, creador : u, padre : ID | null }  registro de nacimientos (solo crece)
      val  : (ID, k) ⇀ valor                               clases asignación, ciclo y referencia‑uno (solo explícitos)
      conj : (ID, k) ⇀ { clave(x) ↦ x }                    clases conjunto y referencia‑muchos
      m    : lugar ⇀ ℤ                                     marcado disperso; ausente = 0 )
ID   = (i, j)        i = nd + e.ε + 1 (posición de la entrada de nacimiento; enmienda, «lo que no cambia»), j = orden del nacimiento dentro de la entrada
lugar = (familia, índices)        p. ej. (H, [w, v]), (pend, [s])
```

**Minimalidad (Nerode respecto de §1) [T].** Cada componente tiene un testigo: dos estados que solo difieren en ella se distinguen por alguna acción o pregunta.

| Componente | Testigo |
|---|---|
| `nd` | El mismo `Nacer` da IDs distintos |
| `ent.tipo` | Una referencia a `x` se admite o no según el tipo de `x` |
| `ent.creador` | `alcancePropio` |
| `ent.padre` | Herencia en la ficha y `dueño` |
| `val` explícito frente a heredado | Contraejemplo de §7.2: no basta el valor efectivo |
| `conj` | Fibras de conjunto; `añadirExistente = rechazar` |
| `m` | Guardas de la Red |

**Lo que NO está en `D` (es pregunta):**
- el slot (orden de las variantes en `ent`);
- `T`;
- las fibras;
- el índice de `κ` (es derivado: la implementación puede mantenerlo como caché ligada al estado);
- `H`, `A`, `P` agregados;
- los valores efectivos con herencia;
- los valores por defecto.

**Representación general (L31 §12) [D].**
- El marcado es entero con signo, porque una configuración de liberación permite negativos.
- Las secciones admiten «sin valor» (nunca fijado) distinto de cualquier valor, para las fibras con máscara de conocidos (L2).

---

## 5. Acciones `A`

### 5.1 Los cinco verbos y `Lote`

Las guardas se evalúan en este orden y el primer fallo da el motivo. Todas son **guardas** (L7); ninguna es invariante de tipo.

| Acción | Guarda `Admissible` (además de G0–G5) | Efecto `T` |
|---|---|---|
| **`Nacer(tipo, valores, padre?)`** | (1) `tipo ∈ Φ`, y la cadena de tipo es coherente; (2) cada `k ∈ dom valores` está declarada para `tipo` (exacta o por familia), con valor del tipo declarado; están todas las `requerida`; (3) cada referencia apunta a un `ID ∈ ent` (o a un nacimiento anterior del mismo lote) del `destino` declarado, y satisface su filtro `admite.fijar` (también al nacer; fase 2 §4.2, con `x.u` = actor e `x.it` = referenciado); (4) `padre` si `Φ.tipo.padre` lo exige; (5) unicidad de `κ` (§5.2) entre las activas con valor explícito no vacío; (6) `restricciones` de sección del tipo; (7) `alcancePropio`; (8) si `Φ.tipo.alNacer = t`, el disparo de `t` con el recién nacido es admisible (§5.3) | `nd := nd+1`. `ent[(i, j)] := {tipo, creador: e.u, padre}`. Se escriben `valores` en `val`/`conj`, y el ciclo toma su estado `inicial` si no viene. Si hay `alNacer`, se dispara `t` |
| **`Fijar(e, k, v)`** | `e ∈ ent`; `k` declarada para `tipo(e)` con clase asignación, ciclo o referencia‑uno; no `inmutable`; `v` del tipo (o `null` = quitar el valor explícito, si `k` no es `requerida`). Si es ciclo: `(actual, v) ∈ transiciones(k)`. Referencias: (3) de Nacer. Unicidad de `κ` si `k ∈ κ`, o si el cambio reactiva `e`. `restricciones`. `alcancePropio` | `val[(e,k)] := v` (o lo borra si `v = null`); `nd := nd+1` |
| **`Añadir(e, k, x)` / `Quitar(e, k, x)`** | `k` de clase conjunto o referencia‑muchos; `x` del tipo del elemento; `admite.añadir`/`admite.quitar` (con `x.it` = elemento); `máximo`. Si `x` ya está (o no está), según `dominio.conjunto`: rechazar o no hacer nada | `conj[(e,k)][clave(x)] := x` (o lo quita); `nd := nd+1` |
| **`Disparar(t, args)`** | `t ∈ 𝒩` y no `interna`; `args` válidos según `𝒩.t.args`; los índices se resuelven a entidades del tipo declarado; `alcancePropio` sobre `objetivo`; regla del disparo nulo; guarda de marcado (§5.3) | `m := m + W(t, args, m)`; `nd := nd+1` |
| **`Lote([a₁…a_k])`** | `1 ≤ k ≤ máximo`; ningún `a_j` es `Lote`. Con `guarda = cadaPaso`, cada `a_j` es admisible sobre el estado intermedio. Con `final`, las guardas de **forma y referencia** se evalúan paso a paso y la de **marcado** solo al final. Capacidad de cada `a_j` (E4) | `T(a_k)(…T(a_1)(D))`, con un solo `nd := nd+1` para todo el lote. Las referencias `{nacido: j}` designan el `j`‑ésimo nacimiento del lote: `(i, j)` |

**Atomicidad del lote [T].** O el lote entero es admisible y se compromete como **una** entrada, o no hay entrada (es una sola acción para el núcleo). Por tanto, un lote rechazado no consume posiciones, ni IDs, ni slots (L28).

### 5.2 La Forma `Φ` (dato)

```
Φ = { tipos: { τ: { padre?: k_ref, denso?: bool, alNacer?: t, κ?: [k…], restricciones?: [expr],
                    características: { k | "<ns>:*" | "*:*" :
                        { clase: asignación | conjunto | ciclo | referencia,
                          valor: texto(mín,máx) | entero(mín,máx) | bool | Q | enum[…] | registro{campo: valor…} | ref(τ'),
                          cardinalidad?: uno | muchos            (referencia)
                          ciclo?: { estados, inicial, transiciones: [[de, a]…] },
                          heredable?: bool, inmutable?: bool, requerida?: bool, defecto?: valor | "desconocido",
                          admite?: { fijar?, añadir?, quitar? : expr },  clave?: [campo…], máximo?: ℕ } } } } }
```

- **Clase = monoide (L33).**
  - asignación: «último»;
  - conjunto y referencia‑muchos: `(A, Q)`;
  - ciclo: transformaciones del autómata, sin más guarda que las `transiciones`;
  - referencia‑uno: «último» sobre IDs (o `Q`), con la guarda de existencia.
  - La **cantidad** no es una clase de característica: vive en la Red (L35).
- **Nivel y herencia.** `padre` designa una característica de referencia‑uno, inmutable y requerida. La sección **efectiva** es:
  `efectiva(e,k) = val(e,k)` si es explícito; si no, `efectiva(padre(e), k)` si `k` es `heredable` en `tipo(padre(e))`; si no, `defecto(k)`.
  Una variante puede **sobrescribir** un valor heredable solo si `k` también está declarada en su tipo.
- **`denso`.** Solo las variantes (L28): `slot(e) = 1 + |{e' ∈ ent : tipo(e') = variante, e' <_lex e}|`. Los demás tipos **no** tienen contador: su ID es `(i, j)`.
- **`κ`**: la clave de reconocimiento (plan §13). La guarda de unicidad usa la fibra `F_{κ,v}` entre las entidades activas (estado efectivo `activo`) con un valor explícito no vacío.

### 5.3 La Red `𝒩` (dato)

```
𝒩 = { familias:     { f: { especie, índices: [τ…], restringida: bool } },
      exterior:     { especie: f },
      transiciones: { t: { args: {x: valor…}, objetivo?: expr, canal?: expr, interna?: bool,
                           nulo: admitir | rechazar, restricción: todas | ninguna | [f…],
                           movimientos: [ { desde: [f, expr…], hacia: [f, expr…], cantidad: expr } … ] } },
      auditoría:    [ invariante declarada … ] }
```

**Semántica de un disparo [D].**
1. Cada `cantidad` se evalúa con el lenguaje de la fase 2 (§4.2) sobre `args`, `m` (lector `marcado`) y las características (lector `carac`), en el **estado antes** del disparo.
2. `W(t, args, m) = Σ_mov cantidad·(𝟙_hacia − 𝟙_desde)`. Una cantidad negativa invierte el sentido.
3. **Disparo nulo:** si `W = 0` y `nulo = rechazar`, el disparo se rechaza con `INADMISIBLE('sinEfecto')`.
4. **Guarda universal (L35):** `m + W ≥ 0` en todo lugar que **baja** con el disparo y pertenece a una familia restringida, salvo que la transición tenga `restricción: ninguna` o que `dominio.liberaciones` libere esa familia para `(t, canal(args))`.
5. Si una cantidad vale `null` (mal tipada o desbordada), el disparo se rechaza con `INADMISIBLE('cantidad')`.

**Familias y especies iniciales.** `R` = restringida.

| Especie | Familias |
|---|---|
| U (unidades físicas) | `H[w,v]` R · `noApto[w,v]` R · `descuadre[w,v]` · `tránsito[w,w',v]` R · `ext.U` |
| L (holgura, complemento de `A`) | `libre[w,v]` R · `comprometido[w,v]` R · `ext.L` |
| D (línea de venta) | `pend[s]` R · `asig[s]` R · `desp[s]` R · `cancel[s]` · `sol[d]` R · `recibido[d]` · `ext.D` |
| $ (valor acordado) | `porCobrar[s]` R · `cobrado[s]` R · `anulado[s]` · `reembolsado[s]` · `ext.$` |
| R (derecho de reembolso) | `cupo[d]` R · `cupoUsado[d]` · `ext.R` |
| C (control) | `abierta[x]` R · `ext.C` |

**Transiciones iniciales** (nombres de dominio; `w(s) = carac(s, bodega)`, `v(s) = carac(s, variante)`, `p(s) = carac(s, precio)`, `s(d) = carac(d, venta)`):

| `t` (nombre v2) | Args | Movimientos `desde → hacia : cantidad` | Restricción / nulo |
|---|---|---|---|
| `Abrir` (interna, `alNacer` de venta y devolución) | `x` | `ext.C → abierta[x] : 1` | todas / rechazar |
| `Ingresar` (`STOCK_RECEIVE`) | `w, v, q ∈ [1, 10⁹]`, `costo?` | `ext.U → H[w,v] : q` · `ext.L → libre[w,v] : q` | todas / rechazar |
| `Contar` (`STOCK_COUNT`) | `w, v, h ∈ [0, 10⁹]`, `motivo?` | `descuadre[w,v] → H[w,v] : δ` · `ext.L → libre[w,v] : δ`, con `δ = h − m(H[w,v])` | **ninguna** (L7, L14) / **admitir** (un conteo confirmatorio es un hecho) |
| `Vender` (`SALE_CREATE`, junto con `Nacer:venta`) | `s, q ∈ [1, 10⁹]` | `abierta[s] → ext.C : 1` · `ext.D → pend[s] : q` · `ext.$ → porCobrar[s] : q·p(s)` | todas / rechazar |
| `Asignar` (`SALE_RESERVE`) | `s, q` | `pend[s] → asig[s] : q` · `libre[w(s),v(s)] → comprometido[w(s),v(s)] : q` | todas (liberable por canal) / rechazar |
| `Despachar` (`SALE_FULFILL`) | `s, q` | `asig[s] → desp[s] : q` · `H[w(s),v(s)] → ext.U : q` · `comprometido[…] → ext.L : q` | todas (liberable por canal) / rechazar |
| `Cancelar` (`SALE_CANCEL`) | `s` | `pend[s] → cancel[s] : m(pend[s])` · `asig[s] → cancel[s] : m(asig[s])` · `comprometido[…] → libre[…] : m(asig[s])` · `porCobrar[s] → anulado[s] : (m(pend[s]) + m(asig[s]))·p(s)` | todas / rechazar |
| `Cobrar` (`SALE_PAYMENT`) | `s, x ∈ [1, 10¹²]` | `porCobrar[s] → cobrado[s] : x` | todas / rechazar |
| `Devolver` (`RETURN_CREATE`, junto con `Nacer:devolución`) | `d, q` | `abierta[d] → ext.C : 1` · `desp[s(d)] → sol[d] : q` · `ext.R → cupo[d] : q·p(s(d))` | todas / rechazar |
| `Recibir.apto` (`RETURN_RECEIVE`, revendible) | `d, q` | `sol[d] → recibido[d] : q` · `ext.U → H[w,v] : q` · `ext.L → libre[w,v] : q` (con `w,v` de `s(d)`) | todas / rechazar |
| `Recibir.noApto` | `d, q` | `sol[d] → recibido[d] : q` · `ext.U → noApto[w,v] : q` | todas / rechazar |
| `Reembolsar` (`RETURN_REFUND`) | `d, x` | `cupo[d] → cupoUsado[d] : x` · `cobrado[s(d)] → reembolsado[s(d)] : x` | todas / rechazar |
| `Transferir.salida` | `w, w', v, q` | `H[w,v] → tránsito[w,w',v] : q` · `libre[w,v] → ext.L : q` | todas / rechazar |
| `Transferir.llegada` | `w, w', v, q` | `tránsito[w,w',v] → H[w',v] : q` · `ext.L → libre[w',v] : q` | todas / rechazar |

`objetivo` es `s` en las transiciones de venta, `s(d)` en `Devolver` y `d` en las de devolución. `canal(args) = carac(s, canal)` en las de venta.

**Teorema 5.1 (la Red reproduce la v2) [V].** Se ejecutaron en paralelo el `core.js` de la v2 y esta Red declarada como datos (perfil v2: sin liberaciones, solo el actor propietario), sobre 2.400 trayectorias aleatorias (110.602 acciones, 61.260 admitidas; semillas 1–4). Resultado:
- **0 discrepancias** en admitido/rechazado;
- **0 discrepancias** en `H`, `A`, `P`, no apto, libre, prudente, déficit y cobrado neto tras cada paso;
- **0 violaciones** de VF5–VF9.

Incluye `SALE_CANCEL`. Donde la v2 rechaza una cancelación y la Red la admite, ocurre **exactamente** en el cambio deliberado C3 (§Anexo B): 94 casos, ningún caso no previsto. Y nunca ocurre al revés.
*Límites [L]:* no se comparó la autoridad del vendedor (`canSale`/`canProduct`); eso lo cubre el oráculo (Anexo B).

**Teorema 5.2 (la guarda universal sustituye a las validaciones de la v2) [T].** Cada validación de cantidad o dinero de la v2 es «un lugar restringido no baja de 0»:

| Validación v2 | Lugar restringido |
|---|---|
| «Demanda sin asignar insuficiente» | `pend[s]` |
| «Existencias libres insuficientes» | `libre[w,v]` |
| «Despacho sin asignación» | `asig[s]` |
| «Físico insuficiente» | `H[w,v]` |
| «Pago excede venta» | `porCobrar[s]` |
| «Devolución excede despachado» | `desp[s]` |
| «Recepción excede devolución» | `sol[d]` |
| «Reembolso supera devolución» | `cupo[d]` |
| «Reembolso supera cobros netos» | `cobrado[s]` |
| «Venta cancelada» (al asignar, despachar o cobrar) | `pend`, `asig` y `porCobrar` quedan en el cancelado |

*Demostración:* sustitución directa de los efectos de §5.3 en las condiciones de `core.js:82–100`. ∎

---

## 6. Invariantes `V_C`

Todas se demuestran por L6: valen en `D_0` (vacío) y se conservan por cada verbo admitido. Las marcadas «por época» son V9 de la fase 1: valen mientras `G^par` las proteja.

| Id | Invariante | Demostración |
|---|---|---|
| **VF1** Identidad por nacimiento | `(i, j) ∈ dom ent ⇒ e_i` es una entrada de dominio que hizo nacer al menos `j+1` entidades. Las IDs no se repiten ni se borran [T][V] | `i = nd + e.ε + 1` (enmienda); ninguna acción quita de `ent`. [V: 2.000 secuencias] |
| **VF2** Slots densos (L28) | Las variantes ocupan los slots `1..N_v` sin huecos, en orden de nacimiento, y ninguno se reutiliza | `slot` es el rango en `ent` (que solo crece); el retiro es un ciclo, no un borrado |
| **VF3** Referencias bien fundadas | Toda referencia a entidad en `val`/`conj` apunta a un `ID ∈ ent` del `destino` declarado y nacido **antes** (o antes dentro del lote). La cadena `padre` termina | Guarda (3); `G^par` no cambia `destino`; `ent` solo crece (predicado estable) |
| **VF4** Inmutables | `val(e,k)` con `k` inmutable es el valor del nacimiento | Fijar lo rechaza; `G^par` no relaja `inmutable` |
| **VF5** Conservación por especie (L35) | `∀` especie `σ`: `Σ_{f ∈ σ} Σ_idx m(f, idx) = 0` [T][V] | Cada movimiento es intra‑especie: suma `+c` y `−c` dentro de `σ`. `G^par` lo exige a toda Red nueva |
| **VF6** Holgura | `m(H[w,v]) = m(libre[w,v]) + m(comprometido[w,v])` [T][V] | Revisión de los movimientos: cada transición que mueve `H` mueve igual `libre + comprometido` |
| **VF7** Comprometido = asignado | `m(comprometido[w,v]) = Σ_{s : w(s)=w, v(s)=v} m(asig[s])` [T][V] | `Asignar`, `Despachar` y `Cancelar` mueven ambos por igual; `w(s)` y `v(s)` son inmutables (VF4) |
| **VF8** Valor de la línea | `p(s)·(pend + asig + desp + Σ_{d: s(d)=s}(sol + recibido))[s] = porCobrar[s] + cobrado[s] + reembolsado[s]`, y `p(s(d))·(sol + recibido)[d] = cupo[d] + cupoUsado[d]` [T][V] | Revisión de los movimientos; `p(s)` es inmutable |
| **VF9** Control | `m(abierta[x]) ∈ {0, 1}` (`Vender`/`Devolver` una sola vez por entidad) [T] | `Abrir` solo vía `alNacer` (una vez), `abierta` restringida |
| **VF10** Unicidad de `κ` (por época) | `|F_{κ,v} ∩ activas| ≤ 1` para valores explícitos no vacíos | Guardas (5); `G^par` comprueba la fibra al cambiar `κ` |

**Consecuencias [T]:**
- **Sin doble descuento (L12)**, por VF6–VF7: `D_prudente = max(0, libre − P)`. `Asignar(q)` baja `libre` y `P` en `q`, así que no cambia `D_prudente`. `Despachar` no cambia ni `libre` ni `P`.
- `A = m(comprometido)` sin recorrer las ventas (VF7).
- `Déficit · D_no_asignada = 0` (L11), porque `libre` es un solo número.

**Lo que NO es invariante (L7) [T]:**

| No invariante | Contraejemplo |
|---|---|
| `H ≥ 0` | Con la liberación inicial del canal POS: `Vender(1)`, `Asignar(1)`, `Despachar(1)` sobre `H = 0` ⇒ `H = −1`. [V: corrida B (dos bodegas, transferencias, POS liberado; 1.600 trayectorias, 70.309 disparos): 2.064 estados con `H < 0` y 0 fallos de auditoría] |
| `libre ≥ 0` (`H ≥ A`) | `Ingresar 5`, `Vender 5`, `Asignar 5`, `Contar 0` ⇒ `libre = −5` (déficit 5, representable) |
| `pend, porCobrar, cobrado ≥ 0` | Son invariantes **por época**: valen mientras ninguna liberación libere sus familias |

**Teorema 6.1 (plan §13, precisado) [T][V].** Fijado un intervalo de épocas, `H[w,v] ≥ 0` es invariante en él ⟺ toda transición que puede bajar `H` lo tiene restringido en todos los canales. La excepción es `Contar`, que lo deja en `h ≥ 0`.
*Demostración.* (⇐) Inducción: `Contar` da `H = h ≥ 0`, y las demás transiciones que bajan `H` pasan la guarda. (⇒) Si alguna transición que baja `H` no está restringida, dispararla desde `H = 0` da `H < 0`. ∎

---

## 7. Proyecciones `Π_q` (preguntas de la fase 2 sobre esta `Γ`)

Todas se compilan a una `Π` del núcleo (E1). Lectores que registra esta fase:
- de entrada: `nacimientos(e, τ)` y `contribuciones(e)` (descomposición de un lote);
- de estado: `carac(x, k)` (efectiva), `marcado(f, idx)`, `movimientos(e, f)` (`W` restringido a la familia `f`, evaluado en `S_{k−1}`), `dueño(x)`, `creador(x)`, `tipo(x)`, `activa(x)`.

### 7.1 Tabla de coordenadas `T` (materializada)

`q_T = (φ: verdadero, aporte: nacimientos(e, variante) → lista de (k, j), M: secuencia, obs: identidad)`.
- No usa el estado. Es incremental y no sensible a la época (E1.3, E1.4).
- `slot(e)` = posición en la lista (VF2).
- Su materialización es la lista, porque su Nerode es la lista entera.

### 7.2 Catálogo consolidado (materializado)

`q_cat = (aporte: contribuciones(e) → mapa {(ID, k) ↦ {último: v} | {aq: (A, Q)}}, M: mapa(etiquetas), obs: secciones)`.
- Es exactamente «la Actualidad es el producto de los monoides de clase» (`ALGEBRA_DE_PREGUNTAS.md` §4). No usa el estado. La clase de cada `k` sale de `Φ` en `ctx_k.parámetros`.
- **Se guardan las secciones propias** (explícitas). La herencia y los valores por defecto se calculan en `obs` con la `Φ` vigente.

*Contraejemplo de guardar la sección efectiva [T][V].* La variante `a` tiene `color = Azul` explícito y su producto `Azul`; la variante `b` no tiene color explícito y su producto `Azul`. La sección efectiva es igual. Tras `Fijar(producto, color, Rojo)`, `a` sigue `Azul` y `b` pasa a `Rojo`. La sección efectiva **no** es congruente (L10), mientras que la propia más la herencia en `obs` sí lo es. Es el mismo patrón que el `defecto` de la fase 1 §7.1.

**Ficha** `(e) = obs` que compone la sección efectiva de `e`, `q_flat` en `(w, e)` y las referencias `Q` de la galería. Es una composición (L17), nunca una autoridad.

### 7.3 Flat por bodega (materializado)

`q_flat(w) = (aporte: movimientos(e, H) restringido a w → {v ↦ Δ}, M: sumaPorClave, obs: vector alineado con T)`, con `leeEstado`.
- La contribución de `Contar` depende del estado (`δ = h − H`): es una pregunta levantada (corona, E1.2). Como `M` es un grupo, **las existencias en cualquier fecha y los flujos por período salen por diferencia de prefijos** (fase 2, Teorema 7.2) sobre las contribuciones realizadas. [V: 1.000/1.000 en el caso de juguete.]
- `Flat_w = (TableIdentity = (StreamID, variante), Values[slot] = acum[v] o el valor por defecto, corte)`.
- La representación es `int32` con negativos. Un desbordamiento es un error visible de la proyección, nunca un truncamiento.
- Con `flat.defecto = 0` (valor inicial), el alta de una variante no requiere ninguna acción (L29).

### 7.4 Disponibilidades (bajo demanda)

Sobre `S_j` (forma clásica, `π` de coordenadas de `m`, que es congruente) o como pregunta levantada `sumaPorClave` sobre `(familia, w, v)`:

```
H = m(H[w,v])    A = m(comprometido[w,v])  (VF7)    P = Σ_{s ∈ ventas(w,v)} m(pend[s])
D_no_asignada = max(0, m(libre[w,v]))    D_prudente = max(0, m(libre[w,v]) − P)    Déficit = max(0, −m(libre[w,v]))
noApto = m(noApto[w,v])    descuadre = m(descuadre[w,v])      (positivo = merma, negativo = sobrante)
```

- Las funciones `max` están en `obs`, así que su no congruencia (L10) no importa (corolario de E1.3).
- La disponibilidad **mostrada** por canal es configuración de la pregunta (L11, §10).
- **Total multibodega:** `Σ_w max(0, libre[w,v])` (valor inicial) o `max(0, Σ_w libre[w,v])`. Son dos preguntas distintas, y la primera es la asignable sin transferir. [T]

### 7.5 Fibras y filtros (bajo demanda)

`F_{k,v}` = bitset sobre `T` (o sobre los IDs del tipo) con dos máscaras:
- **activos**: estado efectivo `activo`;
- **conocidos**: valor efectivo distinto de `desconocido`.

El complemento es relativo a los conocidos (L2). Filtros compuestos = expresiones de la fase 2. Ejemplo «bajo umbral»: `{op: "<", de: [lee(disp.libre, x), lee(carac, x, umbral)]}`.

### 7.6 Auditoría (bajo demanda; gratuita, L35)

`q_aud(σ)` = lista de las invariantes VF5–VF9 y de `𝒩.auditoría` que **fallan** en `S_σ`. Debe ser vacía. Un fallo con una `Γ` íntegra indica un error de la regla o un cambio de Red que `G^par` no detectó. Se informa y no se corrige: corregir es una acción nueva (L3).

### 7.7 Ejemplos (preguntas que nacen sin construir nada)

| Pregunta | `φ` | `aporte` / `M` | `obs` |
|---|---|---|---|
| Kardex de `(w,v)` | toca `H[w,v]` | `[e, movimientos]` / `secuencia` | lista con saldos |
| Ventas por canal en un período | `tipo = Disparar:Vender` | `{clave: carac(s, canal), valor: q·p(s)}` / `sumaPorClave` (levantada) | componente; ventana por prefijos |
| Merma del período | toca `descuadre` | `movimientos(e, descuadre)` / `sumaPorClave` | componente |
| Quiebres | toca `H[w,v]` | `[Δ, Δ]` / `extremoPrefijo(mín)` | `aplicar(H_i) ≤ 0` |
| Inventario sin movimiento | toca `H` | `{v}` / `unión` | `Activos ∖ tocados` (fibra) |
| Valoración a costo promedio | `Ingresar` con `costo`, salidas | `(Σ costo·q, Σ q)` / `producto(suma, suma)` | cociente |

---

## 8. Leyes aplicables (para `kobalt-verificador`)

**Oráculo de dominio:** un modelo literal de §4–§5 (verbos + Red) más el **Anexo B** (escenarios v2).
**Generador:** las trayectorias de `red2.cjs` (Teorema 5.1) re‑expresadas en los cinco verbos, con:
- dos bodegas, transferencias y canales `POS`/`Web`;
- cambios de `Φ` y `𝒩` por `FijarParámetro`;
- actores propietario, cajero y vendedor;
- lotes de nacimiento y de venta inmediata;
- rechazos intercalados.

Semilla `KOBALT_SEED`.

| Ley | Cómo se verifica |
|---|---|
| **L1** | Reconstruir `R` desde las secciones y desde las columnas de `q_cat` da lo mismo |
| **L2** | Las fibras son álgebra booleana; el complemento usa la máscara de conocidos. Mutante «complemento sin máscara» ⇒ incluye entidades con valor `desconocido` ⇒ falla |
| **L3 / L4** | El estado de dominio = `Fold`; snapshot + sufijo = `Fold` completo, también cruzando cambios de `Φ` y `𝒩` |
| **L6 / VF1–VF10** | Se comprueban en **cada** estado intermedio. VF5–VF9 con `q_aud` = vacío |
| **L7** | Los casos dirigidos de §6 (`H < 0` con POS liberado; `libre < 0` tras `Contar`) son **alcanzables** y representables. Mutante «`Contar` con restricción» ⇒ un conteo físico se rechaza ⇒ falla la prueba «un conteo siempre se admite» |
| **L10** | Los contraejemplos de §7.2 (sección efectiva) y de L10 (`max(0, H−A)`) se detectan como no congruentes, y su refinamiento pasa |
| **L11 / L12** | Tabla de L12 sobre la Red: `Solicitar=Vender`, `Asignar`, `Despachar`, `Ingresar`, `Contar`, `Cancelar` (nueva fila: `D_prudente` sube `cp + ca`, `D_no_asignada` sube `ca`) |
| **L16** | Capacidades finas: el vendedor no puede `Disparar:Contar` ni `Disparar:Asignar` (`NO_AUTORIZADO`). Un lote con una acción interna no autorizada ⇒ `NO_AUTORIZADO` (E4). Una cadena de tipo incoherente ⇒ `INADMISIBLE('tipoIncoherente')`. Alcance propio ⇒ `INADMISIBLE('ajeno')` |
| **L17** | La ficha se compone en `obs`; no hay escritura de ficha. El mismo `Fijar` desde la ficha o desde la tabla produce la misma entrada |
| **L26** | ID `(i, j)` ≠ slot ≠ SKU. Corregir el SKU no cambia ni el slot ni el ID. Dos `Γ` distintas con el mismo `(i, j)` no designan la misma entidad (L25) |
| **L28 / L29** | Un lote rechazado no consume slot. `q_flat` construido en `T_n` sigue valiendo en `T_m` sin reescribirse; una variante nueva vale 0 sin ninguna acción de existencias |
| **L33** | Cada clase de característica usa su monoide del catálogo; `q_cat` incremental = reconstruido |
| **L35** | Teorema 5.1 contra el modelo (no contra la v2, que no entra al repo). Revisión estática «dato, no código». Mutante «quitar `libre` de las restricciones de `Asignar`» ⇒ se admite una asignación que la v2 rechaza |
| **L31** | Todos los parámetros de §10 tienen valor inicial y dominio. Cambiar `Φ` o `𝒩` abre una época y no reinterpreta entradas anteriores. `G^par` rechaza quitar una característica con valores, cambiar una clase, relajar `inmutable` y mover entre especies |
| **L20** | Revisión: ninguna transición escribe fuera de `Γ`. `Lote` no admite acciones de contrato |

---

## 9. Fronteras [L]

1. **Realidad física.** La Red registra lo que se **declara**. `Despachar` no prueba que la mercancía salió, ni `Cobrar` que llegó el dinero (L14). La v2 lo decía igual.
2. **Una sola `Γ`.** Sin cuotas no hay ventas sin conexión en otros dispositivos (L19): fases 7 y 8+.
3. **Dinero en enteros** (unidad mínima de la moneda). No hay impuestos, multimoneda ni redondeos.
4. **Sellos de tiempo** declarados por el solicitante (fase 2 §7.4).
5. **Privacidad.** La visibilidad de la galería es un filtro de lectura, no control de acceso (L23).
6. **Invariantes declaradas con coeficientes dependientes de características** (VF8). `G^par` no puede comprobarlas estáticamente en general [P]. La auditoría las detecta al leer, no las impide.
7. **Carga inicial por conteo.** Un primer `Contar(h)` sobre `H = 0` aparece como sobrante (`descuadre < 0`). Es exacto (las unidades aparecieron sin entrada declarada). Si se quiere distinguir, la pregunta de merma filtra por `motivo` (dato del conteo).

---

## 10. Espacio de configuración (L31)

### 10.1 Parámetros

| Parámetro | Posibilidades | Qué implica (ley o teorema) | Valor inicial |
|---|---|---|---|
| `dominio.forma` | cualquier `Φ` que extienda la anterior (`G^par`) | Característica o tipo nuevo = dato. Clase = monoide (L33) | Anexo A (equivale a la v2) |
| `dominio.red` | cualquier `𝒩` intra‑especie que conserve las familias con marcado | Depósito o transición nueva = dato (L35) | §5.3 |
| Restricción por transición | `todas` / `ninguna` / lista de familias | Teorema 6.1. Restringir `Contar` impide registrar la realidad (L7, L14): posible, pero desaconsejado | `Contar: ninguna`; las demás: `todas` |
| `dominio.liberaciones` (por canal) | cualquier lista `(transiciones, canal, familias)` | Liberar `libre`/`H` ⇒ el negativo es un descuadre visible (Teorema 6.1) | POS: `libre`, `H` en `Asignar`/`Despachar` (plan §13). **Perfil v2 del oráculo:** `[]` |
| Disparo nulo | `admitir` / `rechazar` por transición | Un conteo confirmatorio es un hecho; una cancelación vacía no lo es | `Contar: admitir`; las demás: `rechazar` |
| `dominio.lote` | `máximo ∈ ℕ`; `guarda ∈ {cadaPaso, final}` | `final` = transición compuesta `W = Σ W(a_j)`: admite un orden interno libre, con el mismo resultado comprometido | `{50, cadaPaso}` (v2) |
| `dominio.conjunto` | `rechazar` / `sinEfecto` | La v2 rechaza el vínculo repetido | `rechazar` |
| `κ` por tipo | cualquier tupla de características con fibra única entre las activas | Plan §13, VF10 | `variante: [sku]`, `usuario: [principal]` |
| `dominio.alcancePropio` | `u ↦ patrones` | Guarda de admisión, no capacidad | `{}`; las plantillas de §3 lo rellenan al dar de alta un cajero o un vendedor |
| `dominio.propietarios` | lista de principales | Solo afecta a los filtros `admite` y a la visibilidad | `[constituyente]` |
| Plantillas de capacidades | cualquier subconjunto de tipos | L16 | §3 (cajero, vendedor, lector) |
| Transferencia | dos pasos (tránsito visible) / un paso (una transición con ambos movimientos) | En una sola `Γ` ambas son atómicas. Dos pasos = tránsito como depósito | dos pasos |
| Disponibilidad mostrada por canal | `no_asignada` / `prudente` / ambas | L11 | `no_asignada` |
| Agregación multibodega | `Σ_w max(0, libre_w)` / `max(0, Σ_w libre_w)` | §7.4 | `Σ_w max(0, ·)` |
| `flat.defecto` | `0` / `desconocido` si nunca se tocó `(w,v)` | L29, L2 (máscara) | `0` |
| Materialización | `T`, `q_cat`, `q_flat` / otras | L34 | `T`, `q_cat`, `q_flat` (plan) |
| Partición de `Γ` | una / `{Cat, Inv_w}` / … | Teorema 2.1: solo si ninguna guarda de `Inv` lee un predicado no estable de `Cat` | una |

### 10.2 Contradicciones y precisiones (para el coordinador)

**Contradicciones con leyes:** ninguna. **Supuestos empíricos nuevos:** ninguno.

**Cambios al núcleo que esta fase exige:** E3 y E4 (enmienda), con estos contraejemplos:
- **E3.** Con `tipos` estáticos, añadir la transición `Transferir` en la época 5 (dato) requeriría registrar código nuevo con el tipo `Disparar:Transferir`. Es decir, «transición nueva = dato» sería falso. Si el tipo fuese solo `Disparar` con la transición en `args`, el patrón de capacidad `Disparar:Vender` no podría expresarse, y habría que montar un segundo sistema de capacidades dentro de la regla (contra L16 y la parsimonia).
- **E4.** Un `Lote` autorizado solo por `"Lote"` permitiría a un vendedor colar `Disparar:Contar` dentro de un lote.

**Precisiones de documentos:**

| Id | Documento | Precisión |
|---|---|---|
| P‑A | `ANALISIS_INVENTARIO_V2.md` §3.1 («`Asignar` … con guarda `H_v − A_v ≥ q`») | Esa guarda no es «un depósito ≥ 0» salvo que exista el **complemento** `libre = H − A` como lugar. Se añade la especie holgura (`libre`, `comprometido`); VF6 y VF7 son sus invariantes de lugar |
| P‑B | L35 («la única guarda es `m' ≥ 0` en los depósitos restringidos») | La restricción es **por transición** (y por canal). `Contar` no tiene ninguna; si no, viola L7 y L14 |
| P‑C | L35 / v2 | Un `Contar` que no cambia nada es un hecho (la v2 lo admite) ⇒ `nulo: admitir`. Detectado como discrepancia [V] antes de corregir |
| P‑D | L35 («ID = `n` del compromiso de nacimiento») | Con lotes de varios nacimientos, `ID = (i, j)`. `T_r` calcula `i` sin cambiar el núcleo |
| P‑E | Plan §13 («cajero: `Vender`, `Devolver`, leer») | En la Red, «vender en el POS» es el lote `Nacer:venta + Vender + Asignar + Despachar`. El cajero necesita `Asignar` y `Despachar`, con alcance propio, para que la plantilla conserve su intención |

**Cambios deliberados respecto de la v2:** Anexo B, C1–C8.

---

## Anexo A · Forma inicial (perfil v2)

`R` = requerida, `I` = inmutable, `H` = heredable. El creador de cada entidad se registra siempre (`ent.creador`).

| Tipo | Características (clase, valor, marcas) | `κ` / restricciones / `alNacer` |
|---|---|---|
| `bodega` | `nombre` (asig., texto 1–80, R) | — |
| `producto` | `nombre` (asig., 1–140, R, H) · `descripción` (≤5000, H) · `categoría` (≤120, H) · `costo`, `precio`, `descuento` (asig., entero 0–10¹², H) · `público` (asig., bool, R, H) · `estado` (ciclo `activo⇄retirado`, inicial `activo`, H) · `galería` (referencia‑muchos de registros `{Q, creador, propósito ∈ {página, vendedor}, audiencia ∈ {público, creador, usuarios}, permitidos ≤ 30}`, `clave = [Q, creador, propósito, audiencia]`, `admite.añadir`, `admite.quitar`) · familia `*:*` (asig., simple: texto ≤2000 \| entero \| bool \| null; máximo 60) | restricción: `descuento = 0 ∨ descuento ≤ precio` |
| `variante` | `producto` (referencia‑uno → `producto`, R, I; es el `padre`) · `sku`, `código`, `color`, `talla` (asig., ≤100) · `umbral` (asig., entero ≥ 0) · `estado` (ciclo, inicial `activo`) · familia `*:*` | `denso`; `κ = [sku]` |
| `cliente` | `nombre` (1–120, R) · `contacto` (≤200) | — |
| `usuario` | `nombre` (1–120, R) · `principal` (texto, R, I) · `papel` (texto, descriptivo) | `κ = [principal]` |
| `venta` | `variante` (ref → variante, R, I, `admite.fijar = activa(it) ∧ activa(padre(it)) ∧ (carac(padre(it), público) ∨ dueño(it) = x.u ∨ x.u ∈ propietarios)`) · `bodega` (ref → bodega, R, I) · `precio` (entero 0–10¹², R, I: **precio acordado**) · `canal` (texto 1–80, R, I) · `cliente` (ref → cliente, I, opcional) · familia `*:*` | `alNacer = Abrir` |
| `devolución` | `venta` (ref → venta, R, I) | `alNacer = Abrir` |

Filtros de la galería (perfil v2, con `x.u` = actor y `x.it` = elemento):
- `admite.añadir = x.it.creador = x.u ∧ (público(e) ∨ x.u ∈ propietarios ∨ dueño(e) = x.u) ∧ (x.u ∈ propietarios ∨ (x.it.propósito = vendedor ∧ x.it.audiencia ≠ público) ∨ dueño(e) = x.u)`;
- `admite.quitar = x.u ∈ propietarios ∨ dueño(e) = x.u ∨ x.it.creador = x.u`;
- **visibilidad** (pregunta, no guarda) `= audiencia = público ∨ x.u = creador ∨ x.u = dueño(e) ∨ x.u ∈ propietarios ∨ (audiencia = usuarios ∧ x.u ∈ permitidos)`.

---

## Anexo B · Oráculo de aceptación (escenarios v2 → Forma + Red)

**Configuración del oráculo:**
- Forma del Anexo A, Red de §5.3, **perfil v2** (`liberaciones = []`).
- Capacidades: `propietario = ["*"]`; `U1` = plantilla «vendedor».
- Una bodega `W` nacida en el primer compromiso (`Nacer:bodega{nombre: principal}`).
- Notación:
  - `L[…]` = Lote;
  - `@j` = `j`‑ésimo nacimiento del lote;
  - `P1` es el ID `(i, 0)` del lote que lo hace nacer y `v1` es `(i, 1)`, con slot 1;
  - `S1`, `R1`, `C1` son los IDs `(i, 0)` de sus nacimientos.

### B.1 Cambios deliberados (la reformulación cambia el comportamiento a propósito)

| Id | Cambio | Por qué |
|---|---|---|
| **C1** | El cliente **no propone IDs ni slots**: no hay «`P1`», «`S1`», «slot 2» en las acciones. El ID es `(i, j)` y el slot es el rango | L28 generalizada: desaparecen seis contadores y sus validaciones de «consecutivo» (`ANALISIS_INVENTARIO_V2.md` §2a) |
| **C2** | Una característica no declarada en `Φ` se rechaza por **no declarada** (`característicaDesconocida`), no por «falta namespace». Con la familia `*:*`, toda clave `ns:clave` está declarada | Una sola Forma, sin dos regímenes de campos (§2b) |
| **C3** | **`Cancelar` parcial.** Cancela lo pendiente y lo asignado aunque haya algo despachado o cobrado, siempre que `cobrado ≤ despachado bruto · p` (`porCobrar` restringido). Lo despachado se devuelve y lo cobrado se reembolsa por sus propias transiciones. La v2 prohíbe cancelar con cualquier despacho o cobro. [V: en 94 casos la v2 rechaza y la Red admite; todos cumplen la condición; nunca al revés] | §2i del análisis: desaparece la excepción |
| **C4** | Hash: el contrato de derivación del núcleo (SHA‑256 completo, CV), no `sha256/240` sobre JSON. Los medios se identifican por `Q = ContentId(B)` (64 hex) | Un solo contrato Exacto (§2h) |
| **C5** | Reintento con el mismo `sid` y **otro** contenido: el núcleo responde `YA_COMPROMETIDO(i)` (G2). La v2 lanza un error. Detectar el conflicto es tarea de la puerta (fase 6): compara `Enc` de la solicitud con `e_i` y devuelve `CONFLICTO_SID` | El núcleo no compara contenidos (fase 1 G2); `Δ` sí distingue `Conflictos` (L13) |
| **C6** | Galería: la identidad de un vínculo es `clave = [Q, creador, propósito, audiencia]`, tanto para añadir como para quitar. La v2 usa claves distintas para adjuntar (4 campos) y para retirar (3) | Una sola identidad por elemento |
| **C7** | Varias variantes por producto en un solo lote de nacimiento. Un producto **sin** variantes es representable (la v2 siempre crea una) | Forma general |
| **C8** | Transferencias, multibodega, liberación por canal y lote `final`: no existen en la v2 | Se añaden como dato (§10) |

### B.2 Los 50 escenarios del núcleo v2

Notación de rechazo: `NA` = `NO_AUTORIZADO`; `IN(m)` = `INADMISIBLE(m)`; `forma` = G5.

| # | Escenario v2 | Expresión en Forma + Red | Esperado |
|---|---|---|---|
| 1 | Estado comercial vacío | `Γ` con solo `Nacer:bodega` | `q_T = []`, `q_cat` sin productos |
| 2 | Alta de producto y variante en un compromiso | `L[Nacer:producto{nombre: Camiseta, descripción, categoría: Ropa, costo: 12000, precio: 35000, descuento: 30000, público: sí, comercio:marca: Kobalt}, Nacer:variante{producto: @0, sku: P1‑V, color: Azul, talla: 4}]` | una entrada; `nombre(P1) = Camiseta`; `slot(v1) = 1` |
| 3 | Slot 1 y continuidad en 2 | — | `|T| = 1`; la siguiente variante tendrá slot 2 (C1) |
| 4 | Precio rebajado y costo diferenciados | `q_ficha(P1)` | `descuento = 30000`, `costo = 12000` |
| 5 | Custom tipado por namespace | `q_ficha(P1)` | `comercio:marca = Kobalt` |
| 6 | Rechazar custom sin namespace | `Fijar(P1, temporada, "2026")` | `IN('característicaDesconocida')` (C2) |
| 7 | Agregar variante no reordena | `Nacer:variante{producto: P1, sku: P1‑A, color: Rojo, talla: 6}` | `slot(v2) = 2`; `color(v1) = Azul`, `color(v2) = Rojo` |
| 8 | Físico cero al crear | `q_disp(W, v2)` | `H = 0` sin ninguna acción (L29) |
| 9 | Conteo absoluto | `Disparar:Contar{W, v1, h: 10}` | `H(v1) = 10`; `descuadre = −10` (sobrante: carga inicial, §9.7) |
| 10 | Ingreso sin tocar catálogo | `Disparar:Ingresar{W, v1, q: 5}` | `H = 15`; `nombre(P1)` igual |
| 11 | Flat de 2 slots | `q_flat(W)` | `[15, 0]` |
| 12 | Umbral y alerta | `Fijar(v1, umbral, 16)` | `v1 ∈ F_bajoUmbral` (`libre 15 < 16`) |
| 13 | Venta sin salida física | `L[Nacer:venta{variante: v1, bodega: W, precio: 29000, canal: POS}, Disparar:Vender{@0, 3}]` | `H = 15`, `P = 3` |
| 14 | Reserva sin doble descuento | `Disparar:Asignar{S1, 2}` | `D_prudente` igual (12); `A = 2`; `P = 1` |
| 15 | Despacho consume físico | `Disparar:Despachar{S1, 2}` | `libre` igual (13); `desp[S1] = 2`; `asig[S1] = 0`; `H = 13` |
| 16 | No despachar sin asignación | `Disparar:Despachar{S1, 1}` | `IN('asig[S1] < 0')` |
| 17 | Precio acordado se conserva | `L[Fijar(P1, precio, 40000), Fijar(P1, descuento, 0)]` | `precio(S1) = 29000`; `precio(P1) = 40000` |
| 18 | Color sin afectar stock | `Fijar(v1, color, Verde)` | `color(v1) = Verde`; `H` igual |
| 19 | Crear usuario vendedor | `Nacer:usuario{nombre: Tienda A, principal: U1, papel: vendedor}` y después `FijarParámetro(nucleo.capacidades ⊕ {U1 ↦ vendedor}, dominio.alcancePropio ⊕ {U1 ↦ …})` | dos compromisos; `U1` con la plantilla |
| 20 | Vendedor no puede contar | `U1: Disparar:Contar{W, v1, 999}` | `NA` |
| 21 | Vendedor sí registra venta | `U1: L[Nacer:venta{v1, W, 35000, Web, canal:ref: W1}, Disparar:Vender{@0, 1}]` | admitida; `creador(S2) = U1` |
| 22 | Vendedor no puede reservar | `U1: Disparar:Asignar{S2, 1}` | `NA` |
| 23 | Cliente con identidad propia | `Nacer:cliente{nombre: Cliente ejemplo, contacto}` | `nombre(C1)` |
| 24 | Pago manual | `Disparar:Cobrar{S1, 87000}` | `cobrado[S1] = 87000` |
| 25 | No cobrar más del total | `Disparar:Cobrar{S1, 1}` | `IN` (`porCobrar < 0`) |
| 26 | Devolución parcial | `L[Nacer:devolución{venta: S1}, Disparar:Devolver{@0, 1}]` | `sol[R1] = 1`; `cupo[R1] = 29000` |
| 27 | No devolver más de lo despachado | `L[Nacer:devolución{S1}, Disparar:Devolver{@0, 2}]` | `IN` (`desp[S1] < 0`); el lote no compromete nada |
| 28 | Recepción revendible | `Disparar:Recibir.apto{R1, 1}` | `H +1` |
| 29 | No recibir doble | `Disparar:Recibir.apto{R1, 1}` | `IN` (`sol < 0`) |
| 30 | Reembolso ligado | `Disparar:Reembolsar{R1, 29000}` | `cupoUsado = 29000`; `reembolsado[S1] = 29000` |
| 31 | No reembolsar de más | `Disparar:Reembolsar{R1, 1}` | `IN` (`cupo < 0`) |
| 32 | Lote de venta inmediata | `L[Nacer:venta{v2, W, 10000, Mostrador}, Vender{@0, 1}, Contar{W, v2, 2}, Asignar{@0, 1}, Despachar{@0, 1}]` | una entrada; `H(v2) = 1`; `desp = 1` |
| 33 | Lote fallido no cambia el estado | `L[Nacer:producto{…}, Nacer:variante{@0, …}, Contar{W, (99, 0), 10}]` | `IN('referenciaInexistente')`; `Γ` igual; ningún slot consumido |
| 34 | Retirar no reutiliza coordenadas | `Fijar(P1, estado, retirado)` | `estado(P1) = retirado`; `|T| = 2` (el #32 no crea variantes y el #33 fue rechazado); una variante nueva tendría slot 3 (C1: no se puede «proponer el slot 1») |
| 35 | Verificación de hashes | `verificar(Γ)` (núcleo) | `OK(n, h_n)` |
| 36 | Alterar un evento rompe hashes | manipular `e_1` | `DISCONTINUIDAD` |
| 37 | Versión desconocida | entrada con `ε` alterada o regla no registrada | `DISCONTINUIDAD('ÉPOCA')` / rechazo de `FijarParámetro` |
| 38 | Misma secuencia, mismo estado | `Fold` dos veces | iguales (L4) |
| 39 | Incremental = completa | `resolverProyeccion` de `q_cat`/`q_flat` desde el checkpoint 5 | = reconstrucción (L9) |
| 40 | Hash igual para bytes iguales | `ContentId(B)` dos veces | igual (C4) |
| 41 | Hash cambia con los bytes | `ContentId(B) ≠ ContentId(B')` | distinto (C4) |
| 42 | Media pública visible | visibilidad (`U1`, audiencia público) | verdadero |
| 43 | Media privada no visible | (`U1`, audiencia creador, creador propietario) | falso |
| 44 | Creador ve su medio | (`U1`, creador `U1`) | verdadero |
| 45 | Seleccionada respeta permitidos | (`U1`, usuarios, `[U1]`) | verdadero |
| 46 | Corte conserva el estado histórico | `q_cat` en el corte posterior al lote del #2 | `color(v1) = Azul`; `|T| = 1` |
| 47 | Cabecera divergente ≠ prefijo | `resolver(hashes, hashes′)` | `FORK` o `SIN_EVIDENCIA`, nunca `CADENA` |
| 48 | Estado vacío vuelve a `P1` | nueva `Γ` (otro `StreamID`) | el primer nacimiento es `(1, 0)` en **su** `Γ`; no se identifica con el de otra (L25) |
| 49 | Acción desconocida | tipo `VENTA_MAGICA` | `IN('forma')` (G5) |
| 50 | Usuario 1 ≠ cliente 1 | IDs de `U1` y `C1` | distintos por construcción: posiciones distintas (VF1). Más fuerte que en la v2 |

### B.3 Flujos F0–F9

| Flujo | Expresión | Esperado |
|---|---|---|
| F0 Génesis | `crear(g)` sin entradas | `q_T = []`; `q_flat = []`; cabeza `(0, h_0)`; `verificar` = OK |
| F1 Alta y dos orientaciones | #2; `q_fibra(color = Azul) ∋ P1`; `Fijar(P1, comercio:temporada, 2026)`; `Fijar(v1, color, Verde)` | `F_{Azul}` deja de contener `v1`, `F_{Verde}` lo contiene; slot 1 igual; ningún compromiso extra para el filtro |
| F2 Imagen exacta | `Q = ContentId(B)` (fase 5); `Añadir(P1, galería, {Q, propietario, página, público, []})`; otro con audiencia creador | La misma `Q` para los mismos bytes; visibilidad por actor; bytes recomprimidos ⇒ otra `Q` |
| F3 Conteo y Flat | `Contar 10`; `Ingresar 3` | `q_flat = [13]`; en el corte anterior `[10]` (pregunta en el corte) |
| F4 Precio histórico | venta 2 × 32000 (POS); `Fijar(P1, precio, 40000)` | `porCobrar[S1] = 64000` (subtotal); `H` igual; `P = 2`; `precio(S1) = 32000` |
| F5 Asignación y despacho | `H = 13`: `Asignar 2` ⇒ `A = 2`, `P = 0`, `H = 13`; `Despachar 2` ⇒ `A = 0`, `H = 11`; `libre = 11` antes y después; `Despachar 1` ⇒ rechazo | Igual que la v2 |
| F6 Devolución independiente | `Devolver R1 1`; `Recibir.apto 1` ⇒ `H + 1`; `Cobrar 64000`; `Reembolsar 32000`; luego exceso de devolución y de reembolso ⇒ rechazos | Igual que la v2 |
| F7 Idempotencia y autoridad | `Contar` con `sid = demo‑1`; el mismo `sid` y contenido ⇒ `YA_COMPROMETIDO(i)`; el mismo `sid` con `h = 999` ⇒ `YA_COMPROMETIDO(i)` y la puerta informa `CONFLICTO_SID` (C5); `U1: Contar` ⇒ `NA`; `verificar` = OK | — |
| F8 UI y automatización | (fase 6) la misma puerta para ambos | Fuera de esta fase |
| F9 Recuperación | copia = `(g, bloques)`; restaurar = `crear(g)` + `incorporar` ⇒ la misma cabeza y la misma `q_cat`; mezclar con otra `Γ` ⇒ `GÉNESIS_DISTINTA` o `CABEZA_CAMBIADA`; un respaldo v1 (`sha256/256`) sin derivación registrada ⇒ rechazo | Igual que la v2, con el contrato de derivación del núcleo |

---

## Anexo · Reducción a un solo verbo y modalidades de la v3 (2026‑11‑12)
Fuente: `kobalt/docs/2026-11-12_AMPLIACION_V3_Y_REVISION.md`, §3, §4 y §6.
1. **Un solo verbo.** Una acción de dominio es un elemento de soporte finito `δ ∈ ∏_{(e,k)} M_{clase(k)}`, y aplicarla actúa coordenada a coordenada. `Nacer`, `Fijar`, `Añadir`, `Quitar` y `Disparar` son **formas** de `δ`: nacer es aplicar `δ` en coordenadas frescas `(i,j)`; `Lote` es el producto del monoide. El intérprete es una sola función por clase de coordenada. Los nombres (`Disparar:Vender`…) son plantillas de dato y sirven para las capacidades (E3/E4). Completitud: cada clase contiene constantes. Intención: `+(−1) ≠ =9`.
2. **Modalidades de venta de la v3 como plantillas:**
   - solo registro: `Vender` con las unidades pendientes en `pend⁰_s`, no elegible para la pregunta prudente;
   - demanda suave: `Vender` con las unidades en `pend_s`;
   - asignación firme: `Vender·Asignar`;
   - inmediata: `Vender·Asignar·Despachar`.

   [V] 0 discrepancias frente al `core.js` de la v3 en 22.804 acciones. «Solo registro» frente a «suave» es un hecho de elegibilidad (L15); la disponibilidad física, libre o prudente es una pregunta sin evento.
3. **Oráculo de aceptación:** se añaden los escenarios de la v3 (modalidades y lectura físico/libre/prudente) a los de la v2.

---

## Anexo B · Precisiones fijadas por el verificador (2026‑11‑12)
Las fuerzan `kobalt/tests/leyes/dominio.*`; ninguna contradice una ley.
1. **`pend⁰`:**
   - es una familia restringida de la especie D, con las transiciones `Vender.registro` y `Asignar.registro`;
   - `Cancelar` también la mueve, y VF8 la incluye;
   - las plantillas de cajero y vendedor añaden `Disparar:Vender.registro`.
2. **`dominio.propietarios`:** su valor inicial es `null`, que significa `[nucleo.constituyente]`. Σ no lee la génesis.
3. **`conjunto: sinEfecto`:** el efecto es el elemento `(A,Q)`, es decir, reemplazo por clave. «Añadir si falta» exigiría leer el estado y rompería la pregunta sin estado `q_cat`.
4. **Motivo de marcado:** `negativo:<lugar>`, con el primer lugar que baja en el orden de los movimientos.
5. **Lote con guarda `final`:** `R` es la unión de los `R_c(t_j)` menos las liberaciones. Se comprueban los lugares con `W` neto < 0.
6. **Alcance propio:** una transición sin `objetivo` falla cerrada (`ajeno`). El disparo interno `alNacer` no comprueba alcance.
7. **Corrección a la restricción del producto (Anexo A):** `nulo?(descuento) ∨ descuento = 0 ∨ descuento ≤ precio`. La forma anterior rechazaba todo producto sin descuento.
8. **«Máximo 60» en `*:*`:** es el número de claves explícitas de esa familia por entidad.
9. **Actividad:** se lee de la característica `estado = activo`. Un tipo sin `estado` cuenta como activo.
10. **Invariantes:** VF6–VF9 son dato en `𝒩.auditoría` (formas lineales con `rango`). VF5 es genérica.
11. **F1:** el color es de la variante, así que la fibra contiene `v1`, no `P1`.
12. **Teorema 6.1:** la inducción necesita `H ≥ 0` al inicio del intervalo.

---

## Anexo C · Resolución de la revisión conceptual de la implementación (2026‑11‑12)
Veredicto de la revisión sobre `94726c7`: **OBJECIONES (4)**. Esto queda fijado:

1. **El efecto es total; las guardas solo admiten (Teorema 2, L7).**
   - Se separa `efecto(D, e, C) → δ`, una función **total** que no devuelve motivos. Calcula los IDs `(i,j)`, el estado inicial de los ciclos, `W(t)` evaluado en `S_{k−1}` y el `δ` de `alNacer`.
   - `guarda(D, e, C)` usa `efecto` y añade las comprobaciones.
   - `T` y el lector `movimientos` usan **solo** `efecto`. Nunca lanzan sobre una entrada comprometida.
   - Una incoherencia (por ejemplo, una guarda corregida en código después de comprometer) se ve en `q_aud` y nunca impide leer.
   - Prueba exigida: `Fold` y las proyecciones de una `Γ` válida siguen funcionando aunque una guarda se vuelva más estricta.
2. **La actividad es dato de la Forma (L31, L35).** Cada tipo de `Φ` declara `actividad: {característica, valores} | ausente`, con el valor inicial del Anexo B.9 en la Forma inicial. `G^par` comprueba que cambiar la actividad no rompe κ (VF10), igual que cuando cambia κ.
3. **La configuración de lectura son parámetros de la pregunta (L32):**
   - `disponibilidad(w, v, {familias, agregación})`, con agregación `Σ_w max(0,·)` o `max(0, Σ_w ·)` (§10);
   - `visible(…, regla)`, y la regla de visibilidad de la galería vive en su declaración de `Φ`, junto a `admite`;
   - `fibra(k, v, τ)`.

   Los valores de `inicial.mjs` son solo **valores por defecto**.
4. **Un solo lenguaje y un solo catálogo (L32).** La fase 3 **reutiliza** de `kobalt/src/preguntas/`:
   - `evaluar`, `validarExpr` y `registrarLector`;
   - el catálogo de monoides `monoide(…)`, que incluye la detección de desbordamiento.

   Se elimina `dominio/expresiones.mjs` y los monoides propios de `proyecciones.mjs`. Los lectores del dominio (`carac`, `movimientos`, `nacimientos`…) se registran con `nombre@versión` y clase (entrada o estado), para que las preguntas de la fase 2 los usen sobre esta `Γ`. Requisito: la fase 2 debe estar integrada antes.
5. **`q_T` frente a «secuencia no se materializa».** `T` no es `Γ` filtrada: es la lista de identidades nacidas de tipos densos. Se añade al catálogo de la fase 2 el monoide **`nacimientos`** (concatenación de listas de IDs), materializable. Su cociente de Nerode es él mismo, porque cada ID hace falta para la alineación implícita (L29). La prohibición sigue valiendo para `secuencia` sobre entradas arbitrarias.
6. **Desbordamiento:** `INTERPRETE.m` y las sumas usan las operaciones con frontera de ℤ del catálogo. Un desbordamiento es un error visible.
7. **Hueco de la spec (verificador):** `G^par` solo compara la aridad de `índices`, así que una Red que **reordena** los tipos de índice de una familia con marcado se admitía, y después sus claves cambiaban de significado. Ahora `G^par` exige **los mismos `índices`, en el mismo orden**, para toda familia con marcado distinto de cero.
8. **Ajustes al oráculo (no bloqueantes):** el modelo debe usar `Object.hasOwn` en las búsquedas por nombre (`Disparar:__proto__` lanzaba en el modelo) y tratar `−0` como `0`, igual que CV.

---

## Anexo D · La entidad `pedido` y las modalidades de venta como plantillas (2026‑11‑12)
**Fuente:** `kobalt/docs/2026-11-12_REVISION_UI_Y_POS_V3.md` §2 y §7, y la spec `2026-11-12_fase6a-puerta-y-paginas.md`. Este anexo **añade**; no reescribe nada de §1–§10 ni de los anexos A–C. Donde corrige una frase anterior, lo dice (D.8).
**Etiquetas.** [T] teorema con demostración aquí · [V] comprobado con `node` sobre el **modelo de referencia ya existente** (`kobalt/tests/modelos/dominio.modelo.mjs`, sin modificarlo) y el núcleo real; scripts `e1.mjs`…`e6.mjs` en el scratchpad de la sesión, fuera del repositorio · [D] doctrina · [P] propuesta · [L] límite.

**Resumen.**
1. Nuevo tipo `pedido` (contexto de una venta: `cliente`, `canal`, `actor`). `venta` pasa a tener a `pedido` por **padre**, y `canal` y `cliente` salen de `venta` y pasan a `pedido` como características **heredables**.
2. Es un cambio **solo de datos** en `FORMA_INICIAL` (y en las plantillas de capacidades y alcance). La Red `𝒩` no cambia: ni familias, ni transiciones, ni expresiones. `canal(args) = carac(s, canal)` sigue valiendo porque `carac` es la sección **efectiva**, que hereda del padre. [V]
3. Las cuatro modalidades de venta (entregar ahora, apartar, pedido, registrar) son **plantillas de `Lote`**. No hay un campo «modalidad»: es la forma de las acciones comprometidas.
4. Aparecen VF11–VF13. Ninguna exige una restricción entre entidades (D.6).

### D.1 La Forma: `pedido` y el nuevo `venta` (cambio solo de datos)

Diferencias respecto del Anexo A (`R` requerida, `I` inmutable, `H` heredable):

| Tipo | Características | `padre` / `κ` / `alNacer` / `actividad` |
|---|---|---|
| **`pedido`** (nuevo) | `canal` (asig., texto 1–80, **R, I, H**) · `cliente` (referencia‑uno → `cliente`, **I, H**, opcional) · `actor` (asig., texto 1–200, **I, H**, opcional) · familia `*:*` (asig., simple, máximo 60: pasa aquí lo que antes iba en la `*:*` de la venta, p. ej. `canal:ref`) | sin `padre`, sin `κ`, sin `alNacer` (no hay control `abierta[pedido]`), sin `actividad` (un tipo sin `estado` cuenta como activo, Anexo B.9) |
| **`venta`** (cambia) | `pedido` (referencia‑uno → `pedido`, **R, I**; es el `padre`) · `variante` (R, I, `admite.fijar` igual) · `bodega` (R, I) · `precio` (R, I) · `*:*` | `padre: pedido`; `alNacer = Abrir` (igual). **Se eliminan `canal` y `cliente`** de `venta` |

Lo que cambia y lo que no:
- **`Red` sin cambios [V].** Con `liberaciones = [{Asignar, Despachar, canal: "POS", familias: [libre, H]}]`, `H = 0` y `entregarAhora` desde un pedido de canal `POS`: se admite y queda `H = −1`. El mismo con canal `Web` ⇒ `INADMISIBLE(negativo:libre[…])`. El canal se leyó del `pedido` por herencia (`e6.mjs`).
- **`venta.pedido` es el `padre`** (§5.2: referencia‑uno, inmutable y requerida). Por eso: (a) la herencia sale de la definición de `efectiva`; (b) una `venta` no puede declarar `canal` propio: `Nacer:venta{…, canal}` ⇒ `INADMISIBLE('característicaDesconocida')` [V]. El canal de una venta **no se puede almacenar dos veces**.
- **`cliente` es de clase *referencia*, no *asignación*.** El documento de revisión lo llamó «asignación» en sentido amplio. Ambas son «último gana» e inmutables aquí; la clase referencia añade la guarda de existencia (`cliente` debe ser un `ID` nacido del tipo `cliente`). Precisión P‑F.
- **`actor` es una atribución declarada**, no una autoridad (L16, L23): quién solicitó ya está en `ent.creador`. `actor` sirve para «vendido a nombre de»; se omite cuando coincide con el creador y la pregunta lo resuelve como `actor ?? creador`. Es opcional y se puede añadir o quitar de la Forma inicial (§10: es una extensión permitida por `G^par`).
- **`pedido` no es `denso`:** su ID es `(i, j)` como el de todo tipo no denso. No tiene slot ni entra en `q_T`.
- **`ID` dentro de un lote.** Si el lote incluye `Nacer:pedido`, ese nacimiento es `@0` y la primera venta es `@1` (`ID = (i, 1)`). Si no lo incluye, la primera venta es `@0` (`ID = (i, 0)`). **`{nacido: j}` cuenta nacimientos, no acciones** [V: el primer intento de un lote de dos líneas con índices por acción fue rechazado con `referenciaInexistente`].

**Compatibilidad de épocas [V].** Añadir **solo** el tipo `pedido` a una `Γ` con ventas es admitido por `G^par`. Cambiar `venta` (añadirle `padre`) en una `Γ` que ya tiene ventas es `INADMISIBLE('formaCambiaPadre')`: las ventas históricas no tienen pedido y no se reinterpretan (L3, §3). Consecuencia [L]: el Anexo D rige para toda `Γ` **creada** con la Forma nueva. Una `Γ` creada con el Anexo A sigue válida con su Forma, y para ella `pedido` puede añadirse como tipo **sin** que `venta` lo cite: es un camino de migración posible, pero entonces el canal sigue en la venta y habría que mantener dos orígenes (no recomendado, §10).

### D.2 Guardas que se aplican (nada nuevo en el lenguaje de guardas)

| Guarda | `Nacer:pedido` | `Nacer:venta` (con `pedido`) |
|---|---|---|
| G1 capacidad (E3) | patrón `Nacer:pedido` o `Nacer:*` | patrón `Nacer:venta` |
| G1 en el `Lote` (E4) | `tiposInternos` incluye `Nacer:pedido`: **cada** acción interna debe estar autorizada | ídem |
| (2) valores | `canal` requerida; valor del tipo; `cliente` existente | `pedido`, `variante`, `bodega`, `precio` requeridas |
| (3) referencias | `cliente` ∈ `ent` (tipo `cliente`) | `pedido` ∈ `ent` del tipo `pedido`, nacido **antes** o `@j` anterior del mismo lote (VF3); `variante` con su `admite.fijar` (igual) |
| (4) padre | no tiene | exigido: `valores.pedido` debe ser un `ID` |
| `alcancePropio` | **falla cerrada** si el actor lo tiene en su alcance (no hay padre ni objetivo, como B.6): `INADMISIBLE('ajeno')` [V] | `dueño(pedido) = u`: si el pedido es de otro ⇒ `INADMISIBLE('ajeno')` [V] |

- **`dueño(venta) = creador(raíz(venta)) = creador(pedido)`** [V] (§3: `raíz` sigue la cadena `padre`). Cambia respecto del Anexo A, donde era el creador de la propia venta. Efecto: el propietario puede añadir una línea al pedido de un cajero y **el dueño de esa línea sigue siendo el cajero**, que podrá operarla (`Despachar`, `Cobrar`…) bajo su `alcancePropio`. Es coherente con «el contexto vive en el pedido».
- **Un solicitante sin `Nacer:pedido` no puede abrir un pedido** (`NO_AUTORIZADO`) [V]. Por tanto las plantillas de §3 cambian (valor inicial; son datos):

| Plantilla | Capacidades (añade) | `alcancePropio` (añade) |
|---|---|---|
| Cajero | `Nacer:pedido` | `Nacer:venta` |
| Vendedor | `Nacer:pedido` | `Nacer:venta` |

- **`Nacer:pedido` va en capacidades y no en el alcance.** Un tipo sin padre no tiene «objetivo» sobre el que medir el dueño, así que meterlo en `alcancePropio` lo inutiliza para ese actor. Es la misma regla de B.6.
- **E4 (`tiposInternos`).** El lote de venta tiene la forma `[Nacer:pedido?, Nacer:venta, Disparar:…]`. Cada una de esas cadenas debe estar en las capacidades del solicitante. La modalidad `registrar` exige `Disparar:Vender.registro` (B.1), que las plantillas de cajero y vendedor ya incluyen.
- **`dominio.lote.máximo`** cuenta **acciones** (`loteTamaño`). Un lote de un pedido con `n` líneas de modalidad `m` tiene `1 + n·(1 + |m|)` acciones; con `entregarAhora` (`|m| = 3`) caben **12 líneas** (49 acciones) y 13 son `INADMISIBLE('loteTamaño')` [V]. Es un parámetro (§10).

### D.3 Las cuatro modalidades como plantillas

Una **plantilla** es un dato `(parámetros) ↦ solicitud`: una función pura de sus argumentos y del estado de la cabeza (§ «Un solo verbo»: sigue siendo un `δ` del monoide producto). No añade ninguna acción de dominio, ninguna transición y ningún campo de estado.

**Plantilla de línea** `venta.línea(contexto, línea, pedido)`, con `contexto = {canal, cliente?, actor?}` y `línea = {variante, bodega, precio, cantidad, modalidad}`:
- Si `pedido = null` (todavía no ha nacido el pedido de esa propuesta) es la rama **primera**: `Lote[ Nacer:pedido{canal, cliente?, actor?}, Nacer:venta{pedido: @0, variante, bodega, precio}, Disparar:⟨hechos de la modalidad⟩{s: @1, q} … ]`.
- Si `pedido = ρ` (ya existe) es la rama **siguiente**: `Lote[ Nacer:venta{pedido: ρ, variante, bodega, precio}, Disparar:⟨hechos⟩{s: @0, q} … ]`. `canal`, `cliente` y `actor` **no** se repiten: viven en el pedido.
- Quién decide `primera` o `siguiente` es la **puerta**, leyendo la cabeza (spec de la puerta, T‑P8). El dominio solo ve un `Lote`.

| Modalidad (nombre del POS) | Hechos comprometidos | Efecto por `q` unidades | `D_prudente` | `D_no_asignada` |
|---|---|---|---|---|
| **`entregarAhora`** (entregar ahora) | `Vender · Asignar · Despachar` | `H −q`, `libre −q`, `desp +q` (`A` y `P` quedan igual) | −q | −q |
| **`apartar`** (apartar) | `Vender · Asignar` | `libre −q`, `A +q` | −q | −q |
| **`pedido`** (pedido) | `Vender` | `P +q` | −q | 0 |
| **`registrar`** (registrar) | `Vender.registro` | `pend⁰ +q` (no elegible, L15) | 0 | 0 |

- Las filas reproducen L12 compuesta y la tabla `PLANT` de las pruebas ya escritas por el verificador. `registrar` frente a `pedido` es un **hecho de elegibilidad** (L15); las tres lecturas de disponibilidad son preguntas, no eventos (Anexo «Reducción a un solo verbo»).
- **Botón principal del POS.** La modalidad que ofrece el botón principal es un parámetro de la puerta (valor inicial `entregarAhora`, que es «Registrar venta (descuenta stock)» de los principios del usuario). El texto del botón se **deriva de los hechos** de la plantilla (nombres de hechos como dato), no se escribe a mano. Las otras tres quedan como acciones secundarias. Los nombres de modalidad (`registrar` = solo anotar, sin tocar existencias) y el texto «Registrar venta» (= `entregarAhora`) pueden confundirse: la etiqueta visible de `registrar` es «Anotar venta (sin tocar stock)» (spec de la puerta §10).
- **Plantillas derivadas** (no son modalidades, mismo mecanismo): `pedido.cancelar(ρ)` = `Lote[Disparar:Cancelar{s} …]` para cada línea `s` en la fibra `venta.pedido = ρ` leída en la cabeza. Depende del estado de la cabeza, pero se compromete con `AppendIfHead` sobre esa misma cabeza (L8), así que la lectura y la admisión coinciden.

### D.4 La proyección del pedido y su total

**`hijos(ρ, τ, k, F)`** es una pregunta **genérica** (sin nombres de dominio en el código; los nombres entran como parámetros) que la fase 3 añade a su repertorio:

```
M    = producto( q_cat , sumaPorClave(movimientos) )                      grupo conmutativo ⇒ cualquier ventana en O(1) (fase 2, T7.2)
obs  = { sección: efectiva(ρ),
         hijos: F_{k,ρ} ∩ {x : tipo(x) = τ}  (fibra de q_cat, en orden de nacimiento),
         m: x ↦ { f ↦ m(f[x]) : f ∈ F }     para cada hijo x,
         suma: f ↦ Σ_x m(f[x]) }
```
- **El pedido** es `hijos(ρ, venta, pedido, F_venta)`, con `F_venta = {pend, pend⁰, asig, desp, cancel, porCobrar, cobrado, reembolsado, anulado}`. **La línea** `s` añade `hijos(s, devolución, venta, {sol, recibido})` para las devoluciones de `s`.
- Es `Section(pedido) + fibra(venta.pedido = ρ)` de la revisión, más el marcado de cada línea. No guarda nada nuevo: `q_cat` y el marcado ya son los materializados (L34).
- `obs` se calcula al leer con el estado `S_j`; no necesita ser congruente (E1.3). Los hijos de `ρ` no cambian de padre (VF4), así que leer `padre` en `S_j` es exacto para cualquier ventana.

**Total del pedido [T][V].** `total(ρ) = Σ_{s ∈ F_{pedido,ρ}} (porCobrar + cobrado + reembolsado + anulado)[s]`. Es **una pregunta de suma en ℤ** (grupo): su ventana `(i, j]` es la suma de los `Δ` de esas cuatro familias, y todas las demás transiciones se compensan dentro de las cuatro, de modo que **la ventana es el flujo de `Vender`** en el período (ventas por período). Las familias que suman son un parámetro de la pregunta (L31): `{porCobrar}` da lo pendiente de cobro; `{cobrado, reembolsado}`, lo cobrado.
*Demostración de que coincide con `Σ q·p`:* por VF13 (D.5), `p(s)·Q(s) = Σ$(s)`, donde `Q(s)` son todas las unidades vendidas de la línea. Sumando sobre las líneas: `total(ρ) = Σ_s p(s)·Q(s)`. ∎
[V] 30 trayectorias aleatorias (1.025 acciones admitidas, 925 rechazadas, 126 pedidos, canales POS/Web, liberación activada o no, todas las modalidades, devoluciones, cobros, cancelaciones): tras **cada** acción, `q_aud` vacía, `p·Q = Σ$` en cada línea y `total(ρ)` igual a la suma de `q·p` de las acciones `Vender` admitidas del pedido (`e2.mjs`). Con `fibra`: `fibra('pedido', ρ, 'venta')` devuelve exactamente las líneas de `ρ` (`e5.mjs`).

### D.5 Invariantes nuevas

Todas por L6: valen en `D_0` y se conservan por cada verbo admitido.

| Id | Invariante | Demostración |
|---|---|---|
| **VF11** Línea con pedido | `∀ s ∈ ent, tipo(s) = venta ⇒ padre(s) ∈ ent`, `tipo(padre(s)) = pedido`, y el pedido nació antes que `s` o en su mismo lote | Guardas (3) y (4) de `Nacer`; `pedido` es R e I (`Fijar` lo rechaza); `G^par` impide cambiar el `padre` con ventas existentes (`formaCambiaPadre`) |
| **VF12** Contexto único | `∀ s: venta`, la sección **propia** de `s` no contiene `canal` ni `cliente`; por tanto `canal(s) = canal(padre(s))` | `venta` no declara esas características (`característicaDesconocida`); `efectiva` hereda del padre (§5.2); `canal` es inmutable en el pedido |
| **VF13** Valor del pedido | `p(s)·(pend + pend⁰ + asig + desp + cancel + Σ_{d: s(d)=s}(sol + recibido))[s] = (porCobrar + cobrado + reembolsado + anulado)[s]` | VF8 más `p(s)·cancel[s] = anulado[s]`. Esta última se prueba por inducción: solo `Cancelar` toca ambas familias y las mueve en `X` y `p·X` (con `X = pend + pend⁰ + asig` en ese instante); ambas valen 0 en `D_0` y `p` es inmutable (VF4) |

- **VF13 como dato [P].** Se comprueba en `q_aud` añadiendo una forma lineal a `𝒩.auditoría` (como VF6–VF9). Es opcional y de coste cero: no cambia familias ni transiciones. Valor inicial: incluida.
- **Corolario [T].** Ninguna familia de la Red tiene índice de tipo `pedido`, así que **el pedido no interviene en ninguna guarda de cantidad** (la Red opera por línea, como decía la revisión). El pedido solo aporta contexto y agrupación.

**Lo que NO es invariante (L7) [V]:**

| No invariante | Contraejemplo |
|---|---|
| «Todo pedido tiene al menos una línea» | `Nacer:pedido` solo, por un actor con la capacidad, se compromete. Es una **convención de la plantilla** (el `Lote` es atómico), no de `T` |
| «Todas las líneas de un pedido tienen el mismo creador» | El propietario añade una línea al pedido de un cajero (`creador(venta) = propietario`, `dueño(venta) = cajero`) |
| «Todas las líneas de un pedido tienen la misma modalidad» | Cada línea es otro `Lote` con sus hechos |

### D.6 Por qué NO hace falta una restricción entre entidades

Una restricción entre entidades sería una guarda que lee **a la vez** secciones de varias entidades del mismo tipo (por ejemplo, de todas las líneas de una referencia). El único mecanismo así del dominio es `κ` (§5.2), y solo acopla por una clave. Hay cuatro propiedades que alguien podría querer imponer entre entidades; ninguna lo exige:

1. **Coherencia del contexto entre líneas** («todas las líneas de una venta tienen el mismo canal y cliente»). Se cumple **por construcción** (VF12): el contexto se guarda **una sola vez**, en el pedido, y las líneas lo heredan. No hay dos valores que mantener iguales. La alternativa (un atributo `referencia` repetido en cada línea más «`ref(s) = ref(s') ⇒ canal(s) = canal(s')`») cuantifica sobre **pares de entidades**: acoplaría todas las líneas de una referencia en una guarda de lectura amplia (L20), y las guardas de la Forma solo leen la sección del objetivo y la de su padre. [T]
2. **Existencia del contexto** («una línea cita un pedido que existe»). Es la guarda de referencia (3), ya presente y estable (`ent` solo crece).
3. **Pedido no vacío.** No es invariante (D.5). Un pedido sin líneas es un hecho inocuo: no mueve ningún depósito (VF5–VF9 siguen valiendo), no aparece en las preguntas que parten de las líneas, y quién puede crearlo lo dice la capacidad `Nacer:pedido` (L16). La plantilla lo evita al nacer en el mismo `Lote` que su primera línea.
4. **Quién puede añadir líneas a un pedido.** Es `alcancePropio` sobre `Nacer:venta` con `padre = pedido` (D.2). Es una guarda de admisión de una sola entidad más su padre.

**Prohibido 10 y L20 [T].** `Lote[Nacer:pedido, Nacer:venta, …]` vive en **un** ámbito (§2, Teorema 2.1). Si la Γ se partiera en `{Cat, Inv_w}` (§10), la línea de venta (que mueve el marcado de `Inv`) y el pedido (que es contexto comercial) seguirían en el ámbito que constituye las ventas; el pedido no exige un ámbito aparte.

### D.7 Lo que debe incorporar el verificador de la fase 3

1. **Modelo** (`kobalt/tests/modelos/dominio.modelo.mjs`):
   - `FORMA_INICIAL` según D.1: tipo `pedido`; `venta.padre = 'pedido'`, característica `venta.pedido`; quitar `venta.canal` y `venta.cliente`.
   - `CAPACIDADES.cajero` y `.vendedor` añaden `Nacer:pedido`; `ALCANCE.cajero` y `.vendedor` añaden `Nacer:venta` (D.2). `Nacer:pedido` **no** entra en ningún alcance.
   - `PLANTILLAS` y `plantillaVenta(nombre, valores, q)` pasan a `plantillaLínea(contexto, línea, pedido)` con la rama `primera` (`Nacer:pedido` en `@0`, venta en `@1`) y la rama `siguiente` (venta en `@0`, cita `pedido`). Los `{nacido: j}` cuentan nacimientos.
   - Añadir `hijos(ρ, τ, k, F)` (D.4) al repertorio de `PROYECCIONES`.
   - La Red `RED_INICIAL` **no cambia**. Opcional: VF13 como entrada de `auditoría` (forma lineal con coeficientes `p(s)` y `p(s(d))`, como VF8).
2. **Generador** (`dominio.comun.mjs`): en `proponerAleatoria` los valores de `Nacer:venta` ya no llevan `canal`; se elige el `contexto = {canal}` y, con probabilidad ~0,4, un pedido existente (`siguiente`). Los actores `caja` y `U1` necesitan las plantillas nuevas en `genesisActores`.
3. **Pruebas de leyes** (`dominio.leyes.test.mjs`): VF11, VF12 y VF13 comprobadas en **cada** estado intermedio, con `q_aud` vacía; la tabla de D.3 contra L12; `total(ρ)` = suma de `q·p` de los `Vender` admitidos del pedido; `fibra('pedido', ρ, 'venta')` = líneas de `ρ`.
4. **Pruebas dirigidas** (casos [V] de este anexo):
   - sin `Nacer:pedido` ⇒ `NO_AUTORIZADO`;
   - `Nacer:pedido` en el alcance del actor ⇒ `INADMISIBLE('ajeno')`;
   - `U1` añade una línea al pedido de `caja` ⇒ `ajeno`; el propietario sí puede y `dueño(línea) = caja`;
   - `Nacer:venta{…, canal}` ⇒ `característicaDesconocida`;
   - `Nacer:pedido` solo se compromete (pedido vacío);
   - lote de 12 líneas `entregarAhora` admitido y de 13 ⇒ `loteTamaño`;
   - liberación POS por el canal heredado del pedido (`H` baja a −1 en `POS`, `negativo:libre` en `Web`);
   - `G^par`: Forma con `venta.padre` sobre una `Γ` con ventas ⇒ `formaCambiaPadre`; añadir solo el tipo `pedido` ⇒ admitido.
5. **Oráculo de aceptación** (`dominio.aceptacion.mjs`): reescribir los escenarios del Anexo B que crean ventas (#13, #14, #15, #17, #21, #24, #26, #27, #32, F4–F7) con el lote `[Nacer:pedido{canal}, Nacer:venta{pedido: @0, …}, …]`; el `ID` de la venta pasa de `(i, 0)` a `(i, 1)` y las acciones citan `@1`. Efectos esperados idénticos. Añadir escenarios de segunda línea (`siguiente`) y de las cuatro modalidades.
6. **Mutantes** (`dominio.mutantes.mjs`): `dueño` que ignora el `padre`; `canal` sin `heredable` en `pedido`; alcance de `Nacer:venta` que ignora el `padre`; plantilla `siguiente` que repite `Nacer:pedido` (dos pedidos); `Nacer:pedido` aceptado bajo alcance (falla abierta).
7. **Revisión estática «dato, no código»:** el nombre `pedido` solo aparece en `inicial.mjs`; `hijos` recibe `τ`, `k` y `F` como parámetros.

### D.8 Precisiones a documentos previos (ninguna contradice una ley)

| Id | Documento | Precisión |
|---|---|---|
| P‑F | `REVISION_UI_Y_POS_V3.md` §7 («`cliente`, `canal` y `actor` como características de asignación»; «la Red no cambia») | `cliente` es referencia‑uno. «La Red no cambia» es cierto **si** `canal` y `cliente` se heredan por `padre`; con un atributo propio en cada línea, las expresiones `canal(args)` de la Red habrían tenido que leer el padre |
| P‑G | Anexo A (`venta`) | `venta` pierde `canal` y `cliente` y gana `pedido`; el `dueño` de una venta es el creador de su pedido |
| P‑H | Anexo B escenarios #13, #21, #26, #32, F4, F5, F7 | Se reescriben con `Nacer:pedido` y con los `ID` desplazados; los efectos esperados no cambian |
| P‑I | `REVISION_UI_Y_POS_V3.md` §2, Teorema 3 («`sid_i = 𝔇(ρ, i)` con `ρ` el `ID` del `pedido`») | El `ID` del pedido no se conoce antes del primer compromiso (es la posición de esa entrada, que depende de la cabeza). Los `sid` se derivan de una **referencia de propuesta** `ρ_p` distinta del `ID` del pedido (spec de la puerta, T‑P3) |
