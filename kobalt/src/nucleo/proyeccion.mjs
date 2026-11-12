// Kobalt · núcleo · proyeccion — Proyecciones como preguntas, checkpoints, cortes y composición (spec §7; enmienda E1, E8).
// Núcleo puro.
//
// Correspondencia:
//   Π clásica  = (id, ver, π : S → Y, [g_e : Y → Y], sensibleAÉpoca, sensibleATiempo)
//                                                   ↔ {id, ver, pi(S, ctx), g?(Y, e, ctx), sensibleAEpoca, sensibleATiempo}
//   Π monoidal = (id, ver, f, M, obs, leeEstado)     ↔ {id, ver, f(e, ctx), monoide: {unidad, op, inv?, conmutativo?,
//                                                      idempotente?}, obs(acum, ctx), leeEstado?}            (E1)
//   ctx_k = {k, parámetros: C_{ε_{k−1}} [, S_{k−1}]}  ↔ contexto de f en `aportes`
//   [f(e_k, ctx_k)]_{k ∈ (i, j]}                     ↔ aportes(proy, Γ, i, j, registro, snapshots?)
//   acum(i, j) = ⊗ aportes                           ↔ plegar(monoide, aportes(…))
//   Y(i, j) = obs(acum(i, j), {C_{ε_j} [, S_j], tRef}) ↔ proy.obs (se calcula SIEMPRE al responder)
//   Π_cabeza, Π_hashes, Π_época, Π_sid (§7.7)        ↔ PROYECCIONES.{cabeza, hashes, epoca, sids}   (forma clásica)
//   checkpoint (StreamID, n, h_n, ver, ε_n [, i, h_i] [, t_ref]) ↔ {streamId, n, h, ver, epoca[, i, hI][, tRef]}
//   resolución (reutilizar / actualizar / reconstruir) ↔ resolverProyeccion
//   corte σ : StreamID ⇀ n, cerrado causalmente (L21) ↔ esCerrado / cerrarCorte (mayor corte cerrado ≤ σ)
//   Π multi‑trayectoria sobre σ cerrado              ↔ proyectarCorte (φ de estados, o monoidal conmutativa: E1.5)
//   Compose como suma disjunta indexada por StreamID ↔ componer (L25, E8)
//
// Leyes: L4 (snapshot + sufijo = Fold, vía snapshot.mjs), L9/V10 (incremental = completo: ACTUALIZAR solo sobre el
// sufijo verificado, si no RECONSTRUIR desde Γ), L10 (forma clásica: g solo si ker π es congruencia; forma monoidal:
// la congruencia se cumple siempre, Teorema E1.3, y obs no se actualiza nunca), L15 (tRef en el checkpoint solo si
// lo guardado depende de él: forma clásica sensibleATiempo; en la monoidal solo obs lo lee), L22 (checkpoint que no
// casa con Γ ⇒ DISCONTINUIDAD y se reconstruye), L27 (las proyecciones no tienen ruta de escritura hacia Γ),
// L21 (solo se proyecta sobre cortes cerrados; entre trayectorias no hay orden ⇒ solo monoides conmutativos),
// L25 (mismo hecho desde dos StreamID ⇒ CONFLICTO; dos aportes del mismo StreamID son copias ⇒ STREAM_DUPLICADO).
// [L] obs puede ser costosa y el núcleo no la memoiza; con leeEstado, reconstruir cuesta O(sufijo desde el snapshot).

import { encEntrada, hashPaso } from './derivacion.mjs';
import { estadoInicial, fold, transformar, recomponerParametros, efectoComun } from './contrato.mjs';
import { estadoPorSnapshot } from './snapshot.mjs';

export { crearSnapshot, restaurarSnapshot } from './snapshot.mjs';

// ─────────── Proyecciones propias del núcleo (§7.7): todas congruentes ───────────
export const PROYECCIONES = Object.freeze({
  // Π_cabeza = (n, h_n); g_e(n, h) = (n+1, 𝔇(T_P, h, Enc(e))).
  cabeza: Object.freeze({
    id: 'nucleo.cabeza', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: (S, ctx) => ({ n: S.n, h: ctx.h }),
    g: (Y, e) => ({ n: Y.n + 1, h: hashPaso(Y.h, encEntrada(e)) }),
  }),
  // Π_hashes = [h_0…h_n]; g añade h_{n+1}.
  hashes: Object.freeze({
    id: 'nucleo.hashes', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: (S, ctx) => [...ctx.hashes],
    g: (Y, e) => [...Y, hashPaso(Y[Y.length - 1], encEntrada(e))],
  }),
  // Π_época = (ε, C_ε): proyección de coordenadas de S.
  epoca: Object.freeze({
    id: 'nucleo.epoca', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: S => ({ epoca: S.epoca, parametros: structuredClone(S.parametros) }),
    g: (Y, e, ctx) => (e.clase !== 'contrato' ? Y : {
      epoca: Y.epoca + 1,
      parametros: e.tipo === 'FijarParámetro' ? recomponerParametros(Y.parametros, e.args, ctx.registro) : Y.parametros,
    }),
  }),
  // Π_sid = (n, Sids); g es el efecto común con la retención de C_ε (antes de e).
  sids: Object.freeze({
    id: 'nucleo.sids', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: S => ({ n: S.n, sids: { ...S.sids } }),
    g: (Y, e, ctx) => efectoComun(Y.n, Y.sids, ctx.parametros, e.sid),
  }),
});

