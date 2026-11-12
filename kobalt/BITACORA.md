# Kobalt — Bitácora de razonamiento y proceso

> **Para quien retome el trabajo (incluido yo mismo en otra sesión):** lee esta bitácora **antes** que nada. Después lee `CLAUDE.md` y `kobalt/CONSOLIDACION_Y_PLAN.md`. Aquí está el *porqué* de cada decisión, lo que aprendimos, el estado exacto y el siguiente paso. Se escribe en orden cronológico inverso (lo más reciente arriba en §3) y se actualiza **en cada paso significativo**.

---

## 1. Estado actual (actualizar siempre)

**Rama de trabajo:** `claude/ecstatic-sagan-jiv9ev`. El repositorio es **público**; el usuario autorizó subir todo el material propio («push todo»), pero el sistema de permisos bloqueó subir una conversación compilada del usuario, así que el material del usuario no publicado (código v2/v3, conversaciones) **no se copia al repo**. Se usa desde el scratchpad como referencia.

| Pieza | Ruta | Estado | Última referencia |
|---|---|---|---|
| Núcleo general (fase 1 + enmienda E1–E8) | `kobalt/src/nucleo/` | **Integrado** (PASS + CONFORME) | `2e8d0d3` |
| Preguntas (fase 2) | `kobalt/src/preguntas/` | **Integrado** (PASS + CONFORME, tras 1 objeción y 1 VETO corregidos) | `ff96a40` |
| Forma y red de flujo (fase 3) | `kobalt/src/dominio/` | **Se rehace** según el anexo C. La versión `94726c7` tuvo PASS y OBJECIONES (4). **Modelo y pruebas del anexo C ya entregados y definitivos** (123 leyes, 17/17 mutantes; 25 pruebas de contrato fallan hasta que exista `src/dominio/`; commit `5391e50`, aunque diga «WIP»). **Falta:** el Anexo D (`pedido`) del matemático y la implementación | spec `…fase3-forma-y-flujo.md`, anexos C y D |
| Fase 6a: puerta (preguntar/proponer) y páginas específicas sobre Kobalt UI 2.2.1 | `kobalt/specs/2026-11-12_fase6a-puerta-y-paginas.md` | **Spec en curso** (matemático). Análisis hecho: `docs/2026-11-12_REVISION_UI_Y_POS_V3.md` | `f0354dc` |
| Fase 4 (alta e importación), 5 (materialidad IndexedDB), 6b (páginas), 7 (Drive), 8+ (comercio) | — | Pendientes | `CONSOLIDACION_Y_PLAN.md`, parte IV |

**Siguiente paso concreto (actualizado 12‑nov, tarde):**
000. **(Requisito de entrega)** Al final: `empaquetar.mjs` → `dist/kobalt-app-sin-ui.zip` (GitHub) y `kobalt-app-con-ui.zip` (se entrega al usuario), verificados bajo subruta y con `.mjs` mal servido. Preguntar al usuario, **solo al entregar**, si el paquete con la librería va también a GitHub.
00. **(Más reciente)** Con el zip original: lanzar un implementador para el **andamiaje del shell** (`kobalt/app/`: `instalar-ui`, arranque propio, una app mínima registrada, páginas generadas, verificación en Chromium). Es independiente de la fase 3 y reduce el riesgo de la fase 6b. Las apps de negocio esperan a fase 3 + puerta.
0. **(Última actualización, noche)** El matemático **ya entregó** el Anexo D. Se lo paso al verificador de la fase 3 como incremento (lista D.7 en su informe: Forma con `pedido`, plantillas `plantillaLínea`, `hijos`, generador, VF11–VF13, casos dirigidos, aceptación reescrita, mutantes). Después: implementador de la fase 3 (con `nacimientos` y el `pedido`). La fase 6a (puerta) queda como spec y espera a la fase 3 y al adaptador (fase 5).
   (Nota anterior) El verificador de la fase 3 **ya entregó** sin el Anexo D. Como el `pedido` es solo un cambio de datos en `FORMA_INICIAL` (la Red no cambia), se incorpora como **incremento pequeño** del modelo y las pruebas cuando el matemático termine, y **antes** de lanzar al implementador. Dos requisitos que ya conoce el implementador: añadir el monoide `nacimientos` a `kobalt/src/preguntas/monoides.mjs` (con sus leyes) y reutilizar el lenguaje y el catálogo de la fase 2.
   El matemático escribe (a) la spec de la puerta y las páginas y (b) el **Anexo D** de la fase 3 (entidad `pedido` + modalidades de venta como plantillas). Cuando termine, pasar al verificador de la fase 3 (`a60d140…`) la lista de cambios del Anexo D **antes** de que entregue, para que el dominio se rehaga una sola vez.

