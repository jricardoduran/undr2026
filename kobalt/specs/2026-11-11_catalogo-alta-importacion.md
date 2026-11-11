# Spec · Catálogo: alta manual, edición e importación de productos con contratos mixtos

**Fecha:** 2026-11-11 · **Autor:** agente matemático de Kobalt · **Estado:** borrador para revisión del usuario (no aprobada).
**Tipo:** especificación matemática. No contiene código de producción.

> **Nota (2026‑11‑11, consolidación):** esta spec describe el **perfil general** (orientaciones `ω` repartidas entre varios ámbitos). La v1 usa el **perfil mínimo** de `kobalt/CONSOLIDACION_Y_PLAN.md` (Parte III): dos ámbitos `Cat_O`/`Inv_W`, coordenadas emergentes (L28), alineación implícita (L29) y diferencia (L30). Donde ambos documentos difieran para la v1, prevalece la consolidación.

**Fuentes.** Conversación «Reconstruir Kernels Kobalt» (10‑nov‑2026), líneas 5084–6280 (diseño inicial y flujos) y 6280–6909 (**corrección decisiva**: dualidad entidad/parámetro; prevalece sobre lo anterior). Documento del usuario «Kobalt Minimal — Recuperar la geometría completa de entidades, parámetros y causalidad» (resumen transmitido por el agente que encargó esta spec). `references/leyes.md` (L1–L27), `references/kernels.md`, `references/decisiones-abiertas.md`, nota `kobalt/docs/2026-11-10_KOBALT_INVENTARIO_ANALISIS_KERNELS_Y_DRIVE_NOTA.md` y el atlas (§5.4 de Minimal: tablas y slots).

**Specs previas.** `kobalt/specs/` estaba vacío: no hay specs aprobadas con las que esta pueda entrar en conflicto. [V: listado del directorio el 11‑nov‑2026]

**Premisas condicionales.** Esta spec se redacta **en términos de trayectorias** y por eso depende de decisiones abiertas del usuario. No las decide; si el usuario elige otra cosa, las secciones afectadas deben revisarse:
- Decisión abierta 5 (canónico de persistencia): se modela la opción **(A)**, con la trayectoria canónica, el estado derivado y los snapshots. El documento del usuario la llama «preferida» para el inventario, pero no la ha fijado para el catálogo. [D condicional]
- Decisión abierta 2 (cajeros): `Authorized_C` queda **parametrizado** por una tabla de capacidades `Cap`; no se fijan roles concretos.
- Decisión abierta 3 (partición del stock): solo se usa un ámbito `Inv(W)` abstracto y no se especifica su partición.

**Etiquetas.** [T] teorema con demostración aquí · [V] verificado por ejecución · [D] doctrina o decisión de diseño de esta spec · [P] propuesta que requiere probeta · [L] límite.

---

## 1. Pregunta

### 1.1 Preguntas `q` que el módulo debe responder

| `q` | Pregunta | Para quién |
|---|---|---|
| `q_ficha(e)` | ¿Qué características tiene la entidad `e` en el corte `σ` y de qué ámbito procede cada una? (sección `R_e`) | Catalogador, POS, ecommerce |
| `q_col(k)` | ¿Qué valor tiene `k` en todas las entidades conocidas? (columna `R_k`) | Edición transversal masiva, exportación |
| `q_fib(φ)` | ¿Qué entidades satisfacen el filtro booleano `φ` sobre fibras `F_{k,v}`? | Búsqueda, filtros del POS y de la web |
| `q_dest(e,k)` | ¿A qué ámbito se dirige una solicitud sobre `(e,k)` en la época vigente? (router) | Formulario, tabla, importador |
| `q_ident(r)` | ¿A qué entidad corresponde la fila externa `r`: existente, nueva, ambigua o incompatible? | Importador |
| `q_diff(L)` | Si se importa el lote `L` sobre la actualidad `σ`, ¿qué solicitudes saldrían y hacia qué ámbitos? (vista previa: nuevos, actualizaciones, sin cambios, por revisar) | Usuario que importa |
| `q_falt(π)` | Para el propósito de alta completa `π`, ¿qué compromisos ya existen y cuáles faltan, por ámbito? | Catalogador (estados como «producto constituido / clasificación confirmada / existencias pendientes / oferta no publicada») |
| `q_lote(L)` | ¿Hasta dónde avanzó la importación de `L` y qué queda por reanudar? | Usuario que importa |
| `q_mig(k)` | ¿En qué época está `k`, quién la constituye y, si está en migración, en qué fase? | Administrador del contrato |

Stock y precio aparecen **solo como entrada**. Las preguntas de disponibilidad (H/A/P, `D_prudente`, `D_no_asignada`, `Déficit`) pertenecen al inventario y se rigen por L11–L13; aquí no se re‑especifican.

### 1.2 Tesis del módulo

> «Una realidad puede tener muchas orientaciones de lectura, pero cada cambio debe seguir su contrato constitutivo.» (usuario)

El alta manual, la edición desde la ficha, la edición desde una tabla transversal y la importación son **cuatro formas de preparar solicitudes**. El mecanismo que constituye (contrato, admisión y trayectoria) y el que proyecta (Fibra) son únicos y generales. [D]

La orientación canónica de cada característica es un **parámetro `ω` del contrato**, no una regla fija («el color siempre va por producto»). Todas las leyes de esta spec se demuestran para una `ω` **arbitraria admisible** (§2.4). [D; las demostraciones son T relativas al modelo]

### 1.3 Supuestos prohibidos vigilados (§3 de `kobalt-kernels`)

La petición no contiene supuestos prohibidos. El diseño inicial de la conversación (líneas 5084–6280) sí contenía dos sesgos, ya corregidos por el usuario y que esta spec evita explícitamente:
- **Prohibido 2** («Producto canónico que lo guarda todo»), latente en «usaría los atributos canónicos en la trayectoria del catálogo». La alternativa Kobalt es `ω` como parámetro del contrato y la ficha como composición (L17, L25).
- **Prohibido 11** (un importador que decide la autoridad por el formato), latente en «Archivo → Productos → Índices». La alternativa Kobalt es `Archivo → Hechos interpretados → Contratos → Compromisos → Proyecciones` (L24).

Riesgos que esta spec cierra:
- Prohibido 10, transacción global en el alta. Se resuelve con el propósito y la proyección de faltantes (§7.6).
- «SKU = identidad» y «hash = producto» (prohibido 9, L26). Se resuelve en §4.1.
- Escribir en fibras o columnas derivadas (prohibido 8). Se resuelve con el router (§5.6).

---

## 2. Ámbitos (L20)

### 2.1 Clases de hechos

| Id | Hecho | Ejemplo |
|---|---|---|
| `h_E` | Existencia, identidad `I` y tipo (`producto` / `variante`) de una entidad | P1 existe y es producto |
| `h_pad` | Relación variante → producto (`padre`) | V1 ∈ variantes(P1) |
| `h_corr` | Vínculo de origen `(fuente, idExterno) ↦ I` | (woo‑tienda, 101) ↦ V1 |
| `h_uk` | Valores de características con **restricción de unicidad** entre entidades (p. ej. SKU, si el usuario la exige) | sku(V1) = BL‑VE‑4 |
| `h_def` | Definición de característica (tipo, cardinalidad, nivel, herencia, vocabulario) y configuración `ω` por época | color: vocabulario, univaluada, nivel variante, `ω=Sec` |
| `h_val^k` | Valores de la característica `k` (una clase por `k`) | color(V1) = verde |
| `h_inv` | Existencias de `(W, variante)`: H/A/P | H(W,V1) = 8 |
| `h_of` | Oferta de `(B, variante)`: precio, moneda y condiciones | precio_B(V1) = 35.000 COP |
| `h_tal` | Propósitos, solicitudes preparadas, lotes de importación y respuestas recibidas (trabajo de un nodo) | π: alta completa de la blusa |
| — | Material exacto de imágenes `Q ↦ B` | No es un hecho de autoridad: es un almacén de contenido (Exacto) |

### 2.2 Huella de co‑acceso de cada acción

Una acción crea una arista entre dos clases de hechos si debe **leerlas o escribirlas atómicamente** (L20). Las lecturas de **predicados estables** no crean arista (Teorema 2.3).

| Acción | Escribe | Lee atómicamente | Lee de forma estable (sin arista) |
|---|---|---|---|
| `CrearProducto` | `h_E`, `h_pad`, `h_corr`?, `h_uk`? | `h_E` (frescura de `I`), `h_corr` (vínculo libre), `h_uk` (unicidad) | `h_def` (época) |
| `CrearVariante` | `h_E`, `h_pad`, `h_corr`?, `h_uk`? | ídem | `h_E` del padre (existe y es producto) |
| `Vincular` / `Desvincular` | `h_corr` | `h_corr` | `I ∈ E` |
| `AsignarClaveÚnica(e,k,x)` | `h_uk` | `h_uk` | `I ∈ E` |
| `Retirar` / `Reactivar` | `h_E` (bandera) | `h_E` | — |
| `SetValor`, `Añadir`, `Quitar`, `DeclararVacío` sobre `k` | `h_val^k` de la sección de `e` (si `ω(k)=Sec`) o de la columna `X` (si `ω(k)=Col(X)`) | el propio `h_val^k` del ámbito | `e ∈ E`, `tipo(e)`, `padre(e)`, `v ∈ Vocab_k`, `Def_ε(k)` |
| `Abrir/Sellar` característica | `Act_X` (conjunto de características que `X` constituye) | `Act_X` | referencia a `h_def` (designación) y al sello de origen |
| `DefinirCaracterística`, `AmpliarVocabulario`, `IniciarMigración`, `CerrarMigración` | `h_def` | `h_def` | — |
| Entradas de inventario (`Ingresar`, `CorregirConteo`, …) | `h_inv` | `h_inv` (L12) | `v ∈ E`, `tipo(v)=variante` |
| `FijarPrecio` | `h_of` | `h_of` | `v ∈ E`, `tipo(v)=variante` |
| Acciones de taller | `h_tal` | `h_tal` | — |

