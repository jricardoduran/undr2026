// Kobalt · preguntas · compilar — una pregunta es un DATO y se compila a una Π monoidal del núcleo (spec fase 2 §4.1; E1).
// Núcleo puro. Aquí no se resuelve nada: la resolución es del núcleo (resolverProyeccion / proyectarCorte).
//
// Correspondencia:
//   q = (φ, aporte, M, obs [, sello] [, ventanaTiempo])     ↔ {φ, aporte, M, obs, sello?, ventanaTiempo?} (claves exactas)
//   q_× = [q₁ … q_m] (P5), id(q_×) = id(lista)              ↔ un Array de preguntas · tupla(qs)
//   q^▷ (VQ2) · q^▦ (VQ3)                                    ↔ {derivada: 'prefijos'|'segmentos', de: q}
//   id(q) = 𝔇("kobalt:preguntas:q:1", CV(q))                ↔ ETIQUETA · identidad(q)   (derivar y cv del núcleo)
//   aporte {clave, valor[, etiqueta]}                        ↔ azúcar de {op:'mapa', de:[…]} (clave, etiqueta, valor)
//   f_φ(e, ctx) = φ(e, ctx) ? inyectar(aporte(e, ctx)) : 1  ↔ contribucion(A)   (Teorema E1.3: φ se pliega en f)
//   obs(acum, ctx_j)                                         ↔ observacion(A)
//   leeEstado(q) (derivado de los lectores usados)           ↔ análisis estático: nunca se declara
//   Π_q = (id = 'preguntas:'‖id(q), ver = id(q), f, M, obs, leeEstado, sensibleAEpoca = false, sensibleATiempo = obs usa tRef)
//                                                            ↔ compilar(q, {lectores}).proy
//
// Leyes: L32 (pregunta = dato CV con identidad Exacta; ver = id(q), así que cambiar un byte de q no reutiliza nada
// guardado con otra pregunta, L22), E1 (f no recibe tRef ⇒ {x:'tRef'} fuera de obs es PREGUNTA_INVÁLIDA; L15),
// E1.4a (sensibleAEpoca = false siempre: cada f(e_k) usa el contrato de su propia entrada), L34 (escaneo y segmentos
// son materializaciones, no monoides de pregunta), P6 (la composición de filtros es la expresión y/o/no).

import { cv, derivar } from '../nucleo/index.mjs';
import { esMapa, esCV } from './valores.mjs';
import { validarExpr, evaluar, LECTORES_VACIO } from './expresiones.mjs';
import { monoide, tuplaDeMonoides, monoideDerivado } from './monoides.mjs';
import { validarObs, funcionObs } from './observaciones.mjs';

export const ETIQUETA = 'kobalt:preguntas:q:1';

/** id(q) = 𝔇(ETIQUETA, CV(q)) en hex. Lanza si q no es un valor CV. */
export const identidad = q => derivar(ETIQUETA, cv(q));

/** tupla([q₁…q_m]) = la lista misma (P5, §7.7): m preguntas en una sola pasada. */
export function tupla(qs) {
  if (!Array.isArray(qs) || !qs.length) throw new Error('tupla: se espera una lista no vacía de preguntas');
  return [...qs];
}

const CLAVES_Q = Object.freeze(['φ', 'aporte', 'M', 'obs']);
const CLAVES_Q_OPCIONALES = Object.freeze(['sello', 'ventanaTiempo']);
const LECTURAS_TIEMPO = Object.freeze(['prefijo', 'filtro']);

class Invalida extends Error {}
const invalida = motivo => { throw new Invalida(motivo); };

/** Forma {clave, valor[, etiqueta]} ⇒ expresión 'mapa'; cualquier otra expresión queda igual. null si no es válida. */
function expresionDeAporte(a) {
  if (!esMapa(a)) return null;
  if (!Object.hasOwn(a, 'clave')) return a;
  if (!Object.hasOwn(a, 'valor') || !Object.keys(a).every(k => k === 'clave' || k === 'valor' || k === 'etiqueta')) return null;
  const de = [{ v: 'clave' }, a.clave];
  if (Object.hasOwn(a, 'etiqueta')) de.push({ v: 'etiqueta' }, a.etiqueta);
  de.push({ v: 'valor' }, a.valor);
  return { op: 'mapa', de };
}

/**
 * Análisis estático. → A = {tipo: 'simple'|'tupla'|'derivada', M (monoide construido), leeEstado, usaTRef, …}.
 * Lanza Invalida(motivo).
 */
