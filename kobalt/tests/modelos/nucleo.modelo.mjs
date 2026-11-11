// Kobalt — modelo de referencia (oráculo) del NÚCLEO GENERAL (fase 1).
//
// Traducción literal de kobalt/specs/2026-11-11_fase1-nucleo.md (§3–§7). No optimiza,
// no persiste y no tiene red. Sin vocabulario de dominio: el núcleo solo conoce
// trayectorias, contratos, épocas, solicitudes (`sid`), proyecciones y diferencias.
//
// Este archivo expone EXACTAMENTE la API que se exige a `kobalt/src/nucleo/index.mjs`
// (ver el encabezado de kobalt/tests/leyes/nucleo.impl.test.mjs), más:
//   - funciones puras sobre valores Γ (sección «Modelo puro»), que usan las pruebas de leyes;
//   - reglas y proyecciones DE JUGUETE (sección final), que son DATOS DE CONTRATO para las
//     pruebas y NO forman parte del núcleo.
//
// Correspondencia objeto matemático ↔ símbolo:
//   CV ↔ cv/decCV · Frame ↔ frame · 𝔇 ↔ derivar · Enc(e) ↔ encEntrada · CV(g) ↔ encGenesis
//   h_0 ↔ hashGenesis · h_i = 𝔇(T_P,h_{i−1},Enc(e_i)) ↔ hashPaso · DeriveSid ↔ deriveSid
//   S = (n, ε, C_ε, sellado, Sids, D) ↔ {n, epoca, parametros, sellado, sids, D}
//   e = (ε, u, sid, deps, clase, tipo, args) ↔ {epoca, u, sid, deps, clase, tipo, args}
//   Accept (G0–G5 + guarda §5.2) ↔ admitir · T ↔ transformar · Fold ↔ fold
//   AppendIfHead ↔ appendIfHead · Incorporar ↔ incorporar · Verificar ↔ verificar
//   Resolver(c,c') ↔ resolver · §7.4 ↔ resolverProyeccion · §7.5 ↔ esCerrado/cerrarCorte
//   Compose ↔ componer · Δ(O,A) ↔ diferencia · materialidad §5.5 ↔ crearAlmacenMemoria

import { createHash } from 'node:crypto';

// ═════════════════════════ 0. Bytes ═════════════════════════
const te = new TextEncoder();
const HEX = /^(?:[0-9a-f]{2})+$/;
export function hexABytes(h) {
  if (typeof h !== 'string' || !HEX.test(h)) throw new Error(`hex inválido: ${String(h).slice(0, 40)}`);
  return Uint8Array.from(Buffer.from(h, 'hex'));
}
export const bytesAHex = b => Buffer.from(b).toString('hex');
const concat = partes => Uint8Array.from(Buffer.concat(partes.map(p => Buffer.from(p))));
const esHex = (h, nBytes) => typeof h === 'string' && HEX.test(h) && (nBytes === undefined || h.length === 2 * nBytes);
const igualesBytes = (a, b) => a.length === b.length && Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;

// ═════════════════════════ 1. CV: codificación canónica de valores (§4.2) ═════════════════════════
// null 00 · false 01 · true 02 · entero≥0 03‖varuint · entero<0 04‖varuint(−x) · bytes 05 · texto 06
// lista 07‖varuint(k)‖… · mapa 08‖varuint(k)‖(CV(clave)‖CV(valor))… claves en orden estricto por bytes UTF‑8.
function varuint(x) { // idéntico a Minimal Flat 1.0.0 encodeVarUint
  if (!Number.isSafeInteger(x) || x < 0) throw new RangeError('varuint: entero seguro ≥ 0');
  const out = []; let n = x;
  do { const low = n % 128; n = Math.floor(n / 128); out.push(low | (n > 0 ? 0x80 : 0)); } while (n > 0);
  return Uint8Array.from(out);
}
function decVaruint(b, o) { // canónico (Minimal rechaza formas no canónicas)
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
export const esMapa = v => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Uint8Array)
  && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const cmpUtf8 = (a, b) => Buffer.compare(Buffer.from(te.encode(a)), Buffer.from(te.encode(b)));

function codificarEn(v, out) {
  if (v === null) out.push(Uint8Array.of(0));
  else if (v === false) out.push(Uint8Array.of(1));
  else if (v === true) out.push(Uint8Array.of(2));
  else if (typeof v === 'number') {
    if (!Number.isSafeInteger(v)) throw new Error('CV: solo enteros seguros (no hay reales)');
    if (v >= 0) out.push(Uint8Array.of(3), varuint(v)); // −0 ≡ 0
    else out.push(Uint8Array.of(4), varuint(-v));
  } else if (v instanceof Uint8Array) out.push(Uint8Array.of(5), varuint(v.length), v);
  else if (typeof v === 'string') {
    if (!v.isWellFormed()) throw new Error('CV: texto mal formado (surrogate suelto)');
    const b = te.encode(v); out.push(Uint8Array.of(6), varuint(b.length), b);
  } else if (Array.isArray(v)) { out.push(Uint8Array.of(7), varuint(v.length)); for (const x of v) codificarEn(x, out); }
  else if (esMapa(v)) {
    const claves = Object.keys(v).sort(cmpUtf8);
    out.push(Uint8Array.of(8), varuint(claves.length));
    for (const k of claves) { codificarEn(k, out); codificarEn(v[k], out); }
  } else throw new Error(`CV: valor no codificable (${typeof v})`);
}
/** CV(v) → bytes. Lanza si v no pertenece al universo de valores CV. */
export function cv(v) { const out = []; codificarEn(v, out); return concat(out); }

const tdFatal = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
function decodificarDe(b, o) {
  if (o >= b.length) throw new Error('CV: truncado');
  const tag = b[o++];
  switch (tag) {
    case 0: return [null, o];
    case 1: return [false, o];
    case 2: return [true, o];
    case 3: return decVaruint(b, o);
    case 4: { const [x, o2] = decVaruint(b, o); if (x === 0) throw new Error('CV: 04 00 (−0) inválido'); return [-x, o2]; }
    case 5: { const [n, o2] = decVaruint(b, o); if (o2 + n > b.length) throw new Error('CV: truncado (bytes)'); return [Uint8Array.from(b.subarray(o2, o2 + n)), o2 + n]; }
    case 6: {
      const [n, o2] = decVaruint(b, o); if (o2 + n > b.length) throw new Error('CV: truncado (texto)');
      let t; try { t = tdFatal.decode(b.subarray(o2, o2 + n)); } catch { throw new Error('CV: UTF‑8 mal formado'); }
      return [t, o2 + n];
    }
    case 7: {
      const [k, o2] = decVaruint(b, o); let p = o2; const xs = [];
      for (let i = 0; i < k; i++) { const [x, p2] = decodificarDe(b, p); xs.push(x); p = p2; }
      return [xs, p];
    }
    case 8: {
      const [k, o2] = decVaruint(b, o); let p = o2; const m = {}; let previa = null;
      for (let i = 0; i < k; i++) {
        if (b[p] !== 6) throw new Error('CV: clave de mapa no es texto');
        const [clave, p2] = decodificarDe(b, p);
        if (previa !== null && cmpUtf8(previa, clave) >= 0) throw new Error('CV: claves desordenadas o repetidas');
        const [x, p3] = decodificarDe(b, p2);
        Object.defineProperty(m, clave, { value: x, enumerable: true, writable: true, configurable: true });
        previa = clave; p = p3;
      }
      return [m, p];
    }
    default: throw new Error(`CV: etiqueta desconocida ${tag}`);
  }
}
/** Dec(b): inversa de CV; rechaza todo lo que no sea imagen de CV (Teorema 4.1c). */
export function decCV(b) {
  if (!(b instanceof Uint8Array)) throw new Error('CV: se esperaban bytes');
  const [v, o] = decodificarDe(b, 0);
  if (o !== b.length) throw new Error('CV: bytes sobrantes');
  return v;
}
export const igualCV = (a, b) => igualesBytes(cv(a), cv(b));

