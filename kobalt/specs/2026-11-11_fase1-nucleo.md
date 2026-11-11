# Spec · Fase 1 — Núcleo general (`secuencia`, `contrato`, `proyeccion`, `diferencia`)

**Fecha:** 2026‑11‑11 · **Autor:** agente matemático de Kobalt · **Estado:** borrador para el ciclo verificador → implementador.
**Tipo:** especificación matemática. No contiene código de producción.
**Destino del código:** `kobalt/src/nucleo/` (fase 1 de `kobalt/CONSOLIDACION_Y_PLAN.md`, Parte IV).

**Fuentes.**
- `kobalt/CONSOLIDACION_Y_PLAN.md`: documento rector (Parte I §1–§6, Parte II, Parte III §10–§13, Parte IV).
- `.claude/skills/kobalt-kernels/references/leyes.md` (L1–L31), `kernels.md` y `decisiones-abiertas.md`.
- Código original de KOB2 9.0.1 (`Frame`, `View.derive`, `Resolution`) y de Minimal Flat 1.0.0 (`varuint`), leído sin modificarlo.

**Specs previas.** `kobalt/specs/2026-11-11_catalogo-alta-importacion.md` (perfil general, borrador no aprobado) se usa solo como contexto. Esta spec no la contradice: todo lo que aquella pide a un núcleo (`sid`, `dep`, checkpoints, épocas, `AppendIfHead`, lectura estable) aparece aquí de forma genérica. [V: lectura de ambos documentos el 11‑nov‑2026]

**Etiquetas.** [T] teorema con demostración aquí · [V] verificado por ejecución (scripts en la carpeta temporal de la sesión, fuera del repositorio) · [D] doctrina o decisión de diseño de esta spec · [P] propuesta que requiere probeta · [L] límite.

**Regla de vocabulario [D].** El código de `kobalt/src/nucleo/` no contiene ninguna palabra de dominio: ni producto, ni variante, ni existencias, ni SKU, ni bodega, ni precio. En esta spec, esas palabras aparecen solo en ejemplos marcados (§2.3, §5.3, §10) y en §7.9, donde se demuestra que las fases 2a y 2b son **instancias** del núcleo. Revisión estática: `grep -niE 'producto|variante|stock|sku|bodega|precio|inventario|catálogo' kobalt/src/nucleo/` debe salir vacío.

**Supuestos prohibidos vigilados (§3 de `kobalt-kernels`).** La petición no contiene supuestos prohibidos. Esta spec cierra explícitamente estos riesgos:
- **Prohibido 9** («dos `put()` ordenados = transacción»): la materialidad debe ofrecer un *compare‑and‑append* atómico (§5.5).
- **Prohibido 12** (semántica de negocio en un kernel): regla de vocabulario anterior.
- **Prohibido 7** (resolver un `FORK` por heurística): el núcleo detecta y nunca resuelve (§5.4).
- **Prohibido 13** (archivo «cabeza» mutable en Drive con ETag): la interfaz no exige ninguna cabeza mutable remota (§5.5).
- **Prohibido 8** (escribir en una proyección): las proyecciones y los snapshots no tienen ruta de escritura hacia `Γ` (§7).
- **Prohibido 4** (guarda codificada como invariante de tipo): §6.3.

---

## 1. Pregunta

El núcleo responde preguntas **sobre trayectorias, contratos y diferencias**, nunca sobre el negocio. Las responde para cuatro tipos de cliente: las instancias de dominio (fases 2a, 2b y 7+), los flujos (fase 3), los adaptadores de materialidad (fases 4 y 6) y el verificador.

| `q` | Pregunta | Para quién |
|---|---|---|
| `q_cabeza(s)` | ¿Cuál es la cabeza `(n, h_n)` de la trayectoria `s`? | Constituyente, réplica, proyecciones |
| `q_admite(s, u, sid, a, deps)` | Sobre la cabeza actual, ¿se acepta `a` solicitada por `u`? Si no, ¿por qué? (`NO_AUTORIZADO`, `INADMISIBLE(motivo)`, `YA_COMPROMETIDO(i)`, `SELLADO`, `DEPENDENCIA_NO_VERIFICABLE`) | Constituyente; vista previa de la UI |
| `q_época(s)` | ¿Qué época `ε` y qué contrato `C_ε` rigen en la cabeza? ¿Bajo qué época se admitió el compromiso `i`? | Instancias, proyecciones, verificador |
| `q_sid(s, sid)` | ¿Está comprometida la solicitud `sid`? ¿En qué posición? | Diferencia (faltantes, importación), reintentos |
| `q_hash(s, k)` | ¿Cuál es `h_k` para `k ≤ n`? | Sincronización, dependencias, `FORK` |
| `q_continuidad(c, c')` | Dados dos checkpoints o dos copias de `s`: ¿`EXACTO`, `CADENA`, `FORK(c)`, `GÉNESIS_DISTINTA` o `SIN_EVIDENCIA`? | Réplica, proyecciones (L22) |
| `q_corte(σ)` | ¿Es `σ` causalmente cerrado? ¿Cuál es el mayor corte cerrado `≤ σ`? | Proyecciones multi‑trayectoria (L21) |
| `q_proy(Π, σ)` | ¿Cuánto vale `Π` en `σ`? ¿Se reutiliza, se actualiza o se reconstruye? | UI, instancias |
| `q_Δ(O, A)` | ¿Qué requiere el objetivo `O` que la actualidad `A` aún no reconoce? | Importar, faltantes, sincronizar, actualizar, adquirir (L30) |

---

## 2. Ámbitos (L20)

### 2.1 Clases de hechos del núcleo

El núcleo no conoce hechos de negocio. Para **cada** trayectoria `s` maneja estas clases de hechos:

| Id | Hecho | Quién lo lee o escribe |
|---|---|---|
| `h_Γ(s)` | La sucesión de entradas comprometidas y su cabeza `(n, h_n)` | `AppendIfHead`, `Incorporar` |
| `h_C(s)` | El contrato vigente `C_ε` (capacidades, regla, parámetros, constituyente) y la época `ε` | Admisión de toda acción; `FijarParámetro` |
| `h_sid(s)` | El mapa de solicitudes comprometidas `sid ↦ i` | Guarda de deduplicación de toda acción |
| `h_sello(s)` | Si `s` está sellada | Guarda de toda acción; `Sellar` |
| `h_D(s)` | El estado de dominio `D` (opaco para el núcleo) | Guardas y `T` de la instancia |

No son hechos, porque son reconstruibles (L27): proyecciones, snapshots, checkpoints guardados, el hash `h_k` por posición, las fibras y los índices. Tampoco lo son el **registro de reglas** (código identificado por versión, inmutable) ni el **almacén de material** `Q ↦ B` (Exacto).

### 2.2 Grafo de co‑acceso

| Operación | Lee atómicamente | Escribe |
|---|---|---|
| `AppendIfHead` sobre `s` con una acción de dominio | `h_Γ(s)` (cabeza), `h_C(s)` (`Authorized`, parámetros de guarda), `h_sid(s)`, `h_sello(s)`, `h_D(s)` (guarda de la instancia) | `h_Γ(s)`, `h_sid(s)`, `h_D(s)` |
| `AppendIfHead` sobre `s` con `FijarParámetro` | `h_Γ(s)`, `h_C(s)`, `h_sid(s)`, `h_sello(s)`, `h_D(s)` (guarda de parámetros de la instancia y, si cambia la regla, migración) | `h_Γ(s)`, `h_C(s)`, `h_sid(s)`, `h_D(s)` |
| `AppendIfHead` sobre `s` con `Sellar` | `h_Γ(s)`, `h_C(s)`, `h_sid(s)`, `h_sello(s)` | `h_Γ(s)`, `h_sello(s)`, `h_sid(s)` |
| Lectura estable de `Y` desde una guarda de `X` (§7.6) | nada de `Y` atómicamente: un predicado estable en un checkpoint de `Y` | — |

**Teorema 2.1 (una trayectoria por ámbito, con su contrato dentro) [T].** Para cada `s`, las clases `h_Γ(s), h_C(s), h_sid(s), h_sello(s), h_D(s)` forman **una** componente conexa del grafo de co‑acceso. Dos trayectorias distintas `s ≠ s'` no comparten arista.
*Demostración.* La primera fila de §2.2 conecta las cinco clases de `s`. Ninguna operación escribe en dos trayectorias, y las lecturas cruzadas son estables, así que no crean arista (Teorema 7.6). ∎

**Corolario 2.2 (el contrato vive en la misma trayectoria) [T].** Las acciones de contrato (`FijarParámetro`, `Sellar`) se comprometen en la **misma** `Γ_s` que las acciones de dominio que gobiernan. Esta es la lectura precisa de «la configuración es una trayectoria del propio contrato» (§11 del plan).
*Demostración.* Toda guarda de dominio lee `h_C(s)` atómicamente (`Authorized` y los parámetros). Por L20, `h_C(s)` y `h_D(s)` van en la misma trayectoria. ∎
*Contraejemplo de la alternativa.* Supongamos que el contrato está en otra trayectoria `Γ_{C(s)}`. Un propietario retira la capacidad de vender de `u` en la posición 7 de `Γ_{C(s)}`. Si la réplica de `s` todavía no la ha visto, admite una venta de `u` después. «El contrato vigente en la posición de la venta» no está definido, porque entre trayectorias solo hay orden parcial (L21). Con el contrato dentro de `Γ_s`, el orden es total y cada acción se evalúa exactamente bajo el contrato de su posición. [T]
*Variante abierta (L31).* Hay un caso en que un parámetro sí puede vivir en otro ámbito: cuando se acepta que una revocación tenga efecto **al ser observada** y no al comprometerse. Entonces el parámetro se lee de forma estable como «valor de `p` en la época `ε` de `Y`», con `dep` (Teorema 7.7). Es la fila «origen de parámetros» de §3.5. Su valor inicial es «propio».