**Pasos que siguen (sin cambios):**
1. Cuando el verificador de la fase 3 entregue el modelo y las pruebas del anexo C: commit, y el implementador de la fase 3 rehace `kobalt/src/dominio/` sobre la rama con la fase 2 integrada (reutiliza `evaluar`, `validarExpr`, `registrarLector` y `monoide` de `kobalt/src/preguntas/`; añade el monoide `nacimientos`).
2. Dos puertas: verificador (PASS/VETO) + revisor conceptual (CONFORME/OBJECIONES). Integrar solo con ambas.
3. Luego, la fase 4 y el camino a v4 (`docs/2026-11-12_V3_MODULAR_Y_CAMINO_V4.md`).

**Worktrees vivos** (en `.claude/worktrees/`, ignorados por git): `agent-afc439…` (núcleo, ya integrado), `agent-a4131b…` (fase 2, ya integrada), `agent-ae899d…` (fase 3, rama `fase3-dominio`, versión con objeciones). Se pueden borrar los ya integrados.

**Pendientes no bloqueantes anotados:**
- **Núcleo** (anexo C de la enmienda):
  - `readmitirDe` debe lanzar ante un nodo mal formado;
  - pasar `S` congelado a `f`;
  - `parametrosEn` para no reconstruir `S_m` al reutilizar;
  - exportar `estadoPorSnapshot` (la fase 2 lo duplica);
  - `monoide.plegar(lista)` opcional para materializar escaneo y segmentos en O(n);
  - el `Fold` copia `Sids` en cada paso (posible causa del O(n²) medido).
- **Fase 2:** residuo [L] de la regex (`ventaNacional` escaparía); `distribuir` evalúa `obs` con `parametros: {}`.

---

## 2. Principios que el usuario nos enseñó (no olvidar nunca)

1. **Primero claridad matemática, luego conceptual, luego código.** Siempre en ese orden, también al explicar.
2. **No es un inventario tradicional.** Nada de tablas con `stock` que se sobrescribe, ni motores por funcionalidad. Las funcionalidades **emergen** de recorrer las entidades.
3. **No preestablecer mecanismos ni hacer preguntas tradicionales** (L31). Si la matemática abre varias posibilidades, se implementa el mecanismo general y se elige por configuración manual mínima (dato del contrato). Error que cometí: hacerle al usuario siete preguntas que eran posibilidades de la misma matemática. Corrección: fijar frente a abrir.
4. **Preguntarle a la arquitectura, no al usuario.** «Recuerda preguntar a la arquitectura y entenderla; eso es mejor que predefinir mecanismos.» No hacer preguntas al usuario salvo contradicción con una ley o un supuesto empírico.
5. **Dos entidades fundamentales:** el **Producto** (forma + identidad, nace una vez) y la **Trayectoria** `Γ` (todas las acciones comprometidas). Todo lo demás son proyecciones. Nombre fijado: «Trayectoria» (causal); «el Cauce compromete, la Trayectoria recuerda, la Fibra recorre».
6. **La trayectoria constituye; la ficha expresa** (decisión del usuario, interacción 3). Editar la ficha emite un propósito; el cambio existe cuando se compromete en `Γ`.
7. **Menos mecanismos, más claridad conceptual.** Mejorar quitando piezas y explicando qué ley las sustituye.
8. **Las pruebas refuerzan la matemática; no son el objeto último.** Si el código refleja la matemática, funciona salvo error de traducción o de la matemática. De ahí la **proporcionalidad** (CLAUDE.md): ciclo completo solo para el núcleo.
9. **Fases, agentes y worktrees son disciplina de desarrollo, no arquitectura.** Y en los informes conviene empezar por las leyes, no por el proceso.
10. **Kobalt se escribe con K** (el usuario dicta por voz; Whisper puede escribir «Cobalt»).
11. **Interfaz:** «Registrar venta (descuenta stock)» como acción por defecto; nombrar los hechos en los botones.
12. **Persistencia del proceso:** mantener esta bitácora.

