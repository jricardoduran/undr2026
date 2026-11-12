// Kobalt · preguntas · valores — utilidades puras sobre valores CV (spec fase 2 §4.2; núcleo §4.2).
// Sin I/O, sin reloj, sin azar. Funciona igual en Node ≥ 22 y en el navegador (no usa Buffer).
//
// Correspondencia:
//   v ∈ Valores CV                         ↔ esCV(v)  (CV del núcleo: lanza si v no es un valor CV)
//   CV(a) = CV(b)                          ↔ igualCV(a, b)        (igualdad de valores, no de referencias: E7)
//   hex(CV(v))                             ↔ hexCV(v)             (orden total de los valores; mismo orden que los bytes)
//   𝒫_fin(X) como valor canónico           ↔ conj(xs)             (sin repetidos por CV, ordenado por hex(CV(x)))
//   ℤ ∩ [−(2⁵³−1), 2⁵³−1]                  ↔ ent / aEntero(BigInt) (fuera de rango ⇒ null) / sumaExacta (fuera ⇒ lanza)
//   mapa con claves de texto arbitrarias   ↔ mapaDe(pares)        (defineProperty: «__proto__» es una clave más)

import { cv } from '../nucleo/index.mjs';

/** ¿Mapa CV? (objeto no nulo, ni lista, ni bytes). */
export const esMapa = v => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Uint8Array);

/** ¿Entero seguro? (los únicos números CV). */
export const ent = x => Number.isSafeInteger(x);

/** −0 ⇒ 0 (CV no distingue el signo del cero). */
export const sinMenosCero = x => (x === 0 ? 0 : x);

export function esCV(v) { try { cv(v); return true; } catch { return false; } }

const HEX = Array.from({ length: 256 }, (_, i) => (i < 16 ? '0' : '') + i.toString(16));
/** hex(CV(v)). Lanza si v no es CV. */
export function hexCV(v) { const b = cv(v); let s = ''; for (let i = 0; i < b.length; i++) s += HEX[b[i]]; return s; }

export const igualCV = (a, b) => hexCV(a) === hexCV(b);

/** Comparación total por hex(CV(·)). */
export function compararCV(a, b) { const x = hexCV(a), y = hexCV(b); return x < y ? -1 : x > y ? 1 : 0; }

/** BigInt ⇒ entero seguro, o null si se sale del rango (resultado EXACTO o nada). */
export function aEntero(r) {
  return r >= BigInt(Number.MIN_SAFE_INTEGER) && r <= BigInt(Number.MAX_SAFE_INTEGER) ? sinMenosCero(Number(r)) : null;
}

/** a + b exacta en ℤ. Fuera de los enteros seguros lanza: frontera [L] (ℤ se representa con enteros seguros). */
export function sumaExacta(a, b) {
  const r = aEntero(BigInt(a) + BigInt(b));
  if (r === null) throw new RangeError('suma fuera de los enteros seguros');
  return r;
}

/** Mapa con las claves dadas como propiedades propias (también «__proto__»). */
export function mapaDe(pares) {
  const o = {};
  for (const [k, v] of pares) Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
  return o;
}

/** Mapa con las mismas entradas, claves ordenadas (la CV no depende del orden; esto solo da una forma estable). */
export const mapaOrdenado = m => mapaDe([...m.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/** Conjunto canónico: sin repetidos (por CV) y ordenado por hex(CV(x)). */
export function conj(xs) {
  const m = new Map();
  for (const x of xs) m.set(hexCV(x), x);
  return [...m.keys()].sort().map(k => m.get(k));
}

/** x ∈ xs por igualdad CV. */
export function pertenece(xs, x) { const h = hexCV(x); return xs.some(y => hexCV(y) === h); }
