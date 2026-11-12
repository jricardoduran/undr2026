// Kobalt · preguntas · operaciones — lecturas puras sobre trayectorias verificadas (spec fase 2 §5, §7). Núcleo puro.
// NINGUNA operación constituye ni escribe en Γ (L16, L27): no hay acciones comprometidas en esta fase.
// No hay motor de resolución propio (E1, R1): toda respuesta sale de N.resolverProyeccion, N.aportes o
// N.proyectarCorte sobre la Π que devuelve compilar. Este archivo no recorre Γ.entradas para plegar.
//
// Correspondencia (o = {registro, lectores, snapshots?, tRef?}):
//   Respuesta(q, (i, j]) = obs(⊗_{k∈(i,j], φ} aporte(e_k, ctx_k), ctx_j)   ↔ responder = N.resolverProyeccion(compilar(q).proy)
//   materialización q^▷ (VQ2) / q^▦ (VQ3) hasta j                          ↔ materializar = responder({derivada, de: q}) en (0, j]
//   Teorema 7.2 (grupos o envolvente ℤ^X) / 7.3 (segmentos)                ↔ la operación de intervalo sobre una materialización
//   S_j = Fold(S_0, Γ_j) o snapshot validado + sufijo (E5, L4)             ↔ estadoEn (N.fold, N.restaurarSnapshot)
//   τ_k = max_{k' ≤ k} sello(e_k') (pregunta 'máximo' sobre el sello)      ↔ sellosEfectivos (N.aportes)
//   j(t) = max{k : τ_k ≤ t} (búsqueda binaria; τ es monótono)              ↔ porTiempo ('prefijo')
//   φ ∧ t₁ < sello ≤ t₂ (lectura «filtro», Teorema 7.4b)                   ↔ filtroTiempo · porTiempo ('filtro')
//   ⊗_X acum_X sobre un corte cerrado σ (E1.5, §7.6)                       ↔ distribuir = N.proyectarCorte(σ, …, proy)
//
// Leyes: L32/L9/V10 (responder = reconstrucción desde Γ, desde cualquier checkpoint: lo garantiza el núcleo), L22
// (una materialización cuyo checkpoint no casa con Γ ⇒ MATERIALIZACIÓN_INVÁLIDA; no se usa a ciegas), L34 (secuencia ⇒
// NO_MATERIALIZABLE en materializar, MATERIALIZACIÓN_INVÁLIDA en el intervalo, materializable: false en responder;
// la derivada es PREGUNTA_INVÁLIDA en compilar), P3 (P_i⁻¹ ⊗ P_j), L21 (distribuir solo sobre cortes cerrados; lo
// juzga el núcleo), L13/P4 (no conmutativo ⇒ NO_CONMUTATIVO; dependiente del estado ⇒ DEPENDE_DEL_ESTADO: el orden importa a través de S),
// L15 (tRef solo llega a obs; el checkpoint no lo lleva), L16 (una respuesta no confiere autoridad).

import { resolverProyeccion, aportes, proyectarCorte, fold, estadoInicial, restaurarSnapshot } from '../nucleo/index.mjs';
import { esMapa, ent } from './valores.mjs';
import { compilarConMonoide, identidad } from './compilar.mjs';
import { leyes, ventanaPrefijos, ventanaSegmentos } from './monoides.mjs';

const comoInvalida = c => ({ resultado: 'PREGUNTA_INVÁLIDA', motivo: c.motivo });
const TIPOS_MATERIALIZACION = Object.freeze(['prefijos', 'segmentos']);

/** S_k por el mayor snapshot válido ≤ k más el sufijo, o por Fold desde la génesis (E5, L4). */
function estadoEn(Γ, k, registro, snapshots = []) {
  const candidatos = (snapshots ?? []).filter(s => s && ent(s.n) && s.n <= k).sort((a, b) => b.n - a.n);
  for (const s of candidatos) {
    const S = restaurarSnapshot(s, Γ.hashes, registro);
    if (S) return fold(S, Γ.entradas.slice(s.n, k), registro);
  }
  return fold(estadoInicial(Γ.g, registro), Γ.entradas.slice(0, k), registro);
}

/** ctx de obs en la posición j: {parametros: C_{ε_j} [, S: S_j si leeEstado], tRef}. */
function ctxObs(proy, S, tRef) {
  return proy.leeEstado ? { parametros: S.parametros, S, tRef } : { parametros: S.parametros, tRef };
}