---

## 3. Cronología de decisiones y su porqué (más reciente arriba)

### 2026‑11‑12 (noche) · El entorno bloquea publicar los archivos subidos por el usuario
- **Qué intenté:** conservar en `kobalt/referencias/` el material de referencia del usuario (zips v2/v3/POS/UI, HTML, 3 conversaciones; unos 2,6 MB) para **persistencia entre sesiones**, y vendorizar la librería Kobalt UI. **Antes** escaneé todo en busca de secretos: ninguno; los correos y teléfonos son ficticios (`@example.test`, `555`).
- **Resultado:** el clasificador de permisos denegó la copia («procedencia de fuente sensible»). Es la **segunda vez** (la primera fue con la compilación de las últimas tres interacciones). La autorización dada en el chat no lo levanta.
- **Qué hice:** **no rodear** el bloqueo. Revertí el diseño: `kobalt/app/ui/` sigue ignorada por git, `instalar-ui` la extrae del zip, y el implementador del andamiaje volvió a ese diseño. Lo nuestro (docs, specs, tests, código) se publica con normalidad.
- **Riesgo que queda:** el material de referencia vive solo en el scratchpad y en los uploads de esta sesión, que se pierden al reciclar el contenedor. Mitigación: nuestros docs ya recogen lo esencial (veredictos, divergencias, teoremas) y las specs cuentan con escenarios escritos con nuestras palabras. **El usuario puede cerrar el riesgo** subiendo él mismo los archivos a `kobalt/referencias/` y `kobalt/app/ui/` (GitHub → Add file → Upload files) o añadiendo una regla de permiso.
- **Efecto en la entrega (Parte VI):** `sin-ui` → GitHub; `con-ui` → entrega directa al usuario (que puede subirlo él a su repo si quiere).

### 2026‑11‑12 (noche) · Autorización permanente de publicar
- **Dicho por el usuario:** «puedes publicar lo que quieras siempre». Es una autorización **durable** (queda en `CLAUDE.md`, sección «Publicación»), no un permiso puntual.
- **Alcance que le doy:** su material propio (librería Kobalt UI, v2/v3, POS V3, conversaciones, paquetes) y todo lo nuestro, en **este** repositorio. **No** cubre secretos, credenciales ni datos personales de terceros: escanear antes de publicar material nuevo.
- **Efectos:** (1) la librería Kobalt UI se **versiona sin modificar** en `kobalt/app/ui/` con sus hashes (la prueba estática pasa de «no existe» a «coincide byte a byte con `SHA256SUMS_2_2_1.txt`»); (2) **ambos** zips pueden ir a GitHub; (3) el material de referencia del usuario se conserva en `kobalt/referencias/` para **persistencia entre sesiones** (hasta ahora vivía en el scratchpad, que se pierde al reciclar el contenedor).
- **Sigue vigente la frontera técnica:** un sistema de permisos del entorno puede bloquear una acción concreta aunque el usuario la autorice; si ocurre, se informa en vez de rodearlo.

### 2026‑11‑12 (noche) · Requisito de entrega: un `.zip` para probar en GoDaddy y en GitHub
- **Pedido del usuario:** «cuando finalices, un `.zip` que también esté en GitHub, para probarlo en GoDaddy».
- **Consecuencias de diseño (ya en `CONSOLIDACION_Y_PLAN.md`, Parte VI):** (1) rutas **relativas**, que funcione en una subcarpeta; (2) Apache puede servir `.mjs` como `octet-stream` y el navegador rechaza el módulo → el empaquetado emite `.js` y un `.htaccess`, y se verifica con un servidor que sirve `.mjs` mal a propósito; (3) **los módulos solo se habían probado en Node**: la primera prueba en Chromium real será la del paquete; (4) sin dependencias ni compilación en el servidor.
- **Dos paquetes:** `con-ui` (incluye la librería del usuario; se entrega **solo a él**) y `sin-ui` (apto para GitHub). **Decisión que es suya, se pregunta al entregar:** si el paquete con la librería también va al repositorio público. Hasta entonces solo se publica el `sin-ui`.
- **Mecánica:** `kobalt/app/empaquetar.mjs` genera ambos en `dist/` con `LEEME-GODADDY.md`. GitHub: el `.zip` se versiona en `dist/` y se enlaza por URL `raw` (no hay herramienta de Releases en esta sesión). Entrega directa con `SendUserFile`.
- **Recordar:** la app es local-first, **la base vive en el IndexedDB de cada navegador/origen**; probar en GoDaddy no comparte datos entre dispositivos. Eso no es un fallo: es la frontera [L] ya declarada (sin sincronización multiusuario hasta la fase 7).

