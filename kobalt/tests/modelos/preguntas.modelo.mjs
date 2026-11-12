// Kobalt — MODELO DE REFERENCIA de la fase 2: álgebra de preguntas (genérica, sin dominio).
// Traducción literal de kobalt/specs/2026-11-11_fase2-preguntas.md (con su Anexo) sobre la enmienda E1
// (kobalt/specs/2026-11-11_fase1-enmienda-preguntas.md). Teoría: kobalt/docs/2026-11-11_ALGEBRA_DE_PREGUNTAS.md (P1–P7).
//
// No tiene motor de resolución propio: toda pregunta se COMPILA a una Π monoidal y se resuelve con el núcleo REAL
// (kobalt/src/nucleo/index.mjs, aprobado: PASS + CONFORME): resolverProyeccion, aportes, proyectarCorte, cv, derivar.
// El único recorrido propio es el ORÁCULO `directo` (Fold en paralelo con el modelo del núcleo), que las pruebas usan
// para juzgar a `responder`, `ventana`, `porTiempo` y `distribuir`.
//
// La API exportada (salvo lo marcado «solo modelo») es la que se exige a kobalt/src/preguntas/index.mjs; está
// documentada en el encabezado de kobalt/tests/leyes/preguntas.impl.test.mjs. Las decisiones que la spec no fija y
// que este modelo fija están marcadas [PV] (precisión del verificador) y se listan en el encabezado del contrato.
//
// Correspondencia objeto matemático ↔ símbolo:
//   q = (φ, aporte, M, obs [, sello] [, ventanaTiempo])        ↔ {φ, aporte, M, obs, sello?, ventanaTiempo?}
//   q_× = [q₁ … q_m] (P5; id(q_×) = id(lista de los q_i))      ↔ un Array de preguntas · tupla(qs)
//   producto(M₁…M_m) de §7.3                                    ↔ {nombre: 'tupla', parametros: {de: [M…]}} [PV: la regla de
//                                                                  vocabulario prohíbe «producto» en kobalt/src/preguntas/]
//   q^▷, q^▦ (VQ2, VQ3)                                          ↔ {derivada: 'prefijos'|'segmentos', de: q}
//   id(q) = 𝔇("kobalt:preguntas:q:1", CV(q))                    ↔ identidad(q)
//   lenguaje de expresiones §4.2 · lectores registrados          ↔ validarExpr · evaluar · registrarLector
//   catálogo de monoides §7.3 · de observaciones §7.5            ↔ monoide(desc) · leyes(desc) · OBSERVACIONES
//   Π_q (§4.1)                                                   ↔ compilar(q, {lectores}).proy
//   Respuesta(q,(i,j]) = obs(⊗_{k∈(i,j],φ} aporte(e_k, ctx_k))   ↔ responder (vía N.resolverProyeccion)
//   Teorema 7.2 (P_i⁻¹⊗P_j) · 7.3 (bloques diádicos)            ↔ ventanaPrefijos · ventanaSegmentos · construirSegmentos
//   §7.4 τ_k = max_{k'≤k} sello(e_k')                            ↔ porTiempo
//   §7.6 / E1.5                                                  ↔ distribuir (vía N.proyectarCorte)
//   oráculo §8                                                   ↔ directo (solo modelo)

import * as N from '../../src/nucleo/index.mjs';
import * as MN from './nucleo.modelo.mjs';

export const ETIQUETA = 'kobalt:preguntas:q:1';

// ═════════════════════════ Utilidades CV ═════════════════════════
export const esMapa = v => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Uint8Array);
export function esCV(v) { try { N.cv(v); return true; } catch { return false; } }
export const hexCV = v => Buffer.from(N.cv(v)).toString('hex');
export const igualCV = (a, b) => hexCV(a) === hexCV(b);
const ent = x => Number.isSafeInteger(x);
const norm = x => (x === 0 ? 0 : x); // −0 ⇒ 0
const big = (r) => (r >= BigInt(Number.MIN_SAFE_INTEGER) && r <= BigInt(Number.MAX_SAFE_INTEGER) ? norm(Number(r)) : null);
const mapaDe = pares => { const o = {}; for (const [k, v] of pares) Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true }); return o; };
/** Conjunto canónico: sin repetidos (por CV) y ordenado por hex(CV(x)). [PV] */
export const conj = xs => { const m = new Map(); for (const x of xs) m.set(hexCV(x), x); return [...m.keys()].sort().map(k => m.get(k)); };
const tiene = (xs, x) => { const h = hexCV(x); return xs.some(y => hexCV(y) === h); };
/** ⊕ exacta en ℤ; fuera de los enteros seguros lanza (frontera [L]: ℤ se representa con enteros seguros). */
const sumaExacta = (a, b) => { const r = big(BigInt(a) + BigInt(b)); if (r === null) throw new RangeError('DESBORDE'); return r; };

// ═════════════════════════ §4.2 Lenguaje de expresiones ═════════════════════════
export const CAMPOS = Object.freeze(['tipo', 'u', 'epoca', 'sid', 'clase', 'k']);
const INF = Infinity;
/** Aridad estática [mín, máx] de cada operador. 'mapa' exige además un número par de argumentos. [PV] */
export const OPERADORES = Object.freeze({
  '+': [0, INF], '−': [1, 2], '×': [0, INF], '=': [2, 2], '≠': [2, 2], '<': [2, 2], '≤': [2, 2],
  y: [0, INF], o: [0, INF], no: [1, 1], si: [3, 3], en: [2, 2], prefijo: [2, 2], long: [1, 1],
  lista: [0, INF], mapa: [0, INF], campo: [2, 2], 'nulo?': [1, 1],
});
const FORMAS = { v: ['v'], e: ['e'], a: ['a'], p: ['p'], x: ['x'], lee: ['con', 'lee'], op: ['de', 'op'] };

/** Registro de lectores: {'id@versión' ↦ {clase: 'entrada'|'estado', fn}}, congelado. */
export const LECTORES_VACIO = Object.freeze({});
export function registrarLector(lectores, id, def) {
  if (typeof id !== 'string' || !/^[^@\s]+@[0-9]+$/.test(id)) throw new Error('lector: el identificador debe ser «nombre@versión»');
  if (!def || (def.clase !== 'entrada' && def.clase !== 'estado') || typeof def.fn !== 'function') throw new Error('lector: {clase: entrada|estado, fn}');
  if (Object.hasOwn(lectores, id)) {
    if (lectores[id].fn === def.fn && lectores[id].clase === def.clase) return lectores;
    throw new Error(`lector ${id}: inmutable por identificador`);
  }
  return Object.freeze({ ...lectores, [id]: Object.freeze({ clase: def.clase, fn: def.fn }) });
}

