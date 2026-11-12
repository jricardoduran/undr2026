// Kobalt · núcleo · contrato — Contrato C_ε, estado S, admisión y T (spec §3, §4.1, §5.1–§5.2). Núcleo puro.
//
// Correspondencia:
//   C_ε = (capacidades, regla, constituyente, parámetros)   ↔ S.parametros (mapa p ↦ valor CV, total sobre dom Σ_r)
//   Σ_nucleo (parámetros reservados `nucleo.*`)              ↔ sigmaNucleo
//   Σ_r completa = Σ_nucleo ⊕ Σ_r                            ↔ sigmaCompleta
//   coincide(π, tipo)                                        ↔ coincide
//   Authorized_{C_ε}(u, e) con tiposInternos (E4)            ↔ autorizado(parametros, u, e, regla)
//   validador de tipo, exacto o patrón 'prefijo*' (E3)       ↔ validadorDe(tipos, tipo)
//   parámetros' = inic(Σ_{r'}) ⊕ vigentes|_{dom Σ_{r'}} ⊕ m   ↔ recomponerParametros
//   S = (n, ε, C_ε, sellado, Sids, D)                        ↔ {n, epoca, parametros, sellado, sids, D}
//   S_0                                                      ↔ estadoInicial(g, registro)
//   Accept = G0 ∧ G5 ∧ G1 ∧ G2 ∧ G3 ∧ G4 ∧ guarda §5.2       ↔ admitir(S, e, ctx)
//   Lect (predicados estables en los checkpoints de e.deps)  ↔ lectura(e, ctx)
//   efecto común (n := n+1, Sids[sid] := n, retención)       ↔ efectoComun
//   T(S, e) con la regla y los parámetros de C_{ε}           ↔ transformar(S, e, registro)
//   Fold(S, Γ)                                               ↔ fold(S, entradas, registro)
//   S_k = Fold(S_0, Γ_k) de una trayectoria conocida (E5)    ↔ estadoEnTrayectoria(Γ, k, registro)
//   P_sid(s₀, k) :⟺ ∃ i ≤ k : e_i.sid = s₀ (E2)              ↔ lect.estable(Y, 'nucleo.sid', s₀)
//
// Leyes: L4 (Fold es acción del monoide; T pura), L6 (V1–V8 por inducción con las guardas), L7 (las guardas NO son
// condiciones V_C: el tipo de S no codifica ninguna), L16 (Authorized por capacidades declaradas antes, también para
// cada acción interna de una compuesta, E4; ε registrada), L3 (E2: nucleo.sid estable porque Γ solo se extiende),
// L20 (T_r nunca recibe Lect: exactamente 3 argumentos), L31 (configuración = FijarParámetro, abre época ε+1;
// todo parámetro tiene dominio y valor inicial en Σ; ningún valor abierto se fija aquí salvo como `inicial`).
//
// El núcleo NO interpreta `tipo` ni `args` de las acciones de dominio: solo los pasa a la regla (Teorema 7.11).

import { esHex } from './bytes.mjs';
import { esMapa, igualCV } from './cv.mjs';
import { encEntrada } from './derivacion.mjs';

// ─────────── Clase de acción y capacidades ───────────
export const TIPOS_CONTRATO = Object.freeze(['FijarParámetro', 'Sellar']);
/** clase(tipo): 'contrato' para FijarParámetro y Sellar; 'dominio' para el resto. */
export const claseDe = tipo => (TIPOS_CONTRATO.includes(tipo) ? 'contrato' : 'dominio');

/** coincide(π, tipo): igualdad exacta, o π termina en `*` y es prefijo de tipo. */
export const coincide = (patron, tipo) => patron === tipo || (patron.endsWith('*') && tipo.startsWith(patron.slice(0, -1)));

/**
 * Tipos de capacidad que exige e (E4): {tipo(e)} ∪ tiposInternos(e).
 *   FijarParámetro(m) ⇒ {FijarParámetro:p : p ∈ dom m} (el mismo principio: m compone un cambio por parámetro).
 *   Acción de dominio de una regla con `tiposInternos` ⇒ [tipo, ...tiposInternos(e)] (solo tras G5, que fija la forma).
 *   Si `tiposInternos` no devuelve una lista de textos ⇒ null: la autorización falla cerrada.
 */
function capacidadesExigidas(e, regla) {
  if (e.tipo === 'FijarParámetro') return Object.keys(e.args).map(p => `FijarParámetro:${p}`);
  if (e.clase !== 'dominio' || typeof regla?.tiposInternos !== 'function') return [e.tipo];
  const internos = regla.tiposInternos(e);
  if (!Array.isArray(internos) || !internos.every(t => typeof t === 'string')) return null;
  return [e.tipo, ...internos];
}

