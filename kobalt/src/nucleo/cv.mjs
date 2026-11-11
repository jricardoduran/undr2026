// Kobalt · núcleo · cv — Codificación canónica de valores CV (spec §4.2, Teorema 4.1). Núcleo puro.
//
// Correspondencia:
//   CV : Valores → Bytes          ↔ cv(v)        (lanza si v no es un valor CV)
//   Dec = CV⁻¹ sobre la imagen     ↔ decCV(b)     (lanza ante todo lo que no sea imagen de CV)
//   varuint canónico (Minimal)     ↔ varuint / leerVaruint
//   igualdad de valores CV         ↔ igualCV(a, b) ⟺ CV(a) = CV(b)
//   «es un mapa»                   ↔ esMapa(v)    (objeto plano con claves de texto)
//
//   null 00 · false 01 · true 02 · entero ≥0 03‖varuint · entero <0 04‖varuint(−x) (04 00 inválido)
//   bytes 05‖varuint(|B|)‖B · texto 06‖varuint(|utf8|)‖utf8 · lista 07‖varuint(k)‖… ·
//   mapa 08‖varuint(k)‖(CV(clave)‖CV(valor))… con claves de texto en orden ESTRICTAMENTE creciente por bytes UTF‑8.
//
// Kernel: el varuint es el de Minimal Flat 1.0.0 (`encodeVarUint`/`decodeVarUintAt`: LEB128 sin signo, canónico).
// No se importa el archivo del kernel (es un script que se instala en `globalThis` y arrastra HMAC/AES‑GCM que el
// núcleo no usa); se realiza la MISMA función, byte a byte, sin modificar el kernel. [D]
// Garantías: (a) cada valor tiene una única codificación, (b) CV es libre de prefijos e inyectivo, (c) Dec∘CV = id.

import { utf8, desdeUtf8, concatenar, compararBytes, igualesBytes } from './bytes.mjs';

/** varuint(x): LEB128 canónico, idéntico a Minimal Flat 1.0.0. */
export function varuint(x) {
  if (!Number.isSafeInteger(x) || x < 0) throw new RangeError('varuint: entero seguro ≥ 0');
  const out = [];
  let n = x;
  do { const bajo = n % 128; n = Math.floor(n / 128); out.push(bajo | (n > 0 ? 0x80 : 0)); } while (n > 0);
  return Uint8Array.from(out);
}

/** Lee un varuint canónico en b[o…]; devuelve [valor, siguiente]. Rechaza formas no canónicas y desbordes. */
export function leerVaruint(b, o) {
  let v = 0, mult = 1;
  for (let i = o; i < b.length; i++) {
    v += (b[i] & 0x7f) * mult;
    if (!Number.isSafeInteger(v)) throw new Error('CV: varuint excede 2^53−1');
    if ((b[i] & 0x80) === 0) {
      if (!igualesBytes(varuint(v), b.subarray(o, i + 1))) throw new Error('CV: varuint no canónico');
      return [v, i + 1];
    }
    mult *= 128;
    if (!Number.isSafeInteger(mult)) throw new Error('CV: varuint demasiado grande');
  }
  throw new Error('CV: truncado (varuint)');
}

/** Un mapa CV es un objeto plano (prototipo Object.prototype o null); no Array, no Uint8Array, no Map. */
export function esMapa(v) {
  if (v === null || typeof v !== 'object' || Array.isArray(v) || v instanceof Uint8Array) return false;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}

const ETQ = Object.freeze({ NULO: 0, FALSO: 1, VERDADERO: 2, NAT: 3, NEG: 4, BYTES: 5, TEXTO: 6, LISTA: 7, MAPA: 8 });