### 2.3 Componentes en la v1 (solo como ilustración)

`Cat_O`, `Inv_W` y el ámbito local de cada nodo `Nodo_d` (§3.4) son trayectorias del mismo tipo. El núcleo no distingue entre ellas: solo cambia el valor de su regla y de sus parámetros (§7.9).

---

## 3. Contrato por ámbito

### 3.1 Forma del contrato (dato, no código)

El contrato de la época `ε` de la trayectoria `s` es un **valor** codificable en CV (§4.2):

```
C_ε = ( capacidades : u ↦ 𝒫(patrón de tipo),
        regla       : IdRegla,          -- selecciona T_r, G_r, Σ_r, migraciones y proyecciones del registro
        constituyente : u,              -- principal cuyo mecanismo constituye en s
        parámetros  : p ↦ valor CV )    -- total sobre dom Σ_r (por defecto, el valor inicial de Σ_r)
```

- Las **guardas** y `T` son código, pero se seleccionan por dato: `regla` elige el módulo y los parámetros eligen dentro de él (por ejemplo, qué guarda tiene una acción y por qué canal). Así `C_ε = (O_κ, guardas, T, parámetros)` queda dado como dato. [D]
- **Registro de reglas.** `IdRegla ↦ Regla` es inmutable por identificador. Una versión registrada nunca cambia de código, porque `Fold` de una trayectoria antigua debe reproducir los mismos estados (L4). El núcleo no puede imponerlo, así que se verifica con vectores de prueba por regla. [D][L] Identificar la regla por el `ContentId` de su código fuente sería la forma Exacta de hacerlo. [P]
- **Patrones de capacidad.** Son cadenas: un tipo exacto (`"FijarParámetro:nucleo.capacidades"`) o un prefijo terminado en `*` (`"FijarParámetro:*"`, `"*"`). `Authorized_{C_ε}(u, a) ⟺ ∃π ∈ capacidades(u): coincide(π, tipo(a))`. Para `FijarParámetro(m)` se exige la capacidad para **cada** `p ∈ dom m`. [D]

**Interfaz de una regla (lo que aporta una instancia; el núcleo no la implementa).**

| Componente | Firma | Obligación |
|---|---|---|
| `D_0` | estado de dominio inicial | — |
| `tipos` | conjunto de tipos de acción de dominio y validador de `args` (CV) | — |
| `G_r` | `(D, e, parámetros, Lect) → ok \| motivo` | Pura. `Lect` solo expone predicados estables declarados de otros ámbitos, en los checkpoints de `e.deps` |
| `T_r` | `(D, e, parámetros) → D'` | **Pura, determinista, sin reloj, sin azar y sin leer otros ámbitos.** Todo lo que necesite de fuera viaja en `args` |
| `Σ_r` | `p ↦ (dominio, valorInicial)` | `valorInicial ∈ dominio` |
| `G_r^par` | `(m, D, parámetros) → ok \| motivo` | Opcional. Guarda de dominio para cambios de parámetro (por defecto, `ok`) |
| `Migra_{r'→r}` | `D_{r'} → D_r` | Opcional. Debe conservar los predicados estables que declara `r'` |
| `Estables_r` | predicados `P(D)` declarados estables | Obligación de prueba: `P(S) ⇒ P(T(S,a))` para toda acción, **incluidas las de contrato** |
| `Π_r` | proyecciones (§7.1) | Congruencia si se declaran incrementales (L10) |
| `codD` | codificación CV de `D` | Para snapshots |

**Parámetros reservados del núcleo** (prefijo `nucleo.`, presentes en toda regla):

| `p` | Dominio | Valor inicial |
|---|---|---|
| `nucleo.capacidades` | mapa `u ↦ lista de patrones` | `{constituyente ↦ ["*"]}` |
| `nucleo.regla` | identificadores registrados | el de la génesis |
| `nucleo.constituyente` | principal | el de la génesis |
| `nucleo.derivación` | `{"kobalt:nucleo:1"}` | `"kobalt:nucleo:1"` |
| `nucleo.retenciónSids` | `ilimitada` \| `ventana(N)` | `ilimitada` |

### 3.2 Actores: quién solicita y quién constituye (L16)

| Papel | Qué hace | Qué **no** hace |
|---|---|---|
| **Solicitante** `u` | Expresa una solicitud `(u, sid, a, deps[, ε_esperada])`, desde cualquier interfaz, flujo o nodo | No escribe en `Γ` |
| **Constituyente** | Es el mecanismo que actúa por `C_ε.constituyente` y tiene acceso de escritura a la materialidad de `s`. Evalúa `Accept` sobre `S_n` y ejecuta `AppendIfHead` | No decide por orden de llegada ni por timestamp |
| **Configurador** | Es un **solicitante** cuyas capacidades incluyen `FijarParámetro:*` o `Sellar` | **No** constituye: su cambio de contrato lo compromete el constituyente, como cualquier otra acción |
| **Réplica** | Incorpora un sufijo **ya comprometido**, después de verificarlo (§5.3) | No constituye (L16). La API de réplica no ofrece `AppendIfHead` |
| **Proyector** | Lee `Γ` y produce `Π` con checkpoint | No tiene ruta de escritura en `Γ` (L27) |

- `Authorized_C(u, a)` lo da `C_ε.capacidades`. `Admissible_C(a, S)` lo dan las guardas del núcleo (§5.1) y las de la regla. `Accept = Authorized ∧ Admissible`. [D]
- `u` es una **afirmación** del solicitante, no una prueba de autoría (L23). En la v1, la autoridad material la da el control de acceso del almacenamiento. [L]
- Varias pestañas o procesos del mismo dispositivo son **varios mecanismos del mismo constituyente**. La exclusión entre ellos la da el compare‑and‑append de la materialidad (§5.5), no una cola. [D; realización P, fase 4]

### 3.3 Época

- `ε(Γ_n) := |{ i ≤ n : clase(a_i) = contrato }|`. La época **emerge** del orden de la trayectoria, igual que los slots en L28. En la génesis vale `0`. [T: definición; monotonía por L3]
- Cada entrada **registra** la época bajo la que se admitió: `e_i.ε = ε(Γ_{i−1})`. Para una acción de contrato, la época registrada es la anterior al cambio, y la nueva época empieza en la entrada siguiente. [D; consistencia T en V4]
- El registro es redundante respecto de `h_{i−1}` y se mantiene a propósito: cualquier lector lo verifica sin recorrer `Γ` desde la génesis, y las lecturas cruzadas citan `(StreamID, ε)`. [D]

**Teorema 3.1 (traspaso del constituyente sin solape) [T].** Supongamos que `FijarParámetro({nucleo.constituyente ↦ O'})` se compromete en la posición `k` de `s`. Entonces, en el orden de `Γ_s`, no hay dos constituyentes simultáneos.
*Demostración.*
- Para `i ≤ k`, constituye `O`. A partir de `k`, el mecanismo de `O` evalúa sobre `S_k`, donde el constituyente es `O'`, así que rechaza constituir (`NO_CONSTITUYENTE`).
- `O'` solo puede producir `h_{k+1} = 𝔇(T_P, h_k, …)` si conoce `h_k`, es decir, si ha incorporado `Γ_k`.
- Por lo tanto, todas las entradas `> k` las compromete `O'` y todas las `≤ k` las compromete `O`. ∎

*[L]:* si el mecanismo de `O` ignora su propio estado, por un error o por una copia antigua, se produce un `FORK` detectable (§5.4), pero no impedible por el núcleo.

### 3.4 Configuración del nodo: también es un contrato

Hay parámetros que **no** cambian ninguna respuesta, solo cuándo o cómo se calcula: la materialización de proyecciones, la frecuencia de snapshots, qué se verifica al abrir y qué hacer ante un `FORK`. No son hechos de `Cat` ni de `Inv`, y meterlos en su contrato crearía co‑acceso falso.

Por L31 tampoco merecen un mecanismo aparte: son los parámetros de la trayectoria local `Nodo_d`, con la regla `nucleo.nodo@1`. Esta regla no tiene acciones de dominio, solo parámetros. Cambiarlos es `FijarParámetro` en `Γ_{Nodo_d}` y abre una época de ese nodo. [D]

### 3.5 Espacio de configuración (L31): lo que la matemática abre, con su valor inicial

| Parámetro | Dónde vive | Posibilidades | Qué implica cada una | Valor inicial |
|---|---|---|---|---|
| `nucleo.derivación` | `C(s)` | Cualquier contrato `𝒟` con `𝔇` resistente a colisiones y `Enc` inyectivo | Se cambia por época: la entrada `i` se encadena con `𝒟_{ε_{i−1}}`, que el verificador conoce antes de leer `e_i` | `kobalt:nucleo:1` (§4.2) |
| `nucleo.retenciónSids` | `C(s)` | ilimitada / `ventana(N)` | La ventana rompe la deduplicación de reintentos más antiguos que `N` (contraejemplo en §4.3) | ilimitada |
| Origen de un parámetro | `C(s)` | propio / leído de `Y` en la época `ε_Y` con `dep` | Si es leído, la revocación tiene efecto al ser observada, no al comprometerse (Corolario 2.2) | propio |
| Reintentos tras `CABEZA_CAMBIADA` | `C(Nodo_d)` | `0..k` reevaluaciones automáticas | L8: reevaluar sobre la nueva cabeza siempre es correcto; solo cambia la latencia | 3, y después se devuelve `CABEZA_CAMBIADA` al solicitante |
| Verificación al abrir `s` | `C(Nodo_d)` | cadena completa desde la génesis / desde el último checkpoint verificado localmente | La segunda confía en la integridad local del checkpoint (§9) | completa |
| Verificación al incorporar | `C(Nodo_d)` | solo cadena / cadena + re‑admisión bajo `C_{ε_i}` | La re‑admisión detecta entradas que su propio contrato no admitía (§5.3) | cadena + re‑admisión |
| Ante un `FORK` | `C(Nodo_d)` | suspender constitución y leer hasta el prefijo común / seguir en la rama propia, marcada | En ambos casos no se elige rama por heurística (prohibido 7) | suspender |
| Materialización de proyecciones | `C(Nodo_d)` | bajo demanda / por notificación / anticipada | Es el mismo `Δ` (§7.8); solo cambia cuándo se invoca | bajo demanda |
| Frecuencia de snapshots | `C(Nodo_d)` | bajo demanda / cada `N` compromisos | L4: correctos con cualquier `N` | bajo demanda |

