# Kobalt — Álgebra de preguntas sobre la Trayectoria

**Fecha:** 2026‑11‑11 · **Tipo:** teoría rectora de las funcionalidades (sin código). Continúa `2026-11-11_ANALISIS_PRODUCTO_Y_TRAYECTORIA.md`.
**Principio:** no preestablecemos reportes, índices ni archivos. Entendemos la Trayectoria y le **preguntamos a la arquitectura**: cada funcionalidad es la pregunta mínima sobre `Γ`, y la arquitectura dice por sí sola cómo se calcula, qué se guarda, si sirve para intervalos y si se puede distribuir.

Las comprobaciones [V] de este documento se hicieron con `node` el 11‑nov‑2026 (scripts de trabajo, fuera del repo): asociatividad e identidad en 3.000 casos por monoide, homomorfismo del stock en 2.000 trayectorias, intervalos por prefijos en 2.000 ventanas.

---

## Parte I — Matemática

### 1. La Trayectoria es el objeto libre

`Γ ∈ A*`: la Trayectoria es una palabra en el **monoide libre** sobre las acciones (concatenación `‖`, palabra vacía `ε`). Esto tiene una consecuencia exacta:

> **Propiedad universal [T].** Para todo monoide `(M,·,1)` y toda función `f : A → M`, existe **un único** homomorfismo `f* : A* → M` con `f*(a) = f(a)`, y es `f*(a₁…aₙ) = f(a₁)·…·f(aₙ)`.

**Lectura:** para responder cualquier pregunta «acumulable» basta decir **qué aporta UNA acción**. La arquitectura hace el resto. Es la formulación exacta de «hacer las preguntas mínimas sobre la trayectoria».

### 2. Qué es una pregunta

```
Pregunta  q = (φ, f, M, obs, ventana)
          φ   : filtro de acciones (por objetivo, tipo, actor, época, t_hecho…)   — homomorfismo A* → A*
          f   : A → M                     qué aporta una sola acción
          M   : el monoide donde se acumula
          obs : M → Y                     qué se lee del acumulado
          ventana : [i, j] o un corte
Respuesta(q) = obs( f*( φ( Γ_{i:j} ) ) )
```

Algunas contribuciones dependen del estado previo (por ejemplo la merma, `h − H_antes` en un conteo). Para esas se levanta `f` al monoide de transformaciones `End(S)` o a un producto `End(S) × M`. Sigue siendo un homomorfismo, y por tanto sigue valiendo todo lo que sigue.

### 3. Lo que la arquitectura contesta sola, para cada pregunta

| # | Teorema | Qué nos dice sin preestablecer nada |
|---|---|---|
| **P1** | **Incrementalidad** [T]: `f*(Γ‖a) = f*(Γ)·f(a)` | Toda pregunta se mantiene al día con el sufijo nuevo; su archivo de optimización es `f*(Γ_{0:n})` con checkpoint `(n, h_n)` (L9) |
| **P2** | **Estado mínimo = cociente de Nerode** de `obs ∘ f* ∘ φ` [T] (L10) | La propia pregunta dice cuánto hay que guardar. Monoide pequeño (suma, último, mínimo): unos bytes. Sin cociente pequeño (la mediana [V]): guardar el multiconjunto o recalcular |
| **P3** | **Intervalos** [T][V]: si `M` es grupo, `Q(i,j) = P_j · P_i⁻¹` | Con prefijos materializados, cualquier ventana sale en O(1): ventas entre dos fechas = resta de dos prefijos. Si `M` es solo monoide: árbol de segmentos, O(log n) |
| **P4** | **Conmutatividad ⇒ distribuible** [T] | Si `M` es conmutativo, la pregunta se calcula sobre réplicas o particiones en cualquier orden y se combina con `·`. Si no lo es, exige un corte causalmente cerrado (L21) |
| **P5** | **Producto** [T]: `(f₁,f₂)* = f₁* × f₂*` en `M₁ × M₂` | N preguntas en **una sola pasada** por `Γ` |
| **P6** | **Composición de filtros** [T]: `φ₁ ∘ φ₂` es filtro y `f* ∘ φ` sigue siendo homomorfismo | Las orientaciones «por producto, por cajero, por época, por tipo» se combinan libremente |
| **P7** | **La Actualidad es una pregunta** [T]: `M = End(S)`, `f(a) = T_a`, `obs = aplicar a S₀` | Ficha, columna y fibra son preguntas de este mismo tipo; no hay una teoría aparte para el estado |