// ─────────── Forma de una proyección (E1) ───────────
/** ¿Forma monoidal? Se distingue por `typeof f` (encabezado de la API). */
export const esMonoidal = proy => typeof proy?.f === 'function';

/** ⊗ de una lista de elementos del monoide, de izquierda a derecha (unidad si está vacía). */
export const plegar = (monoide, ms) => ms.reduce((a, b) => monoide.op(a, b), structuredClone(monoide.unidad));

/** ε(Γ_k): número de acciones de contrato en el prefijo (V4). */
const epocaEn = (Γ, k) => { let ε = 0; for (let i = 0; i < k; i++) if (Γ.entradas[i].clase === 'contrato') ε++; return ε; };

/** C_ε vigente antes de la entrada k+1: Fold restringido a las acciones de contrato. */
function parametrosEn(Γ, k, registro) {
  let p = estadoInicial(Γ.g, registro).parametros;
  for (let i = 0; i < k; i++) { const e = Γ.entradas[i]; if (e.tipo === 'FijarParámetro') p = recomponerParametros(p, e.args, registro); }
  return p;
}

/**
 * E1 · aportes(Π, Γ, i, j) = [f(e_k, ctx_k)]_{k=i+1..j}, con ctx_k = {k, parametros: C_{ε_{k−1}} [, S: S_{k−1} si leeEstado]}.
 * Pura; es la ÚNICA definición de la contribución. `f` no recibe tRef, ni otras trayectorias, ni reloj, ni azar.
 * S_i se obtiene por el mayor snapshot válido ≤ i más el sufijo, o por Fold desde la génesis (E5).
 */
export function aportes(proy, Γ, i, j, registro, snapshots = []) {
  if (!Number.isSafeInteger(i) || !Number.isSafeInteger(j) || i < 0 || i > j || j > Γ.entradas.length) throw new Error('aportes: ventana fuera de la trayectoria');
  let { S } = estadoPorSnapshot(Γ, i, registro, snapshots);
  const out = [];
  for (let k = i + 1; k <= j; k++) {
    const e = Γ.entradas[k - 1];
    out.push(proy.f(e, proy.leeEstado ? { k, parametros: S.parametros, S } : { k, parametros: S.parametros }));
    S = transformar(S, e, registro);
  }
  return out;
}

/**
 * Resolución reutilizar / actualizar / reconstruir. Pura; ninguna ruta de escritura hacia Γ (L27).
 * args = {proy, guardado, trayectoria: Γ local verificada {streamId, g, entradas, hashes}, i? = 0, m, registro, snapshots?, tRef?}
 * → {accion: 'REUTILIZAR'|'ACTUALIZAR'|'RECONSTRUIR'|'DISCONTINUIDAD', Y, acum? (monoidal), checkpoint, desde}
 * Es la instancia «actualizar proyección» de Δ (Corolario 7.10). Teorema 7.1 / V10: el resultado es siempre el de la
 * reconstrucción desde Γ.
 */
export function resolverProyeccion(args) {
  return esMonoidal(args.proy) ? resolverMonoidal(args) : resolverClasica(args);
}

