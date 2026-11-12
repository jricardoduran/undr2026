# Spec · Fase 6a — La puerta (contrato entre las páginas y los módulos) y las páginas específicas

**Fecha:** 2026‑11‑12 · **Autor:** agente matemático de Kobalt · **Estado:** borrador para el ciclo verificador → implementador.
**Destino del código [P]:** `kobalt/src/puerta/` (puerta, observables, plantillas y adaptadores en memoria) y `kobalt/app/` (páginas y controladores finos). La librería visual vive en `kobalt/app/ui/`, **ignorada por git**, y la instala un script `instalar-ui` desde el zip del usuario (`REVISION_UI_Y_POS_V3.md`, regla de publicación).

**Se apoya en:**
- `2026-11-11_fase1-nucleo.md` y su enmienda (`appendIfHead`, `admitir`, `transformar`, `resolverProyeccion`, `diferencia`, `deriveSid`, materialidad M1–M4, `nodo.reintentos`);
- `2026-11-11_fase2-preguntas.md` (lenguaje de expresiones §4.2, monoides, ventanas);
- `2026-11-11_fase3-forma-y-flujo.md` **con sus Anexos A–D** (el D, escrito junto con esta spec, añade `pedido` y las modalidades de venta como plantillas);
- `kobalt/docs/2026-11-12_REVISION_UI_Y_POS_V3.md` (insumo principal: Teoremas 1–4, divergencias, páginas).

**API real sobre la que se escribe (leída de `kobalt/src/`):**
- núcleo: `crear`, `appendIfHead(almacen, streamId, cabeza, mecanismo, sol, ctx)` con `sol = {u, sid, tipo, args, deps?, epocaEsperada?}`, resultados `COMPROMETIDO | CABEZA_CAMBIADA | NO_CONSTITUYENTE | SELLADO | NO_AUTORIZADO | YA_COMPROMETIDO(i) | ÉPOCA_CAMBIADA | DEPENDENCIA_NO_VERIFICABLE | INADMISIBLE(motivo)`; `estado`, `leerTrayectoria`, `admitir`, `transformar`, `fold`, `deriveSid`, `diferencia`, `resolverProyeccion`, `cerrarCorte`, `proyectarCorte`, `crearAlmacenMemoria`;
- preguntas: `compilar`, `responder`, `materializar`, `ventana`, `evaluar`, `registrarLector`, `monoide`.

**Etiquetas.** [T] teorema con demostración aquí · [V] comprobado con `node` (scripts `e1.mjs`…`e6.mjs` en el scratchpad de la sesión, fuera del repositorio; ejecutan el **modelo de referencia de la fase 3** y el **núcleo real** sin modificarlos, con una «puerta mínima de prueba» escrita solo para comprobar) · [D] doctrina · [P] propuesta · [L] límite.

**Regla «la página no sabe nada» [D].** Ninguna página contiene una regla de negocio, una cantidad calculada ni un estado que pase por hecho. Revisión estática de `kobalt/app/` (§8):
- las páginas importan **solo** `kobalt/src/puerta/index.mjs` (ni `nucleo/`, ni `preguntas/`, ni `dominio/`);
- no aparecen los nombres de transiciones de la Red (`Vender|Asignar|Despachar|Cancelar|Cobrar|Devolver|Recibir|Reembolsar|Transferir|Contar|Ingresar`), sino nombres de plantillas de la puerta (`venta.línea`, `stock.contar`…);
- no hay comparaciones ni aritmética sobre observables de cantidad (`libre <`, `stock −`, `≥ 0`), ni ramas por nombre de perfil (`=== 'cajero'`).

**Supuestos prohibidos vigilados.**
- 1 y 8 (estado mutable y escritura en proyecciones): los observables son valores congelados; no hay ruta de escritura (§6, VP5).
- 3 (corregir editando): corregir es proponer otra acción (`Cancelar`, `Devolver`), nunca editar una línea comprometida.
- 4 (guardas como invariantes): la UI **no** valida cantidades; muestra el resultado de la admisión (L7).
- 5 (doble descuento): imposible por construcción en la Red (L12, L35); la puerta no descuenta nada.
- 7 (último gana): el orden de llegada no confiere autoridad; el constituyente lo fija el contrato.
- 10 (transacción entre ámbitos): `todoONada` solo con un ámbito (§10).
- 12 (negocio en un kernel): el vocabulario de venta está en datos de la puerta, no en el núcleo ni en las páginas.
- 14 (garantías distribuidas desde pruebas de un proceso): §9.

## Contradicciones y precisiones encontradas

**Contradicciones con leyes: ninguna. Supuestos empíricos nuevos bloqueantes: ninguno.** Hay seis precisiones a documentos previos:

| Id | Documento | Precisión |
|---|---|---|
| P‑I | `REVISION_UI_Y_POS_V3.md` §2, Teorema 3: «`sid_i = 𝔇(ρ, i)` con `ρ` = `ID` del pedido» | **Circular.** El `ID` del pedido es la posición `(i, 0)` de su entrada de nacimiento y no existe antes del primer compromiso. Hacen falta **dos** referencias: `ρ_p` (de la propuesta, la que deriva los `sid`) y `ρ_ped` (el `ID` del pedido, que sale de preguntar). T‑P3 |
| P‑J | Ídem, Teorema 3 (reintento = `Δ`) | La identidad `ρ_p` **no puede derivarse del contenido** del carrito: dos ventas idénticas colapsarían en una [V]. Es un token de intención que vive donde vive la página (§9, límite 4) |
| P‑K | Ídem, Teorema 2 («dos realizaciones legítimas») | Son los **extremos** de una familia: toda partición de la propuesta en bloques atómicos es legítima. `Lote` de una línea = por acción; `Lote` de todas = todo‑o‑nada. T‑P7 |
| P‑L | `REVISION_UI_Y_POS_V3.md` §7 y Anexo D (`actor`) | `actor` coincide con `ent.creador` en la v1; queda opcional (Anexo D.1) |
| P‑M | Interfaz de la librería: filtros de estado por colores | El estado se comunica **con texto** (etiqueta de la tabla), no solo con color (§7.5) |
| P‑N | Principios del usuario (botón «Registrar venta (descuenta stock)») y modalidad `registrar` | Nombres confundibles. El botón principal es `entregarAhora`; `registrar` se muestra como «Anotar venta (sin tocar stock)» (Anexo D.3, §10) |

---

## 1. Pregunta

Qué preguntas `q` debe responder la puerta y para quién:

| `q` | Pregunta | Para quién |
|---|---|---|
| `q_mundo(corte, λ, perfil)` | ¿Qué ve este perfil de la realidad en este corte, leída con esta lectura? (el conjunto de **observables** de una pantalla) | Toda página |
| `q_admite(u, sol)` | ¿Se admitiría esta solicitud sobre la cabeza? ¿Por qué no? (fase 3 §1) | Vista previa, estado de los botones |
| `q_prop(ρ_p)` | De las acciones de la propuesta `ρ_p`: ¿cuáles ya están comprometidas, en qué posición, y cuál es el `ID` del pedido? | Panel de propuesta, reintento (`Δ`) |
| `q_cambio(n₀, n₁)` | ¿Qué se comprometió entre dos cabezas? | Explicar por qué la vista previa difiere del compromiso (L8) |
| `q_puede(u, tipos[])` | ¿Está autorizado `u` a esas cadenas de tipo? | Habilitar o inhabilitar botones sin reglas de perfil en la página |
| `q_corte` | ¿Cuál es la cabeza `(n, h, ε)` y qué cortes son válidos? | Barra común |

**Para quién:** propietario, cajero, vendedor, lector y visitante (§3), y las automatizaciones, que usan **la misma puerta** (fase 3, F8).

---

## 2. Ámbitos (L20)

**Hechos de esta fase:** (a) la **propuesta** (carrito, referencia `ρ_p`), (b) el **contexto** de la pantalla (corte, lectura, perfil), (c) la **configuración de la puerta** (§10), (d) los **observables** (valores derivados), (e) los **compromisos** que la puerta pide a la `Γ` de dominio.

**Grafo de co‑acceso.**

| Hecho | ¿Comparte trayectoria? | Por qué |
|---|---|---|
| (e) compromisos de venta, stock y ficha | Sí: `Γ` de dominio (una componente en la v1, fase 3 Teorema 2.1) | La guarda de una línea lee el estado de la variante y el marcado; es co‑acceso atómico |
| (c) configuración de la puerta | Sí, con la del nodo: `Γ_{Nodo_d}` (fase 1 §3.4) | No cambia ninguna respuesta de dominio, solo cómo se pide y se muestra (L31) |
| (a) propuesta | **No es un hecho** (L14) | Un propósito no es un compromiso; su rechazo tampoco lo es. Vive en la página (§4) |
| (b) contexto | **No es un hecho** | Es el argumento de cada pregunta (L32), no un estado |
| (d) observables | **No** | Son `obs` de preguntas (L27) |

**Teorema 2.1 (la puerta no añade vértices ni aristas) [T].** Una llamada a `proponer` escribe, como mucho, **una** entrada en **una** trayectoria (un `Lote` por bloque, con un `AppendIfHead`). `preguntar`, `previsualizar` y `suscribir` no escriben. La lectura de la configuración al construir una solicitud no es una arista de co‑acceso: ninguna guarda del dominio la lee.
*Demostración.* La única ruta de escritura es `appendIfHead` del núcleo, que anexa a un `StreamID` (núcleo, L20). La configuración entra en la **construcción** de la solicitud, que es anterior a la admisión; la admisión (`admitir`) solo lee `S`. ∎

**Consecuencia para el carrito.** Un carrito de `m` líneas no es una transacción entre ámbitos (prohibido 10). Con una sola `Γ`, un bloque puede abarcar varias líneas (`Lote`, atómico). Si la `Γ` se parte (`{Cat, Inv_w}`, fase 3 §10), un bloque solo puede abarcar líneas del **mismo** ámbito (T‑P7).

---

## 3. Contrato por ámbito

