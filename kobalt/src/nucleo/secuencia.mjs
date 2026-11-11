// Kobalt · núcleo · secuencia — Trayectoria Γ como VALOR: decisión de AppendIfHead, Incorporar, Verificar y
// Resolver (spec §4.1, §5.3, §5.4). Núcleo puro: sin I/O; la materialidad la orquesta `constituyente.mjs`.
//
// Correspondencia:
//   Γ_n = (g, e_1…e_n) con h_0…h_n            ↔ Trayectoria {streamId, g, gBytes, bloques, entradas, hashes}
//   cabeza (n, h_n)                          ↔ cabezaDe(Γ)
//   Crear(g): S_0, CV(g), h_0                ↔ nacer(g, registro)
//   AppendIfHead (pasos a–c, sin materia)    ↔ decidirAnexo(Γ, (n,h), mecanismo, sol, ctx)
//   recomputar la cadena de un segmento      ↔ verificarSegmento
//   Verificar(copia, desde)                  ↔ verificar
//   copia material → Γ verificada            ↔ trayectoriaDeCopia
//   Incorporar (decisión, atómica)           ↔ decidirIncorporacion(Γ, (n,h), [b…], (m,h_m), ctx)
//   Resolver(c, c') sin resolver el FORK     ↔ resolver(hashesA, hashesB)
//
// Leyes: L3 (solo se extiende Γ: toda decisión produce bloques a anexar, nunca a editar), L8 (la decisión se toma sobre
// S_n de la cabeza observada; la exclusión la da el compare‑and‑append M1), L16 (NO_CONSTITUYENTE; la réplica re‑admite
// con C_{ε_{i−1}}, la época REGISTRADA), L22 (DISCONTINUIDAD: no se aplica nada a ciegas; FORK detectado, no resuelto),
// L26 (GÉNESIS_DISTINTA: misma StreamID, dos génesis; la StreamID no se deriva del contenido).

import { esHex } from './bytes.mjs';
import { encGenesis, decGenesis, hashGenesisBytes, encEntrada, decEntrada, hashPaso } from './derivacion.mjs';
import { claseDe, estadoInicial, estadoEnTrayectoria, admitir, transformar } from './contrato.mjs';

export const cabezaDe = Γ => ({ n: Γ.entradas.length, h: Γ.hashes[Γ.hashes.length - 1] });

/** Crear(g) en el plano puro: valida la génesis y calcula CV(g), h_0 y S_0. */
export function nacer(g, registro) {
  if (!g || !esHex(g.streamId, 16)) return { resultado: 'INADMISIBLE', motivo: 'streamId' };
  let gBytes, S0;
  try {
    S0 = estadoInicial(g, registro);
    gBytes = encGenesis(g);
    decGenesis(gBytes); // lo que se crea debe poder leerse (Verificar empieza decodificando la génesis)
  } catch (err) { return { resultado: 'INADMISIBLE', motivo: err.message }; }
  return { resultado: 'CREADO', gBytes, h0: hashGenesisBytes(g.streamId, gBytes), S0 };
}

const rechazoDe = adm => {
  const r = { resultado: adm.rechazo };
  if (adm.motivo !== undefined) r.motivo = adm.motivo;
  if (adm.i !== undefined) r.i = adm.i;
  return r;
};

/**
 * AppendIfHead, pasos (a)–(c) de §5.3 sobre el valor Γ (verificado). sol = {u, sid, tipo, args, deps?, epocaEsperada?}.
 * (a) (n,h) debe ser una posición de Γ, si no CABEZA_CAMBIADA(n',h'); (b) NO_CONSTITUYENTE si el mecanismo no actúa por
 * C_ε.constituyente de S_n; (c) Accept sobre S_n; y, si la cabeza observada ya no es la cabeza, CABEZA_CAMBIADA.
 * Si se admite devuelve {resultado:'ACEPTADA', n, h, epoca, bloque}: lo que la materialidad debe anexar con M1 (paso d).
 */
export function decidirAnexo(Γ, cabeza, mecanismo, sol, ctx) {
  const actual = cabezaDe(Γ);
  if (!cabeza || !Number.isSafeInteger(cabeza.n) || cabeza.n < 0 || cabeza.n > actual.n || Γ.hashes[cabeza.n] !== cabeza.h) {
    return { resultado: 'CABEZA_CAMBIADA', ...actual };
  }
  const S = estadoEnTrayectoria(Γ, cabeza.n, ctx.registro);
  if (S.parametros['nucleo.constituyente'] !== mecanismo) return { resultado: 'NO_CONSTITUYENTE' };
  const e = { epoca: S.epoca, u: sol.u, sid: sol.sid, deps: sol.deps ?? [], clase: claseDe(sol.tipo), tipo: sol.tipo, args: sol.args ?? null };
  const adm = admitir(S, e, { registro: ctx.registro, conocidas: ctx.conocidas, epocaEsperada: sol.epocaEsperada });
  if (!adm.ok) return rechazoDe(adm);
  if (cabeza.n !== actual.n) return { resultado: 'CABEZA_CAMBIADA', ...actual };
  const bloque = encEntrada(e);
  return { resultado: 'ACEPTADA', n: cabeza.n + 1, h: hashPaso(cabeza.h, bloque), epoca: e.epoca, bloque };
}

