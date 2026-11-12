// Kobalt · preguntas · expresiones — lenguaje de expresiones y registro de lectores (spec fase 2 §4.2). Núcleo puro.
// Es la pieza que reutiliza la fase 3: no contiene ningún nombre de dominio, solo la gramática y su evaluación.
//
// Correspondencia:
//   expr ::= {v: c} | {e: campo} | {a: ruta} | {p: nombre} | {x: nombre} | {lee, con} | {op, de}   ↔ objetos con esas claves EXACTAS
//   campos de la entrada e_k (k = posición 1‑based)            ↔ CAMPOS
//   operadores y su aridad estática [mín, máx]                 ↔ OPERADORES ('mapa' exige además aridad par)
//   registro inmutable idLector@versión ↦ {clase, fn}          ↔ LECTORES_VACIO · registrarLector (nuevo registro congelado)
//   buena forma estática; leeEstado y usaTRef DERIVADOS        ↔ validarExpr (nunca se declaran: no pueden mentir)
//   eval(expr, amb) total y determinista; null = «sin valor»   ↔ evaluar
//     amb = {e?, k?, parametros? (C_{ε_{k−1}} o C_{ε_j}), S? (S_{k−1} o S_j), vars?, lectores}
//
// Leyes y garantías: L32 (una pregunta es un dato: sus expresiones son valores CV), E1 (f no recibe tRef: lo vigila
// validarExpr con usaTRef), L15 (tRef solo en obs), totalidad (toda operación mal tipada o desbordada ⇒ null; null es
// falso en contexto booleano). Sin reloj, azar ni E/S. Los lectores de estado reciben una COPIA de S (Anexo C.2 del
// núcleo): un lector no puede alterar el estado que ve la siguiente contribución.
// [L] La pureza y la inmutabilidad por versión de cada lector son obligaciones de quien lo registra (spec §9.6).

import { esMapa, esCV, ent, igualCV, pertenece, aEntero, mapaDe } from './valores.mjs';

export const CAMPOS = Object.freeze(['tipo', 'u', 'epoca', 'sid', 'clase', 'k']);

const SIN_TOPE = Infinity;
export const OPERADORES = Object.freeze({
  '+': [0, SIN_TOPE], '−': [1, 2], '×': [0, SIN_TOPE], '=': [2, 2], '≠': [2, 2], '<': [2, 2], '≤': [2, 2],
  y: [0, SIN_TOPE], o: [0, SIN_TOPE], no: [1, 1], si: [3, 3], en: [2, 2], prefijo: [2, 2], long: [1, 1],
  lista: [0, SIN_TOPE], mapa: [0, SIN_TOPE], campo: [2, 2], 'nulo?': [1, 1],
});

/** Formas de expresión por conjunto EXACTO de claves (ordenadas). */
const FORMAS = Object.freeze([['v', ['v']], ['e', ['e']], ['a', ['a']], ['p', ['p']], ['x', ['x']], ['lee', ['con', 'lee']], ['op', ['de', 'op']]]);
function formaDe(x) {
  if (!esMapa(x)) return null;
  const ks = Object.keys(x).sort();
  const f = FORMAS.find(([, cs]) => cs.length === ks.length && cs.every((c, i) => c === ks[i]));
  return f ? f[0] : null;
}

// ─────────── Registro de lectores ───────────
export const LECTORES_VACIO = Object.freeze({});
const RE_ID_LECTOR = /^[^@\s]+@[0-9]+$/;

/** Devuelve un registro NUEVO y congelado con el lector añadido. Registrar exactamente lo mismo devuelve el mismo registro. */
export function registrarLector(lectores, id, def) {
  if (typeof id !== 'string' || !RE_ID_LECTOR.test(id)) throw new Error('registrarLector: el identificador es «nombre@versión»');
  if (!def || (def.clase !== 'entrada' && def.clase !== 'estado') || typeof def.fn !== 'function') throw new Error('registrarLector: def = {clase: entrada|estado, fn}');
  if (Object.hasOwn(lectores, id)) {
    const previo = lectores[id];
    if (previo.fn === def.fn && previo.clase === def.clase) return lectores;
    throw new Error(`registrarLector: ${id} ya está registrado con otra definición (inmutable por identificador)`);
  }
  return Object.freeze({ ...lectores, [id]: Object.freeze({ clase: def.clase, fn: def.fn }) });
}