/** Buena forma estática. Devuelve {ok, leeEstado, usaTRef} o {ok:false, motivo}. */
export function validarExpr(expr, lectores = LECTORES_VACIO) {
  const info = { leeEstado: false, usaTRef: false };
  const fallo = motivo => { throw Object.assign(new Error(motivo), { esMotivo: true }); };
  const rec = x => {
    if (!esMapa(x)) fallo('expresión: no es un mapa');
    const ks = Object.keys(x).sort();
    const forma = Object.entries(FORMAS).find(([, claves]) => claves.length === ks.length && claves.every((c, i) => c === ks[i]));
    if (!forma) fallo(`expresión: forma desconocida {${ks.join(',')}}`);
    switch (forma[0]) {
      case 'v': if (!esCV(x.v)) fallo('constante no CV'); return;
      case 'e': if (!CAMPOS.includes(x.e)) fallo(`campo desconocido ${x.e}`); return;
      case 'a': if (!Array.isArray(x.a) || !x.a.every(s => typeof s === 'string' || (ent(s) && s >= 0))) fallo('ruta inválida'); return;
      case 'p': if (typeof x.p !== 'string') fallo('parámetro inválido'); return;
      case 'x': if (typeof x.x !== 'string') fallo('variable inválida'); if (x.x === 'tRef') info.usaTRef = true; return;
      case 'lee':
        if (typeof x.lee !== 'string' || !Object.hasOwn(lectores, x.lee)) fallo(`lector no registrado ${x.lee}`);
        if (!Array.isArray(x.con)) fallo('lee: con no es lista');
        if (lectores[x.lee].clase === 'estado') info.leeEstado = true;
        x.con.forEach(rec); return;
      default: {
        if (typeof x.op !== 'string' || !Object.hasOwn(OPERADORES, x.op)) fallo(`operador desconocido ${x.op}`);
        if (!Array.isArray(x.de)) fallo('de no es lista');
        const [a, b] = OPERADORES[x.op];
        if (x.de.length < a || x.de.length > b || (x.op === 'mapa' && x.de.length % 2)) fallo(`aridad de ${x.op}`);
        x.de.forEach(rec);
      }
    }
  };
  try { rec(expr); } catch (err) { if (err.esMotivo) return { ok: false, motivo: err.message }; throw err; }
  return { ok: true, ...info };
}

/**
 * eval(expr, amb) → valor CV | null. Total y determinista; sin reloj, azar ni E/S.
 * amb = {e?, k?, parametros?, S?, vars?, lectores}. Se supone `expr` bien formada (validarExpr).
 */
export function evaluar(expr, amb) {
  if (Object.hasOwn(expr, 'v')) return structuredClone(expr.v);
  if (Object.hasOwn(expr, 'e')) {
    if (!amb.e) return null;
    if (expr.e === 'k') return ent(amb.k) ? amb.k : null;
    const v = amb.e[expr.e]; return v === undefined ? null : v;
  }
  if (Object.hasOwn(expr, 'a')) {
    if (!amb.e) return null;
    let v = amb.e.args;
    for (const s of expr.a) {
      if (typeof s === 'string') { if (!esMapa(v) || !Object.hasOwn(v, s)) return null; v = v[s]; }
      else { if (!Array.isArray(v) || s >= v.length) return null; v = v[s]; }
    }
    return v === undefined ? null : structuredClone(v);
  }
  if (Object.hasOwn(expr, 'p')) return amb.parametros && Object.hasOwn(amb.parametros, expr.p) ? structuredClone(amb.parametros[expr.p]) : null;
  if (Object.hasOwn(expr, 'x')) return amb.vars && Object.hasOwn(amb.vars, expr.x) ? structuredClone(amb.vars[expr.x]) : null;
  if (Object.hasOwn(expr, 'lee')) {
    const L = amb.lectores?.[expr.lee]; if (!L) return null;
    const args = expr.con.map(c => evaluar(c, amb));
    let r;
    try {
      if (L.clase === 'entrada') { if (!amb.e) return null; r = L.fn(structuredClone(amb.e), amb.k, ...args); }
      else { if (!amb.S) return null; r = L.fn(structuredClone(amb.S), ...args); }
    } catch { return null; }
    return r !== undefined && esCV(r) ? r : null;
  }
  const v = expr.de.map(d => evaluar(d, amb));
  switch (expr.op) {
    case '+': return v.every(ent) ? big(v.reduce((s, x) => s + BigInt(x), 0n)) : null;
    case '×': return v.every(ent) ? big(v.reduce((s, x) => s * BigInt(x), 1n)) : null;
    case '−': if (!v.every(ent)) return null; return v.length === 1 ? big(-BigInt(v[0])) : big(BigInt(v[0]) - BigInt(v[1]));
    case '=': return igualCV(v[0], v[1]);
    case '≠': return !igualCV(v[0], v[1]);
    case '<': return ent(v[0]) && ent(v[1]) ? v[0] < v[1] : null;
    case '≤': return ent(v[0]) && ent(v[1]) ? v[0] <= v[1] : null;
    case 'y': return v.every(x => x === true);
    case 'o': return v.some(x => x === true);
    case 'no': return v[0] !== true;
    case 'si': return v[0] === true ? v[1] : v[2];
    case 'en': return Array.isArray(v[1]) ? tiene(v[1], v[0]) : esMapa(v[1]) ? (typeof v[0] === 'string' && Object.hasOwn(v[1], v[0])) : null;
    case 'prefijo': return typeof v[0] === 'string' && typeof v[1] === 'string' ? v[1].startsWith(v[0]) : null;
    case 'long': return typeof v[0] === 'string' ? [...v[0]].length : Array.isArray(v[0]) ? v[0].length : esMapa(v[0]) ? Object.keys(v[0]).length : null;
    case 'lista': return v;
    case 'mapa': {
      const pares = []; const vistos = new Set();
      for (let i = 0; i < v.length; i += 2) { if (typeof v[i] !== 'string' || vistos.has(v[i])) return null; vistos.add(v[i]); pares.push([v[i], v[i + 1]]); }
      return mapaDe(pares);
    }
    case 'campo':
      if (esMapa(v[0]) && typeof v[1] === 'string') return Object.hasOwn(v[0], v[1]) ? v[0][v[1]] : null;
      if (Array.isArray(v[0]) && ent(v[1]) && v[1] >= 0 && v[1] < v[0].length) return v[0][v[1]];
      return null;
    case 'nulo?': return v[0] === null;
    default: return null;
  }
}