### 2026‑11‑12 (noche, tarde) · Llega el zip original de Kobalt UI: el shell se puede reutilizar
- **Verificado:** hashes de la release OK, el verificador propio de la librería da 66/66, y el `index.html` (shell) sí trae marcado (202 etiquetas). El `.txt` solo difería en un salto de línea final: el análisis previo vale. Demo real renderizado en Chromium (escritorio y móvil) sin errores.
- **Hallazgo clave:** el shell tiene una ranura de **evidencia** `{status, coverage, detail, tone}` (`FOUND / FIXTURE_COMPLETE · …`, `INDETERMINATE · preparando proyección`). Es la forma visible de nuestra **resolución + corte** (EXACT/CHAIN/FORK/NO_EVIDENCE de KOB2). Propuesta [P] (Anexo A de la spec 6a, por ratificar): todo observable lleva `evidencia = {estado, cobertura, detalle}`.
- **Punto de unión exacto:** `KobaltRuntime.start({world, initialApp, theme, density})` y `KobaltUI.registerApp({id, label, group, icon, order, mount(host, projection, shell, params)})`. El shell da `openDialog/notify/navigate/selectTab/downloadCsv`. **Ninguna app de la librería escribe**: las nuestras llamarán a `puerta.proponer`.
- **Decisión:** páginas específicas = el **mismo shell** con una app propia como `initialApp`; se reutilizan shell, CSS, temas, densidad y componentes; no se usan sus 8 apps ni `KobaltSemantics`. **Material no publicado:** script `instalar-ui` extrae el zip a `kobalt/app/ui/` (git lo ignora), comprueba hashes y **genera** las páginas desde su `index.html`.

### 2026‑11‑12 (noche) · El matemático entrega la puerta (fase 6a) y el Anexo D (`pedido`)
- **Entregado:** `kobalt/specs/2026-11-12_fase6a-puerta-y-paginas.md` (puerta con 4 verbos, teoremas T‑P1…T‑P11, perfiles, adaptador, 6 páginas, Lk → verificación, 18 parámetros con valor inicial) y el **Anexo D** de la fase 3 (tipo `pedido`, modalidades de venta como plantillas, VF11–VF13).
- **Error mío corregido por el matemático (lección):** mi Teorema 3 del doc de revisión era **circular** (`sid_i = 𝔇(ρ, i)` con `ρ` = ID del pedido, que no existe antes del primer compromiso). Correcto: dos referencias, `ρ_p` (token de intención en la página, del que se derivan los `sid`) y `ρ_ped` (ID del pedido); y `ρ_p` no puede derivarse del contenido. **Segundo error mío que el procedimiento atrapa** tras `P_j·P_i⁻¹`. Lección: un teorema con una identidad que se usa antes de existir es sospechoso; comprobar siempre el orden de existencia.
- **Decisiones del matemático (todas datos o parámetros):** el modo de carrito es una **partición en bloques** (`Lote`): `porAccion` (inicial) y `todoONada` son los extremos de una familia (tope `dominio.lote.máximo`); `pedido` hereda `canal` y `cliente` por `padre` a las líneas (la Red no cambia; **solo si se heredan por `padre`**); `Nacer:pedido` va en capacidades y no en el alcance; etiqueta visible de la modalidad sin efecto: «Anotar venta (sin tocar stock)» para no confundirla con «Registrar venta» (= entregar ahora). `G^par` rechaza `venta.padre` sobre una `Γ` con ventas: el anexo rige para `Γ` nuevas.
- **Cambios pequeños a otras fases:** núcleo debe **exportar** `autorizado` y `coincide` (sin cambio de semántica); fase 3 expone la expresión `admite.fijar` de `venta.variante`.
- **Frontera honesta:** el perfil visitante filtra preguntas y campos pero **no es control de lectura** (L23).
- **Hecho:** la pregunta de coherencia de `AGENTS.md` ya está en `CLAUDE.md` (el matemático creyó que faltaba).

