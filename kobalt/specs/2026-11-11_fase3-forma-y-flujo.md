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