// ═════════════════════════ §7.3 Catálogo de monoides ═════════════════════════
// Cada monoide: {nombre, unidad, op, inv?, conmutativo, idempotente, grupo, envolvente?, inyectar(v) → elemento | undefined}.
// inyectar: el valor del aporte → elemento de M; `undefined` = «no aporta» (la contribución es la unidad). [PV]
const sumarMapas = (signo) => (a, b) => {
  const o = {}; for (const [k, x] of Object.entries(a)) o[k] = x;
  for (const [k, x] of Object.entries(b)) { const y = sumaExacta(Object.hasOwn(o, k) ? o[k] : 0, signo * x); if (y === 0) delete o[k]; else Object.defineProperty(o, k, { value: y, enumerable: true, writable: true, configurable: true }); }
  return mapaDe(Object.keys(o).sort().map(k => [k, o[k]]));
};
const negMapa = a => mapaDe(Object.keys(a).sort().map(k => [k, norm(-a[k])]));
const inyClave = (v, minimo) => (esMapa(v) && typeof v.clave === 'string' && ent(v.valor) && v.valor >= minimo
  ? (v.valor === 0 ? {} : mapaDe([[v.clave, v.valor]])) : undefined);
const cmpCV = (a, b) => { const x = hexCV(a), y = hexCV(b); return x < y ? -1 : x > y ? 1 : 0; };
const esListaConj = v => Array.isArray(v);

export const NOMBRES_MONOIDES = Object.freeze(['suma', 'sumaPorClave', 'conteo', 'mínimo', 'máximo', 'último', 'máximoPor',
  'extremoPrefijo', 'unión', 'conjuntoAQ', 'secuencia', 'tupla', 'mapa', 'escaneo', 'segmentos']);