// ═════════════════════════ 2. Frame y 𝔇 (idénticos a KOB2 9.0.1) ═════════════════════════
const u32be = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const u64be = n => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; };
export function frame(partes) { return concat([u32be(partes.length), ...partes.flatMap(a => [u64be(a.length), a])]); }
const sha256hex = b => createHash('sha256').update(b).digest('hex');
const TAG_CLEAR_DERIVE = te.encode('kobalt:clear:derive:3');
/** 𝔇(tag, x_1…x_k) = SHA‑256(Frame(["kobalt:clear:derive:3", tag, x_1…x_k])) en hex (= KOB2.View.derive(clear,…)). */
export function derivar(tag, ...partes) {
  return sha256hex(frame([TAG_CLEAR_DERIVE, te.encode(tag), ...partes.map(p => { if (!(p instanceof Uint8Array)) throw new Error('derivar: partes deben ser bytes'); return p; })]));
}
export const ETIQUETAS = Object.freeze({
  GENESIS: 'kobalt:nucleo:genesis:1', PASO: 'kobalt:nucleo:paso:1', SID: 'kobalt:nucleo:sid:1', SNAPSHOT: 'kobalt:nucleo:snapshot:1',
});

// ═════════════════════════ 3. Génesis, entrada, cadena ═════════════════════════
// g = {streamId: hex32, predecesor: null | {streamId, n, h}, C0: mapa p ↦ v (debe traer nucleo.regla y nucleo.constituyente)}
// CV(g) = CV([bytes(StreamID), null | [bytes(StreamID'), n, bytes(h)], C0])
export function encGenesis(g) {
  const p = g.predecesor ?? null;
  return cv([hexABytes(g.streamId), p === null ? null : [hexABytes(p.streamId), p.n, hexABytes(p.h)], g.C0]);
}
export function decGenesis(b) {
  const v = decCV(b);
  if (!Array.isArray(v) || v.length !== 3 || !(v[0] instanceof Uint8Array) || v[0].length !== 16 || !esMapa(v[2])) throw new Error('génesis mal formada');
  let predecesor = null;
  if (v[1] !== null) {
    const p = v[1];
    if (!Array.isArray(p) || p.length !== 3 || !(p[0] instanceof Uint8Array) || p[0].length !== 16 || !Number.isSafeInteger(p[1]) || p[1] < 0 || !(p[2] instanceof Uint8Array) || p[2].length !== 32) throw new Error('génesis: predecesor mal formado');
    predecesor = { streamId: bytesAHex(p[0]), n: p[1], h: bytesAHex(p[2]) };
  }
  return { streamId: bytesAHex(v[0]), predecesor, C0: v[2] };
}
export const hashGenesis = g => derivar(ETIQUETAS.GENESIS, hexABytes(g.streamId), encGenesis(g));

// Enc(e) = CV([ε, u, bytes(sid), [[bytes(StreamID), k, bytes(h_k)]…], clase, tipo, args])
export function encEntrada(e) {
  return cv([e.epoca, e.u, hexABytes(e.sid), e.deps.map(d => [hexABytes(d.stream), d.k, hexABytes(d.h)]), e.clase, e.tipo, e.args]);
}
export function decEntrada(b) {
  const v = decCV(b);
  if (!Array.isArray(v) || v.length !== 7) throw new Error('entrada: no es lista de 7');
  const [epoca, u, sid, deps, clase, tipo, args] = v;
  if (!Number.isSafeInteger(epoca) || epoca < 0 || typeof u !== 'string' || !(sid instanceof Uint8Array) || sid.length === 0
      || !Array.isArray(deps) || typeof clase !== 'string' || typeof tipo !== 'string') throw new Error('entrada mal formada');
  const ds = deps.map(d => {
    if (!Array.isArray(d) || d.length !== 3 || !(d[0] instanceof Uint8Array) || d[0].length !== 16 || !Number.isSafeInteger(d[1]) || d[1] < 0 || !(d[2] instanceof Uint8Array) || d[2].length !== 32) throw new Error('entrada: dep mal formada');
    return { stream: bytesAHex(d[0]), k: d[1], h: bytesAHex(d[2]) };
  });
  return { epoca, u, sid: bytesAHex(sid), deps: ds, clase, tipo, args };
}
/** h_i = 𝔇(T_P, h_{i−1}, b_i) con b_i = Enc(e_i). */
export const hashPaso = (hPrevio, bloque) => derivar(ETIQUETAS.PASO, hexABytes(hPrevio), bloque);
/** DeriveSid(dom, v) = 𝔇(T_S, dom, CV(v)); dom: bytes o texto (UTF‑8). */
export const deriveSid = (dom, v) => derivar(ETIQUETAS.SID, typeof dom === 'string' ? te.encode(dom) : dom, cv(v));

// ═════════════════════════ 4. Contrato: Σ del núcleo, capacidades, parámetros (§3) ═════════════════════════
const ACCIONES_CONTRATO = new Set(['FijarParámetro', 'Sellar']);
export const claseDe = tipo => (ACCIONES_CONTRATO.has(tipo) ? 'contrato' : 'dominio');
const esListaTextos = v => Array.isArray(v) && v.every(x => typeof x === 'string');

/** Σ del núcleo (parámetros reservados `nucleo.*`, presentes en toda regla). */
function sigmaNucleo(registro, constituyente, regla) {
  return {
    'nucleo.capacidades': { dominio: v => esMapa(v) && Object.values(v).every(esListaTextos), inicial: { [constituyente]: ['*'] } },
    'nucleo.regla': { dominio: v => typeof v === 'string' && Object.hasOwn(registro, v), inicial: regla },
    'nucleo.constituyente': { dominio: v => typeof v === 'string' && v.length > 0, inicial: constituyente },
    'nucleo.derivación': { dominio: v => v === 'kobalt:nucleo:1', inicial: 'kobalt:nucleo:1' },
    'nucleo.retenciónSids': { dominio: v => v === 'ilimitada' || (esMapa(v) && Object.keys(v).length === 1 && Number.isSafeInteger(v.ventana) && v.ventana >= 1), inicial: 'ilimitada' },
  };
}
function sigmaCompleta(registro, idRegla, base) {
  const regla = registro[idRegla];
  const propia = regla.sigma ?? {};
  for (const p of Object.keys(propia)) if (p.startsWith('nucleo.')) throw new Error(`la regla ${idRegla} no puede declarar ${p}`);
  return { ...sigmaNucleo(registro, base['nucleo.constituyente'], base['nucleo.regla']), ...propia };
}
/** coincide(π, tipo): igualdad exacta o prefijo terminado en `*`. */
export const coincide = (patron, tipo) => patron === tipo || (patron.endsWith('*') && tipo.startsWith(patron.slice(0, -1)));
/** Tipos de capacidad que exige una entrada: FijarParámetro(m) ⇒ "FijarParámetro:p" ∀p∈dom m. */
const tiposCapacidad = e => (e.tipo === 'FijarParámetro' ? Object.keys(e.args).map(p => `FijarParámetro:${p}`) : [e.tipo]);
export function autorizado(parametros, u, e) {
  const pats = (parametros['nucleo.capacidades'] ?? {})[u];
  if (!Object.hasOwn(parametros['nucleo.capacidades'] ?? {}, u) || !Array.isArray(pats)) return false;
  return tiposCapacidad(e).every(t => pats.some(p => coincide(p, t)));
}
const configuradorVivo = parametros => Object.values(parametros['nucleo.capacidades']).some(ps => ps.some(p => coincide(p, 'FijarParámetro:nucleo.capacidades')));

/** parámetros' = (iniciales de Σ_{r'}) ⊕ (vigentes restringidos a dom Σ_{r'}) ⊕ m   (§5.2). */
export function recomponerParametros(parametros, m, registro) {
  const r2 = Object.hasOwn(m, 'nucleo.regla') ? m['nucleo.regla'] : parametros['nucleo.regla'];
  const sigma = sigmaCompleta(registro, r2, parametros);
  const out = {};
  for (const p of Object.keys(sigma)) out[p] = structuredClone(Object.hasOwn(m, p) ? m[p] : Object.hasOwn(parametros, p) ? parametros[p] : sigma[p].inicial);
  return out;
}

