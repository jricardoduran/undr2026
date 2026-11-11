// Kobalt · núcleo · proyeccion — Proyecciones, snapshots, checkpoints, cortes y composición (spec §7). Núcleo puro.
//
// Correspondencia:
//   Π = (id, ver, π : S → Y, [g_e : Y → Y], sensibleAÉpoca, sensibleATiempo) ↔ {id, ver, pi(S, ctx), g?(Y, e, ctx), sensibleAEpoca, sensibleATiempo}
//   Π_cabeza, Π_hashes, Π_época, Π_sid (§7.7)                 ↔ PROYECCIONES.{cabeza, hashes, epoca, sids}
//   snapshot (S_n, n, h_n, ε_n, ver, Q = 𝔇(T_N, CV(S_n)))      ↔ crearSnapshot / restaurarSnapshot
//   checkpoint (StreamID, n, h_n, ver(Π), ε_n [, t_ref])       ↔ {streamId, n, h, ver, epoca[, tRef]}
//   resolución §7.4 (reutilizar / actualizar / reconstruir)    ↔ resolverProyeccion
//   corte σ : StreamID ⇀ n, cerrado causalmente (L21)          ↔ esCerrado / cerrarCorte (mayor corte cerrado ≤ σ)
//   Π multi‑trayectoria = φ(Fold por StreamID) sobre σ cerrado  ↔ proyectarCorte
//   Compose como suma disjunta (L25)                           ↔ componer
//
// Leyes: L4 (snapshot + sufijo = Fold; un snapshot solo se usa si h_n coincide con la Γ local), L9 (incremental =
// completo: ACTUALIZAR solo con g sobre el sufijo, si no RECONSTRUIR desde Γ), L10 (g solo si ker π es congruencia;
// las proyecciones del núcleo lo son, incluidas las acciones de contrato: g recibe C_ε antes de la entrada),
// L15 (t_ref en el checkpoint de una Π sensibleATiempo), L22 (checkpoint que no casa con Γ ⇒ DISCONTINUIDAD y se
// reconstruye; nunca se aplican deltas a ciegas), L27 (las proyecciones no tienen ruta de escritura hacia Γ),
// L21 (solo se proyecta sobre cortes cerrados), L25 (mismo hecho desde dos StreamID ⇒ CONFLICTO, no un valor).
// [L] Q detecta corrupción de bytes del snapshot, NO un S_n mal calculado (L23): solo la reconstrucción lo detecta.

import { cv } from './cv.mjs';
import { derivar, ETIQUETAS, encEntrada, hashPaso } from './derivacion.mjs';
import { estadoInicial, fold, recomponerParametros, efectoComun } from './contrato.mjs';

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

// ─────────── Snapshots (§7.2) ───────────
const codS = (S, registro) => {
  const regla = registro[S.parametros['nucleo.regla']];
  return { D: regla.codD ? regla.codD(S.D) : S.D, epoca: S.epoca, n: S.n, parametros: S.parametros, sellado: S.sellado, sids: S.sids };
};

/** Snapshot de S_n en la posición de hash h. No es otra fuente de verdad (L4). */
export function crearSnapshot(S, h, registro) {
  return { S: structuredClone(S), n: S.n, h, epoca: S.epoca, ver: S.parametros['nucleo.regla'], Q: derivar(ETIQUETAS.SNAPSHOT, cv(codS(S, registro))) };
}

/** S si el snapshot casa con la Γ local verificada (h_n) y su Q es íntegro; si no, null. */
export function restaurarSnapshot(snap, hashesLocales, registro) {
  if (!snap || !snap.S || !Number.isSafeInteger(snap.n) || hashesLocales[snap.n] !== snap.h) return null;
  if (snap.S.n !== snap.n || snap.S.epoca !== snap.epoca) return null;
  let Q;
  try { Q = derivar(ETIQUETAS.SNAPSHOT, cv(codS(snap.S, registro))); } catch { return null; }
  return Q === snap.Q ? structuredClone(snap.S) : null;
}