Además, los parámetros del dominio (κ, guardas por canal, valor por defecto…) los declara cada regla en su `Σ_r`, con los valores iniciales de §13 del plan. El núcleo no los conoce.

---

## 4. Estado `S`

### 4.1 Génesis, entrada y estado

```
g    = ( StreamID : 16 B opacos,  predecesor : (StreamID, n, h) | null,  C_0 )
e_i  = ( ε, u, sid, deps, clase ∈ {contrato, dominio}, tipo : texto, args : CV )
deps = lista de (StreamID, k, h_k), a lo sumo una por StreamID, ordenada por StreamID
S    = ( n, ε, C_ε, sellado : Bool, Sids : sid ⇀ posición, D )
```

- **StreamID** es una identidad **acuñada** una sola vez (16 B aleatorios, inyectados al crear). No se deriva del contenido, porque la identidad de un sujeto no es un hash (L26). Dos génesis distintas que afirman el mismo `StreamID` se detectan como `GÉNESIS_DISTINTA` (§5.4). [D]
- `predecesor` enlaza una trayectoria sucesora con el sello de la anterior. Sirve para cambios de trayectoria, como la migración L18. [D]
- `sid` son bytes opacos. Su derivación determinista la elige quien solicita (ver `DeriveSid` en §4.2). [D]
- `S_0 = (0, 0, C_0 completado con los valores iniciales de Σ_{r_0}, false, ∅, D_0^{r_0})`.

### 4.2 Contrato de derivación Exacto `kobalt:nucleo:1` [D, vectores V]

**Derivación** (idéntica a `KOB2.View.derive(clear, tag, partes)`; no modifica el kernel):

```
𝔇(tag, x_1, …, x_k) := SHA‑256( Frame([ "kobalt:clear:derive:3", tag, x_1, …, x_k ]) )
Frame([a_1…a_m])     := uint32be(m) ‖ ∏_j ( uint64be(|a_j|) ‖ a_j )                    (KOB2 Frame)
```

**Cadena** (dominios separados por etiqueta):

```
T_G = "kobalt:nucleo:genesis:1"   T_P = "kobalt:nucleo:paso:1"   T_S = "kobalt:nucleo:sid:1"   T_N = "kobalt:nucleo:snapshot:1"
h_0     = 𝔇(T_G, StreamID, CV(g))                       ≡ H(dom ‖ StreamID ‖ génesis) de leyes.md
h_i     = 𝔇(T_P, h_{i−1}, Enc(e_i))                     ≡ H(h_{i−1} ‖ Frame(Encode(a_i)))
Enc(e)  = CV([ε, u, sid, deps, clase, tipo, args])
DeriveSid(dom, v) = 𝔇(T_S, dom, CV(v))                  (ayuda opcional para sid deterministas)
```

**Codificación canónica de valores `CV`** (TLV con el `varuint` canónico de Minimal):

| Valor | Bytes |
|---|---|
| `null` / `false` / `true` | `00` / `01` / `02` |
| entero `x ≥ 0` (seguro, `≤ 2^53−1`) | `03 ‖ varuint(x)` |
| entero `x < 0` | `04 ‖ varuint(−x)`. `04 00` es inválido: no existe `−0` |
| bytes `B` | `05 ‖ varuint(|B|) ‖ B` |
| texto `t` | `06 ‖ varuint(|utf8(t)|) ‖ utf8(t)`. Exige `t` bien formado: se rechazan surrogates sueltos |
| lista `[v_1…v_k]` | `07 ‖ varuint(k) ‖ CV(v_1) ‖ … ‖ CV(v_k)` |
| mapa `{k_j ↦ v_j}` | `08 ‖ varuint(k) ‖ (CV(k_j) ‖ CV(v_j))…`, con claves de texto en orden **estrictamente creciente** por bytes de `utf8(k_j)` |

No hay números reales: un racional se representa como un par de enteros. [D]
El decodificador rechaza: etiquetas desconocidas, `varuint` no canónico (Minimal lo rechaza), `04 00`, UTF‑8 mal formado, claves desordenadas o repetidas, bytes truncados y bytes sobrantes.

**Teorema 4.1 (CV es canónico e inyectivo) [T][V].**
(a) Cada valor tiene una única codificación.
(b) `CV` es libre de prefijos e inyectivo.
(c) `Dec(CV(v)) = v`, y `Dec` rechaza todo lo que no sea imagen de `CV`.
*Demostración.*
- (a) La etiqueta, la forma del `varuint` y el orden de las claves están determinados por el valor.
- (b) Por inducción estructural. La etiqueta determina el tipo. Los `varuint` canónicos son libres de prefijos (el último byte tiene el bit alto a 0). Las longitudes son explícitas, y los hijos son libres de prefijos por hipótesis de inducción, así que la concatenación en listas y mapas se descompone de forma única.
- (c) Por construcción del decodificador. ∎

*[V]:* 20.000 valores aleatorios: ida y vuelta exacta y ninguna colisión entre valores distintos. Las 6 formas no canónicas se rechazaron, y el surrogate suelto también.

*Contraejemplos de las alternativas [V]:*
- `TextEncoder` codifica `"\uD800"` y `"�"` como `efbfbd`: dos acciones distintas, mismos bytes.
- `SHA256("ab"‖"c") = SHA256("a"‖"bc")`.
- `JSON.stringify({a:1,b:2}) ≠ JSON.stringify({b:2,a:1})`: no es canónico.
- `JSON.stringify(-0) = "0"`.

*Vectores de `𝔇` [V: calculados con `KOB2.View.derive` y con `node:crypto` sobre el Frame; coinciden]:*
- `𝔇(T_P, 0^32, ⟨⟩) = 708cffb32980e9da76d78f564db709a1c27e83298729bf5aa553a0fd879781a1`.
- `𝔇(T_G, 01^16, "g") = 341ecd83c6898c04bd4d72f811ef5e507c6bc5d97ab8f6d36d241b5b79bf6638`. Es un vector de `𝔇`, no de una génesis CV real. El verificador publica los vectores completos de génesis y entrada en la fase 1.

**Teorema 4.2 (la cabeza identifica el prefijo) [T bajo resistencia a colisiones de SHA‑256].** Si `h_n(Γ) = h_m(Γ')` en la misma `StreamID`, entonces `n = m` y `Γ_n = Γ'_m`, salvo que exista una colisión de SHA‑256.
*Demostración.* Por inducción descendente.
- Si `n, m ≥ 1`, la igualdad de salidas exige la igualdad de entradas (o hay una colisión). Por la inyectividad de `Frame`, eso da `h_{n−1} = h'_{m−1}` y `Enc(e_n) = Enc(e'_m)`, y por el Teorema 4.1 `e_n = e'_m`.
- Si se llega a `h_0 = h'_j` con `j ≥ 1`, una de las entradas empieza por `T_G` y la otra por `T_P`. Son entradas distintas, así que hay una colisión.

La separación de dominios entre la génesis y el paso es justo lo que impide confundir longitudes. ∎
*Corolario:* el checkpoint `(StreamID, n, h_n)` determina `Γ_n`, y por tanto `S_n`, `ε_n` y `C_{ε_n}`.

### 4.3 Minimalidad (cociente de Nerode respecto de §1)

| Componente | ¿Necesaria? | Testigo |
|---|---|---|
| `n` | Sí | `T` escribe `Sids[sid] := n+1`, así que `T` debe conocer `n` |
| `ε`, `C_ε` | Sí | Dos estados que solo difieren en `capacidades(u)` reaccionan distinto a una acción de `u` |
| `sellado` | Sí | Después de `Sellar`, toda acción es inadmisible |
| `Sids` | Sí | Dos estados que solo difieren en `sid₀ ∈ Sids` reaccionan distinto a una entrada con `sid₀`. La posición es necesaria para `q_sid` |
| `D` | La define la regla | Lo minimiza cada instancia respecto de sus preguntas (L10) |
| Historia de `C`, hashes `h_k`, proyecciones | **No** | Se recuperan de `Γ` con `Fold` (L4) o son proyecciones (L27) |

[T: cada testigo es un par de estados indistinguibles sin la componente y distinguibles por alguna acción o pregunta.]

*Contraejemplo de `ventana(N)`:* `sid₀` se compromete en la posición 1 y después hay `N` compromisos más. El reintento de `sid₀` vuelve a admitirse y el efecto se duplica. [T]

---

## 5. Acciones `A`

### 5.1 Guardas comunes del núcleo (sobre toda entrada `e`, en `S_n`)