// ═════════════════════════ 5. Estado S, admisión (G0–G5 + §5.2) y T ═════════════════════════
/** S_0 = (0, 0, C_0 completado con iniciales de Σ_{r_0}, false, ∅, D_0). Lanza si la génesis no es válida. */
export function estadoInicial(g, registro) {
  const C0 = g.C0;
  if (!esMapa(C0)) throw new Error('génesis: C0 no es mapa');
  const r0 = C0['nucleo.regla'], u0 = C0['nucleo.constituyente'];
  if (typeof r0 !== 'string' || !Object.hasOwn(registro, r0)) throw new Error('génesis: regla no registrada');
  if (typeof u0 !== 'string' || u0.length === 0) throw new Error('génesis: falta constituyente');
  const sigma = sigmaCompleta(registro, r0, C0);
  const parametros = {};
  for (const p of Object.keys(C0)) if (!Object.hasOwn(sigma, p) || !sigma[p].dominio(C0[p])) throw new Error(`génesis: parámetro inválido ${p}`);
  for (const p of Object.keys(sigma)) parametros[p] = structuredClone(Object.hasOwn(C0, p) ? C0[p] : sigma[p].inicial);
  if (!configuradorVivo(parametros)) throw new Error('génesis: autobloqueo (V6)');
  return { n: 0, epoca: 0, parametros, sellado: false, sids: {}, D: structuredClone(registro[r0].D0) };
}

const DEP_OK = d => d && esHex(d.stream, 16) && Number.isSafeInteger(d.k) && d.k >= 0 && esHex(d.h, 32);
/** G5 · forma: CV, clase coherente con tipo, deps ordenadas y únicas por StreamID, tipo y args válidos para la regla vigente. */
function formaValida(S, e, registro) {
  if (!Number.isSafeInteger(e.epoca) || e.epoca < 0 || typeof e.u !== 'string' || !esHex(e.sid)) return false;
  if (!Array.isArray(e.deps) || !e.deps.every(DEP_OK)) return false;
  for (let i = 1; i < e.deps.length; i++) if (!(e.deps[i - 1].stream < e.deps[i].stream)) return false;
  if (typeof e.tipo !== 'string' || e.clase !== claseDe(e.tipo)) return false;
  try { encEntrada(e); } catch { return false; }
  if (e.tipo === 'FijarParámetro') return esMapa(e.args) && Object.keys(e.args).length > 0;
  if (e.tipo === 'Sellar') return true;
  const regla = registro[S.parametros['nucleo.regla']];
  return Object.hasOwn(regla.tipos, e.tipo) && regla.tipos[e.tipo](e.args) === true;
}

/** Estado de Y en la posición k (para G4 y Lect). `conocidas[Y]` es una trayectoria pura (ver §8). */
function estadoDeConocida(conocidas, stream, k, registro) {
  const ΓY = conocidas?.[stream];
  if (!ΓY || ΓY.hashes.length - 1 < k) return null;
  return estadoEn(ΓY, k, registro);
}
/** Lect: solo predicados estables declarados (de la regla de Y o del núcleo, Teorema 7.7), en el checkpoint de e.deps. */
function lectura(e, ctx) {
  return Object.freeze({
    estable(stream, nombre, ...args) {
      const d = e.deps.find(x => x.stream === stream);
      if (!d) return false;
      const SY = estadoDeConocida(ctx.conocidas, stream, d.k, ctx.registro);
      if (!SY) return false;
      if (nombre === 'nucleo.sellado') return SY.sellado === true;
      if (nombre === 'nucleo.sid') return Object.hasOwn(SY.sids, args[0]);
      if (nombre === 'nucleo.nAlMenos') return SY.n >= args[0];
      const P = ctx.registro[SY.parametros['nucleo.regla']].estables?.[nombre];
      return P ? P(SY.D, ...args) === true : false;
    },
  });
}

/** Guarda propia de FijarParámetro (§5.2 i–vi). */
function guardaFijar(S, m, registro) {
  const r = S.parametros['nucleo.regla'];
  const r2 = Object.hasOwn(m, 'nucleo.regla') ? m['nucleo.regla'] : r;
  if (typeof r2 !== 'string' || !Object.hasOwn(registro, r2)) return 'fueraDeDominio';
  const sigma = sigmaCompleta(registro, r2, S.parametros);
  for (const p of Object.keys(m)) if (!Object.hasOwn(sigma, p)) return 'parametroDesconocido';      // (i)
  for (const p of Object.keys(m)) if (!sigma[p].dominio(m[p])) return 'fueraDeDominio';             // (ii)
  if (Object.keys(m).every(p => Object.hasOwn(S.parametros, p) && igualCV(m[p], S.parametros[p]))) return 'sinCambio'; // (iii)
  if (r2 !== r && typeof registro[r2].migraDesde?.[r] !== 'function') return 'sinMigracion';         // (iv)
  if (!configuradorVivo(recomponerParametros(S.parametros, m, registro))) return 'autobloqueo';     // (v)
  const gp = registro[r2].guardaPar ? registro[r2].guardaPar(m, S.D, S.parametros) : 'ok';          // (vi)
  return gp === 'ok' ? null : gp;
}

/**
 * Accept_{C_ε}(u, e, S): G0 → G5 → G1 → G2 → G3 → G4 → guarda de la acción (orden fijo del contrato de API).
 * ctx = { registro, conocidas?: {StreamID ↦ Γ}, epocaEsperada? }.
 * Devuelve {ok:true} | {ok:false, rechazo, motivo?, i?, dep?, divergencia?}.
 */
export function admitir(S, e, ctx) {
  const { registro } = ctx;
  if (S.sellado) return { ok: false, rechazo: 'SELLADO' };                                           // G0
  if (!formaValida(S, e, registro)) return { ok: false, rechazo: 'INADMISIBLE', motivo: 'forma' };   // G5
  if (!autorizado(S.parametros, e.u, e)) return { ok: false, rechazo: 'NO_AUTORIZADO' };            // G1
  if (Object.hasOwn(S.sids, e.sid)) return { ok: false, rechazo: 'YA_COMPROMETIDO', i: S.sids[e.sid] }; // G2
  if (e.epoca !== S.epoca || (ctx.epocaEsperada !== undefined && ctx.epocaEsperada !== S.epoca)) return { ok: false, rechazo: 'ÉPOCA_CAMBIADA' }; // G3
  for (const d of e.deps) {                                                                          // G4
    const ΓY = ctx.conocidas?.[d.stream];
    if (!ΓY || ΓY.hashes.length - 1 < d.k) return { ok: false, rechazo: 'DEPENDENCIA_NO_VERIFICABLE', dep: d, divergencia: false };
    if (ΓY.hashes[d.k] !== d.h) return { ok: false, rechazo: 'DEPENDENCIA_NO_VERIFICABLE', dep: d, divergencia: true };
  }
  let motivo = null;
  if (e.tipo === 'FijarParámetro') motivo = guardaFijar(S, e.args, registro);
  else if (e.clase === 'dominio') {
    const regla = registro[S.parametros['nucleo.regla']];
    const r = regla.guarda ? regla.guarda(S.D, e, S.parametros, lectura(e, ctx)) : 'ok';
    motivo = r === 'ok' ? null : r;
  }
  return motivo === null ? { ok: true } : { ok: false, rechazo: 'INADMISIBLE', motivo };
}