### 2026‑11‑12 (tarde) · Revisión de Kobalt UI 2.2.1 y del POS V3 → páginas específicas con nuestra lógica
- **Qué llegó:** (1) un `.txt` unificado con la librería visual **Kobalt UI 2.2.1** (`kobalt.css`, `kobalt.js`, contratos, Studio, 8 apps de demo); (2) un zip del **POS V3 «venta por acciones»** (páginas `operar/*.html`, `tienda/*.html`, controladores, doc 07, `AGENTS.md`). Petición: usar nuestra lógica en páginas HTML específicas que luzcan como el demo.
- **Hallazgo técnico:** el `.txt` **perdió las etiquetas de los `.html`** (index, estructura*, thema-lab). CSS y JS íntegros. El shell hay que reconstruirlo desde los selectores `data-k-*` de `kobalt.js` o pedir el zip original. **Viabilidad visual comprobada** en Chromium (que aquí sí funciona): `body.k-body` + `kobalt.css` + `kobalt.js` reproduce tarjetas, panel de propuesta y botón del demo.
- **Idea clave de la librería:** `L → Π_L → 𝒪 → Visual`. `kobalt.js` solo admite un «mundo» ya calculado y no contiene lógica de negocio. Ese es el punto de unión: **observables hacia arriba (preguntas), propuestas hacia abajo (plantillas δ)**. Su doctrina (`λ_req ∈ Λ_C`, `λ_eff = Admit(…)`, customizar = elegir un punto admisible) **es L31 aplicada a lo visual**.
- **Divergencias que NO se importan** (la librería lleva dominio tradicional): `stockState(stock, target)` con el 0.3 incrustado; `order.status` como etiqueta única escrita (nosotros: `obs` sobre el marcado de depósitos); `facts` primarios y `demo.data.patch.js` que edita datos (nosotros: proyecciones; editar es proponer); carrito por producto (nosotros: por variante con precio pactado). Regla: **se conserva la realización visual, se descarta su semántica y su mundo**.
- **Del POS V3 se adopta:** venta = **referencia + acciones** (la atomicidad corta por acción, no por carrito); la propuesta vive en la página y su rechazo no es un hecho (L14); la vista previa corre sobre una copia; y la **pregunta de coherencia** de `AGENTS.md` (ya en `CLAUDE.md`).
- **Teoremas del análisis:** (2) la atomicidad del carrito es **configuración** (`porAccion` | `todoONada`); (3) el reintento es `Δ` con `sid_i = 𝔇(ρ, i)`; (4) la vista previa de una secuencia es un plegado de admisiones, y su diferencia con la confirmación es L8, no un error.
- **Decisión de diseño (solo datos):** la referencia de venta es una entidad **`pedido`** que nace en el mismo compromiso que su primera línea (`Lote{Nacer:pedido, Nacer:venta}`). Descarta una restricción entre entidades. La Red no cambia. Es la demostración de L35 con un caso real. Alternativa descartada: atributo `referencia` + restricción de contexto.
- **Publicación:** la librería y el POS V3 son material del usuario **no publicado**. Las páginas las referencian por `kobalt/app/ui/` (ignorada por git) con un script que las extrae del zip. El repo público contiene nuestras páginas y controladores, no su librería.
- **Pendiente para el usuario (no es una decisión, es material):** reenviar el **zip original** de Kobalt UI para recuperar el shell (`index.html`) con su marcado.