/** Authorized_{C_ε}(u, e) ⟺ ∀τ ∈ {tipo(e)} ∪ tiposInternos(e): ∃π ∈ capacidades(u): coincide(π, τ).
 *  `u` es una afirmación del solicitante, no una prueba de autoría (L23). */
export function autorizado(parametros, u, e, regla) {
  const caps = parametros['nucleo.capacidades'] ?? {};
  if (!Object.hasOwn(caps, u) || !Array.isArray(caps[u])) return false;
  const pats = caps[u];
  const exigidos = capacidadesExigidas(e, regla);
  return exigidos !== null && exigidos.every(t => pats.some(p => coincide(p, t)));
}

/** E3: validador del tipo de dominio en `tipos` de la regla. Una clave exacta gana; si no, la clave patrón 'prefijo*'
 *  de prefijo más largo. Los tipos reservados del núcleo (FijarParámetro, Sellar) nunca se resuelven aquí. → v | null */
export function validadorDe(tipos, tipo) {
  if (!tipos || typeof tipo !== 'string' || claseDe(tipo) === 'contrato') return null;
  if (Object.hasOwn(tipos, tipo)) return tipos[tipo];
  let mejor = null;
  for (const k of Object.keys(tipos)) {
    if (k.endsWith('*') && tipo.startsWith(k.slice(0, -1)) && (mejor === null || k.length > mejor.length)) mejor = k;
  }
  return mejor === null ? null : tipos[mejor];
}

const CAPACIDAD_CONFIGURADORA = 'FijarParámetro:nucleo.capacidades';
/** V6: algún principal conserva la capacidad de reconfigurar capacidades. */
const configuradorVivo = parametros => Object.values(parametros['nucleo.capacidades']).some(ps => ps.some(p => coincide(p, CAPACIDAD_CONFIGURADORA)));

// ─────────── Σ: dominios y valores iniciales (L31) ───────────
const esListaTextos = v => Array.isArray(v) && v.every(x => typeof x === 'string');

/** Σ del núcleo: presente en toda regla. Los valores iniciales de `regla` y `constituyente` vienen de la génesis. */
function sigmaNucleo(registro, constituyente, regla) {
  return {
    'nucleo.capacidades': { dominio: v => esMapa(v) && Object.values(v).every(esListaTextos), inicial: { [constituyente]: ['*'] } },
    'nucleo.regla': { dominio: v => typeof v === 'string' && Object.hasOwn(registro, v), inicial: regla },
    'nucleo.constituyente': { dominio: v => typeof v === 'string' && v.length > 0, inicial: constituyente },
    'nucleo.derivación': { dominio: v => v === 'kobalt:nucleo:1', inicial: 'kobalt:nucleo:1' },
    'nucleo.retenciónSids': {
      dominio: v => v === 'ilimitada' || (esMapa(v) && Object.keys(v).length === 1 && Number.isSafeInteger(v.ventana) && v.ventana >= 1),
      inicial: 'ilimitada',
    },
  };
}

/** Σ_{r} completa (núcleo ⊕ regla). Una regla no puede redeclarar parámetros `nucleo.*`. */
function sigmaCompleta(registro, idRegla, base) {
  const propia = registro[idRegla].sigma ?? {};
  for (const p of Object.keys(propia)) if (p.startsWith('nucleo.')) throw new Error(`la regla ${idRegla} no puede declarar ${p}`);
  return { ...sigmaNucleo(registro, base['nucleo.constituyente'], base['nucleo.regla']), ...propia };
}

/** parámetros' = (iniciales de Σ_{r'}) ⊕ (vigentes restringidos a dom Σ_{r'}) ⊕ m, con r' = m[nucleo.regla] o r. */
export function recomponerParametros(parametros, m, registro) {
  const r2 = Object.hasOwn(m, 'nucleo.regla') ? m['nucleo.regla'] : parametros['nucleo.regla'];
  const sigma = sigmaCompleta(registro, r2, parametros);
  const out = {};
  for (const p of Object.keys(sigma)) {
    out[p] = structuredClone(Object.hasOwn(m, p) ? m[p] : Object.hasOwn(parametros, p) ? parametros[p] : sigma[p].inicial);
  }
  return out;
}