function analizar(q, lectores) {
  if (!esCV(q)) invalida('la pregunta no es un valor CV');
  if (Array.isArray(q)) {
    if (!q.length) invalida('tupla de preguntas vacía');
    const cs = q.map(x => analizar(x, lectores));
    return { tipo: 'tupla', cs, M: tuplaDeMonoides(cs.map(c => c.M)), leeEstado: cs.some(c => c.leeEstado), usaTRef: cs.some(c => c.usaTRef) };
  }
  if (!esMapa(q)) invalida('la pregunta no es un mapa ni una lista');
  if (Object.hasOwn(q, 'derivada')) {
    if (Object.keys(q).length !== 2 || !Object.hasOwn(q, 'de') || (q.derivada !== 'prefijos' && q.derivada !== 'segmentos')) invalida('pregunta derivada inválida');
    const c = analizar(q.de, lectores);
    const M = monoideDerivado(q.derivada === 'prefijos' ? 'escaneo' : 'segmentos', c.M);
    return { tipo: 'derivada', derivada: q.derivada, c, M, leeEstado: c.leeEstado, usaTRef: false };
  }
  for (const k of CLAVES_Q) if (!Object.hasOwn(q, k)) invalida(`falta ${k}`);
  if (!Object.keys(q).every(k => CLAVES_Q.includes(k) || CLAVES_Q_OPCIONALES.includes(k))) invalida('clave sobrante en la pregunta');
  let M;
  try { M = monoide(q.M); } catch (err) { invalida(err.message); }
  if (M.nombre === 'escaneo' || M.nombre === 'segmentos') invalida('escaneo y segmentos son materializaciones, no monoides de pregunta (L34)');
  const rφ = validarExpr(q.φ, lectores);
  if (!rφ.ok) invalida(`φ: ${rφ.motivo}`);
  const ap = expresionDeAporte(q.aporte);
  if (!ap) invalida('aporte: forma inválida');
  const ra = validarExpr(ap, lectores);
  if (!ra.ok) invalida(`aporte: ${ra.motivo}`);
  let rs = { leeEstado: false, usaTRef: false };
  if (Object.hasOwn(q, 'sello')) { rs = validarExpr(q.sello, lectores); if (!rs.ok) invalida(`sello: ${rs.motivo}`); }
  if (Object.hasOwn(q, 'ventanaTiempo') && !LECTURAS_TIEMPO.includes(q.ventanaTiempo)) invalida('lectura temporal ∈ {prefijo, filtro}');
  const ro = validarObs(q.obs, M, lectores);
  if (!ro.ok) invalida(ro.motivo);
  if (rφ.usaTRef || ra.usaTRef || rs.usaTRef) invalida('tRef solo puede aparecer en obs (E1: f no recibe tRef; L15)');
  return { tipo: 'simple', q, M, ap, leeEstado: rφ.leeEstado || ra.leeEstado || rs.leeEstado || ro.leeEstado, usaTRef: ro.usaTRef };
}

/** f(e, ctx), ctx = {k, parametros: C_{ε_{k−1}} [, S: S_{k−1}]} (lo construye N.aportes). */
function contribucion(A, lectores) {
  if (A.tipo === 'tupla') {
    const fs = A.cs.map(c => contribucion(c, lectores));
    return (e, ctx) => fs.map(f => f(e, ctx));
  }
  if (A.tipo === 'derivada') {
    const f = contribucion(A.c, lectores);
    return A.derivada === 'prefijos'
      ? (e, ctx) => { const c = f(e, ctx); return [[c], structuredClone(c)]; }
      : (e, ctx) => [[f(e, ctx)]];
  }
  const { q, M, ap } = A;
  return (e, ctx) => {
    const amb = { e, k: ctx.k, parametros: ctx.parametros, S: ctx.S, vars: {}, lectores };
    if (evaluar(q.φ, amb) !== true) return structuredClone(M.unidad);
    const c = M.inyectar(evaluar(ap, amb));
    return c === undefined ? structuredClone(M.unidad) : c;
  };
}

/** obs(acum, ctx), ctx = {parametros: C_{ε_j}, S?: S_j, tRef}. */
function observacion(A, lectores) {
  if (A.tipo === 'tupla') {
    const os = A.cs.map(c => observacion(c, lectores));
    return (acum, ctx) => os.map((o, i) => o(acum[i], ctx));
  }
  if (A.tipo === 'derivada') return acum => acum;
  const fn = funcionObs(A.q.obs, A.M);
  return (acum, ctx) => {
    if (acum === null && A.M.nombre === 'mapa') return null; // mapa mal formado: toda obs da null
    const r = fn(acum, { parametros: ctx.parametros, S: ctx.S, vars: { tRef: ctx.tRef === undefined ? null : ctx.tRef, acum }, lectores });
    return r === undefined ? null : r;
  };
}

/**
 * Uso interno de las operaciones: como compilar, más el monoide construido M (para leyes, intervalos y obs).
 * → {resultado:'COMPILADA', id, proy, M} | {resultado:'PREGUNTA_INVÁLIDA', motivo}. Nunca lanza.
 */
export function compilarConMonoide(q, opciones = {}) {
  const lectores = opciones.lectores ?? LECTORES_VACIO;
  let A;
  try { A = analizar(q, lectores); } catch (err) {
    if (err instanceof Invalida) return { resultado: 'PREGUNTA_INVÁLIDA', motivo: err.message };
    return { resultado: 'PREGUNTA_INVÁLIDA', motivo: `análisis: ${err?.message ?? String(err)}` };
  }
  const id = identidad(q);
  const { M } = A;
  const proy = {
    id: `preguntas:${id}`, ver: id, sensibleAEpoca: false, sensibleATiempo: A.usaTRef, leeEstado: A.leeEstado,
    f: contribucion(A, lectores),
    monoide: { unidad: structuredClone(M.unidad), op: M.op, conmutativo: M.conmutativo, idempotente: M.idempotente, ...(M.inv ? { inv: M.inv } : {}) },
    obs: observacion(A, lectores),
  };
  return { resultado: 'COMPILADA', id, proy, M };
}

/** compilar(q, {lectores}) → {resultado:'COMPILADA', id, proy} | {resultado:'PREGUNTA_INVÁLIDA', motivo}. Nunca lanza. */
export function compilar(q, opciones = {}) {
  const c = compilarConMonoide(q, opciones);
  if (c.resultado !== 'COMPILADA') return c;
  return { resultado: c.resultado, id: c.id, proy: c.proy };
}