**Regla de la configuración [P].** `kobalt.puerta@1`: regla de `Γ_{Nodo_d}` cuya `Σ` es la de `nucleo.nodo@1` (incluye `nodo.reintentos`, valor inicial 3) más los parámetros `puerta.*` de §10. El núcleo no se modifica: es una regla registrada con los mismos parámetros y algunos más. Cambiarlos es `FijarParámetro` en `Γ_{Nodo_d}` y abre una época de ese nodo (L31).

**Quién solicita y quién constituye (L16).**

| Rol | Hace | No hace |
|---|---|---|
| **Página** (cualquier perfil) | **Solicita**: construye una solicitud `{u, tipo, args, sid}` y la entrega a la puerta | No constituye, no elige `mecanismo`, no escribe |
| **Puerta** | Construye la solicitud con una plantilla, la **previsualiza**, la entrega a `appendIfHead` con la **cabeza observada** y el `mecanismo` que le inyecta el nodo | No decide autorizaciones ni admisión: las decide el núcleo (G1, guarda) |
| **Constituyente** (`nucleo.constituyente`, el dispositivo del dueño en la v1) | **Constituye** el compromiso (`appendIfHead` solo acepta a ese mecanismo) | — |
| **Otro dispositivo** (cajero en otro equipo) | Solo **solicita** (fase 7). Aquí la puerta devuelve `NO_CONSTITUYENTE` | — |

- `u` es una **afirmación** del solicitante [L] (fase 1): el núcleo no la autentica (L23). La puerta la reenvía **sin cambios**.
- `Authorized_C`: la decide `nucleo.capacidades` (E3, E4) y `dominio.alcancePropio` (fase 3 §3), no la página. La página pregunta `q_puede(u, tipos[])` y habilita sus botones con la respuesta.
- **Época.** La puerta rellena `epocaEsperada` con la época de la cabeza que el usuario vio. Si un `FijarParámetro` se compromete entre la vista previa y el compromiso, la entrada se rechaza con `CABEZA_CAMBIADA` o `ÉPOCA_CAMBIADA` y el usuario ve la diferencia (T‑P6). [D]

**Perfiles (§7.4 y fase 3 §3).**

| Perfil | Principal en `Γ` | Quién lo constituye |
|---|---|---|
| Propietario | el constituyente (`["*"]`) | génesis |
| Cajero | `usuario` con la plantilla `cajero` (+ `Nacer:pedido`, alcance + `Nacer:venta`; Anexo D.2) | `FijarParámetro(nucleo.capacidades, dominio.alcancePropio)`, dos compromisos (fase 3 §3) |
| Vendedor | plantilla `vendedor` | ídem |
| Lector | `[]` | ídem |
| **Visitante** | **ninguno** (`u = null`, `capacidades = []`) | — |

---

## 4. Estado `S`

**Estado de la puerta** (todo lo que la página puede tener que recordar):

```
Ctx   = ( corte, λ, perfil, tRef )                        contexto global de pantalla
Prop  = { ρ_p, contexto, bloques, modo }                  propuesta (carrito)
Estado_puerta = ( Ctx, { Prop_j } )
```

- `corte`: `'cabeza'` o `σ = {StreamID ↦ n}` causalmente cerrado (L21; con una sola `Γ`, `σ = {Γ ↦ n}`). Se admite el caso multi‑trayectoria desde ya (L31: la representación admite todo el espacio).
- `λ` (**lectura**): los parámetros de las preguntas que antes se llamaban «configuración de la vista» (§7.1). No es estado de la página: es **argumento** de cada pregunta (fase 3 Anexo C.3).
- `perfil = {u, papel}`; `tRef` solo si alguna pregunta depende del tiempo (L15).
- `Prop`: `ρ_p` (token de la propuesta), `contexto = {canal, cliente?, actor?, pedido?}` (si trae `pedido`, la propuesta **añade líneas** a un pedido existente), `bloques = [[línea…], …]` (cada bloque es **una** unidad atómica: un `Lote`), `modo` (§5.2, §10).

**Minimalidad (Nerode respecto de §1) [T].**

| Componente | Testigo |
|---|---|
| `corte` | Las mismas preguntas dan otra respuesta |
| `λ` | Ídem (p. ej. `libre` frente a `prudente`) |
| `perfil` | `q_puede` y la visibilidad cambian |
| `tRef` | Solo las preguntas sensibles al tiempo |
| `ρ_p` | Dos propuestas con distinto `ρ_p` generan `sid` distintos: una puede comprometerse aunque la otra ya lo esté |
| `contexto`, `bloques`, `modo` | Producen solicitudes distintas |

**Lo que NO es estado (es pregunta) [T].**
- Qué acciones de una propuesta están comprometidas y en qué posición: `q_prop(ρ_p)` lo responde desde `Γ`.
- Si una acción sería admitida **ahora**: `q_admite`.
- El `ID` del pedido de la propuesta: `(n₁, 0)`, con `n₁` la posición de la entrada comprometida más temprana de `ρ_p` (T‑P8).
- Los estados de línea y de pedido, los totales, los estados de stock: preguntas con tablas como dato (§7.5).
- *Un rechazo pasado*: su motivo se recalcula con `q_admite`; no se guarda (L14).

Dos propuestas con el mismo `(ρ_p, contexto, bloques, modo)` son indistinguibles para cualquier `Γ` y cualquier pregunta posterior. Por tanto **lo único que un borrador persiste es `(ρ_p, contexto, bloques, modo)`** (T‑P10).

---

## 5. Acciones `A`

### 5.1 Los cuatro verbos y el contexto

La página tiene **dos verbos hacia el dominio** y dos auxiliares (Teorema 1 del documento de revisión). Las guardas de esta tabla son **de uso de la puerta**, no de admisión: no confieren ni niegan autoridad, que es del núcleo. Ninguna es invariante (L7).

| Acción | Guarda (pre‑chequeo de la puerta) | Efecto `T` |
|---|---|---|
| `preguntar(q, corte = Ctx.corte)` | `q` compilable (fase 2) o nombre de pregunta del catálogo (§7.1); `corte` válido (`0 ≤ n ≤ n_local`, o `σ` cerrado) | `{Y, checkpoint, corte, acción}` por `resolverProyeccion`; sin escritura |
| `proponer(plantilla, args, {sid?, ρ_p?, b?})` | perfil ≠ visitante (`SIN_PERFIL`); `Ctx.corte = cabeza` (`SOLO_EN_CABEZA`); si ya hay entrada con ese `sid`: compara el contenido (T‑P4) | `construir` → `appendIfHead(cabeza observada)` → `Resultado` (§5.2). Escribe a lo sumo una entrada |
| `previsualizar(propuestas[], {corte?})` | cada propuesta construible | Plegado de admisiones sobre `Γ ‖ …` (T‑P5); sin escritura; sin `appendIfHead` |
| `suscribir(fn, {desde?})` | — | Registra `fn`, que recibe cabezas `(n, h)` nuevas (§5.4); sin datos |
| `fijarContexto({corte? λ? perfil? tRef?})` | `λ` válida (expresiones con `validarExpr`); perfil ∈ usuarios ∪ {visitante} | Reemplaza el componente. No es un hecho (L14) |
| `abrirPropuesta(contexto)` | perfil ≠ visitante | `Prop{ρ_p := azar(), bloques := [], modo := Σ.carrito.modo}`; la guarda el almacén de borradores |
| `editarPropuesta(ρ_p, op)` | `op ∈ {añadirLínea, quitarLínea(i), cambiarLínea(i)}`; **solo si el bloque de la línea no está comprometido** (`q_prop`). Los índices de bloque **no se renumeran** | Modifica `Prop`. Una línea comprometida **no se edita** (L3): se corrige con otra propuesta (`pedido.cancelar`, `venta.devolver`) |
| `reintentar(ρ_p)` | — | `proponer` de `Δ(π, Γ)` (T‑P4) |
| `descartarPropuesta(ρ_p)` | — | Borra el borrador. Lo ya comprometido queda (L3) |

**`modo` es inmutable por propuesta [T].** Cambiar el modo en medio de una propuesta cambiaría la partición en bloques y, con ella, el índice de bloque `b` que deriva cada `sid`: un bloque ya comprometido pasaría a otro índice y su `sid` apuntaría a otro contenido (`CONFLICTO_SID`). Por eso `Σ.carrito.modo` solo afecta a las propuestas **nuevas**, y las abiertas conservan el suyo.

**Plantillas** (`puerta.plantillas`, datos de `kobalt/src/puerta/inicial.mjs`). Una plantilla es una función pura `(args, estado de la cabeza) ↦ solicitud`. Los nombres de transiciones (`Disparar:…`) aparecen **solo aquí**.

| Plantilla | Args | Solicitud construida | Capacidades que exige (E3/E4) |
|---|---|---|---|
| `venta.línea` | `contexto`, `línea = {variante, bodega, precio, cantidad, modalidad}`, `pedido` (derivado) | `Lote` primera/siguiente (Anexo D.3): modalidades `entregarAhora`, `apartar`, `pedido`, `registrar` | `Lote`, `Nacer:pedido`\*, `Nacer:venta`, `Disparar:Vender` o `Vender.registro`, y `Asignar`/`Despachar` según modalidad (\* solo en la rama primera) |
| `venta.asignar` / `venta.despachar` | `s, q` | `Disparar:Asignar` / `Disparar:Despachar` | idem tipo |
| `venta.cobrar` | `s, x` | `Disparar:Cobrar` | `Disparar:Cobrar` |
| `venta.cancelar` | `s` | `Disparar:Cancelar` | `Disparar:Cancelar` |
| `pedido.cancelar` | `ρ_ped` | `Lote[Disparar:Cancelar{s}…]` para las líneas de la fibra `venta.pedido = ρ_ped` en la cabeza | `Lote`, `Disparar:Cancelar` |
| `venta.devolver` | `s, q` | `Lote[Nacer:devolución{venta: s}, Disparar:Devolver{d: @0, q}]` | `Lote`, `Nacer:devolución`, `Disparar:Devolver` |
| `devolución.recibir` | `d, q, apto` | `Disparar:Recibir.apto` o `Recibir.noApto` | idem tipo |
| `devolución.reembolsar` | `d, x` | `Disparar:Reembolsar` | idem tipo |
| `stock.ingresar` | `w, v, q, costo?` | `Disparar:Ingresar` | idem tipo |
| `stock.contar` | `w, v, h, motivo?` | `Disparar:Contar` | idem tipo |
| `stock.transferir.salida` / `.llegada` | `w, w2, v, q` | `Disparar:Transferir.salida` / `.llegada` (dos pasos, fase 3 §10) | idem tipo |
| `cliente.nacer` | `nombre, contacto?` | `Nacer:cliente` | `Nacer:cliente` |
| `producto.nacer` | `producto: {…}`, `variantes: [{…}]`, `existencias?: {w, h, vía}` | `Lote[Nacer:producto, Nacer:variante{producto: @0, …}…, Disparar:Contar{w, v: @j, h, motivo: 'carga inicial'}…]` (`vía = contar`) | `Lote`, `Nacer:producto`, `Nacer:variante`, `Disparar:Contar` |
| `variante.nacer` | `producto, valores` | `Nacer:variante` | `Nacer:variante` |
| `ficha.fijar` / `ficha.añadir` / `ficha.quitar` | `e, k, v` / `x` | `Fijar:τ.k` / `Añadir:τ.k` / `Quitar:τ.k`, con `τ = tipo(e)` leído en la cabeza | idem tipo |

