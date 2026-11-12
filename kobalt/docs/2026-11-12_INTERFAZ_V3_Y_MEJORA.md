# Kobalt — La interfaz v3 y cómo mejorarla con la claridad ganada

**Fecha:** 2026‑11‑12 · **Objeto:** `KOBALT_INVENTARIO_V3_UI.html`. Se revisó en Chromium con datos de ejemplo: 2 variantes, 2 conteos y 1 venta suave.
**Fuentes de claridad:** `ANALISIS_PRODUCTO_Y_TRAYECTORIA`, `ALGEBRA_DE_PREGUNTAS`, `ANALISIS_INVENTARIO_V2`, `AMPLIACION_V3_Y_REVISION` (verbo único, plantillas, toda vista es una pregunta).
**Destino:** fase 6 del plan (interfaz).

---

## 1. Principio rector

```
Pantalla = Π( Realidad @ corte , Capacidades , Propósito )
Botón    = plantilla con nombre → δ (un elemento del monoide producto)
Vista    = pregunta (φ, f, M, obs) sobre Γ comprometida
```

En la interfaz el usuario solo hace **tres cosas**, igual que la arquitectura:
1. **Preguntar:** ver.
2. **Proponer:** actuar mediante plantillas.
3. **Recorrer:** el tiempo y la historia.

Todo lo que no sea una de las tres sobra.

---

## 2. Lo que la v3 ya hace bien (se conserva)

- **Base visual limpia y legible.** Navegación lateral clara; indicador «Local · corte n».
- **Lectura de disponibilidad separada de la escritura.** El selector físico/libre/prudente no produce eventos.
- **«Antes y después» al registrar una venta.** Es mostrar el efecto de `δ` antes de comprometerlo.
- **Deslizador de corte en Trayectoria.** Es el viaje en el tiempo, que emerge de `Fold(Γ≤n)`.
- **Operar / Aprender** con el Atlas vivo leyendo la misma API.
- **Medios exactos** con uso y audiencia.

## 3. Diagnóstico: dónde la interfaz vuelve a lo tradicional

| # | En la v3 | Por qué choca con la claridad | Mejora |
|---|---|---|---|
| 1 | **El corte solo vive en «Trayectoria»** | El viaje en el tiempo es una propiedad de **toda** pregunta, no una pantalla | El **corte es global**, en la barra superior: catálogo, existencias y ventas a cualquier fecha. Fuera de «ahora», todo es de solo lectura, con una franja «Viendo el corte 31‑oct · solo lectura» |
| 2 | **El selector de lectura se repite** en Productos e Inventario | Es un parámetro de la pregunta, no de la página | La lectura es global y va junto al corte. La barra superior *es* la pregunta: **corte · lectura · perfil** |
| 3 | **Venta: un desplegable «Modalidad»** cuyo valor por defecto es «Registrar · considerar en prudente» | Tu precisión: el hecho más común es vender y entregar | **Cuatro botones que nombran el hecho**. El principal es **Registrar venta (descuenta stock)**; los otros: *Vender y apartar*, *Registrar pedido*, *Registrar sin afectar stock* |
| 4 | **Ficha con 5 editores plegables** (identificadores, campos canónicos, agregar variante, modificar variante, campo personalizado) | Refleja las 22 acciones de la v2, no la Forma | **La ficha es la sección**: cada valor visible es una coordenada `(e,k)` que se edita en su sitio (un solo verbo). Lo canónico y lo personalizado se ven igual (Forma única). «Agregar variante» es un nacimiento dentro de la ficha |
| 5 | **Filtros fijos:** «Filtrar por color», «Organizar por», «Valor de la característica», «Filtrar por existencias» | Codifica a mano qué características se filtran | **Fichas de filtro (fibras) derivadas de la Forma**: toda característica de clase asignación o conjunto ofrece su fibra, y se combinan con «y», «o», «no». Añadir «material» a la Forma crea su filtro sin código |
| 6 | **Inventario: «Registrar movimiento» con operación Conteo, Ingreso o Mínimo** | El mínimo es una **característica** (umbral), no un movimiento | Los movimientos son plantillas de la Red (Contar, Ingresar, Transferir). El mínimo se fija en la ficha. La tabla de 9 columnas muestra la lectura elegida y el descuadre; el detalle H/A/P se abre por variante |
| 7 | **El héroe «Disponibilidad del catálogo: 11»** suma unidades de productos distintos | Es un agregado con poca utilidad para actuar | Panel **«Ahora»**: lo que pide acción (§4) |
| 8 | **La Trayectoria muestra códigos** (`PRODUCT_CREATE`, `STOCK_COUNT`) | La historia se lee en el lenguaje de la máquina | Cada compromiso se lee como una frase con el **nombre de su plantilla**: «Venta de 3 · Camiseta verde 4 · $32.000 · pedido». Hay filtros por entidad, actor y plantilla (preguntas «por acción») |
| 9 | **Un valor no explica de dónde viene** | La Trayectoria es la fuente, pero la interfaz no lo aprovecha | **Todo valor es clicable y muestra su historia**: el kardex de la coordenada `(e,k)`, es decir, `Γ` filtrada por objetivo y característica. «¿Por qué hay 7?» se contesta en un clic |
| 10 | **El perfil simulado** solo filtra al enviar | La autoridad debería ser visible antes de actuar | Las plantillas para las que el perfil no tiene capacidad aparecen deshabilitadas, con el motivo («requiere propietario») |
| 11 | **Fallo visible:** en Trayectoria aparece el texto literal `class="hint">El hash reconoce…` | Error de plantilla HTML | Corregir |