export function monoide(desc) {
  if (!esMapa(desc) || typeof desc.nombre !== 'string') throw new Error('monoide: descriptor inválido');
  const ks = Object.keys(desc);
  if (!ks.every(k => k === 'nombre' || k === 'parametros')) throw new Error('monoide: claves sobrantes');
  const P = desc.parametros ?? {};
  if (!esMapa(P)) throw new Error('monoide: parámetros no son mapa');
  const sinParams = () => { if (Object.keys(P).length) throw new Error(`monoide ${desc.nombre}: no admite parámetros`); };
  const base = { nombre: desc.nombre, conmutativo: false, idempotente: false, grupo: false };
  switch (desc.nombre) {
    case 'suma': sinParams(); return { ...base, unidad: 0, op: sumaExacta, inv: a => norm(-a), conmutativo: true, grupo: true, inyectar: v => (ent(v) ? norm(v) : undefined) };
    case 'sumaPorClave': sinParams(); return { ...base, unidad: {}, op: sumarMapas(1), inv: negMapa, conmutativo: true, grupo: true, inyectar: v => inyClave(v, -INF) };
    case 'conteo': sinParams(); return { ...base, unidad: {}, op: sumarMapas(1), conmutativo: true, envolvente: monoide({ nombre: 'sumaPorClave' }), inyectar: v => inyClave(v, 0) };
    case 'mínimo': case 'máximo': {
      sinParams(); const f = desc.nombre === 'mínimo' ? Math.min : Math.max;
      return { ...base, unidad: null, op: (a, b) => (a === null ? b : b === null ? a : f(a, b)), conmutativo: true, idempotente: true, inyectar: v => (ent(v) ? norm(v) : undefined) };
    }
    case 'último': sinParams(); return { ...base, unidad: [], op: (a, b) => (b.length ? b : a), idempotente: true, inyectar: v => (v === null ? undefined : [v]) };
    case 'máximoPor': {
      sinParams();
      const mayor = (a, b) => (a[0] !== b[0] ? a[0] > b[0] : cmpCV(a[1], b[1]) >= 0);
      return { ...base, unidad: null, op: (a, b) => (a === null ? b : b === null ? a : mayor(a, b) ? a : b), conmutativo: true, idempotente: true,
        inyectar: v => (Array.isArray(v) && v.length === 2 && ent(v[0]) ? [norm(v[0]), v[1]] : undefined) };
    }
    case 'extremoPrefijo': {
      if (Object.keys(P).length !== 1 || (P.modo !== 'mín' && P.modo !== 'máx')) throw new Error('extremoPrefijo: parámetros {modo: mín|máx}');
      const f = P.modo === 'mín' ? Math.min : Math.max;
      const ext = (x, y) => (x === null ? y : y === null ? x : f(x, y));
      return { ...base, modo: P.modo, unidad: [0, null], op: ([s1, e1], [s2, e2]) => [sumaExacta(s1, s2), ext(e1, e2 === null ? null : sumaExacta(s1, e2))],
        inyectar: v => (Array.isArray(v) && v.length === 2 && ent(v[0]) && (v[1] === null || ent(v[1])) ? [norm(v[0]), v[1] === null ? null : norm(v[1])] : undefined) };
    }
    case 'unión': sinParams(); return { ...base, unidad: [], op: (a, b) => conj([...a, ...b]), conmutativo: true, idempotente: true, inyectar: v => (esListaConj(v) ? conj(v) : undefined) };
    case 'conjuntoAQ': sinParams(); return { ...base, unidad: [[], []], idempotente: true,
      op: ([A1, Q1], [A2, Q2]) => [conj([...A1.filter(x => !tiene(Q2, x)), ...A2]), conj([...Q1.filter(x => !tiene(A2, x)), ...Q2])],
      inyectar: v => (Array.isArray(v) && v.length === 2 && esListaConj(v[0]) && esListaConj(v[1]) ? [conj(v[0]), conj(v[1])] : undefined) };
    case 'secuencia': sinParams(); return { ...base, unidad: [], op: (a, b) => [...a, ...b], inyectar: v => (Array.isArray(v) ? v : undefined) };
    case 'tupla': {
      if (Object.keys(P).length !== 1 || !Array.isArray(P.de) || P.de.length < 1) throw new Error('tupla: parámetros {de: [M…]} con m ≥ 1');
      return tuplaDe(P.de.map(monoide));
    }
    case 'mapa': {
      if (Object.keys(P).length !== 1 || !esMapa(P.etiquetas) || !Object.keys(P.etiquetas).length) throw new Error('mapa: parámetros {etiquetas: {τ: M}}');
      const T = {}; for (const [τ, d] of Object.entries(P.etiquetas)) { const m = monoide(d); if (m.nombre === 'mapa') throw new Error('mapa: etiqueta mapa no admitida'); T[τ] = m; }
      const todos = Object.values(T);
      const op = (a, b) => {
        if (a === null || b === null) return null;
        const o = {}; for (const [k, x] of Object.entries(a)) o[k] = x;
        for (const [k, [τ, y]] of Object.entries(b)) {
          if (!Object.hasOwn(o, k)) { Object.defineProperty(o, k, { value: [τ, y], enumerable: true, writable: true, configurable: true }); continue; }
          if (o[k][0] !== τ) return null;
          o[k] = [τ, T[τ].op(o[k][1], y)];
        }
        return mapaDe(Object.keys(o).sort().map(k => [k, o[k]]));
      };
      return { ...base, unidad: {}, op, conmutativo: todos.every(m => m.conmutativo), idempotente: todos.every(m => m.idempotente), grupo: false, etiquetas: T,
        inyectar: v => {
          if (!esMapa(v) || typeof v.clave !== 'string' || typeof v.etiqueta !== 'string' || !Object.hasOwn(T, v.etiqueta) || !Object.hasOwn(v, 'valor')) return undefined;
          const m = T[v.etiqueta].inyectar(v.valor); return m === undefined ? undefined : mapaDe([[v.clave, [v.etiqueta, m]]]);
        } };
    }
    case 'escaneo': {
      if (Object.keys(P).length !== 1 || !Object.hasOwn(P, 'de')) throw new Error('escaneo: {de: M}');
      const B = monoide(P.de);
      return { ...base, unidad: [[], structuredClone(B.unidad)], base: B,
        op: ([L1, t1], [L2, t2]) => [[...L1, ...L2.map(x => B.op(t1, x))], B.op(t1, t2)],
        inyectar: v => { const c = B.inyectar(v); const x = c === undefined ? structuredClone(B.unidad) : c; return [[x], x]; } };
    }
    case 'segmentos': {
      if (Object.keys(P).length !== 1 || !Object.hasOwn(P, 'de')) throw new Error('segmentos: {de: M}');
      const B = monoide(P.de);
      return { ...base, unidad: [], base: B, op: (a, b) => construirSegmentos(B, [...(a[0] ?? []), ...(b[0] ?? [])]),
        inyectar: v => { const c = B.inyectar(v); return [[c === undefined ? structuredClone(B.unidad) : c]]; } };
    }
    default: throw new Error(`monoide desconocido ${desc.nombre}`);
  }
}
function tuplaDe(Ms) {
  const grupo = Ms.every(m => m.grupo);
  const env = !grupo && Ms.every(m => m.grupo || m.envolvente);
  return {
    nombre: 'tupla', componentes: Ms, unidad: Ms.map(m => structuredClone(m.unidad)),
    op: (a, b) => Ms.map((m, i) => m.op(a[i], b[i])),
    ...(grupo ? { inv: a => Ms.map((m, i) => m.inv(a[i])) } : {}),
    conmutativo: Ms.every(m => m.conmutativo), idempotente: Ms.every(m => m.idempotente), grupo,
    ...(env ? { envolvente: tuplaDe(Ms.map(m => (m.grupo ? m : m.envolvente))) } : {}),
    inyectar: v => (Array.isArray(v) && v.length === Ms.length ? Ms.map((m, i) => { const c = m.inyectar(v[i]); return c === undefined ? structuredClone(m.unidad) : c; }) : undefined),
  };
}
const contieneSecuencia = m => m.nombre === 'secuencia' || (m.componentes ?? []).some(contieneSecuencia)
  || Object.values(m.etiquetas ?? {}).some(contieneSecuencia) || (m.base ? contieneSecuencia(m.base) : false);

/** q_leyes(M): lo que la arquitectura contesta sola (P3, P4, L34). */
export function leyes(desc) {
  const m = desc && typeof desc.op === 'function' ? desc : monoide(desc);
  return {
    conmutativo: m.conmutativo, idempotente: m.idempotente, grupo: m.grupo, envolvente: Boolean(m.envolvente),
    ventana: m.grupo || m.envolvente ? 'prefijos' : 'segmentos',
    distribucion: m.conmutativo ? (m.idempotente ? 'cubrimiento' : 'particion') : 'no',
    materializable: !contieneSecuencia(m),
  };
}

// ─────────── Ventanas (Teoremas 7.2 y 7.3) sobre cualquier monoide {unidad, op, inv?} ───────────
/** Niveles VQ3: N_0 = lista; N_ℓ[b] = N_{ℓ−1}[2b] ⊗ N_{ℓ−1}[2b+1]; hasta que el nivel tenga < 2 bloques. [] si vacía. */
export function construirSegmentos(M, lista) {
  if (!lista.length) return [];
  const niveles = [lista.map(x => structuredClone(x))];
  while (niveles.at(-1).length >= 2) {
    const prev = niveles.at(-1); const sig = [];
    for (let b = 0; 2 * b + 1 < prev.length; b++) sig.push(M.op(prev[2 * b], prev[2 * b + 1]));
    niveles.push(sig);
  }
  return niveles;
}
/** acum(i, j) = ⊗ en orden de los bloques diádicos alineados que cubren (i, j]. usados = número de bloques leídos. */
export function ventanaSegmentos(M, niveles, i, j) {
  const n = niveles.length ? niveles[0].length : 0;
  if (!ent(i) || !ent(j) || i < 0 || i > j || j > n) throw new Error('ventanaSegmentos: ventana fuera de la materialización');
  let acum = structuredClone(M.unidad), pos = i, usados = 0;
  while (pos < j) {
    let l = 0;
    while (l + 1 < niveles.length && pos % (2 ** (l + 1)) === 0 && pos + 2 ** (l + 1) <= j) l++;
    acum = M.op(acum, niveles[l][pos / 2 ** l]); pos += 2 ** l; usados++;
  }
  return { acum, usados };
}
/** Teorema 7.2: acum(i, j) = P_i⁻¹ ⊗ P_j, con tabla = [P_1 … P_n] y P_0 = unidad. Exige M.inv. */
export function ventanaPrefijos(M, tabla, i, j) {
  if (typeof M.inv !== 'function') throw new Error('ventanaPrefijos: M no es un grupo');
  if (!ent(i) || !ent(j) || i < 0 || i > j || j > tabla.length) throw new Error('ventanaPrefijos: ventana fuera de la tabla');
  const P = k => (k === 0 ? structuredClone(M.unidad) : structuredClone(tabla[k - 1]));
  return { acum: M.op(M.inv(P(i)), P(j)), usados: (i > 0 ? 1 : 0) + (j > 0 ? 1 : 0) };
}

