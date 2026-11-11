# undr2026 — Kobalt

Este repositorio contiene:
- archivos de ideas **cifrados** en la raíz (`*.md` y `*.docx` con nombre hash y cabecera `CERB`). No los modifiques ni los descifres sin que el usuario lo pida;
- el proyecto **Kobalt**: un sistema de inventario, POS y ecommerce construido sobre kernels lógico‑matemáticos propios (`kobalt/`).

## Regla de oro
**Primero claridad matemática, luego claridad conceptual, luego código.**
Kobalt **no** es un inventario tradicional. Antes de diseñar, programar, revisar o probar cualquier cosa de Kobalt, carga la skill **`kobalt-kernels`**. Para escribir o revisar pruebas, carga también **`kobalt-verificar-leyes`**.

## Mapa
```
.claude/skills/kobalt-kernels/          canon: glosario, leyes L1–L27, supuestos prohibidos, kernels
.claude/skills/kobalt-verificar-leyes/  cómo convertir leyes en pruebas; ejemplo/ ejecutable (oráculo H/A/P)
.claude/agents/                         kobalt-matematico · kobalt-verificador · kobalt-implementador · kobalt-revisor-conceptual
kobalt/kernels/                         ORIGINALES de KOB2 9.0.1, Mechanisms 1.0.0, Minimal Flat 1.0.0, contrato Exacto (NO MODIFICAR)
kobalt/docs/                            atlas técnico de los tres kernels y nota de análisis del inventario
kobalt/specs/                           especificaciones matemáticas aprobadas (las escribe kobalt-matematico)
kobalt/tests/                           modelos de referencia y pruebas de leyes (las escribe kobalt-verificador)
kobalt/src/                             implementación (la escribe kobalt-implementador)
```

## Orquestación de varios agentes
Para cada módulo o flujo:

1. **`kobalt-matematico`** escribe `kobalt/specs/<fecha>_<modulo>.md`. Si deja decisiones abiertas, **pregunta al usuario** antes de seguir.
2. **`kobalt-verificador`** (fase 1) escribe el modelo de referencia y las pruebas `Lk …`. Las pruebas contra la implementación deben fallar todavía.
3. **`kobalt-implementador`**: uno por módulo independiente, **en paralelo y cada uno con `isolation: "worktree"`**. Módulos que comparten un ámbito (L20) no se reparten entre implementadores distintos.
4. **`kobalt-verificador`** (fase 2) ejecuta las pruebas y los mutantes y emite `PASS` o `VETO`.
5. **`kobalt-revisor-conceptual`** audita el diff y emite `CONFORME` u `OBJECIONES`.
6. Solo con `PASS` + `CONFORME` se integra el worktree. Un `VETO` o una objeción vuelve al paso 3 (o al 1 si la spec está mal).

## Comandos
```bash
node --test .claude/skills/kobalt-verificar-leyes/ejemplo/inventario.leyes.test.mjs
node --test 'kobalt/tests/leyes/*.test.mjs'   # cuando existan (Node 22 no acepta un directorio; usar el patrón entre comillas)
node kobalt/kernels/Verificacion/2026-11-10_2043_RUN_KOB2_TESTS.js
(cd kobalt/kernels && sha256sum -c SHA256SUMS.txt)
```

## Reglas duras
- Los kernels de `kobalt/kernels/` no se editan nunca.
- No se debilitan, borran ni se marcan como `skip` las pruebas de leyes para hacerlas pasar.
- Toda afirmación lleva su etiqueta de certeza: [T] teorema, [V] verificada, [D] doctrina, [P] propuesta, [L] límite.
- Las decisiones de `kobalt-kernels/references/decisiones-abiertas.md` las toma el usuario.