| Id | Guarda | Motivo de rechazo |
|---|---|---|
| G0 | `¬sellado` | `SELLADO` |
| G1 | `Authorized_{C_ε}(e.u, e)` | `NO_AUTORIZADO` |
| G2 | `e.sid ∉ dom Sids` | `YA_COMPROMETIDO(Sids[e.sid])`. No es un fallo: el objetivo ya está reconocido (L30) |
| G3 | `e.ε = ε` y, si la solicitud trae `ε_esperada`, `ε_esperada = ε` | `ÉPOCA_CAMBIADA` |
| G4 | Para cada `(Y, k, h) ∈ e.deps`, el constituyente conoce `Γ_Y` hasta `k`, con `h_Y(k) = h` | `DEPENDENCIA_NO_VERIFICABLE` |
| G5 | `e` es decodificable (CV), `tipo` pertenece a la regla vigente y `args` pasa su validador | `INADMISIBLE(forma)` |

**Efecto común:** `n := n+1`, `Sids[e.sid] := n` (y, con ventana, se expulsa el más antiguo).
Ninguna de estas guardas es una invariante del tipo de estado (L7). Por ejemplo, «todo `u_i` de `Γ` tiene hoy capacidad» **no** es invariante (§6.3).

### 5.2 Acciones comprometidas (en `Γ_s`)

| Acción | Guarda `Admissible` (además de G0–G5) | Efecto `T` |
|---|---|---|
| **`FijarParámetro(m)`**, clase `contrato`, `m : p ↦ v` no vacío | Sea `r' = m[nucleo.regla]` si aparece en `m`, o `r` si no. Entonces: (i) `dom m ⊆ dom Σ_{r'}`; (ii) `∀p: m(p) ∈ dom Σ_{r'}(p)`; (iii) `∃p: m(p) ≠ parámetros(p)`, para no abrir épocas vacías; (iv) si `r' ≠ r`, existe `Migra_{r→r'}` registrada; (v) si `nucleo.capacidades ∈ dom m`, algún `u` conserva `FijarParámetro:nucleo.capacidades`; (vi) `G_{r'}^par(m, D, parámetros) = ok` | `ε := ε+1`. `parámetros := (valores iniciales de Σ_{r'}) ⊕ (parámetros vigentes restringidos a dom Σ_{r'}) ⊕ m`. Si `r' ≠ r`: `D := Migra_{r→r'}(D)` |
| **`Sellar(sucesor?)`**, clase `contrato` | — | `ε := ε+1`, `sellado := true` |
| **`a ∈ tipos(r_ε)`**, clase `dominio` | `G_{r_ε}(D, e, parámetros, Lect_{e.deps}) = ok` | `D := T_{r_ε}(D, e, parámetros)` |

Precisiones:
- `Authorized` para `FijarParámetro(m)` exige `FijarParámetro:p` para cada `p ∈ dom m`. Para `Sellar` exige `Sellar`. [D]
- La regla (v) impide el autobloqueo: la inmovilidad voluntaria se expresa con `Sellar`, que es explícita y estable. [D]
- `T_r` **no** recibe `Lect`. Las dependencias influyen solo en la admisión, nunca en el efecto. Así `Fold` de `s` no necesita ninguna otra trayectoria (L4, L27). [D; si se viola, la reconstrucción por ámbito deja de ser posible: T]
- **Fold.** `S_{i} = T(S_{i−1}, e_i)` con la regla y los parámetros de `C_{ε_{i−1}}`. `Fold` es autodescriptivo: la época de cada entrada se conoce antes de aplicarla. [T por V4]

### 5.3 Operaciones no comprometidas (API del núcleo; no son entradas de `Γ`)

| Operación | Guarda | Resultado |
|---|---|---|
| `Crear(g)` | `StreamID` nuevo en la materialidad | `h_0`, y la cabeza `(0, h_0)` |
| `AppendIfHead(s, (n,h), u, sid, a, deps[, ε_esperada])` | (1) el mecanismo actúa por `C_ε.constituyente` (si no, `NO_CONSTITUYENTE`); (2) `S_n` es el estado de `(n,h)`; (3) G0–G5 y la guarda de la tabla §5.2; (4) `anexarSiCabeza` de la materialidad con `(n,h)`, `Enc(e)` y `h_{n+1}` precalculado | `COMPROMETIDO(n+1, h_{n+1}, ε)` · `CABEZA_CAMBIADA(n', h')` · un rechazo de §5.1 o `INADMISIBLE(motivo)` |
| `Incorporar(s, (n,h), [b_{n+1}…b_m], (m, h_m))` | (1) la cabeza local es `(n,h)`; (2) al recomputar la cadena desde `h` se obtiene `h_m`; (3) `e_i.ε = ε(Γ_{i−1})` para todo `i`; (4) si está configurado, `Accept_{C_{ε_{i−1}}}(u_i, e_i, S_{i−1})` | `INCORPORADO(m, h_m)` · `DISCONTINUIDAD(i)` (no se aplica nada desde `i`) · `READMISIÓN_PENDIENTE(i, dep)` |
| `Verificar(s, desde = (k,h_k) \| génesis)` | — | `OK(n, h_n)` · `DISCONTINUIDAD(i)` |
| `Resolver(c, c')` (§5.4) | — | `EXACTO`, `CADENA`, `FORK(c)`, `GÉNESIS_DISTINTA` o `SIN_EVIDENCIA` |

- **L8 [T relativo a M1].** Dos `AppendIfHead` con la misma cabeza observada `(n,h)`: la materialidad linealiza sus `anexarSiCabeza`. El primero cambia la cabeza a `(n+1, ·)`, y el segundo ve una cabeza distinta y recibe `CABEZA_CAMBIADA`. Hay a lo sumo una entrada en la posición `n+1`, y fue admitida sobre `S_n`, que por el Teorema 4.2 es el estado de la cabeza comparada. ∎
- **Reevaluación.** Ante `CABEZA_CAMBIADA`, el constituyente reconstruye `S_{n'}` con L4 (snapshot + sufijo) y vuelve a evaluar la misma solicitud, con el mismo `sid`. Si entretanto se comprometió esa solicitud, G2 devuelve `YA_COMPROMETIDO`. [T]
- La re‑admisión al incorporar usa el contrato **de la época registrada** `C_{ε_{i−1}}`, nunca el actual. Contraejemplo: un cajero vende en la época 3 y en la época 5 se le retira la capacidad. Si se re‑admitiera con `C_5`, se rechazaría un compromiso legítimo. [T]
- Si una guarda de `e_i` tiene `deps` hacia `Y` y la réplica aún no tiene `Γ_Y` hasta `k`, la re‑admisión queda `READMISIÓN_PENDIENTE`. No es un fallo, y la cadena ya está verificada. [D]

### 5.4 Detección de divergencia (`FORK`) sin resolverla

Sean dos copias de `s`, con hashes por posición `h_0…h_n` y `h'_0…h'_{n'}`. Sea `c := max{ k : h_k = h'_k }`, o `−1` si las génesis difieren.

| Condición | Resultado |
|---|---|
| `c = −1` | `GÉNESIS_DISTINTA` (la misma `StreamID` con dos génesis) |
| `c = n = n'` | `EXACTO` |
| `c = min(n, n')` y `n ≠ n'` | `CADENA` (la corta es prefijo de la larga) |
| `c < min(n, n')` | `FORK(c, h_c)`, con las dos fronteras `e_{c+1}`, `e'_{c+1}` |
| Falta alguna entrada para recomputar | `SIN_EVIDENCIA`. Por L22, dos hashes distintos no prueban extensión |

- **Búsqueda binaria [T bajo CR].** Por el Teorema 4.2, `h_k = h'_k ⇒ ∀j ≤ k: h_j = h'_j`. El predicado es monótono, así que `c` se halla en `O(log min(n, n'))` comparaciones si ambas copias exponen `h_k`. [V: 300 pares aleatorios, búsqueda binaria = lineal, y clasificación correcta en todos]
- **Sin resolución [D].** El núcleo informa del `FORK` y no elige rama: ni por longitud, ni por timestamp, ni por quién llegó primero (prohibido 7, L16). El comportamiento del observador lo fija su nodo (§3.5). La salida legítima es una acción de autoridad. Por ejemplo, el propietario sella `s` y crea una sucesora con `predecesor = (s, c, h_c)` o con la rama que reconozca. Eso es una transición de contrato (L18), no una heurística.
- **El `FORK` emerge de `Δ`** (§7.8, instancia «sincronizar»). [T]

### 5.5 Interfaz mínima de materialidad (lo que el núcleo exige a IndexedDB o Drive)

El núcleo calcula todos los hashes y todas las decisiones. El adaptador **no interpreta bytes**.

| Operación | Contrato |
|---|---|
| `crear(StreamID, CV(g), h_0)` | Crea solo si no existe |
| `cabeza(StreamID) → (n, h_n)` | Lectura |
| `leer(StreamID, i, j) → [b_i…b_j]` | Lectura de entradas inmutables |
| `anexarSiCabeza(StreamID, (n,h_n), [b_{n+1}…b_m], (m,h_m)) → OK \| CONFLICTO(n', h')` | **Compare‑and‑append** |
| `guardar(clave, registro)` / `leerRegistro(clave)` | Para proyecciones, snapshots y checkpoints. Un registro es **una sola unidad** `(Y, checkpoint)` |

**Propiedades materiales requeridas:**
- **M1. Compare‑and‑append atómico y linealizable por `StreamID`** dentro del dominio de realización. O se escriben las entradas **y** la nueva cabeza, o no se escribe nada. Dos llamadas con la misma cabeza esperada no pueden tener éxito las dos.
- **M2.** Después de `OK`, las lecturas posteriores ven la nueva cabeza (leer las propias escrituras).
- **M3.** No hay operación de sobrescritura ni de borrado de entradas. Es la realización material de L3.
- **M4.** `guardar` de un registro es atómico (todo o nada). Es lo que permite conservar la proyección anterior válida si algo se interrumpe (L27). **No** se permiten dos `put()` ordenados para representar «proyección + checkpoint» (prohibido 9).
- **M5.** Lo que **no** se exige: durabilidad frente a la pérdida del dispositivo, exclusión entre dispositivos, firmas ni orden global. [L]