/** T(S, e): pura. Efecto común (n, Sids con retención) + efecto de la clase, con la regla y parámetros de C_{ε_{n}}. */
/** Efecto común: n := n+1, Sids[sid] := n (con ventana, se expulsa el más antiguo). */
function efectoComun(n0, sids0, parametros, sid) {
  const n = n0 + 1;
  const sids = { ...sids0, [sid]: n };
  const ret = parametros['nucleo.retenciónSids'];
  if (esMapa(ret)) {
    while (Object.keys(sids).length > ret.ventana) {
      let min = null; for (const [s, i] of Object.entries(sids)) if (min === null || i < sids[min]) min = s;
      delete sids[min];
    }
  }
  return { n, sids };
}
export function transformar(S, e, registro) {
  const { n, sids } = efectoComun(S.n, S.sids, S.parametros, e.sid);
  let { epoca, parametros, sellado, D } = S;
  if (e.tipo === 'FijarParámetro') {
    const r = parametros['nucleo.regla'];
    const nuevos = recomponerParametros(parametros, e.args, registro);
    const r2 = nuevos['nucleo.regla'];
    if (r2 !== r) D = registro[r2].migraDesde[r](D);
    parametros = nuevos; epoca += 1;
  } else if (e.tipo === 'Sellar') { sellado = true; epoca += 1; }
  else D = registro[parametros['nucleo.regla']].T(D, e, parametros);
  return { n, epoca, parametros, sellado, sids, D };
}
/** Fold(S, [e…]) — acción del monoide libre (L4). */
export const fold = (S, entradas, registro) => entradas.reduce((s, e) => transformar(s, e, registro), S);

// ═════════════════════════ 6. Modelo puro: Γ como valor ═════════════════════════
// Γ = {streamId, g, gBytes, bloques[1..n], entradas[1..n], hashes[0..n], estados[0..n]}. Nunca se muta.
export function trayectoriaNueva(g, registro) {
  if (!esHex(g.streamId, 16)) return { resultado: 'INADMISIBLE', motivo: 'streamId' };
  let S0; try { S0 = estadoInicial(g, registro); encGenesis(g); } catch (err) { return { resultado: 'INADMISIBLE', motivo: err.message }; }
  const h0 = hashGenesis(g);
  return { resultado: 'CREADO', n: 0, h: h0, Γ: { streamId: g.streamId, g, gBytes: encGenesis(g), bloques: [], entradas: [], hashes: [h0], estados: [S0] } };
}
export const cabezaDe = Γ => ({ n: Γ.entradas.length, h: Γ.hashes.at(-1) });
export function estadoEn(Γ, k, registro) {
  if (Γ.estados && Γ.estados[k]) return Γ.estados[k];
  return fold(estadoInicial(Γ.g, registro), Γ.entradas.slice(0, k), registro);
}
const extender = (Γ, nuevos) => {
  let { bloques, entradas, hashes, estados } = Γ;
  bloques = [...bloques]; entradas = [...entradas]; hashes = [...hashes]; estados = estados ? [...estados] : undefined;
  for (const x of nuevos) { bloques.push(x.b); entradas.push(x.e); hashes.push(x.h); if (estados) estados.push(x.S); }
  return { ...Γ, bloques, entradas, hashes, estados };
};
const construirEntrada = (S, sol) => ({
  epoca: S.epoca, u: sol.u, sid: sol.sid, deps: sol.deps ?? [], clase: claseDe(sol.tipo), tipo: sol.tipo, args: sol.args ?? null,
});

/**
 * AppendIfHead sobre un valor Γ (§5.3). sol = {u, sid, tipo, args, deps?, epocaEsperada?}.
 * (a) (n,h) debe ser una posición de Γ; (b) el mecanismo actúa por C_ε.constituyente; (c) Accept sobre S_n;
 * (d) compare‑and‑append: si la cabeza actual ≠ (n,h) ⇒ CABEZA_CAMBIADA.
 */
export function comprometer(Γ, cabeza, mecanismo, sol, ctx) {
  const actual = cabezaDe(Γ);
  if (!cabeza || !Number.isSafeInteger(cabeza.n) || cabeza.n < 0 || cabeza.n > actual.n || Γ.hashes[cabeza.n] !== cabeza.h) return { resultado: 'CABEZA_CAMBIADA', ...actual };
  const S = estadoEn(Γ, cabeza.n, ctx.registro);
  if (S.parametros['nucleo.constituyente'] !== mecanismo) return { resultado: 'NO_CONSTITUYENTE' };
  const e = construirEntrada(S, sol);
  const adm = admitir(S, e, { ...ctx, epocaEsperada: sol.epocaEsperada });
  if (!adm.ok) return rechazoDe(adm);
  if (cabeza.n !== actual.n) return { resultado: 'CABEZA_CAMBIADA', ...actual };
  const b = encEntrada(e);
  const h = hashPaso(cabeza.h, b);
  const S2 = transformar(S, e, ctx.registro);
  return { resultado: 'COMPROMETIDO', n: cabeza.n + 1, h, epoca: e.epoca, Γ: extender(Γ, [{ b, e, h, S: S2 }]) };
}
function rechazoDe(adm) {
  const r = { resultado: adm.rechazo };
  if (adm.motivo !== undefined) r.motivo = adm.motivo;
  if (adm.i !== undefined) r.i = adm.i;
  return r;
}

/** Recorrido de cadena común a Verificar e Incorporar. Devuelve {ok, h} o {ok:false, i, motivo}. */
function verificarSegmento(hInicial, kInicial, epocaInicial, bloques, cabezaFinal) {
  if (kInicial + bloques.length !== cabezaFinal.n) {
    return { ok: false, i: kInicial + 1, motivo: kInicial + bloques.length < cabezaFinal.n ? 'TRUNCADA' : 'SOBRANTES' };
  }
  let h = hInicial;
  for (const b of bloques) h = hashPaso(h, b);
  if (h !== cabezaFinal.h) return { ok: false, i: kInicial + 1, motivo: 'CADENA' };
  let epoca = epocaInicial; const entradas = [];
  for (let j = 0; j < bloques.length; j++) {
    let e; try { e = decEntrada(bloques[j]); } catch { return { ok: false, i: kInicial + j + 1, motivo: 'FORMA' }; }
    if (e.epoca !== epoca) return { ok: false, i: kInicial + j + 1, motivo: 'ÉPOCA' };
    if (e.clase !== claseDe(e.tipo)) return { ok: false, i: kInicial + j + 1, motivo: 'FORMA' };
    if (e.clase === 'contrato') epoca += 1;
    entradas.push(e);
  }
  return { ok: true, h, entradas };
}

/**
 * Incorporar sobre un valor Γ (réplica, §5.3). Atómico: si falla, no se aplica nada.
 * ctx = {registro, conocidas?, readmitir? (por defecto true: «cadena + re‑admisión», §3.5)}.
 * READMISIÓN_PENDIENTE: la cadena se incorpora; la re‑admisión de la entrada i espera a la dependencia `dep`.
 */
export function incorporarEn(Γ, cabeza, bloques, cabezaFinal, ctx) {
  const actual = cabezaDe(Γ);
  if (!cabeza || cabeza.n !== actual.n || cabeza.h !== actual.h) return { resultado: 'CABEZA_CAMBIADA', ...actual };
  let S = estadoEn(Γ, actual.n, ctx.registro);
  const seg = verificarSegmento(actual.h, actual.n, S.epoca, bloques, cabezaFinal);
  if (!seg.ok) return { resultado: 'DISCONTINUIDAD', i: seg.i, motivo: seg.motivo };
  const readmitir = ctx.readmitir ?? true;
  const nuevos = []; let pendiente = null; let h = actual.h;
  for (let j = 0; j < seg.entradas.length; j++) {
    const e = seg.entradas[j], i = actual.n + j + 1;
    if (readmitir) {
      const adm = admitir(S, e, { registro: ctx.registro, conocidas: ctx.conocidas }); // contrato de la época REGISTRADA: C_{ε_{i−1}} = S_{i−1}
      if (!adm.ok) {
        if (adm.rechazo === 'DEPENDENCIA_NO_VERIFICABLE' && !adm.divergencia) { if (!pendiente) pendiente = { i, dep: adm.dep }; }
        else return { resultado: 'DISCONTINUIDAD', i, motivo: 'READMISIÓN', rechazo: adm.rechazo };
      }
    }
    let S2; try { S2 = transformar(S, e, ctx.registro); } catch { return { resultado: 'DISCONTINUIDAD', i, motivo: 'FORMA' }; }
    h = hashPaso(h, bloques[j]);
    nuevos.push({ b: Uint8Array.from(bloques[j]), e, h, S: S2 }); S = S2;
  }
  const Γ2 = extender(Γ, nuevos);
  if (pendiente) return { resultado: 'READMISIÓN_PENDIENTE', i: pendiente.i, dep: pendiente.dep, n: cabezaFinal.n, h: cabezaFinal.h, Γ: Γ2 };
  return { resultado: 'INCORPORADO', n: cabezaFinal.n, h: cabezaFinal.h, Γ: Γ2 };
}