/**
 * Recorre un segmento [b_{k+1}…b_m] desde (k, h_k, ε_k) y lo contrasta con la cabeza final (m, h_m).
 * Si la cadena no cuadra, la posición de la manipulación no es identificable: i = k+1 (Anexo 2). Si cuadra, i es exacta
 * para fallos de FORMA o ÉPOCA (V4: e_i.ε = ε(Γ_{i−1})).
 * → {ok:true, h, hashes:[h_{k+1}…h_m], entradas} | {ok:false, i, motivo ∈ TRUNCADA|SOBRANTES|CADENA|FORMA|ÉPOCA}
 */
export function verificarSegmento(hInicial, kInicial, epocaInicial, bloques, cabezaFinal) {
  if (kInicial + bloques.length !== cabezaFinal.n) {
    return { ok: false, i: kInicial + 1, motivo: kInicial + bloques.length < cabezaFinal.n ? 'TRUNCADA' : 'SOBRANTES' };
  }
  let h = hInicial;
  const hashes = [];
  for (const b of bloques) { h = hashPaso(h, b); hashes.push(h); }
  if (h !== cabezaFinal.h) return { ok: false, i: kInicial + 1, motivo: 'CADENA' };
  let epoca = epocaInicial;
  const entradas = [];
  for (let j = 0; j < bloques.length; j++) {
    let e;
    try { e = decEntrada(bloques[j]); } catch { return { ok: false, i: kInicial + j + 1, motivo: 'FORMA' }; }
    if (e.epoca !== epoca) return { ok: false, i: kInicial + j + 1, motivo: 'ÉPOCA' };
    if (e.clase !== claseDe(e.tipo)) return { ok: false, i: kInicial + j + 1, motivo: 'FORMA' };
    if (e.clase === 'contrato') epoca += 1;
    entradas.push(e);
  }
  return { ok: true, h, hashes, entradas };
}

/** Época emergente del prefijo b_1…b_k (V4); un prefijo ilegible se trata como confiado (verificación desde checkpoint). */
function epocaDePrefijo(bloques, k) {
  let epoca = 0;
  for (let j = 0; j < k && j < bloques.length; j++) {
    try { if (decEntrada(bloques[j]).clase === 'contrato') epoca += 1; } catch { /* prefijo confiado */ }
  }
  return epoca;
}

/**
 * Verificar(copia, desde = génesis | {k, h}) → {resultado:'OK', n, h} | {resultado:'DISCONTINUIDAD', i, motivo}.
 * copia = {streamId, gBytes, bloques, cabeza:{n,h}} (lo que guarda la materialidad).
 */
export function verificar(copia, desde) {
  if (!copia) return { resultado: 'INEXISTENTE' };
  let h, k, epoca;
  if (!desde) {
    let g;
    try { g = decGenesis(copia.gBytes); } catch { return { resultado: 'DISCONTINUIDAD', i: 0, motivo: 'GÉNESIS' }; }
    if (g.streamId !== copia.streamId) return { resultado: 'DISCONTINUIDAD', i: 0, motivo: 'GÉNESIS' };
    h = hashGenesisBytes(copia.streamId, copia.gBytes); k = 0; epoca = 0;
  } else {
    h = desde.h; k = desde.k; epoca = epocaDePrefijo(copia.bloques, k);
  }
  const seg = verificarSegmento(h, k, epoca, copia.bloques.slice(k), copia.cabeza);
  if (!seg.ok) return { resultado: 'DISCONTINUIDAD', i: seg.i, motivo: seg.motivo };
  return { resultado: 'OK', n: copia.cabeza.n, h: seg.h };
}

