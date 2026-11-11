// Kobalt · núcleo · derivacion — Contrato de derivación Exacto `kobalt:nucleo:1` (spec §4.2). Núcleo puro.
//
// Correspondencia:
//   Frame([a_1…a_m]) = uint32be(m) ‖ ∏ (uint64be(|a_j|) ‖ a_j)          ↔ frame        (KOB2 9.0.1 Frame)
//   𝔇(tag, x_1…x_k) = SHA‑256(Frame(["kobalt:clear:derive:3", tag, x…])) ↔ derivar      (= KOB2.View.derive(clear,…))
//   T_G, T_P, T_S, T_N                                                   ↔ ETIQUETAS.{GENESIS, PASO, SID, SNAPSHOT}
//   g = (StreamID, predecesor, C_0)                                       ↔ {streamId, predecesor, C0}
//   CV(g) = CV([bytes(StreamID), null | [bytes(s), n, bytes(h)], C_0])    ↔ encGenesis / decGenesis
//   h_0 = 𝔇(T_G, StreamID, CV(g))                                         ↔ hashGenesis
//   e = (ε, u, sid, deps, clase, tipo, args)                              ↔ {epoca, u, sid, deps, clase, tipo, args}
//   Enc(e) = CV([ε, u, bytes(sid), [[bytes(Y), k, bytes(h_k)]…], clase, tipo, args]) ↔ encEntrada / decEntrada
//   h_i = 𝔇(T_P, h_{i−1}, Enc(e_i))                                       ↔ hashPaso
//   DeriveSid(dom, v) = 𝔇(T_S, dom, CV(v))                                ↔ deriveSid
//
// Kernels: Exacto (Q = ContentId_𝒟(B)) realizado con SHA‑256 bajo este contrato explícito; Frame y la etiqueta
// "kobalt:clear:derive:3" son los de KOB2 9.0.1 (`View.derive` con vista clara). El kernel no se importa ni se
// modifica: el contrato de pruebas compara `derivar` con `KOB2.View.derive` en entradas aleatorias. [D][V]
// Separación de dominios: génesis y paso usan etiquetas distintas (Teorema 4.2: la cabeza identifica el prefijo).

import { utf8, hexABytes, bytesAHex, concatenar, esHex } from './bytes.mjs';
import { cv, decCV, esMapa } from './cv.mjs';
import { sha256 } from './sha256.mjs';

export const ETIQUETAS = Object.freeze({
  GENESIS: 'kobalt:nucleo:genesis:1',
  PASO: 'kobalt:nucleo:paso:1',
  SID: 'kobalt:nucleo:sid:1',
  SNAPSHOT: 'kobalt:nucleo:snapshot:1',
});
const ETIQUETA_DERIVAR = utf8('kobalt:clear:derive:3');

function uint32be(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b; }
function uint64be(n) { const b = new Uint8Array(8); const dv = new DataView(b.buffer); dv.setUint32(0, Math.floor(n / 0x100000000)); dv.setUint32(4, n >>> 0); return b; }

/** Frame de KOB2: inyectivo sobre listas de cadenas de bytes. */
export function frame(partes) {
  const out = [uint32be(partes.length)];
  for (const p of partes) out.push(uint64be(p.length), p);
  return concatenar(out);
}

/** 𝔇(tag, x_1…x_k) → hex64. tag: texto bien formado; partes: bytes. */
export function derivar(tag, ...partes) {
  for (const p of partes) if (!(p instanceof Uint8Array)) throw new TypeError('derivar: las partes deben ser bytes');
  return bytesAHex(sha256(frame([ETIQUETA_DERIVAR, utf8(tag), ...partes])));
}

// ─────────── Génesis ───────────
const esPredecesor = p => p !== null && typeof p === 'object' && esHex(p.streamId, 16) && Number.isSafeInteger(p.n) && p.n >= 0 && esHex(p.h, 32);