// ═════════════════════════ 7. Materialidad en memoria (§5.5, M1–M5) ═════════════════════════
// Una «copia material» es {streamId, gBytes, bloques, cabeza:{n,h}}: lo que guarda la materialidad.
// El adaptador NO interpreta bytes. compartido = almacén subyacente (dos adaptadores sobre el mismo almacén).
export function crearAlmacenMemoria(compartido) {
  const base = compartido?.[ALMACEN] ?? { streams: new Map(), registros: new Map() };
  const adaptador = {
    crear(streamId, gBytes, h0) {
      if (base.streams.has(streamId)) return { resultado: 'EXISTE' };
      base.streams.set(streamId, { gBytes: Uint8Array.from(gBytes), bloques: [], cabeza: { n: 0, h: h0 } });
      return { resultado: 'OK' };
    },
    cabeza(streamId) { const s = base.streams.get(streamId); return s ? { ...s.cabeza } : null; },
    leerGenesis(streamId) { const s = base.streams.get(streamId); return s ? Uint8Array.from(s.gBytes) : null; },
    leer(streamId, i, j) { const s = base.streams.get(streamId); return s ? s.bloques.slice(i - 1, j).map(b => Uint8Array.from(b)) : null; },
    /** M1: compare‑and‑append atómico (síncrono ⇒ linealizable en un proceso). */
    anexarSiCabeza(streamId, cab, bloques, cabFinal) {
      const s = base.streams.get(streamId);
      if (!s) return { resultado: 'CONFLICTO', n: -1, h: null };
      if (s.cabeza.n !== cab.n || s.cabeza.h !== cab.h) return { resultado: 'CONFLICTO', ...s.cabeza };
      if (cabFinal.n !== cab.n + bloques.length) return { resultado: 'CONFLICTO', ...s.cabeza };
      s.bloques = [...s.bloques, ...bloques.map(b => Uint8Array.from(b))];
      s.cabeza = { n: cabFinal.n, h: cabFinal.h };
      return { resultado: 'OK' };
    },
    /** M4: un registro es una sola unidad (todo o nada). */
    guardar(clave, registro) { base.registros.set(clave, structuredClone(registro)); return { resultado: 'OK' }; },
    leerRegistro(clave) { return base.registros.has(clave) ? structuredClone(base.registros.get(clave)) : null; },
    streams() { return [...base.streams.keys()].sort(); },
  };
  Object.defineProperty(adaptador, ALMACEN, { value: base, enumerable: false });
  return Object.freeze(adaptador);
}
const ALMACEN = Symbol('almacén');

export function leerCopia(almacen, streamId) {
  const cab = almacen.cabeza(streamId);
  if (!cab) return null;
  return { streamId, gBytes: almacen.leerGenesis(streamId), bloques: almacen.leer(streamId, 1, cab.n), cabeza: cab };
}
/** Verificar(copia, desde = génesis | {k, h, epoca?}) → OK(n,h) | DISCONTINUIDAD(i, motivo). */
export function verificar(copia, desde) {
  let h, k, epoca;
  if (!desde) {
    let g; try { g = decGenesis(copia.gBytes); } catch { return { resultado: 'DISCONTINUIDAD', i: 0, motivo: 'GÉNESIS' }; }
    if (g.streamId !== copia.streamId) return { resultado: 'DISCONTINUIDAD', i: 0, motivo: 'GÉNESIS' };
    h = derivar(ETIQUETAS.GENESIS, hexABytes(copia.streamId), copia.gBytes); k = 0; epoca = 0;
  } else {
    h = desde.h; k = desde.k;
    epoca = 0;
    for (let j = 0; j < k && j < copia.bloques.length; j++) { try { if (decEntrada(copia.bloques[j]).clase === 'contrato') epoca++; } catch { /* prefijo confiado */ } }
  }
  const seg = verificarSegmento(h, k, epoca, copia.bloques.slice(k), copia.cabeza);
  if (!seg.ok) return { resultado: 'DISCONTINUIDAD', i: seg.i, motivo: seg.motivo };
  return { resultado: 'OK', n: copia.cabeza.n, h: seg.h };
}
/** Lee y verifica Γ completo desde la génesis; devuelve el valor puro (incluye Π_hashes). */
export function leerTrayectoria(almacen, streamId, registro) {
  const copia = leerCopia(almacen, streamId);
  if (!copia) return null;
  const v = verificar(copia);
  if (v.resultado !== 'OK') throw new Error(`leerTrayectoria: ${v.resultado}(${v.i}, ${v.motivo})`);
  const g = decGenesis(copia.gBytes);
  const entradas = copia.bloques.map(decEntrada);
  const hashes = [hashGenesis(g)];
  for (const b of copia.bloques) hashes.push(hashPaso(hashes.at(-1), b));
  const Γ = { streamId, g, gBytes: copia.gBytes, bloques: copia.bloques, entradas, hashes };
  if (registro) { const est = [estadoInicial(g, registro)]; for (const e of entradas) est.push(transformar(est.at(-1), e, registro)); Γ.estados = est; }
  return Γ;
}
function conocidasDe(almacen, registro, excepto) {
  const out = {};
  for (const s of almacen.streams()) if (s !== excepto) out[s] = leerTrayectoria(almacen, s, registro);
  return out;
}

/** Crear(g): StreamID nuevo en la materialidad ⇒ cabeza (0, h_0). */
export function crear(almacen, g, registro) {
  const r = trayectoriaNueva(g, registro);
  if (r.resultado !== 'CREADO') return { resultado: 'INADMISIBLE', motivo: r.motivo };
  const m = almacen.crear(g.streamId, r.Γ.gBytes, r.h);
  if (m.resultado !== 'OK') return { resultado: 'EXISTE' };
  return { resultado: 'CREADO', n: 0, h: r.h };
}
/** AppendIfHead(s, (n,h), mecanismo, sol) sobre la materialidad (§5.3 pasos 1–4). ctx = {registro}. */
export function appendIfHead(almacen, streamId, cabeza, mecanismo, sol, ctx) {
  const Γ = leerTrayectoria(almacen, streamId, ctx.registro);
  if (!Γ) return { resultado: 'INEXISTENTE' };
  const r = comprometer(Γ, cabeza, mecanismo, sol, { registro: ctx.registro, conocidas: conocidasDe(almacen, ctx.registro, streamId) });
  if (r.resultado !== 'COMPROMETIDO') return r;
  const m = almacen.anexarSiCabeza(streamId, cabeza, [r.Γ.bloques.at(-1)], { n: r.n, h: r.h });
  if (m.resultado !== 'OK') return { resultado: 'CABEZA_CAMBIADA', n: m.n, h: m.h };
  return { resultado: 'COMPROMETIDO', n: r.n, h: r.h, epoca: r.epoca };
}
/** Incorporar(s, (n,h), [b…], (m,h_m)) sobre la materialidad. ctx = {registro, readmitir?}. */
export function incorporar(almacen, streamId, cabeza, bloques, cabezaFinal, ctx) {
  const Γ = leerTrayectoria(almacen, streamId, ctx.registro);
  if (!Γ) return { resultado: 'INEXISTENTE' };
  const r = incorporarEn(Γ, cabeza, bloques, cabezaFinal, { registro: ctx.registro, readmitir: ctx.readmitir, conocidas: conocidasDe(almacen, ctx.registro, streamId) });
  if (r.resultado !== 'INCORPORADO' && r.resultado !== 'READMISIÓN_PENDIENTE') return r;
  const m = almacen.anexarSiCabeza(streamId, cabeza, bloques, cabezaFinal);
  if (m.resultado !== 'OK') return { resultado: 'CABEZA_CAMBIADA', n: m.n, h: m.h };
  const { Γ: _, ...sinΓ } = r;
  return sinΓ;
}
/** S_n de la trayectoria guardada (Fold desde la génesis). */
export function estado(almacen, streamId, ctx) {
  const Γ = leerTrayectoria(almacen, streamId, ctx.registro);
  return Γ ? Γ.estados.at(-1) : null;
}
/** API de réplica (L16): incorpora y lee; NO ofrece AppendIfHead ni anexarSiCabeza. */
export function apiReplica(almacen, ctx) {
  return Object.freeze({
    crear: g => crear(almacen, g, ctx.registro),
    incorporar: (streamId, cabeza, bloques, cabezaFinal) => incorporar(almacen, streamId, cabeza, bloques, cabezaFinal, ctx),
    verificar: (streamId, desde) => verificar(leerCopia(almacen, streamId), desde),
    estado: streamId => estado(almacen, streamId, ctx),
    cabeza: streamId => almacen.cabeza(streamId),
  });
}

