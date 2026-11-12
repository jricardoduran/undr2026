# Kobalt — Ampliación: la v3, la revisión crítica y una reducción más profunda

**Fecha:** 2026‑11‑12 · **Tipo:** análisis conceptual (sin código).
**Fuentes:**
- conversación «Comparar kernels para inventario» hasta el 11‑nov 23:14, que incluye la revisión de ChatGPT sobre nuestro análisis de las fases 1–3 y tus dos precisiones;
- paquete `KOBALT_SISTEMA_INVENTARIO_V3_COMPLETO`.

Las comprobaciones [V] se hicieron con `node` sobre el código original de la v3, sin copiarlo al repositorio.

---

## 0. Qué trae de nuevo

| Fuente | Aporte |
|---|---|
| **Tú** | (1) Las pruebas **refuerzan** la claridad matemática; no son el objeto último. Si el código refleja la matemática, funciona, salvo error de traducción o de la matemática misma. (2) En la interfaz es más preciso «registrar venta **y descontar stock**» que hablar de «venta sin descontar» frente a «venta inmediata» |
| **v3** | Cuatro modalidades de venta: solo registro, demanda suave, asignación firme, inmediata. La **pregunta de lectura** (físico, libre, prudente) se elige aparte y **no produce evento**. Un «Atlas vivo» que explica la arquitectura con la misma API. El manual declara que las pruebas son una consecuencia de las propiedades |
| **Revisión de ChatGPT** | (a) No confundir la ley del `Fold` con una agregación monoidal. (b) Faltan definiciones formales de los verbos, Forma, Red, depósito y guarda. (c) Hay que **demostrar** por qué no hacen falta más mecanismos, no solo afirmarlo. (d) Las fases, agentes y worktrees son disciplina de desarrollo, no mecanismos de la arquitectura |

Las cuatro críticas son justas. Abajo se responde cada una con matemática, y una de ellas lleva a una reducción mayor que la que teníamos.

---

## Parte I — Matemática

### 1. «No toda pregunta es monoidal»: la distinción correcta

La revisión dice que `Fold(S₀, Γ₁‖Γ₂) = Fold(Fold(S₀,Γ₁),Γ₂)` siempre vale, pero `Q(Γ₁‖Γ₂) = Q(Γ₁) ⊕ Q(Γ₂)` solo para preguntas monoidales. La matemática exacta es más fina:

> **Teorema 1 [T].** Toda pregunta determinista sobre `Γ` **es** un homomorfismo de monoides. Basta tomar `M = End(S)` (o el producto en corona `M^S ⋊ End(S)` si la pregunta depende del estado) con `f(a) = T_a` y la operación «primero, luego» (`x·y = y ∘ x`). Entonces `Q(Γ₁‖Γ₂) = Q(Γ₁)·Q(Γ₂)`.
>
> La diferencia real **no** está entre preguntas monoidales y no monoidales, sino en el **tamaño** del monoide más pequeño que las responde (su cociente de Nerode, L34). De ese tamaño depende si conviene materializar, si hay ventanas baratas (grupo) y si se puede distribuir (conmutatividad).

**El conteo absoluto también es monoidal.** El ejemplo de la revisión, «un conteo físico no puede tratarse como incremento», es cierto. Pero el monoide `{+q} ∪ {=h}` del stock es pequeño, asociativo y contiene ambos [V]. Lo que **no** se puede hacer es tratarlo como `(ℤ,+)`. La precisión correcta es elegir el monoide adecuado, no renunciar a la estructura.

### 2. Las restricciones viven en la admisión, no en la lectura

La revisión sugiere que «reservas y restricciones causales» complican las preguntas. La separación es exacta:

> **Teorema 2 [T].** Las guardas actúan **solo** en `AppendIfHead`, al admitir. Una pregunta se evalúa sobre `Γ` **ya comprometida**, donde toda acción fue admitida. Por tanto ninguna pregunta necesita reevaluar guardas: es la evaluación pura de un homomorfismo.

Por eso «las reservas exigen preservar orden y semántica» (manual v3 §7) es una afirmación sobre **constituir**, no sobre **leer**. Leer es siempre plegar.

### 3. Definiciones formales que faltaban

- **Coordenada:** un par `(e,k)`, donde `e` es una identidad (posición de nacimiento `(i,j)`, L28) y `k` una característica o un depósito.
- **Clase de `k`:** un monoide `M_k` que actúa sobre los valores `V_k`. Hay cinco:
  - asignación: «último gana» con constantes `=v`;
  - conjunto: pares `(A,Q)`, con «reemplazar por `X`» relativo al universo conocido;
  - ciclo: transformaciones de un autómata;
  - referencia: conjunto de `Q`;
  - depósito: `{+q} ∪ {=h}` sobre `ℤ`.
