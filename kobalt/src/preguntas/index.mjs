// Kobalt · ÁLGEBRA DE PREGUNTAS (fase 2) — punto de entrada.
// Spec: kobalt/specs/2026-11-11_fase2-preguntas.md (con sus Anexos, incluido el B) sobre la enmienda E1 del núcleo
// (kobalt/specs/2026-11-11_fase1-enmienda-preguntas.md). API: encabezado de kobalt/tests/leyes/preguntas.impl.test.mjs.
//
// El módulo responde preguntas sobre trayectorias sin saber qué significan las acciones. Una pregunta es un DATO
// (φ, aporte, M, obs [, sello]) con identidad Exacta; se compila a una Π monoidal del núcleo y la resuelve el núcleo.
// No hay motor de resolución propio, ni acciones comprometidas, ni escritura en Γ.
//
// ═══════════════ Correspondencia objeto matemático ↔ símbolo de código ═══════════════
//   q = (φ, aporte, M, obs [, sello] [, lectura temporal])  ↔ {φ, aporte, M, obs, sello?, ventanaTiempo?}      compilar.mjs
//   id(q) = 𝔇("kobalt:preguntas:q:1", CV(q))                 ↔ ETIQUETA · identidad
//   q_× = [q₁…q_m] en M₁ × … × M_m (P5, §7.7)                ↔ tupla(qs) (Array) · monoide 'tupla'
//   Π_q = (id, ver = id(q), f_φ, M, obs, leeEstado, sensibleAEpoca = false, sensibleATiempo)   ↔ compilar(q, {lectores}).proy
//   lenguaje de expresiones §4.2 (total, determinista)      ↔ CAMPOS · OPERADORES · validarExpr · evaluar         expresiones.mjs
//   registro de lectores idLector@versión ↦ {clase, fn}     ↔ LECTORES_VACIO · registrarLector
//   repertorio de monoides §7.3 y sus leyes (L33, P3, P4)   ↔ monoide(desc) · leyes(desc)                         monoides.mjs
//   VQ3 (bloques diádicos) · Teorema 7.3 · Teorema 7.2      ↔ construirSegmentos · ventanaSegmentos · ventanaPrefijos
//   repertorio de observaciones §7.5                        ↔ OBSERVACIONES · validarObs · funcionObs             observaciones.mjs
//   Respuesta(q,(i,j]) = obs(⊗_{k∈(i,j],φ} aporte(e_k, ctx_k)) ↔ responder ≡ N.resolverProyeccion                operaciones.mjs
//   q^▷ / q^▦ (VQ2 / VQ3) hasta j                           ↔ materializar ({derivada, de: q}, resuelta por el núcleo)
//   acum(i, j) desde una materialización (7.2 / 7.3)        ↔ ventana
//   τ_k = max_{k'≤k} sello(e_k') · j(t) (Teorema 7.4)       ↔ sellosEfectivos · porTiempo · filtroTiempo
//   ⊗_X acum_X sobre σ cerrado (E1.5, §7.6)                 ↔ distribuir ≡ N.proyectarCorte
//
// Separación: todo el módulo es núcleo puro (sin I/O, sin reloj, sin azar). Guardar una materialización es de la
// materialidad del nodo (un solo registro (acum, checkpoint), M4); este módulo solo devuelve el registro.
// Importa el núcleo SOLO por ../nucleo/index.mjs. No importa ni reutiliza ningún kernel de kobalt/kernels/: la
// identidad Exacta de una pregunta es la 𝔇 del núcleo (que a su vez realiza el contrato Exacto con SHA‑256).
//
// Leyes cubiertas: L32, L33, L34, L9/V10 (vía el núcleo), L10 (obs no se guarda), L15, L16 (sin escrituras), L21,
// L22, L27, P3–P6, Teoremas 7.1–7.4 (detalle en cada archivo).
// Límites [L]: spec §9 (sin control de lectura, sellos declarados y no verificados, preguntas no conmutativas o
// dependientes del estado no se distribuyen, obs se recalcula al leer, escaneo/segmentos ocupan O(n)); además el ⊗ de
// escaneo/segmentos es puro y copia, así que reconstruir una materialización cuesta O(n²) en tiempo; y distribuir
// evalúa obs con parametros: {} y sin S, porque entre trayectorias no hay un C_ε común (cada una tiene el suyo).
// L34 es estática: {derivada, de: q} con q que contiene 'secuencia', o con q ya derivada, es PREGUNTA_INVÁLIDA.

export { ETIQUETA, identidad, tupla, compilar } from './compilar.mjs';
export { CAMPOS, OPERADORES, LECTORES_VACIO, registrarLector, validarExpr, evaluar } from './expresiones.mjs';
export { monoide, leyes, construirSegmentos, ventanaSegmentos, ventanaPrefijos } from './monoides.mjs';
export { OBSERVACIONES } from './observaciones.mjs';
export { responder, materializar, ventana, sellosEfectivos, porTiempo, filtroTiempo, distribuir } from './operaciones.mjs';
export { conj } from './valores.mjs';