// ═════════════════════════ 8. Resolver(c, c') — detección de FORK sin resolverlo (§5.4) ═════════════════════════
/** hashesA/B = [h_0…h_n] (null = posición sin evidencia). Recorrido lineal (definición). */
export function resolver(hA, hB) {
  const min = Math.min(hA.length, hB.length) - 1;
  for (let k = 0; k <= min; k++) if (hA[k] == null || hB[k] == null) return { resultado: 'SIN_EVIDENCIA' };
  if (hA[0] !== hB[0]) return { resultado: 'GÉNESIS_DISTINTA', c: -1 };
  let c = 0; while (c + 1 <= min && hA[c + 1] === hB[c + 1]) c++;
  const n = hA.length - 1, n2 = hB.length - 1;
  if (c === n && c === n2) return { resultado: 'EXACTO', c, h: hA[c] };
  if (c === min) return { resultado: 'CADENA', c, h: hA[c] };
  return { resultado: 'FORK', c, h: hA[c] };
}
/** Misma función con búsqueda binaria (válida bajo CR, Teorema 4.2). Solo del modelo: se compara con `resolver`. */
export function resolverBinario(hA, hB) {
  const min = Math.min(hA.length, hB.length) - 1;
  for (let k = 0; k <= min; k++) if (hA[k] == null || hB[k] == null) return { resultado: 'SIN_EVIDENCIA' };
  if (hA[0] !== hB[0]) return { resultado: 'GÉNESIS_DISTINTA', c: -1 };
  let lo = 0, hi = min; // invariante: hA[lo] = hB[lo]
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (hA[mid] === hB[mid]) lo = mid; else hi = mid - 1; }
  const c = lo, n = hA.length - 1, n2 = hB.length - 1;
  if (c === n && c === n2) return { resultado: 'EXACTO', c, h: hA[c] };
  if (c === min) return { resultado: 'CADENA', c, h: hA[c] };
  return { resultado: 'FORK', c, h: hA[c] };
}

// ═════════════════════════ 9. Snapshots y resolución de proyecciones (§7.2–§7.4) ═════════════════════════
const codS = (S, registro) => {
  const regla = registro[S.parametros['nucleo.regla']];
  return { D: regla.codD ? regla.codD(S.D) : S.D, epoca: S.epoca, n: S.n, parametros: S.parametros, sellado: S.sellado, sids: S.sids };
};
/** Snapshot = (S_n, n, h_n, ε_n, ver(codD), Q = 𝔇(T_N, CV(S_n))). */
export function crearSnapshot(S, h, registro) {
  return { S: structuredClone(S), n: S.n, h, epoca: S.epoca, ver: S.parametros['nucleo.regla'], Q: derivar(ETIQUETAS.SNAPSHOT, cv(codS(S, registro))) };
}
/** Solo se usa si h_n coincide con la Γ local verificada y Q coincide; si no, null. */
export function restaurarSnapshot(snap, hashesLocales, registro) {
  if (!snap || !Number.isSafeInteger(snap.n) || hashesLocales[snap.n] !== snap.h) return null;
  if (snap.S.n !== snap.n || snap.S.epoca !== snap.epoca) return null;
  let Q; try { Q = derivar(ETIQUETAS.SNAPSHOT, cv(codS(snap.S, registro))); } catch { return null; }
  return Q === snap.Q ? structuredClone(snap.S) : null;
}
const epocaEn = (Γ, k) => Γ.entradas.slice(0, k).filter(e => e.clase === 'contrato').length;
/** C_{ε} vigente antes de la entrada k+1: Fold solo de las acciones de contrato. */
export function parametrosEn(Γ, k, registro) {
  let p = estadoInicial(Γ.g, registro).parametros;
  for (const e of Γ.entradas.slice(0, k)) if (e.tipo === 'FijarParámetro') p = recomponerParametros(p, e.args, registro);
  return p;
}
/**
 * Resolución reutilizar / actualizar / reconstruir (§7.4). Pura.
 * args = {proy, guardado: null | {Y, checkpoint}, trayectoria (Γ local verificada: {streamId, g, entradas, hashes}),
 *         m, registro, snapshots?: [snap…], tRef?}
 * → {accion: 'REUTILIZAR'|'ACTUALIZAR'|'RECONSTRUIR'|'DISCONTINUIDAD', Y, checkpoint, desde}
 */
export function resolverProyeccion({ proy, guardado, trayectoria: Γ, m, registro, snapshots = [], tRef }) {
  const nLocal = Γ.entradas.length;
  if (!Number.isSafeInteger(m) || m < 0 || m > nLocal) throw new Error('corte fuera de la trayectoria local');
  const cp = k => ({ streamId: Γ.streamId, n: k, h: Γ.hashes[k], ver: proy.ver, epoca: epocaEn(Γ, k), ...(proy.sensibleATiempo ? { tRef } : {}) });
  const ctxPi = (S, k) => ({ registro, tRef, h: Γ.hashes[k], hashes: Γ.hashes.slice(0, k + 1), parametros: S.parametros });
  const reconstruir = accion => {
    let desde = 0, S = null;
    const validos = snapshots.filter(s => s && s.n <= m).sort((a, b) => b.n - a.n);
    for (const s of validos) { const R = restaurarSnapshot(s, Γ.hashes, registro); if (R) { S = R; desde = s.n; break; } }
    if (!S) S = estadoInicial(Γ.g, registro);
    S = fold(S, Γ.entradas.slice(desde, m), registro);
    return { accion, Y: proy.pi(S, ctxPi(S, m)), checkpoint: cp(m), desde };
  };
  if (!guardado) return reconstruir('RECONSTRUIR');
  const c = guardado.checkpoint;
  if (c.ver !== proy.ver || (proy.sensibleATiempo && c.tRef !== tRef)) return reconstruir('RECONSTRUIR');
  if (c.streamId !== Γ.streamId || c.n > nLocal || Γ.hashes[c.n] !== c.h || c.epoca !== epocaEn(Γ, c.n)) return reconstruir('DISCONTINUIDAD');
  if (c.n > m) return reconstruir('RECONSTRUIR');
  if (c.n === m) return { accion: 'REUTILIZAR', Y: structuredClone(guardado.Y), checkpoint: cp(m), desde: c.n };
  const sufijo = Γ.entradas.slice(c.n, m);
  if (typeof proy.g === 'function' && (!proy.sensibleAEpoca || !sufijo.some(e => e.clase === 'contrato'))) {
    let Y = structuredClone(guardado.Y), parametros = parametrosEn(Γ, c.n, registro);
    for (const e of sufijo) {
      Y = proy.g(Y, e, { registro, parametros, tRef });
      if (e.tipo === 'FijarParámetro') parametros = recomponerParametros(parametros, e.args, registro);
    }
    return { accion: 'ACTUALIZAR', Y, checkpoint: cp(m), desde: c.n };
  }
  return reconstruir('RECONSTRUIR');
}