### 2.3 Teorema de lectura estable [T]

**Enunciado.** Sea `P` un predicado sobre el estado del ámbito `Y` que es **estable**: `∀a ∈ A_Y, ∀S: P(S) ⇒ P(T_Y(S,a))`. Supongamos que una acción de `X` se admite con la guarda `P(Fold(S_0^Y, Γ_Y[..c]))` para un checkpoint `c` de `Y`. Entonces, en todo corte `σ` causalmente cerrado con `σ_Y ⪰ c`, `P` sigue valiendo. Leer `P` no requiere atomicidad con `Y`; basta registrar la dependencia causal `c` (L21).

**Demostración.** Por L4, `Fold(S_0, Γ_Y[..σ_Y]) = Fold(Fold(S_0, Γ_Y[..c]), Γ_Y[c+1..σ_Y])`. Por inducción sobre la longitud del sufijo y la estabilidad de `P`, `P` se conserva. ∎

**Predicados estables en este módulo** (cada uno se apoya en un invariante de §6):
- `e ∈ E`. No hay acción que borre entidades, ni siquiera `Retirar` (I1).
- `tipo(e)` y `padre(e)` son inmutables (I2).
- `v ∈ Vocab_k`. Solo si el vocabulario **solo crece** en una época. Si el usuario quisiera retirar valores, deja de ser estable y pasa a ser una decisión abierta (D12).
- `Def_ε(k)`. Es inmutable dentro de la época `ε`; cambiarla es cambiar de época (§5.5).

**Contraejemplo (predicado no estable).** `¬retirado(e)` no es estable porque `Retirar` lo invalida. Si se usara como guarda de `SetValor` en un ámbito distinto de `Cat`, una edición podría admitirse sobre una entidad retirada en un corte posterior. Por eso **no** se usa como guarda cruzada (decisión abierta D11). [T]

### 2.4 Componentes y configuración `ω`

**Parámetro de contrato.** `ω_ε : K → {Sec} ∪ {Col(X) : X ∈ 𝔸_col}`.

**Constituyente.** `Const_ε(e,k) = Fam(fam(e))` si `ω_ε(k)=Sec`, y `X` si `ω_ε(k)=Col(X)`, con `fam(e) = e` si `e` es producto y `fam(e) = padre(e)` si es variante. `Fam(p)` es el ámbito de **sección** de la familia `p`. Puede ser un ámbito propio o estar fusionado con `Cat`, según la partición que decida el usuario (D4).

**Componentes del grafo de co‑acceso** con la huella de §2.2 [T: lectura directa de la tabla, aplicando el Teorema 2.3]:

| Ámbito | Clases de hechos | Por qué comparten trayectoria |
|---|---|---|
| `Cat` | `h_E`, `h_pad`, `h_corr`, `h_uk` | `CrearProducto` debe leer y escribir atómicamente la frescura de `I`, el vínculo de origen y la unicidad (los tres son necesarios para la idempotencia, Teorema 7.5) |
| `Reg` | `h_def`, `ω` | `IniciarMigración` lee y escribe la designación vigente; las definiciones se ordenan por época |
| `Fam(p)` (uno por familia, o fusionado con `Cat`) | `h_val^k` para las `k` con `ω(k)=Sec` sobre `p` y sus variantes | Ninguna acción de valor toca dos familias, así que **pueden** separarse. Si una guarda leyera dos familias (p. ej. unicidad), debería fusionarse (ver A3) |
| `X ∈ 𝔸_col` (p. ej. `Clas`) | `h_val^k` para las `k` con `ω(k)=Col(X)` | El contrato de `X` declara la columna completa como unidad de compromiso |
| `Inv(W)` | `h_inv` | Spec de inventario (L11–L13); partición en la decisión abierta 3 |
| `Of(B)` | `h_of` | Contrato de oferta del vendedor `B` |
| `Tal(nodo)` | `h_tal` | Trabajo local; **no** tiene autoridad sobre ningún hecho de los demás ámbitos |

**Admisibilidad de `ω`.** Una configuración es admisible si cumple:
- **(A1) Unicidad.** `Const_ε` es una **función**: cada `(e,k)` tiene exactamente un constituyente por época. [D]
- **(A2) Lecturas cruzadas estables.** Toda guarda que lee fuera de su ámbito lee solo predicados estables (Teorema 2.3). [D]
- **(A3) Restricciones transversales.** Si `k` tiene una restricción que relaciona varias entidades (unicidad de SKU, «a lo sumo una variante principal», cuotas), entonces `Const_ε(·,k)` es constante sobre el dominio de la restricción. [T por L20: la guarda lee todos esos hechos atómicamente.]
  *Consecuencia:* un SKU único **no puede** tener `ω=Sec` con `Fam(p)` separados. Debe vivir en `Cat` o en una columna. [T]

**Teorema de genericidad [T].** Ninguna demostración de §6 y §7 usa el valor concreto de `ω`, solo A1–A3. Por tanto, las invariantes, la composición sin conflictos, el router y la idempotencia valen para **cualquier** asignación característica → ámbito admisible. Las demostraciones citan A1–A3 donde las usan.

### 2.5 Configuración de ejemplo (universo de prueba del usuario, no regla)

| `k` | `ω` en el ejemplo | Nivel | Cardinalidad |
|---|---|---|---|
| nombre | `Sec` | producto | univaluada |
| color | `Sec` | variante (hereda del producto si falta) | univaluada |
| talla | `Sec` | variante | univaluada |
| categoría | `Col(Clas)` | producto (las variantes heredan) | **multivaluada** (relación) |
| img.principal | `Sec` | producto | univaluada, `V = 𝒬` (ContentId) |
| img.galería | `Sec` | producto | univaluada, `V = 𝒬*` (secuencia) [P, D12] |
| stock@W | contrato `Inv(W)` | variante | — (H/A/P, L11) |
| precio@B | contrato `Of(B)` | variante | — |

---

## 3. Contrato por ámbito

**Notación común.** `Accept_X(u,a,S) ⟺ Authorized_X(u,a) ∧ Admissible_X(a,S)`, con `Authorized_X(u,a) ⟺ (u, clase(a)) ∈ Cap_{X,ε}`. `Cap` se declara en la génesis o en la época del ámbito **antes** de aceptar (L16). Los roles concretos están en la decisión abierta D14.

**Solicitar ≠ constituir (L16).** **Solicita** cualquiera que exprese una intención a través del formulario, la ficha, la tabla transversal, el importador o una réplica. **Constituye** únicamente el mecanismo que posee la cabeza `(n, h_n)` de `Γ_X` y ejecuta `AppendIfHead(Γ_X, (n,h_n), a)` tras evaluar `Accept_X` (L8). El importador, el router y la interfaz **nunca** constituyen. [D]

| Ámbito | Quién solicita | Quién constituye | `Authorized` (clases de acción) | Época |
|---|---|---|---|---|
| `Reg` | Administrador del catálogo, desde la pantalla «Características» | Mecanismo de `Reg` del titular del catálogo | Definir, AmpliarVocabulario, IniciarMigración, CerrarMigración: solo el titular (D14) | `ε_Reg` es la época del propio contrato. Cada `IniciarMigración` abre la época `ε+1` de una característica |
| `Cat` | Formulario de alta, importador, réplica (solo solicitudes) | Mecanismo de `Cat` del titular | Crear, Vincular, Desvincular, AsignarClaveÚnica, Retirar: catalogadores con capacidad (D14) | `ε_Cat`. Cambia si cambian las reglas de identidad o de unicidad |
| `Fam(p)` | Ficha, tabla transversal (vía router), importador | Mecanismo de `Fam(p)` (el mismo que `Cat` si se fusionan) | Set, Añadir, Quitar, DeclararVacío sobre `k ∈ Act_{Fam(p)}`; Abrir/Sellar solo por designación de `Reg` | Por característica: `ε(k)` |
| `X ∈ 𝔸_col` (p. ej. `Clas`) | Ficha (vía router), tabla de clasificación, importador | Mecanismo de `X` | Igual que `Fam`, con su propia `Cap_X` (puede diferir: «solo el clasificador edita categorías») | `ε(k)` |
| `Inv(W)` | Formulario de alta (stock inicial), importador, ficha | Mecanismo de la bodega `W` | Según la spec de inventario (L12, L14) | Según el inventario |
| `Of(B)` | Formulario de alta (precio), importador | Mecanismo del vendedor `B` | FijarPrecio y condiciones | Según la oferta |
| `Tal(nodo)` | El usuario del nodo | El propio nodo | El usuario sobre su propio trabajo | Local |