### 4. Cada clase de característica es un monoide [T][V]

Esto formaliza el «álgebra por clase» del análisis anterior:

| Clase | Monoide de sus acciones | ¿Conmutativo? | Consecuencia |
|---|---|---|---|
| Asignación | «Último gana»: `x·y = y` (identidad: sin cambio) [V] | No | El orden importa; la columna es la última asignación |
| Cantidad | `{+q} ∪ {=h}`: `+p·+q = +(p+q)`, `=h·+q = =(h+q)`, `x·=h = =h` [V] | Los `+q` entre sí **sí**; con `=h`, **no** [V] | **L19 exacto:** solo hay que coordinar alrededor de los reinicios (conteos) y de las guardas; las ventas puras conmutan |
| Conjunto | Pares `(Añadidos, Quitados)` con composición [V] | No en general | Categorías y etiquetas |
| Ciclo de vida | Monoide de transformaciones del autómata | No | Activo o retirado |
| Referencia | Conjunto de `Q` vinculados | Igual que Conjunto | Galería, materiales exactos |

**La Actualidad completa** es el producto de estos monoides sobre todas las `(e,k)`: `End(S) ⊇ ∏_{(e,k)} M_{clase(k)}`.

### 5. Comparar dos cortes también es una pregunta

`Tocados(i,j) = f*(Γ_{i:j})` en `M = (𝒫(E×K), ∪)`: conmutativo y por tanto distribuible. `Cambios(i,j)` = comparar `R_i` y `R_j` solo en `Tocados(i,j)`. El complemento de lo tocado (respecto del universo conocido, L2) da **lo que no se movió**.

---

## Parte II — Concepto: el espacio de preguntas que nace al recorrer `Γ`

### 6. Familias de preguntas (cada una es un monoide)

| Familia | Monoide `M` | Conmutativo | Preguntas que nacen |
|---|---|---|---|
| **Estado en un corte** | `End(S)` | No | Ficha, columnas, filtros… **en cualquier fecha**; comparar dos fechas |
| **Flujos** | `(ℤ,+)` o `(ℤ^K,+)` (grupo) | Sí | Entradas, salidas, ventas o devoluciones por período, por producto, por cajero o por canal; cualquier ventana en O(1) por prefijos |
| **Extremos del camino** | `(suma, mínimo prefijo)`, `(suma, máximo prefijo)` [V] | No | Stock mínimo alcanzado en un período, quiebres (¿llegó a 0?), pico de inventario, peor descuadre |
| **Duraciones** | `(t_último, valor, ∫valor·dt)` (requiere `t_hecho`) | No | Stock promedio, días sin existencias, rotación = ventas / stock promedio, días de inventario |
| **Frecuencias** | `(ℕ^X,+)` | Sí | Cuántas ventas por producto, cuántos cambios de precio, cuántas correcciones por bodega |
| **Conjuntos** | `(𝒫(X), ∪)` | Sí | Productos tocados en un período, clientes o cajeros activos; su complemento: **inventario sin movimiento** |
| **Últimos** | «Último gana» con `t_hecho` | No | Último movimiento, último conteo, antigüedad desde el último conteo, último precio |
| **Secuencias** | El propio `A*` filtrado | No | Kardex, historia de precios, historial de una variante |
| **Efecto dependiente del estado** | `End(S) × (ℤ,+)` | No | Merma (Σ de conteos por debajo de lo esperado), descuadres, valor perdido |
| **Autoridad** | Filtros por `actor` y `época` sobre cualquiera de las anteriores | Según la familia | Quién cambió qué, qué se hizo bajo cada versión del contrato, auditoría de permisos |
| **Integridad** | Cadena `h` | No | ¿Esta historia es íntegra? ¿Esta copia extiende a la otra o divergió? |
| **Causalidad** | Grafo de `deps` | — | Qué leyó una decisión, en qué corte se basó |

### 7. Las preguntas tradicionales son puntos de este espacio