/** Forma clásica π : S → Y (fase 1 §7.4): ventana (0, m]; tRef en el checkpoint si sensibleATiempo (L15). */
function resolverClasica({ proy, guardado, trayectoria: Γ, i = 0, m, registro, snapshots = [], tRef }) {
  const nLocal = Γ.entradas.length;
  if (i !== 0) throw new Error('forma clásica: solo la ventana (0, m]');
  if (!Number.isSafeInteger(m) || m < 0 || m > nLocal) throw new Error('corte fuera de la trayectoria local');
  const checkpoint = k => ({ streamId: Γ.streamId, n: k, h: Γ.hashes[k], ver: proy.ver, epoca: epocaEn(Γ, k), ...(proy.sensibleATiempo ? { tRef } : {}) });
  const ctxPi = (S, k) => ({ registro, tRef, h: Γ.hashes[k], hashes: Γ.hashes.slice(0, k + 1), parametros: S.parametros });

  const reconstruir = accion => {
    const { S, desde } = estadoPorSnapshot(Γ, m, registro, snapshots);
    return { accion, Y: proy.pi(S, ctxPi(S, m)), checkpoint: checkpoint(m), desde };
  };

  if (!guardado) return reconstruir('RECONSTRUIR');
  const c = guardado.checkpoint;
  if (c.ver !== proy.ver || (proy.sensibleATiempo && c.tRef !== tRef)) return reconstruir('RECONSTRUIR');
  if (c.streamId !== Γ.streamId || !(c.n <= nLocal) || Γ.hashes[c.n] !== c.h || c.epoca !== epocaEn(Γ, c.n)) return reconstruir('DISCONTINUIDAD');
  if (c.n > m) return reconstruir('RECONSTRUIR'); // T no tiene inversa: no se «des‑aplica»
  if (c.n === m) return { accion: 'REUTILIZAR', Y: structuredClone(guardado.Y), checkpoint: checkpoint(m), desde: c.n };
  const sufijo = Γ.entradas.slice(c.n, m);
  if (typeof proy.g === 'function' && (!proy.sensibleAEpoca || !sufijo.some(e => e.clase === 'contrato'))) {
    let Y = structuredClone(guardado.Y), parametros = parametrosEn(Γ, c.n, registro);
    for (const e of sufijo) {
      Y = proy.g(Y, e, { registro, parametros, tRef });
      if (e.tipo === 'FijarParámetro') parametros = recomponerParametros(parametros, e.args, registro);
    }
    return { accion: 'ACTUALIZAR', Y, checkpoint: checkpoint(m), desde: c.n };
  }
  return reconstruir('RECONSTRUIR');
}

/**
 * Forma monoidal (E1, enmienda §7.3) sobre la ventana (i, m]. Se guarda acum ∈ M, nunca obs(acum): Y = obs(acum, ctx_m)
 * se recalcula SIEMPRE al responder, así que obs no necesita ser congruente (Corolario E1.3: L10 se traslada a obs).
 * Incrementalidad sin condición (Teorema E1.3): acum(i, m) = acum(i, c.n) ⊗ f*(Γ_{c.n:m}) por asociatividad.
 * checkpoint = {streamId, n: m, h: h_m, ver, epoca: ε_m [, i, hI: h_i si i > 0]}; NUNCA tRef (E1.4b: solo obs lo lee).
 * desde = i al reconstruir; c.n al reutilizar o actualizar. Un checkpoint con c.n < i no es de esta ventana:
 * DISCONTINUIDAD. Retroceder con `inv` es una optimización de la fase 2, no del núcleo.
 */
function resolverMonoidal({ proy, guardado, trayectoria: Γ, i = 0, m, registro, snapshots = [], tRef }) {
  const nLocal = Γ.entradas.length;
  if (!Number.isSafeInteger(i) || !Number.isSafeInteger(m) || i < 0 || i > m || m > nLocal) throw new Error('ventana fuera de la trayectoria local');
  const checkpoint = { streamId: Γ.streamId, n: m, h: Γ.hashes[m], ver: proy.ver, epoca: epocaEn(Γ, m), ...(i > 0 ? { i, hI: Γ.hashes[i] } : {}) };
  const { monoide } = proy;

  const responder = (accion, acum, desde) => {
    const { S } = estadoPorSnapshot(Γ, m, registro, snapshots);
    const ctxObs = proy.leeEstado ? { parametros: S.parametros, S, tRef } : { parametros: S.parametros, tRef };
    return { accion, Y: proy.obs(structuredClone(acum), ctxObs), acum, checkpoint, desde };
  };
  const reconstruir = accion => responder(accion, plegar(monoide, aportes(proy, Γ, i, m, registro, snapshots)), i);

  if (!guardado) return reconstruir('RECONSTRUIR');
  const c = guardado.checkpoint;
  if (c.ver !== proy.ver || (c.i ?? 0) !== i || (i > 0 && c.hI !== Γ.hashes[i])) return reconstruir('RECONSTRUIR');
  if (c.streamId !== Γ.streamId || !Number.isSafeInteger(c.n) || c.n < i || c.n > nLocal || Γ.hashes[c.n] !== c.h || c.epoca !== epocaEn(Γ, c.n)) {
    return reconstruir('DISCONTINUIDAD'); // L22: nunca se aplican deltas a ciegas
  }
  if (c.n > m) return reconstruir('RECONSTRUIR');
  if (c.n === m) return responder('REUTILIZAR', structuredClone(guardado.acum), c.n);
  const delta = plegar(monoide, aportes(proy, Γ, c.n, m, registro, snapshots));
  return responder('ACTUALIZAR', monoide.op(structuredClone(guardado.acum), delta), c.n);
}