**Irradiación.** Los compromisos de cualquier ámbito se irradian hacia las réplicas. Una réplica que los incorpora **no** los constituye (L16). La verificación de continuidad sigue L22. [D]

---

## 4. Estado `S`

### 4.1 Identidades y coordenadas (Minimal / Exacto)

- **Identidad `I`.** Es un identificador opaco de 128 bits o más que se **acuña una sola vez** al declarar el propósito, se persiste en `Tal` **antes** de enviar la solicitud y viaja dentro de ella. `I` **no** es el SKU, ni el nombre, ni un hash del contenido del producto, ni un slot (L26). [D] La realización concreta, sea aleatoria o mediante `identity.generic` de Minimal sobre un átomo, queda abierta [P].
- **Slot de entidad.** `slot_Cat(e) = 1 + |{e' creadas antes que e en Γ_Cat}|`. Dentro de una acción que crea varias entidades se toma el orden de la lista. El 0 queda reservado, como en Minimal (atlas §5.4). La tabla `Tab_E = [I_1, I_2, …]` es **derivada** de `Γ_Cat`, y por eso reconstruible (L27). El slot nunca se reasigna (I1). La codificación es `varuint`: 1 B hasta 127 y 2 B hasta 16.383 [V: leyes §VI].
- **Slot de característica y de valor.** `slot_Reg(k)` sigue el orden de `DefinirCaracterística` en `Γ_Reg`, y `slot_k(v)` el orden de `AmpliarVocabulario(k,v)`. Ambos son derivados y nunca se reasignan.
- **Coordenada ≠ sujeto (L25).** Un slot solo significa algo junto a la identidad de su tabla, `(StreamID(Γ_Cat), n)`. El slot 23 de otro catálogo designa otro sujeto.
- **Material exacto.** `Q = ContentId_𝒟(B)` con un contrato de derivación `𝒟` explícito (dominio, algoritmo, encuadre). La elección entre `KOB2.Derivation.contentId` y SHA‑256 bajo contrato está en D12. El almacén `M : 𝒬 ⇀ bytes` es direccionable por contenido: `put` es idempotente y `get` recalcula `ContentId` al adquirir. `M` **no** es un ámbito de autoridad: guardar `B` no constituye ninguna relación con un producto (L23, L26).

### 4.2 Estado por ámbito

```
S_Reg  = ( Def : K ⇀ (tipo, card ∈ {1,*}, nivel ∈ {prod,var,ambos}, herencia ∈ Bool, Vocab_k),
           ω : K ⇀ Orient,  ε : K ⇀ ℕ,  Mig : K ⇀ FaseMigración,  Sids )

S_Cat  = ( E : lista de I en orden de slot,  tipo : E → {prod,var},  padre : E_var → E_prod,
           Corr : Fuente × IdExt ⇀ E,  uk : K_uk × E ⇀ V,  retirado : E → Bool,  Sids )

S_X    = ( Act_X ⊆ K,  ε_X : Act_X → ℕ,  sellado_X ⊆ K × ℕ,  depE : E ⇀ checkpoint(Cat),
           f_k : E ⇀ V_k ⊎ {∅}            para k ∈ Act_X univaluada,
           g_k : E ⇀ 𝒫_fin(V_k)           para k ∈ Act_X multivaluada,
           Sids )                                      (X = Fam(p) o X ∈ 𝔸_col)

S_Tal  = ( Prop : idπ ⇀ (plantilla, objetivos I, Comp : componente → 𝒫(sid)),
           Sol : sid ⇀ (X, acción, deps, enviada?), Resp : sid ⇀ (resultado, checkpoint_X),
           Lote : idL ⇀ (Q_L, fuente, ρ, κ, políticas, avance) )
```

Convenciones:
- `f_k(e)` indefinido (`e ∉ dom f_k`) significa **desconocido**: no hay hecho.
- `f_k(e) = ∅` significa **vacío explícito**: se declaró que no tiene valor.
- Para una `k` multivaluada, `dom g_k` es el conjunto de entidades con algún hecho sobre `k`, y `g_k(e) = ∅` es vacío explícito.

La distinción **ausente / vacío / valor** es necesaria para la importación (§5.6) y para los complementos (L2). [D]

### 4.3 Minimalidad (cociente de Nerode, L10)

Para las preguntas de §1.1 y las acciones de §5:
- `Sids_X` es **necesario**. Las acciones nombran solicitudes concretas (`sid`) y la guarda de deduplicación debe distinguir dos estados con la misma actualidad comercial pero distinto conjunto de `sid` comprometidos. Es el análogo exacto del corolario de L10 («`P` agregado no basta; hace falta el mapa de solicitudes abiertas»). [T: dos estados que solo difieren en `sid₀ ∈ Sids` reaccionan distinto a una acción con `sid₀`.]
- `Corr` es **necesario** para `q_ident`. No se puede derivar de los valores porque el `idExterno` no es una característica. [T]
- `f_k` completo, y no solo fibras sueltas o conteos, es necesario para `q_col`. Además, la familia `{F_{k,v}}_v` junto con `dom f_k` es isomorfa a `f_k` cuando `k` es univaluada. [T]
- `padre` y `dom f_k` restringido a las variantes son necesarios para las fibras efectivas con herencia (contraejemplo de §7.3). [T][V]
- La historia de valores **no** forma parte de `S`: está en `Γ` y se recupera por `Fold` (L4). [T]
- Retención de `Sids`: si crece sin límite o se acota con una ventana es la decisión D15. Una ventana rompe la deduplicación de reintentos más antiguos que ella. [T]

---

## 5. Acciones `A`

Todas las acciones llevan `sid` (identidad de la solicitud que las originó) y, si leen predicados estables de otro ámbito, un **checkpoint de dependencia** `dep = (StreamID, n, h_n)` (L21).
**Guarda común** en todo ámbito: `Authorized_X(u,a) ∧ a.sid ∉ Sids_X`.
**Efecto común**: `Sids_X ∪= {a.sid}`.
Las guardas **no** son invariantes (L7). Ninguna restricción de esta tabla se codifica en el tipo del estado. [D]

### 5.1 `Reg`

| Acción | Guarda `Admissible_Reg` | Efecto `T` |
|---|---|---|
| `DefinirCaracterística(k, tipo, card, nivel, herencia, Vocab₀, ω₀)` | `k ∉ dom Def`; `ω₀` cumple A1 y A3 respecto de las restricciones declaradas para `k` | `Def[k] := …`, `ω[k] := ω₀`, `ε[k] := 0`, `Mig[k] := estable` |
| `AmpliarVocabulario(k, v)` | `k ∈ dom Def`; `v ∉ Vocab_k`; normalización propuesta como sugerencia, nunca como fusión silenciosa | `Vocab_k ∪= {v}` (asigna `slot_k(v)`) |
| `IniciarMigración(k, X→Y)` | `Mig[k] = estable`; `ω[k]` designa `X`; `Y ≠ X`; la nueva `ω` cumple A1–A3 | `Mig[k] := (en_curso, X, Y, ε[k]+1)` |
| `CerrarMigración(k, sello=(X,n,h), génesis=(Y,m,h'))` | `Mig[k] = (en_curso, X, Y, ε')`; el sello y la génesis son verificables y se refieren a `ε'` | `ω[k] := Y`, `ε[k] := ε'`, `Mig[k] := estable` |

### 5.2 `Cat`

| Acción | Guarda `Admissible_Cat` | Efecto `T` |
|---|---|---|
| `CrearProducto(I_p, [(I_v, vínc_v?, uk_v?)]₁..ₘ, vínc_p?, uk_p?)` | `m ≥ 1`; todas las `I` son distintas y ninguna está en `E`; cada vínculo `(f,x) ∉ dom Corr` y distinto de los demás de la acción; cada `uk` libre según A3 | Añade `I_p, I_v1..I_vm` a `E` en ese orden (slots consecutivos), con `tipo` y `padre(I_vi) = I_p`; `Corr ∪=` vínculos; `uk ∪=` claves |
| `CrearVariante(I_v, I_p, vínc?, uk?)` | `I_v ∉ E`; `I_p ∈ E ∧ tipo(I_p)=prod` (local); vínculo y clave libres | Añade `I_v`; `padre(I_v) := I_p`; vínculo y clave |
| `Vincular((f,x), I)` | `(f,x) ∉ dom Corr`; `I ∈ E` | `Corr[(f,x)] := I` |
| `Desvincular((f,x))` | `(f,x) ∈ dom Corr` | `Corr := Corr ∖ {(f,x)}` |
| `AsignarClaveÚnica(e, k, x)` | `e ∈ E`; `k ∈ K_uk`; `∄ e' ≠ e: uk(k,e') = x` | `uk[(k,e)] := x` |
| `Retirar(e)` / `Reactivar(e)` | `e ∈ E` | `retirado(e) := true / false` |