---

## 4. Lo más valioso que emerge: el panel «Ahora» sin un sistema de tareas

En la red de depósitos (L35), las unidades y el dinero que están en **depósitos intermedios** son exactamente el trabajo pendiente:

| Depósito no vacío | Significa | Acción sugerida (plantilla) |
|---|---|---|
| `pend_s > 0` | Pedido sin asignar | Asignar / Rechazar |
| `asig_s > 0` | Apartado sin despachar | Despachar |
| `porCobrar_s > 0` | Venta sin cobrar | Cobrar |
| `sol_d > 0` | Devolución sin recibir | Recibir (apta / no apta) |
| `cupo_d > 0` y cobrado | Reembolso pendiente | Reembolsar |
| `transito_v > 0` | Mercancía en tránsito | Recibir transferencia |
| `H ≤ umbral` (fibra) | Bajo stock | Ingresar |
| `H < 0` o `descuadre ≠ 0` | Descuadre | Contar |

**[T]** «Lo pendiente» es la pregunta `{ℓ ∈ L_intermedios : m_ℓ ≠ 0}` más las fibras de alerta. **No hace falta un módulo de tareas ni de notificaciones**: la lista de trabajo es el marcado de la red leído de otra forma, y se vacía sola cuando se disparan las transiciones.

---

## 5. La acción universal: vista previa de `δ`

Toda acción (vender, contar, editar un color, añadir una foto) se presenta igual:
1. El usuario rellena la plantilla.
2. La interfaz pide a la API **`previsualizar(acción)`**:
   - ¿es admisible?;
   - si no, qué guarda falla («faltan 2 unidades libres»);
   - qué coordenadas cambian, **antes → después**.
3. **Comprometer** y la vista se actualiza.

El «Antes y después» de la v3 se generaliza a **toda** acción con **una sola** función: admitir sin anexar y comparar las proyecciones. No hace falta código de vista previa por formulario.

## 6. Estructura propuesta (mínima)

```
┌ Barra superior = la pregunta actual ───────────────────────────────────────┐
│ Corte: [Ahora ▾ | fecha | n]   Lectura: [físico | libre | prudente]   Perfil: [Propietario ▾] │
└────────────────────────────────────────────────────────────────────────────┘
 Ahora        → depósitos intermedios no vacíos + alertas (§4)
 Catálogo     → secciones y columnas de productos; fibras como fichas de filtro (§3.5)
 Existencias  → Flat por bodega según la lectura; plantillas Contar, Ingresar, Transferir
 Ventas       → entidades venta con su estado en la red; plantillas de venta (§3.3)
 Trayectoria  → Γ en frases, con filtros por entidad, actor y plantilla; verificar cadena
 Aprender     → superposición que explica **la pantalla actual**: qué pregunta es, qué δ dispara cada botón
 API          → «ver esta vista como pregunta / esta acción como δ» (el mismo JSON que usa la UI)
```

- **Clientes y usuarios** dejan de ser una sección aparte: son entidades de la Forma, que se ven desde Catálogo (filtro por tipo) o desde la ficha de una venta.
- **Respaldo y Drive** van a un menú de sistema: son materialidad, no negocio.

## 7. Qué no hacer
- No crear un módulo de tareas, notificaciones, reportes o historial por pantalla: todos son preguntas (§4, §3.8, §3.9).
- No codificar filtros, columnas ni campos por característica: salen de la Forma.
- No esconder el tiempo en una pestaña: el corte es de toda pregunta.
- No poner una modalidad por defecto que no corresponda al hecho más común.

## 8. Encaje en el plan
- **Fase 6** usa este documento como spec conceptual. Depende de la fase 2 (preguntas: vistas, fibras, kardex de coordenada, «Ahora») y de la fase 3 (plantillas, Forma, red; `previsualizar` = admitir sin anexar).
- La **interfaz v3 es la referencia visual**: estilo, tipografía, tarjetas, navegación lateral y Operar/Aprender. Se conserva su estética y se reorganiza su estructura.