**Teorema 5.1 [T].** Con M1–M3, `AppendIfHead` cumple L8 y L3 dentro del dominio de realización de M1. Con M4, toda proyección leída es una proyección válida para su checkpoint. *Demostración:* la de L8 en §5.3. Para M4, el registro se lee completo o no se lee. ∎

**Realizaciones previstas:**
- **IndexedDB (fase 4).** Una única transacción `readwrite` sobre el almacén de entradas y el de cabezas: lee la cabeza, compara, escribe las entradas y escribe la cabeza. Como `h_{n+1}` se calcula **antes** de abrir la transacción, no hay `await` de WebCrypto dentro de ella. Una transacción IndexedDB se cierra sola si espera a una promesa ajena. [P: verificar en la probeta de la fase 4, también con dos pestañas]
- **Drive (fase 6).** No hay compare‑and‑swap ni ETag por archivo (prohibido 13). M1 solo podría realizarse con un identificador reservado por posición (`generateIds` + 409). Es un supuesto **por verificar** («Probeta 0 · Drive»). Mientras tanto, Drive solo sirve para irradiar (`Incorporar` en las réplicas), no para constituir. [P]

---

## 6. Invariantes `V_C`

Todas se demuestran por L6: valen en `S_0` y se conservan por toda entrada comprometida, sea por `AppendIfHead` o por `Incorporar` con verificación. En el paso inductivo se usan las guardas sin que estas sean invariantes.

### 6.1 Invariantes del núcleo (V1–V8)

**V1 Prefijo [T relativo a M3].** `Γ_n ⪯ Γ_{n+1}`. La API del núcleo solo ofrece `anexarSiCabeza` (M3), y `Incorporar` exige que la cabeza local sea el punto de partida. ∎

**V2 Cadena.** La cabeza guardada `(n, h_n)` cumple `h_n = 𝔇(T_P, h_{n−1}, Enc(e_n))`, con `h_0` el de la génesis.
*Demostración:* `AppendIfHead` calcula `h_{n+1}` a partir de la cabeza comparada, e `Incorporar` lo recomputa. Ninguna otra operación toca la cabeza. ∎ [T]

**V3 Unicidad de `sid` y mapa exacto.** Con retención ilimitada, `Sids = {sid_i ↦ i : i ≤ n}` y cada `sid` aparece a lo sumo una vez en `Γ`.
*Demostración:* G2 y el efecto común. ∎ [T]

**V4 Época emergente y registrada.** `ε_n = |{i ≤ n : clase(a_i) = contrato}|`, y `∀i ≤ n: e_i.ε = ε_{i−1}`.
*Demostración:* solo las acciones de contrato incrementan `ε` (§5.2), y G3 exige que el registro coincida. ∎ [T]

**V5 Parámetros bien tipados y totales.** `∀p ∈ dom Σ_{r_ε}: parámetros(p) ∈ dom Σ_{r_ε}(p)`.
*Demostración:* `S_0` completa con valores iniciales en su dominio (obligación de la regla). El efecto de `FijarParámetro` recompone sobre `Σ_{r'}` y la guarda (ii) tipa `m`. ∎ [T]

**V6 Configurador vivo.** `sellado ∨ ∃u: FijarParámetro:nucleo.capacidades ∈ capacidades(u)`.
*Demostración:* en `S_0`, el constituyente tiene `"*"`. Solo `FijarParámetro` sobre `nucleo.capacidades` puede cambiarlo, y la guarda (v) lo conserva. ∎ [T]

**V7 Sello estable y final.** `sellado_k ⇒ ∀m ≥ k: sellado_m ∧ Γ_m = Γ_k`.
*Demostración:* G0 rechaza toda entrada posterior, y ninguna acción pone `sellado := false`. ∎ [T]
Por tanto «`s` está sellada» es un **predicado estable**, legible desde otros ámbitos (§7.6).

**V8 Admisión histórica.** `∀i ≤ n: Accept_{C_{ε_{i−1}}}(u_i, e_i, S_{i−1})` se cumplió al constituir.
*Demostración:* `AppendIfHead` solo anexa tras evaluar `Accept` sobre `S_{i−1}` (Teorema 4.2). ∎ [T]
Para las entradas incorporadas es una **comprobación** (re‑admisión), no un hecho garantizado por el núcleo local. [L]

### 6.2 Invariantes de dominio (V9)

**V9 Invariantes de dominio relativas a época [T].** Sea `V_D` un predicado sobre `D`. Si `V_D(D_0)` y `V_D` se conserva por toda acción de dominio **bajo todo valor admisible de los parámetros** y por toda migración, entonces `V_D` es invariante de la instancia. Si solo se conserva bajo algunos valores, entonces es invariante **dentro de cada intervalo de épocas** que use esos valores y empiece en un estado con `V_D`, y no lo es de la instancia.
*Demostración:* por L6, porque `FijarParámetro` puede elegir cualquier valor de `Σ_r`. ∎
*Ejemplo (fase 2b).* «Una cantidad nunca es negativa» es invariante solo dentro de las épocas cuya guarda la exige. Por eso la representación admite negativos (`int32`, §12 del plan). Es L7 llevado a la configuración. [T]

### 6.3 Lo que **no** es invariante (L7)

- «Todo `u_i` de `Γ` tiene hoy capacidad para `a_i`»: una revocación posterior no invalida el pasado (V8 es relativa a la época registrada).
- «Toda dependencia `(Y,k,h)` de `Γ_X` es visible en este nodo»: una réplica puede tener `X` sin `Y` (§7.5).
- «La cabeza local es la cabeza global»: no hay ahora global; solo hay cortes.
- Cualquier guarda de dominio cuya selección dependa de un parámetro (V9).

Prueba de mutación asociada: si se codifica una guarda en el constructor del estado (por ejemplo, que `S` rechace `capacidades` sin el autor de entradas pasadas), deben fallar las pruebas de alcanzabilidad.

---

## 7. Proyecciones `Π_q`

### 7.1 Forma de una proyección

`Π = (id, ver, π : S → Y, [init, g_a : Y → Y], sensibleAÉpoca, sensibleATiempo)`.

- **Oráculo:** `Π(σ) := π(Fold(S_0, Γ_σ))`. Siempre está disponible (L9).
- **Incremental** solo si existe `g` con `π ∘ T_a = g_a ∘ π` para toda `a` que pueda aparecer en el sufijo. Por L10, eso equivale a que `ker π` sea una congruencia. Las acciones de contrato están incluidas: si `π` lee parámetros y no es congruente para `FijarParámetro`, se declara `sensibleAÉpoca` y se reconstruye al cruzar una época. [T]
- `sensibleATiempo`: `π` depende de un `t_ref`. Entonces el checkpoint incluye `t_ref` (L15).

*Contraejemplo de sensibilidad a época [T][V].* Sea `π(D, parámetros) = [D(i) si i ∈ dom D, si no defecto]_{i ≤ N}`.
- `s₁ = {1 ↦ 0}` y `s₂ = {}`, ambos con `defecto = 0`, tienen la misma `π = [0]`.
- Tras `FijarParámetro(defecto ↦ desconocido)` dan `[0]` y `[desconocido]`.

No es congruente. El refinamiento de Nerode `Y' = (valores, máscara de explícitos)` sí lo es.

### 7.2 Snapshots

- Un snapshot es `(S_n, n, h_n, ε_n, ver(codD), Q)`, con `Q = 𝔇(T_N, CV(S_n))`.
- **No es otra fuente de verdad** (L4): `Fold(S_0, Γ_m) = Fold(S_n, Γ_{n+1:m})`. [T]
- Solo se usa si `h_n` coincide con el hash en la posición `n` de la `Γ` local verificada.
- `Q` detecta corrupción accidental de los bytes, **no** un `S_n` mal calculado. [L]

### 7.3 Checkpoint

```
Checkpoint de una trayectoria :  (StreamID, n, h_n, ver(Π), ε_n [, t_ref])
Checkpoint multi‑trayectoria  :  ( {(StreamID_i, n_i, h_i, ε_i)}_i ,  ver(Π) [, t_ref] )      con {…} causalmente cerrado (L21)
```

- `ver(Π)` es la **versión de la regla de proyección**. La regla de `T` ya está determinada por `(StreamID, n, h_n)`, que fija `C_{ε_n}` (Teorema 4.2). [D: precisión de «versiónRegla» del plan]
- `ε_n` es redundante respecto de `h_n` y se guarda como comprobación barata. Un checkpoint con `ε_n ≠ ε(Γ_n)` es inválido. [T]

### 7.4 Resolución: reutilizar, actualizar o reconstruir

Partimos de una proyección guardada con checkpoint `c = (s, n_c, h_c, v_c, ε_c, t_c)` y un corte pedido `(s, m, h_m)`, con la versión `v` y el tiempo `t`.

| Caso | Acción |
|---|---|
| `v_c ≠ v`; o `t_c ≠ t` y `sensibleATiempo` | RECONSTRUIR |
| `h_c ≠ h(n_c)` en la `Γ` local, o `n_c > n_local` | DISCONTINUIDAD: no se aplican deltas (L22); se RECONSTRUYE desde `Γ` y se informa |
| `n_c > m` | La proyección está adelantada al corte pedido. Como `T` no tiene inversa, se RECONSTRUYE en `m` desde el snapshot `≤ m` |
| `n_c = m` y `h_c = h_m` | REUTILIZAR |
| `n_c < m`, `Π` incremental y (sin acción de contrato en `Γ_{n_c+1:m}` **o** `¬sensibleAÉpoca`) | ACTUALIZAR con `g` sobre `Γ_{n_c+1:m}`, verificando la cadena |
| En otro caso | RECONSTRUIR desde el mayor snapshot válido `≤ m` |