Precisiones:
- `CrearProducto` es **atómico dentro de `Cat`**: el producto y sus variantes nacen juntos o no nace ninguno. Esto es legítimo porque todo ocurre en un solo ámbito; no es una transacción global (prohibido 10). [D]
- No hay acción de borrado: `Retirar` es un estado. [D] Que una variante pueda cambiar de padre queda fuera de esta spec (D10).

### 5.3 Ámbitos de valor `X` (`Fam(p)` o columna)

| Acción | Guarda `Admissible_X` (local + estable con `dep`) | Efecto `T` |
|---|---|---|
| `Abrir(k, ε', designación, transferido?)` | Local: `k ∉ Act_X`; `(k,ε'') ∉ sellado_X` para todo `ε'' ≥ ε'`. Estable: la designación es un compromiso de `Reg` que nombra a `X` para `(k,ε')`, sea `DefinirCaracterística` con `ε'=0` o `IniciarMigración` hacia `X`. Si `ε'>0`, `transferido` incluye la referencia al sello en el origen y su columna `R_k` | `Act_X ∪= {k}`; `ε_X[k] := ε'`; `f_k` o `g_k` := `transferido` (o vacío) |
| `Sellar(k, ε'+1, designación)` | Local: `k ∈ Act_X`. Estable: `IniciarMigración(k, X→Y)` en `Reg` | `Act_X ∖= {k}`; `sellado_X ∪= {(k, ε_X[k])}` |
| `SetValor(e, k, v)` (`card=1`) | Local: `k ∈ Act_X`. Estable con `dep`: `e ∈ E`, `nivel(k)` compatible con `tipo(e)`, `v ∈ Vocab_k ⊎ {∅}` o tipo correcto | `f_k[e] := v`; `depE[e] := dep` |
| `Añadir(e, k, v)` (`card=*`) | Ídem | `g_k[e] := g_k(e) ∪ {v}` (con `g_k(e) = ∅` si `e ∉ dom`) |
| `Quitar(e, k, v)` (`card=*`) | Ídem (sin exigir `v ∈ g_k(e)`) | `g_k[e] := g_k(e) ∖ {v}` |
| `DeclararVacío(e, k)` | Ídem | `f_k[e] := ∅` o `g_k[e] := ∅` |

Notas:
- `Quitar` no exige `v ∈ g_k(e)`, y `SetValor` no exige `f_k(e) ≠ v`. Así las acciones son **absolutas e idempotentes**: `T(T(S,a),a) = T(S,a)` en la actualidad comercial. La detección de no‑cambios corresponde al diff (§5.6), no a la guarda. [D; idempotencia T: asignación y unión/diferencia de conjuntos son idempotentes]
- Las guardas sobre «`¬retirado(e)`» **no** se usan (Teorema 2.3, D11).

### 5.4 Entradas a `Inv(W)` y `Of(B)` (solo enlace)

| Campo de entrada | Acción dirigida | Referencia |
|---|---|---|
| Existencias iniciales `h` de la variante `v` en `W` | **Una de**: `CorregirConteo(v, h, t_ref)` (absoluta), `Ingresar(v, h)` con `sid` determinista (relativa), o `DeclararInicial(v, h)` (acción nueva propuesta: guarda «`Γ_Inv(W)` no tiene acciones sobre `v`», efecto `H := h`). La elección es **D3** | Efectos en la tabla de L12; nivel de hecho en L14 |
| Precio | `FijarPrecio(v, moneda, monto)` en `Of(B)`, absoluta | Precio como entero en unidades mínimas de la moneda [P, D16] |

Esta spec no define H/A/P, disponibilidades ni guardas de inventario: remite a L11–L13 y a la spec de inventario cuando exista.

### 5.5 Migración de orientación `C_ε → C_{ε+1}` (L18)

Protocolo para mover `k` de `X` a `Y`, por ejemplo de `Sec` a `Col(Y)`:

1. `Reg ‖ IniciarMigración(k, X→Y)`, con checkpoint `r = (Reg, n_r, h_r)`.
2. `X ‖ Sellar(k, ε+1, dep=r)`, con checkpoint `s = (X, n_s, h_s)`. Desde aquí `X` rechaza `Set/Añadir/Quitar` sobre `k` con el motivo `ÉpocaCerrada(→Y)`.
3. `Y ‖ Abrir(k, ε+1, dep={r,s}, transferido = Π_col(k)(Fold(Γ_X[..n_s])))`. `Y` puede verificar el estado transferido recorriendo `Γ_X[..n_s]` (L22).
4. `Reg ‖ CerrarMigración(k, s, g)`, donde `g` es el checkpoint de la apertura en `Y`.

Las solicitudes que llegaron a `X` sin comprometer, o que llegan después de su sello, se tratan según la política de **D9**: rechazo con redirección (el solicitante las reenvía con el mismo `sid` hacia `Y`) o transferencia como pendientes en la apertura.

Durante el intervalo entre el sello y la apertura, `k` no tiene constituyente: está **congelada**. Esto está permitido y es lo que excluye tener dos constituyentes. [D]

Durante la migración, las identidades `I` y los slots `slot_Cat` no cambian: `Γ_Cat` no participa. [T]

### 5.6 Router, diff e identificación (preparación; no son acciones de ningún ámbito constituyente)

**Intención.** `ι = (π, r_Reg, filas)`, donde `r_Reg` es el checkpoint de `Reg` que fija `ω` y `Def`, y cada fila es `(t, campos)`:
- `t ∈ {Nueva(I), Existente(I)}`;
- `campos ⊆ K̂ × Op × Valor`, con `K̂ = K ∪ {stock@W} ∪ {precio@B}` y `Op ∈ {set, add, remove, vacío}`.

El formulario produce una fila por entidad: el producto y cada variante. Una edición en la tabla transversal de `k` produce una fila `Existente(e)` por celda modificada. Una fila de importación produce una fila tras interpretarse e identificarse.

**Diff contra la actualidad** en el corte `σ` (bidireccional; la variante a tres vías está en D6). Para `k` univaluada y `(e,k,set,v)`:
- `Diff_σ = ∅` si `f_k(e) = v` en `Fold(Γ_{Const(e,k)}[..σ])`;
- `Diff_σ = {SetValor(e,k,v)}` en otro caso.

Para `k` multivaluada con el valor importado `Xv`:
- política `reemplazar`: `{Añadir(e,k,w) : w ∈ Xv∖g_k(e)} ∪ {Quitar(e,k,w) : w ∈ g_k(e)∖Xv}`;
- política `añadir`: solo la primera parte (D8).

Columna **ausente** en el archivo ⇒ no hay campo y no hay diff. Celda **vacía** ⇒ según la política de D7: ignorar, `DeclararVacío` u «olvidar».

**Router.**
`Route(ι, σ) = ⊎_X Q_X`, con:
- `Q_Cat` = creaciones de las filas `Nueva` (más vínculos y claves únicas);
- `Q_X ∋ sol(sid, X, a, deps)` para cada `a ∈ Diff_σ(e,k,op,v)` con `X = Const_{ε(r_Reg)}(e,k)`;
- los campos `stock@W` y `precio@B` se dirigen a `Inv(W)` y `Of(B)` según §5.4.

Reglas:
- `deps` contiene el `sid` de la creación de `e` cuando `e` es nueva. La solicitud dependiente no se envía (o el constituyente la deja pendiente) hasta que el solicitante conoce el checkpoint de `Cat` que contiene a `e`. [D]
- `sid = H(dom_sid ‖ id_π ‖ I_e ‖ slot_Reg(k) ‖ op ‖ Enc(v))` con encuadre inyectivo. Para la importación, `id_π = H(dom_imp ‖ Q_L ‖ ver(ρ) ‖ ver(κ) ‖ ver(políticas))` y `I_e` se sustituye **siempre** por la clave de fila `κ(r)`, tanto si la fila sale `Nueva` como `Existente`. Si se usara `I_e` para las existentes, el `sid` de una fila cambiaría entre la primera ejecución (fila nueva, aún sin `I` comprometida) y la segunda (fila existente), y C6 fallaría. [D; la consecuencia es T]
- Un campo cuya `k ∉ dom Def` o sin `ω` produce `Incompatible(característica sin contrato)`. **Nunca** se descarta en silencio ni se escribe en un índice. [D]

**Identificación** `Ident_κ(r, S_Cat@σ) ∈ {Existente(I), Nueva, Ambigua(J), Incompatible(motivo)}`:
- **Clave de vínculo `κ = (fuente, idExterno)`.** `Existente(Corr(f,x))` si `(f,x) ∈ dom Corr`; `Nueva` en otro caso. Nunca es ambigua porque `Corr` es función (I4).
- **Clave de característica única `κ = uk_k`** (p. ej. SKU). `Existente(e)` si existe un único `e` con `uk(k,e)=x`; `Nueva` si no hay ninguno. Es imposible obtener `Ambigua` si A3 se cumple. Si el SKU no es único por contrato, entonces `Ambigua(J)` con `|J| ≥ 2`.
- **Clave heurística** (nombre parecido, SKU similar). Solo produce **sugerencias**; nunca `Existente` automático. [D]
- **Duplicado dentro del lote.** Si dos filas de `L` tienen la misma clave, todas pasan a `Incompatible(duplicadoEnLote)`, salvo que el usuario elija una política de consolidación (D2). Es condición de la idempotencia (contraejemplo en §7.5). [T][V]
- Las filas padre/variante del archivo (p. ej. WooCommerce «Variable» y «Variante de 100») se agrupan en una sola `CrearProducto` por familia. La relación de agrupación forma parte de la interpretación `ρ`, que es versionada.