### 2026‑11‑12 · Fase 2 integrada; fase 3 se rehace; bitácora
- **Fase 2 · VETO del verificador:** `materializar` se saltaba la regla L34 (devolvía «OK» con una materialización vacía para derivadas inválidas). Arreglo de 2 líneas propuesto y probado por el verificador (15/15); el implementador lo aplicó (`ff96a40`). Comprobé que el diff es exactamente ese arreglo y que pasan 179/179 con 3 semillas, e integré por avance rápido. *Por qué no volví a lanzar al verificador:* ya había probado exactamente ese cambio y la proporcionalidad lo permite en dominio y preguntas.
- **Fase 3 · OBJECIONES (4) del revisor**, todas válidas:
  1. **`T` revalidaba las guardas al leer** (viola el Teorema 2: si una guarda se corrige, la historia se vuelve ilegible). Se separa `efecto` total de `guarda`.
  2. **La «actividad» estaba incrustada** en el código pero afectaba a la admisión (unicidad κ). Pasa a ser dato de la Forma.
  3. **La configuración de lectura estaba fija.** Pasa a ser parámetros de la pregunta.
  4. **Había un segundo evaluador de expresiones con otra semántica**, incluido un desbordamiento silencioso. Se reutiliza el de la fase 2.

  Además, el verificador encontró un **hueco de la spec**: `G^par` permitía reordenar los índices de una familia con marcado. Todo quedó en el **anexo C** de la spec de la fase 3. También se resolvió la tensión «`T` usa secuencia, pero secuencia no se materializa»: `T` es la lista de nacimientos (monoide `nacimientos`), no `Γ` filtrada.
- **v3 modular del usuario** (capas core, api y ui separadas): la separación hace posible el **camino a v4**: conservar `ui.js` y su CSS y sustituir `core.js` y `api.js` por nuestros módulos mediante un adaptador de compatibilidad (`docs/2026-11-12_V3_MODULAR_Y_CAMINO_V4.md`). Sus mejoras de interfaz aún no estaban aplicadas.
- **Interfaz v3:** «pantalla = Π(realidad@corte, capacidades, propósito)»; el corte y la lectura pasan a la barra global; botones que nombran los hechos; la ficha es la sección editable en su sitio; filtros desde la Forma; la historia de cada valor; panel «**Ahora**» = marcado de los depósitos intermedios (sin módulo de tareas); vista previa universal de `δ` (`docs/2026-11-12_INTERFAZ_V3_Y_MEJORA.md`).
- **Ampliación con la v3 y la revisión crítica de ChatGPT** (`docs/2026-11-12_AMPLIACION_V3_Y_REVISION.md`):
  - **Toda pregunta es homomorfismo** (a `End(S)`). Lo que se clasifica es el **tamaño** del monoide mínimo (cociente de Nerode), no si es monoidal o no.
  - **Las guardas viven en la admisión, no en la lectura** (Teorema 2).
  - **Hay un solo verbo:** una acción es un elemento `δ` del monoide producto `∏ M_clase(k)`. Nacer, Fijar, Añadir, Quitar y Disparar son formas de `δ`; Lote es el producto; los nombres de dominio son plantillas.
  - **Exhaustividad:** toda funcionalidad cambia, lee, compara o separa autoridad. No hay una quinta clase, así que no hacen falta más mecanismos; solo pueden faltar **hechos**.
  - Las 4 modalidades de venta de la v3 son plantillas sobre la misma red (0 discrepancias en 22.804 acciones).

### 2026‑11‑11/12 · Análisis de la v2: ley de flujo (L35)
- La lógica de existencias, ventas, devoluciones y cobros de la v2 es **una red de depósitos (red de Petri)** con una sola guarda (`m ≥ 0` en los depósitos restringidos). Comprobado contra el `core.js` de la v2: **0 discrepancias en 23.182 acciones**. `Contar` mueve la diferencia a `descuadre` (no reinicia).
- Además: **identidad por nacimiento** (ID = posición del compromiso de nacimiento, sin contadores), una Forma única, cinco verbos genéricos y una puerta de preguntas.

### 2026‑11‑11 · Álgebra de preguntas (L32–L34)
- `Γ` es el **monoide libre**. Por la propiedad universal, basta decir qué aporta **una** acción. Una pregunta es `(φ, f, M, obs, ventana)`.
- La arquitectura decide sola:
  - incrementalidad;
  - qué guardar (Nerode);
  - intervalos: en un grupo, por diferencia de prefijos `P_i⁻¹·P_j`;
  - distribución (si es conmutativo).
- **Error mío corregido por el matemático:** yo había escrito `P_j·P_i⁻¹`, que solo vale en grupos conmutativos. Lección: comprobar en estructuras no conmutativas (S₃).