- Una plantilla **no** propone IDs ni slots (fase 3 C1): los `{nacido: j}` cuentan **nacimientos**, no acciones (Anexo D.1).
- `producto.nacer` con `vía = contar` deja un sobrante `descuadre < 0` por la carga inicial (fase 3 §9.7); el `motivo` marca esos conteos para que la pregunta de merma los filtre. `vía = ingresar` es la alternativa (§10).
- **Botón principal del POS.** Es un parámetro (`puerta.modalidadPrincipal`, valor inicial `entregarAhora`). El texto del botón se **deriva de los hechos** de la plantilla con una tabla de nombres de hechos (dato, §10).

### 5.2 `Resultado` de `proponer`

```
Resultado ::= { estado: 'COMPROMETIDO', n, h, epoca, ids? }                        el compromiso existe: es un hecho
            | { estado: 'YA_COMPROMETIDO', i, igual }                               igual = false ⇒ CONFLICTO_SID (fase 3 C5)
            | { estado: 'RECHAZADA', rechazo, motivo? }                             NO_AUTORIZADO | INADMISIBLE(m) | SELLADO | ÉPOCA_CAMBIADA | DEPENDENCIA_NO_VERIFICABLE
            | { estado: 'CABEZA_CAMBIADA', n, h }                                   agotados los `nodo.reintentos`
            | { estado: 'NO_CONSTITUYENTE' }                                        este dispositivo solo solicita
            | { estado: 'SOLO_EN_CABEZA' | 'SIN_PERFIL' }                           pre‑chequeos de la puerta: no llegan al núcleo
```

Solo `COMPROMETIDO` es un hecho. Los demás son **respuestas** que la página muestra y descarta (L14).

### 5.3 Teoremas de las acciones

**T‑P1 (puerta única) [D → T estática].** Toda página es `Π(realidad@corte, capacidades, propósito)` y tiene dos verbos hacia el dominio. *Comprobación:* §8 (revisión estática de importaciones y de la lista de verbos exportada: `preguntar`, `proponer`, `previsualizar`, `suscribir`, más el contexto). Un tercer canal (escribir una proyección, un estado de página que pase por hecho) no existe como ruta.

**T‑P2 (propuesta ≠ compromiso) [T].** Sea `H(Γ)` la cabeza. Si `proponer` devuelve cualquier estado distinto de `COMPROMETIDO`, `H(Γ)` no cambia. `previsualizar`, `preguntar`, `suscribir` y `fijarContexto` nunca cambian `H(Γ)`.
*Demostración.* La única operación de escritura de la puerta es `appendIfHead`, que solo devuelve `COMPROMETIDO` tras `anexarSiCabeza` con `OK` (constituyente). Todos los demás resultados salen antes de ese paso o tras un `CONFLICTO` de M1 que no escribe. Las demás acciones no la invocan. ∎
[V] `e4.mjs`: tras un `INADMISIBLE` la cabeza `(n, h)` es idéntica (`deepEqual`), y en `e3.mjs` #4 un lote rechazado no hace crecer `Γ`.

**T‑P3 (dos referencias, no una) [T][V].** La derivación de identificadores de una propuesta es:

```
ρ_p      = token de la propuesta, fijado una vez al abrirla (azar inyectado en la frontera; no hay azar en el núcleo)
sid(ρ_p, b) = deriveSid("kobalt:puerta:bloque:1", [ρ_p, b])         b = índice de bloque, 1‑based; determinista
ρ_ped    = (n₁, 0), con n₁ = min{ k : ∃ b, e_k.sid = sid(ρ_p, b) }   solo después del primer compromiso; lo da q_prop
```