// ─────────── Cortes causalmente cerrados (§7.5, L21) ───────────
// trayectorias = {StreamID ↦ {entradas:[{deps}…], hashes:[h_0…][, g]}}; σ = {StreamID ↦ n} (clave ausente ⇒ fuera de dom σ).
const depSatisfecha = (d, σ, tray) => Object.hasOwn(σ, d.stream) && σ[d.stream] >= d.k && tray[d.stream]?.hashes[d.k] === d.h;

/** σ cerrado ⟺ toda dependencia de toda entrada incluida está incluida y con el mismo hash. */
export function esCerrado(σ, tray) {
  for (const X of Object.keys(σ)) {
    if (!tray[X] || σ[X] > tray[X].entradas.length) return false;
    for (let i = 1; i <= σ[X]; i++) for (const d of tray[X].entradas[i - 1].deps) if (!depSatisfecha(d, σ, tray)) return false;
  }
  return true;
}

/**
 * Mayor corte cerrado σ* ≤ σ (Teorema 7.2: los cerrados forman un retículo) o DIVERGENCIA_DEP(X, i, Y) si lo que X leyó
 * de Y no es lo que este nodo tiene de Y (FORK o corrupción: se informa y no se compone).
 * Algoritmo: truncar cada σ_X antes de la primera entrada con una dependencia no satisfecha, hasta el punto fijo.
 */
export function cerrarCorte(σ0, tray) {
  const σ = {};
  for (const X of Object.keys(σ0).sort()) if (tray[X]) σ[X] = Math.min(σ0[X], tray[X].entradas.length);
  for (const X of Object.keys(σ).sort()) for (let i = 1; i <= σ[X]; i++) for (const d of tray[X].entradas[i - 1].deps) {
    const hY = tray[d.stream]?.hashes;
    if (hY && d.k < hY.length && hY[d.k] !== d.h) return { resultado: 'DIVERGENCIA_DEP', X, i, Y: d.stream };
  }
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const X of Object.keys(σ).sort()) {
      for (let i = 1; i <= σ[X]; i++) {
        if (tray[X].entradas[i - 1].deps.some(d => !depSatisfecha(d, σ, tray))) { σ[X] = i - 1; cambio = true; break; }
      }
    }
  }
  return { resultado: 'CERRADO', σ };
}


/**
 * Π multi‑trayectoria sobre un corte cerrado σ (tray[X] = {g, entradas, hashes}). Cuarto argumento:
 *  - φ(estados por StreamID), con S_X = Fold(S_0^X, Γ_X[..σ_X]): independiente del entrelazado; o
 *  - una proyección MONOIDAL (E1.5): solo si M es conmutativo (si no, NO_CONMUTATIVO, juzgado antes que el cierre:
 *    entre trayectorias no existe un orden, L21); valor = ⊗_X acum_X(0, σ_X), SIN obs (C_ε es propio de cada X).
 */
export function proyectarCorte(σ, tray, registro, φ) {
  if (esMonoidal(φ) && φ.monoide.conmutativo !== true) return { resultado: 'NO_CONMUTATIVO' };
  if (!esCerrado(σ, tray)) return { resultado: 'NO_CERRADO' };
  if (esMonoidal(φ)) {
    let acum = structuredClone(φ.monoide.unidad);
    for (const X of Object.keys(σ).sort()) acum = φ.monoide.op(acum, plegar(φ.monoide, aportes(φ, tray[X], 0, σ[X], registro)));
    return { resultado: 'OK', valor: acum };
  }
  const estados = {};
  for (const X of Object.keys(σ).sort()) estados[X] = fold(estadoInicial(tray[X].g, registro), tray[X].entradas.slice(0, σ[X]), registro);
  return { resultado: 'OK', valor: φ(estados) };
}

/**
 * Compose como suma disjunta con procedencia (L25): cada hecho conserva su StreamID; el mismo hecho desde dos StreamID ⇒
 * CONFLICTO. E8: la suma se indexa por StreamID, así que dos aportes con el mismo StreamID son dos copias, no dos ámbitos ⇒
 * STREAM_DUPLICADO (el primero repetido; se comprueba antes que los conflictos). Una clave «__proto__» es un hecho.
 */
export function componer(aportesC) {
  const vistos = new Set();
  for (const { streamId } of aportesC) {
    if (vistos.has(streamId)) return { resultado: 'STREAM_DUPLICADO', streamId };
    vistos.add(streamId);
  }
  const hechos = {};
  for (const { streamId, hechos: hs } of aportesC) for (const [clave, valor] of Object.entries(hs)) {
    if (Object.hasOwn(hechos, clave) && hechos[clave].streamId !== streamId) return { resultado: 'CONFLICTO', clave, streams: [hechos[clave].streamId, streamId] };
    Object.defineProperty(hechos, clave, { value: { streamId, valor }, enumerable: true, writable: true, configurable: true });
  }
  return { resultado: 'COMPUESTO', hechos };
}
