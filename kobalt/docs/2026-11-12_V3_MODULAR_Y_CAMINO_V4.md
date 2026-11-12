# Kobalt — v3 modular: qué mejora y cómo unirla con lo construido (camino a v4)

**Fecha:** 2026‑11‑12 · **Objeto:** `KOBALT_INVENTARIO_V3_MODULAR` (HTML + `Fuentes/core.js`, `api.js`, `ui.js`, CSS; manuales; 50/50 pruebas de núcleo y 67/67 de API). Revisado en Chromium con datos de ejemplo.

## 1. Qué mejora de verdad (y coincide con nuestra arquitectura)

| Mejora v3 modular | Equivalencia en Kobalt | Valoración |
|---|---|---|
| **Capas separadas.** El núcleo no toca DOM, IndexedDB ni red. La API arranca sin interfaz. La UI solo usa `KobaltAPI` (verificado: la UI se ejecuta sin acceso al núcleo) | Núcleo puro / puerta única / proyecciones (L27; «UI = Π(…)») | **Muy buena.** Es la frontera correcta |
| **`sales.preview` usa la misma función de composición que `sales.register`** | Vista previa de `δ`: admitir sin anexar (`INTERFAZ_V3_Y_MEJORA` §5) | Buena, pero **solo para ventas**. Debe ser universal |
| **Cada venta muestra su estado** («Por asignar») y las acciones posibles (Asignar, Cobrar, Cancelar) | Depósitos intermedios no vacíos = trabajo pendiente (§4 del doc de interfaz) | **Buena intuición.** Falta reunirlo en un panel «Ahora» |
| **Continuidad de formato.** Un respaldo de la v3 anterior se restaura en una base vacía | L22, migración explícita | Correcta |
| **`workspace.view` filtra por actor y por corte** | Proyección con capacidades y corte | Correcta |

## 2. Qué sigue igual (lo que propusimos y aún no se aplicó)

1. **El corte solo vive en Trayectoria**, y la lectura físico/libre/prudente se repite por pantalla. Ambos deberían ir a la barra global.
2. **La venta sigue con un desplegable** cuyo valor por defecto es «Registrar · considerar en prudente». Tu precisión pide un botón principal **«Registrar venta (descuenta stock)»** y botones que nombren cada hecho.
3. **La ficha conserva los 5 editores plegables** (comprometer edición, agregar variante, modificar variante, constituir valor, retirar). Debería ser la sección editable en su sitio.
4. **Filtros fijos** (color, existencias) en lugar de derivados de la Forma.
5. **La Trayectoria muestra códigos** (`PRODUCT_CREATE`…) y los valores no muestran su historia.
6. **El núcleo** mantiene las 22 acciones en `switch`, los 6 contadores de ID y el formato de hash propio. La lógica de cantidades sigue escrita a mano, aunque ya sabemos que es una red de depósitos (L35).

## 3. El camino: v4 = la interfaz modular de la v3 sobre los módulos de Kobalt

La separación en capas de la v3 modular hace posible algo que antes no lo era: **cambiar el motor sin tocar la interfaz.**

```
v3 modular                                    v4
──────────────────────────────────            ───────────────────────────────────────────
ui.js  + base.css + interface.css   ──(se conserva y se mejora)──►  ui.js + CSS
api.js (comandos + 14 consultas)    ──(se reemplaza)──►  puerta única:
                                                           proponer(plantilla) → kobalt/src/dominio (δ)
                                                           preguntar(q)        → kobalt/src/preguntas
                                                           previsualizar(δ)    → admitir sin anexar (núcleo)
core.js (22 acciones, 6 contadores) ──(se reemplaza)──►  kobalt/src/nucleo + kobalt/src/dominio
IndexedDB en api.js                 ──(se separa)──►     adaptador de materialidad (fase 5, M1)
```

**Pasos**, que coinciden con las fases 4–6 del plan:
1. **Adaptador de compatibilidad.** Una capa que expone a `ui.js` los nombres que hoy consume (`sales.register`, `sales.preview`, `workspace.view`…) y los traduce a plantillas `δ` y a preguntas. La UI funciona sin cambios sobre el motor nuevo. Prueba de aceptación: los 67 casos de la API v3 contra el adaptador.
2. **Adaptador IndexedDB** con compare‑and‑append atómico (M1) y la cadena del núcleo. Los respaldos v3 se importan por **migración explícita**, porque su formato de hash es otro.
3. **Mejora de la UI** según `INTERFAZ_V3_Y_MEJORA`: corte y lectura globales, botones que nombran el hecho, ficha como sección, filtros desde la Forma, historia de cada valor, panel «Ahora», vista previa universal.
4. **Retirar el adaptador de compatibilidad** cuando `ui.js` hable directamente en plantillas y preguntas.

Cada paso deja una aplicación que funciona. Ninguno exige reescribir la interfaz desde cero.

## 4. Estado de nuestros módulos (12‑nov)
- **Núcleo:** integrado (PASS + CONFORME).
- **Preguntas (fase 2):** implementado; en verificación y revisión finales.
- **Dominio, Forma y red (fase 3):** en implementación.

Cuando las fases 2 y 3 se integren, el paso 1 (adaptador de compatibilidad) puede empezar: es la primera pieza de la fase 6.