---

## 6. Invariantes `V_C`

Solo se listan las que valen en **todo** estado alcanzable. La demostración es siempre por L6: valen en `S_0` (génesis vacía) y se conservan por toda acción aceptada. Como `T` solo se aplica tras `Accept`, las guardas pueden usarse en el paso inductivo **sin** ser invariantes en sí mismas.

**I1 Slots estables e inyectivos (`Cat`).** `slot` es una biyección `E → {1..|E|}` y `slot_{n+1}|_{E_n} = slot_n`.
*Demostración.* En `S_0`, `E = ∅`. Solo `CrearProducto` y `CrearVariante` modifican `E`, y lo hacen añadiendo al final `I`s frescas (guarda `I ∉ E`) con slots `|E|+1, …`. Ninguna acción elimina ni reordena. ∎ [T]

**I2 Estructura producto/variante inmutable (`Cat`).** `padre` es total sobre `E_var`, cae en `E_prod`, y `padre_{n+1}|_{E_var,n} = padre_n`; además `tipo` no cambia.
*Demostración.* `padre` solo se escribe al crear la variante (guarda: el padre existe y es producto) y ninguna acción lo modifica. ∎ [T]

**I3 Todo producto tiene al menos una variante (`Cat`).** `∀p ∈ E_prod: padre⁻¹(p) ≠ ∅`.
*Demostración.* `CrearProducto` exige `m ≥ 1` y crea el producto junto con sus variantes en la misma acción. No hay borrado. ∎ [T]
*Límite.* «Al menos una variante **no retirada**» **no** es invariante: `Retirar` puede retirar todas. [T]

**I4 `Corr` es función parcial hacia `E` (`Cat`).**
*Demostración.* `Vincular` y la creación exigen `(f,x) ∉ dom Corr` y que `I ∈ E` o que `I` se cree en la misma acción. `Desvincular` reduce el dominio. ∎ [T]

**I5 Unicidad de claves de `K_uk` (`Cat`).** `uk(k,·)` es inyectiva.
*Demostración.* Las guardas de `AsignarClaveÚnica` y de creación exigen clave libre; ninguna otra acción escribe `uk`. ∎ [T]

**I6 Univaluación (`X`).** Para `k` con `card=1`, `R|_k` es una función parcial `E ⇀ V_k ⊎ {∅}`.
*Demostración.* Se cumple por la **forma de `T`**: `SetValor` reemplaza y no añade. No depende de ninguna guarda. ∎ [T]

**I7 Unicidad de `sid` por ámbito.** En `Γ_X`, cada `sid` aparece a lo sumo una vez.
*Demostración.* Por la guarda común `sid ∉ Sids_X` y el efecto `Sids_X ∪= {sid}`. ∎ [T]

**I8 Valores en vocabulario.** `f_k(e) ∈ Vocab_k ⊎ {∅}` en todo corte causalmente cerrado.
*Demostración.* La guarda lo comprueba en `dep`, y por el Teorema 2.3, con un vocabulario que solo crece, se conserva. ∎
*Condicional.* [T] solo mientras D12 mantenga «el vocabulario solo crece».

**I9 Constituyente único (entre ámbitos, L18 y L25).** Para todo `k` y todo corte `σ` causalmente cerrado: `|{X : k ∈ Act_X(σ_X)}| ≤ 1`.
*Demostración.* Solo `Abrir` y `Sellar` modifican `Act`. `Abrir(k, ε')` en `Y` exige una designación de `Reg` que nombra a `Y` para la época `ε'`. Como `Reg` es un único ámbito con orden total y no admite `IniciarMigración` mientras `Mig[k] ≠ estable`, hay como mucho una designación por época. Si `ε' > 0`, `Abrir` además depende causalmente del sello `s` de `X` para la época `ε'−1`. Todo `σ` cerrado que contiene la apertura contiene `s`, luego `k ∉ Act_X(σ_X)`. `X` no puede reabrir `k` para una época `≤` la sellada. Por inducción sobre los compromisos en orden causal, nunca hay dos. ∎
*Etiqueta.* [T] relativo a cortes cerrados y a L8 por ámbito. *[L]:* no vale para lecturas de cortes no cerrados ni si el constituyente de `X` está bifurcado (FORK; L8, L19).

**Lo que NO es invariante** (solo guarda o proyección; L7):
- «Todo producto tiene nombre, categoría, stock y precio». La completitud es la proyección `q_falt` (§7.6), porque el alta cruza ámbitos sin transacción global. Lo mismo vale para «campos obligatorios» que viven fuera de `Cat`. Como guardas de `CrearProducto` solo pueden exigirse características constituidas en el mismo ámbito que la creación (D17). [T por L20]
- «`H ≥ 0`», «`H ≥ A`» (L7).
- «La entidad editada no está retirada» (§2.3).
- «La columna `R_k` cubre todo el catálogo». Una réplica solo conoce su corte; véase la máscara en §7.3.

---

## 7. Proyecciones `Π_q`

Composición general (L17, L25):
`R_σ = Compose(Interpret_{Cat}(Γ_{Cat,σ}), Interpret_{Reg}(…), Interpret_{X}(Γ_{X,σ_X})_{X}, …)`.

`Compose` es un **coproducto**: cada incidencia `(e,k,v)` lleva su procedencia `(X, n_X)`. Si dos ámbitos aportan la misma `(e,k)`, devuelve `CONFLICTO(e,k,{X,X'})` y **no** un valor. Por I9 esto no ocurre en cortes cerrados; si ocurre, delata un corte no cerrado, una configuración no admisible o un `FORK`. [T por I9; D en el tratamiento]

### 7.1 Sección `q_ficha(e)`
- **Fórmula.** `Ficha(e)_σ = { (k, ValorEf(e,k), procedencia) : k ∈ dom Def }`, junto con `Stock_W(e)` (proyección de inventario, L11), `Oferta_B(e)` e imágenes.
- **Herencia.** `ValorEf(v,k)` es:
  - `f_k(v)` si `v ∈ dom f_k`, incluido `∅`, que **bloquea** la herencia;
  - `f_k(padre(v))` si `herencia(k)` y `v ∉ dom f_k`;
  - desconocido en otro caso.
- **Incremental.** Sí, si el estado de la proyección es la pareja `(sección propia de v, sección propia de padre(v))`.
  - *Congruencia.* Dos estados con las mismas secciones propias de `v` y de `padre(v)` reaccionan igual a cualquier `SetValor` sobre `v` o sobre `padre(v)`, y las acciones sobre otras entidades no los afectan. ∎ [T]
- **Checkpoint.** `σ = {(Cat,n,h), (Reg,n,h), (Const(e,k),n,h) para cada k, (Inv(W),n,h), (Of(B),n,h)}` más `versiónRegla = (ε por k, versión de herencia, versión de Compose)`. **Sin `t_ref`**: ninguna fórmula depende del reloj. Si el usuario introduce precios con vigencia, hará falta `t_ref` (L15). [D]
- La ficha **no** es autoridad (L17). Editar desde ella genera una intención para el router.

### 7.2 Columna `q_col(k)`
- **Fórmula.** `R_k = f_k` (o `g_k`) en `Fold(Γ_{X}[..σ_X])` con `X = Const(·,k)`. Con `ω=Sec` es la unión **disjunta** sobre las familias `p` de `f_k` en `Fam(p)`. La disjunción es [T] por A1.
- **Incremental.** Trivial: es la componente `k` del estado (`π` inyectiva en esa componente). [T]
- **Checkpoint.** `{(X, n_X, h_X)}` (o `{(Fam(p), …)}_p` con `Sec`) junto con `(Cat, n, h)` para la tabla de slots y `ε(k)`.

### 7.3 Fibras y filtros `q_fib(φ)` (L2)
- **Representación.** `F_{k,v}` es un vector de bits de longitud `N_σ = |E|` en el corte de `Cat`, donde el bit `slot(e)−1` está activo si y solo si `(e,k,v) ∈ R_σ`. Por I1, la posición de cada entidad es estable al crecer `N`: se extiende con ceros. 500 entidades ocupan 63 B [V: `node`, `ceil(500/8)`].
- **Máscaras explícitas** (también bitsets):
  - `U_σ`: todas las entidades del corte;
  - `Var_σ` / `Prod_σ`: por tipo;
  - `Act_σ`: no retiradas;
  - `D_k`: entidades con algún hecho sobre `k`, valor o `∅`.
- **Álgebra.** `∧`, `∨`, y `¬_M F := M ∧ ¬F`, donde el **operador de complemento exige la máscara `M` como argumento** (no tiene valor por defecto). [D]
  - *Contraejemplo [V].* Con `U = {e1,e2,e3}`, `color(e1)=azul`, `color(e2)=lila` y `e3` desconocido: `U ∖ F_azul = {e2, e3}` afirma falsamente que `e3` «no es azul». El resultado correcto para «color ≠ azul» es `D_color ∖ F_azul = {e2}`.