- **Forma `𝔉`:** para cada tipo de entidad, qué `k` admite, con su clase, tipo de valor, nivel (producto o variante, con herencia por `padre`) y valor por defecto.
- **Red `𝔑 = (L, T, W)`:**
  - `L ⊆` coordenadas de clase depósito;
  - `T` son transiciones con nombre;
  - `W(t) ∈ ℤ^L` es el movimiento de cada una;
  - `R_c(t) ⊆ L` son los depósitos restringidos de `t` en el canal `c` (configuración, L31).
- **Guarda universal:** `t` es admisible en el estado `m` si `(m + W(t))_ℓ ≥ 0` para todo `ℓ ∈ R_c(t)`.

### 4. La reducción mayor: hay **un solo verbo**

Los «cinco verbos» (`Nacer`, `Fijar`, `Añadir`, `Quitar`, `Disparar`) no son independientes. Todos son **formas de un mismo objeto**:

> **Definición.** Una acción es un elemento de soporte finito del **monoide producto**
> `δ ∈ ∏_{(e,k)} M_{clase(k)}`, es decir, un mapa finito `(e,k) ↦ m_{e,k}`.
> Aplicar `δ` actúa coordenada a coordenada: `S'(e,k) = m_{e,k} · S(e,k)`.

| Verbo anterior | Qué elemento `δ` es |
|---|---|
| `Fijar(e,k,v)` | `{(e,k) ↦ =v}` |
| `Añadir` y `Quitar` | `{(e,k) ↦ (A,Q)}` |
| `Disparar(t)` | `{(e,ℓ) ↦ +W(t)_ℓ}` sobre los depósitos de `t` |
| `Nacer` | `δ` con soporte en coordenadas **frescas** `(i,j)`: la identidad emerge de la posición, así que nacer es aplicar en coordenadas que antes no existían |
| `Lote` | El producto `δ₁·δ₂·…` (la operación del monoide) |
| `Vender`, `Despachar`, las cuatro modalidades de la v3 | **Plantillas** con nombre (dato) que producen `δ` a partir de unos argumentos |

**Teorema 3 [T]. Completitud.** Toda transición entre dos estados válidos se puede expresar como un `δ`, porque cada clase contiene las constantes (`=v`, `=h`, «reemplazar por `X`»).

**Teorema 4 [T]. Conservación de la intención.** `+(−1)` y `=9` son elementos **distintos** de `M_depósito`, aunque desde 10 lleven al mismo valor. Por eso `δ` conserva la intención, que es la condición del teorema de la actualización perdida: dos ventas concurrentes `+(−1)·+(−1)` dan 8, no 9.

**Teorema 5 [T]. Mínimo.** Hace falta al menos un verbo, y uno basta. Los nombres de dominio son sintaxis (dato) para que la intención sea legible y para que el contrato asigne capacidades por nombre (`Disparar:Vender`, E3/E4).

Consecuencia: el intérprete del dominio (fase 3) es **una función**, «aplicar `δ` coordenada a coordenada según la clase». La Forma dice qué coordenadas existen; la Red y las plantillas dicen qué `δ` tienen nombre; el contrato dice quién puede usar cada nombre.

### 5. Demostración de por qué no hacen falta más mecanismos

Lo que la revisión pedía era pasar de «no añadimos mecanismos» a «por qué no se necesitan». El argumento:

> **Teorema 6 [T] (exhaustividad).** En el modelo `(Γ, 𝔉, 𝔑, C)`, cualquier funcionalidad pertenece a una de cuatro clases:
> 1. **Cambia la actualidad.** Es un `δ` (Teorema 3) y, como mucho, pide una **coordenada o clase nueva** (dato de `𝔉`) o una **plantilla nueva** (dato de `𝔑`).
> 2. **Lee.** Es un homomorfismo desde `A*` (Teorema 1): una **pregunta**, que es dato (fase 2).
> 3. **Hace trabajo entre dos realidades.** Es `Δ(objetivo, actualidad)` (L30).
> 4. **Exige otra autoridad o concurrencia independiente.** Es **otro ámbito** `Γ'` compuesto por coproducto (L20, L25).
>
> No hay una quinta clase: toda operación sobre el sistema cambia el estado, lo lee, compara dos estados o separa autoridades. Las dos primeras quedan cubiertas por la estructura algebraica, la tercera por `Δ` y la cuarta por la partición. ∎