function codificarEn(v, out) {
  if (v === null) out.push(Uint8Array.of(ETQ.NULO));
  else if (v === false) out.push(Uint8Array.of(ETQ.FALSO));
  else if (v === true) out.push(Uint8Array.of(ETQ.VERDADERO));
  else if (typeof v === 'number') {
    if (!Number.isSafeInteger(v)) throw new Error('CV: solo enteros seguros (no hay reales)');
    if (v >= 0) out.push(Uint8Array.of(ETQ.NAT), varuint(v)); // −0 es el entero 0
    else out.push(Uint8Array.of(ETQ.NEG), varuint(-v));
  } else if (v instanceof Uint8Array) out.push(Uint8Array.of(ETQ.BYTES), varuint(v.length), Uint8Array.from(v));
  else if (typeof v === 'string') { const b = utf8(v); out.push(Uint8Array.of(ETQ.TEXTO), varuint(b.length), b); }
  else if (Array.isArray(v)) { out.push(Uint8Array.of(ETQ.LISTA), varuint(v.length)); for (const x of v) codificarEn(x, out); }
  else if (esMapa(v)) {
    const claves = Object.keys(v).map(k => [k, utf8(k)]).sort((a, b) => compararBytes(a[1], b[1]));
    out.push(Uint8Array.of(ETQ.MAPA), varuint(claves.length));
    for (const [k, kb] of claves) { out.push(Uint8Array.of(ETQ.TEXTO), varuint(kb.length), kb); codificarEn(v[k], out); }
  } else throw new Error(`CV: valor no codificable (${typeof v})`);
}

/** CV(v) → bytes. */
export function cv(v) { const out = []; codificarEn(v, out); return concatenar(out); }

function decodificarDe(b, o) {
  if (o >= b.length) throw new Error('CV: truncado');
  const etq = b[o++];
  switch (etq) {
    case ETQ.NULO: return [null, o];
    case ETQ.FALSO: return [false, o];
    case ETQ.VERDADERO: return [true, o];
    case ETQ.NAT: return leerVaruint(b, o);
    case ETQ.NEG: { const [x, o2] = leerVaruint(b, o); if (x === 0) throw new Error('CV: 04 00 (−0) inválido'); return [-x, o2]; }
    case ETQ.BYTES: {
      const [n, o2] = leerVaruint(b, o);
      if (o2 + n > b.length) throw new Error('CV: truncado (bytes)');
      return [Uint8Array.from(b.subarray(o2, o2 + n)), o2 + n];
    }
    case ETQ.TEXTO: {
      const [n, o2] = leerVaruint(b, o);
      if (o2 + n > b.length) throw new Error('CV: truncado (texto)');
      return [desdeUtf8(b.subarray(o2, o2 + n)), o2 + n];
    }
    case ETQ.LISTA: {
      const [k, o2] = leerVaruint(b, o);
      let p = o2; const xs = [];
      for (let i = 0; i < k; i++) { const [x, p2] = decodificarDe(b, p); xs.push(x); p = p2; }
      return [xs, p];
    }
    case ETQ.MAPA: {
      const [k, o2] = leerVaruint(b, o);
      let p = o2; const m = {}; let previa = null;
      for (let i = 0; i < k; i++) {
        if (p >= b.length || b[p] !== ETQ.TEXTO) throw new Error('CV: clave de mapa no es texto');
        const [n, p1] = leerVaruint(b, p + 1);
        if (p1 + n > b.length) throw new Error('CV: truncado (clave)');
        const kb = b.subarray(p1, p1 + n);
        if (previa !== null && compararBytes(previa, kb) >= 0) throw new Error('CV: claves desordenadas o repetidas');
        const clave = desdeUtf8(kb);
        const [x, p3] = decodificarDe(b, p1 + n);
        // defineProperty: una clave «__proto__» es un dato, no un cambio de prototipo
        Object.defineProperty(m, clave, { value: x, enumerable: true, writable: true, configurable: true });
        previa = kb; p = p3;
      }
      return [m, p];
    }
    default: throw new Error(`CV: etiqueta desconocida ${etq}`);
  }
}

/** Dec(b): inversa de CV; rechaza etiquetas desconocidas, varuint no canónico, 04 00, UTF‑8 mal formado,
 *  claves desordenadas o repetidas, bytes truncados y bytes sobrantes. */
export function decCV(b) {
  if (!(b instanceof Uint8Array)) throw new TypeError('CV: se esperaban bytes');
  const [v, o] = decodificarDe(b, 0);
  if (o !== b.length) throw new Error('CV: bytes sobrantes');
  return v;
}

/** Igualdad de valores CV (por su codificación canónica). */
export const igualCV = (a, b) => igualesBytes(cv(a), cv(b));