- **Incrementalidad (L10):**
  - **Fibra propia univaluada.** `g_{SetValor(e,k,v')}(F_{k,v}) = F ∪ {e}` si `v' = v`, y `F ∖ {e}` si no. `DeclararVacío(e,k)` da `F ∖ {e}`. El resto de acciones no la cambian, salvo la creación, que añade un bit 0. **Congruencia [T]:** el resultado depende solo de `F` y de `a`. [V: comprobación exhaustiva con 3 entidades y valores `{azul, lila, desconocido}`, sin pares que la violen]
  - **Fibra propia multivaluada.** `Añadir(e,k,v)` da `F ∪ {e}`; `Quitar(e,k,v)` y `DeclararVacío` dan `F ∖ {e}`. Congruente. [T]
  - **Máscara `D_k`.** Cualquier acción de valor sobre `(e,k)` da `D ∪ {e}`. Congruente. [T]
  - **Contraejemplo: conteo `|F|`.** **No** es congruencia. `F={e1}` y `F={e2}` tienen ambos conteo 1; tras `SetValor(e1,k,azul)` dan 1 y 2. Los contadores de facetas se derivan de la fibra, no se mantienen solos. [T][V]
  - **Contraejemplo: fibra efectiva con herencia `F^ef_{k,v}`.** **No** es congruencia sobre sí misma. En `s1`, `v1` sobrescribe `azul` y `p` es azul; en `s2`, `v1` hereda de `p`, que es azul. Ambos tienen `F^ef_azul = {v1}`. Tras `SetValor(p, color, lila)` dan `{v1}` y `∅`. [T][V]
    El estado de Nerode suficiente es `(F^prop_{k,·} sobre productos, F^prop_{k,·} sobre variantes, D_k ∩ Var, padre)`. Con él, `SetValor(p,k,v')` actualiza los bits de `padre⁻¹(p) ∖ D_k`. [T]
- **Checkpoint.** `{(Cat,n,h)}` (universo de slots y máscaras `U`, `Var`, `Act`), `{(Const(·,k), n, h)}` y `ε(k)`. El corte debe ser **cerrado** (L21): si `X` comprometió un valor de `e` con `dep = (Cat, n_e)`, el corte debe incluir `Cat ⪰ n_e`. Si no, `slot(e)` es desconocido y el bit no se puede colocar. En ese caso la proyección **no** se actualiza y espera. [D]
- **Totalidad conocida ≠ totalidad del catálogo.** `U_σ` es el universo **del corte**. Una réplica con un corte anterior no afirma completitud (conversación, §9 de la corrección). [L]

### 7.4 Router y destino `q_dest(e,k)`
- **Fórmula.** `q_dest(e,k) = Const_{ε}(e,k)` leído de `Π_ω(Fold(Γ_Reg[..r]))`.
- **Incremental.** Trivial. [T]
- **Teorema de invariancia por interfaz [T].** `Route` es función solo de `(ι, ω_ε, S_σ)`. Una edición de `color(P1) := verde` hecha desde la ficha de P1 y la misma edición hecha desde la tabla transversal de colores producen la misma fila `(Existente(P1), {(color, set, verde)})`, y por tanto las mismas solicitudes, con el mismo `sid` si comparten `π`. ∎
  *Consecuencia:* la pantalla no decide la autoridad (L16).
- **Teorema de invariancia por orientación [T].** Sean `ω` y `ω'` admisibles, la misma secuencia de intenciones, todas las solicitudes admitidas, y el **mismo orden relativo de compromisos por cada `(e,k)`**. Entonces `R_σ(ω) = R_σ(ω')`, aunque las trayectorias difieren.
  *Demostración.* `R|_{(e,k)}` es el `Fold` de las acciones sobre `(e,k)` en orden. Estas acciones son las mismas (el diff solo depende de `f_k`, que coincide por inducción). Solo cambia el ámbito donde se registran, y por A1 cada `(e,k)` tiene un único registro. ∎
  *Límite.* Si los actores autorizados difieren entre `X` y `X'`, la admisión puede diferir. Si dos ediciones concurrentes sobre `(e,k)` se ordenan distinto, el resultado puede diferir. [L]
- **Caso límite del usuario.** El archivo `P1→azul, P2→lila` produce:
  - con `ω(color)=Sec`, `SetValor` en `Fam(P1)` y en `Fam(P2)`;
  - con `ω(color)=Col(Y)`, ambos en `Y`.
  En los dos casos se obtiene `Color(P1)=azul, Color(P2)=lila`. [T por el teorema anterior]
- **Equivalencia alta manual = importación [T].** Si una fila del formulario y una de importación para entidades nuevas llevan los mismos campos, los `R` resultantes son iguales salvo el renombramiento de identidades `I ↦ I'`. Los slots coinciden si el orden de creación en `Cat` coincide.
  *Demostración.* Las dos pasan por el mismo `Route` con `Diff` sobre `f_k(e)` indefinido. ∎

### 7.5 Vista previa `q_diff(L)` e idempotencia de la importación (L24)
- **Fórmula.** Para cada fila `r` de `ρ(B_L)`, se calcula `Ident_κ(r, S_Cat@σ)` y, si es `Existente` o `Nueva`, `Route` con `Diff_σ`. La clasificación por fila es:
  - `Nueva`;
  - `SinCambios` (todas las `Q_X` vacías);
  - `Actualiza(⊎_X Q_X)`, con el detalle por ámbito: catálogo, clasificación, inventario, oferta;
  - `Ambigua(J)`;
  - `Incompatible(motivo)`.

  Los productos del catálogo que no aparecen en el archivo **no** producen solicitudes (no hay borrado implícito). [D]
- **No incremental.** Se recalcula y no se afirma congruencia.
- **Checkpoint.** `(Q_L, ver(ρ), ver(κ), ver(políticas), σ)`.

**Teorema 7.5 (idempotencia condicionada) [T].** Sea `S_1` el resultado de aplicar `Import(L)` sobre `S_0` y comprometer todas sus solicitudes admitidas. Si se cumplen:
- **C1** — `ρ`, `κ`, las políticas (D6, D7, D8) y `ω_ε` son las mismas en ambas ejecuciones;
- **C2** — reconocimiento estable: la clave `κ` de una fila nueva se compromete **en la misma acción** que la creación (vínculo en `CrearProducto`/`CrearVariante`, o clave única en `Cat`), de modo que tras comprometer `Ident_κ(r, S_1) = Existente(I_r)`;
- **C3** — todas las acciones de valor derivadas del lote son **absolutas** (`SetValor`, `Añadir`/`Quitar` con su diff, `DeclararVacío`, `FijarPrecio`, `CorregirConteo`), o bien relativas (`Ingresar`) deduplicadas por un `sid` determinista;
- **C4** — no hay compromisos intermedios de terceros sobre las `(e,k)`, vínculos o claves afectados;
- **C5** — la clave es inyectiva dentro del lote (o las filas duplicadas son `Incompatible`);
- **C6** — los `Diff` se calculan sobre un corte cerrado que incluye los compromisos de la primera ejecución en cada ámbito, **o bien** las solicitudes de ambas ejecuciones tienen el mismo `sid` (mismo `Q_L`);

entonces `Import(L)` sobre `S_1` produce **cero compromisos nuevos**, y `S_1` no cambia.

*Demostración.*
1. Por C2 y C5, cada fila se identifica como `Existente(I_r)` con la misma `I_r` y ninguna otra fila escribe la misma `(e,k)`.
2. Por C1, `Route` emite los mismos campos.
3. Por C3 y C4, en el corte de C6 `f_k(I_r) = v` (o `g_k` contiene exactamente lo pedido), luego `Diff = ∅`.
4. Si el corte aún no ve un compromiso de la primera ejecución, la solicitud reemitida tiene el mismo `sid` (C6) y la guarda `sid ∉ Sids_X` la rechaza.
5. Las filas `Ambigua` o `Incompatible` no producen solicitudes en ninguna de las dos ejecuciones. ∎

*Variante parcial [T].* Si en la primera ejecución alguna solicitud fue **rechazada** por una guarda, la segunda solo puede reemitir solicitudes rechazadas: idempotencia **módulo rechazos**.

*Reanudación [T].* Una importación interrumpida tras comprometer un subconjunto, seguida de `Import(L)`, alcanza el mismo `R` observable que una importación ininterrumpida y no duplica entidades. Las filas comprometidas se reconocen por C2 y producen `Diff = ∅`. El resto procede.

**Contraejemplos de cada condición** [V: modelo mínimo en `node`, script de trabajo fuera del repositorio]:

| Condición violada | Escenario | Resultado |
|---|---|---|
| Ninguna (control) | Primera importación | 4 compromisos; segunda, 0 |
| C5 | Filas `{BL-4: azul}` y `{BL-4: lila}` | Primera: 3 compromisos; segunda: 2 (no idempotente: oscila azul/lila) |
| C3 | Stock como `Ingresar 24` sin deduplicación | Dos importaciones dejan `H = 48` en vez de 24 |
| C2 | La clave se escribe en otro ámbito o en otra acción que la creación; caída entre ambas y reintento | `|E| = 2`: producto duplicado |
| C4 | El usuario cambia el color a verde entre dos importaciones del archivo que dice azul | La segunda emite `SetValor(azul)` y revierte la edición manual. **Es el comportamiento especificado del diff bidireccional**, no un fallo; evitarlo requiere el diff a tres vías (D6) |