*Por qué no `ρ_ped` en el `sid`.* `ρ_ped = (i, 0)` con `i` la posición de la entrada de nacimiento, que depende de la cabeza en el momento del compromiso. Usarla para derivar el `sid` de la propia entrada que la crea es circular (P‑I).
*Por qué `ρ_p` no sale del contenido.* Si `ρ_p = 𝔇(contenido)`, dos ventas idénticas distintas colisionan en el mismo `sid` y la segunda se descarta con `YA_COMPROMETIDO` [V: `e3.mjs` #3: dos ventas reales, una compromiso]. La **identidad por nacimiento** del lado de la página es el token; la del dominio, la posición (L28).

**T‑P4 (reintento = diferencia) [T][V].** Sea `π = (a_1…a_m)` la propuesta con `sid_b = sid(ρ_p, b)` y `A = {e_k.sid : k ≤ n}` los `sid` de `Γ_n`. Entonces:
- `Δ(π, Γ) = { a_b : sid_b ∉ A }`, que es `diferencia(O, A, {id: a ↦ sid, rec: (a, A) ↦ sid ∈ A})` del núcleo;
- reenviar `Δ` es **idempotente**: ninguna acción aparece más de una vez en `Γ`, aunque las respuestas se pierdan o el reintento se repita.

*Demostración.* Hipótesis de `diferencia`: (H1) `id` determinista: lo es (`deriveSid`); (H2) aplicación con guarda de identidad: G2 rechaza un `sid` ya comprometido (`YA_COMPROMETIDO`) con `nucleo.retenciónSids = ilimitada` (valor inicial). Con `ventana(N)` el núcleo puede olvidar un `sid` y G2 no basta: por eso la puerta calcula `A` desde **la trayectoria** (la pregunta `q_prop`, no `S.sids`, como el predicado `nucleo.sid` de E2) y toma **la cabeza de esa misma lectura** para `appendIfHead`. Entonces el «no está en `Γ`» y el «anexo» son condicionales sobre la **misma** cabeza (L8): si otro compromiso intermedio hubiera añadido `sid_b`, la cabeza habría cambiado y el anexo devolvería `CABEZA_CAMBIADA`. ∎
[V] `e3.mjs` #2: 200 propuestas de 1–4 líneas, con 50 % de respuestas perdidas tras comprometer, hasta 3 envíos completos y compromisos ajenos entre la lectura y el anexo: **0** `sid` repetidos, **0** ventas duplicadas, `q_aud` vacía en todas.
**Conflicto de contenido.** Ante `YA_COMPROMETIDO(i)` la puerta compara el `Enc` de la entrada `e_i` con el de la solicitud reconstruida con `S_{i−1}`. Son iguales si y solo si la propuesta es la misma (la plantilla es pura). Si no, `igual = false` y la UI informa `CONFLICTO_SID`. El núcleo no compara contenidos (fase 3 C5).

**T‑P5 (la vista previa de una secuencia es un plegado de admisiones) [T][V].** `previsualizar(π)` evalúa, sobre la cabeza `S_n`:

```
S'_0 = S_n ;   para i = 1..m:   si admitir(S'_{i−1}, a_i)  ⇒  S'_i = transformar(S'_{i−1}, a_i)  (una posición más)
                                 si no                       ⇒  S'_i = S'_{i−1}                  (rechazo: sin posición, sin ID)
```

Si la cabeza no cambia, el resultado de cada `a_i` y el estado final coinciden con los del compromiso en `porAccion`. Las acciones admitidas ocupan posiciones **contiguas** `n+1, n+2, …`; una rechazada no consume posición, ni ID, ni slot (fase 3, atomicidad del lote).
*Demostración.* Inducción sobre `i`: `S'_i = Fold(S_n, a_j: j ≤ i, admitidas)` por L4, y `appendIfHead` aplica la misma `admitir` y la misma `transformar` sobre la misma cabeza. ∎
**La vista previa usa el mismo camino que la lectura:** se construye `Γ' = Γ ‖ entradas hipotéticas` como **valor** (las entradas se codifican y encadenan con `encEntrada` y `hashPaso`, puros), y se **pregunta** sobre `Γ'`. No hay un segundo motor (L32).
[V] `e3.mjs` #1: tres líneas, la primera sin existencias. Vista previa y compromiso dan los mismos resultados (`INADMISIBLE(negativo:libre[…])`, `ADMITIDA`, `ADMITIDA`) y el **mismo marcado** (`deepEqual`).

**T‑P6 (el estado cambia entre vista previa y compromiso es L8) [T][V].** Si entre la vista previa (cabeza `(n₀, h₀)`) y el compromiso otro compromiso mueve la cabeza, `appendIfHead` devuelve `CABEZA_CAMBIADA`. La puerta **reevalúa sobre la cabeza nueva** hasta `nodo.reintentos` veces y devuelve el resultado de **esa** cabeza, que puede ser una admisión o un rechazo. Esto **no es un error**: es el caso «la quinta propuesta fue rechazada por un conteo posterior». La UI explica la diferencia con `q_cambio(n₀, n₁)` (los compromisos intermedios, con tipo y actor).
[V] `e4.mjs`: vista previa `ADMITIDA`; tras `Contar(1)` de otro, el compromiso da `INADMISIBLE(negativo:libre[…])`.

**T‑P7 (el carrito es una partición en bloques; los prefijos comprometibles dependen del modo) [T][V].** Sea `π = (ℓ_1…ℓ_m)` una propuesta de líneas. Un **modo** es una partición de `π` en bloques consecutivos; cada bloque es **un** `Lote` (atómico, fase 3 §5.1) con su `sid`.

| Modo | Partición | Conjuntos comprometibles tras un envío | Tamaño del lote |
|---|---|---|---|
| **`porAccion`** (valor inicial) | un bloque por línea | `J*` ⊆ `{1..m}` determinado en orden: `i ∈ J*` ⟺ `admitir(Fold(S_n, ℓ_j : j ∈ J*, j < i), ℓ_i)`. Puede haber **huecos** por rechazo | ≤ `1 + 1 + |m|` acciones |
| **`todoONada`** | un único bloque | `∅` o `π` | `1 + Σ_i (1 + |m_i|)` ≤ `dominio.lote.máximo` |
| **`{cada: k}`** | bloques de `k` líneas | uniones de bloques completos admitidos en orden | ≤ lote.máximo |

- Con reintentos en el tiempo, `J*` solo **crece** (L3): una línea rechazada hoy puede comprometerse mañana, y el orden de compromiso puede no ser el del carrito.
- `todoONada` está acotado por `dominio.lote.máximo`: con `máximo = 50` y `entregarAhora` caben **12 líneas** (49 acciones); 13 es `INADMISIBLE('loteTamaño')` [V: `e6.mjs`]. La puerta lo muestra en la vista previa.
- **`todoONada` exige un solo ámbito** (un `Lote` no cruza trayectorias, L20 y prohibido 10): con la partición `{Cat, Inv_w}` solo se admite si todas las líneas caen en el mismo `Inv_w`.
[V] `e3.mjs` #1 (porAccion: la línea 1, sin existencias, no se compromete; las otras dos sí) y #4 (`todoONada`: con una línea agotada, **ninguna**; sin agotadas, todas en una entrada).

**T‑P8 (a lo sumo un pedido por propuesta) [T][V].** Para cada `ρ_p`, `Γ` contiene como mucho un `Nacer:pedido` cuyo `sid` derive de `ρ_p`, y es el de la entrada **más temprana** de la propuesta.
*Construcción.* La plantilla `venta.línea` elige la rama **primera** (`Nacer:pedido` en `@0`) si y solo si `q_prop(ρ_p)` no encuentra ninguna entrada de la propuesta en la cabeza observada (y `contexto.pedido` es nulo); si no, la rama **siguiente** citando `ρ_ped = (n₁, 0)`.
*Demostración.* Supón dos entradas `e_a`, `e_b` (`a < b`) de la propuesta con `Nacer:pedido`. `e_b` se construyó sobre una cabeza `n_b − 1 ≥ a` (la que le pasó el `appendIfHead`; si no coincide con la real, `CABEZA_CAMBIADA`). En esa cabeza `e_a ∈ Γ`, así que `q_prop` la habría encontrado y la plantilla habría elegido la rama siguiente. Contradicción. ∎
[V] Mismas 200 propuestas del T‑P4: ≤ 1 pedido por propuesta; el primer compromiso es siempre el que lleva `Nacer:pedido`; `e3.mjs` #1 muestra el caso «la línea 1 se rechaza, la línea 2 crea el pedido y, cuando llegan existencias, la línea 1 se compromete **citando** ese pedido».

**T‑P9 (coherencia de pantalla: el corte es de toda pregunta) [T].** Todas las preguntas de **un** render usan el mismo `corte` (un `Instante` fijado una vez). Cualquier relación entre dos respuestas que se deduzca de `Γ_σ` (el total del pedido es la suma de los totales de sus líneas; la suma por bodega es la de las filas) vale en la pantalla.
*Demostración.* Cada respuesta es una función de `Γ_σ` (L32); relaciones entre funciones de la misma entrada valen. *Contraejemplo si no:* el total leído en la cabeza `n` y las líneas leídas en `n+1` pueden no sumar. ∎

**T‑P10 (estado mínimo de la propuesta) [T].** Es el de §4. *Demostración:* todo lo demás es función de `(Γ, ρ_p, contexto, bloques, modo)`; los testigos de §4 muestran que ninguno de esos cuatro sobra. ∎

### 5.4 `suscribir`

`suscribir(fn)` avisa de **cabezas nuevas** `(n, h)`; no entrega datos. Se invoca al resolver un `COMPROMETIDO` propio y, para compromisos que llegan por réplica (`incorporar`), al detectarlos por sondeo de `almacen.cabeza` cada `puerta.sondeoMs`.

**T‑P11 (basta la última cabeza) [T].** Entregar solo la cabeza más reciente es suficiente: toda respuesta es función de la cabeza (T‑P9), así que perder avisos intermedios no cambia ninguna respuesta posterior. Por tanto el aviso puede **coalescer**, nunca se repite la misma cabeza y `n` es **no decreciente**. Con el corte fijado en el pasado, el aviso solo actualiza el indicador «hay `n_cabeza − n_corte` compromisos nuevos».

### 5.5 Adaptador de persistencia que la puerta exige (M1)

La puerta **no implementa** persistencia: recibe un `almacen` con la interfaz de la fase 1 §5.5 (y todo método puede ser asíncrono; el constituyente ya hace `await`). Obligaciones que la puerta impone:

| Obligación | Contenido | Quién la cumple |
|---|---|---|
| **A1 · M1** | `anexarSiCabeza(streamId, (n,h), bloques, final)` compara y anexa **atómicamente**, linealizable por `StreamID` para todos los contextos que comparten el almacén (pestañas, trabajadores). Dos llamadas con la misma cabeza esperada no pueden tener éxito las dos | En memoria: tramo síncrono. IndexedDB (fase 5): transacción `readwrite` única. **Empírico por verificar en fase 5 [P]:** que las transacciones `readwrite` de pestañas del mismo origen se serializan, y que `COMPROMETIDO` solo se devuelve tras `oncomplete` con durabilidad estricta |
| **A2 · M2** | Tras `OK`, `cabeza` ya incluye el compromiso (leer lo escrito) | ídem |
| **A3** | `cabeza` y `leer(1, n)` son consistentes: leer un prefijo siempre es válido (append‑only) | ídem |
| **A4 · M3** | No hay sobrescritura ni borrado de bloques (L3) | ídem |
| **A5 · M4** | `guardar(clave, registro)` es de una sola unidad `(acum, checkpoint)`; la puerta lo usa para materializar (L34) y puede descartarlo siempre (L27) | ídem |

- **Borradores.** Un almacén aparte `Borradores = {leer(ρ_p), guardar(ρ_p, {contexto, bloques, modo}), borrar(ρ_p), listar()}`. **No** es `Γ` ni `registros` (no es una proyección): es persistencia **local de la página** (sessionStorage/IndexedDB). Perderla no corrompe nada; solo pierde la identidad `ρ_p` (§9, límite 4).
- **Versión en memoria para pruebas [P]:** `crearAlmacenMemoria()` (existente), `crearBorradoresMemoria()`, `azarDeterminista(semilla)` y un reloj inyectable. Con ellos `crearPuerta({almacen, registro, streamId, mecanismo, azar, borradores, config})` es determinista y no tiene E/S propia.
- La puerta **no** guarda bytes de imágenes: solo `Q` (fase 5).

---

## 6. Invariantes `V_C`

Propiedades que valen en todo estado alcanzable de (puerta, `Γ`). Se demuestran por inducción sobre las acciones de §5.1.

| Id | Invariante | Demostración |
|---|---|---|
| **VP1** Rechazo no es hecho (L14) | `n(Γ)` = número de `COMPROMETIDO` devueltos por `proponer` (más los que llegan por réplica). Ningún otro resultado cambia `Γ` | T‑P2 y `anexarSiCabeza` como única ruta |
| **VP2** Identidad de acción | `∀ ρ_p, b`: `#{k : e_k.sid = sid(ρ_p, b)} ≤ 1` | G2 del núcleo (`retenciónSids = ilimitada`); `sid` determinista; T‑P4 |
| **VP3** Pedido único (T‑P8) | `∀ ρ_p`: a lo sumo un nacimiento de pedido de la propuesta | T‑P8 |
| **VP4** Modo fijo | `modo` no cambia durante la vida de una `Prop` | Solo `abrirPropuesta` lo escribe y `editarPropuesta` no lo toca (§5.1) |
| **VP5** Observables congelados y de lectura | Todo observable que recibe una página es un valor profundamente inmutable, con su `checkpoint`; ninguna ruta de escritura de la página lo alcanza | Los observables son salida de `resolverProyeccion` (copia, `structuredClone`); la puerta los congela; revisión estática de §8 |
| **VP6** Visibilidad del visitante | Con `perfil = visitante`, la puerta solo responde preguntas de `puerta.preguntasPúblicas`, y ningún campo de `puerta.vistas.visitante.ocultar` sale en los observables [D][L: no es control de lectura] | Filtro de la puerta sobre el nombre de pregunta y sobre los campos del observable. **No** protege el almacén (L23) |
| **VP7** Corte único por render | Todas las respuestas de un `Instante` llevan el mismo `checkpoint.n` y `h` | `Instante` fija `σ` al crearse y `preguntar` lo hereda (T‑P9) |

**Lo que NO es invariante (L7):**

| No invariante | Por qué |
|---|---|
| `SOLO_EN_CABEZA`, `SIN_PERFIL`, `NO_CONSTITUYENTE` | Son **guardas de uso** de una acción concreta: cambian con el contexto |
| «El botón X está habilitado» | Es la respuesta de `q_admite` y `q_puede` en un corte; deja de valer al cambiar la cabeza |
| «Hay existencias suficientes» | No lo comprueba la página: la guarda de la Red (L35) la decide al admitir |
| «La vista previa es el compromiso» | Solo si la cabeza no cambia (T‑P6) |

---

## 7. Proyecciones `Π_q`

### 7.1 La lectura `λ` y el repertorio de preguntas

**Lectura `λ`** (valor inicial entre paréntesis; todos son parámetros de **preguntas**, no de la página):

```
λ = { stock:     { medida: libre | prudente | físico        (libre),
                   bajo:   { num, den }                     (1/1  ⇒  «bajo» ⟺ medida·den < umbral·num) },
      bodegas:   { ver: [w…] | todas (todas), agregación: sumaDeMáximos | máximoDeSuma (sumaDeMáximos) },
      precio:    expr                                       (si(0 < carac(v, descuento), carac(v, descuento), carac(v, precio))),
      ahora:     { familias: [pend, pend⁰, asig, porCobrar, tránsito, sol] },
      etiquetas: { cumplimiento, cobro, stock }             (tablas §7.5),
      visibilidad: referencia a la regla de la Forma         (galería, Anexo C.3),
      vistaPública: { cantidad: oculta | siempre }          (oculta) }
```

- Es el «valor por defecto» de las preguntas de la fase 3 (Anexo C.3): `disponibilidad(w, v, {familias, agregación})`, `visible(…, regla)`, `fibra(k, v, τ)`. La regla de precio es una **expresión de la fase 2**: es la regla de negocio «precio de lista» que la página **no** conoce.
- Cambiar `λ` cambia `ver` de cada pregunta (identidad de la pregunta, L22): no se reutiliza una materialización de otra lectura.

**Repertorio** (todas son preguntas del núcleo `Π`; las páginas piden `{π: nombre, params}` o un `q` de la fase 2):

| Π | Fórmula | `M` / lectura de estado | Incremental y ventana | Materializa | Checkpoint |
|---|---|---|---|---|---|
| `existencias(λ)` | `disponibilidad(w, v, cfg)` por cada `(w, v)` con marcado o variante visible | `sumaPorClave` (grupo), `leeEstado` | siempre (E1.3); ventana `(i, j]` por prefijos en O(1) | el marcado | `(s, n, h, ver, ε)`; sin `t_ref` |
| `estadoStock(v, λ)` | tabla de stock (§7.5) sobre `libre`, `medida`, `umbral(v)` | `obs` sobre `existencias` | **no congruente por sí sola** (L10, §7.2): se guarda `acum` | nada propio | el de `existencias` |
| `catálogoVendible(u, λ)` | variantes con `admite.fijar` de `venta.variante` verdadero para `x.u = u` (la **misma** expresión que la guarda de `Nacer:venta`), ∩ fibras de filtros | `q_cat` (mapa) + estado, `leeEstado` | siempre | `q_cat` | ídem |
| `ficha(e)` | sección efectiva de `e` (herencia en `obs`) ⊕ `existencias` ⊕ galería filtrada por la regla de visibilidad para `x.u` | `q_cat` + marcado | siempre (L10: se guardan secciones **propias**, fase 3 §7.2) | `q_cat`, marcado | ídem |
| `facetas(τ)` | para cada característica de `Φ` de clase asignación o conjunto con valores finitos: `(k, v, \|F_{k,v} ∩ activos\|)` con complemento relativo a los **conocidos** (L2) | `q_cat` (`fibra`) | siempre | `q_cat` | ídem |
| `kardex(w, v)` | `secuencia` de movimientos de `H[w,v]` con saldos acumulados | `secuencia` | **no se materializa** (L34): recorre `Γ`, O(\|Γ\|) [L] | no | ídem |
| `historia(e, k)` | `secuencia` de las entradas que tocan `(e, k)` | `secuencia` | ídem | no | ídem |
| `ahora(λ)` | marcado de las familias de `λ.ahora.familias`, no nulas, agrupadas por índice, ordenadas por antigüedad de la entrada | `sumaPorClave` (marcado) | siempre | el marcado | ídem |
| `pedidos(filtro)` | entidades `pedido` (fibra del tipo) con el resumen de `hijos` y `dueño` según la lectura del perfil | `q_cat` + marcado | siempre | ambos | ídem |
| `pedido(ρ)` y `línea(s)` | `hijos(ρ, venta, pedido, F_venta)` y `hijos(s, devolución, venta, {sol, recibido})` (Anexo D.4) + tablas de §7.5 | `producto(q_cat, marcado)` | grupo ⇒ ventana por prefijos (total por período = flujo de `Vender`) | ambos | ídem |
| `q_prop(ρ_p)` | `{sid ↦ k}` de las entradas con `sid ∈ {sid(ρ_p, b)}`: `(φ: en(e.sid, lista), aporte: {clave: e.sid, valor: e.k}, M: sumaPorClave, obs: identidad)` | pregunta de la fase 2 **sin** estado | siempre; es un grupo (cada `sid` aparece una vez) | no hace falta (O(\|Γ\|) barato, o prefijos) | `(s, n, h, ver, ε)` |
| `q_admite(u, sol)` | `admitir(S_n, e)` con `e` construido de `sol` | clásica `π: S → Y`, función pura de `S_n` | se recalcula; no se reutiliza entre cabezas | no | `(s, n, h, ver, ε)` |
| `q_puede(u, tipos[])` | `autorizado(C_ε.capacidades[u], tipo)` y `alcancePropio` | clásica sobre los **parámetros** (`sensibleAEpoca`) | cambia solo con `FijarParámetro` | no | con `ε` |
| `q_cambio(n₀, n₁)` | lista `(tipo, u, k)` de las entradas `n₀ < k ≤ n₁` | ventana de `secuencia` | — | no | `(i, hI)` |
| `auditoría` | `q_aud` de la fase 3 §7.6 (debe ser vacía) | marcado + Σ por especie | siempre | no | ídem |
| `tiendaCatálogo`, `tiendaFicha` | proyección **pública** (§7.4) | `q_cat` + `existencias` con `u = null` | siempre | ídem | ídem |

**`t_ref` (L15).** Ninguna pregunta de esta tabla depende del tiempo; `Ctx.tRef` es `null`. Una pregunta que lo necesite (caducidad de apartados, «ventas de hoy» con `sello`) declararía `sensibleATiempo` y su checkpoint llevaría `t_ref` (forma clásica); en forma monoidal `t_ref` entra solo en `obs` y no en el checkpoint (E1.4b). **Cortes por fecha:** las acciones de dominio de la v1 no llevan sello, así que el corte de la barra es por **posición** `n` y época [L].

**Resolución con checkpoint (L21, L22).** `preguntar` consulta `almacen.leerRegistro(clave(q))` (M4), llama a `resolverProyeccion` con ese `guardado` y, si materializa, `guardar`. Un checkpoint que no casa con `Γ` da `RECONSTRUIR` o `DISCONTINUIDAD`: **nunca** se aplican deltas a ciegas (L22). Un corte `σ` con varias trayectorias se cierra con `cerrarCorte` (L21).

### 7.2 Congruencia y contraejemplos

**`estadoStock` no es congruente con `max(0, ·)` [T].** Con la medida `prudente = max(0, libre − P)`: `(libre = 2, P = 5)` y `(libre = 3, P = 3)` dan la misma medida `0` y la misma etiqueta `agotado`; tras `Ingresar 2` dan `0` (`agotado`) y `2` (`disponible`). Por eso la etiqueta **no se guarda**: se guarda `acum` (el marcado) y la etiqueta se calcula en `obs` con la tabla (L10; corolario de E1.3).

**`total(ρ)` sí es un grupo [T].** `sumaPorClave` sobre ℤ: cualquier ventana `(i, j]` sale en O(1) por `P_i⁻¹ ⊗ P_j` (fase 2 T7.2). Es la «pregunta de suma» de la revisión (Anexo D.4).

### 7.3 Observables que reciben las páginas

**El «mundo» que recibe una página** no tiene hechos primarios: es el resultado de preguntas.

```
Mundo = { corte:   { streamId, n, h, epoca, tRef? },                 el checkpoint de TODAS las respuestas (VP7)
          lectura: λ,
          perfil:  { u, papel, puede(plantilla): bool, vista: {páginas, ocultar, alcanceLectura} },
          obs:     { [clave de pregunta]: Observable } }             valores congelados (VP5)
```

No hay `catalog.products`, `inventory.positions` ni `orders.status` almacenados: son **respuestas** descartables al siguiente corte, que ninguna página puede modificar. Los observables, con su forma exacta:

| Observable | Campos | De qué pregunta |
|---|---|---|
| `TarjetaProducto` | `id, nombre, categoría, imagen: Q?, precio, estado: {etiqueta, medida, umbral?}, variantes: [FilaVariante]` | `catálogoVendible` + `ficha` + `estadoStock` |
| `FilaVariante` | `id, slot, sku, color, talla, libre, estado: Etiqueta, vendible: bool` | `existencias` + `estadoStock` |
| `FilaExistencias` | `w, v, H, A, P, libre, déficit, noApto, descuadre, estado: Etiqueta` (`libre` y `déficit` **sin recortar**: pueden ser negativos, L7) | `existencias` |
| `Etiqueta` | `{texto, nombre, valores?}`: el **texto** que muestra la UI; el color es decoración | tabla de §7.5 |
| `Ahora` | `{[familia]: [{índice, cantidad, desde: n}]}` y `alertas: [{id, etiqueta}]` | `ahora`, `estadoStock` |
| `Pedido` | `id, creador, actor, canal, cliente?, líneas: [Línea], total, porCobrar, cobrado, cumplimiento: Etiqueta, cobro: Etiqueta` | `pedido(ρ)` |
| `Línea` | `s, variante, cantidad, precio, subtotal, vector: {pend⁰, pend, asig, desp, cancel, devuelto, porCobrar, cobrado, reembolsado, anulado}, cumplimiento: Etiqueta, cobro: Etiqueta, acciones: [{plantilla, args, habilitada, motivo?}]` | `línea(s)` + `q_admite` |
| `Ficha` | `id, tipo, sección: {k: {valor, origen: propio\|heredado\|defecto}}, existencias, galería: [{Q, …}] filtrada, facetas` | `ficha(e)` |
| `Kardex` | `[{n, u, tipo, delta, saldo}]` | `kardex` |
| `Historia` | `[{n, u, valor}]` | `historia` |
| `Propuesta` | `ρ_p, modo, bloques: [{líneas, estado, resultado?, previa}], pedido?: ID` | `q_prop` + `previsualizar` |
| `Previa` | `{i, estado: ADMITIDA\|RECHAZADA, rechazo?, motivo?, n?, efecto: {lugar: Δ}}` | `previsualizar` |
| `Cambio` | `[{n, u, tipo}]` | `q_cambio` |
| `TiendaTarjeta` / `TiendaFicha` | `id, nombre, categoría, imagen público?, precio, disponibilidad: Etiqueta, [cantidad si λ.vistaPública.cantidad = siempre]` | `tiendaCatálogo`, `tiendaFicha` |

El campo `acciones[].habilitada` es **la respuesta de `q_admite`** para esa plantilla sobre esa línea (no una regla de la página): un botón está activo si y solo si el núcleo la admitiría ahora.

### 7.4 Capacidades por perfil y lo que ve cada uno

La página **no ramifica por nombre de perfil**: pide `perfil.puede(plantilla)` y `perfil.vista`. `puerta.vistas` es un dato (§10).

| Perfil | Páginas | Lectura | Plantillas habilitadas |
|---|---|---|---|
| **Propietario** (`*`) | todas | todo: `costo`, `descuadre`, `auditoría`, todos los pedidos, kárdex, corte histórico | todas |
| **Cajero** | `pos`, `ventas`, `inventario`\*, `producto`\*, tienda (\* solo lectura) | existencias sin `costo` ni `auditoría`; pedidos **propios** (`dueño = u`, igual que el alcance de escritura) | `venta.línea`, `venta.asignar`, `venta.despachar`, `venta.cobrar`, `venta.devolver`, `cliente.nacer` sobre lo propio. **No** `stock.contar` ni `venta.cancelar` |
| **Vendedor** | `producto`, `pos`, `ventas`, tienda | sus productos y pedidos propios | `producto.nacer` (sin conteo inicial: no tiene `Disparar:Contar`), `variante.nacer`, `ficha.*` sobre lo propio, `venta.línea` (modalidades `pedido` y `registrar`), `venta.cobrar`, `venta.cancelar`, `venta.devolver`. No `venta.asignar` ni `venta.despachar` ni `stock.contar` |
| **Lector** | `inventario`, `ventas`, `producto` (solo lectura) | como cajero | ninguna |
| **Visitante** (`u = null`) | `tienda/index`, `tienda/producto` | proyección pública: variantes `activa ∧ público`, galería con `audiencia = público`, precio, `disponibilidad` como **etiqueta** (`disponible`/`bajo`/`agotado`); sin `costo`, `H`, `A`, `P`, `descuadre`, creador ni pedidos | ninguna (`SIN_PERFIL`) |

- Lo que cada perfil **puede hacer** lo da `q_puede` (capacidades y alcance de `Γ`), no la tabla anterior: la tabla es el **valor inicial** de `puerta.vistas` (qué páginas ofrece y qué campos oculta). Si las capacidades de `Γ` cambian, los botones cambian sin tocar la tabla.
- **Visitante [L].** Ocultar campos y filtrar preguntas **no es control de lectura** (L23): quien tenga la copia de `Γ` puede responder cualquier pregunta. La tienda pública real (fase 8+) debe servirse desde una **proyección publicada**, no desde `Γ`. En la v1 la tienda es una vista del mismo dispositivo.

### 7.5 Tablas `marcado → etiqueta` (dato) y estado de stock

**Los estados no son campos.** No existe `venta.estado`: son `obs` de preguntas. La tabla es una lista **ordenada** de reglas `{etiqueta, cuando: expr}` en el lenguaje de la fase 2 (primera que se cumple). Es total porque la última regla es `verdadero`, y es un parámetro de la pregunta (`λ.etiquetas`).

**Vector de una línea `s`** (lo construye `hijos`): `pend⁰, pend, asig, desp, cancel` (familias de `s`), `devuelto = Σ_{d: s(d)=s}(sol + recibido)`, `porCobrar, cobrado, reembolsado, anulado`.

**`cumplimiento`** (valor inicial, 7 reglas):

| # | Etiqueta | Cuando |
|---|---|---|
| 1 | cancelada | `cancel > 0 ∧ pend⁰+pend+asig+desp+devuelto = 0` |
| 2 | devuelta | `devuelto > 0 ∧ pend⁰+pend+asig+desp = 0` |
| 3 | entregada | `desp > 0 ∧ pend⁰+pend+asig = 0` |
| 4 | apartada | `asig > 0 ∧ pend⁰+pend+desp = 0` |
| 5 | pedida | `pend > 0 ∧ pend⁰+asig+desp = 0` |
| 6 | registrada | `pend⁰ > 0 ∧ pend+asig+desp = 0` |
| 7 | parcial | `verdadero` |

**`cobro`** (6 reglas): `cobrada` (`porCobrar = 0 ∧ cobrado > 0`) · `cobro parcial` (`porCobrar > 0 ∧ cobrado > 0`) · `por cobrar` (`porCobrar > 0 ∧ cobrado = 0`) · `reembolsada` (`porCobrar = cobrado = 0 ∧ reembolsado > 0`) · `anulada` (`porCobrar = cobrado = reembolsado = 0 ∧ anulado > 0`) · `cerrada` (resto).

**Pedido.** Sus etiquetas son **la misma tabla evaluada sobre la suma de los vectores de sus líneas** (`hijos.suma`). Un pedido con una línea entregada y otra apartada cae en `parcial`.

**`stock`** (valor inicial; solo enteros, sin reales):

| # | Etiqueta | Cuando |
|---|---|---|
| 1 | déficit | `libre < 0` |
| 2 | agotado | `medida ≤ 0` |
| 3 | bajo | `umbral` conocido `∧ medida·den < umbral·num` |
| 4 | disponible | `verdadero` |

- `medida` es `libre`, `max(0, libre − P)` o `H` según `λ.stock.medida`; `umbral` es una **característica** de la variante (asignación; nunca fijada = `desconocido`, que no es 0: sin umbral nunca es `bajo`, L2); `num/den` es la proporción de la librería (`0,3`) como parámetro entero (`3/10`).
- **Mutuamente excluyentes y exhaustivas por construcción** (orden + regla final). Además:
  - `déficit` (`libre < 0`) representa la deuda física que L7 permite y que **no se recorta** al mostrarla;
  - `agotado` equivale a `D = 0` con `libre ≥ 0`.
- [V] `e4.mjs`: totalidad y alcanzabilidad exhaustivas en universos `{0,1,2}` (3⁶ vectores de cumplimiento y 3⁴ de cobro): toda combinación recibe exactamente una etiqueta y las 7 y 6 son alcanzables; los flujos normales de una línea de 3 unidades dan `registro → registrada`, `suave → pedida`, `firme → apartada`, `inmediata → entregada`; para stock, `libre 15, umbral 16 → bajo` (el escenario 12 de la fase 3), `libre 16 → disponible`, `libre 0 → agotado`, `libre −5 → déficit`, sin umbral `→ disponible`.
- **El estado no habilita botones.** Los botones los habilita `q_admite`/`q_puede`; la etiqueta solo informa (así una regla corregida de la Red no deja la UI con una regla vieja).

### 7.6 Páginas

Cada página lleva un **controlador fino** que solo traduce eventos a `proponer`/`preguntar`/`previsualizar` y observables a componentes de la librería. Todas comparten la **barra común** (§7.6.7).

#### 7.6.1 `inventario`
| | |
|---|---|
| **Preguntas** | `existencias(λ)` (matriz bodega × variante o registros; adaptativa), `facetas(variante)`, `kardex(w, v)`, `historia(e, k)`, `ahora(λ)`, `estadoStock`, `auditoría` (solo propietario) |
| **Plantillas** | `stock.contar`, `stock.ingresar`, `stock.transferir.salida` / `.llegada` (desde el panel «Ahora», sobre un tránsito), `ficha.fijar(umbral)` |
| **Invariantes de UI** | I1. `libre` y `déficit` se muestran **tal cual** (negativos incluidos); nunca recortados. I2. Los filtros salen de `facetas`, no de una lista escrita en la página. I3. Conteo y ingreso se presentan como **dos hechos distintos** (botones con nombre de hecho: «Contar (fija el físico)», «Registrar ingreso (suma)»). I4. El kárdex se pide solo al abrir la ficha de una `(w, v)` (no se materializa, [L]) |

#### 7.6.2 `pos`
| | |
|---|---|
| **Preguntas** | `catálogoVendible(u, λ)` (cuadrícula de tarjetas), `existencias` y `estadoStock` por tarjeta, `precio` por la regla de `λ`, `previsualizar(carrito)` en cada edición, `q_prop(ρ_p)` para el estado de cada bloque |
| **Plantillas** | `venta.línea` × modalidad (botón principal = `puerta.modalidadPrincipal`), `cliente.nacer` |
| **Invariantes de UI** | I5. El carrito es una `Prop`: **vive en la página** y se persiste solo `(ρ_p, contexto, bloques, modo)` (T‑P10). I6. La página **no valida existencias**: muestra la `Previa` por bloque (`ADMITIDA` / `RECHAZADA` con el motivo del núcleo). I7. Un rechazo se queda en el borrador y **no es un hecho** (L14); no se pierde el carrito. I8. «Reintentar» envía solo `Δ(π, Γ)`. I9. El botón principal nombra los hechos de su plantilla («Registrar venta (descuenta stock)»); las otras tres modalidades están visibles como acciones secundarias. I10. Tras un `COMPROMETIDO` se muestra el `ID` del pedido (`q_prop`) y se ofrece «Nueva venta» (`abrirPropuesta`) |

#### 7.6.3 `ventas`
| | |
|---|---|
| **Preguntas** | `pedidos(filtro)` (lista con total y etiquetas), `pedido(ρ)` (detalle), `línea(s)`, `q_admite` por acción para habilitar botones |
| **Plantillas** | `venta.asignar`, `venta.despachar`, `venta.cobrar`, `venta.cancelar`, `pedido.cancelar`, `venta.devolver`, `devolución.recibir`, `devolución.reembolsar`, `venta.línea` con `contexto.pedido` (añadir línea) |
| **Invariantes de UI** | I11. El total es `total(ρ)` de la pregunta; la página no suma líneas. I12. Un botón está activo ⟺ `q_admite` lo admitiría; **no** por la etiqueta de estado. I13. La corrección de una línea comprometida es otra acción (cancelar, devolver), nunca una edición (L3) |

#### 7.6.4 `producto`
| | |
|---|---|
| **Preguntas** | `ficha(e)` (sección editable en su sitio, con el origen `propio/heredado/defecto` de cada valor), `facetas`, `historia(e, k)`, `existencias` de sus variantes |
| **Plantillas** | `producto.nacer` (producto + variantes + conteo inicial, un `Lote`), `variante.nacer`, `ficha.fijar` / `.añadir` / `.quitar`, `Retirar`/`Reactivar` como `ficha.fijar(estado)`, fotos por `Q` (`ficha.añadir(galería)`) |
| **Invariantes de UI** | I14. **Editar la ficha emite un propósito** (`ficha.*`); el valor mostrado cambia **solo** cuando el compromiso existe y la ficha se vuelve a leer (principio «la trayectoria constituye; la ficha expresa»). I15. El mismo `ficha.fijar` desde la ficha o desde una tabla produce la **misma entrada** (L17). I16. Una imagen se identifica por `Q = ContentId(bytes)`; recomprimir da otra `Q` |

#### 7.6.5 `tienda/index`
| | |
|---|---|
| **Preguntas** | `tiendaCatálogo` (perfil visitante), `facetas` públicas |
| **Plantillas** | ninguna |
| **Invariantes de UI** | I17. Ningún campo de `puerta.vistas.visitante.ocultar` aparece; ningún control de escritura existe. I18. La disponibilidad es una **etiqueta** (`λ.vistaPública.cantidad = oculta`) |

#### 7.6.6 `tienda/producto`
| | |
|---|---|
| **Preguntas** | `tiendaFicha(e)` (variantes, galería pública, precio, disponibilidad) |
| **Plantillas** | ninguna (solo lectura) |
| **Invariantes de UI** | Las de I17 e I18 |

#### 7.6.7 Barra común (corte · lectura · perfil)
| | |
|---|---|
| **Preguntas** | `q_corte` (cabeza, épocas), `perfil.vista` (páginas y campos) |
| **Plantillas** | ninguna |
| **Invariantes de UI** | I19. Controla `Ctx` (`fijarContexto`); es lo **único** que escribe `corte`, `λ` y `perfil`. I20. Con `corte ≠ cabeza` los controles de escritura están inhabilitados y hay un aviso con «volver a la cabeza» (`SOLO_EN_CABEZA`). I21. Las cuatro componentes (corte, lectura, perfil, indicador de compromisos nuevos) y su orden son iguales en las seis páginas. I22. Cambiar la lectura (`libre` ↔ `prudente`) **no** emite ninguna acción |

**Invariantes de UI generales.**
- **UI‑1** La página no contiene reglas de negocio ni calcula cantidades (§ «la página no sabe nada»).
- **UI‑2** La página no escribe proyecciones; su único estado propio es `Ctx`, `Prop` y estado visual (selección, apertura de paneles). Lo visual que se traduce en `φ` (filtros) pasa por `facetas`.
- **UI‑3** Cada cifra mostrada viene de un observable con su `checkpoint`, y todas las de un render, del **mismo** corte (VP7).
- **UI‑4** Los botones **nombran hechos** («Registrar venta (descuenta stock)», «Anotar venta (sin tocar stock)», «Contar (fija el físico)»); el texto se deriva de la plantilla.
- **UI‑5** El estado se comunica con **texto** además del color (P‑M).
- **UI‑6** La librería recibe observables **ya listos** (`Etiqueta`, no `stock`): evita el defecto `UNDEFINED · 10` de su tarjeta de demostración (doc de revisión §3).

---

## 8. Leyes aplicables (para `kobalt-verificador`)

**Oráculo.** `previsualizar` y `q_admite` contra un `Fold` directo con `admitir` y `transformar` del núcleo sobre una `Γ` generada por el generador de la fase 3 (con `Nacer:pedido`, Anexo D). El **modelo de la puerta** debe reexpresar, como oráculo propio, las «puertas mínimas de prueba» de `e3.mjs`–`e4.mjs` (scripts del scratchpad, fuera del repositorio): derivación de `sid`, `q_prop`, plantilla primera/siguiente, `Δ`, partición en bloques, pliegue de la vista previa.
**Generador:** propuestas aleatorias de 1–4 líneas, modos `porAccion`/`todoONada`/`{cada: k}`, modalidades, respuestas perdidas (50 %), compromisos ajenos entre la lectura y el anexo (cambios de cabeza), actores propietario/cajero/vendedor/lector/visitante, y cortes en el pasado. Semilla `KOBALT_SEED`.

| Ley | Cómo se verifica |
|---|---|
| **L3** | El almacén espía registra todas las operaciones: ninguna es sobrescritura o borrado. Corregir una línea = acción nueva (`pedido.cancelar`, `venta.devolver`); no hay `editarComprometida`. Mutante «editar una entrada» ⇒ falla |
| **L4** | La `Previa` de una secuencia = `Fold(S_n, admitidas)`; el marcado final de la vista previa = el del compromiso (T‑P5), también cruzando un `FijarParámetro` |
| **L6 / VP1–VP7** | Se comprueban tras **cada** acción de la puerta |
| **L7** | `libre` y `déficit` llegan **sin recortar** a `FilaExistencias`. Los pre‑chequeos (`SOLO_EN_CABEZA`…) no son invariantes. Mutante «recortar `libre` a `max(0, ·)` en el observable» ⇒ se oculta el déficit ⇒ falla la prueba de `Contar` bajo comprometido. Revisión estática: ninguna página deshabilita un botón por comparar una cantidad |
| **L8** | Con una interferencia entre lectura y anexo, `appendIfHead` devuelve `CABEZA_CAMBIADA`; la puerta reevalúa hasta `nodo.reintentos`; después devuelve `CABEZA_CAMBIADA`. Una vista previa `ADMITIDA` puede acabar `RECHAZADA` y `q_cambio` explica por qué (T‑P6) |
| **L9 / L10** | Cada observable incremental = reconstruido en todo corte. `estadoStock` con `prudente` no es congruente (contraejemplo de §7.2); mutante «guardar la etiqueta en vez del marcado» ⇒ falla tras `Ingresar` |
| **L14** | Un `RECHAZADA`, `CABEZA_CAMBIADA` o `NO_AUTORIZADO` deja `n(Γ)` y `h` intactos. Un espía cuenta las llamadas a `anexarSiCabeza` con éxito = número de `COMPROMETIDO` |
| **L15** | Las preguntas sin `sensibleATiempo` dan el mismo checkpoint con otro `t_ref`; una sensible lo lleva (forma clásica) |
| **L16** | `u` se reenvía sin cambios; `NO_CONSTITUYENTE` desde un mecanismo que no es el constituyente; la página no puede elegir `mecanismo`. Los botones salen de `q_puede`, no de reglas. Visitante ⇒ `SIN_PERFIL` y, si se forzara, `NO_AUTORIZADO`. Lote con una acción interna sin capacidad ⇒ `NO_AUTORIZADO` (E4) |
| **L17** | `ficha.fijar` desde la ficha y desde la tabla producen el **mismo** `Enc` |
| **L20** | Cada `proponer` escribe en un `StreamID` y como mucho una entrada; `Lote` atómico. Con la partición `{Cat, Inv_w}`, `todoONada` entre líneas de distintas `Inv_w` ⇒ rechazado antes de enviar |
| **L21 / L22** | Todas las preguntas de un `Instante` comparten `n`, `h` (VP7). Un `guardado` con checkpoint que no casa ⇒ `RECONSTRUIR`/`DISCONTINUIDAD`; nunca delta a ciegas. `σ` no cerrado ⇒ `cerrarCorte` |
| **L27** | Revisión estática: ninguna ruta de escritura desde páginas ni observables; los observables salen congelados (mutar uno lanza). Persistir `acum` no lo convierte en autoridad |
| **L28** | La puerta no propone IDs ni slots; el `ID` del pedido es la posición de la entrada (T‑P3); las pruebas comprueban que un lote rechazado no consume posición |
| **L30** | T‑P4: `Δ` reenvía solo lo que falta; propiedades de idempotencia (200 propuestas, 50 % de pérdidas); `ρ_p` derivado del contenido ⇒ mutante «dos ventas idénticas colapsan» ⇒ falla |
| **L31** | Todos los parámetros de §10 tienen dominio y valor inicial; cambiar uno abre una época de `Γ_{Nodo_d}` y no reinterpreta nada; la partición del carrito admite cualquier partición, no solo los dos valores con nombre |
| **L32** | Cada observable = `f(preguntar(q, corte, λ))`; `corte` y `λ` son argumentos de toda pregunta (no hay lectura global mutable): mutante «corte global implícito» ⇒ dos respuestas con cortes distintos ⇒ falla la prueba de coherencia |
| **L33 / L34** | `total(ρ)` es grupo: ventana por prefijos = recorrido directo; `kardex` no se materializa (`NO_MATERIALIZABLE`); el registro guardado lleva checkpoint (M4) |
| **L35** | Las cuatro modalidades son `Lote`s sobre la **misma** Red; la página no contiene validación de cantidades (revisión estática); `previsualizar` rechaza por la guarda de la Red |
| **L2** | `facetas`: el complemento de una fibra es relativo a los conocidos; mutante «complemento sin máscara» ⇒ falla |
| **L23 / L25** | El perfil visitante filtra preguntas y campos (VP6) y la prueba lo marca como **no** confidencial (frontera). `Compose` con procedencia en las páginas multiámbito (fases 8+) |

**Verificación visual (no sustituye a las leyes).** Chromium funciona en este entorno. Con la librería instalada (`instalar-ui`) y una `Γ` de ejemplo (la del oráculo de aceptación):
- **Capturas** de las seis páginas y la barra, en **escritorio (1280×800) y móvil (390×844)**, tema claro y oscuro, perfiles propietario, cajero y visitante (tienda), en los estados: vacío (solo bodega), con datos, carrito con un bloque rechazado, corte histórico (`corte ≠ cabeza`), déficit (`libre < 0`) y panel «Ahora» con apartados y tránsito.
- **Comprobaciones automáticas sobre el DOM:**
  - sin desplazamiento horizontal;
  - toda etiqueta de estado lleva texto (UI‑5);
  - el botón principal del POS es visible sin desplazar en móvil;
  - objetivos táctiles ≥ 44 px;
  - la barra común tiene los mismos controles en el mismo orden (I21);
  - con `corte ≠ cabeza` todo control de escritura está inhabilitado (I20);
  - ninguna tarjeta contiene la cadena `undefined` (UI‑6);
  - **la cifra mostrada es igual al observable** (se lee el texto del DOM y se compara con `preguntar`; escritorio y móvil muestran las mismas cifras);
  - ningún campo de `ocultar` en la tienda.
- **Revisión estática de `kobalt/app/`:** importaciones (solo `puerta/index.mjs`), lista negra de nombres de transiciones y de comparaciones sobre cantidades, ausencia de `=== perfil`.
- **No se verifica visualmente:** nada de lo que dependa de leyes (admisión, conservación, autoridad). Eso es de las pruebas.

---

## 9. Fronteras [L]

1. **Distribución y durabilidad.** La puerta se prueba en un proceso con el almacén en memoria. No garantiza consenso, exclusión entre dispositivos ni durabilidad (M5). La serialización de transacciones entre pestañas y la durabilidad de IndexedDB son supuestos empíricos para la **fase 5**.
2. **Autoría.** `u` es una afirmación (L23). `actor` es una atribución declarada, no una autoridad.
3. **Lectura.** El perfil visitante y los campos ocultos son una **orientación**, no control de acceso (L23). La tienda pública real exige una proyección publicada.
4. **Pérdida del token `ρ_p`.** Si el borrador se pierde (cierre sin persistir, otro dispositivo), reenviar la misma venta crea **otra** (otro `ρ_p`) y la puerta no puede detectar que es la misma intención: no hay identidad de la que derivarla (P‑J). Mitigación: borradores persistentes y «ventas recientes» visibles en `pos`.
5. **Compromisos desde otro dispositivo (fase 7).** Aquí la puerta solo constituye en el dispositivo del dueño; en otro, `NO_CONSTITUYENTE`. No hay bandeja de solicitudes.
6. **Cortes por fecha.** Sin sello en las acciones, el corte es por posición y época (§7.1).
7. **Imágenes.** Solo se manejan `Q`; guardar y servir bytes es de la fase 5.
8. **Coste.** `kardex` e `historia` recorren `Γ` (O(\|Γ\|), L34); abrir `Γ` verifica la cadena completa (`nodo.verificarAlAbrir = completa`). Con trayectorias grandes, la interfaz puede notarlo; los snapshots y la materialización son configuración del nodo.
9. **La vista previa** es el estado de la cabeza **en un instante**; el compromiso decide (L8).
10. **Librería visual.** El HTML de `index`, `estructura*` y `thema-lab` llegó sin marcado (doc de revisión §5): hay que reconstruir el shell desde `data-k-*` o recuperarlo del zip. La verificación visual depende de ello.
11. **Visual.** La verificación visual comprueba la traducción, no la matemática.

**Precisiones a documentos previos:** las de la cabecera (P‑I…P‑N). Ninguna contradice una ley y todas están resueltas en esta spec y en el Anexo D de la fase 3.

---

## 10. Espacio de configuración (L31)

Todos son parámetros de `Γ_{Nodo_d}` con regla `kobalt.puerta@1` (§3), salvo los marcados «`Γ` de dominio». **No son preguntas al usuario.** La representación admite todo el espacio de cada fila.

| Parámetro | Posibilidades | Qué implica (ley o teorema) | Valor inicial |
|---|---|---|---|
| `puerta.carrito.modo` | `porAccion` / `todoONada` / `{cada: k}` / cualquier partición en bloques | T‑P7: define los conjuntos comprometibles. `todoONada` acotado por `dominio.lote.máximo` y exige un solo ámbito (L20) | `porAccion` |
| `nodo.reintentos` (existente) | `0..k` | L8: reevaluar sobre la nueva cabeza siempre es correcto; solo cambia la latencia | `3` |
| `puerta.sidDominio` | cadena de dominio de `deriveSid` | T‑P3/T‑P4: cambiarla rompe la identificación de propuestas ya enviadas (afecta solo a nuevas) | `"kobalt:puerta:bloque:1"` |
| `puerta.vistaPrevia` | `siempre` (en cada edición) / `alPedir` / `obligatoria` antes de `proponer` | T‑P5: coste frente a visibilidad | `siempre` en `pos`, `alPedir` en el resto |
| `puerta.contexto.corteInicial` | `cabeza` / `σ` fijo | L21 | `cabeza` |
| `puerta.lectura` (`λ` inicial) | `stock.medida ∈ {libre, prudente, físico}`; `stock.bajo = {num, den}`; `bodegas.ver`; `agregación ∈ {sumaDeMáximos, máximoDeSuma}`; `precio` (expresión); `ahora.familias`; `vistaPública.cantidad ∈ {oculta, siempre}` | L11, L32: ninguna cambia un hecho, solo la pregunta | los de §7.1 |
| `puerta.etiquetas` | cualquier lista ordenada de `{etiqueta, cuando}` para `cumplimiento`, `cobro`, `stock` | §7.5: total si acaba en `verdadero`; cambiar la tabla no reinterpreta `Γ` | las de §7.5 |
| `puerta.plantillas` | cualquier conjunto de plantillas (datos) | Anexo D.3, L16: las capacidades que exige cada una se derivan de sus tipos (E4) | §5.1 |
| `puerta.modalidadPrincipal` | `entregarAhora` / `apartar` / `pedido` / `registrar` | Anexo D.3: solo el botón principal; las otras tres siguen disponibles | `entregarAhora` |
| `puerta.nombresDeHechos` | `{transición ↦ texto}` y `{modalidad ↦ etiqueta}` | UI‑4: los botones nombran hechos | «Registrar venta (descuenta stock)»; «Apartar (reserva stock)»; «Tomar pedido (sin reservar)»; «Anotar venta (sin tocar stock)» |
| `puerta.cargaInicial` (`producto.nacer`) | `vía ∈ {contar, ingresar}`; `motivo` | `contar` deja un sobrante `descuadre < 0` (fase 3 §9.7); `ingresar` registra una entrada declarada | `contar` con `motivo = 'carga inicial'` |
| `puerta.vistas` | por perfil: `páginas`, `ocultar: [campos]`, `alcanceLectura ∈ {todo, propio}` | L16 (qué ofrece la UI, no qué autoriza), L23 (no es control de lectura) | §7.4 |
| `puerta.preguntasPúblicas` | lista de nombres de pregunta | VP6 | `tiendaCatálogo`, `tiendaFicha`, `facetas` públicas |
| `puerta.suscripción` | `sondeoMs`, `evento local` / `sondeo` / ambos | T‑P11 | evento local + sondeo 2000 ms |
| `puerta.borradores` | `memoria` / `sessionStorage` / `IndexedDB` | Límite 4: la durabilidad del token `ρ_p` | `IndexedDB` (en pruebas: memoria) |
| `puerta.auditoríaRechazos` | `ninguna` / trayectoria **local** del nodo | L14: un rechazo no es un hecho de dominio; si se quiere auditar, va en `Γ_{Nodo_d}`, nunca en la de dominio | `ninguna` |
| Presencia de `pedido.actor` (`Γ` de dominio, Anexo D) | declarada / ausente | `G^par`: se puede añadir, no quitar | declarada |
| Compatibilidad del tipo `venta` (`Γ` de dominio) | `venta.pedido` como padre / referencia opcional sin padre (modo de migración de una `Γ` previa) | Anexo D.1: el segundo mantiene dos orígenes del canal | padre |

**Supuestos empíricos sin verificar (no bloquean esta fase):** serialización `readwrite` entre pestañas y durabilidad estricta en IndexedDB (fase 5, probeta).
**Cambios pequeños que esta fase pide a otras:**
1. **Núcleo [P]:** exportar `autorizado` y `coincide` desde `nucleo/index.mjs`, para que `q_puede` use la misma función que G1. Es una exportación, no un cambio de semántica (ya hay otros pendientes anotados en la bitácora).
2. **Fase 3:** el Anexo D (Forma, plantillas, `hijos`, VF11–VF13) y la exposición de la **expresión** `admite.fijar` de `venta.variante` para `catálogoVendible` (una sola expresión para la guarda y el catálogo).
3. **Fase 2:** ninguno.

---

## Anexo A · Precisión del coordinador tras recibir el zip original de Kobalt UI (2026‑11‑12) [P]
Pendiente de ratificar por el matemático. Fuente: `kobalt/docs/2026-11-12_REVISION_UI_Y_POS_V3.md`, Parte IV.
1. **Sello de evidencia.** Todo observable del «mundo» de la puerta lleva `evidencia = {estado, cobertura, detalle}`. `estado` toma sus valores de la **resolución** del núcleo (`EXACT`, `CHAIN`, `FORK`, `GÉNESIS_DISTINTA`, `SIN_EVIDENCIA`) o `INDETERMINADO` mientras se calcula. `cobertura` es el corte («corte `n` de `N`») y la lectura vigente. `detalle` es texto. El shell lo muestra en su ranura `renderEvidence`. No añade ámbito ni estado: es una proyección del `Ctx` (L22, L27).
2. **Las páginas son el shell con una app nuestra.** Cada página específica arranca `KobaltRuntime.start` con un mundo derivado de la puerta y `initialApp` propia. Sus apps se registran con `registerApp` y no usan `KobaltSemantics` ni las apps de demostración.
3. **Material de terceros.** La librería no se copia al repositorio: se instala en `kobalt/app/ui/` (ignorada) con comprobación de hashes, y las páginas de entrada se **generan** desde su `index.html`.