// ═════════════════════════ §7.5 Catálogo de observaciones ═════════════════════════
// obs = {nombre, parametros?}. Los parámetros que son valores son EXPRESIONES [PV], evaluadas con
// amb_obs = {parametros: C_{ε_j}, S: S_j (si leeEstado), vars: {tRef, acum}, lectores} (sin entrada: {e}, {a} ⇒ null).
// Excepción: umbral.op es un literal de {'<','≤','=','≥','>'}.
// Para cada obs: monoides sobre los que se define (compilar lo comprueba) y parámetros-expresión.
export const OBSERVACIONES = Object.freeze({
  identidad: { sobre: null, exprs: [] },
  valor: { sobre: null, exprs: ['de'] },                                   // [PV] obs libre: P7 y fase 3
  componente: { sobre: ['sumaPorClave', 'conteo'], exprs: ['clave'] },
  ordenDesc: { sobre: ['sumaPorClave', 'conteo'], exprs: ['n'] },
  fibra: { sobre: ['unión', 'conjuntoAQ'], exprs: ['universo', 'conocidos'] },
  aplicar: { sobre: ['extremoPrefijo'], exprs: ['x0'] },
  cociente: { sobre: ['tupla'], exprs: [] },                              // tupla(suma, suma)
  umbral: { sobre: ['suma', 'mínimo', 'máximo'], exprs: ['valor'], literales: { op: ['<', '≤', '=', '≥', '>'] } },
  lista: { sobre: ['secuencia'], exprs: ['saldo'], opcionales: ['saldo'] },
});

function validarObs(desc, M, lectores) {
  if (!esMapa(desc) || typeof desc.nombre !== 'string' || !Object.keys(desc).every(k => k === 'nombre' || k === 'parametros')) return { ok: false, motivo: 'obs: descriptor inválido' };
  const O = Object.hasOwn(OBSERVACIONES, desc.nombre) ? OBSERVACIONES[desc.nombre] : null;
  if (!O) return { ok: false, motivo: `obs desconocida ${desc.nombre}` };
  if (O.sobre && !O.sobre.includes(M.nombre)) return { ok: false, motivo: `obs ${desc.nombre} no se define sobre ${M.nombre}` };
  if (desc.nombre === 'cociente' && !(M.componentes?.length === 2 && M.componentes.every(c => c.nombre === 'suma'))) return { ok: false, motivo: 'cociente: solo sobre tupla(suma, suma)' };
  const P = desc.parametros ?? {};
  if (!esMapa(P)) return { ok: false, motivo: 'obs: parámetros no son mapa' };
  const lits = O.literales ?? {};
  const permitidas = [...O.exprs, ...Object.keys(lits)];
  if (!Object.keys(P).every(k => permitidas.includes(k))) return { ok: false, motivo: 'obs: parámetro sobrante' };
  const info = { ok: true, leeEstado: false, usaTRef: false };
  for (const k of permitidas) {
    if (!Object.hasOwn(P, k)) { if ((O.opcionales ?? []).includes(k)) continue; return { ok: false, motivo: `obs: falta ${k}` }; }
    if (Object.hasOwn(lits, k)) { if (!lits[k].includes(P[k])) return { ok: false, motivo: `obs: ${k} fuera de dominio` }; continue; }
    const r = validarExpr(P[k], lectores); if (!r.ok) return r;
    info.leeEstado ||= r.leeEstado; info.usaTRef ||= r.usaTRef;
  }
  return info;
}

function obsFn(desc, M) {
  const P = desc.parametros ?? {};
  const ev = (k, amb) => evaluar(P[k], amb);
  switch (desc.nombre) {
    case 'identidad': return acum => acum;
    case 'valor': return (acum, amb) => ev('de', amb);
    case 'componente': return (acum, amb) => { const c = ev('clave', amb); return typeof c === 'string' ? (Object.hasOwn(acum, c) ? acum[c] : 0) : null; };
    case 'ordenDesc': return (acum, amb) => {
      const n = ev('n', amb); if (!ent(n) || n < 0) return null;
      return Object.entries(acum).sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, n).map(([k, v]) => [k, v]);
    };
    case 'fibra': return (acum, amb) => {
      const U = ev('universo', amb), K = ev('conocidos', amb);
      if (!Array.isArray(U) || !Array.isArray(K) || K.length !== U.length || !K.every(b => typeof b === 'boolean')) return null;
      const A = M.nombre === 'conjuntoAQ' ? acum[0] : acum;
      const miembros = U.map(x => tiene(A, x));
      return { miembros, complemento: U.map((x, i) => K[i] && !miembros[i]) };
    };
    case 'aplicar': return (acum, amb) => {
      const x0 = ev('x0', amb); if (!ent(x0)) return null;
      const [, e] = acum; const modo = M.modo;
      const d = e === null ? 0 : modo === 'mín' ? Math.min(0, e) : Math.max(0, e);
      return big(BigInt(x0) + BigInt(d));
    };
    case 'cociente': return acum => {
      const [a, b] = acum; if (b === 0) return null;
      let x = BigInt(a), y = BigInt(b); if (y < 0n) { x = -x; y = -y; }
      const g = (p, q) => (q === 0n ? p : g(q, p % q)); const d = g(x < 0n ? -x : x, y);
      return [big(x / d), big(y / d)];
    };
    case 'umbral': return (acum, amb) => {
      const v = ev('valor', amb); if (!ent(v) || !ent(acum)) return null;
      return { '<': acum < v, '≤': acum <= v, '=': acum === v, '≥': acum >= v, '>': acum > v }[P.op];
    };
    case 'lista': return (acum, amb) => {
      if (!Object.hasOwn(P, 'saldo')) return acum;
      let s = 0n; const out = [];
      for (const it of acum) { const d = evaluar(P.saldo, { ...amb, vars: { ...amb.vars, it } }); if (!ent(d)) return null; s += BigInt(d); const sv = big(s); if (sv === null) return null; out.push([it, sv]); }
      return out;
    };
    default: throw new Error('obs desconocida');
  }
}