// ─────────── Estado inicial ───────────
/** S_0 = (0, 0, C_0 completado con los iniciales de Σ_{r_0}, false, ∅, D_0). Lanza si la génesis no es válida. */
export function estadoInicial(g, registro) {
  const C0 = g?.C0;
  if (!esMapa(C0)) throw new Error('génesis: C0 no es mapa');
  const r0 = C0['nucleo.regla'], u0 = C0['nucleo.constituyente'];
  if (typeof r0 !== 'string' || !Object.hasOwn(registro, r0)) throw new Error('génesis: regla no registrada');
  if (typeof u0 !== 'string' || u0.length === 0) throw new Error('génesis: falta constituyente');
  const sigma = sigmaCompleta(registro, r0, C0);
  for (const p of Object.keys(C0)) if (!Object.hasOwn(sigma, p) || !sigma[p].dominio(C0[p])) throw new Error(`génesis: parámetro inválido ${p}`);
  const parametros = {};
  for (const p of Object.keys(sigma)) parametros[p] = structuredClone(Object.hasOwn(C0, p) ? C0[p] : sigma[p].inicial);
  if (!configuradorVivo(parametros)) throw new Error('génesis: autobloqueo (V6)');
  return { n: 0, epoca: 0, parametros, sellado: false, sids: {}, D: structuredClone(registro[r0].D0) };
}

// ─────────── Admisión ───────────
const esDep = d => d !== null && typeof d === 'object' && esHex(d.stream, 16) && Number.isSafeInteger(d.k) && d.k >= 0 && esHex(d.h, 32);

/** G5 · forma: e codificable, clase coherente, deps válidas, ordenadas y únicas por StreamID; tipo y args de la regla vigente. */
function formaValida(S, e, registro) {
  if (!e || typeof e !== 'object') return false;
  if (!Number.isSafeInteger(e.epoca) || e.epoca < 0 || typeof e.u !== 'string' || !esHex(e.sid)) return false;
  if (!Array.isArray(e.deps) || !e.deps.every(esDep)) return false;
  for (let i = 1; i < e.deps.length; i++) if (!(e.deps[i - 1].stream < e.deps[i].stream)) return false;
  if (typeof e.tipo !== 'string' || e.clase !== claseDe(e.tipo)) return false;
  try { encEntrada(e); } catch { return false; }
  if (e.tipo === 'FijarParámetro') return esMapa(e.args) && Object.keys(e.args).length > 0;
  if (e.tipo === 'Sellar') return true;
  const v = validadorDe(registro[S.parametros['nucleo.regla']].tipos, e.tipo);
  return typeof v === 'function' && v(e.args, e.tipo) === true; // E3: el validador recibe (args, tipo)
}

/** S_k = Fold(S_0, Γ_k) de una trayectoria {g, entradas}. E5: `Γ.estados`, si viene, es una proyección sin checkpoint
 *  y NO se lee (con snapshots validados, ver `estadoPorSnapshot` en snapshot.mjs). */
export function estadoEnTrayectoria(Γ, k, registro) {
  return fold(estadoInicial(Γ.g, registro), Γ.entradas.slice(0, k), registro);
}

/** Lect: SOLO predicados estables (del núcleo, Teorema 7.7, o declarados por la regla de Y), evaluados en el checkpoint
 *  (Y, k, h) que la entrada cita en e.deps. Nunca lee la cabeza actual de Y (Teorema 7.6).
 *  E2: 'nucleo.sid'(s₀) se evalúa sobre la TRAYECTORIA (∃ i ≤ k : e_i.sid = s₀), estable por L3 sin hipótesis de
 *  retención; «s₀ ∈ Sids_Y» no lo es (Teorema E2.1). */
function lectura(e, ctx) {
  const memo = new Map();
  const estadoDe = (stream, k) => {
    const clave = `${stream}:${k}`;
    if (!memo.has(clave)) {
      memo.set(clave, estadoEnTrayectoria(ctx.conocidas[stream], k, ctx.registro));
    }
    return memo.get(clave);
  };
  return Object.freeze({
    estable(stream, nombre, ...args) {
      const d = e.deps.find(x => x.stream === stream);
      if (!d) return false;
      const ΓY = ctx.conocidas?.[stream];
      if (!ΓY || ΓY.hashes.length - 1 < d.k) return false;
      if (nombre === 'nucleo.sid') { for (let i = 0; i < d.k; i++) if (ΓY.entradas[i].sid === args[0]) return true; return false; }
      const SY = estadoDe(stream, d.k);
      if (nombre === 'nucleo.sellado') return SY.sellado === true;
      if (nombre === 'nucleo.nAlMenos') return SY.n >= args[0];
      const P = ctx.registro[SY.parametros['nucleo.regla']].estables?.[nombre];
      return P ? P(SY.D, ...args) === true : false;
    },
  });
}