*Condición sobre el `sid` en C3.* Un `Ingresar` deduplicado por `sid` derivado de `Q_L` solo es idempotente para el **mismo archivo en bytes**. Un archivo reexportado con otros bytes y las mismas cifras produce otro `Q_L`, otros `sid` y un doble ingreso. Por eso D3 es una decisión del usuario y no un detalle. [T]

### 7.6 Propósito de alta completa y faltantes `q_falt(π)`
- **Propósito.** `π = (id_π, plantilla τ, objetivos {I}, Comp_π)`. `Comp_π` asigna a cada componente de la plantilla el conjunto de `sid` que la satisfacen. Ejemplos de componente: `identidad@Cat`, `valores@Fam`, `clasificación@Clas`, `existencias@Inv(W)`, `oferta@Of(B)`, `imágenes@Fam`. Qué componentes exige la plantilla es la decisión D17.
- **Estado de una solicitud** en el corte `σ`, por orden de precedencia:
  1. `Comprometida(n)` si `∃ i ≤ σ_X: a_i.sid = sid` en `Γ_X`. Es la única fuente autoritativa del estado.
  2. `Rechazada(motivo)` si `Resp(sid)` es un rechazo y la solicitud no está comprometida.
  3. `EsperandoDependencia` si alguna dependencia no está comprometida en `σ`.
  4. `Pendiente` en otro caso (preparada o enviada).
- **Fórmula.** `Faltantes(π, σ) = { (c, estados) : c ∈ dom Comp_π, ∃ sid ∈ Comp_π(c): Estado(sid,σ) ≠ Comprometida }`. La UI muestra cada componente como, por ejemplo, «producto constituido ✓ · clasificación confirmada ✓ · existencias pendientes · oferta no publicada».
- **Monotonía [T].** `Comprometida` es estable: por L3 `Γ_X` solo crece, así que una solicitud comprometida nunca deja de estarlo. `Faltantes` solo decrece al avanzar el corte, salvo por nuevos rechazos, que cambian la etiqueta pero no el conjunto.
- **Incremental [T].** El estado de la proyección es el mapa `sid ↦ Estado`, restringido a `⋃ Comp_π`. Una acción `a` de `Γ_X` actualiza solo `a.sid`, y una respuesta en `Tal` actualiza solo su `sid`. El núcleo es una congruencia porque la actualización depende solo del mapa y de `a`.
- **Satisfacción por identidad, no por valor [D].** Que el color actual sea verde no da por satisfecho el componente: lo satisface el compromiso de **su** `sid`. Si otro actor ya constituyó el mismo hecho, el diff lo detecta al enrutar y no emite la solicitud; el componente se marca entonces `SatisfechoPorDiff(checkpoint)` [P].
- **Checkpoint.** `{(Tal,n,h)} ∪ {(X,n_X,h_X) : X tocado por π}`. Sin `t_ref`, salvo que el usuario quiera caducidad de propósitos (L15).
- **No hay transacción global.** El propósito **no** revierte compromisos ya hechos si otro componente se rechaza. La corrección es una nueva acción (L3, prohibido 10). [D]

### 7.7 Ejemplos de referencia (para pruebas)

**Alta de la blusa.** Blusa infantil, talla 4, verde, ropa, existencias 8, $35.000, imagen principal y 2 de galería. Con la configuración de §2.5:

| Ámbito | Solicitud | Depende de |
|---|---|---|
| `Cat` | `CrearProducto(I_P, [(I_V)])` | — |
| `Fam(P)` | `SetValor(I_P, nombre, «Blusa infantil»)`, `SetValor(I_V, talla, 4)`, `SetValor(I_V, color, verde)`, `SetValor(I_P, img.principal, Q₀)`, `SetValor(I_P, img.galería, (Q₁,Q₂))` | creación en `Cat` |
| `Clas` | `Añadir(I_P, categoría, ropa)` | creación en `Cat` |
| `Inv(W)` | Entrada de existencias 8 para `I_V` (forma según D3) | creación en `Cat` |
| `Of(B)` | `FijarPrecio(I_V, COP, 35000)` | creación en `Cat` |
| Almacén `M` | `put(B₀)`, `put(B₁)`, `put(B₂)` con `Q_i = ContentId_𝒟(B_i)` | — (no es compromiso) |

**Caso A.** Color por producto, editado desde la ficha **o** desde la tabla: `Γ_{Fam(P1)} ‖ SetValor(P1, color, verde)`. En las fibras, `F'_azul = F_azul ∖ {P1}` y `F'_verde = F_verde ∪ {P1}`. `Γ_Inv` no cambia. [T por §7.3]

**Caso B.** Stock transversal: `Γ_{Inv(W)} ‖ Sell(P1, 2)` (la acción de inventario correspondiente según L12). La ficha de P1 cambia porque su componente `Stock_W(P1)` proviene de `Inv(W)`. `Γ_Cat` y `Γ_Fam(P1)` no cambian. [T]

**Universo de prueba P1/P2.** P1 y P2 con identidades estables. Color con `ω=Sec`, categoría con `Col(Clas)` y stock en `Inv(W)`. Se construyen secciones, columnas y filtros; se edita desde la ficha y desde la tabla; y después se migra color a `Col(Y)` con §5.5, comprobando que `I` y `slot` no cambian y que `R_color` es igual antes y después. [T por I1 y §5.5; probeta P]

---

## 8. Leyes aplicables (para `kobalt-verificador`)

Oráculo común: `Fold` y reconstrucción completa desde las trayectorias. Generador: trayectorias aleatorias sobre `Reg`, `Cat`, varios `X`, `Inv(W)` y `Of(B)`, **con configuraciones `ω` aleatorias admisibles** y acciones rechazadas intercaladas.

| Ley | Cómo se verifica |
|---|---|
| **L1** | Para `R_σ` generado bajo una `ω` aleatoria: `Reconstruct(Sections(R)) = Reconstruct(Columns(R)) = R` (igualdad de conjuntos de triples con procedencia). Caso negativo: una fibra sola no reconstruye `R`. |
| **L2** | Las operaciones de bitset `∧`, `∨`, `¬_M` coinciden con un oráculo de conjuntos en filtros aleatorios. Prueba dirigida: entidad con `k` desconocida **no** aparece en `¬_{D_k} F_{k,v}`. La API no ofrece complemento sin máscara (revisión estática). La longitud del bitset es `ceil(N_σ/8)` B y extender `N` no mueve bits (I1). |
| **L3** | La API de trayectoria solo expone `append`. Tras cualquier secuencia, `Γ_n ⪯ Γ_{n+1}`. La corrección de un valor o de una identificación (`Desvincular`) es una acción nueva, nunca una edición. |
| **L4 / L9** | En todo prefijo `n`: `Π_ficha`, `Π_col`, `Π_fib` (propias, efectivas con estado de Nerode y máscaras) y `Π_falt` incrementales coinciden con la reconstrucción. Snapshot `(S_n, n, h_n)` más el sufijo equivale a `Fold` completo. |
| **L6** | Tras cada paso del generador, incluidos los rechazados, se comprueban I1–I9. |
| **L7** | Pruebas de mutación: (a) añadir al estado una aserción «todo producto tiene categoría/precio/stock» debe **romper** pruebas de alcanzabilidad; (b) un estado con valores sobre una entidad retirada es representable; (c) ninguna restricción de guarda está en el tipo (revisión estática). |
| **L8** | Dos `CrearProducto` concurrentes con el mismo vínculo `(f,x)` o el mismo SKU sobre la misma cabeza: uno falla `AppendIfHead`, se reevalúa y es rechazado por I4/I5. |
| **L10** | Comprobación exhaustiva en universos pequeños: la fibra propia univaluada o multivaluada es congruencia. Los contraejemplos de §7.3 (conteo `|F|` y fibra efectiva con herencia) deben **detectarse** como no congruentes. |
| **L14** | El alta no crea hechos de inventario ni de oferta salvo las solicitudes explícitas del router. La entrada de stock genera **exactamente** la acción configurada en D3 y ninguna otra. |
| **L16** | (a) Invariancia por interfaz: misma edición desde ficha y desde tabla ⇒ mismas solicitudes (`sid` incluido). (b) Un actor sin `Cap_X` es rechazado. (c) Una réplica que incorpora compromisos irradiados no cambia `Sids` del constituyente ni puede hacer `append` en `Γ_X`. (d) El importador no tiene ruta de escritura en `Γ`. |
| **L17** | El mismo escenario bajo `ω(color)=Sec` y `ω(color)=Col(Y)` da `R_σ` iguales (teorema de §7.4). Cambiar la materialidad (IndexedDB, archivo consolidado) no cambia `R`. |
| **L18** | Migración de color `Sec → Col(Y)`: `R_color` igual antes del sello y después de la apertura. Después del sello, una solicitud a `X` es rechazada con `ÉpocaCerrada`. En ningún corte cerrado del generador `k` pertenece a dos `Act` (I9). `I` y `slot` no cambian. Las solicitudes pendientes reciben el tratamiento de D9. |
| **L20** | Se declara la huella de cada acción (§2.2), se calcula el grafo de co‑acceso y se comprueba que los ámbitos son sus componentes. Prueba de mutación: añadir una guarda cruzada **no estable** (p. ej. `¬retirado` en `Fam`) debe hacer fallar la comprobación de A2. Configuración con SKU único y `ω=Sec` separada por familias ⇒ rechazada por A3. |
| **L21** | Cortes no cerrados (un valor con `dep=(Cat,n)` y un corte con `Cat < n`) ⇒ la proyección no se actualiza ni coloca el bit. Las fichas guardan el conjunto `{(Stream_i,n_i,h_i)}`. |
| **L22** | Una réplica con checkpoint anterior aplica solo el sufijo y verifica la cadena. Si el prefijo está manipulado o truncado, no aplica deltas. |
| **L24** | `Import(L); Import(L)` ⇒ 0 compromisos nuevos (Teorema 7.5). Interrupción tras `k` filas y reanudación ⇒ el mismo `R` y `|E|` que sin interrupción. Los contraejemplos C2, C3 y C5 de §7.5 deben reproducirse como fallos si se desactiva la condición correspondiente. Una columna ausente no borra. Una fila ambigua no compromete. Un producto ausente del archivo no se retira. |
| **L25** | `Compose` con dos ámbitos que aportan la misma `(e,k)` ⇒ `CONFLICTO` y no un valor. El slot 23 de dos catálogos distintos no se identifica. |
| **L26** | `I` no depende del nombre, SKU, imágenes ni contenido. Cambiar el SKU o el nombre no cambia `I`. Dos productos pueden compartir la imagen `Q`. La migración y el cambio de materialidad conservan `I`. |
| **L27** | Borrar todas las proyecciones (fichas, columnas, fibras, `Tab_E` derivada, vistas previas) y reconstruir ⇒ resultados idénticos. Persistir una proyección no habilita escribir en ella. |
| **L23** | Al adquirir una imagen, se recalcula `ContentId_𝒟(B') = Q`; si no coincide, se rechaza. Que el `Q` coincida no se usa como prueba de autoría ni de autoridad sobre la relación imagen–producto. |
| **L13** | Dos nodos que envían la misma solicitud (mismo `sid`) ⇒ un único compromiso: unión por identidad, no por conteo. |
| **L11 / L12** | Solo enlace: los efectos de la entrada de stock elegida en D3 coinciden con la fila correspondiente de la tabla de L12. |
| **L15** | Revisión: ninguna proyección de esta spec usa el reloj. Si se añade vigencia o caducidad, su checkpoint debe incluir `t_ref`. |

