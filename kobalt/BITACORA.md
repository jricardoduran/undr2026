# Kobalt — Bitácora de razonamiento y proceso

> **Para quien retome el trabajo (incluido yo mismo en otra sesión):** lee esta bitácora **antes** que nada. Después lee `CLAUDE.md` y `kobalt/CONSOLIDACION_Y_PLAN.md`. Aquí está el *porqué* de cada decisión, lo que aprendimos, el estado exacto y el siguiente paso. Se escribe en orden cronológico inverso (lo más reciente arriba en §3) y se actualiza **en cada paso significativo**.

---

## 1. Estado actual (actualizar siempre)

**Rama de trabajo:** `claude/ecstatic-sagan-jiv9ev`. El repositorio es **público**; el usuario autorizó subir todo el material propio («push todo»), pero el sistema de permisos bloqueó subir una conversación compilada del usuario, así que el material del usuario no publicado (código v2/v3, conversaciones) **no se copia al repo**. Se usa desde el scratchpad como referencia.

| Pieza | Ruta | Estado | Última referencia |
|---|---|---|---|
| Núcleo general (fase 1 + enmienda E1–E8) | `kobalt/src/nucleo/` | **Integrado** (PASS + CONFORME) | `2e8d0d3` |
| Preguntas (fase 2) | `kobalt/src/preguntas/` | **Integrado** (PASS + CONFORME, tras 1 objeción y 1 VETO corregidos) | `ff96a40` |
| Forma y red de flujo (fase 3) | `kobalt/src/dominio/` | **Se rehace** según el anexo C de su spec. La versión `94726c7` tuvo PASS y OBJECIONES (4). En curso: el verificador ajusta modelo y pruebas al anexo C | spec `…fase3-forma-y-flujo.md`, anexo C |
| Fase 4 (alta e importación), 5 (materialidad IndexedDB), 6 (interfaz), 7 (Drive), 8+ (comercio) | — | Pendientes | `CONSOLIDACION_Y_PLAN.md`, parte IV |

**Siguiente paso concreto:**
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
| Specs | `kobalt/specs/` (fase 1 + enmienda, fase 2, fase 3 con anexos A–C) |