Lo que **sí** puede faltar, y el teorema lo deja visible, son **hechos**: una coordenada que nadie registra (costo, lote, `t_hecho`). Faltar un hecho no es faltar un mecanismo.

---

## Parte II — Concepto

### 6. Las cuatro modalidades de venta de la v3 son plantillas, no mecanismos

| Modalidad v3 | Plantilla `δ` sobre la Red | Efecto |
|---|---|---|
| Solo registro | `Vender`, con las unidades pendientes en el depósito `pend⁰_s` (no elegible para la pregunta prudente) | H, A y P sin cambios |
| Demanda suave | `Vender`, con las unidades en `pend_s` (elegible) | P + q |
| Asignación firme | `Vender · Asignar` (un compromiso) | A + q, con guarda `H − A ≥ q` |
| Inmediata | `Vender · Asignar · Despachar` (un compromiso) | H − q |

**[V]:** la red con los dos depósitos de pendientes reproduce el `core.js` de la v3 con **0 discrepancias en 22.804 acciones**, en admisión y en H, A, P y no apto.

**Precisión conceptual:** «solo registro» frente a «demanda suave» es un hecho sobre la **elegibilidad** de la demanda (L15), no un modo de disponibilidad. La disponibilidad es la **pregunta** (físico, libre, prudente), que la v3 ya separa correctamente como lectura sin evento.

### 7. El lenguaje de la interfaz: nombrar los hechos

Tu precisión aplicada: la acción de la interfaz debe decir **qué hecho constituye**, y la opción por defecto del POS es la plantilla más frecuente.

| Botón | Plantilla | Qué le dice al usuario |
|---|---|---|
| **Registrar venta** (por defecto en POS) | Inmediata | «Descuenta stock: la mercancía sale ahora» |
| Vender y apartar | Asignación firme | «Reserva unidades; sale después» |
| Registrar pedido | Demanda suave | «Cuenta en la disponibilidad prudente; no reserva» |
| Registrar sin afectar stock | Solo registro | «Cotización o acuerdo sin efecto en disponibilidad» |

El selector de **pregunta** (físico, libre, prudente) queda aparte y nunca escribe.

### 8. Pruebas: espejo de la matemática

Estoy de acuerdo con tu punto: la **fuente** de la corrección es la matemática. Las pruebas comprueban la **traducción**. Lo que ocurrió en la fase 1 lo matiza en un sentido útil: el espejo también devolvió errores **de la matemática**, no solo de la traducción.

- **Errores de traducción** que las pruebas no veían y la revisión conceptual sí: caché de estados, configuración incrustada, preguntas sobre tramos.
- **Errores de matemática:** mi fórmula `P_j·P_i⁻¹`, válida solo en grupos conmutativos, y el contraejemplo E1.1 del matemático.

**Propuesta de proporcionalidad** (es disciplina de desarrollo, no arquitectura, crítica d):

| Pieza | Rigor |
|---|---|
| Núcleo, y leyes de las que depende todo (cadena, admisión, `Fold`, `Δ`) | Ciclo completo: spec → oráculo → implementación → mutantes → revisión |
| Dominio, preguntas e interfaz | Spec con teoremas + oráculo derivado de las leyes + una revisión conceptual. Mutantes solo para leyes críticas (conservación, doble descuento, autoridad) |

### 9. El Atlas vivo es una proyección más

La «interfaz doble» de la v3 (uso cotidiano + Atlas vivo) es exactamente `UI = Π(Realidad, Capacidades, Propósito)`: el Atlas es otra pregunta sobre la misma `Γ`, con propósito explicativo. Se incorpora a la fase 6 sin mecanismo nuevo.

---

## Parte III — Impacto

1. **Spec de la fase 3:**
   - Los cinco verbos pasan a ser **formas de un solo verbo `Aplicar(δ)`**.
   - Las transiciones y modalidades son plantillas.
   - El intérprete es una sola función por clase de coordenada.
   - Las cuatro modalidades de la v3 entran como plantillas, con el depósito `pend⁰` para la demanda no elegible.
   - La implementación prevista no cambia en lo esencial; se simplifica.
2. **Spec de la fase 2:** se añaden los Teoremas 1 y 2. Toda pregunta es homomorfismo; lo que se clasifica es el tamaño. Las guardas no intervienen en la lectura.
3. **Proceso (`CLAUDE.md`):** se aplica la proporcionalidad de §8.
4. **Interfaz (fase 6):** se nombran los hechos (§7), con el Atlas vivo como proyección.