/** CV(g). Lanza si g no es una génesis bien formada (StreamID de 16 B, predecesor nulo o (StreamID, n, h_32), C0 mapa). */
export function encGenesis(g) {
  if (!g || !esHex(g.streamId, 16)) throw new Error('génesis: StreamID debe ser de 16 bytes');
  const p = g.predecesor ?? null;
  if (p !== null && !esPredecesor(p)) throw new Error('génesis: predecesor mal formado');
  if (!esMapa(g.C0)) throw new Error('génesis: C0 no es mapa');
  return cv([hexABytes(g.streamId), p === null ? null : [hexABytes(p.streamId), p.n, hexABytes(p.h)], g.C0]);
}

export function decGenesis(b) {
  const v = decCV(b);
  if (!Array.isArray(v) || v.length !== 3 || !(v[0] instanceof Uint8Array) || v[0].length !== 16 || !esMapa(v[2])) throw new Error('génesis mal formada');
  let predecesor = null;
  if (v[1] !== null) {
    const p = v[1];
    if (!Array.isArray(p) || p.length !== 3 || !(p[0] instanceof Uint8Array) || p[0].length !== 16
      || !Number.isSafeInteger(p[1]) || p[1] < 0 || !(p[2] instanceof Uint8Array) || p[2].length !== 32) throw new Error('génesis: predecesor mal formado');
    predecesor = { streamId: bytesAHex(p[0]), n: p[1], h: bytesAHex(p[2]) };
  }
  return { streamId: bytesAHex(v[0]), predecesor, C0: v[2] };
}

/** h_0 a partir de los bytes de la génesis (lo que guarda la materialidad). */
export const hashGenesisBytes = (streamId, gBytes) => derivar(ETIQUETAS.GENESIS, hexABytes(streamId), gBytes);
/** h_0 = 𝔇(T_G, StreamID, CV(g)). */
export const hashGenesis = g => hashGenesisBytes(g.streamId, encGenesis(g));

// ─────────── Entrada ───────────
const esDep = d => d !== null && typeof d === 'object' && esHex(d.stream, 16) && Number.isSafeInteger(d.k) && d.k >= 0 && esHex(d.h, 32);

/** Enc(e). Lanza si e no es codificable. */
export function encEntrada(e) {
  if (!Array.isArray(e.deps) || !e.deps.every(esDep)) throw new Error('entrada: deps mal formadas');
  return cv([e.epoca, e.u, hexABytes(e.sid), e.deps.map(d => [hexABytes(d.stream), d.k, hexABytes(d.h)]), e.clase, e.tipo, e.args]);
}

export function decEntrada(b) {
  const v = decCV(b);
  if (!Array.isArray(v) || v.length !== 7) throw new Error('entrada: no es lista de 7');
  const [epoca, u, sid, deps, clase, tipo, args] = v;
  if (!Number.isSafeInteger(epoca) || epoca < 0 || typeof u !== 'string' || !(sid instanceof Uint8Array) || sid.length === 0
    || !Array.isArray(deps) || typeof clase !== 'string' || typeof tipo !== 'string') throw new Error('entrada mal formada');
  const ds = deps.map(d => {
    if (!Array.isArray(d) || d.length !== 3 || !(d[0] instanceof Uint8Array) || d[0].length !== 16
      || !Number.isSafeInteger(d[1]) || d[1] < 0 || !(d[2] instanceof Uint8Array) || d[2].length !== 32) throw new Error('entrada: dep mal formada');
    return { stream: bytesAHex(d[0]), k: d[1], h: bytesAHex(d[2]) };
  });
  return { epoca, u, sid: bytesAHex(sid), deps: ds, clase, tipo, args };
}

/** h_i = 𝔇(T_P, h_{i−1}, b_i), con b_i = Enc(e_i). */
export const hashPaso = (hPrevio, bloque) => derivar(ETIQUETAS.PASO, hexABytes(hPrevio), bloque);

/** DeriveSid(dom, v) = 𝔇(T_S, dom, CV(v)); dom en bytes o texto (UTF‑8). Ayuda para sid deterministas (H1 de §7.8). */
export const deriveSid = (dom, v) => derivar(ETIQUETAS.SID, typeof dom === 'string' ? utf8(dom) : dom, cv(v));