**Teorema 7.1 (corrección de la resolución) [T].** En todos los casos, el resultado es `π(Fold(S_0, Γ_m))`.
*Demostración.*
- REUTILIZAR: por el Teorema 4.2, `h_c = h_m` implica el mismo prefijo.
- ACTUALIZAR: por L9 y L10 (las `g_a` existen para todas las acciones del sufijo).
- RECONSTRUIR: por L4. ∎

La resolución es la instancia «actualizar» de `Δ` (§7.8): `Δ = ∅` ⇒ reutilizar; `Δ` = sufijo ⇒ actualizar; `Δ` = todo ⇒ reconstruir. [T]

### 7.5 Cortes causalmente cerrados (L21)

- `σ : StreamID ⇀ (n, h)`.
- **Cerrado** ⟺ `∀X ∈ dom σ, ∀i ≤ σ_X.n, ∀(Y, k, h) ∈ deps(e_{X,i})`: `Y ∈ dom σ`, `σ_Y.n ≥ k` y `h_Y(k) = h`.
- Si la última condición falla, el resultado es `DIVERGENCIA_DEP(X, i, Y)`: lo que `X` leyó no es lo que este nodo tiene de `Y`, así que hay un `FORK` o una corrupción. Se informa y no se compone.

**Teorema 7.2 (retículo de cortes cerrados) [T][V].** Fijadas las trayectorias, los cortes cerrados son cerrados bajo máximo y mínimo componente a componente. Por tanto, para todo `σ` existe el **mayor corte cerrado** `σ* ≤ σ`.
*Demostración.*
- Máximo: si `e` está en `max(σ¹, σ²)_X`, está en el `σ^j` que realiza el máximo, y sus dependencias están en `σ^j ≤ max`.
- Mínimo: si `e` está en ambos, sus dependencias están en ambos, y por tanto en el mínimo.
- `σ*` es el máximo de todos los cortes cerrados `≤ σ`, un conjunto finito y no vacío porque el corte vacío es cerrado. ∎

**Algoritmo de cierre [T][V].** Repetir hasta que no haya cambios: para cada `X`, truncar `σ_X` justo antes de la primera entrada con una dependencia no satisfecha en el `σ` actual.
- Cada truncamiento es forzoso: todo corte cerrado `≤ σ` excluye esa entrada. Por eso se conserva el invariante «todo cerrado `≤ σ` es `≤ actual»`.
- Termina porque `Σ n_X` decrece.
- Al terminar, el corte es cerrado y es el mayor.

[V: 3.000 grafos aleatorios de 3 trayectorias. El algoritmo da un corte cerrado y ningún corte cerrado lo supera, y máximo y mínimo de cerrados son cerrados (0 fallos).]

**Proyecciones multi‑trayectoria [T].** Si `π(S_1, …, S_k) = φ(π_1(S_1), …, π_k(S_k))`, es decir, `R_σ = Compose(Interpret_{C_i}(Γ_{i,σ_i}))`, el resultado depende solo de los estados finales por trayectoria. Por tanto es **independiente del entrelazado** con que se apliquen los sufijos, siempre que se respete el orden causal para que cada `π_i` pueda interpretar sus `deps`.
- Actualizar consiste en aplicar cada `g^{(i)}` a su componente y recomponer `φ`.
- `Compose` es un **coproducto** (L25): cada hecho conserva su `StreamID`. Dos trayectorias que aporten el mismo hecho (según la clave de hecho que declare la regla) producen `CONFLICTO`, no un valor.

### 7.6 Lectura estable entre ámbitos (§4 del plan)

`LeerEstable(Y, k, P)` devuelve `P(Fold(Γ_Y[..k]))` y la dependencia `(Y, k, h_Y(k))`, que el solicitante pone en `e.deps`. `P` debe pertenecer a `Estables_{r_Y}`.

**Teorema 7.6 [T].** Si `P` es estable (`P(S) ⇒ P(T(S,a))` para toda acción de `Y`, incluidas las de contrato y las migraciones) y `P` vale en `k`, entonces `P` vale en `σ_Y` para todo corte cerrado `σ` que contenga a `e`.
*Demostración.* Por cierre, `σ_Y.n ≥ k`. Por L4, `Fold(Γ_Y[..σ_Y]) = Fold(Fold(Γ_Y[..k]), Γ_Y[k+1..σ_Y])`, y por inducción sobre el sufijo, `P` se conserva. ∎
*Consecuencia:* leer `P` no crea arista de co‑acceso (Teorema 2.1).

**Teorema 7.7 (predicados estables que da el núcleo) [T].**
(a) «`Y` está sellada» (V7).
(b) «En la época `ε`, el parámetro `p` de `Y` valía `v`» (una época cerrada no cambia; si `ε` aún no ha empezado, el predicado es falso y no se usa).
(c) «`sid ∈ dom Sids_Y`» con retención ilimitada (V3; **no** es estable con ventana).
(d) «`n_Y ≥ k`».
Las reglas añaden los suyos, por ejemplo «la posición `i` existe en `T`» (fase 2a).
*Contraejemplo:* «`ε` es la época vigente de `Y`» **no** es estable, porque `FijarParámetro` la invalida. [T]

*Obligación de las migraciones.* `Migra_{r→r'}` debe conservar todos los predicados de `Estables_r`. Si no, los cortes cerrados existentes pierden validez. Un `T` reordenado es el contraejemplo de L29.

### 7.7 Proyecciones propias del núcleo

| `Π` | Fórmula | Incremental | Checkpoint |
|---|---|---|---|
| `Π_cabeza` | `(n, h_n)` | `g_e(n, h) = (n+1, 𝔇(T_P, h, Enc(e)))`. Es congruente: depende solo de `(n, h)` y de `e` | `(s, n, h_n, ver, ε_n)` |
| `Π_hashes` | `[h_0…h_n]` | Añadir `h_{n+1}`. Congruente | ídem |
| `Π_época` | `(ε, C_ε)` | Es la componente de `S`, por tanto congruente (`π` es una proyección de coordenadas) | ídem |
| `Π_sid` | `Sids` | Congruente | ídem |
| `Π_admite(u, sid, a, deps)` | G0–G5 y la guarda de la regla sobre `S_n` | No se mantiene: se evalúa sobre `S_n` | ídem |

### 7.8 La diferencia `Δ(objetivo, actualidad)` (L30)

**Definición.** Una instancia de diferencia es una terna `(U, id, rec)`:
- `U` es el universo de requisitos;
- `id : U → I` es la identidad;
- `rec(o, A)` dice si la actualidad `A` reconoce el requisito `o`. Siempre incluye el reconocimiento por identidad `rec_id(o, A) ⟺ id(o) ∈ Reconocidos(A)`, y opcionalmente un reconocimiento por efecto `rec_val`, que aporta la regla.

Dado un objetivo finito `O ⊆ U`:

```
Conflictos(O) = { ι : ∃o ≠ o' ∈ O, id(o) = id(o') = ι }           (misma identidad, distinto requisito)
Δ(O, A)       = { o ∈ O : id(o) ∉ Conflictos(O) ∧ ¬rec(o, A) }
Exceso(O, A)  = Reconocidos(A) ∖ id(O)
```

`Δ` es **pura**: no escribe nada. Actuar sobre `Δ` pasa siempre por una operación con guarda: `AppendIfHead`, `Incorporar` o `put` por `Q`. El núcleo **nunca** actúa sobre `Exceso`: no hay borrado implícito. Lo usa solo la resolución de proyecciones, para reconstruir cuando hay exceso.

**Teorema 7.8 (propiedades de `Δ`) [T].**
- **(Δ1) Idempotencia del cálculo.** `Δ(Δ(O, A), A) = Δ(O, A)`. `Δ(O, A)` no contiene identidades en conflicto, así que aplicarla de nuevo solo vuelve a filtrar por `rec`, que ya se cumple.
- **(Δ2) Objetivo reconocido ⇒ vacío.** `(∀o ∈ O: rec(o, A)) ⇒ Δ(O, A) = ∅`.
- **(Δ3) Antitonía.** Si `rec` es monótona en `A` (`A ⪯ A' ⇒ rec(o, A) ⇒ rec(o, A')`), entonces `Δ(O, A') ⊆ Δ(O, A)`. `rec_id` sobre `Sids` es monótona por L3 y V3 con retención ilimitada. `rec_val` **no** lo es en general: si alguien revierte un valor, el requisito vuelve a aparecer. Es correcto, porque la diferencia se calcula contra la actualidad.
- **(Δ4) Reintento seguro.** Si toda aplicación de `o ∈ Δ` pasa por `AppendIfHead` con `sid = id(o)`, reaplicar un `Δ` antiguo, o el mismo dos veces, no produce doble efecto: la segunda vez G2 devuelve `YA_COMPROMETIDO`. *Demostración:* V3.
- **(Δ5) Reanudación.** Supongamos que tras aplicar un subconjunto `Q ⊆ Δ(O, A)` se recalcula en `A' ⪰ A ∪ Q`. Si solo se usa `rec_id`, entonces `Δ(O, A') = Δ(O, A) ∖ Q`, módulo compromisos de terceros con los mismos `sid`. Interrumpir y reanudar equivale a no interrumpir.
- **(Δ6) Unión por identidad (L13).** El objetivo de varios nodos es `O_B ∪ O_C` deduplicado por `id`. Un requisito con la misma identidad cuenta una sola vez, y nunca se combinan conteos con `min`. ∎