/** responder(q, Γ, {i = 0, j = n, guardado = null, …o}) ≡ N.resolverProyeccion(compilar(q).proy). */
export function responder(q, Γ, o = {}) {
  const c = compilarConMonoide(q, o);
  if (c.resultado !== 'COMPILADA') return comoInvalida(c);
  const r = resolverProyeccion({
    proy: c.proy, guardado: o.guardado ?? null, trayectoria: Γ, i: o.i ?? 0, m: o.j ?? Γ.entradas.length,
    registro: o.registro, snapshots: o.snapshots ?? [], tRef: o.tRef,
  });
  // L34: el registro de una pregunta que contiene 'secuencia' se marca como no materializable (es Γ filtrada).
  return { resultado: 'OK', ...r, ...(leyes(c.M).materializable ? {} : { materializable: false }) };
}

/**
 * materializar(q, Γ, j, {tipo, guardado?, …o}) → {resultado:'OK', accion, mat: {tipo, acum, checkpoint}} | NO_GRUPO | NO_MATERIALIZABLE.
 * La materialización ES una pregunta (VQ2, VQ3): la derivada {derivada: tipo, de: q}, resuelta por el núcleo en (0, j].
 */
export function materializar(q, Γ, j, o = {}) {
  const c = compilarConMonoide(q, o);
  if (c.resultado !== 'COMPILADA') return comoInvalida(c);
  if (!TIPOS_MATERIALIZACION.includes(o.tipo)) throw new Error('materializar: tipo ∈ {prefijos, segmentos}');
  const L = leyes(c.M);
  if (!L.materializable) return { resultado: 'NO_MATERIALIZABLE' };
  if (o.tipo === 'prefijos' && L.ventana !== 'prefijos') return { resultado: 'NO_GRUPO' };
  const guardado = o.guardado ? { acum: o.guardado.acum, checkpoint: o.guardado.checkpoint } : null;
  const r = responder({ derivada: o.tipo, de: q }, Γ, { ...o, i: 0, j, guardado });
  return { resultado: 'OK', accion: r.accion, mat: { tipo: o.tipo, acum: r.acum, checkpoint: r.checkpoint } };
}

/**
 * Intervalo (i, j] desde una materialización: Teorema 7.2 (O(1)) o 7.3 (O(log n)).
 * → {resultado:'OK', Y, acum, usados} | {resultado:'MATERIALIZACIÓN_INVÁLIDA'} (L22: no se usa una materialización
 * de otra pregunta o tipo, de otro StreamID, con i ≠ 0, corta (c.n < j), adelantada a Γ local, o con h/época que no casan).
 */
export function ventana(q, Γ, i, j, mat, o = {}) {
  const c = compilarConMonoide(q, o);
  if (c.resultado !== 'COMPILADA') return comoInvalida(c);
  const n = Γ.entradas.length;
  if (!ent(i) || !ent(j) || i < 0 || i > j || j > n) throw new Error('intervalo fuera de la trayectoria local');
  const INVALIDA = { resultado: 'MATERIALIZACIÓN_INVÁLIDA' };
  const L = leyes(c.M);
  if (!L.materializable) return INVALIDA; // L34: no existe materialización legítima de una secuencia
  const cp = mat?.checkpoint;
  if (!mat || !TIPOS_MATERIALIZACION.includes(mat.tipo) || !cp) return INVALIDA;
  if (cp.ver !== identidad({ derivada: mat.tipo, de: q }) || cp.streamId !== Γ.streamId || (cp.i ?? 0) !== 0) return INVALIDA;
  if (!ent(cp.n) || cp.n > n || cp.n < j || Γ.hashes[cp.n] !== cp.h) return INVALIDA;
  const Sj = estadoEn(Γ, j, o.registro, o.snapshots);
  const Sn = cp.n === j ? Sj : estadoEn(Γ, cp.n, o.registro, o.snapshots);
  if (cp.epoca !== Sn.epoca) return INVALIDA;
  if (mat.tipo === 'prefijos' && L.ventana !== 'prefijos') return INVALIDA;
  const r = mat.tipo === 'prefijos'
    ? ventanaPrefijos(c.M.grupo ? c.M : c.M.envolvente, mat.acum[0], i, j)
    : ventanaSegmentos(c.M, mat.acum, i, j);
  const Y = c.proy.obs(structuredClone(r.acum), ctxObs(c.proy, Sj, o.tRef));
  return { resultado: 'OK', Y, acum: r.acum, usados: r.usados };
}