// ═════════════════════════ §4.1 La pregunta como dato; compilación a Π (E1) ═════════════════════════
export const identidad = q => N.derivar(ETIQUETA, N.cv(q));
const CLAVES_Q = ['φ', 'aporte', 'M', 'obs'];
const CLAVES_Q_OPC = ['sello', 'ventanaTiempo'];

/** Análisis estático de una pregunta (sin compilar funciones). Lanza {esMotivo} si no es válida. */
function analizar(q, lectores) {
  const fallo = motivo => { throw Object.assign(new Error(motivo), { esMotivo: true }); };
  if (!esCV(q)) fallo('la pregunta no es un valor CV');
  if (Array.isArray(q)) {
    if (!q.length) fallo('tupla vacía');
    const cs = q.map(x => analizar(x, lectores));
    return { tipo: 'tupla', cs, M: tuplaDe(cs.map(c => c.M)), leeEstado: cs.some(c => c.leeEstado), usaTRef: cs.some(c => c.usaTRef) };
  }
  if (esMapa(q) && Object.hasOwn(q, 'derivada')) {
    if (Object.keys(q).length !== 2 || !Object.hasOwn(q, 'de') || !['prefijos', 'segmentos'].includes(q.derivada)) fallo('pregunta derivada inválida');
    const c = analizar(q.de, lectores);
    // L34 como regla ESTÁTICA de la pregunta (objeción conceptual del 12‑nov): una materialización no se materializa otra
    // vez, y lo que contiene 'secuencia' no se materializa nunca (su cociente de Nerode es la propia Γ filtrada).
    if (contieneDerivada(c)) fallo('una pregunta derivada no puede derivarse otra vez (L34)');
    if (!leyes(c.M).materializable) fallo('secuencia no se materializa nunca (L34)');
    const M = q.derivada === 'prefijos' ? escaneoDe(c.M) : segmentosDe(c.M);
    return { tipo: 'derivada', derivada: q.derivada, c, M, leeEstado: c.leeEstado, usaTRef: false };
  }
  if (!esMapa(q)) fallo('la pregunta no es un mapa ni una lista');
  for (const k of CLAVES_Q) if (!Object.hasOwn(q, k)) fallo(`falta ${k}`);
  if (!Object.keys(q).every(k => CLAVES_Q.includes(k) || CLAVES_Q_OPC.includes(k))) fallo('clave sobrante en la pregunta');
  let M; try { M = monoide(q.M); } catch (err) { fallo(err.message); }
  if (M.nombre === 'escaneo' || M.nombre === 'segmentos') fallo('escaneo y segmentos son materializaciones, no monoides de pregunta');
  const rφ = validarExpr(q.φ, lectores); if (!rφ.ok) fallo(`φ: ${rφ.motivo}`);
  const ap = aporteExpr(q.aporte); if (!ap) fallo('aporte: forma inválida');
  const ra = validarExpr(ap, lectores); if (!ra.ok) fallo(`aporte: ${ra.motivo}`);
  let rs = { leeEstado: false, usaTRef: false };
  if (Object.hasOwn(q, 'sello')) { rs = validarExpr(q.sello, lectores); if (!rs.ok) fallo(`sello: ${rs.motivo}`); }
  if (Object.hasOwn(q, 'ventanaTiempo') && !['prefijo', 'filtro'].includes(q.ventanaTiempo)) fallo('ventanaTiempo ∈ {prefijo, filtro}');
  const ro = validarObs(q.obs, M, lectores); if (!ro.ok) fallo(ro.motivo);
  // E1: f no recibe tRef. Una referencia a tRef en φ, aporte o sello sería siempre null: se rechaza (L15). [PV]
  if (rφ.usaTRef || ra.usaTRef || rs.usaTRef) fallo('tRef solo puede aparecer en obs (L15, E1)');
  return { tipo: 'simple', q, M, ap, leeEstado: rφ.leeEstado || ra.leeEstado || rs.leeEstado || ro.leeEstado, usaTRef: ro.usaTRef };
}
const contieneDerivada = A => A.tipo === 'derivada' || (A.tipo === 'tupla' && A.cs.some(contieneDerivada));
// La forma {clave, valor[, etiqueta]} es azúcar de {op:'mapa', de:[…]} (claves en este orden: clave, etiqueta, valor). [PV]
function aporteExpr(a) {
  if (!esMapa(a)) return null;
  if (!Object.hasOwn(a, 'clave')) return a;
  const ks = Object.keys(a);
  if (!Object.hasOwn(a, 'valor') || !ks.every(k => ['clave', 'valor', 'etiqueta'].includes(k))) return null;
  const de = [{ v: 'clave' }, a.clave];
  if (Object.hasOwn(a, 'etiqueta')) de.push({ v: 'etiqueta' }, a.etiqueta);
  de.push({ v: 'valor' }, a.valor);
  return { op: 'mapa', de };
}
const escaneoDe = B => monoideDerivado('escaneo', B);
const segmentosDe = B => monoideDerivado('segmentos', B);
function monoideDerivado(nombre, B) {
  // como monoide({nombre, parametros: {de}}) pero sobre un monoide ya construido (incluidos productos de preguntas)
  const m = nombre === 'escaneo'
    ? { unidad: [[], structuredClone(B.unidad)], op: ([L1, t1], [L2, t2]) => [[...L1, ...L2.map(x => B.op(t1, x))], B.op(t1, t2)] }
    : { unidad: [], op: (a, b) => construirSegmentos(B, [...(a[0] ?? []), ...(b[0] ?? [])]) };
  return { nombre, base: B, conmutativo: false, idempotente: false, grupo: false, ...m };
}