| Pregunta tradicional | `φ` | `f` → `M` | `obs` | Ventana |
|---|---|---|---|---|
| ¿Cuánto hay de `v`? | objetivo = `v`, clase cantidad | `{+q}∪{=h}` | aplicar a 0 | todo |
| ¿Cuánto había el 31 de octubre? | igual | igual | igual | `t ≤ 31‑oct` |
| ¿Qué está bajo stock? | — | `End(S)` | fibra `H ≤ umbral` | todo |
| Kardex de `v` | objetivo = `v` | `A*` | lista con saldos | período |
| Ventas del día por cajero | tipo = Vender, día | `(ℤ^{actor},+)` | componente | día |
| Productos más vendidos | tipo = Vender | `(ℕ^E,+)` | orden descendente | período |
| Inventario sin movimiento | — | `(𝒫(E),∪)` | `Activos ∖ Tocados` | período |
| Quiebres de stock | objetivo = `v` | `(suma, mínimo prefijo)` | ¿`m ≤ 0`? | período |
| Rotación | Vender + cantidad | Flujos × Duraciones | `ventas / ∫H dt` | período |
| Merma | tipo = conteo | `End(S)×ℤ` | Σ negativa | período |
| ¿Quién cambió este precio? | objetivo, `k` = precio | `A*` | actor y época | todo |
| Valoración (costo promedio) | Ingresar con costo, Vender | `(Σcosto, Σq)` | cociente | todo |
| Qué cambió entre dos fechas | — | `(𝒫(E×K),∪)` | `Cambios(i,j)` | `[i,j]` |
| Exportar el catálogo | — | `End(S)` | columnas | todo |
| Importar un archivo | — | — | `Δ(archivo, R)` | todo |

### 8. Lo que nace y la tradición no tiene

Como `Γ` es un objeto de pleno derecho (y no un log auxiliar), estas preguntas salen sin construir nada:
- **viaje en el tiempo:** cualquier pregunta en cualquier corte;
- **ventanas arbitrarias en O(1)** para flujos;
- **extremos y duraciones del camino:** quiebres, picos, días sin stock;
- **auditoría verificable por época;**
- **inventario sin movimiento** como complemento;
- **merma derivada de los conteos;**
- **distribución libre** de toda pregunta conmutativa entre réplicas.

---

## Parte III — Consecuencias para el sistema

### 9. Cómo se diseña una funcionalidad (procedimiento único)

1. **Escribir la pregunta** `(φ, f, M, obs, ventana)`: qué aporta una acción y qué se lee.
2. **Preguntar a la arquitectura:**
   - ¿`M` es conmutativo? Entonces es distribuible (P4).
   - ¿Es grupo? Entonces los intervalos salen por prefijos (P3).
   - ¿Cuánto mide su cociente de Nerode? Eso es lo que hay que guardar (P2).
   - ¿Depende del estado? Se levanta a `End(S) × M`.
3. **Materializar solo si el tiempo de respuesta lo exige.** Lo que se materializa es `f*(Γ_{0:n})` con su checkpoint (P1).
4. **Si la pregunta necesita un hecho que `Γ` no tiene** (costo, `t_hecho`, lote): se añade como **dato de una acción o una característica**, nunca como un mecanismo.

### 10. Qué materializa la v1 (porque el tiempo de respuesta lo exige)
- Tabla `T`.
- Catálogo consolidado (secciones).
- Flat de existencias.

Todo lo demás se resuelve bajo demanda recorriendo `Γ`. Con cientos de variantes y miles de acciones, una pasada cuesta milisegundos, y P5 permite responder varias preguntas en esa misma pasada. Cuando una pregunta de flujos se use mucho, se materializan sus prefijos (P3); la decisión sale del uso, no del diseño previo.

### 11. Qué añade esto al núcleo
**Nada estructural.** Una pregunta es una regla de proyección del núcleo (fase 1) con `f`, `M` y `obs` declarados como dato. Faltan dos piezas genéricas, sin dominio, que se expresan **sobre** el núcleo:
- **filtros componibles** `φ`;
- **ventanas** (por prefijos en grupos, o por segmentos en monoides).

Leyes nuevas: L32 (una pregunta es un homomorfismo desde `A*`), L33 (una clase de característica es un monoide; conmutatividad y grupo deciden distribución e intervalos), L34 (materializar es guardar el cociente de Nerode de la pregunta).
