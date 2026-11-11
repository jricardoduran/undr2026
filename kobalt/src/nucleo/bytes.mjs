// Kobalt · núcleo · bytes — utilidades puras sobre Uint8Array (sin I/O, sin reloj, sin azar).
//
// Correspondencia:
//   utf8(t)            ↔ utf8          (exige texto bien formado: un surrogate suelto no tiene bytes propios)
//   utf8⁻¹(B)          ↔ desdeUtf8     (decodificador estricto: rechaza UTF‑8 mal formado, conserva el BOM)
//   bytes ↔ hex        ↔ hexABytes / bytesAHex   (representación de bytes opacos en la API: hex en minúsculas)
//   a ‖ b ‖ …          ↔ concatenar
//   orden por bytes    ↔ compararBytes (lexicográfico; base del orden de claves de CV)
//
// Funciona igual en Node ≥ 22 y en el navegador: solo usa TextEncoder/TextDecoder y Uint8Array.

const codificador = new TextEncoder();
const decodificadorEstricto = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const RE_HEX = /^(?:[0-9a-f]{2})+$/;
const DIGITOS = '0123456789abcdef';
const TABLA_HEX = Array.from({ length: 256 }, (_, i) => DIGITOS[i >> 4] + DIGITOS[i & 15]);

/** utf8(t). Lanza si t no es texto bien formado (Teorema 4.1: sin esto CV no sería inyectivo). */
export function utf8(t) {
  if (typeof t !== 'string') throw new TypeError('utf8: se esperaba texto');
  if (!t.isWellFormed()) throw new Error('utf8: texto mal formado (surrogate suelto)');
  return codificador.encode(t);
}

/** utf8⁻¹(B). Lanza ante UTF‑8 mal formado. */
export function desdeUtf8(b) {
  try { return decodificadorEstricto.decode(b); } catch { throw new Error('utf8: bytes mal formados'); }
}

/** ¿h es hex en minúsculas de longitud par ≥ 2 (y exactamente nBytes bytes, si se indica)? */
export function esHex(h, nBytes) {
  return typeof h === 'string' && RE_HEX.test(h) && (nBytes === undefined || h.length === 2 * nBytes);
}

export function hexABytes(h) {
  if (!esHex(h)) throw new Error(`hex inválido: ${String(h).slice(0, 40)}`);
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(2 * i, 2), 16);
  return out;
}

export function bytesAHex(b) {
  let s = '';
  for (let i = 0; i < b.length; i++) s += TABLA_HEX[b[i]];
  return s;
}

export function concatenar(partes) {
  let total = 0;
  for (const p of partes) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}

export function igualesBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Orden lexicográfico de bytes: < 0, 0 o > 0. */
export function compararBytes(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

/** Copia defensiva: quien recibe bytes de la materialidad no puede alterar lo guardado (M3). */
export const copiarBytes = b => Uint8Array.from(b);