/** Guarda propia de FijarParámetro(m) (§5.2 i–vi). Devuelve null si admite, o el motivo. */
function guardaFijar(S, m, registro) {
  const r = S.parametros['nucleo.regla'];
  const r2 = Object.hasOwn(m, 'nucleo.regla') ? m['nucleo.regla'] : r;
  if (typeof r2 !== 'string' || !Object.hasOwn(registro, r2)) return 'fueraDeDominio';
  const sigma = sigmaCompleta(registro, r2, S.parametros);
  const claves = Object.keys(m);
  if (claves.some(p => !Object.hasOwn(sigma, p))) return 'parametroDesconocido';                                   // (i)
  if (claves.some(p => !sigma[p].dominio(m[p]))) return 'fueraDeDominio';                                          // (ii)
  if (claves.every(p => Object.hasOwn(S.parametros, p) && igualCV(m[p], S.parametros[p]))) return 'sinCambio';      // (iii)
  if (r2 !== r && typeof registro[r2].migraDesde?.[r] !== 'function') return 'sinMigracion';                        // (iv)
  if (!configuradorVivo(recomponerParametros(S.parametros, m, registro))) return 'autobloqueo';                      // (v)
  const gp = registro[r2].guardaPar ? registro[r2].guardaPar(m, S.D, S.parametros) : 'ok';                          // (vi)
  return gp === 'ok' ? null : gp;
}

/**
 * Accept_{C_ε}(u, e, S_n). Orden FIJO: G0 SELLADO → G5 INADMISIBLE('forma') → G1 NO_AUTORIZADO → G2 YA_COMPROMETIDO(i)
 * → G3 ÉPOCA_CAMBIADA → G4 DEPENDENCIA_NO_VERIFICABLE → guarda de la acción INADMISIBLE(motivo).
 * ctx = {registro, conocidas?: {StreamID ↦ Trayectoria}, epocaEsperada?}.
 * Devuelve {ok:true} | {ok:false, rechazo, motivo?, i?, dep?, divergencia?}.
 */
export function admitir(S, e, ctx) {
  const { registro } = ctx;
  if (S.sellado) return { ok: false, rechazo: 'SELLADO' };                                                        // G0
  if (!formaValida(S, e, registro)) return { ok: false, rechazo: 'INADMISIBLE', motivo: 'forma' };                // G5
  if (!autorizado(S.parametros, e.u, e, registro[S.parametros['nucleo.regla']])) return { ok: false, rechazo: 'NO_AUTORIZADO' }; // G1 (E4)
  if (Object.hasOwn(S.sids, e.sid)) return { ok: false, rechazo: 'YA_COMPROMETIDO', i: S.sids[e.sid] };          // G2
  if (e.epoca !== S.epoca || (ctx.epocaEsperada !== undefined && ctx.epocaEsperada !== S.epoca)) return { ok: false, rechazo: 'ÉPOCA_CAMBIADA' }; // G3
  for (const d of e.deps) {                                                                                       // G4
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

// ─────────── T y Fold ───────────
/** Efecto común: n := n+1, Sids[sid] := n; con `ventana(N)` se expulsa el sid más antiguo (§4.3: rompe la deduplicación). */
export function efectoComun(n0, sids0, parametros, sid) {
  const n = n0 + 1;
  const sids = { ...sids0, [sid]: n };
  const ret = parametros['nucleo.retenciónSids'];
  if (esMapa(ret)) {
    while (Object.keys(sids).length > ret.ventana) {
      let min = null;
      for (const [s, i] of Object.entries(sids)) if (min === null || i < sids[min]) min = s;
      delete sids[min];
    }
  }
  return { n, sids };
}

/** T(S, e): pura, sin reloj ni azar; usa la regla y los parámetros de C_ε de S (la época de la entrada). No muta S. */
export function transformar(S, e, registro) {
  const { n, sids } = efectoComun(S.n, S.sids, S.parametros, e.sid);
  let { epoca, parametros, sellado, D } = S;
  if (e.tipo === 'FijarParámetro') {
    const r = parametros['nucleo.regla'];
    const nuevos = recomponerParametros(parametros, e.args, registro);
    const r2 = nuevos['nucleo.regla'];
    if (r2 !== r) D = registro[r2].migraDesde[r](D);
    parametros = nuevos;
    epoca += 1;
  } else if (e.tipo === 'Sellar') {
    sellado = true;
    epoca += 1;
  } else {
    D = registro[parametros['nucleo.regla']].T(D, e, parametros); // exactamente 3 argumentos: T no lee otros ámbitos (L20)
  }
  return { n, epoca, parametros, sellado, sids, D };
}

/** Fold(S, [e_1…e_k]) — acción del monoide libre de trayectorias (L4). */
export function fold(S, entradas, registro) {
  let s = S;
  for (const e of entradas) s = transformar(s, e, registro);
  return s;
}