---

## 9. Fronteras [L]

Esta spec **no** garantiza:
1. **Distribución.** Ni consenso, ni exclusión entre dispositivos, ni que dos dispositivos no se crean constituyentes de `X` a la vez. L8 se especifica por ámbito; su realización (Drive, 409, etc.) no está verificada (decisiones abiertas, «Probeta 0 · Drive»). Pruebas de un solo proceso no demuestran nada de esto (prohibido 14).
2. **Durabilidad.** Ni que un compromiso aceptado sobreviva a la pérdida del dispositivo o del almacenamiento.
3. **Autoría y autenticación.** `Authorized` supone un `u` ya autenticado. Ningún kernel trae firmas: un hash o un `ContentId` reconocen bytes, no quién los publicó (L23).
4. **Verdad del mundo.** Las invariantes prueban coherencia del modelo, no que el archivo importado, el conteo o el color sean correctos (L6).
5. **Identificación semántica.** Ninguna clave prueba que dos registros externos «sean el mismo producto». Solo se garantiza que **no se fusiona sin reconocimiento explícito**. Las heurísticas son sugerencias.
6. **Atomicidad entre ámbitos.** Un alta puede quedar parcialmente constituida (producto sí, existencias no). Se garantiza solo que `q_falt` lo muestre.
7. **Idempotencia incondicional.** Solo vale bajo C1–C6. Con cambios intermedios (C4), un diff bidireccional revierte ediciones manuales.
8. **Frescura.** Toda respuesta es relativa a un corte `σ`; no hay un «ahora» global. Una réplica no afirma completitud del catálogo.
9. **Orden de ediciones concurrentes** sobre la misma `(e,k)` llegadas desde varios nodos: lo fija el constituyente al comprometer, y no es «el timestamp mayor gana» (prohibido 7).
10. **Modos de incorporación externos.** Vincular un producto ajeno conservando la autoridad de origen, o crear ofertas de productos de terceros, queda fuera (D13). Solo se especifica la «incorporación propia».
11. **Publicación, H/A/P, ventas y disponibilidad**: fuera de esta spec. Se enlazan por L11–L14.
12. **Rendimiento de FOLLOW / KOB2.** No se usa FOLLOW monolítico. La segmentación de trayectorias largas no se especifica aquí.

---

## 10. Decisiones abiertas (requieren al usuario; esta spec no las decide)

| # | Decisión | Opciones y consecuencias |
|---|---|---|
| **D1** | Clave de identificación en la importación | (a) `(fuente, idExterno)` mediante `Corr`: nunca ambigua y cumple C2 por construcción, pero no reconoce productos creados a mano antes de la primera vinculación. (b) SKU: exige SKU **único** por contrato y en `Cat` o en una columna (A3, C2); si no es único, aparecen ambigüedades. (c) Código de barras u otra. (d) Combinación con orden de prioridad. ¿Se permite acuñar `I` de forma determinista desde `(fuente, idExterno)`? |
| **D2** | Política ante ambigüedad y duplicados dentro del lote | Revisión manual obligatoria (propuesta), omitir la fila, o crear una entidad nueva marcada. Para duplicados en el lote: `Incompatible` (condición de idempotencia) o consolidación con regla explícita. |
| **D3** | Semántica del stock en alta e importación | `CorregirConteo(h, t_ref)` (absoluto; revierte movimientos intermedios si se reimporta), `Ingresar(h)` con `sid` determinista (doble ingreso si se reexporta el archivo), o una acción nueva `DeclararInicial(h)` con guarda «sin historia» (requiere ampliar la spec de inventario). También: bodega `W` destino y `t_ref` del dato. |
| **D4** | Partición de ámbitos del catálogo | `Fam(p)` por familia frente a todo fusionado en `Cat`; `Clas` como ámbito propio; qué características viven en `Cat` para nacer atómicamente con la entidad. Relacionada con la decisión abierta 3 (stock). |
| **D5** | Configuración `ω` de producción | El universo de §2.5 es un ejemplo del usuario. ¿Se adopta para la primera probeta? |
| **D6** | Diff bidireccional frente a diff a tres vías | Bidireccional (archivo frente a actualidad): simple, pero revierte ediciones manuales. A tres vías (archivo frente a la última importación de la misma fuente frente a la actualidad): respeta ediciones locales, pero exige conservar el estado importado anterior por fuente. |
| **D7** | Significado de una celda vacía | Ignorar, `DeclararVacío`, u «olvidar» (volver a desconocido, lo que requeriría una acción nueva). ¿Configurable por columna? |
| **D8** | Características multivaluadas en la importación | Reemplazar el conjunto o solo añadir. |
| **D9** | Solicitudes pendientes durante una migración | Rechazar y redirigir (reenvío con el mismo `sid`) o transferir como pendientes en la apertura. |
| **D10** | Producto/variante | ¿Variante base automática para productos sin opciones? ¿Se permite mover una variante a otro producto (rompe I2; requeriría una acción y una época nuevas)? |
| **D11** | Entidades retiradas | ¿Se pueden editar? Si «no», la regla es de interfaz o de proyección, o bien hay que co‑localizar `retirado` con los valores (cambia la partición). |
| **D12** | Vocabularios e imágenes | ¿El vocabulario solo crece (necesario para I8)? Modelo de galería: secuencia univaluada o relación con orden. Contrato `𝒟` de `ContentId` (KOB2 o SHA‑256). ¿Se descargan imágenes por URL en la importación? |
| **D13** | Modo de incorporación | Propia (especificada aquí), vinculación externa con autoridad de origen, u oferta de productos de terceros. |
| **D14** | Actores y capacidades `Cap` por ámbito | Quién define características, quién crea, quién clasifica, quién fija precios. Depende de la decisión abierta 2 (cajeros). |
| **D15** | Retención de `Sids` | Ilimitada (deduplicación perfecta) o ventana (rompe la deduplicación de reintentos antiguos). |
| **D16** | Representación del precio | Moneda, entero en unidades mínimas, vendedor `B` por defecto en el alta. |
| **D17** | Plantilla de «alta completa» | Qué componentes exige (¿precio?, ¿stock?, ¿imágenes?). Qué características son obligatorias **como guarda** (solo posible si viven en `Cat`) frente a obligatorias **como faltante** (proyección). |
| **D18** | Premisas de esta spec | Confirmar la decisión abierta 5 (trayectoria canónica para el catálogo) y la 6 (una o dos trayectorias para solicitudes y decisiones; aquí, `Tal` local más el constituyente). |