// Proyecciones propias del núcleo (§7.7). pi(S, ctx) con ctx = {registro, tRef, h, hashes, parametros}; g(Y, e, ctx).
export const PROYECCIONES = Object.freeze({
  cabeza: Object.freeze({ id: 'nucleo.cabeza', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: (S, ctx) => ({ n: S.n, h: ctx.h }),
    g: (Y, e) => ({ n: Y.n + 1, h: hashPaso(Y.h, encEntrada(e)) }) }),
  hashes: Object.freeze({ id: 'nucleo.hashes', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: (S, ctx) => [...ctx.hashes],
    g: (Y, e) => [...Y, hashPaso(Y.at(-1), encEntrada(e))] }),
  epoca: Object.freeze({ id: 'nucleo.epoca', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: S => ({ epoca: S.epoca, parametros: structuredClone(S.parametros) }),
    g: (Y, e, ctx) => (e.clase !== 'contrato' ? Y : { epoca: Y.epoca + 1, parametros: e.tipo === 'FijarParámetro' ? recomponerParametros(Y.parametros, e.args, ctx.registro) : Y.parametros }) }),
  sids: Object.freeze({ id: 'nucleo.sids', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: S => ({ n: S.n, sids: { ...S.sids } }),
    g: (Y, e, ctx) => efectoComun(Y.n, Y.sids, ctx.parametros, e.sid) }),
});

// ═════════════════════════ 10. Cortes causalmente cerrados (§7.5) y Compose ═════════════════════════
// trayectorias = {StreamID ↦ {entradas:[{deps}…], hashes:[h_0…]}} ; σ = {StreamID ↦ n} (clave ausente ⇒ fuera de dom σ)
const depSatisfecha = (d, σ, tray) => Object.hasOwn(σ, d.stream) && σ[d.stream] >= d.k && tray[d.stream]?.hashes[d.k] === d.h;
export function esCerrado(σ, tray) {
  for (const X of Object.keys(σ)) {
    if (!tray[X] || σ[X] > tray[X].entradas.length) return false;
    for (let i = 1; i <= σ[X]; i++) for (const d of tray[X].entradas[i - 1].deps) if (!depSatisfecha(d, σ, tray)) return false;
  }
  return true;
}
/** Mayor corte cerrado σ* ≤ σ, o DIVERGENCIA_DEP(X, i, Y) si lo que X leyó de Y no es lo que este nodo tiene de Y. */
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
/** Π multi‑trayectoria: solo sobre cortes cerrados. tray[X] debe incluir g. φ(estados por StreamID). */
export function proyectarCorte(σ, tray, registro, φ) {
  if (!esCerrado(σ, tray)) return { resultado: 'NO_CERRADO' };
  const estados = {};
  for (const X of Object.keys(σ).sort()) estados[X] = fold(estadoInicial(tray[X].g, registro), tray[X].entradas.slice(0, σ[X]), registro);
  return { resultado: 'OK', valor: φ(estados) };
}
/** Compose como coproducto (L25): conserva procedencia; el mismo hecho desde dos StreamID ⇒ CONFLICTO. */
export function componer(aportes) {
  const hechos = {};
  for (const { streamId, hechos: hs } of aportes) for (const [clave, valor] of Object.entries(hs)) {
    if (Object.hasOwn(hechos, clave) && hechos[clave].streamId !== streamId) return { resultado: 'CONFLICTO', clave, streams: [hechos[clave].streamId, streamId] };
    hechos[clave] = { streamId, valor };
  }
  return { resultado: 'COMPUESTO', hechos };
}

// ═════════════════════════ 11. Diferencia Δ(objetivo, actualidad) (§7.8, L30) ═════════════════════════
/**
 * instancia = {id: o → texto, rec: (o, A) → bool, reconocidos?: A → Iterable<texto>}. O: lista de valores CV.
 * Conflictos(O) = ids con dos requisitos distintos (por CV). Δ = {o ∈ O dedup. por (id, contenido) : id ∉ Conflictos ∧ ¬rec(o,A)}.
 * Exceso = Reconocidos(A) ∖ id(O). Pura: no escribe nada.
 */
export function diferencia(O, A, instancia) {
  const contenidos = new Map();
  for (const o of O) { const ι = instancia.id(o); const c = bytesAHex(cv(o)); if (!contenidos.has(ι)) contenidos.set(ι, new Set()); contenidos.get(ι).add(c); }
  const conflictos = [...contenidos].filter(([, cs]) => cs.size > 1).map(([ι]) => ι);
  const enConflicto = new Set(conflictos);
  const vistos = new Set(); const delta = [];
  for (const o of O) {
    const ι = instancia.id(o);
    if (enConflicto.has(ι) || vistos.has(ι)) continue;
    vistos.add(ι);
    if (!instancia.rec(o, A)) delta.push(o);
  }
  const exceso = instancia.reconocidos ? [...instancia.reconocidos(A)].filter(ι => !contenidos.has(ι)) : [];
  return { delta, conflictos, exceso };
}

// ═════════════════════════ 12. Regla del nodo (§3.4–§3.5): solo parámetros ═════════════════════════
const enumerado = (...vs) => v => vs.includes(v);
export const REGLA_NODO = Object.freeze({
  id: 'nucleo.nodo@1', D0: null, tipos: Object.freeze({}),
  sigma: Object.freeze({
    'nodo.reintentos': { dominio: v => Number.isSafeInteger(v) && v >= 0, inicial: 3 },
    'nodo.verificarAlAbrir': { dominio: enumerado('completa', 'desdeCheckpoint'), inicial: 'completa' },
    'nodo.verificarAlIncorporar': { dominio: enumerado('cadena', 'cadena+readmisión'), inicial: 'cadena+readmisión' },
    'nodo.anteFork': { dominio: enumerado('suspender', 'seguirMarcada'), inicial: 'suspender' },
    'nodo.materialización': { dominio: enumerado('bajoDemanda', 'notificación', 'anticipada'), inicial: 'bajoDemanda' },
    'nodo.snapshots': { dominio: v => v === 'bajoDemanda' || (esMapa(v) && Object.keys(v).length === 1 && Number.isSafeInteger(v.cada) && v.cada >= 1), inicial: 'bajoDemanda' },
  }),
  guarda: () => 'INADMISIBLE', T: D => D,
});

// ═════════════════════════════════════════════════════════════════════════════════════════
// REGLAS Y PROYECCIONES DE JUGUETE — datos de contrato para las pruebas. NO son parte del núcleo.
// ═════════════════════════════════════════════════════════════════════════════════════════
const claveOk = c => typeof c === 'string' && c.length > 0;
const requiereOk = r => r === undefined || (esMapa(r) && Object.keys(r).length === 2 && esHex(r.stream, 16) && claveOk(r.clave));
const soloClaves = (a, obligatorias, opcionales = []) => esMapa(a) && obligatorias.every(k => Object.hasOwn(a, k))
  && Object.keys(a).every(k => obligatorias.includes(k) || opcionales.includes(k));