/** f(e, ctx) de una pregunta analizada: φ ? inyectar(aporte) : unidad (spec §4.1). */
function contribucion(A, lectores) {
  if (A.tipo === 'tupla') { const fs = A.cs.map(c => contribucion(c, lectores)); return (e, ctx) => fs.map(f => f(e, ctx)); }
  if (A.tipo === 'derivada') {
    const f = contribucion(A.c, lectores);
    return A.derivada === 'prefijos' ? (e, ctx) => { const c = f(e, ctx); return [[c], structuredClone(c)]; } : (e, ctx) => [[f(e, ctx)]];
  }
  const { q, M, ap } = A;
  return (e, ctx) => {
    const amb = { e, k: ctx.k, parametros: ctx.parametros, S: ctx.S, vars: {}, lectores };
    if (evaluar(q.φ, amb) !== true) return structuredClone(M.unidad);
    const c = M.inyectar(evaluar(ap, amb));
    return c === undefined ? structuredClone(M.unidad) : c;
  };
}
/** obs(acum, ctx) de una pregunta analizada. ctx = {parametros, S?, tRef}. */
function observacion(A, lectores) {
  if (A.tipo === 'tupla') { const os = A.cs.map(c => observacion(c, lectores)); return (acum, ctx) => os.map((o, i) => o(acum[i], ctx)); }
  if (A.tipo === 'derivada') return acum => acum;
  const fn = obsFn(A.q.obs, A.M);
  return (acum, ctx) => {
    if (acum === null && A.M.nombre === 'mapa') return null; // mapa mal formado
    const r = fn(acum, { parametros: ctx.parametros, S: ctx.S, vars: { tRef: ctx.tRef === undefined ? null : ctx.tRef, acum }, lectores });
    return r === undefined ? null : r;
  };
}

/**
 * compilar(q, {lectores}) → {resultado:'COMPILADA', id, proy} | {resultado:'PREGUNTA_INVÁLIDA', motivo}.
 * proy es una Π MONOIDAL del núcleo (E1): {id:'preguntas:'‖id, ver:id, f, monoide:{unidad, op, inv?, conmutativo,
 * idempotente}, obs, leeEstado, sensibleAEpoca:false, sensibleATiempo}.
 */
export function compilar(q, opciones = {}) {
  const lectores = opciones.lectores ?? LECTORES_VACIO;
  let A;
  try { A = analizar(q, lectores); } catch (err) { if (err.esMotivo) return { resultado: 'PREGUNTA_INVÁLIDA', motivo: err.message }; throw err; }
  const id = identidad(q);
  const M = A.M;
  const monoideΠ = { unidad: structuredClone(M.unidad), op: M.op, conmutativo: M.conmutativo, idempotente: M.idempotente, ...(M.inv ? { inv: M.inv } : {}) };
  const proy = {
    id: `preguntas:${id}`, ver: id, sensibleAEpoca: false, sensibleATiempo: A.usaTRef, leeEstado: A.leeEstado,
    f: contribucion(A, lectores), monoide: monoideΠ, obs: observacion(A, lectores),
  };
  return { resultado: 'COMPILADA', id, proy, analisis: A };
}

// ═════════════════════════ §5 Operaciones (lecturas puras) ═════════════════════════
const invalida = c => ({ resultado: 'PREGUNTA_INVÁLIDA', motivo: c.motivo });
const epocaEn = (Γ, k) => { let ε = 0; for (let i = 0; i < k; i++) if (Γ.entradas[i].clase === 'contrato') ε++; return ε; };
const estadoJ = (Γ, j, registro) => N.fold(N.estadoInicial(Γ.g, registro), Γ.entradas.slice(0, j), registro);

/** responder(q, Γ, {i=0, j=n, guardado, registro, lectores, snapshots, tRef}) = N.resolverProyeccion(compilar(q)). */
export function responder(q, Γ, o = {}) {
  const c = compilar(q, o); if (c.resultado !== 'COMPILADA') return invalida(c);
  const i = o.i ?? 0, j = o.j ?? Γ.entradas.length;
  const r = N.resolverProyeccion({ proy: c.proy, guardado: o.guardado ?? null, trayectoria: Γ, i, m: j, registro: o.registro, snapshots: o.snapshots ?? [], tRef: o.tRef });
  return { resultado: 'OK', ...r };
}

/** materializar(q, Γ, j, {tipo, guardado?, …}) → {resultado:'OK', accion, mat:{tipo, acum, checkpoint}} | NO_GRUPO | NO_MATERIALIZABLE. */
export function materializar(q, Γ, j, o = {}) {
  const c = compilar(q, o); if (c.resultado !== 'COMPILADA') return invalida(c);
  if (o.tipo !== 'prefijos' && o.tipo !== 'segmentos') throw new Error('materializar: tipo ∈ {prefijos, segmentos}');
  const L = leyes(c.analisis.M);
  if (!L.materializable) return { resultado: 'NO_MATERIALIZABLE' };
  const qd = { derivada: o.tipo, de: q };
  const cd = compilar(qd, o); if (cd.resultado !== 'COMPILADA') return invalida(cd); // q es (o contiene) una derivada: L34 estática
  if (o.tipo === 'prefijos' && L.ventana !== 'prefijos') return { resultado: 'NO_GRUPO' };
  const g = o.guardado ? { acum: o.guardado.acum, checkpoint: o.guardado.checkpoint } : null;
  const r = responder(qd, Γ, { ...o, i: 0, j, guardado: g });
  if (r.resultado !== 'OK') return r; // p. ej. q ya es (o contiene) una derivada: L34 estática
  return { resultado: 'OK', accion: r.accion, mat: { tipo: o.tipo, acum: r.acum, checkpoint: r.checkpoint } };
}