*Hipótesis que hay que nombrar (condición de compatibilidad del principio de parsimonia).*
- (H1) **`id` determinista:** el mismo requisito produce la misma `id` en todas las ejecuciones.
- (H2) **Aplicación con guarda de identidad** (G2) o con efecto absoluto.

*Contraejemplo de H1 [T]:* un `sid` aleatorio en cada intento, con una acción relativa, duplica el efecto. Es el caso C3 de la spec previa (un archivo reexportado con otros bytes da otro `sid`).

**Las cinco instancias, sin código propio en el núcleo [T: cada fila es una elección de `(U, id, rec)`; la función `Δ` es la misma].**

| Instancia | `U` y `O` | `id` | `rec` | Aplicar | Dónde viven `(U, id, rec)` |
|---|---|---|---|---|---|
| **Importar** (fase 3) | Solicitudes derivadas del archivo interpretado | `sid` determinista (`DeriveSid` sobre el archivo y la fila) | `rec_id` en `Sids` del ámbito destino, `∨ rec_val` (efecto ya presente; con «tres vías», también igual a la base de la última importación de la fuente) | `AppendIfHead` en el ámbito destino | Flujo `importar` + reglas |
| **Faltantes** (fase 3) | Componentes de un propósito, cada uno con su `sid` | `sid` | `rec_id` en el corte | Ninguna: es una proyección para la UI | Flujo `alta` |
| **Sincronizar** (núcleo) | Posiciones de la copia remota: `{(k, h'_k)}_{k ≤ n'}` | `(k, h'_k)` | `k ≤ n ∧ h_k = h'_k` | `Incorporar` | `secuencia` (datos, no código de diferencia) |
| **Actualizar proyección** (núcleo) | Posiciones `1..m` del corte pedido | `(k, h_k, ver(Π), t_ref)` | `k ≤ n_c ∧ h_c = h(n_c) ∧ ver = v_c ∧ t = t_c` | `g` o reconstruir | `proyeccion` |
| **Adquirir material** (fase 4) | `Required(Want)`, la clausura de dependencias | `Q` | El material local `B` cumple `ContentId(B) = Q` al verificarse | `fetch` + verificar + `put(Q)`, idempotente por `Q` | Adaptador de material |

**Corolario 7.9 (el `FORK` emerge de `Δ`) [T].** En la instancia «sincronizar», `Δ` contiene una posición `k ≤ n` (una que ya está ocupada localmente) si y solo si las copias divergen. Si la local es prefijo, `Δ = {n+1..n'}`, un sufijo contiguo (L22). *Demostración:* por el Teorema 4.2, `rec` es cerrada hacia abajo en `k`. ∎
`Incorporar` sobre un `Δ` con divergencia falla por cabeza, así que nunca se aplica. [T]

**Corolario 7.10 (resolución = Δ) [T].** En «actualizar proyección», `Δ = ∅ ∧ Exceso = ∅` ⇒ reutilizar; `Δ = {n_c+1..m}` ⇒ actualizar; `Exceso ≠ ∅` o `rec ≡ falso` ⇒ reconstruir. Coincide con la tabla de §7.4.

*Optimización permitida [D].* Cuando `rec` es cerrada hacia abajo sobre un orden (sincronizar, actualizar), `Δ` se puede calcular buscando la frontera, con búsqueda binaria (§5.4), en vez de recorrer `U`. Es la misma función. El verificador la compara con el recorrido completo.

### 7.9 Suficiencia del núcleo: las fases 2a y 2b son instancias de contrato

> Aquí, y solo aquí, aparecen palabras de dominio.

**Teorema 7.11 (cierre por instancias) [T relativo a la interfaz de §3.1].** Las funciones del núcleo son paramétricas en `Regla`: no leen `tipo` ni `args` salvo para pasarlos a `G_r` y `T_r`. Por lo tanto, añadir una regla registrada no modifica el núcleo. Las fases 2a y 2b solo necesitan los mecanismos de esta tabla, y todos existen en esta spec:

| Necesidad de 2a/2b | Mecanismo del núcleo |
|---|---|
| Acciones `CrearProducto`, `FijarAtributo`, `Vender`… | `tipos(r)`, `G_r`, `T_r` |
| Clave de reconocimiento `κ`, guardas por canal, valor por defecto | Parámetros `Σ_r` con valor inicial (§13 del plan) + `G_r^par` |
| Propietario y cajero | `nucleo.capacidades` |
| Unicidad de `κ` | `G_{cat}` sobre la fibra `F_{κ,v}` de `D_Cat` (en el mismo ámbito, L20) |
| `i ∈ T` desde `Inv` | `LeerEstable(Cat, k, «i existe»)` + `deps` (Teorema 7.6) |
| Ventas sin doble efecto | `sid` + G2 (V3) |
| Importar dos veces = 0 compromisos | `Δ` (Teorema 7.8) |
| Vista de existencias, ficha, filtros | `Π` multi‑trayectoria sobre cortes cerrados |

**L28 como proyección (fase 2a).**
- `Π_coord(D_Cat) = T`, con `g_a(T) = T ‖ crea(a)`.
- Es congruente, porque depende solo de `T` y de `a`. [T]
- `slot(e)` es la posición en `T`. La identidad es `(StreamID(Cat_O), slot)`: la identidad de tabla **es** el `StreamID` del catálogo, acuñado en su génesis (L25).
- El núcleo **no** tiene generador de identificadores. Ofrece posiciones `n` y `Sids`. Antes de comprometer, el solicitante designa las variantes que crea por `(sid, j)` (su índice dentro de la acción). Después, `Sids[sid] = n` y `Π_coord` traducen `(sid, j) ↦ slot`.
- Una alta rechazada no consume coordenada, porque no hay entrada. [T]

**L29 como contrato de completitud (fase 2b).**
- `Flat_W(σ) = (TableIdentity = StreamID(Cat), Values, σ)`, con `Values[i] = D_Inv(i)` si es explícito y `defecto_{ε_W}` si no, para `i ≤ |T_{σ_Cat}|`.
- `σ ⊇ {Cat, Inv_W}` es cerrado.
- `defecto` es un parámetro de `Σ_{inv}` con valor inicial `0`.

| Acción en el sufijo | ¿Congruente? | Por qué |
|---|---|---|
| De `Cat` | Sí | Se extiende con `defecto`; depende solo de `|T|` |
| De dominio de `Inv` | Sí | Actualiza la posición `i` |
| `FijarParámetro(defecto)` de `Inv` | **No** | Contraejemplo de §7.1. Se declara `sensibleAÉpoca` o se refina `Y` con la máscara de explícitos |

- El alta en `Cat` no requiere ninguna entrada en `Inv`: es el Teorema 3 del plan, ahora como consecuencia de `Π` y no de un mecanismo. [T]
- Un `T` que no extiende al anterior viola `Estables_{cat}` («la posición `i` designa siempre la misma variante»). Ninguna `Migra` que lo reordene es registrable. [T]

**Riesgos para la métrica «el núcleo no cambia en las fases 2–7» y su absorción:**
- **Firmas (L23, fases 6/7).** Pueden añadirse como **atestaciones externas** sobre `h_n`, guardadas junto a la entrada y fuera de la cadena, o cambiando `nucleo.derivación` en una época nueva. Ninguna de las dos modifica el código existente del núcleo. [P]
- **Cuotas (L19).** Son trayectorias por dispositivo con guarda local: es una regla, no un cambio del núcleo. [T por L19]
- **Pruebas Merkle de consistencia (RFC 9162).** Serían una proyección adicional sobre `Π_hashes`. [P]

---

## 8. Leyes aplicables (para `kobalt-verificador`)

**Oráculo:** modelo literal de §4–§7 (`Fold`, `Accept` y `Π` por reconstrucción).
**Generador:** reglas de juguete **sin dominio**. Por ejemplo, la regla `contador@1`, con las acciones `sumar(k)` y `fijar(k)`, una guarda parametrizada `límite ∈ {ninguno, ≥0}` y un parámetro `defecto`. Incluye `FijarParámetro`, `Sellar`, solicitantes sin capacidad, `sid` repetidos, `deps` hacia una segunda trayectoria, y acciones rechazadas intercaladas. Se usa la semilla `KOBALT_SEED`. El generador debe producir los tres tipos de rechazo, más `YA_COMPROMETIDO` y `ÉPOCA_CAMBIADA`.