/** Γ verificada desde la génesis a partir de una copia material. Lanza si la copia no es continua (L22). */
export function trayectoriaDeCopia(copia) {
  let g;
  try { g = decGenesis(copia.gBytes); } catch { throw new Error('trayectoria: DISCONTINUIDAD(0, GÉNESIS)'); }
  if (g.streamId !== copia.streamId) throw new Error('trayectoria: DISCONTINUIDAD(0, GÉNESIS)');
  const h0 = hashGenesisBytes(copia.streamId, copia.gBytes);
  const seg = verificarSegmento(h0, 0, 0, copia.bloques, copia.cabeza);
  if (!seg.ok) throw new Error(`trayectoria: DISCONTINUIDAD(${seg.i}, ${seg.motivo})`);
  return { streamId: copia.streamId, g, gBytes: copia.gBytes, bloques: copia.bloques, entradas: seg.entradas, hashes: [h0, ...seg.hashes] };
}

/**
 * Incorporar (§5.3), decisión pura y ATÓMICA: o se acepta el segmento completo o no se aplica nada.
 * ctx = {registro, conocidas?, readmitir? = true}. La re‑admisión evalúa cada e_i sobre S_{i−1}, es decir, con el
 * contrato de la época REGISTRADA C_{ε_{i−1}}, nunca con el actual (L7, L16).
 * → {resultado:'INCORPORADO', n, h} | {resultado:'READMISIÓN_PENDIENTE', i, dep, n, h} (la cadena SÍ se incorpora)
 *   | {resultado:'CABEZA_CAMBIADA', n, h} | {resultado:'DISCONTINUIDAD', i, motivo[, rechazo]}
 */
export function decidirIncorporacion(Γ, cabeza, bloques, cabezaFinal, ctx) {
  const actual = cabezaDe(Γ);
  if (!cabeza || cabeza.n !== actual.n || cabeza.h !== actual.h) return { resultado: 'CABEZA_CAMBIADA', ...actual };
  let S = estadoEnTrayectoria(Γ, actual.n, ctx.registro);
  const seg = verificarSegmento(actual.h, actual.n, S.epoca, bloques, cabezaFinal);
  if (!seg.ok) return { resultado: 'DISCONTINUIDAD', i: seg.i, motivo: seg.motivo };
  const readmitir = ctx.readmitir ?? true;
  let pendiente = null;
  for (let j = 0; j < seg.entradas.length; j++) {
    const e = seg.entradas[j], i = actual.n + j + 1;
    if (readmitir) {
      const adm = admitir(S, e, { registro: ctx.registro, conocidas: ctx.conocidas });
      if (!adm.ok) {
        if (adm.rechazo === 'DEPENDENCIA_NO_VERIFICABLE' && !adm.divergencia) { if (!pendiente) pendiente = { i, dep: adm.dep }; }
        else return { resultado: 'DISCONTINUIDAD', i, motivo: 'READMISIÓN', rechazo: adm.rechazo };
      }
    }
    try { S = transformar(S, e, ctx.registro); } catch { return { resultado: 'DISCONTINUIDAD', i, motivo: 'FORMA' }; }
  }
  if (pendiente) return { resultado: 'READMISIÓN_PENDIENTE', i: pendiente.i, dep: pendiente.dep, n: cabezaFinal.n, h: cabezaFinal.h };
  return { resultado: 'INCORPORADO', n: cabezaFinal.n, h: cabezaFinal.h };
}

/** StreamID citados en las deps de un segmento (los que la re‑admisión puede necesitar conocer). */
export function streamsCitados(bloques) {
  const out = new Set();
  for (const b of bloques) { try { for (const d of decEntrada(b).deps) out.add(d.stream); } catch { /* la forma la juzga la verificación */ } }
  return out;
}

/**
 * Resolver(c, c') sobre hashes por posición [h_0…h_n] (null = sin evidencia). Detecta y NUNCA resuelve (prohibido 7).
 * c = max{k : h_k = h'_k}. Búsqueda binaria (§5.4): bajo resistencia a colisiones, h_k = h'_k ⇒ ∀j ≤ k: h_j = h'_j
 * (Teorema 4.2), así que el predicado es monótono y c se halla en O(log min(n, n')).
 */
export function resolver(hA, hB) {
  const min = Math.min(hA.length, hB.length) - 1;
  for (let k = 0; k <= min; k++) if (hA[k] == null || hB[k] == null) return { resultado: 'SIN_EVIDENCIA' };
  if (hA[0] !== hB[0]) return { resultado: 'GÉNESIS_DISTINTA', c: -1 };
  let lo = 0, hi = min; // se conserva: hA[lo] = hB[lo]
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (hA[mid] === hB[mid]) lo = mid; else hi = mid - 1; }
  const c = lo, n = hA.length - 1, n2 = hB.length - 1;
  if (c === n && c === n2) return { resultado: 'EXACTO', c, h: hA[c] };
  if (c === min) return { resultado: 'CADENA', c, h: hA[c] };
  return { resultado: 'FORK', c, h: hA[c] };
}