/** τ = [τ₀ = null, τ₁ … τ_n], τ_k = max_{k' ≤ k} sello(e_k') (null = −∞; un sello no entero no cuenta). */
export function sellosEfectivos(q, Γ, o = {}) {
  const qτ = { φ: { v: true }, aporte: esMapa(q) ? q.sello : undefined, M: { nombre: 'máximo' }, obs: { nombre: 'identidad' } };
  const c = compilarConMonoide(qτ, o);
  if (c.resultado !== 'COMPILADA') return comoInvalida(c);
  const τ = [null];
  for (const x of aportes(c.proy, Γ, 0, Γ.entradas.length, o.registro, o.snapshots ?? [])) τ.push(c.M.op(τ[τ.length - 1], x));
  return τ;
}

const noPasa = (τk, t) => τk === null || τk <= t; // −∞ ≤ t
/** j(t) = max{k : τ_k ≤ t}. */
function ultimoHasta(τ, t) {
  let lo = 0, hi = τ.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (noPasa(τ[mid], t)) lo = mid; else hi = mid - 1; }
  return lo;
}

/** porTiempo(q, Γ, t₁, t₂, o) → {…responder, i, j} | SIN_SELLO | VENTANA_INVÁLIDA. t = null ⇒ sin cota. */
export function porTiempo(q, Γ, t1, t2, o = {}) {
  const c = compilarConMonoide(q, o);
  if (c.resultado !== 'COMPILADA') return comoInvalida(c);
  if (!esMapa(q) || !Object.hasOwn(q, 'sello')) return { resultado: 'SIN_SELLO' };
  if ((t1 !== null && !ent(t1)) || (t2 !== null && !ent(t2)) || (t1 !== null && t2 !== null && t1 > t2)) return { resultado: 'VENTANA_INVÁLIDA' };
  const n = Γ.entradas.length;
  if ((q.ventanaTiempo ?? 'prefijo') === 'prefijo') {
    const τ = sellosEfectivos(q, Γ, o);
    const i = t1 === null ? 0 : ultimoHasta(τ, t1);
    const j = t2 === null ? n : ultimoHasta(τ, t2);
    return { ...responder(q, Γ, { ...o, i, j }), i, j };
  }
  return { ...responder(filtroTiempo(q, t1, t2), Γ, { ...o, i: 0, j: n }), i: 0, j: n };
}

/** Lectura «filtro»: φ' = y(φ, t₁ < sello, sello ≤ t₂), omitiendo la cota nula. */
export function filtroTiempo(q, t1, t2) {
  const de = [q.φ];
  if (t1 !== null) de.push({ op: '<', de: [{ v: t1 }, q.sello] });
  if (t2 !== null) de.push({ op: '≤', de: [q.sello, { v: t2 }] });
  return { ...q, φ: { op: 'y', de } };
}

/**
 * distribuir(q, σ, trayectorias, o) → {resultado:'OK', acum, Y} | NO_CONMUTATIVO | DEPENDE_DEL_ESTADO | NO_CERRADO
 * (en ese orden) | PREGUNTA_INVÁLIDA. acum = N.proyectarCorte(σ, trayectorias, registro, proy).valor.
 * [L] obs se evalúa con parametros: {} (y sin S): entre trayectorias no hay un C_ε común, cada una tiene el suyo.
 * Una obs cuyos parámetros lean {p: …} da en distribuir el valor de «parámetro ausente» (null).
 */
export function distribuir(q, σ, trayectorias, o = {}) {
  const c = compilarConMonoide(q, o);
  if (c.resultado !== 'COMPILADA') return comoInvalida(c);
  if (!c.proy.monoide.conmutativo) return { resultado: 'NO_CONMUTATIVO' };
  if (c.proy.leeEstado) return { resultado: 'DEPENDE_DEL_ESTADO' };
  const r = proyectarCorte(σ, trayectorias, o.registro, c.proy);
  if (r.resultado !== 'OK') return r;
  return { resultado: 'OK', acum: r.valor, Y: c.proy.obs(structuredClone(r.valor), { parametros: {}, tRef: o.tRef }) };
}