// contador@1: registro clave‑valor abstracto con orden de creación (T emergente, L28) y valor por defecto (L29).
//   D = {orden: [clave…] (orden de primera aparición), v: {clave ↦ entero explícito}}
//   sumar{clave,q} · fijar{clave,v}; ambas con `requiere: {stream, clave}` opcional (lectura estable de otro ámbito).
//   Σ: límite ∈ {ninguno, ≥0} (inicial ≥0), defecto ∈ ℤ ∪ {desconocido} (inicial 0).
const baseDe = (D, clave, P) => (Object.hasOwn(D.v, clave) ? D.v[clave] : Number.isSafeInteger(P.defecto) ? P.defecto : null);
function guardaContador(D, e, P, lect) {
  const a = e.args;
  if (a.requiere !== undefined && !lect.estable(a.requiere.stream, 'existe', a.requiere.clave)) return 'requisito';
  const base = baseDe(D, a.clave, P);
  let nuevo;
  if (e.tipo === 'fijar') nuevo = a.v;
  else if (base === null) return 'baseDesconocida';
  else if (e.tipo === 'sumar') nuevo = base + a.q;
  else if (e.tipo === 'duplicar') nuevo = base * P.factor;
  if (!Number.isSafeInteger(nuevo)) return 'desborde';
  if (P['límite'] === '≥0' && nuevo < 0) return 'límite';
  return 'ok';
}
function Tcontador(D, e, P) {
  const a = e.args;
  const base = baseDe(D, a.clave, P);
  const nuevo = e.tipo === 'fijar' ? a.v : e.tipo === 'sumar' ? base + a.q : base * P.factor;
  const orden = D.orden.includes(a.clave) ? D.orden : [...D.orden, a.clave];
  const out = { ...D, orden, v: { ...D.v, [a.clave]: nuevo } };
  if (Object.hasOwn(D, 'ops')) out.ops = D.ops + 1;
  return out;
}
const sigmaContador = {
  'límite': { dominio: enumerado('ninguno', '≥0'), inicial: '≥0' },
  defecto: { dominio: v => Number.isSafeInteger(v) || v === 'desconocido', inicial: 0 },
};
const establesContador = {
  existe: (D, clave) => D.orden.includes(clave),                 // estable: nada borra una clave
  posicion: (D, i, clave) => D.orden[i - 1] === clave,           // estable: el orden solo se extiende (L28)
};
const tiposContador1 = {
  sumar: a => soloClaves(a, ['clave', 'q'], ['requiere']) && claveOk(a.clave) && Number.isSafeInteger(a.q) && requiereOk(a.requiere),
  fijar: a => soloClaves(a, ['clave', 'v'], ['requiere']) && claveOk(a.clave) && Number.isSafeInteger(a.v) && requiereOk(a.requiere),
};
export const CONTADOR_1 = Object.freeze({
  id: 'contador@1', D0: { orden: [], v: {} }, tipos: tiposContador1, guarda: guardaContador, T: Tcontador,
  sigma: sigmaContador, estables: establesContador,
});
// contador@2: añade duplicar{clave} y el parámetro factor (inicial 2); D lleva además `ops`. Migra desde contador@1.
//   guardaPar: no se puede exigir límite ≥0 mientras haya valores negativos.
export const CONTADOR_2 = Object.freeze({
  id: 'contador@2', D0: { orden: [], v: {}, ops: 0 },
  tipos: { ...tiposContador1, duplicar: a => soloClaves(a, ['clave']) && claveOk(a.clave) },
  guarda: guardaContador, T: Tcontador,
  sigma: { ...sigmaContador, factor: { dominio: v => Number.isSafeInteger(v) && v >= 1 && v <= 4, inicial: 2 } },
  estables: establesContador,
  guardaPar: (m, D, P) => (m['límite'] === '≥0' && Object.values(D.v).some(x => x < 0) ? 'negativos' : 'ok'),
  migraDesde: { 'contador@1': D => ({ orden: [...D.orden], v: { ...D.v }, ops: 0 }) },
});
// conjunto@1: segunda regla, sin relación con la anterior (genericidad del núcleo, Teorema 7.11).
export const CONJUNTO_1 = Object.freeze({
  id: 'conjunto@1', D0: { miembros: {} },
  tipos: { añadir: a => soloClaves(a, ['x']) && claveOk(a.x), quitar: a => soloClaves(a, ['x']) && claveOk(a.x) },
  guarda: (D, e, P) => {
    const esta = Object.hasOwn(D.miembros, e.args.x);
    if (e.tipo === 'añadir') return esta ? 'yaEsta' : (P['máximo'] !== 'ilimitado' && Object.keys(D.miembros).length >= P['máximo'] ? 'lleno' : 'ok');
    return esta ? 'ok' : 'noEsta';
  },
  T: (D, e) => { const m = { ...D.miembros }; if (e.tipo === 'añadir') m[e.args.x] = true; else delete m[e.args.x]; return { miembros: m }; },
  sigma: { 'máximo': { dominio: v => v === 'ilimitado' || (Number.isSafeInteger(v) && v >= 0), inicial: 'ilimitado' } },
  estables: {},
});
export const REGISTRO_JUGUETE = Object.freeze({
  'contador@1': CONTADOR_1, 'contador@2': CONTADOR_2, 'conjunto@1': CONJUNTO_1, 'nucleo.nodo@1': REGLA_NODO,
});

// Proyecciones de juguete. UNIVERSO fijo de posiciones para el «Flat» de §7.1.
export const UNIVERSO = Object.freeze(['a', 'b', 'c']);
const esContador = P => String(P['nucleo.regla']).startsWith('contador@');
const valorFlat = (D, k, P) => (Object.hasOwn(D.v, k) ? D.v[k] : P.defecto);
const gValor = (Y, e, ctx, set) => {
  if (e.clase !== 'dominio' || !esContador(ctx.parametros)) return Y;
  const i = UNIVERSO.indexOf(e.args.clave); if (i < 0) return Y;
  const actual = Y.valores ? Y.valores[i] : Y[i];
  const nuevo = e.tipo === 'fijar' ? e.args.v : e.tipo === 'sumar' ? actual + e.args.q : actual * ctx.parametros.factor;
  return set(Y, i, nuevo);
};
export const JUGUETE_PROY = Object.freeze({
  // §7.1: π = [D(i) si explícito, si no defecto]. NO congruente para FijarParámetro(defecto) ⇒ sensibleAEpoca.
  valores: Object.freeze({ id: 'juguete.valores', ver: 1, sensibleAEpoca: true, sensibleATiempo: false,
    pi: S => (esContador(S.parametros) ? UNIVERSO.map(k => valorFlat(S.D, k, S.parametros)) : []),
    g: (Y, e, ctx) => gValor(Y, e, ctx, (Y, i, x) => Y.map((y, j) => (j === i ? x : y))) }),
  // Refinamiento de Nerode con máscara de explícitos: congruente también para FijarParámetro(defecto).
  valoresMascara: Object.freeze({ id: 'juguete.valoresMascara', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: S => (esContador(S.parametros) ? { valores: UNIVERSO.map(k => valorFlat(S.D, k, S.parametros)), explicitos: UNIVERSO.map(k => Object.hasOwn(S.D.v, k)) } : { valores: [], explicitos: [] }),
    g: (Y, e, ctx) => {
      if (e.tipo === 'FijarParámetro') {
        const P2 = recomponerParametros(ctx.parametros, e.args, ctx.registro);
        if (!esContador(P2)) return { valores: [], explicitos: [] };
        if (!esContador(ctx.parametros)) return Y;
        return { valores: Y.valores.map((v, i) => (Y.explicitos[i] ? v : P2.defecto)), explicitos: Y.explicitos };
      }
      return gValor(Y, e, ctx, (Y, i, x) => ({ valores: Y.valores.map((y, j) => (j === i ? x : y)), explicitos: Y.explicitos.map((b, j) => b || j === i) }));
    } }),
  // Π_coord = T (L28): orden de creación. Congruente.
  coord: Object.freeze({ id: 'juguete.coord', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: S => (S.D && Array.isArray(S.D.orden) ? [...S.D.orden] : []),
    g: (Y, e, ctx) => (e.clase === 'dominio' && esContador(ctx.parametros) && !Y.includes(e.args.clave) ? [...Y, e.args.clave] : Y) }),
  // Σ de valores explícitos: NO congruente para fijar (L10) ⇒ sin g: siempre se reconstruye.
  total: Object.freeze({ id: 'juguete.total', ver: 1, sensibleAEpoca: false, sensibleATiempo: false,
    pi: S => (S.D && S.D.v ? Object.values(S.D.v).reduce((a, b) => a + b, 0) : 0) }),
  // Sensible al tiempo (L15): claves cuyo valor es ≥ t_ref.
  umbral: Object.freeze({ id: 'juguete.umbral', ver: 1, sensibleAEpoca: false, sensibleATiempo: true,
    pi: (S, ctx) => (S.D && S.D.v ? Object.keys(S.D.v).filter(k => S.D.v[k] >= ctx.tRef).sort() : []) }),
});