/** ventana(q, Γ, i, j, mat, {registro, lectores, snapshots, tRef}) → {resultado:'OK', Y, acum, usados} | MATERIALIZACIÓN_INVÁLIDA. */
export function ventana(q, Γ, i, j, mat, o = {}) {
  const c = compilar(q, o); if (c.resultado !== 'COMPILADA') return invalida(c);
  const n = Γ.entradas.length;
  if (!ent(i) || !ent(j) || i < 0 || i > j || j > n) throw new Error('ventana fuera de la trayectoria local');
  if (!leyes(c.analisis.M).materializable) return { resultado: 'MATERIALIZACIÓN_INVÁLIDA' }; // L34: no hay materialización legítima
  const cp = mat?.checkpoint;
  const qd = { derivada: mat?.tipo, de: q };
  if (!mat || !['prefijos', 'segmentos'].includes(mat.tipo) || !cp || cp.ver !== identidad(qd) || cp.streamId !== Γ.streamId
    || (cp.i ?? 0) !== 0 || !ent(cp.n) || cp.n > n || cp.n < j || Γ.hashes[cp.n] !== cp.h || cp.epoca !== epocaEn(Γ, cp.n)) {
    return { resultado: 'MATERIALIZACIÓN_INVÁLIDA' };
  }
  const M = c.analisis.M;
  if (mat.tipo === 'prefijos' && leyes(M).ventana !== 'prefijos') return { resultado: 'MATERIALIZACIÓN_INVÁLIDA' };
  let r;
  if (mat.tipo === 'prefijos') r = ventanaPrefijos(M.grupo ? M : M.envolvente, mat.acum[0], i, j);
  else r = ventanaSegmentos(M, mat.acum, i, j);
  const S = estadoJ(Γ, j, o.registro);
  const Y = c.proy.obs(structuredClone(r.acum), c.proy.leeEstado ? { parametros: S.parametros, S, tRef: o.tRef } : { parametros: S.parametros, tRef: o.tRef });
  return { resultado: 'OK', Y, acum: r.acum, usados: r.usados };
}

/** Sello efectivo τ_0..τ_n (τ_0 = null = −∞), con la pregunta `máximo` sobre q.sello y N.aportes (§7.4). */
export function sellosEfectivos(q, Γ, o = {}) {
  const qτ = { φ: { v: true }, aporte: q.sello, M: { nombre: 'máximo' }, obs: { nombre: 'identidad' } };
  const c = compilar(qτ, o);
  const M = c.analisis.M;
  const cs = N.aportes(c.proy, Γ, 0, Γ.entradas.length, o.registro, o.snapshots ?? []);
  const τ = [null]; for (const x of cs) τ.push(M.op(τ.at(-1), x));
  return τ;
}
const menorIgual = (a, t) => a === null || a <= t; // −∞ ≤ t
/** j(t) = max{k : τ_k ≤ t}, por búsqueda binaria (τ es monótono). */
const jDe = (τ, t) => { let lo = 0, hi = τ.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (menorIgual(τ[mid], t)) lo = mid; else hi = mid - 1; } return lo; };

/** porTiempo(q, Γ, t1, t2, {…}) → {resultado:'OK', i, j, …responder} | SIN_SELLO | VENTANA_INVÁLIDA. t = null ⇒ sin cota. */
export function porTiempo(q, Γ, t1, t2, o = {}) {
  const c = compilar(q, o); if (c.resultado !== 'COMPILADA') return invalida(c);
  if (!esMapa(q) || !Object.hasOwn(q, 'sello')) return { resultado: 'SIN_SELLO' };
  if ((t1 !== null && !ent(t1)) || (t2 !== null && !ent(t2)) || (t1 !== null && t2 !== null && t1 > t2)) return { resultado: 'VENTANA_INVÁLIDA' };
  const n = Γ.entradas.length;
  if ((q.ventanaTiempo ?? 'prefijo') === 'prefijo') {
    const τ = sellosEfectivos(q, Γ, o);
    const i = t1 === null ? 0 : jDe(τ, t1), j = t2 === null ? n : jDe(τ, t2);
    return { ...responder(q, Γ, { ...o, i, j }), i, j };
  }
  return { ...responder(filtroTiempo(q, t1, t2), Γ, { ...o, i: 0, j: n }), i: 0, j: n };
}
/** Lectura «filtro» (§7.4): φ' = y(φ, t1 < sello, sello ≤ t2) (se omite la cota nula). [PV] */
export function filtroTiempo(q, t1, t2) {
  const de = [q.φ];
  if (t1 !== null) de.push({ op: '<', de: [{ v: t1 }, q.sello] });
  if (t2 !== null) de.push({ op: '≤', de: [q.sello, { v: t2 }] });
  return { ...q, φ: { op: 'y', de } };
}

/** distribuir(q, σ, trayectorias, {registro, lectores, tRef}) (§7.6, E1.5) vía N.proyectarCorte. */
export function distribuir(q, σ, trayectorias, o = {}) {
  const c = compilar(q, o); if (c.resultado !== 'COMPILADA') return invalida(c);
  if (!c.proy.monoide.conmutativo) return { resultado: 'NO_CONMUTATIVO' };
  if (c.proy.leeEstado) return { resultado: 'DEPENDE_DEL_ESTADO' };
  const r = N.proyectarCorte(σ, trayectorias, o.registro, c.proy);
  if (r.resultado !== 'OK') return r;
  return { resultado: 'OK', acum: r.valor, Y: c.proy.obs(structuredClone(r.valor), { parametros: {}, tRef: o.tRef }) };
}

/** tupla([q₁…q_m]) = la lista misma: el PRODUCTO de preguntas de P5 (id(q_×) = id(lista)). Se llama «tupla» porque
 *  la regla de vocabulario de la spec prohíbe la subcadena «producto» en kobalt/src/preguntas/. [PV] */
export function tupla(qs) { if (!Array.isArray(qs) || !qs.length) throw new Error('tupla: lista no vacía'); return [...qs]; }

// ═════════════════════════ ORÁCULO (solo modelo) ═════════════════════════
/**
 * directo(q, Γ, i, j, {registro, lectores, tRef}): obs(⊗_{k∈(i,j], φ(e_k)} aporte(e_k, ctx_k)), recorriendo Γ con el Fold
 * del MODELO del núcleo en paralelo (ctx_k = {k, C_{ε_{k−1}}, S_{k−1}}). No usa N.resolverProyeccion ni N.aportes.
 */
export function directo(q, Γ, i, j, o = {}) {
  const c = compilar(q, o); if (c.resultado !== 'COMPILADA') throw new Error(c.motivo);
  const R = o.registro;
  let S = MN.fold(MN.estadoInicial(Γ.g, R), Γ.entradas.slice(0, i), R);
  const lectores = o.lectores ?? LECTORES_VACIO;
  const A = c.analisis;
  const f = contribucion(A, lectores);
  let acum = structuredClone(A.M.unidad);
  for (let k = i + 1; k <= j; k++) {
    const e = Γ.entradas[k - 1];
    acum = A.M.op(acum, f(e, { k, parametros: S.parametros, S }));
    S = MN.transformar(S, e, R);
  }
  return { acum, Y: observacion(A, lectores)(structuredClone(acum), { parametros: S.parametros, S, tRef: o.tRef }) };
}