| Ley | Cómo se verifica |
|---|---|
| **L3** | La API de `secuencia` y la del adaptador no exponen sobrescritura ni borrado (revisión estática + prueba). Tras cualquier secuencia, `Γ_n ⪯ Γ_{n+1}`. Mutante «editar `e_i`» ⇒ `Verificar` devuelve `DISCONTINUIDAD(i)` |
| **L4** | `∀n ≤ m`: `Fold(Fold(S_0, Γ_n), Γ_{n+1:m}) = Fold(S_0, Γ_m)`, también cruzando épocas y cambios de regla con `Migra`. Snapshot restaurado + sufijo = `Fold` completo. Un snapshot con `h_n` que no coincide no se usa |
| **L5** | En la regla de juguete, `D` sube y baja mientras `Γ` solo crece |
| **L6 / V1–V9** | Comprobar V1–V8 en **cada** estado intermedio de cada trayectoria generada. V9: `«contador ≥ 0»` vale dentro de las épocas con `límite = ≥0` y **falla** como invariante de la instancia (caso dirigido) |
| **L7** | Caso dirigido: el actor `u` comete en la época 1, pierde la capacidad en la época 2, y la re‑admisión con `C_{ε_i}` acepta su entrada antigua. Mutante «re‑admitir con el contrato actual» ⇒ falla. Mutante «aserción en el constructor de `S`» ⇒ falla la alcanzabilidad |
| **L8** | Dos `AppendIfHead` con la misma cabeza observada (y dos instancias del adaptador en memoria sobre el mismo almacén): exactamente uno `COMPROMETIDO`, el otro `CABEZA_CAMBIADA`. Tras reevaluar, la misma solicitud con el mismo `sid` da `YA_COMPROMETIDO`. Mutante «ignorar la cabeza» o «comparar solo `n`» con dos copias distintas ⇒ falla. Mutante «dos `put` sin transacción» en el adaptador en memoria con intercalado forzado ⇒ dos sucesores |
| **L9** | Para cada `Π` incremental de §7.7 y de la regla de juguete: `∀` checkpoint `n`, `Resolver` = oráculo en todo corte, incluidos los cortes que cruzan `FijarParámetro` |
| **L10** | Búsqueda exhaustiva en universos pequeños: las proyecciones de §7.7 son congruentes. El contraejemplo de §7.1 (`defecto`) se **detecta** como no congruente para `FijarParámetro`, y su refinamiento con máscara pasa |
| **L13** | `Δ` sobre `O_B ∪ O_C` con requisitos de la misma identidad: un solo compromiso. Dos requisitos con la misma `id` y distinto contenido ⇒ `Conflictos`, y ninguno se aplica |
| **L15** | Una `Π` `sensibleATiempo` con `t_ref` distinto no se reutiliza. El checkpoint incluye `t_ref` |
| **L16** | Un solicitante sin capacidad ⇒ `NO_AUTORIZADO`. Un mecanismo que no es `constituyente` ⇒ `NO_CONSTITUYENTE`. La API de réplica no tiene `AppendIfHead`. `Incorporar` no cambia `Sids` de forma distinta a como lo dejó el constituyente (mismo `S` que el `Fold` del constituyente). Teorema 3.1: tras el traspaso, el antiguo constituyente es rechazado |
| **L17** | El mismo `Γ` en el adaptador en memoria y en uno serializado a bytes da los mismos `S` y `Π`: la materialidad no cambia la respuesta |
| **L20** | Revisión: `T_r` no recibe `Lect`. Mutante «`T` lee otra trayectoria» ⇒ la reconstrucción de `X` sin `Y` falla o difiere. Ninguna operación del núcleo escribe en dos `StreamID` |
| **L21** | El algoritmo de cierre se compara con la fuerza bruta en grafos aleatorios (mayor corte cerrado; máximo y mínimo de cerrados son cerrados). Un corte no cerrado no actualiza la proyección. Una `dep` con un `h` distinto del local ⇒ `DIVERGENCIA_DEP` |
| **L22** | Una réplica con un checkpoint anterior aplica solo el sufijo y verifica la cadena. Si se manipula un byte de `e_i`, se trunca o se reordena ⇒ `DISCONTINUIDAD(i)` y no se aplica nada desde `i`. `Resolver` clasifica `EXACTO`, `CADENA`, `FORK(c)`, `GÉNESIS_DISTINTA` y `SIN_EVIDENCIA` contra el recorrido lineal. La búsqueda binaria = lineal |
| **L23** | Revisión: ningún resultado del núcleo afirma autoría a partir de `u` ni de un hash. El snapshot con `Q` correcto y `S_n` alterado **no** se detecta por `Q`. Es una prueba documental del límite, que exige la reconstrucción periódica |
| **L25** | `Compose` de dos trayectorias que aportan el mismo hecho ⇒ `CONFLICTO`. La misma posición en dos `StreamID` no se identifica |
| **L26** | `StreamID` no depende del contenido de la génesis. Dos génesis con la misma `StreamID` ⇒ `GÉNESIS_DISTINTA` |
| **L27** | Borrar todas las proyecciones, snapshots y `Π_hashes` y reconstruir ⇒ resultados idénticos. Una proyección interrumpida (mutante: escribir el checkpoint antes que `Y`, en dos `put`) deja un estado detectable; con M4, nunca se lee una proyección a medias |
| **L28 / L29** (esbozo de instancia) | En una regla de juguete con creaciones: `Π_coord` es congruente y estable bajo extensión. Un `Flat` construido en `T_n` sigue siendo correcto en `T_m` sin reescribirse. El mutante «reordenar `T` en una migración» ⇒ la guarda de registro de `Migra` lo rechaza (viola `Estables`) |
| **L30** | Δ1–Δ6 sobre las cinco instancias de §7.8 implementadas como datos `(U, id, rec)` que llaman a **la misma** función `Δ` (revisión estática: no hay otra función de diferencia en `nucleo/`). Importar dos veces el objetivo de juguete ⇒ 0 compromisos. Interrumpir tras `k` aplicaciones y reanudar = no interrumpir. Mutante «`sid` aleatorio por intento» con acción relativa ⇒ doble efecto (H1). Sincronizar con divergencia ⇒ `Δ` contiene posiciones `≤ n` (Corolario 7.9) |
| **L31** | `FijarParámetro` abre exactamente una época (V4). Un `FijarParámetro` sin cambio ⇒ `INADMISIBLE(sinCambio)`. Todo parámetro de `Σ_r` tiene valor inicial y está tipado (V5). Ningún valor de configuración aparece como constante en `nucleo/` salvo como `valorInicial` de un `Σ` (revisión estática). Cambiar de regla sin `Migra` registrada ⇒ rechazo. La configuración del nodo vive en `Γ_{Nodo_d}` |
| **CV / `𝒟`** | Vectores de `𝔇` de §4.2. Ida y vuelta de CV y rechazo de las 6 formas no canónicas y del surrogate suelto. `Enc` inyectivo en valores aleatorios (sin colisiones) |

**Prueba de vocabulario.** El `grep` de la cabecera sobre `kobalt/src/nucleo/` está vacío.

---

## 9. Fronteras [L]

Esta spec **no** garantiza:

1. **Distribución.** No hay consenso ni exclusión entre dispositivos. L8 vale dentro del dominio de M1 (un almacén local). Dos dispositivos que se creen constituyentes producen un `FORK`, que el núcleo detecta pero no impide. Las pruebas de un solo proceso no demuestran nada de esto (prohibido 14).
2. **Durabilidad.** El navegador puede desalojar datos. Restaurar un respaldo antiguo y volver a constituir crea un `FORK` con lo ya irradiado.
3. **Autoría.** `u` es una afirmación. Los hashes reconocen bytes, no quién los publicó (L23). La autoridad material la da hoy el control de acceso del almacenamiento.
4. **Criptografía.** Los teoremas 4.2, 7.1 y la búsqueda binaria suponen resistencia a colisiones de SHA‑256.
5. **Snapshots y checkpoints locales.** Su `Q` detecta corrupción de bytes, no un cálculo erróneo. Solo la reconstrucción (oráculo) lo detecta. La verificación «desde el último checkpoint local» confía en la integridad local.
6. **Estabilidad de predicados y pureza de `T`.** Son obligaciones de cada regla. El núcleo no puede decidirlas: se verifican por pruebas.
7. **Inmutabilidad del registro de reglas.** El núcleo no puede imponer que una `IdRegla` no cambie de código. Si cambia, `Fold` de trayectorias antiguas deja de ser reproducible.
8. **Resolución de `FORK`.** Solo se detecta. Resolverlo es un acto de autoridad (L16, L18).
9. **Atomicidad entre ámbitos.** No existe y no se emula.
10. **Frescura.** No hay un «ahora» global. Toda respuesta es relativa a un corte.
11. **Tamaño.** `Sids` crece sin límite con la retención inicial. CV es compacto, pero no comprimido.
12. **Realizaciones materiales.** IndexedDB (M1 con hash precalculado, varias pestañas) y Drive (M1 por identificador reservado) son [P] hasta las fases 4 y 6.

---

## 10. Decisiones abiertas

**Ninguna decisión del usuario bloquea esta fase.** Todo lo que la matemática abre está en §3.5 (y en los `Σ_r` de cada regla) con un valor inicial, como pide L31. No se detectó ninguna contradicción con una ley.

Supuestos **empíricos** por verificar (no son decisiones):

| Supuesto | Dónde | Estado |
|---|---|---|
| IndexedDB realiza M1 con una transacción que no espera a WebCrypto, también con dos pestañas concurrentes | Probeta de la fase 4 | [P] |
| Drive realiza M1 con un ID reservado por posición (409) | «Probeta 0 · Drive», fase 6 | [P], ya listado en `decisiones-abiertas.md` |

Precisiones de lectura del plan, que esta spec fija y que el revisor debe conocer (no son contradicciones):
1. «Trayectoria del contrato» (§11) = la misma `Γ_s` (Corolario 2.2, por L20). Un contrato en una trayectoria aparte haría la revocación no inmediata. Esa opción queda abierta como «origen de parámetros: leído».
2. «versiónRegla» del checkpoint = la versión de la **proyección**. La regla de `T` queda fijada por `h_n`. La «época» del checkpoint es redundante y comprobable.
3. La fórmula `AppendIfHead(Γ, (n,h_n), u, a)` del plan §1 se amplía con `sid`, `deps` y `ε` registrada. Es una extensión, no un cambio.
4. Para la fase 3: la configuración inicial «Δ a tres vías» necesita conservar la **base** (la última importación de cada fuente). El núcleo la admite: es el material `Q_L` más un `rec_val` que la consulta. Pero ni `Cat` ni `Inv` de la v1 tienen hoy un hecho «última importación de la fuente F». La spec de la fase 3 debe ubicarlo (por ejemplo, como una acción de registro en el ámbito que constituye la importación, o en `Nodo_d`), aplicando L20.