// ─────────── Buena forma estática ───────────
/** → {ok: true, leeEstado, usaTRef} | {ok: false, motivo}. Nunca lanza. */
export function validarExpr(expr, lectores = LECTORES_VACIO) {
  const info = { leeEstado: false, usaTRef: false };
  const pila = [expr];
  while (pila.length) {
    const x = pila.pop();
    switch (formaDe(x)) {
      case 'v': if (!esCV(x.v)) return { ok: false, motivo: 'expresión: constante que no es un valor CV' }; break;
      case 'e': if (!CAMPOS.includes(x.e)) return { ok: false, motivo: `expresión: campo desconocido ${String(x.e)}` }; break;
      case 'a':
        if (!Array.isArray(x.a) || !x.a.every(s => typeof s === 'string' || (ent(s) && s >= 0))) return { ok: false, motivo: 'expresión: ruta de args inválida' };
        break;
      case 'p': if (typeof x.p !== 'string') return { ok: false, motivo: 'expresión: parámetro no es texto' }; break;
      case 'x':
        if (typeof x.x !== 'string') return { ok: false, motivo: 'expresión: variable no es texto' };
        if (x.x === 'tRef') info.usaTRef = true;
        break;
      case 'lee':
        if (typeof x.lee !== 'string' || !Object.hasOwn(lectores, x.lee)) return { ok: false, motivo: `expresión: lector no registrado ${String(x.lee)}` };
        if (!Array.isArray(x.con)) return { ok: false, motivo: 'expresión: «con» no es una lista' };
        if (lectores[x.lee].clase === 'estado') info.leeEstado = true;
        pila.push(...x.con);
        break;
      case 'op': {
        if (typeof x.op !== 'string' || !Object.hasOwn(OPERADORES, x.op)) return { ok: false, motivo: `expresión: operador desconocido ${String(x.op)}` };
        if (!Array.isArray(x.de)) return { ok: false, motivo: 'expresión: «de» no es una lista' };
        const [min, max] = OPERADORES[x.op];
        if (x.de.length < min || x.de.length > max || (x.op === 'mapa' && x.de.length % 2 !== 0)) return { ok: false, motivo: `expresión: aridad de ${x.op}` };
        pila.push(...x.de);
        break;
      }
      default: return { ok: false, motivo: 'expresión: forma desconocida' };
    }
  }
  return { ok: true, ...info };
}

// ─────────── Evaluación (total y determinista) ───────────
const copia = v => structuredClone(v);

function leerArgs(e, ruta) {
  let v = e.args;
  for (const s of ruta) {
    if (typeof s === 'string') { if (!esMapa(v) || !Object.hasOwn(v, s)) return null; v = v[s]; }
    else { if (!Array.isArray(v) || s >= v.length) return null; v = v[s]; }
  }
  return v === undefined ? null : copia(v);
}

function leer(expr, amb) {
  const L = amb.lectores && Object.hasOwn(amb.lectores, expr.lee) ? amb.lectores[expr.lee] : null;
  if (!L) return null;
  const args = expr.con.map(c => evaluar(c, amb));
  let r;
  try {
    if (L.clase === 'entrada') { if (!amb.e) return null; r = L.fn(copia(amb.e), amb.k, ...args); }
    else { if (!amb.S) return null; r = L.fn(copia(amb.S), ...args); }
  } catch { return null; }
  return r !== undefined && esCV(r) ? r : null;
}

const enteros = v => v.every(ent);

function operar(op, de, amb) {
  // Conectivos y condicional: evaluación perezosa (mismo valor: el lenguaje es total y puro).
  if (op === 'y') return de.every(d => evaluar(d, amb) === true);
  if (op === 'o') return de.some(d => evaluar(d, amb) === true);
  if (op === 'si') return evaluar(de[0], amb) === true ? evaluar(de[1], amb) : evaluar(de[2], amb);
  const v = de.map(d => evaluar(d, amb));
  switch (op) {
    case '+': return enteros(v) ? aEntero(v.reduce((s, x) => s + BigInt(x), 0n)) : null;
    case '×': return enteros(v) ? aEntero(v.reduce((s, x) => s * BigInt(x), 1n)) : null;
    case '−':
      if (!enteros(v)) return null;
      return v.length === 1 ? aEntero(-BigInt(v[0])) : aEntero(BigInt(v[0]) - BigInt(v[1]));
    case '=': return igualCV(v[0], v[1]);
    case '≠': return !igualCV(v[0], v[1]);
    case '<': return ent(v[0]) && ent(v[1]) ? v[0] < v[1] : null;
    case '≤': return ent(v[0]) && ent(v[1]) ? v[0] <= v[1] : null;
    case 'no': return v[0] !== true;
    case 'en':
      if (Array.isArray(v[1])) return pertenece(v[1], v[0]);
      if (esMapa(v[1])) return typeof v[0] === 'string' && Object.hasOwn(v[1], v[0]);
      return null;
    case 'prefijo': return typeof v[0] === 'string' && typeof v[1] === 'string' ? v[1].startsWith(v[0]) : null;
    case 'long':
      if (typeof v[0] === 'string') return [...v[0]].length; // puntos de código
      if (Array.isArray(v[0])) return v[0].length;
      if (esMapa(v[0])) return Object.keys(v[0]).length;
      return null;
    case 'lista': return v;
    case 'mapa': {
      const pares = [], vistas = new Set();
      for (let i = 0; i < v.length; i += 2) {
        if (typeof v[i] !== 'string' || vistas.has(v[i])) return null;
        vistas.add(v[i]); pares.push([v[i], v[i + 1]]);
      }
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

/** eval(expr, amb) → valor CV | null. Total: una expresión mal formada también da null. */
export function evaluar(expr, amb = {}) {
  switch (formaDe(expr)) {
    case 'v': return copia(expr.v);
    case 'e': {
      if (!amb.e) return null;
      if (expr.e === 'k') return ent(amb.k) ? amb.k : null;
      const v = amb.e[expr.e];
      return v === undefined ? null : v;
    }
    case 'a': return amb.e && Array.isArray(expr.a) ? leerArgs(amb.e, expr.a) : null;
    case 'p': return amb.parametros && Object.hasOwn(amb.parametros, expr.p) ? copia(amb.parametros[expr.p]) : null;
    case 'x': return amb.vars && Object.hasOwn(amb.vars, expr.x) ? copia(amb.vars[expr.x]) : null;
    case 'lee': return Array.isArray(expr.con) ? leer(expr, amb) : null;
    case 'op': return Array.isArray(expr.de) ? operar(expr.op, expr.de, amb) : null;
    default: return null;
  }
}