// ─────────── Resolución de proyecciones (§7.4) ───────────
/** ε(Γ_k): número de acciones de contrato en el prefijo (V4). */
const epocaEn = (Γ, k) => { let ε = 0; for (let i = 0; i < k; i++) if (Γ.entradas[i].clase === 'contrato') ε++; return ε; };

/** C_ε vigente antes de la entrada k+1: Fold restringido a las acciones de contrato. */
function parametrosEn(Γ, k, registro) {
  let p = estadoInicial(Γ.g, registro).parametros;
  for (let i = 0; i < k; i++) { const e = Γ.entradas[i]; if (e.tipo === 'FijarParámetro') p = recomponerParametros(p, e.args, registro); }
  return p;
}

/**
 * args = {proy, guardado: null | {Y, checkpoint}, trayectoria: Γ local verificada {streamId, g, entradas, hashes},
 *         m, registro, snapshots?, tRef?}
 * → {accion: 'REUTILIZAR'|'ACTUALIZAR'|'RECONSTRUIR'|'DISCONTINUIDAD', Y, checkpoint, desde}
 * Es la instancia «actualizar proyección» de Δ (Corolario 7.10): Δ = ∅ ⇒ reutilizar; Δ = sufijo ⇒ actualizar;
 * si no ⇒ reconstruir. Teorema 7.1: en todos los casos el resultado es π(Fold(S_0, Γ_m)).
 */
export function resolverProyeccion({ proy, guardado, trayectoria: Γ, m, registro, snapshots = [], tRef }) {
  const nLocal = Γ.entradas.length;
  if (!Number.isSafeInteger(m) || m < 0 || m > nLocal) throw new Error('corte fuera de la trayectoria local');
  const checkpoint = k => ({ streamId: Γ.streamId, n: k, h: Γ.hashes[k], ver: proy.ver, epoca: epocaEn(Γ, k), ...(proy.sensibleATiempo ? { tRef } : {}) });
  const ctxPi = (S, k) => ({ registro, tRef, h: Γ.hashes[k], hashes: Γ.hashes.slice(0, k + 1), parametros: S.parametros });

  const reconstruir = accion => {
    let desde = 0, S = null;
    const candidatos = snapshots.filter(s => s && s.n <= m).sort((a, b) => b.n - a.n);
    for (const s of candidatos) { const R = restaurarSnapshot(s, Γ.hashes, registro); if (R) { S = R; desde = s.n; break; } }
    if (!S) S = estadoInicial(Γ.g, registro);
    S = fold(S, Γ.entradas.slice(desde, m), registro);
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

/** Π multi‑trayectoria = φ({X ↦ Fold(S_0^X, Γ_X[..σ_X])}); solo sobre cortes cerrados. Independiente del entrelazado. */
export function proyectarCorte(σ, tray, registro, φ) {
  if (!esCerrado(σ, tray)) return { resultado: 'NO_CERRADO' };
  const estados = {};
  for (const X of Object.keys(σ).sort()) estados[X] = fold(estadoInicial(tray[X].g, registro), tray[X].entradas.slice(0, σ[X]), registro);
  return { resultado: 'OK', valor: φ(estados) };
}

/** Compose como suma disjunta con procedencia (L25): cada hecho conserva su StreamID; el mismo hecho desde dos StreamID ⇒ CONFLICTO. */
export function componer(aportes) {
  const hechos = {};
  for (const { streamId, hechos: hs } of aportes) for (const [clave, valor] of Object.entries(hs)) {
    if (Object.hasOwn(hechos, clave) && hechos[clave].streamId !== streamId) return { resultado: 'CONFLICTO', clave, streams: [hechos[clave].streamId, streamId] };
    Object.defineProperty(hechos, clave, { value: { streamId, valor }, enumerable: true, writable: true, configurable: true });
  }
  return { resultado: 'COMPUESTO', hechos };
}