### 2026‑11‑11 · Producto y Trayectoria
- **Teorema de autoridad única** (modelo B).
- **Granularidad:** el modelo A es el B con una partición por producto (un retículo de particiones).
- **Actualización perdida:** la trayectoria debe ser de **acciones**, no de estados.
- **Clases de característica** = monoides (asignación, cantidad, conjunto, ciclo, referencia).
- La v1 usa **una sola Trayectoria local**.

### 2026‑11‑11 · Fase 1: el ciclo completo funcionó
- Núcleo: 84 pruebas → PASS, pero el revisor dio **OBJECIONES (5)** que las pruebas no veían:
  - caché de estados aceptada sin verificar;
  - predicado `sid` no estable;
  - configuración incrustada;
  - preguntas sobre tramos inexpresables;
  - Δ comparando identidades por referencia.

  Se resolvió con la **enmienda E1–E8**, aplicada con una nueva doble puerta, y se integró.
- **Lección:** el verificador comprueba la **traducción**; el revisor, el **significado**. Las dos hacen falta.

### 2026‑11‑11 · Consolidación y plan
- **Coordenadas emergentes** (L28): el slot es el orden de nacimiento.
- **Alineación implícita** (L29): los vectores se alinean con `T` sin repetir IDs.
- **Diferencia** (L30): todo «trabajo» es `Δ(objetivo, actualidad)`.
- **Tabla de mecanismos tradicionales y de dónde emergen.**

### 2026‑11‑11 · Skills, agentes y canon
- Skills `kobalt-kernels` (leyes, glosario, prohibidos) y `kobalt-verificar-leyes` (oráculo `Fold`, generadores, reducción por prefijo, mutantes).
- Cuatro agentes: matemático, verificador, implementador y revisor.
- Kernels originales copiados sin modificar (comprobados por SHA‑256).
- El modelo de referencia H/A/P con mutantes demostró que las pruebas detectan el doble descuento y la guarda convertida en invariante.

---

## 4. Lecciones de proceso (cómo trabajar bien aquí)

- **Comprobar antes de afirmar.** Cada afirmación lleva [T] [V] [D] [P] o [L]. Verifiqué con `node` las afirmaciones clave (monoides, red de Petri, ventanas).
- **Una prueba que nunca falló no prueba nada:** mutantes. Pero con proporcionalidad.
- **Cuando un agente encuentra un error en una prueba** (por ejemplo, la regex `venta` coincidía con `ventana`), se corrige la prueba acotándola, nunca debilitándola, y se deja constancia.
- **No copiar material del usuario al repo público** sin autorización explícita para ese material.
- **Los límites de uso cortan agentes**: retomarlos con SendMessage (conservan el contexto) en vez de lanzar agentes nuevos.
- **El hook de parada exige commit y push:** guardar el trabajo en curso de los agentes como commits «WIP» etiquetados.
- **Integrar por avance rápido** cuando la rama del worktree desciende de la rama de trabajo; verificar siempre en la copia principal después.

---

## 5. Mapa de documentos (qué leer para qué)

| Para… | Leer |
|---|---|
| Las leyes (L1–L35) | `.claude/skills/kobalt-kernels/references/leyes.md` |
| El plan y las fases | `kobalt/CONSOLIDACION_Y_PLAN.md` |
| Producto y Trayectoria, clases | `kobalt/docs/2026-11-11_ANALISIS_PRODUCTO_Y_TRAYECTORIA.md` |
| Preguntas como homomorfismos | `kobalt/docs/2026-11-11_ALGEBRA_DE_PREGUNTAS.md` |
| La v2, la red de depósitos y L35 | `kobalt/docs/2026-11-11_ANALISIS_INVENTARIO_V2.md` |
| Verbo único, exhaustividad, v3 | `kobalt/docs/2026-11-12_AMPLIACION_V3_Y_REVISION.md` |
| Interfaz | `kobalt/docs/2026-11-12_INTERFAZ_V3_Y_MEJORA.md` |
| Camino a v4 | `kobalt/docs/2026-11-12_V3_MODULAR_Y_CAMINO_V4.md` |
| Kobalt UI 2.2.1, POS V3 y páginas específicas | `kobalt/docs/2026-11-12_REVISION_UI_Y_POS_V3.md` |
| Specs | `kobalt/specs/` (fase 1 + enmienda, fase 2, fase 3 con anexos A–C) |
