---
name: kobalt-verificar-leyes
description: Convierte las leyes de Kobalt (L1–L35 de la skill kobalt-kernels) en pruebas de propiedades ejecutables con un modelo de referencia (oráculo Fold), generadores de trayectorias, reducción por prefijo, pruebas de congruencia y pruebas de mutación. Úsala al escribir o revisar tests de cualquier módulo Kobalt (inventario, disponibilidad, proyecciones, fibras, importación, réplicas), al comprobar que una proyección incremental coincide con la reconstrucción, o antes de declarar verificada una propiedad.
---

# Verificar leyes de Kobalt

Requisito: haber cargado la skill **`kobalt-kernels`**. Esta skill sólo dice **cómo** comprobar sus leyes.

## Principio

> Una ley sin prueba ejecutable es una opinión. Una prueba que nunca ha fallado no prueba nada.

Cada ley `Lk` aplicable a un módulo debe tener al menos una prueba con nombre que empiece por `Lk ` y que:
1. se pueda ejecutar sin red (`node --test <archivo>` en Node ≥ 22; sin dependencias salvo autorización);
2. compare la implementación con un **modelo de referencia** cuando la ley trata del estado o de proyecciones;
3. haya fallado al menos una vez frente a un mutante (ver §5).

## 1. El modelo de referencia (oráculo)

Es la traducción **literal** de la matemática: `admisible(S,a)` (guardas), `transformar(S,a)` (T pura, sin mutar), `fold`, `comprometer` (AppendIfHead + autorización + admisión) y las proyecciones `Π_q`.
No optimiza, no persiste y no tiene red. La implementación real (IndexedDB, Drive, incremental, bitsets) se compara contra él.

Ejemplo completo y verificado: `ejemplo/inventario.modelo.mjs`.

## 2. Generar trayectorias, no estados

El espacio correcto de prueba son **las trayectorias alcanzables**, no estados arbitrarios: el generador propone acciones aleatorias (incluidas las inadmisibles y las no autorizadas) y sólo conserva las que pasan `comprometer`.
- Usa una semilla fija (`KOBALT_SEED`) y repórtala al fallar.
- Usa un pool pequeño de ids para forzar repeticiones y probar la idempotencia (L13, L24).
- Comprueba que el generador produce compromisos **y** los tres tipos de rechazo; si no, la prueba está vacía.

**Reducción por prefijo:** como `Γ` es un monoide libre, el contraejemplo mínimo natural es el prefijo más corto que falla. Repórtalo acción por acción.

## 3. Patrones por familia de ley

| Ley | Patrón de prueba |
|---|---|
| L4 snapshots | `∀ corte n: fold(fold(S0,Γ[0:n]), Γ[n:]) ≡ fold(S0,Γ)` |
| L6 invariantes | recorrer `Γ` y comprobar `V_C` en **cada** estado intermedio |
| L7 guardas ≠ invariantes | un caso dirigido que alcance legítimamente `H < A`, y que la guarda siga bloqueando nuevas asignaciones |
| L8 atomicidad | dos compromisos con la **misma** cabeza observada: exactamente uno se acepta y el otro da `CABEZA_CAMBIADA` |
| L9 incremental | `∀ checkpoint n: Update(Update(∅,Γ[0:n]), Γ[n:]) ≡ Π(fold(S0,Γ))` |
| L10 congruencia | buscar `s,s'` con `π(s)=π(s')` y `π(T_a s)≠π(T_a s')`; si existe, la proyección **no** puede ser incremental desde sí misma |
| L11/L12 disponibilidad | desigualdades y la tabla de efectos por transición, sobre trayectorias generadas |
| L13 unión | un caso dirigido donde `min` da un resultado distinto de la unión, más el reenvío de las mismas solicitudes |
| L16 autoridad | un actor no autorizado obtiene `NO_AUTORIZADO`; una réplica no crea compromisos nuevos |
| L1/L2 fibra | `Reconstruct(Sections) = Reconstruct(Columns) = R`; filtros comparados con el cálculo por conjuntos; complemento relativo a `U` |
| L18 migración | migrar ida y vuelta conserva valores e identidades, y nunca hay dos constituyentes en la misma época |
| L22 continuidad | manipular una acción o truncar `Γ` se detecta contra el checkpoint |
| L24 importación | importar dos veces el mismo archivo produce los mismos compromisos que importarlo una vez |

## 4. Pruebas metamórficas útiles
- **Partición de ámbitos (L20):** intercalar de otra forma las acciones de ámbitos independientes no cambia ninguna proyección por ámbito.
- **Orientación (L17):** el mismo cambio hecho desde la ficha o desde la tabla transversal produce el mismo compromiso en el mismo constituyente.
- **Réplica:** una réplica que recibe `Γ` en cualquier fragmentación de prefijos llega a la misma `S`.

## 5. Prueba de mutación (obligatoria antes de declarar [V])
Introduce en una **copia temporal** los errores tradicionales típicos y confirma que alguna ley falla:
1. doble descuento (no restar `P` al asignar) ⇒ debe fallar L9 o L12;
2. guarda convertida en invariante (impedir `CorregirConteo` por debajo de `A`) ⇒ debe fallar L7;
3. last‑write‑wins o ignorar la cabeza en `comprometer` ⇒ debe fallar L8;
4. `min` en lugar de unión ⇒ debe fallar L13.

Con el ejemplo incluido, los mutantes 1 y 2 se detectaron el 11‑nov‑2026 (L9 con un prefijo mínimo de 9 acciones; L7).

## 6. Informe que debe entregar quien verifica
```
Módulo: …            Semilla: …        Casos: …
Lk  nombre                         resultado   evidencia
L9  incremental = completo         PASS        300 trayectorias, todos los cortes
L8  único sucesor por cabeza       PASS        caso dirigido
…
Mutantes: doble-descuento → detectado por L9 · …
Límites [L]: pruebas de un solo proceso; NO demuestran consenso, exclusión entre dispositivos ni durabilidad.
```

## 7. Ejecutar el ejemplo
```bash
node --test .claude/skills/kobalt-verificar-leyes/ejemplo/inventario.leyes.test.mjs
```
Kernels originales:
```bash
node kobalt/kernels/Verificacion/2026-11-10_2043_RUN_KOB2_TESTS.js
```
