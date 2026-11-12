// Kobalt — leyes del NÚCLEO GENERAL (fase 1) como pruebas de propiedades sobre el MODELO de referencia.
// Specs: kobalt/specs/2026-11-11_fase1-nucleo.md (§8) y kobalt/specs/2026-11-11_fase1-enmienda-preguntas.md (§8, E1–E8:
// pruebas al final del archivo). Modelo: kobalt/tests/modelos/nucleo.modelo.mjs.
//
// Ejecutar:  node --test 'kobalt/tests/leyes/*.test.mjs'
// Variables: KOBALT_SEED (semilla, por defecto 20261111), KOBALT_CASOS (por defecto 150),
//            KOBALT_NUCLEO_MODELO (ruta alternativa del modelo: así se ejecutan los mutantes sobre una COPIA).
//
// Estas pruebas verifican que el oráculo cumple sus leyes (autoverificación). La comparación de la
// implementación contra el oráculo está en nucleo.impl.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import * as C from './nucleo.comun.mjs';

const RUTA = process.env.KOBALT_NUCLEO_MODELO ? pathToFileURL(process.env.KOBALT_NUCLEO_MODELO).href : new URL('../modelos/nucleo.modelo.mjs', import.meta.url).href;
const M = await import(RUTA);
const R = M.REGISTRO_JUGUETE;
const { SEMILLA, CASOS, prng, entero, elegir, STREAM_X, STREAM_Y, STREAM_Z, sidDe, hex, deHex } = C;
const igual = isDeepStrictEqual;
const te = new TextEncoder();
const require_ = createRequire(import.meta.url);
const KOB2 = require_('../../kernels/KOB2/2026-09-18_0100_KOB2_KERNEL_9_0_1.js'); // solo lectura
const kob2 = async (tag, partes) => hex(await KOB2.View.derive(KOB2.View.clear(), te.encode(tag), partes));

// ─────────── Mini‑motor de propiedades con reducción por prefijo ───────────
const escenarios = new Map();
function escenario(c) {
  if (!escenarios.has(c)) { const esc = C.generarEscenario(M, SEMILLA + c); escenarios.set(c, { esc, run: C.ejecutarPuro(M, esc) }); }
  return escenarios.get(c);
}
/** ∀ escenario: prop(run, esc) ; si falla, reduce al prefijo de propuestas de X más corto que aún falla. */
function paraTodoEscenario(nombre, prop, casos = CASOS) {
  test(nombre, () => {
    for (let c = 0; c < casos; c++) {
      const { esc, run } = escenario(c);
      let ok; try { ok = prop(run, esc); } catch (err) { ok = false; esc.error = err; }
      if (ok) continue;
      let k = 0;
      for (; k <= esc.propX.length; k++) {
        const e2 = { ...esc, propX: esc.propX.slice(0, k) };
        let ok2; try { ok2 = prop(C.ejecutarPuro(M, e2), e2); } catch { ok2 = false; }
        if (!ok2) break;
      }
      assert.fail(`${nombre}\n  semilla=${SEMILLA + c} (KOBALT_SEED=${SEMILLA}, caso ${c})${esc.error ? `\n  error: ${esc.error.message}` : ''}\n  prefijo mínimo de propuestas de X que falla (k=${k}):\n  `
        + esc.propX.slice(0, k).map(p => JSON.stringify(p)).join('\n  '));
    }
  });
}
const S0X = () => M.estadoInicial(C.genesisX(), R);
const nuevaX = (C0extra) => M.trayectoriaNueva(C.genesisX(C0extra), R).Γ;
/** Compromete una lista de solicitudes con el mecanismo `dueño` sobre la cabeza actual; falla si alguna se rechaza. */
function comprometerTodas(Γ, sols, conocidas = {}, mecanismo = 'dueño') {
  for (const sol of sols) {
    const r = M.comprometer(Γ, M.cabezaDe(Γ), mecanismo, { deps: [], ...sol }, { registro: R, conocidas });
    assert.equal(r.resultado, 'COMPROMETIDO', `${JSON.stringify(sol)} → ${JSON.stringify(r)}`);
    Γ = r.Γ;
  }
  return Γ;
}
let sidN = 1000; const nuevoSid = () => sidDe(sidN++);
const sumar = (clave, q, u = 'dueño') => ({ u, sid: nuevoSid(), tipo: 'sumar', args: { clave, q } });
const fijar = (clave, v, u = 'dueño') => ({ u, sid: nuevoSid(), tipo: 'fijar', args: { clave, v } });
const fijarP = (m, u = 'dueño') => ({ u, sid: nuevoSid(), tipo: 'FijarParámetro', args: m });
const ctxPi = (Γ, k, S, tRef) => ({ registro: R, tRef, h: Γ.hashes[k], hashes: Γ.hashes.slice(0, k + 1), parametros: S.parametros });
const oraculo = (proy, Γ, k, tRef) => { const S = M.fold(M.estadoInicial(Γ.g, R), Γ.entradas.slice(0, k), R); return proy.pi(S, ctxPi(Γ, k, S, tRef)); };
const copiaDe = Γ => ({ streamId: Γ.streamId, gBytes: Γ.gBytes, bloques: Γ.bloques, cabeza: M.cabezaDe(Γ) });

// ═════════════════════════ CV y 𝒟 ═════════════════════════
test('CV vectores de codificación (tabla §4.2)', () => {
  const casos = [
    [null, '00'], [false, '01'], [true, '02'], [0, '0300'], [-0, '0300'], [127, '037f'], [128, '038001'], [300, '03ac02'],
    [-1, '0401'], [2 ** 53 - 1, '03ffffffffffffff0f'], [Uint8Array.of(), '0500'], [Uint8Array.of(1, 255), '050201ff'],
    ['', '0600'], ['é', '0602c3a9'], ['𝔇', '0604f09d9487'], [[], '0700'], [[null, 1], '0702000301'], [{}, '0800'],
    [{ b: 1, a: 2 }, '08020601610302060162' + '0301'], [{ 'é': 0, z: 0 }, '0802' + '06017a0300' + '0602c3a90300'],
  ];
  for (const [v, h] of casos) { assert.equal(hex(M.cv(v)), h, `CV(${C.claveEstructural(v)})`); assert.deepEqual(M.decCV(deHex(h)), v === -0 ? 0 : v); }
});

test('CV ida y vuelta exacta e inyectividad en 20.000 valores aleatorios (Teorema 4.1)', () => {
  const r = prng(SEMILLA); const vistos = new Map(); let n = 0;
  for (let i = 0; i < 20000; i++) {
    const v = C.valorCV(r); const b = M.cv(v);
    assert.equal(C.claveEstructural(M.decCV(b)), C.claveEstructural(v), `ida y vuelta: ${C.claveEstructural(v)}`);
    assert.equal(hex(M.cv(M.decCV(b))), hex(b));
    const k = hex(b), s = C.claveEstructural(v);
    if (vistos.has(k)) assert.equal(vistos.get(k), s, `colisión: ${vistos.get(k)} y ${s} → ${k}`); else { vistos.set(k, s); n++; }
    // libre de prefijos: CV(v)‖x no decodifica como un solo valor
    assert.throws(() => M.decCV(Uint8Array.from([...b, 0])));
  }
  assert.ok(n > 3000, `diversidad insuficiente del generador (${n})`);
});

test('CV rechaza las 6 formas no canónicas, UTF‑8 mal formado y el surrogate suelto', () => {
  const malos = {
    'varuint no canónico': '038000', '04 00 (−0)': '0400', 'etiqueta desconocida': '09', 'claves desordenadas': '080206016203000601610300',
    'claves repetidas': '080206016103000601610300', 'truncado': '060561', 'bytes sobrantes': '0000', 'UTF‑8 mal formado': '0601ff',
    'surrogate codificado': '0603eda080', 'clave no texto': '0801030103 01'.replace(' ', ''), 'lista truncada': '070300',
    'varuint > 2^53': '03ffffffffffffffff7f', 'BOM no es ignorable': null,
  };
  for (const [nombre, h] of Object.entries(malos)) if (h) assert.throws(() => M.decCV(deHex(h)), undefined, nombre);
  assert.equal(M.decCV(deHex('0603efbbbf')), '﻿', 'el BOM es un carácter, no se descarta');
  for (const v of ['\uD800', 'a\uDC00b', 1.5, NaN, Infinity, 2 ** 53, undefined, 10n, new Map(), () => 1, new Date(0)]) assert.throws(() => M.cv(v), undefined, String(v));
});

test('CV contraejemplos de las alternativas (TextEncoder, concatenación, JSON)', () => {
  assert.equal(hex(te.encode('\uD800')), hex(te.encode('�')), 'TextEncoder confunde surrogate suelto y U+FFFD');
  assert.throws(() => M.cv('\uD800')); assert.notEqual(hex(M.cv('�')), '');
  const sha = s => require_('node:crypto').createHash('sha256').update(s).digest('hex');
  assert.equal(sha('ab' + 'c'), sha('a' + 'bc'));
  assert.notEqual(M.derivar('t', te.encode('ab'), te.encode('c')), M.derivar('t', te.encode('a'), te.encode('bc')), 'Frame separa fronteras');
  assert.notEqual(JSON.stringify({ a: 1, b: 2 }), JSON.stringify({ b: 2, a: 1 }));
  assert.equal(hex(M.cv({ a: 1, b: 2 })), hex(M.cv({ b: 2, a: 1 })));
  assert.equal(JSON.stringify(-0), '0');
});

test('CV/𝒟 vectores de 𝔇 de la spec §4.2', async () => {
  const v1 = M.derivar('kobalt:nucleo:paso:1', new Uint8Array(32), new Uint8Array(0));
  const v2 = M.derivar('kobalt:nucleo:genesis:1', new Uint8Array(16).fill(1), te.encode('g'));
  assert.equal(v1, '708cffb32980e9da76d78f564db709a1c27e83298729bf5aa553a0fd879781a1');
  assert.equal(v2, '341ecd83c6898c04bd4d72f811ef5e507c6bc5d97ab8f6d36d241b5b79bf6638');
  assert.equal(v1, await kob2('kobalt:nucleo:paso:1', [new Uint8Array(32), new Uint8Array(0)]));
  assert.equal(v2, await kob2('kobalt:nucleo:genesis:1', [new Uint8Array(16).fill(1), te.encode('g')]));
  assert.deepEqual({ ...M.ETIQUETAS }, { GENESIS: 'kobalt:nucleo:genesis:1', PASO: 'kobalt:nucleo:paso:1', SID: 'kobalt:nucleo:sid:1', SNAPSHOT: 'kobalt:nucleo:snapshot:1' });
});

test('CV/𝒟 𝔇 coincide con KOB2.View.derive del kernel original en 300 entradas aleatorias', async () => {
  const r = prng(SEMILLA ^ 0x5151);
  for (let i = 0; i < 300; i++) {
    const tag = C.valorCV(r) + ''; const partes = Array.from({ length: entero(r, 0, 4) }, () => M.cv(C.valorCV(r)));
    assert.equal(M.derivar(tag, ...partes), await kob2(tag, partes));
  }
});

test('CV/𝒟 vectores publicados de génesis, entrada, cadena y DeriveSid (coinciden con KOB2)', async () => {
  const { genesis: G, entrada: E } = C.VECTORES;
  assert.equal(hex(M.encGenesis(G.g)), G.cv);
  assert.equal(M.hashGenesis(G.g), G.h0);
  assert.equal(G.h0, await kob2(M.ETIQUETAS.GENESIS, [deHex(G.g.streamId), deHex(G.cv)]));
  assert.equal(M.hashGenesis({ ...G.g, predecesor: { streamId: '04'.repeat(16), n: 7, h: '05'.repeat(32) } }), C.VECTORES.genesisConPredecesor.h0);
  assert.equal(hex(M.encEntrada(E.e)), E.enc);
  assert.deepEqual(M.decEntrada(deHex(E.enc)), E.e);
  assert.equal(M.hashPaso(G.h0, deHex(E.enc)), E.h1);
  assert.equal(E.h1, await kob2(M.ETIQUETAS.PASO, [deHex(G.h0), deHex(E.enc)]));
  assert.equal(M.deriveSid(C.VECTORES.deriveSid.dom, C.VECTORES.deriveSid.v), C.VECTORES.deriveSid.sid);
  assert.deepEqual(M.decGenesis(deHex(G.cv)), G.g);
});

paraTodoEscenario('CV/𝒟 Enc es inyectivo sobre las entradas generadas (sin colisiones) y decEntrada∘Enc = id', run => {
  const vistos = new Map();
  for (const e of run.ΓX.entradas) {
    const b = hex(M.encEntrada(e)); if (!igual(M.decEntrada(deHex(b)), e)) return false;
    const k = C.claveEstructural(e); if (vistos.has(b) && vistos.get(b) !== k) return false; vistos.set(b, k);
  }
  return true;
}, 60);

// ═════════════════════════ L3 · append‑only ═════════════════════════
paraTodoEscenario('L3 Γ_n ⪯ Γ_{n+1} tras cada compromiso (bloques, entradas y hashes previos intactos)', (run, esc) => {
  let Γ = M.trayectoriaNueva(esc.gX, R).Γ;
  for (const p of esc.propX) {
    const r = M.comprometer(Γ, C.cabezaPara(p.cabeza, Γ.hashes), p.mecanismo, p.sol, { registro: R, conocidas: { [STREAM_Y]: run.ΓY } });
    if (r.Γ) {
      const n = Γ.entradas.length;
      if (r.Γ.entradas.length !== n + 1) return false;
      for (let i = 0; i < n; i++) if (hex(r.Γ.bloques[i]) !== hex(Γ.bloques[i])) return false;
      if (!igual(r.Γ.hashes.slice(0, n + 1), Γ.hashes)) return false;
      Γ = r.Γ;
    }
  }
  return true;
});
test('L3 la materialidad solo ofrece compare‑and‑append: ninguna operación de sobrescritura ni borrado', () => {
  const a = M.crearAlmacenMemoria();
  assert.deepEqual(Object.keys(a).sort(), ['anexarSiCabeza', 'cabeza', 'crear', 'guardar', 'leer', 'leerGenesis', 'leerRegistro', 'streams']);
  assert.ok(Object.isFrozen(a));
  const ΓX = comprometerTodas(nuevaX(), [sumar('a', 1), sumar('b', 2)]);
  M.crear(a, ΓX.g, R);
  assert.equal(a.anexarSiCabeza(STREAM_X, { n: 0, h: ΓX.hashes[0] }, ΓX.bloques, M.cabezaDe(ΓX)).resultado, 'OK');
  // reescribir la posición 1 a partir de la génesis: CONFLICTO
  assert.equal(a.anexarSiCabeza(STREAM_X, { n: 0, h: ΓX.hashes[0] }, [ΓX.bloques[1]], { n: 1, h: ΓX.hashes[1] }).resultado, 'CONFLICTO');
  const leidos = a.leer(STREAM_X, 1, 2); leidos[0][0] ^= 1; // mutar lo leído no altera lo guardado
  assert.equal(hex(a.leer(STREAM_X, 1, 1)[0]), hex(ΓX.bloques[0]));
});
paraTodoEscenario('L3 editar un e_i comprometido ⇒ Verificar devuelve DISCONTINUIDAD (y la copia íntegra da OK)', run => {
  const Γ = run.ΓX; const n = Γ.entradas.length;
  const ok = M.verificar(copiaDe(Γ));
  if (ok.resultado !== 'OK' || ok.n !== n || ok.h !== Γ.hashes[n]) return false;
  if (n === 0) return true;
  const i = 1 + (7919 % n);
  const e2 = { ...Γ.entradas[i - 1], u: Γ.entradas[i - 1].u + 'x' };
  const bloques = Γ.bloques.map((b, j) => (j === i - 1 ? M.encEntrada(e2) : b));
  const v = M.verificar({ ...copiaDe(Γ), bloques });
  return v.resultado === 'DISCONTINUIDAD' && v.i <= i;
});

// ═════════════════════════ L4 · Fold es acción del monoide; snapshots ═════════════════════════
paraTodoEscenario('L4 Fold(Fold(S0,Γ_n),Γ_{n+1:m}) = Fold(S0,Γ_m) en todo corte (cruzando épocas y Migra)', run => {
  const Γ = run.ΓX, S0 = M.estadoInicial(Γ.g, R), e = Γ.entradas;
  const completo = M.fold(S0, e, R);
  if (!igual(completo, Γ.estados.at(-1))) return false;
  for (let n = 0; n <= e.length; n++) {
    const Sn = M.fold(S0, e.slice(0, n), R);
    if (!igual(M.fold(Sn, e.slice(n), R), completo)) return false;
  }
  return true;
});
paraTodoEscenario('L4 snapshot restaurado + sufijo = Fold completo; un snapshot con h_n distinto o Q roto no se usa', run => {
  const Γ = run.ΓX, n = Γ.entradas.length, S0 = M.estadoInicial(Γ.g, R);
  for (let k = 0; k <= n; k++) {
    const snap = M.crearSnapshot(M.fold(S0, Γ.entradas.slice(0, k), R), Γ.hashes[k], R);
    const S = M.restaurarSnapshot(snap, Γ.hashes, R);
    if (!S || !igual(M.fold(S, Γ.entradas.slice(k), R), Γ.estados.at(-1))) return false;
    if (M.restaurarSnapshot({ ...snap, h: C.HASH_FALSO }, Γ.hashes, R) !== null) return false;
    if (M.restaurarSnapshot({ ...snap, Q: C.HASH_FALSO }, Γ.hashes, R) !== null) return false;
    if (k > 0 && M.restaurarSnapshot({ ...snap, n: k - 1 }, Γ.hashes, R) !== null) return false;
  }
  return true;
}, 60);

test('L4 genericidad (Teorema 7.11): con la segunda regla conjunto@1 el mismo núcleo cumple Fold por cortes, V3 y V4', () => {
  let comprometidos = 0;
  for (let c = 0; c < CASOS; c++) {
    const esc = C.generarEscenarioConjunto(M, SEMILLA + c); const { ΓX: Γ } = C.ejecutarPuro(M, esc);
    const S0 = M.estadoInicial(Γ.g, R), fin = M.fold(S0, Γ.entradas, R);
    assert.deepEqual(fin, Γ.estados.at(-1));
    for (let n = 0; n <= Γ.entradas.length; n++) assert.deepEqual(M.fold(M.fold(S0, Γ.entradas.slice(0, n), R), Γ.entradas.slice(n), R), fin);
    assert.deepEqual(fin.sids, Object.fromEntries(Γ.entradas.map((e, i) => [e.sid, i + 1])));
    assert.equal(fin.epoca, Γ.entradas.filter(e => e.clase === 'contrato').length);
    comprometidos += Γ.entradas.length;
  }
  assert.ok(comprometidos > 200, `pocos compromisos con conjunto@1: ${comprometidos}`);
});

// ═════════════════════════ L5 · monotonía de la historia ⇏ de los valores ═════════════════════════
test('L5 D sube y baja mientras Γ solo crece', () => {
  let sube = 0, baja = 0;
  for (let c = 0; c < CASOS; c++) {
    const Γ = escenario(c).run.ΓX;
    for (let i = 1; i < Γ.estados.length; i++) for (const k of ['a', 'b', 'c', 'd']) {
      const a = Γ.estados[i - 1].D?.v?.[k], b = Γ.estados[i].D?.v?.[k];
      if (a !== undefined && b !== undefined) { if (b > a) sube++; if (b < a) baja++; }
    }
  }
  assert.ok(sube > 20 && baja > 20, JSON.stringify({ sube, baja }));
});

// ═════════════════════════ L6 · V1–V9 ═════════════════════════
const sigmaDe = S => Object.keys(S.parametros);
paraTodoEscenario('L6 V1–V8 valen en cada estado intermedio de cada trayectoria generada', run => {
  const Γ = run.ΓX, n = Γ.entradas.length;
  if (Γ.hashes[0] !== M.hashGenesis(Γ.g)) return false;                                         // V2 (génesis)
  let epocasContrato = 0; const vistos = new Set();
  for (let i = 1; i <= n; i++) {
    const S = Γ.estados[i], Sp = Γ.estados[i - 1], e = Γ.entradas[i - 1];
    if (Γ.hashes[i] !== M.hashPaso(Γ.hashes[i - 1], Γ.bloques[i - 1])) return false;             // V2
    if (hex(Γ.bloques[i - 1]) !== hex(M.encEntrada(e))) return false;
    if (vistos.has(e.sid)) return false; vistos.add(e.sid);                                      // V3 unicidad
    const esperado = Object.fromEntries(Γ.entradas.slice(0, i).map((x, j) => [x.sid, j + 1]));
    if (!igual(S.sids, esperado) || S.n !== i) return false;                                     // V3 mapa exacto
    if (e.epoca !== Sp.epoca || e.epoca !== epocasContrato) return false;                        // V4 registrada
    if (e.clase === 'contrato') epocasContrato++;
    if (S.epoca !== epocasContrato) return false;                                                // V4 emergente
    const regla = R[S.parametros['nucleo.regla']];
    const sigma = new Set([...Object.keys(regla.sigma), 'nucleo.capacidades', 'nucleo.regla', 'nucleo.constituyente', 'nucleo.derivación', 'nucleo.retenciónSids']);
    if (!igual(new Set(sigmaDe(S)), sigma)) return false;                                         // V5 total
    if (Object.keys(regla.sigma).some(p => !regla.sigma[p].dominio(S.parametros[p]))) return false; // V5 tipado
    const vivo = Object.values(S.parametros['nucleo.capacidades']).some(ps => ps.some(p => M.coincide(p, 'FijarParámetro:nucleo.capacidades')));
    if (!(S.sellado || vivo)) return false;                                                      // V6
    if (Sp.sellado) return false;                                                                // V7: nada tras el sello
    if (!M.admitir(Sp, e, { registro: R, conocidas: { [STREAM_Y]: run.ΓY } }).ok) return false; // V8 con C_{ε_{i−1}}
    if (!e.deps.every(d => d.stream === STREAM_Y && d.k < run.ΓY.hashes.length && run.ΓY.hashes[d.k] === d.h)) return false; // V8/G4: toda dep verificable
  }
  return true;
});
test('L6/V9 «valor ≥ 0» vale dentro de las épocas con límite ≥0 y NO es invariante de la instancia', () => {
  // La instancia admite valores negativos legítimamente (límite = ninguno). La representación debe admitirlos (§12 del plan).
  let Γ = comprometerTodas(nuevaX(), [sumar('a', 2), fijarP({ 'límite': 'ninguno' }), sumar('a', -5), fijarP({ 'límite': '≥0' })]);
  assert.equal(Γ.estados.at(-1).D.v.a, -3, 'estado alcanzable con valor negativo');
  const r = M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...sumar('a', -1), deps: [] }, { registro: R });
  assert.equal(r.resultado, 'INADMISIBLE'); assert.equal(r.motivo, 'límite');
  // dentro de épocas con ≥0 que empiezan en un estado con V_D, V_D se conserva (trayectorias generadas)
  for (let c = 0; c < CASOS; c++) {
    const G = escenario(c).run.ΓX;
    for (let i = 1; i < G.estados.length; i++) {
      const P = G.estados[i - 1].parametros, e = G.entradas[i - 1];
      if (e.clase !== 'dominio' || P['límite'] !== '≥0') continue;
      if (Object.values(G.estados[i - 1].D.v).every(x => x >= 0)) assert.ok(Object.values(G.estados[i].D.v).every(x => x >= 0), `semilla ${SEMILLA + c} i=${i}`);
    }
  }
});

// ═════════════════════════ L7 · guardas ≠ invariantes ═════════════════════════
function trayectoriaRevocacion() {
  // época 0: cajero suma; FijarParámetro(defecto) abre la época 1; cajero suma en la 1; revocación abre la 2.
  return comprometerTodas(nuevaX(), [sumar('a', 1, 'cajero'), fijarP({ defecto: 1 }), sumar('a', 1, 'cajero'),
    fijarP({ 'nucleo.capacidades': { 'dueño': ['*'] } })]);
}
test('L7 re‑admisión con el contrato de la época REGISTRADA: la revocación posterior no invalida el pasado', () => {
  const Γ = trayectoriaRevocacion();
  assert.equal(Γ.estados.at(-1).epoca, 2);
  const replica = M.trayectoriaNueva(Γ.g, R).Γ;
  const r = M.incorporarEn(replica, M.cabezaDe(replica), Γ.bloques, M.cabezaDe(Γ), { registro: R, readmitir: true });
  assert.equal(r.resultado, 'INCORPORADO', JSON.stringify(r));
  assert.deepEqual(r.Γ.estados.at(-1), Γ.estados.at(-1));
  // …y la revocación sí rige hacia adelante
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...sumar('a', 1, 'cajero'), deps: [] }, { registro: R }).resultado, 'NO_AUTORIZADO');
  // El contrato ACTUAL rechazaría la entrada antigua: eso es exactamente lo que no debe usarse.
  const Sfinal = Γ.estados.at(-1);
  assert.equal(M.admitir({ ...Sfinal, sids: {} }, { ...Γ.entradas[2], epoca: Sfinal.epoca }, { registro: R }).ok, false);
});
test('L7 «todo autor de Γ tiene hoy capacidad» NO es invariante: el estado que lo viola es alcanzable', () => {
  const Γ = trayectoriaRevocacion(); const S = Γ.estados.at(-1);
  const autores = new Set(Γ.entradas.map(e => e.u));
  assert.ok([...autores].some(u => !Object.hasOwn(S.parametros['nucleo.capacidades'], u)));
  assert.equal(M.verificar(copiaDe(Γ)).resultado, 'OK');
});

// ═════════════════════════ L8 · un sucesor por cabeza ═════════════════════════
test('L8 dos AppendIfHead con la misma cabeza observada: uno COMPROMETIDO, otro CABEZA_CAMBIADA; reevaluado ⇒ YA_COMPROMETIDO', () => {
  const Γ = comprometerTodas(nuevaX(), [sumar('a', 1)]);
  const vista = M.cabezaDe(Γ);
  const s1 = { ...sumar('a', 1), deps: [] }, s2 = { ...sumar('a', 2, 'cajero'), deps: [] };
  const r1 = M.comprometer(Γ, vista, 'dueño', s1, { registro: R });
  const r2 = M.comprometer(r1.Γ, vista, 'dueño', s2, { registro: R });
  assert.equal(r1.resultado, 'COMPROMETIDO'); assert.equal(r2.resultado, 'CABEZA_CAMBIADA');
  assert.deepEqual({ n: r2.n, h: r2.h }, M.cabezaDe(r1.Γ));
  assert.equal(M.comprometer(r1.Γ, M.cabezaDe(r1.Γ), 'dueño', s1, { registro: R }).resultado, 'YA_COMPROMETIDO');
  const r3 = M.comprometer(r1.Γ, M.cabezaDe(r1.Γ), 'dueño', s2, { registro: R });
  assert.equal(r3.resultado, 'COMPROMETIDO');
  assert.equal(M.comprometer(r3.Γ, M.cabezaDe(r3.Γ), 'dueño', s2, { registro: R }).resultado, 'YA_COMPROMETIDO');
});
test('L8 dos adaptadores en memoria sobre el mismo almacén, en concurrencia: exactamente un sucesor por posición', async () => {
  const a1 = M.crearAlmacenMemoria(); const a2 = M.crearAlmacenMemoria(a1);
  assert.equal(M.crear(a1, C.genesisX(), R).resultado, 'CREADO');
  for (let ronda = 0; ronda < 20; ronda++) {
    const cab = a1.cabeza(STREAM_X);
    const rs = await Promise.all([
      Promise.resolve().then(() => M.appendIfHead(a1, STREAM_X, cab, 'dueño', { ...sumar('a', 1), deps: [] }, { registro: R })),
      Promise.resolve().then(() => M.appendIfHead(a2, STREAM_X, cab, 'dueño', { ...sumar('b', 1), deps: [] }, { registro: R })),
    ]);
    assert.deepEqual(rs.map(r => r.resultado).sort(), ['CABEZA_CAMBIADA', 'COMPROMETIDO']);
    assert.equal(a2.cabeza(STREAM_X).n, cab.n + 1);
  }
  assert.equal(M.verificar(M.leerCopia(a2, STREAM_X)).resultado, 'OK');
});
test('L8 comparar solo n no basta: dos copias distintas con el mismo n ⇒ CABEZA_CAMBIADA', () => {
  const base = nuevaX();
  const A = comprometerTodas(base, [sumar('a', 1)]), B = comprometerTodas(base, [sumar('a', 2)]);
  assert.equal(M.cabezaDe(A).n, M.cabezaDe(B).n);
  assert.equal(M.comprometer(A, M.cabezaDe(B), 'dueño', { ...sumar('c', 1), deps: [] }, { registro: R }).resultado, 'CABEZA_CAMBIADA');
  const alm = M.crearAlmacenMemoria(); M.crear(alm, A.g, R); alm.anexarSiCabeza(STREAM_X, { n: 0, h: A.hashes[0] }, A.bloques, M.cabezaDe(A));
  assert.equal(M.appendIfHead(alm, STREAM_X, M.cabezaDe(B), 'dueño', { ...sumar('c', 1), deps: [] }, { registro: R }).resultado, 'CABEZA_CAMBIADA');
});
test('L8 un adaptador de «dos put» sin transacción con intercalado forzado produce dos sucesores (el de memoria, uno)', async () => {
  // Mutante del adaptador (prohibido 9): leer cabeza, ceder, escribir.
  const base = { bloques: [], cabeza: null };
  const dosPut = { async anexarSiCabeza(cab, bloques, fin) { const c = base.cabeza; await null; await null;
    if (c.n !== cab.n || c.h !== cab.h) return { resultado: 'CONFLICTO' }; base.bloques.push(...bloques); base.cabeza = fin; return { resultado: 'OK' }; } };
  const Γ = nuevaX(); base.cabeza = M.cabezaDe(Γ);
  const r1 = M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...sumar('a', 1), deps: [] }, { registro: R });
  const r2 = M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...sumar('b', 1), deps: [] }, { registro: R });
  const rs = await Promise.all([dosPut.anexarSiCabeza(M.cabezaDe(Γ), [r1.Γ.bloques[0]], { n: 1, h: r1.h }), dosPut.anexarSiCabeza(M.cabezaDe(Γ), [r2.Γ.bloques[0]], { n: 1, h: r2.h })]);
  assert.deepEqual(rs.map(r => r.resultado), ['OK', 'OK'], 'el mutante debe romper L8 (si no, la prueba no discrimina)');
  assert.equal(base.bloques.length, 2);
  const alm = M.crearAlmacenMemoria(); M.crear(alm, Γ.g, R);
  const rs2 = await Promise.all([Promise.resolve().then(() => alm.anexarSiCabeza(STREAM_X, M.cabezaDe(Γ), [r1.Γ.bloques[0]], { n: 1, h: r1.h })),
    Promise.resolve().then(() => alm.anexarSiCabeza(STREAM_X, M.cabezaDe(Γ), [r2.Γ.bloques[0]], { n: 1, h: r2.h }))]);
  assert.deepEqual(rs2.map(r => r.resultado).sort(), ['CONFLICTO', 'OK']);
});

// ═════════════════════════ L9 · resolución = oráculo ═════════════════════════
const PROYS = { ...Object.fromEntries(Object.entries(M.PROYECCIONES).map(([k, v]) => [`nucleo.${k}`, v])), ...Object.fromEntries(Object.entries(M.JUGUETE_PROY).map(([k, v]) => [`juguete.${k}`, v])) };
paraTodoEscenario('L9 resolverProyeccion = oráculo para toda Π (núcleo y juguete) desde todo checkpoint, incluidos cortes que cruzan FijarParámetro', (run, esc) => {
  const Γ = run.ΓX, L = Γ.entradas.length, r = prng(esc.propX.length * 31 + L);
  for (const proy of Object.values(PROYS)) {
    const tRef = proy.sensibleATiempo ? 1 : undefined;
    const Ys = Array.from({ length: L + 1 }, (_, k) => proy.pi(Γ.estados[k], ctxPi(Γ, k, Γ.estados[k], tRef))); // Γ.estados = Fold (L4)
    for (let n = 0; n <= L; n++) {
      const cp = { streamId: Γ.streamId, n, h: Γ.hashes[n], ver: proy.ver, epoca: Γ.estados[n].epoca, ...(proy.sensibleATiempo ? { tRef } : {}) };
      for (const m of new Set([n, L, entero(r, 0, L), entero(r, n, L)])) {
        const res = M.resolverProyeccion({ proy, guardado: { Y: Ys[n], checkpoint: cp }, trayectoria: Γ, m, registro: R, tRef });
        if (!igual(res.Y, Ys[m])) return false;
        const contrato = Γ.entradas.slice(n, m).some(e => e.clase === 'contrato');
        const esperada = n === m ? 'REUTILIZAR' : n > m ? 'RECONSTRUIR' : (proy.g && (!proy.sensibleAEpoca || !contrato)) ? 'ACTUALIZAR' : 'RECONSTRUIR';
        if (res.accion !== esperada) return false;
        if (!igual(res.checkpoint, { ...cp, n: m, h: Γ.hashes[m], epoca: Γ.estados[m].epoca })) return false;
      }
    }
  }
  return true;
}, 60);
paraTodoEscenario('L9 g_a es correcta paso a paso: π(T(S,e)) = g(π(S), e) para toda Π incremental', run => {
  const Γ = run.ΓX;
  for (const proy of Object.values(PROYS)) if (proy.g) for (let i = 1; i < Γ.estados.length; i++) {
    const Sp = Γ.estados[i - 1], e = Γ.entradas[i - 1];
    if (proy.sensibleAEpoca && e.clase === 'contrato') continue;
    const izq = proy.pi(Γ.estados[i], ctxPi(Γ, i, Γ.estados[i]));
    const der = proy.g(proy.pi(Sp, ctxPi(Γ, i - 1, Sp)), e, { registro: R, parametros: Sp.parametros });
    if (!igual(izq, der)) return false;
  }
  return true;
});

// ═════════════════════════ L10 · incrementalidad ⟺ congruencia ═════════════════════════
const ACCIONES_PEQ = [
  { tipo: 'sumar', args: { clave: 'a', q: 1 } }, { tipo: 'sumar', args: { clave: 'a', q: -1 } }, { tipo: 'fijar', args: { clave: 'a', v: 0 } },
  { tipo: 'fijar', args: { clave: 'b', v: 1 } }, { tipo: 'duplicar', args: { clave: 'a' } },
  { tipo: 'FijarParámetro', args: { defecto: 1 } }, { tipo: 'FijarParámetro', args: { defecto: 0 } }, { tipo: 'FijarParámetro', args: { 'límite': 'ninguno' } },
  { tipo: 'FijarParámetro', args: { 'nucleo.regla': 'contador@2' } }, { tipo: 'FijarParámetro', args: { 'nucleo.retenciónSids': { ventana: 2 } } },
];
function universoPequeño(prof = 3) {
  const estados = new Map(); let frontera = [S0X()]; let s = 0;
  const agregar = S => { const k = hex(M.cv({ ...S, D: S.D })); if (!estados.has(k)) { estados.set(k, S); return true; } return false; };
  agregar(frontera[0]);
  for (let d = 0; d < prof; d++) {
    const sig = [];
    for (const S of frontera) for (const a of ACCIONES_PEQ) {
      const e = { epoca: S.epoca, u: 'dueño', sid: sidDe(5000 + s++), deps: [], clase: M.claseDe(a.tipo), ...a };
      if (!M.admitir(S, e, { registro: R }).ok) continue;
      const S2 = M.transformar(S, e, R); if (agregar(S2)) sig.push(S2);
    }
    frontera = sig;
  }
  return [...estados.values()];
}
function contraejemploCongruencia(pi, estados) {
  const grupos = new Map();
  for (const S of estados) { const k = hex(M.cv(pi(S))); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(S); }
  let s = 0;
  for (const g of grupos.values()) if (g.length > 1) for (const a of ACCIONES_PEQ) {
    let ref = null;
    for (const S of g) {
      const e = { epoca: S.epoca, u: 'dueño', sid: sidDe(9000 + s++), deps: [], clase: M.claseDe(a.tipo), ...a };
      if (!M.admitir(S, e, { registro: R }).ok) continue;
      const y = hex(M.cv(pi(M.transformar(S, e, R))));
      if (ref === null) ref = { y, S }; else if (ref.y !== y) return { s: ref.S, t: S, a };
    }
  }
  return null;
}
// g_a recibe C_ε (determinado por el checkpoint): la congruencia se comprueba sobre π'(S) = (π(S), C_ε).
const piDe = proy => S => [proy.pi(S, { registro: R, parametros: S.parametros }), S.parametros];
test('L10 Π_época, Π_sids y Π_coord son congruencias (búsqueda exhaustiva en un universo pequeño)', () => {
  const U = universoPequeño(); assert.ok(U.length > 200, `universo pequeño: ${U.length}`);
  for (const p of [M.PROYECCIONES.epoca, M.PROYECCIONES.sids, M.JUGUETE_PROY.coord, M.JUGUETE_PROY.valoresMascara]) assert.equal(contraejemploCongruencia(piDe(p), U), null, p.id);
});
test('L10 Π_valores con defecto NO es congruente para FijarParámetro(defecto) (se detecta); su refinamiento con máscara sí', () => {
  const U = universoPequeño();
  const ce = contraejemploCongruencia(piDe(M.JUGUETE_PROY.valores), U);
  assert.ok(ce, 'se esperaba contraejemplo'); assert.equal(ce.a.tipo, 'FijarParámetro');
  assert.equal(M.JUGUETE_PROY.valores.sensibleAEpoca, true);
  // Contraejemplo literal de §7.1: {a ↦ 0} y {} con defecto 0
  const s1 = M.transformar(S0X(), { epoca: 0, u: 'dueño', sid: 'aa01', deps: [], clase: 'dominio', tipo: 'fijar', args: { clave: 'a', v: 0 } }, R), s2 = S0X();
  const pi = piDe(M.JUGUETE_PROY.valores); assert.deepEqual(pi(s1), pi(s2));
  const e = (S, sid) => ({ epoca: S.epoca, u: 'dueño', sid, deps: [], clase: 'contrato', tipo: 'FijarParámetro', args: { defecto: 'desconocido' } });
  assert.notDeepEqual(pi(M.transformar(s1, e(s1, 'aa02'), R)), pi(M.transformar(s2, e(s2, 'aa02'), R)));
  assert.equal(contraejemploCongruencia(piDe(M.JUGUETE_PROY.valoresMascara), U), null);
});
test('L10 la suma de valores NO es congruente para fijar: por eso Π_total no declara g', () => {
  const ce = contraejemploCongruencia(piDe(M.JUGUETE_PROY.total), universoPequeño());
  assert.ok(ce); assert.equal(M.JUGUETE_PROY.total.g, undefined);
});

// ═════════════════════════ L13 · unión por identidad (Δ6) ═════════════════════════
const instSid = { id: o => o.sid, rec: (o, S) => Object.hasOwn(S.sids, o.sid), reconocidos: S => Object.keys(S.sids) };
test('L13 Δ sobre O_B ∪ O_C: la misma identidad cuenta una vez; misma id con distinto contenido ⇒ Conflictos y ninguno se aplica', () => {
  const sol = (sid, clave, q) => ({ u: 'dueño', sid, tipo: 'sumar', args: { clave, q }, deps: [] });
  const OB = [sol('b001', 'a', 1), sol('b002', 'a', 1)], OC = [sol('c001', 'a', 1), sol('c002', 'a', 1), sol('c003', 'a', 1), sol('b001', 'a', 1)];
  const Γ0 = comprometerTodas(nuevaX(), [fijar('a', 10)]);
  const { delta, conflictos } = M.diferencia([...OB, ...OC], Γ0.estados.at(-1), instSid);
  assert.equal(delta.length, 5); assert.deepEqual(conflictos, []);
  const Γ = comprometerTodas(Γ0, delta);
  assert.equal(Γ.estados.at(-1).D.v.a, 15, 'unión: 10 + 5 solicitudes distintas');
  assert.notEqual(Math.min(10 + OB.length, 10 + OC.length), 15, 'combinar con min es incorrecto');
  assert.deepEqual(M.diferencia([...OB, ...OC, ...OB], Γ.estados.at(-1), instSid).delta, [], 'reenviar no cuenta dos veces');
  const conflicto = M.diferencia([sol('d001', 'a', 1), sol('d001', 'a', 2), sol('d002', 'b', 1)], Γ.estados.at(-1), instSid);
  assert.deepEqual(conflicto.conflictos, ['d001']); assert.deepEqual(conflicto.delta.map(o => o.sid), ['d002']);
});

// ═════════════════════════ L15 · tiempo de referencia ═════════════════════════
test('L15 una Π sensibleATiempo con t_ref distinto no se reutiliza y el checkpoint incluye t_ref', () => {
  const Γ = comprometerTodas(nuevaX(), [fijar('a', 1), fijar('b', 3)]);
  const proy = M.JUGUETE_PROY.umbral, m = Γ.entradas.length;
  const r1 = M.resolverProyeccion({ proy, guardado: null, trayectoria: Γ, m, registro: R, tRef: 2 });
  assert.deepEqual(r1.Y, ['b']); assert.equal(r1.checkpoint.tRef, 2);
  const r2 = M.resolverProyeccion({ proy, guardado: { Y: r1.Y, checkpoint: r1.checkpoint }, trayectoria: Γ, m, registro: R, tRef: 0 });
  assert.equal(r2.accion, 'RECONSTRUIR'); assert.deepEqual(r2.Y, ['a', 'b']);
  assert.equal(M.resolverProyeccion({ proy, guardado: { Y: r1.Y, checkpoint: r1.checkpoint }, trayectoria: Γ, m, registro: R, tRef: 2 }).accion, 'REUTILIZAR');
});

// ═════════════════════════ L16 · autoridad previa ═════════════════════════
test('L16 sin capacidad ⇒ NO_AUTORIZADO; mecanismo no constituyente ⇒ NO_CONSTITUYENTE; la API de réplica no ofrece AppendIfHead', () => {
  const Γ = nuevaX();
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...fijar('a', 1, 'intruso'), deps: [] }, { registro: R }).resultado, 'NO_AUTORIZADO');
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...fijar('a', 1, 'cajero'), deps: [] }, { registro: R }).resultado, 'NO_AUTORIZADO');
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...fijarP({ 'nucleo.capacidades': {} }, 'config'), deps: [] }, { registro: R }).resultado, 'NO_AUTORIZADO');
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'cajero', { ...sumar('a', 1, 'cajero'), deps: [] }, { registro: R }).resultado, 'NO_CONSTITUYENTE');
  const rep = M.apiReplica(M.crearAlmacenMemoria(), { registro: R });
  assert.deepEqual(Object.keys(rep).sort(), ['cabeza', 'crear', 'estado', 'incorporar', 'verificar']);
  assert.ok(!Object.values(rep).some(f => /append|anexar/i.test(f.name)));
});
paraTodoEscenario('L16 Incorporar en una réplica deja el mismo S (Sids incluidos) que el Fold del constituyente', run => {
  const Γ = run.ΓX;
  const rep = M.trayectoriaNueva(Γ.g, R).Γ;
  const r = M.incorporarEn(rep, M.cabezaDe(rep), Γ.bloques, M.cabezaDe(Γ), { registro: R, conocidas: { [STREAM_Y]: run.ΓY } });
  return r.resultado === 'INCORPORADO' && igual(r.Γ.estados.at(-1), Γ.estados.at(-1)) && igual(r.Γ.hashes, Γ.hashes);
});
test('L16 Teorema 3.1: tras el traspaso del constituyente, el antiguo mecanismo es rechazado y el nuevo constituye', () => {
  const Γ = comprometerTodas(nuevaX(), [sumar('a', 1), fijarP({ 'nucleo.constituyente': 'nuevo' })]);
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...sumar('a', 1), deps: [] }, { registro: R }).resultado, 'NO_CONSTITUYENTE');
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'nuevo', { ...sumar('a', 1), deps: [] }, { registro: R }).resultado, 'COMPROMETIDO');
  // el antiguo, con una cabeza anterior al traspaso, solo puede producir un FORK detectable (nunca un segundo sucesor en n+1)
  const cabVieja = { n: 1, h: Γ.hashes[1] };
  assert.equal(M.comprometer(Γ, cabVieja, 'dueño', { ...sumar('b', 1), deps: [] }, { registro: R }).resultado, 'CABEZA_CAMBIADA');
});

test('L16 FijarParámetro(m) exige capacidad para CADA p ∈ dom m (sin escalada de privilegios)', () => {
  const Γ = nuevaX();
  const intento = m => M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...fijarP(m, 'config'), deps: [] }, { registro: R }).resultado;
  assert.equal(intento({ 'límite': 'ninguno' }), 'COMPROMETIDO');
  assert.equal(intento({ 'límite': 'ninguno', 'nucleo.capacidades': { ...C.CAPS_X, config: ['*'] } }), 'NO_AUTORIZADO');
  assert.equal(intento({ 'nucleo.capacidades': { ...C.CAPS_X, config: ['*'] }, 'límite': 'ninguno' }), 'NO_AUTORIZADO');
  assert.equal(intento({ defecto: 3, 'nucleo.regla': 'contador@2' }), 'NO_AUTORIZADO', 'config no tiene FijarParámetro:nucleo.regla');
  assert.equal(intento({ defecto: 3, factor: 2 }), 'INADMISIBLE', 'autorizado para ambos; factor no está en Σ de contador@1 (G1 antes que la guarda)');
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { u: 'config', sid: nuevoSid(), tipo: 'Sellar', args: null, deps: [] }, { registro: R }).resultado, 'NO_AUTORIZADO');
  assert.equal(M.coincide('FijarParámetro:*', 'FijarParámetro:nucleo.regla'), true);
  assert.equal(M.coincide('FijarParámetro:lí', 'FijarParámetro:límite'), false);
});
test('L7 L22 Incorporar es atómico: una entrada que su propio contrato no admitía ⇒ DISCONTINUIDAD(i, READMISIÓN) y no se aplica NADA', () => {
  const Γ = comprometerTodas(nuevaX(), [sumar('a', 1)]);
  const forjada = { epoca: 0, u: 'cajero', sid: 'f0f0', deps: [], clase: 'contrato', tipo: 'FijarParámetro', args: { 'límite': 'ninguno' } };
  const b2 = M.encEntrada(forjada), h2 = M.hashPaso(Γ.hashes[1], b2);
  const rep = M.trayectoriaNueva(Γ.g, R).Γ;
  const r = M.incorporarEn(rep, M.cabezaDe(rep), [Γ.bloques[0], b2], { n: 2, h: h2 }, { registro: R });
  assert.equal(r.resultado, 'DISCONTINUIDAD'); assert.equal(r.i, 2); assert.equal(r.motivo, 'READMISIÓN'); assert.equal(r.Γ, undefined);
  const alm = M.crearAlmacenMemoria(); M.crear(alm, Γ.g, R);
  assert.equal(M.incorporar(alm, STREAM_X, { n: 0, h: Γ.hashes[0] }, [Γ.bloques[0], b2], { n: 2, h: h2 }, { registro: R }).resultado, 'DISCONTINUIDAD');
  assert.deepEqual(alm.cabeza(STREAM_X), { n: 0, h: Γ.hashes[0] }, 'nada aplicado');
  // sin re‑admisión (configuración del nodo «solo cadena») la cadena coherente se incorpora: la re‑admisión es lo que lo detecta
  assert.equal(M.incorporarEn(rep, M.cabezaDe(rep), [Γ.bloques[0], b2], { n: 2, h: h2 }, { registro: R, readmitir: false }).resultado, 'INCORPORADO');
  // época registrada falsa con cadena coherente ⇒ DISCONTINUIDAD(ÉPOCA)
  const b3 = M.encEntrada({ ...forjada, u: 'dueño', epoca: 5 }), h3 = M.hashPaso(Γ.hashes[1], b3);
  assert.deepEqual((({ resultado, i, motivo }) => ({ resultado, i, motivo }))(M.incorporarEn(rep, M.cabezaDe(rep), [Γ.bloques[0], b3], { n: 2, h: h3 }, { registro: R, readmitir: false })), { resultado: 'DISCONTINUIDAD', i: 2, motivo: 'ÉPOCA' });
});
test('L31 G3: una solicitud con ε_esperada distinta de la vigente ⇒ ÉPOCA_CAMBIADA; con la vigente se admite', () => {
  const Γ = comprometerTodas(nuevaX(), [fijarP({ defecto: 2 })]);
  const s = { ...sumar('a', 1), deps: [] };
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...s, epocaEsperada: 0 }, { registro: R }).resultado, 'ÉPOCA_CAMBIADA');
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...s, epocaEsperada: 2 }, { registro: R }).resultado, 'ÉPOCA_CAMBIADA');
  const ok = M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...s, epocaEsperada: 1 }, { registro: R });
  assert.equal(ok.resultado, 'COMPROMETIDO'); assert.equal(ok.epoca, 1);
  assert.equal(M.admitir(Γ.estados.at(-1), { epoca: 0, u: 'dueño', sid: 'e0e0', deps: [], clase: 'dominio', tipo: 'sumar', args: { clave: 'a', q: 1 } }, { registro: R }).rechazo, 'ÉPOCA_CAMBIADA');
});
test('L21 G4: dependencia desconocida, no alcanzada o con h distinto ⇒ DEPENDENCIA_NO_VERIFICABLE; la correcta se admite', () => {
  const ΓY = comprometerTodas(M.trayectoriaNueva(C.genesisY(), R).Γ, [fijar('k', 1)]);
  const Γ = nuevaX();
  const intento = (deps, conocidas = { [STREAM_Y]: ΓY }) => M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...sumar('a', 1), deps }, { registro: R, conocidas }).resultado;
  assert.equal(intento([{ stream: STREAM_Y, k: 1, h: ΓY.hashes[1] }]), 'COMPROMETIDO');
  assert.equal(intento([{ stream: STREAM_Y, k: 1, h: ΓY.hashes[0] }]), 'DEPENDENCIA_NO_VERIFICABLE');
  assert.equal(intento([{ stream: STREAM_Y, k: 2, h: ΓY.hashes[1] }]), 'DEPENDENCIA_NO_VERIFICABLE');
  assert.equal(intento([{ stream: STREAM_Y, k: 1, h: ΓY.hashes[1] }], {}), 'DEPENDENCIA_NO_VERIFICABLE');
  assert.equal(intento([{ stream: STREAM_Z, k: 0, h: ΓY.hashes[0] }, { stream: STREAM_Y, k: 1, h: ΓY.hashes[1] }]), 'INADMISIBLE', 'deps desordenadas ⇒ forma');
  // el requisito leído por la guarda de la regla (Lect) exige la dep en e.deps
  const req = { u: 'dueño', sid: nuevoSid(), tipo: 'sumar', args: { clave: 'a', q: 1, requiere: { stream: STREAM_Y, clave: 'k' } } };
  assert.deepEqual(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...req, deps: [] }, { registro: R, conocidas: { [STREAM_Y]: ΓY } }), { resultado: 'INADMISIBLE', motivo: 'requisito' });
  assert.deepEqual(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...req, deps: [{ stream: STREAM_Y, k: 0, h: ΓY.hashes[0] }] }, { registro: R, conocidas: { [STREAM_Y]: ΓY } }), { resultado: 'INADMISIBLE', motivo: 'requisito' });
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...req, deps: [{ stream: STREAM_Y, k: 1, h: ΓY.hashes[1] }] }, { registro: R, conocidas: { [STREAM_Y]: ΓY } }).resultado, 'COMPROMETIDO');
});
test('L22 un checkpoint de proyección cuyo h_n o ε_n no coincide con la Γ local ⇒ DISCONTINUIDAD y se reconstruye (no se aplican deltas a ciegas)', () => {
  const Γ = comprometerTodas(nuevaX(), [fijar('a', 1), fijar('b', 2), fijarP({ defecto: 3 }), sumar('c', 1)]);
  const otra = comprometerTodas(nuevaX(), [fijar('z', 9)]);
  for (const proy of [M.JUGUETE_PROY.coord, M.PROYECCIONES.cabeza, M.PROYECCIONES.epoca]) for (const m of [1, 4]) {
    const Y1 = oraculo(proy, otra, 1);
    const malos = [{ streamId: STREAM_X, n: 1, h: otra.hashes[1], ver: proy.ver, epoca: 0 }, { streamId: STREAM_X, n: 1, h: Γ.hashes[1], ver: proy.ver, epoca: 1 }, { streamId: STREAM_Y, n: 1, h: Γ.hashes[1], ver: proy.ver, epoca: 0 }, { streamId: STREAM_X, n: 9, h: Γ.hashes[1], ver: proy.ver, epoca: 0 }];
    for (const cp of malos) {
      const r = M.resolverProyeccion({ proy, guardado: { Y: Y1, checkpoint: cp }, trayectoria: Γ, m, registro: R });
      assert.equal(r.accion, 'DISCONTINUIDAD', `${proy.id} ${JSON.stringify(cp)}`); assert.deepEqual(r.Y, oraculo(proy, Γ, m));
    }
  }
});

// ═════════════════════════ L17 · la materialidad no cambia la respuesta ═════════════════════════
test('L17 AppendIfHead sobre la materialidad en memoria = modelo puro (mismos resultados, Γ y S)', async () => {
  for (let c = 0; c < Math.min(CASOS, 60); c++) {
    const { esc, run } = escenario(c);
    const out = await C.ejecutarAlmacen(M, esc, { registro: R });
    assert.deepEqual(out.logY, run.logY, `semilla ${SEMILLA + c}`);
    assert.deepEqual(out.logX, run.logX, `semilla ${SEMILLA + c}`);
    const Γ = M.leerTrayectoria(out.almacen, STREAM_X, R);
    assert.deepEqual(Γ.hashes, run.ΓX.hashes); assert.deepEqual(Γ.estados.at(-1), run.ΓX.estados.at(-1));
  }
});
paraTodoEscenario('L17 el mismo Γ serializado a bytes y reincorporado en otro almacén da los mismos S y Π', run => {
  const Γ = run.ΓX;
  const bytes = M.cv([Γ.gBytes, Γ.bloques, [M.cabezaDe(Γ).n, deHex(M.cabezaDe(Γ).h)]]);
  const [gB, bloques, [n, h]] = M.decCV(bytes);
  const alm = M.crearAlmacenMemoria();
  const r1 = M.crear(alm, M.decGenesis(gB), R); if (r1.resultado !== 'CREADO') return false;
  const ry = M.crear(alm, run.ΓY.g, R); alm.anexarSiCabeza(STREAM_Y, { n: 0, h: run.ΓY.hashes[0] }, run.ΓY.bloques, M.cabezaDe(run.ΓY));
  if (ry.resultado !== 'CREADO') return false;
  const r = M.incorporar(alm, STREAM_X, { n: 0, h: r1.h }, bloques, { n, h: hex(h) }, { registro: R });
  if (r.resultado !== 'INCORPORADO') return false;
  const S = M.estado(alm, STREAM_X, { registro: R });
  if (!igual(S, Γ.estados.at(-1))) return false;
  const Γ2 = M.leerTrayectoria(alm, STREAM_X, R);
  return Object.values(PROYS).every(p => igual(oraculo(p, Γ2, n, 1), oraculo(p, Γ, n, 1)));
}, 60);

// ═════════════════════════ L20 · ámbitos ═════════════════════════
test('L20 T_r no recibe Lect y ninguna operación del núcleo escribe en dos StreamID', () => {
  const llamadas = [];
  const espia = { ...M.CONTADOR_1, T: (...xs) => { llamadas.push(xs.length); return M.CONTADOR_1.T(...xs); } };
  const R2 = { ...R, 'contador@1': espia };
  const alm = M.crearAlmacenMemoria(); const escritos = [];
  const almEspia = Object.freeze({ ...alm, anexarSiCabeza: (s, ...xs) => { escritos.push(s); return alm.anexarSiCabeza(s, ...xs); } });
  M.crear(almEspia, C.genesisY(), R2);
  M.appendIfHead(almEspia, STREAM_Y, almEspia.cabeza(STREAM_Y), 'dueño', { ...fijar('a', 1), deps: [] }, { registro: R2 });
  M.crear(almEspia, C.genesisX(), R2);
  const cy = almEspia.cabeza(STREAM_Y);
  const r = M.appendIfHead(almEspia, STREAM_X, almEspia.cabeza(STREAM_X), 'dueño', { u: 'dueño', sid: nuevoSid(), tipo: 'sumar', args: { clave: 'a', q: 1, requiere: { stream: STREAM_Y, clave: 'a' } }, deps: [{ stream: STREAM_Y, k: cy.n, h: cy.h }] }, { registro: R2 });
  assert.equal(r.resultado, 'COMPROMETIDO', JSON.stringify(r));
  assert.deepEqual(escritos, [STREAM_Y, STREAM_X]);
  assert.deepEqual(almEspia.cabeza(STREAM_Y), cy);
  assert.ok(llamadas.length > 0 && llamadas.every(n => n === 3), `aridad de T: ${llamadas}`);
});
test('L20 mutante «T lee otra trayectoria»: la reconstrucción de X sin Y difiere del estado constituido', () => {
  let externo = 5; // estado de «otra trayectoria» que T no debe leer
  const malo = { ...M.CONTADOR_1, T: (D, e, P) => { const D2 = M.CONTADOR_1.T(D, e, P); return { ...D2, v: { ...D2.v, [e.args.clave]: D2.v[e.args.clave] + externo } }; } };
  const R2 = { ...R, 'contador@1': malo };
  let Γ = M.trayectoriaNueva(C.genesisX(), R2).Γ;
  Γ = M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { ...fijar('a', 1), deps: [] }, { registro: R2 }).Γ;
  externo = 0;
  assert.notDeepEqual(M.fold(M.estadoInicial(Γ.g, R2), Γ.entradas, R2), Γ.estados.at(-1), 'el mutante debe romper la reconstrucción por ámbito');
});

// ═════════════════════════ L21 · cortes causalmente cerrados ═════════════════════════
const hSint = (x, k) => (x * 1000 + k + 1).toString(16).padStart(64, '0');
function grafoAleatorio(r) {
  const S = [STREAM_X, STREAM_Y, STREAM_Z]; const tray = {};
  const largos = S.map(() => entero(r, 0, 4));
  S.forEach((X, xi) => { tray[X] = { hashes: Array.from({ length: largos[xi] + 1 }, (_, k) => hSint(xi, k)), entradas: [] }; });
  S.forEach((X, xi) => { for (let i = 0; i < largos[xi]; i++) {
    const deps = [];
    for (const [yi, Y] of S.entries()) if (yi !== xi && r() < 0.3) { const k = entero(r, 0, largos[yi]); deps.push({ stream: Y, k, h: hSint(yi, k) }); }
    tray[X].entradas.push({ deps });
  } });
  return { S, tray, largos };
}
function cortesBajo(σ, S) { // todos los σ' ≤ σ (ausente < 0 < 1 < …)
  let out = [{}];
  for (const X of S) { if (!Object.hasOwn(σ, X)) continue; const sig = []; for (const c of out) { sig.push(c); for (let n = 0; n <= σ[X]; n++) sig.push({ ...c, [X]: n }); } out = sig; }
  return out;
}
const leq = (a, b) => Object.keys(a).every(X => Object.hasOwn(b, X) && a[X] <= b[X]);
test('L21 cerrarCorte = mayor corte cerrado por fuerza bruta; máximo y mínimo de cerrados son cerrados (Teorema 7.2)', () => {
  const r = prng(SEMILLA ^ 0x2121);
  for (let caso = 0; caso < 1500; caso++) {
    const { S, tray, largos } = grafoAleatorio(r);
    const σ = {}; S.forEach((X, xi) => { if (r() < 0.85) σ[X] = entero(r, 0, largos[xi]); });
    const cerrados = cortesBajo(σ, S).filter(c => M.esCerrado(c, tray));
    const res = M.cerrarCorte(σ, tray);
    assert.equal(res.resultado, 'CERRADO');
    assert.ok(M.esCerrado(res.σ, tray), `caso ${caso}: no cerrado`);
    assert.ok(cerrados.every(c => leq(c, res.σ)), `caso ${caso}: hay un cerrado que no está por debajo`);
    assert.ok(cerrados.some(c => igual(c, res.σ)));
    for (let j = 0; j < 4 && cerrados.length; j++) {
      const a = elegir(r, cerrados), b = elegir(r, cerrados);
      const max = {}, min = {};
      for (const X of new Set([...Object.keys(a), ...Object.keys(b)])) max[X] = Math.max(a[X] ?? -1, b[X] ?? -1);
      for (const X of Object.keys(a)) if (Object.hasOwn(b, X)) min[X] = Math.min(a[X], b[X]);
      assert.ok(M.esCerrado(max, tray) && M.esCerrado(min, tray), `caso ${caso}: retículo`);
    }
  }
});
test('L21 un corte no cerrado no se proyecta; una dep con h distinto del local ⇒ DIVERGENCIA_DEP; lectura estable (Teorema 7.6)', () => {
  let ΓY = M.trayectoriaNueva(C.genesisY(), R).Γ; ΓY = comprometerTodas(ΓY, [fijar('k', 1)]);
  let ΓX = nuevaX();
  ΓX = comprometerTodas(ΓX, [{ u: 'dueño', sid: nuevoSid(), tipo: 'sumar', args: { clave: 'a', q: 1, requiere: { stream: STREAM_Y, clave: 'k' } }, deps: [{ stream: STREAM_Y, k: 1, h: ΓY.hashes[1] }] }], { [STREAM_Y]: ΓY });
  ΓY = comprometerTodas(ΓY, [sumar('k', 3), sumar('z', 1)]);
  const tray = { [STREAM_X]: ΓX, [STREAM_Y]: ΓY };
  const φ = est => est[STREAM_X].D.v.a;
  assert.deepEqual(M.proyectarCorte({ [STREAM_X]: 1, [STREAM_Y]: 0 }, tray, R, φ), { resultado: 'NO_CERRADO' });
  assert.deepEqual(M.proyectarCorte({ [STREAM_X]: 1 }, tray, R, φ), { resultado: 'NO_CERRADO' });
  assert.deepEqual(M.proyectarCorte({ [STREAM_X]: 1, [STREAM_Y]: 1 }, tray, R, φ), { resultado: 'OK', valor: 1 });
  assert.deepEqual(M.cerrarCorte({ [STREAM_X]: 1, [STREAM_Y]: 0 }, tray), { resultado: 'CERRADO', σ: { [STREAM_X]: 0, [STREAM_Y]: 0 } });
  // lectura estable: «existe k» valía en 1 y vale en todo corte cerrado posterior de Y
  for (let n = 1; n <= ΓY.entradas.length; n++) assert.ok(M.CONTADOR_1.estables.existe(ΓY.estados[n].D, 'k'));
  // otra copia de Y con un hash distinto en la posición citada
  const ΓY2 = comprometerTodas(M.trayectoriaNueva(C.genesisY(), R).Γ, [fijar('k', 2)]);
  assert.deepEqual(M.cerrarCorte({ [STREAM_X]: 1, [STREAM_Y]: 1 }, { [STREAM_X]: ΓX, [STREAM_Y]: ΓY2 }), { resultado: 'DIVERGENCIA_DEP', X: STREAM_X, i: 1, Y: STREAM_Y });
});

// ═════════════════════════ L22 · continuidad verificable ═════════════════════════
paraTodoEscenario('L22 una réplica con un checkpoint anterior aplica solo el sufijo, verificando la cadena', run => {
  const Γ = run.ΓX, n = Γ.entradas.length;
  for (const k of new Set([0, Math.floor(n / 2), n])) {
    let rep = M.trayectoriaNueva(Γ.g, R).Γ;
    const r1 = M.incorporarEn(rep, M.cabezaDe(rep), Γ.bloques.slice(0, k), { n: k, h: Γ.hashes[k] }, { registro: R, conocidas: { [STREAM_Y]: run.ΓY } });
    if (r1.resultado !== 'INCORPORADO') return false; rep = r1.Γ;
    const r2 = M.incorporarEn(rep, M.cabezaDe(rep), Γ.bloques.slice(k), M.cabezaDe(Γ), { registro: R, conocidas: { [STREAM_Y]: run.ΓY } });
    if (r2.resultado !== 'INCORPORADO' || !igual(r2.Γ.estados.at(-1), Γ.estados.at(-1))) return false;
    // aplicar el sufijo desde una cabeza que no es la local ⇒ CABEZA_CAMBIADA, nada aplicado
    if (k > 0 && M.incorporarEn(rep, { n: 0, h: Γ.hashes[0] }, Γ.bloques, M.cabezaDe(Γ), { registro: R }).resultado !== 'CABEZA_CAMBIADA') return false;
  }
  return true;
}, 60);
paraTodoEscenario('L22 manipular un byte, truncar o reordenar ⇒ DISCONTINUIDAD(i ≤ posición alterada) y no se aplica nada', (run, esc) => {
  const Γ = run.ΓX, n = Γ.entradas.length; if (n < 2) return true;
  const r = prng(n * 7 + esc.propX.length);
  const rep = M.trayectoriaNueva(Γ.g, R).Γ;
  const i = entero(r, 1, n);
  const byte = Γ.bloques.map((b, j) => (j === i - 1 ? Uint8Array.from(b, (x, t) => (t === entero(r, 0, b.length - 1) ? x ^ (1 << entero(r, 0, 7)) : x)) : b));
  const reord = [...Γ.bloques]; [reord[i - 1], reord[i % n]] = [reord[i % n], reord[i - 1]];
  const variantes = [[byte, i], [Γ.bloques.slice(0, n - 1), n], [reord, Math.min(i, (i % n) + 1)]];
  for (const [bl, pos] of variantes) {
    if (bl.length === n && bl.every((b, j) => hex(b) === hex(Γ.bloques[j]))) continue; // el intercambio pudo dejarlo igual
    const res = M.incorporarEn(rep, M.cabezaDe(rep), bl, M.cabezaDe(Γ), { registro: R, conocidas: { [STREAM_Y]: run.ΓY } });
    if (res.resultado !== 'DISCONTINUIDAD' || !(res.i >= 1 && res.i <= pos) || res.Γ) return false;
    const v = M.verificar({ ...copiaDe(Γ), bloques: bl });
    if (v.resultado !== 'DISCONTINUIDAD' || !(v.i <= pos)) return false;
  }
  return true;
});
test('L22 Resolver clasifica EXACTO, CADENA, FORK(c), GÉNESIS_DISTINTA y SIN_EVIDENCIA; búsqueda binaria = lineal', () => {
  const vistos = new Set();
  for (let c = 0; c < CASOS; c++) {
    const Γ = escenario(c).run.ΓX, n = Γ.entradas.length, r = prng(SEMILLA + 77 * c);
    const a = entero(r, 0, n), b = entero(r, 0, n);
    const casos = [[Γ.hashes.slice(0, a + 1), Γ.hashes.slice(0, b + 1), a === b ? 'EXACTO' : 'CADENA', Math.min(a, b)]];
    const k = entero(r, 0, n); const pre = { ...Γ, entradas: Γ.entradas.slice(0, k), bloques: Γ.bloques.slice(0, k), hashes: Γ.hashes.slice(0, k + 1), estados: Γ.estados.slice(0, k + 1) };
    const rama = M.comprometer(pre, M.cabezaDe(pre), Γ.estados[k].parametros['nucleo.constituyente'], { u: 'dueño', sid: 'fe' + hex(Uint8Array.of(c)), tipo: 'Sellar', args: null, deps: [] }, { registro: R });
    if (rama.Γ && k < n) casos.push([Γ.hashes, [...rama.Γ.hashes, ...(r() < 0.5 ? [C.HASH_FALSO] : [])], 'FORK', k]);
    const otraG = M.trayectoriaNueva(C.genesisX({ 'límite': 'ninguno' }), R).Γ;
    casos.push([Γ.hashes, otraG.hashes, 'GÉNESIS_DISTINTA', -1]);
    if (n > 0) { const hueco = [...Γ.hashes]; hueco[entero(r, 0, n)] = null; casos.push([hueco, Γ.hashes, 'SIN_EVIDENCIA', undefined]); }
    for (const [hA, hB, esperado, cEsp] of casos) {
      const l = M.resolver(hA, hB), bin = M.resolverBinario(hA, hB);
      assert.equal(l.resultado, esperado, `semilla ${SEMILLA + c}`); assert.deepEqual(bin, l);
      if (cEsp !== undefined) assert.equal(l.c, cEsp);
      assert.deepEqual(M.resolver(hB, hA).resultado, esperado);
      vistos.add(esperado);
    }
  }
  assert.deepEqual([...vistos].sort(), ['CADENA', 'EXACTO', 'FORK', 'GÉNESIS_DISTINTA', 'SIN_EVIDENCIA']);
});

// ═════════════════════════ L23 · integridad ≠ corrección ═════════════════════════
test('L23 un snapshot con Q correcto y S_n mal calculado NO se detecta por Q (límite: solo la reconstrucción lo detecta)', () => {
  const Γ = comprometerTodas(nuevaX(), [fijar('a', 1), sumar('a', 1)]);
  const malo = structuredClone(Γ.estados[2]); malo.D.v.a = 99;
  const snap = M.crearSnapshot(malo, Γ.hashes[2], R);
  const S = M.restaurarSnapshot(snap, Γ.hashes, R);
  assert.ok(S, 'Q no detecta un S_n mal calculado (es el límite documentado)');
  assert.notDeepEqual(S, M.fold(M.estadoInicial(Γ.g, R), Γ.entradas, R), 'la reconstrucción (oráculo) sí lo detecta');
});

// ═════════════════════════ L25 / L26 · procedencia e identidad ═════════════════════════
test('L25 Compose conserva procedencia y rechaza dos autoridades sobre el mismo hecho; la misma posición en dos StreamID no se identifica', () => {
  const ok = M.componer([{ streamId: STREAM_X, hechos: { 'x.1': 3 } }, { streamId: STREAM_Y, hechos: { 'y.1': 4 } }]);
  assert.deepEqual(ok, { resultado: 'COMPUESTO', hechos: { 'x.1': { streamId: STREAM_X, valor: 3 }, 'y.1': { streamId: STREAM_Y, valor: 4 } } });
  assert.deepEqual(M.componer([{ streamId: STREAM_X, hechos: { h: 1 } }, { streamId: STREAM_Y, hechos: { h: 1 } }]), { resultado: 'CONFLICTO', clave: 'h', streams: [STREAM_X, STREAM_Y] });
  const ΓA = comprometerTodas(nuevaX(), [fijar('a', 1)]);
  const ΓB = comprometerTodas(M.trayectoriaNueva(C.genesisY(), R).Γ, [fijar('a', 1)]);
  assert.notEqual(ΓA.hashes[1], ΓB.hashes[1], 'la posición 1 de dos trayectorias no designa lo mismo');
});
test('L26 StreamID no se deriva del contenido de la génesis; la misma StreamID con dos génesis ⇒ GÉNESIS_DISTINTA', () => {
  const g1 = C.genesisX(), g2 = { ...C.genesisX(), streamId: STREAM_Z };
  assert.equal(hex(M.encGenesis(g1)).length > 0, true);
  assert.notEqual(M.hashGenesis(g1), M.hashGenesis(g2), 'misma C0, distinta identidad acuñada');
  const g3 = C.genesisX({ 'límite': 'ninguno' });
  assert.equal(M.resolver([M.hashGenesis(g1)], [M.hashGenesis(g3)]).resultado, 'GÉNESIS_DISTINTA');
  const alm = M.crearAlmacenMemoria(); assert.equal(M.crear(alm, g1, R).resultado, 'CREADO'); assert.equal(M.crear(alm, g3, R).resultado, 'EXISTE');
  assert.equal(M.crear(alm, { ...g1, streamId: 'zz' }, R).resultado, 'INADMISIBLE');
});

// ═════════════════════════ L27 · persistir causas, reconstruir consecuencias ═════════════════════════
paraTodoEscenario('L27 borrar proyecciones, snapshots y Π_hashes y reconstruir desde Γ da resultados idénticos', run => {
  const Γ = run.ΓX, m = Γ.entradas.length;
  const snaps = [0, Math.floor(m / 2)].map(k => M.crearSnapshot(Γ.estados[k], Γ.hashes[k], R));
  for (const proy of Object.values(PROYS)) {
    const conTodo = M.resolverProyeccion({ proy, guardado: null, trayectoria: Γ, m, registro: R, snapshots: snaps, tRef: 1 });
    const sinNada = M.resolverProyeccion({ proy, guardado: null, trayectoria: { ...M.leerTrayectoria((() => { const a = M.crearAlmacenMemoria(); M.crear(a, Γ.g, R); a.anexarSiCabeza(Γ.streamId, { n: 0, h: Γ.hashes[0] }, Γ.bloques, M.cabezaDe(Γ)); return a; })(), Γ.streamId) }, m, registro: R, tRef: 1 });
    if (!igual(conTodo.Y, sinNada.Y) || conTodo.desde !== Math.floor(m / 2) || sinNada.desde !== 0) return false;
  }
  return true;
}, 40);
test('L27 proyección y checkpoint en dos put interrumpidos se leen incoherentes; en un solo registro (M4) nunca', () => {
  const Γ = comprometerTodas(nuevaX(), [fijar('a', 1), fijar('b', 2), sumar('a', 5)]);
  const proy = M.JUGUETE_PROY.coord; // incremental: un checkpoint viejo con Y nuevo da un resultado erróneo sin aviso
  const res = k => M.resolverProyeccion({ proy, guardado: null, trayectoria: Γ, m: k, registro: R });
  const viejo = res(1), nuevo = res(3);
  // mutante: dos put; se escribe Y nuevo y se interrumpe antes del checkpoint
  const dosPut = { Y: nuevo.Y, checkpoint: viejo.checkpoint };
  const leido = M.resolverProyeccion({ proy, guardado: dosPut, trayectoria: Γ, m: 1, registro: R });
  assert.notDeepEqual(leido.Y, oraculo(proy, Γ, 1), 'el mutante de dos put debe producir una lectura incorrecta');
  // M4: el registro es una unidad; tras una interrupción se lee el anterior completo o el nuevo completo
  const alm = M.crearAlmacenMemoria(); alm.guardar('proy', { Y: viejo.Y, checkpoint: viejo.checkpoint });
  for (const reg of [alm.leerRegistro('proy'), (alm.guardar('proy', { Y: nuevo.Y, checkpoint: nuevo.checkpoint }), alm.leerRegistro('proy'))]) {
    const r = M.resolverProyeccion({ proy, guardado: reg, trayectoria: Γ, m: reg.checkpoint.n, registro: R });
    assert.deepEqual(r.Y, oraculo(proy, Γ, reg.checkpoint.n));
  }
});

// ═════════════════════════ L28 / L29 · coordenadas emergentes y alineación (esbozo de instancia) ═════════════════════════
const migraConservaEstables = (origen, migra, muestras) => muestras.every(D => Object.entries(origen.estables).every(([nombre, P]) => {
  const args = nombre === 'existe' ? D.orden.map(k => [k]) : D.orden.map((k, i) => [i + 1, k]);
  return args.every(a => !P(D, ...a) || P(migra(D), ...a));
}));
test('L28 Π_coord es congruente y estable bajo extensión; una Migra que reordena T viola Estables y no es registrable', () => {
  for (let c = 0; c < CASOS; c++) {
    const Γ = escenario(c).run.ΓX; let prev = [];
    for (let k = 0; k < Γ.estados.length; k++) {
      const T = oraculo(M.JUGUETE_PROY.coord, Γ, k);
      assert.deepEqual(T.slice(0, prev.length), prev, `semilla ${SEMILLA + c}: T_${k} no extiende a T_${k - 1}`);
      assert.equal(new Set(T).size, T.length, 'ninguna posición se reutiliza'); prev = T;
    }
  }
  const muestras = universoPequeño(2).map(S => S.D).filter(D => D.orden.length >= 1).concat([{ orden: ['a', 'b'], v: { a: 1, b: 2 } }]);
  assert.ok(migraConservaEstables(M.CONTADOR_1, M.CONTADOR_2.migraDesde['contador@1'], muestras));
  const reordena = D => ({ orden: [...D.orden].reverse(), v: D.v, ops: 0 });
  assert.equal(migraConservaEstables(M.CONTADOR_1, reordena, muestras), false, 'una Migra que reordena T debe detectarse');
});
test('L29 un Flat construido con T_n sigue siendo correcto con T_m sin reescribirse (defecto en las posiciones nuevas)', () => {
  for (let c = 0; c < CASOS; c++) {
    const { ΓY, ΓX } = escenario(c).run; const SX = ΓX.estados.at(-1);
    if (!String(SX.parametros['nucleo.regla']).startsWith('contador')) continue;
    const defecto = SX.parametros.defecto;
    const flat = T => T.map(k => (Object.hasOwn(SX.D.v, k) ? SX.D.v[k] : defecto));
    const Tm = ΓY.estados.at(-1).D.orden;
    for (let n = 0; n < ΓY.estados.length; n++) {
      const Tn = ΓY.estados[n].D.orden, Vn = flat(Tn), Vm = flat(Tm);
      assert.deepEqual(Vm.slice(0, Vn.length), Vn);
      Tm.slice(Tn.length).forEach((k, j) => { if (!Object.hasOwn(SX.D.v, k)) assert.equal(Vm[Tn.length + j], defecto); });
    }
  }
});

// ═════════════════════════ L30 · diferencia ═════════════════════════
// Las cinco instancias de §7.8 como DATOS (U, id, rec) sobre la MISMA función M.diferencia.
const contentId = B => M.derivar('kobalt:juguete:contenido:1', B);
const INSTANCIAS = {
  importar: { id: o => o.sid, rec: (o, S) => Object.hasOwn(S.sids, o.sid) || (o.tipo === 'fijar' && S.D.v?.[o.args.clave] === o.args.v), reconocidos: S => Object.keys(S.sids) },
  faltantes: { id: o => o.sid, rec: (o, S) => Object.hasOwn(S.sids, o.sid) },
  sincronizar: { id: o => `${o.k}:${o.h}`, rec: (o, hs) => o.k < hs.length && hs[o.k] === o.h, reconocidos: hs => hs.map((h, k) => `${k}:${h}`).slice(1) },
  actualizar: { id: o => `${o.k}:${o.h}:${o.ver}:${o.tRef}`, rec: (o, A) => o.k <= A.c.n && A.hashes[A.c.n] === A.c.h && o.ver === A.c.ver && o.tRef === (A.c.tRef ?? null),
    reconocidos: A => (A.hashes[A.c.n] === A.c.h ? Array.from({ length: A.c.n }, (_, j) => `${j + 1}:${A.hashes[j + 1]}:${A.c.ver}:${A.c.tRef ?? null}`) : []) },
  adquirir: { id: o => o.Q, rec: (o, local) => local.has(o.Q) && contentId(local.get(o.Q)) === o.Q, reconocidos: local => [...local.keys()] },
};
const archivoA = [['a', 3], ['b', 1], ['c', 4], ['d', 1]];
const objetivoImportar = (archivo, relativo = false, sidFn) => archivo.map((fila, j) => ({ u: 'dueño', sid: sidFn ? sidFn(fila, j) : M.deriveSid('imp:juguete', ['archivoA', j, fila]),
  tipo: relativo ? 'sumar' : 'fijar', args: relativo ? { clave: fila[0], q: fila[1] } : { clave: fila[0], v: fila[1] }, deps: [] }));
function aplicar(Γ, delta) { let n = 0; for (const o of delta) { const r = M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', o, { registro: R }); if (r.Γ) { Γ = r.Γ; n++; } } return { Γ, n }; }
test('L30 Δ1 idempotencia, Δ2 objetivo reconocido ⇒ ∅ y Δ3 antitonía de rec_id, con la misma función sobre las cinco instancias', () => {
  const O = objetivoImportar(archivoA); let Γ = nuevaX();
  const d0 = M.diferencia(O, Γ.estados.at(-1), INSTANCIAS.importar);
  assert.equal(d0.delta.length, 4);
  assert.deepEqual(M.diferencia(d0.delta, Γ.estados.at(-1), INSTANCIAS.importar).delta, d0.delta, 'Δ1');
  const pasos = [Γ.estados.at(-1)];
  for (const o of d0.delta) { Γ = aplicar(Γ, [o]).Γ; pasos.push(Γ.estados.at(-1)); }
  for (let i = 1; i < pasos.length; i++) {
    const a = M.diferencia(O, pasos[i - 1], INSTANCIAS.faltantes).delta.map(o => o.sid), b = M.diferencia(O, pasos[i], INSTANCIAS.faltantes).delta.map(o => o.sid);
    assert.ok(b.every(s => a.includes(s)), 'Δ3 antitonía con rec_id');
  }
  assert.deepEqual(M.diferencia(O, Γ.estados.at(-1), INSTANCIAS.importar).delta, [], 'Δ2');
  // adquirir: material local verificado por Q
  const B1 = te.encode('uno'), B2 = te.encode('dos'), Q1 = contentId(B1), Q2 = contentId(B2);
  const local = new Map([[Q1, B1], [Q2, te.encode('corrupto')]]);
  const dA = M.diferencia([{ Q: Q1 }, { Q: Q2 }, { Q: Q1 }], local, INSTANCIAS.adquirir);
  assert.deepEqual(dA.delta, [{ Q: Q2 }]);
  local.set(Q2, B2); assert.deepEqual(M.diferencia([{ Q: Q1 }, { Q: Q2 }], local, INSTANCIAS.adquirir).delta, [], 'Δ2 adquirir');
  local.set(contentId(te.encode('sobra')), te.encode('sobra'));
  assert.equal(M.diferencia([{ Q: Q1 }], local, INSTANCIAS.adquirir).exceso.length, 2, 'Exceso se informa y nunca se borra');
});
test('L30 importar dos veces ⇒ 0 compromisos; reaplicar un Δ antiguo ⇒ YA_COMPROMETIDO (Δ4); interrumpir y reanudar = no interrumpir (Δ5)', () => {
  const O = objetivoImportar(archivoA);
  const Γ0 = comprometerTodas(nuevaX(), [fijarP({ 'límite': 'ninguno' })]);
  const d1 = M.diferencia(O, Γ0.estados.at(-1), INSTANCIAS.importar).delta;
  const { Γ: Γ1, n: n1 } = aplicar(Γ0, d1); assert.equal(n1, 4);
  const d2 = M.diferencia(O, Γ1.estados.at(-1), INSTANCIAS.importar).delta; assert.deepEqual(d2, []);
  const { n: n2 } = aplicar(Γ1, d1); assert.equal(n2, 0, 'reaplicar el Δ viejo no produce doble efecto');
  for (let k = 0; k <= d1.length; k++) {
    const { Γ: Γk } = aplicar(Γ0, d1.slice(0, k));
    const resto = M.diferencia(O, Γk.estados.at(-1), INSTANCIAS.faltantes).delta;
    assert.deepEqual(resto, d1.slice(k), 'Δ(O, A′) = Δ(O, A) ∖ Q');
    assert.deepEqual(aplicar(Γk, resto).Γ.hashes, Γ1.hashes, 'reanudar = no interrumpir');
  }
});
test('L30 H1: un sid aleatorio por intento con acción relativa duplica el efecto (la hipótesis es necesaria)', () => {
  const Γ0 = nuevaX(); const r = prng(SEMILLA);
  const aleatorio = () => hex(Uint8Array.from({ length: 8 }, () => entero(r, 0, 255)));
  const intento = Γ => { const O = objetivoImportar(archivoA, true, aleatorio); return aplicar(Γ, M.diferencia(O, Γ.estados.at(-1), INSTANCIAS.faltantes).delta).Γ; };
  const doble = intento(intento(Γ0)).estados.at(-1).D.v;
  assert.deepEqual(doble, { a: 6, b: 2, c: 8, d: 2 }, 'contraejemplo de H1: doble efecto');
  const determinista = Γ => { const O = objetivoImportar(archivoA, true); return aplicar(Γ, M.diferencia(O, Γ.estados.at(-1), INSTANCIAS.faltantes).delta).Γ; };
  assert.deepEqual(determinista(determinista(Γ0)).estados.at(-1).D.v, { a: 3, b: 1, c: 4, d: 1 });
});
test('L30 sincronizar: prefijo ⇒ Δ es el sufijo contiguo; divergencia ⇒ Δ contiene posiciones ≤ n (Corolario 7.9); resolución = Δ (Corolario 7.10)', () => {
  for (let c = 0; c < CASOS; c++) {
    const Γ = escenario(c).run.ΓX, n = Γ.entradas.length; if (n < 2) continue;
    const r = prng(SEMILLA + 3 * c); const k = entero(r, 0, n - 1);
    const remota = Γ.hashes.map((h, j) => ({ k: j, h })).slice(1);
    const local = Γ.hashes.slice(0, k + 1);
    const d = M.diferencia(remota, local, INSTANCIAS.sincronizar).delta.map(o => o.k);
    assert.deepEqual(d, Array.from({ length: n - k }, (_, j) => k + 1 + j), 'sufijo contiguo');
    const pre = { ...Γ, entradas: Γ.entradas.slice(0, k), bloques: Γ.bloques.slice(0, k), hashes: Γ.hashes.slice(0, k + 1), estados: Γ.estados.slice(0, k + 1) };
    const rama = M.comprometer(pre, M.cabezaDe(pre), Γ.estados[k].parametros['nucleo.constituyente'], { u: 'dueño', sid: 'fd01', tipo: 'Sellar', args: null, deps: [] }, { registro: R });
    if (rama.Γ) {
      const dF = M.diferencia(remota, rama.Γ.hashes, INSTANCIAS.sincronizar).delta.map(o => o.k);
      assert.ok(dF.some(j => j <= rama.Γ.entradas.length), 'FORK ⇔ Δ contiene una posición ocupada localmente');
      assert.equal(M.resolver(Γ.hashes, rama.Γ.hashes).resultado, 'FORK');
    }
    // Corolario 7.10 con una proyección incremental no sensible a época
    const proy = M.JUGUETE_PROY.coord;
    for (const [nc, hc] of [[k, Γ.hashes[k]], [n, Γ.hashes[n]], [k, C.HASH_FALSO]]) for (const m of [k, n]) {
      const cp = { streamId: Γ.streamId, n: nc, h: hc, ver: 1, epoca: Γ.estados[nc].epoca };
      const O = Array.from({ length: m }, (_, j) => ({ k: j + 1, h: Γ.hashes[j + 1], ver: 1, tRef: null }));
      const { delta, exceso } = M.diferencia(O, { c: cp, hashes: Γ.hashes }, INSTANCIAS.actualizar);
      const acc = M.resolverProyeccion({ proy, guardado: { Y: oraculo(proy, Γ, Math.min(nc, n)), checkpoint: cp }, trayectoria: Γ, m, registro: R }).accion;
      const recFalso = Γ.hashes[nc] !== hc;
      const esperado = recFalso ? 'DISCONTINUIDAD' : (delta.length === 0 && exceso.length === 0) ? 'REUTILIZAR' : exceso.length === 0 ? 'ACTUALIZAR' : 'RECONSTRUIR';
      assert.equal(acc, esperado, `semilla ${SEMILLA + c} nc=${nc} m=${m}`);
      if (esperado === 'ACTUALIZAR') assert.deepEqual(delta.map(o => o.k), Array.from({ length: m - nc }, (_, j) => nc + 1 + j));
    }
  }
});

// ═════════════════════════ L31 · fijar frente a abrir ═════════════════════════
test('L31 FijarParámetro abre exactamente una época; sinCambio; regla sin Migra ⇒ rechazo; autobloqueo; parámetros totales y tipados (V5)', () => {
  let Γ = nuevaX(); const S0 = Γ.estados[0];
  assert.deepEqual(S0.parametros, { ...C.genesisX().C0, 'nucleo.derivación': 'kobalt:nucleo:1', 'nucleo.retenciónSids': 'ilimitada', 'límite': '≥0', defecto: 0 });
  const intentar = sol => M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { deps: [], ...sol }, { registro: R });
  assert.deepEqual(intentar(fijarP({ 'límite': '≥0' })), { resultado: 'INADMISIBLE', motivo: 'sinCambio' });
  assert.deepEqual(intentar(fijarP({ 'nucleo.regla': 'conjunto@1' })), { resultado: 'INADMISIBLE', motivo: 'sinMigracion' });
  assert.deepEqual(intentar(fijarP({ factor: 3 })), { resultado: 'INADMISIBLE', motivo: 'parametroDesconocido' });
  assert.deepEqual(intentar(fijarP({ defecto: 1.5 })), { resultado: 'INADMISIBLE', motivo: 'forma' });
  assert.deepEqual(intentar(fijarP({ defecto: 'otro' })), { resultado: 'INADMISIBLE', motivo: 'fueraDeDominio' });
  assert.deepEqual(intentar(fijarP({ 'nucleo.capacidades': { 'dueño': ['sumar'] } })), { resultado: 'INADMISIBLE', motivo: 'autobloqueo' });
  assert.deepEqual(intentar(fijarP({})), { resultado: 'INADMISIBLE', motivo: 'forma' });
  const r = intentar(fijarP({ 'nucleo.regla': 'contador@2', defecto: 1 }));
  assert.equal(r.resultado, 'COMPROMETIDO'); Γ = r.Γ;
  const S1 = Γ.estados.at(-1);
  assert.equal(S1.epoca, 1); assert.equal(Γ.entradas[0].epoca, 0);
  assert.deepEqual({ factor: S1.parametros.factor, defecto: S1.parametros.defecto, 'límite': S1.parametros['límite'] }, { factor: 2, defecto: 1, 'límite': '≥0' });
  assert.deepEqual(S1.D, { orden: [], v: {}, ops: 0 }, 'Migra aplicada');
  assert.deepEqual(intentar(fijarP({ 'límite': 'ninguno' })).epoca, 1, 'la entrada registra la época anterior al cambio');
  // guardaPar de la regla (vi)
  Γ = comprometerTodas(Γ, [fijarP({ 'límite': 'ninguno' }), fijar('a', -1)]);
  assert.deepEqual(intentar(fijarP({ 'límite': '≥0' })), { resultado: 'INADMISIBLE', motivo: 'negativos' });
  assert.equal(Γ.estados.at(-1).epoca, 2);
});
test('L31 la configuración del nodo vive en Γ_Nodo con la regla nucleo.nodo@1 y los valores iniciales de §3.5', () => {
  const gN = { streamId: '0d'.repeat(16), predecesor: null, C0: { 'nucleo.regla': 'nucleo.nodo@1', 'nucleo.constituyente': 'nodo' } };
  let Γ = M.trayectoriaNueva(gN, R).Γ; const P = Γ.estados[0].parametros;
  assert.deepEqual(Object.fromEntries(Object.entries(P).filter(([k]) => k.startsWith('nodo.'))), {
    'nodo.reintentos': 3, 'nodo.verificarAlAbrir': 'completa', 'nodo.verificarAlIncorporar': 'cadena+readmisión',
    'nodo.anteFork': 'suspender', 'nodo.materialización': 'bajoDemanda', 'nodo.snapshots': 'bajoDemanda' });
  assert.equal(M.REGLA_NODO.id, 'nucleo.nodo@1'); assert.deepEqual(Object.keys(M.REGLA_NODO.tipos), []);
  const r = M.comprometer(Γ, M.cabezaDe(Γ), 'nodo', { u: 'nodo', sid: '0001', tipo: 'FijarParámetro', args: { 'nodo.snapshots': { cada: 50 } }, deps: [] }, { registro: R });
  assert.equal(r.resultado, 'COMPROMETIDO'); Γ = r.Γ; assert.equal(Γ.estados.at(-1).epoca, 1);
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'nodo', { u: 'nodo', sid: '0002', tipo: 'sumar', args: { clave: 'a', q: 1 }, deps: [] }, { registro: R }).resultado, 'INADMISIBLE');
});
test('L31 retenciónSids = ventana(N) rompe la deduplicación de reintentos más antiguos que N (contraejemplo §4.3)', () => {
  let Γ = comprometerTodas(nuevaX({ 'nucleo.retenciónSids': { ventana: 2 } }), []);
  const s0 = { u: 'dueño', sid: 'abcd', tipo: 'sumar', args: { clave: 'a', q: 1 }, deps: [] };
  Γ = comprometerTodas(Γ, [s0]);
  assert.equal(M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', s0, { registro: R }).resultado, 'YA_COMPROMETIDO');
  Γ = comprometerTodas(Γ, [sumar('b', 1), sumar('c', 1)]);
  assert.deepEqual(Object.keys(Γ.estados.at(-1).sids).length, 2);
  Γ = comprometerTodas(Γ, [s0]);
  assert.equal(Γ.estados.at(-1).D.v.a, 2, 'el reintento fuera de la ventana duplica el efecto');
});

// ═════════════════════════ Cobertura del generador (no es una ley: evita pruebas vacías) ═════════════════════════
test('generador: produce compromisos, los rechazos exigidos por §8, épocas, cambio de regla, deps y sellos', () => {
  const tot = {};
  let epocas = 0, migr = 0, deps = 0, sellos = 0;
  for (let c = 0; c < CASOS; c++) {
    const { run } = escenario(c);
    for (const l of run.logX) tot[l.resultado] = (tot[l.resultado] ?? 0) + 1;
    const S = run.ΓX.estados.at(-1); epocas += S.epoca; if (S.parametros['nucleo.regla'] === 'contador@2') migr++; if (S.sellado) sellos++;
    deps += run.ΓX.entradas.filter(e => e.deps.length).length;
  }
  for (const k of ['COMPROMETIDO', 'NO_AUTORIZADO', 'INADMISIBLE', 'YA_COMPROMETIDO', 'ÉPOCA_CAMBIADA', 'CABEZA_CAMBIADA', 'NO_CONSTITUYENTE', 'DEPENDENCIA_NO_VERIFICABLE', 'SELLADO'])
    assert.ok((tot[k] ?? 0) >= 10, `${k}: ${tot[k] ?? 0} — ${JSON.stringify(tot)}`);
  assert.ok(epocas > 50 && migr > 3 && deps > 20 && sellos > 0, JSON.stringify({ epocas, migr, deps, sellos }));
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
// ENMIENDA E1–E8 (kobalt/specs/2026-11-11_fase1-enmienda-preguntas.md, §8)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
const MONO = M.JUGUETE_MONO;
// Referencia independiente de aportes(): contribuciones con los S_{k−1} de Fold (Γ.estados los produce Fold; L4 lo verifica).
const ctxF = (proy, Γ, k) => (proy.leeEstado ? { k, parametros: Γ.estados[k - 1].parametros, S: Γ.estados[k - 1] } : { k, parametros: Γ.estados[k - 1].parametros });
const acumRef = (proy, Γ, i, j) => { let a = structuredClone(proy.monoide.unidad); for (let k = i + 1; k <= j; k++) a = proy.monoide.op(a, proy.f(Γ.entradas[k - 1], ctxF(proy, Γ, k))); return a; };
const obsRef = (proy, Γ, j, acum, tRef) => proy.obs(structuredClone(acum), proy.leeEstado ? { parametros: Γ.estados[j].parametros, S: Γ.estados[j], tRef } : { parametros: Γ.estados[j].parametros, tRef });
const cpMono = (proy, Γ, i, n) => ({ streamId: Γ.streamId, n, h: Γ.hashes[n], ver: proy.ver, epoca: Γ.estados[n].epoca, ...(i > 0 ? { i, hI: Γ.hashes[i] } : {}) });
const falsificar = Γ => ({ ...Γ, estados: Γ.estados.map(S => ({ ...S, D: { orden: ['zz'], v: { zz: 99 }, miembros: { zz: true }, nd: 99, nacidos: [], hechos: [] },
  parametros: { ...S.parametros, 'nucleo.capacidades': { nadie: [] }, 'límite': '≥0' }, sids: {}, sellado: !S.sellado, epoca: S.epoca + 7 })) });

paraTodoEscenario('L9 V10 E1.3 resolverProyeccion monoidal = obs(⊗ aportes) en toda ventana (i,j] desde todo checkpoint (válido, adelantado, de otra i, manipulado)', (run, esc) => {
  const Γ = run.ΓX, L = Γ.entradas.length, r = prng(esc.propX.length * 17 + L + 3);
  const snaps = [M.crearSnapshot(Γ.estados[entero(r, 0, L)], null, R)].map(s => ({ ...s, h: Γ.hashes[s.n] }));
  // snapshots inválidos con S alterado (Q roto; h ajeno): E5 exige ignorarlos
  for (const [k, campo] of [[entero(r, 0, L), 'Q'], [entero(r, 0, L), 'h']]) {
    const malo = structuredClone(Γ.estados[k]); malo.D = { orden: ['zz'], v: { zz: 99, a: 99 }, miembros: {}, ops: 0 };
    snaps.push({ ...M.crearSnapshot(Γ.estados[k], Γ.hashes[k], R), S: malo, [campo]: C.HASH_FALSO });
  }
  for (const proy of Object.values(MONO)) for (let rep = 0; rep < 6; rep++) {
    const i = entero(r, 0, L), j = entero(r, i, L), n = entero(r, i, L), tRef = entero(r, -1, 3);
    const ap = M.aportes(proy, Γ, i, j, R, r() < 0.5 ? snaps : []);
    if (ap.length !== j - i || !igual(M.plegar(proy.monoide, ap), acumRef(proy, Γ, i, j))) return false;
    const base = cpMono(proy, Γ, i, n);
    const variantes = [[base, n === j ? 'REUTILIZAR' : n > j ? 'RECONSTRUIR' : 'ACTUALIZAR'], [{ ...base, h: C.HASH_FALSO }, 'DISCONTINUIDAD'],
      [{ ...base, epoca: base.epoca + 1 }, 'DISCONTINUIDAD'], [{ ...base, ver: proy.ver + 1 }, 'RECONSTRUIR'], [{ ...base, streamId: STREAM_Z }, 'DISCONTINUIDAD'],
      [{ ...base, i: i + 1, hI: Γ.hashes[i + 1] ?? C.HASH_FALSO }, 'RECONSTRUIR'], [{ ...base, n: L + 1 }, 'DISCONTINUIDAD'], [null, 'RECONSTRUIR'],
      ...(i > 0 ? [[{ ...base, hI: C.HASH_FALSO }, 'RECONSTRUIR'], [{ ...base, i: undefined, hI: undefined }, 'RECONSTRUIR']] : [])];
    const acum = acumRef(proy, Γ, i, j), Y = obsRef(proy, Γ, j, acum, tRef);
    for (const [cp, accion] of variantes) {
      const guardado = cp && { acum: acumRef(proy, Γ, i, n), checkpoint: cp };
      const res = M.resolverProyeccion({ proy, guardado, trayectoria: Γ, i, m: j, registro: R, snapshots: snaps, tRef });
      if (res.accion !== accion || !igual(res.acum, acum) || !igual(res.Y, Y) || !igual(res.checkpoint, cpMono(proy, Γ, i, j))) return false;
      if (res.desde !== (accion === 'REUTILIZAR' || accion === 'ACTUALIZAR' ? n : i)) return false;
    }
  }
  return true;
}, 60);
test('E1.1 una pregunta sobre Γ no es función de S: dos Γ distintas con el MISMO S_n dan conteos distintos', () => {
  // Nota para el matemático: el contraejemplo literal de la enmienda (sumar(1), sumar(−1)) frente a ε NO llega al mismo S
  // (n y Sids difieren; en contador@1 también D.orden). Este par sí comparte S_n completo.
  const base = nuevaX();
  const Γ1 = comprometerTodas(base, [{ u: 'dueño', sid: 'e101', tipo: 'fijar', args: { clave: 'a', v: 1 } }, { u: 'dueño', sid: 'e102', tipo: 'sumar', args: { clave: 'a', q: 1 } }]);
  const Γ2 = comprometerTodas(base, [{ u: 'dueño', sid: 'e101', tipo: 'fijar', args: { clave: 'a', v: 2 } }, { u: 'dueño', sid: 'e102', tipo: 'fijar', args: { clave: 'a', v: 2 } }]);
  assert.deepEqual(M.fold(M.estadoInicial(Γ1.g, R), Γ1.entradas, R), M.fold(M.estadoInicial(Γ2.g, R), Γ2.entradas, R), 'mismo S_n');
  const q = Γ => M.resolverProyeccion({ proy: MONO.conteo, guardado: null, trayectoria: Γ, m: 2, registro: R }).Y;
  assert.deepEqual(q(Γ1), { fijar: 1, sumar: 1 }); assert.deepEqual(q(Γ2), { fijar: 2 });
  // y el contraejemplo de la enmienda, tal cual, no comparte S (se documenta, no se usa)
  const Γ3 = comprometerTodas(base, [sumar('a', 1), sumar('a', -1)]);
  assert.notDeepEqual(Γ3.estados.at(-1), base.estados[0]);
});
test('E1.2 con leeEstado la contribución de la MISMA entrada depende del estado previo (merma 4 desde 5, 1 desde 2)', () => {
  const desde = v => comprometerTodas(nuevaX(), [fijar('a', v), { u: 'dueño', sid: 'e201', tipo: 'fijar', args: { clave: 'a', v: 1 } }]);
  const Γ5 = desde(5), Γ2 = desde(2);
  assert.equal(hex(Γ5.bloques[1]), hex(Γ2.bloques[1]), 'la misma entrada (mismos bytes) en las dos trayectorias');
  assert.deepEqual(M.aportes(MONO.merma, Γ5, 1, 2, R), [4]); assert.deepEqual(M.aportes(MONO.merma, Γ2, 1, 2, R), [1]);
  assert.deepEqual(M.resolverProyeccion({ proy: MONO.merma, guardado: null, trayectoria: Γ5, m: 2, registro: R }).Y, { merma: 9, n: 2 });
});
test('L10 E1.3 la forma monoidal no necesita g: obs = max(0,·) no es congruente pero se recalcula; el mutante «obs antes de guardar» falla', () => {
  const Γ = comprometerTodas(nuevaX({ 'límite': 'ninguno' }), [sumar('a', -2), sumar('a', 3)]);
  const p = MONO.sumaMinPref;
  const r1 = M.resolverProyeccion({ proy: p, guardado: null, trayectoria: Γ, m: 1, registro: R });
  assert.equal(r1.Y.positivo, 0); assert.deepEqual(r1.acum, [-2, -2]);
  const r2 = M.resolverProyeccion({ proy: p, guardado: { acum: r1.acum, checkpoint: r1.checkpoint }, trayectoria: Γ, m: 2, registro: R });
  assert.equal(r2.accion, 'ACTUALIZAR'); assert.equal(r2.Y.positivo, 1); assert.deepEqual(r2.acum, [1, -2]);
  const mutante = Math.max(0, r1.Y.positivo + 3); // guardar obs y actualizar sobre obs
  assert.notEqual(mutante, r2.Y.positivo, 'el mutante debe fallar en el contraejemplo de L10');
  // π = max(0, s) no es congruente: s = −2 y s = 0 dan 0; tras sumar 3, 1 y 3
  assert.equal(Math.max(0, -2), Math.max(0, 0)); assert.notEqual(Math.max(0, -2 + 3), Math.max(0, 0 + 3));
  assert.equal(p.g, undefined, 'la forma monoidal no declara g');
});
test('L15 E1.4b monoidal: el checkpoint no lleva tRef; el mismo acum responde a dos tRef; f nunca recibe tRef', () => {
  const Γ = comprometerTodas(nuevaX(), [fijar('a', 1), sumar('a', 1), sumar('b', 3), sumar('a', 1)]);
  const p = MONO.umbral;
  const r1 = M.resolverProyeccion({ proy: p, guardado: null, trayectoria: Γ, m: 3, registro: R, tRef: 2 });
  assert.equal(Object.hasOwn(r1.checkpoint, 'tRef'), false); assert.deepEqual(r1.Y, ['b']);
  const r2 = M.resolverProyeccion({ proy: p, guardado: { acum: r1.acum, checkpoint: r1.checkpoint }, trayectoria: Γ, m: 3, registro: R, tRef: 1 });
  assert.equal(r2.accion, 'REUTILIZAR'); assert.deepEqual(r2.Y, ['a', 'b']); assert.deepEqual(r2.acum, r1.acum);
  const claves = new Set();
  const espia = { ...p, id: 'mono.espia', f: (e, ctx) => { Object.keys(ctx).forEach(k => claves.add(k)); return p.f(e, ctx); } };
  const a1 = M.resolverProyeccion({ proy: espia, guardado: null, trayectoria: Γ, m: 2, registro: R, tRef: 0 });
  const a2 = M.resolverProyeccion({ proy: espia, guardado: { acum: a1.acum, checkpoint: a1.checkpoint }, trayectoria: Γ, m: 4, registro: R, tRef: 5 });
  assert.equal(a2.accion, 'ACTUALIZAR'); assert.deepEqual(a2.acum, M.resolverProyeccion({ proy: espia, guardado: null, trayectoria: Γ, m: 4, registro: R, tRef: 99 }).acum);
  assert.deepEqual([...claves].sort(), ['k', 'parametros']);
});
test('L21 L25 E1.5 proyectarCorte monoidal: conmutativo = ⊗ por trayectoria en cualquier orden; no conmutativo ⇒ NO_CONMUTATIVO; con solape la suma falla', () => {
  let vistos = 0;
  for (let c = 0; c < Math.min(CASOS, 60); c++) {
    const { run } = escenario(c); const r = prng(SEMILLA + 19 * c);
    const tray = { [STREAM_X]: run.ΓX, [STREAM_Y]: run.ΓY };
    const σ = M.cerrarCorte({ [STREAM_X]: entero(r, 0, run.ΓX.entradas.length), [STREAM_Y]: entero(r, 0, run.ΓY.entradas.length) }, tray).σ;
    for (const p of [MONO.conteo, MONO.porEpoca, MONO.merma]) {
      const ax = acumRef(p, run.ΓX, 0, σ[STREAM_X]), ay = acumRef(p, run.ΓY, 0, σ[STREAM_Y]);
      const res = M.proyectarCorte(σ, tray, R, p);
      assert.equal(res.resultado, 'OK');
      assert.deepEqual(res.valor, p.monoide.op(ax, ay)); assert.deepEqual(res.valor, p.monoide.op(ay, ax));
      vistos++;
    }
    for (const p of [MONO.sumaMinPref, MONO.ultimo]) {
      assert.deepEqual(M.proyectarCorte(σ, tray, R, p), { resultado: 'NO_CONMUTATIVO' });
      assert.deepEqual(M.proyectarCorte({ ...σ, [STREAM_Y]: -5 }, tray, R, p), { resultado: 'NO_CONMUTATIVO' }, 'precisión: la conmutatividad se juzga antes que el corte');
    }
    const n = run.ΓX.entradas.length;
    if (n > 0) { // solape: la misma Γ dos veces cuenta dos veces (por eso componer rechaza StreamID duplicados, E8)
      const a = acumRef(MONO.conteo, run.ΓX, 0, n);
      assert.notDeepEqual(MONO.conteo.monoide.op(a, a), a);
    }
  }
  assert.ok(vistos > 0);
  // corte no cerrado con monoide conmutativo ⇒ NO_CERRADO
  let ΓY = comprometerTodas(M.trayectoriaNueva(C.genesisY(), R).Γ, [fijar('k', 1)]);
  const ΓX = comprometerTodas(nuevaX(), [{ ...sumar('a', 1), args: { clave: 'a', q: 1, requiere: { stream: STREAM_Y, clave: 'k' } }, deps: [{ stream: STREAM_Y, k: 1, h: ΓY.hashes[1] }] }], { [STREAM_Y]: ΓY });
  assert.deepEqual(M.proyectarCorte({ [STREAM_X]: 1, [STREAM_Y]: 0 }, { [STREAM_X]: ΓX, [STREAM_Y]: ΓY }, R, MONO.conteo), { resultado: 'NO_CERRADO' });
});
function trayectoriaE2() { // s₀ en la posición 1 (retención ilimitada), ventana(1) en la 2, otra acción en la 3
  return comprometerTodas(M.trayectoriaNueva(C.genesisY(), R).Γ, [{ u: 'dueño', sid: 'a0a0', tipo: 'fijar', args: { clave: 'k', v: 1 } },
    fijarP({ 'nucleo.retenciónSids': { ventana: 1 } }), fijar('z', 2)]);
}
test('L3 E2 nucleo.sid se define sobre la trayectoria (Teorema E2.1): verdadero en k=3 aunque s₀ ∉ Sids_3; estable en todo k ≥ 1', () => {
  const ΓY = trayectoriaE2();
  assert.equal(Object.hasOwn(ΓY.estados[3].sids, 'a0a0'), false, '«sid ∈ Sids» no es estable (contraejemplo de 7.7c)');
  const intento = (k, sid) => M.comprometer(nuevaX(), M.cabezaDe(nuevaX()), 'dueño', { u: 'dueño', sid: nuevoSid(), tipo: 'sumar', args: { clave: 'a', q: 1, requiereSid: { stream: STREAM_Y, sid } },
    deps: [{ stream: STREAM_Y, k, h: ΓY.hashes[k] }] }, { registro: R, conocidas: { [STREAM_Y]: ΓY } });
  for (let k = 1; k <= 3; k++) assert.equal(intento(k, 'a0a0').resultado, 'COMPROMETIDO', `k=${k}`);
  assert.deepEqual(intento(0, 'a0a0'), { resultado: 'INADMISIBLE', motivo: 'requisitoSid' }, 'antes de comprometerse no vale');
  assert.deepEqual(intento(3, 'b0b0'), { resultado: 'INADMISIBLE', motivo: 'requisitoSid' });
});
const gComp = (caps = {}) => ({ streamId: STREAM_Z, predecesor: null, C0: { 'nucleo.regla': 'compuesto@1', 'nucleo.constituyente': 'dueño',
  'nucleo.capacidades': { 'dueño': ['*'], cajero: ['lote', 'a'], cajero2: ['lote', 'a', 'b'], hacedor: ['hacer:*'], ...caps } } });
const entradaDe = (S, u, tipo, args, sid = nuevoSid()) => ({ epoca: S.epoca, u, sid, deps: [], clase: M.claseDe(tipo), tipo, args });
test('E3 tipos patrón: exacta antes que patrón, el prefijo más largo gana, el validador recibe el tipo; ningún patrón captura FijarParámetro ni Sellar', () => {
  const S = M.estadoInicial(gComp(), R);
  const adm = (tipo, args, u = 'dueño') => { const r = M.admitir(S, entradaDe(S, u, tipo, args), { registro: R }); return r.ok ? 'ok' : `${r.rechazo}${r.motivo ? ':' + r.motivo : ''}`; };
  assert.equal(adm('hacer:x', { x: '1' }), 'ok');
  assert.equal(adm('hacer:', { x: '1' }), 'INADMISIBLE:forma', 'el validador recibe el tipo');
  assert.equal(adm('hacer:largoX', { x: '1' }), 'INADMISIBLE:forma', "gana 'hacer:largo*' (más largo)");
  assert.equal(adm('hacer:largoX', { x: '1', largo: true }), 'ok');
  assert.equal(adm('hacer:exacto', {}), 'ok'); assert.equal(adm('hacer:exacto', { x: '1' }), 'INADMISIBLE:forma', 'la clave exacta gana al patrón');
  assert.equal(adm('deshacer', { x: '1' }), 'INADMISIBLE:forma');
  assert.equal(adm('hacer:y', { x: '1' }, 'hacedor'), 'ok'); assert.equal(adm('hacer:y', { x: '1' }, 'cajero'), 'NO_AUTORIZADO');
  const gT = { streamId: STREAM_Z, predecesor: null, C0: { 'nucleo.regla': 'todo@1', 'nucleo.constituyente': 'dueño' } };
  const ST = M.estadoInicial(gT, R);
  const admT = (tipo, args) => { const r = M.admitir(ST, entradaDe(ST, 'dueño', tipo, args), { registro: R }); return r.ok ? 'ok' : `${r.rechazo}${r.motivo ? ':' + r.motivo : ''}`; };
  assert.equal(admT('cualquiera', null), 'ok'); assert.equal(admT('cualquiera', 1), 'INADMISIBLE:forma');
  assert.equal(admT('FijarParámetro', {}), 'INADMISIBLE:forma'); assert.equal(admT('FijarParámetro', null), 'INADMISIBLE:forma');
  assert.equal(admT('FijarParámetro', { x: 1 }), 'INADMISIBLE:parametroDesconocido');
  assert.equal(M.validadorDe(M.TODO_1.tipos, 'FijarParámetro'), null); assert.equal(M.validadorDe(M.TODO_1.tipos, 'Sellar'), null);
});
test('L16 E4 un lote con una acción interna sin capacidad ⇒ NO_AUTORIZADO; con todas las capacidades ⇒ admitido', () => {
  const Γ = M.trayectoriaNueva(gComp(), R).Γ;
  const intento = (u, acciones) => M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { u, sid: nuevoSid(), tipo: 'lote', args: { acciones }, deps: [] }, { registro: R }).resultado;
  assert.equal(intento('cajero', ['a', 'b']), 'NO_AUTORIZADO', 'b no está en las capacidades del cajero');
  assert.equal(intento('cajero', ['a']), 'COMPROMETIDO');
  assert.equal(intento('cajero2', ['a', 'b']), 'COMPROMETIDO');
  assert.equal(intento('hacedor', ['a']), 'NO_AUTORIZADO', 'sin capacidad para el tipo externo');
  assert.equal(intento('cajero', ['lote']), 'INADMISIBLE', 'G5 antes que G1: tiposInternos solo se evalúa sobre entradas bien formadas');
  // G1 con tiposInternos que no devuelve una lista de textos ⇒ falla cerrada
  const R2 = { ...R, 'compuesto@1': { ...M.COMPUESTO_1, tiposInternos: () => null } };
  const S = M.estadoInicial(gComp(), R2);
  assert.equal(M.admitir(S, entradaDe(S, 'cajero2', 'lote', { acciones: ['a'] }), { registro: R2 }).rechazo, 'NO_AUTORIZADO');
});
paraTodoEscenario('L27 E5 Γ.estados falsos (proyección sin checkpoint) no influyen: admisión, Lect, AppendIfHead, Incorporar, aportes, resolverProyeccion y proyectarCorte', (run, esc) => {
  const ΓX = run.ΓX, ΓY = run.ΓY, fX = falsificar(ΓX), fY = falsificar(ΓY), L = ΓX.entradas.length;
  const sinΓ = r => { const { Γ, ...x } = r; return x; };
  for (const p of esc.propX.slice(0, 25)) {
    const a = M.comprometer(ΓX, M.cabezaDe(ΓX), p.mecanismo, p.sol, { registro: R, conocidas: { [STREAM_Y]: ΓY } });
    const b = M.comprometer(fX, M.cabezaDe(fX), p.mecanismo, p.sol, { registro: R, conocidas: { [STREAM_Y]: fY } });
    if (!igual(sinΓ(a), sinΓ(b))) return false;
  }
  for (let i = 1; i <= L; i++) { // re‑admisión de cada entrada con conocidas falsificadas
    const e = ΓX.entradas[i - 1];
    if (!igual(M.admitir(ΓX.estados[i - 1], e, { registro: R, conocidas: { [STREAM_Y]: fY } }), M.admitir(ΓX.estados[i - 1], e, { registro: R, conocidas: { [STREAM_Y]: ΓY } }))) return false;
  }
  const rep = M.trayectoriaNueva(ΓX.g, R).Γ;
  const i1 = M.incorporarEn(falsificar(rep), M.cabezaDe(rep), ΓX.bloques, M.cabezaDe(ΓX), { registro: R, conocidas: { [STREAM_Y]: fY } });
  if (i1.resultado !== 'INCORPORADO' || (L > 0 && !igual(i1.Γ.estados.at(-1), ΓX.estados.at(-1)))) return false;
  for (const proy of [...Object.values(MONO), M.JUGUETE_PROY.coord, M.PROYECCIONES.epoca]) {
    const args = { proy, guardado: null, trayectoria: ΓX, m: L, registro: R, tRef: 1 };
    if (!igual(M.resolverProyeccion(args), M.resolverProyeccion({ ...args, trayectoria: fX }))) return false;
    if (M.esMonoidal(proy) && !igual(M.aportes(proy, fX, 0, L, R), M.aportes(proy, ΓX, 0, L, R))) return false;
  }
  const σ = { [STREAM_X]: L, [STREAM_Y]: ΓY.entradas.length };
  return igual(M.proyectarCorte(σ, { [STREAM_X]: fX, [STREAM_Y]: fY }, R, MONO.conteo), M.proyectarCorte(σ, { [STREAM_X]: ΓX, [STREAM_Y]: ΓY }, R, MONO.conteo))
    && igual(M.proyectarCorte(σ, { [STREAM_X]: fX, [STREAM_Y]: fY }, R, est => est[STREAM_X].D), M.proyectarCorte(σ, { [STREAM_X]: ΓX, [STREAM_Y]: ΓY }, R, est => est[STREAM_X].D));
}, 40);
function forjadaE6() {
  const Γ = comprometerTodas(nuevaX(), [sumar('a', 1)]);
  const forjada = { epoca: 0, u: 'cajero', sid: 'f6f6', deps: [], clase: 'contrato', tipo: 'FijarParámetro', args: { 'límite': 'ninguno' } };
  const b2 = M.encEntrada(forjada); return { Γ, bloques: [Γ.bloques[0], b2], fin: { n: 2, h: M.hashPaso(Γ.hashes[1], b2) } };
}
test('L31 E6 incorporar toma readmitir de nodo.verificarAlIncorporar (o explícito); sin ctx.nodo, el inicial de REGLA_NODO', () => {
  const { Γ, bloques, fin } = forjadaE6(); const rep = M.trayectoriaNueva(Γ.g, R).Γ;
  const res = ctx => M.incorporarEn(rep, M.cabezaDe(rep), bloques, fin, { registro: R, ...ctx }).resultado;
  const nodo = v => ({ parametros: { ...M.estadoInicial({ streamId: '0d'.repeat(16), predecesor: null, C0: { 'nucleo.regla': 'nucleo.nodo@1', 'nucleo.constituyente': 'nodo' } }, R).parametros, 'nodo.verificarAlIncorporar': v } });
  assert.equal(res({}), 'DISCONTINUIDAD', 'inicial = cadena+readmisión');
  assert.equal(res({ nodo: nodo('cadena') }), 'INCORPORADO');
  assert.equal(res({ nodo: nodo('cadena+readmisión') }), 'DISCONTINUIDAD');
  assert.equal(res({ nodo: nodo('cadena+readmisión'), readmitir: false }), 'INCORPORADO', 'el explícito sustituye al del nodo');
  assert.equal(res({ nodo: nodo('cadena'), readmitir: true }), 'DISCONTINUIDAD');
  const alm = M.crearAlmacenMemoria(); M.crear(alm, Γ.g, R);
  assert.equal(M.incorporar(alm, STREAM_X, { n: 0, h: Γ.hashes[0] }, bloques, fin, { registro: R, nodo: nodo('cadena') }).resultado, 'INCORPORADO');
  assert.equal(M.REGLA_NODO.sigma['nodo.verificarAlIncorporar'].inicial, 'cadena+readmisión');
});
test('L13 E7 identidades compuestas: [a, 1] repetida en dos objetos distintos es UNA identidad; con contenido distinto ⇒ Conflictos; una id no CV lanza', () => {
  const inst = { id: o => o.id, rec: (o, A) => A.some(x => igual(x, o.id)), reconocidos: A => A };
  const O = [{ id: ['a', 1], q: 1 }, { id: ['a', 1], q: 1 }, { id: ['b', 2], q: 5 }];
  const d = M.diferencia(O, [], inst);
  assert.equal(d.delta.length, 2); assert.deepEqual(d.conflictos, []);
  assert.deepEqual(M.diferencia(O, [['a', 1]], inst).delta, [{ id: ['b', 2], q: 5 }]);
  const c = M.diferencia([...O, { id: ['a', 1], q: 2 }], [], inst);
  assert.deepEqual(c.conflictos, [['a', 1]]); assert.deepEqual(c.delta, [{ id: ['b', 2], q: 5 }]);
  assert.deepEqual(M.diferencia(O, [['a', 1], ['z', 0]], inst).exceso, [['z', 0]]);
  for (const malo of [undefined, 1.5, new Map(), () => 1]) assert.throws(() => M.diferencia([{ id: malo }], [], inst), undefined, String(malo));
  assert.deepEqual(M.diferencia([{ id: 'x' }, { id: 'x' }], [], { id: o => o.id, rec: () => false }).delta, [{ id: 'x' }], 'ids de texto: igual que en la fase 1');
});
test('L25 E8 componer: dos aportes con el mismo StreamID ⇒ STREAM_DUPLICADO; la clave «__proto__» es un hecho (H5)', () => {
  assert.deepEqual(M.componer([{ streamId: STREAM_X, hechos: { a: 1 } }, { streamId: STREAM_X, hechos: { b: 2 } }]), { resultado: 'STREAM_DUPLICADO', streamId: STREAM_X });
  assert.deepEqual(M.componer([{ streamId: STREAM_X, hechos: {} }, { streamId: STREAM_Y, hechos: {} }, { streamId: STREAM_X, hechos: {} }]), { resultado: 'STREAM_DUPLICADO', streamId: STREAM_X });
  const p = [{ streamId: STREAM_X, hechos: JSON.parse('{"__proto__": 1}') }, { streamId: STREAM_Y, hechos: JSON.parse('{"__proto__": 2}') }];
  assert.deepEqual(M.componer(p), { resultado: 'CONFLICTO', clave: '__proto__', streams: [STREAM_X, STREAM_Y] });
  const uno = M.componer([p[0]]);
  assert.equal(Object.hasOwn(uno.hechos, '__proto__'), true); assert.deepEqual(uno.hechos.__proto__, { streamId: STREAM_X, valor: 1 });
});
test('Posición: T calcula i = nd + e.ε + 1 sin recibirla, con entradas de contrato intercaladas (enmienda, «Lo que NO cambia»)', () => {
  const r = prng(SEMILLA ^ 0x7070); let nacidos = 0;
  for (let c = 0; c < CASOS; c++) {
    let Γ = M.trayectoriaNueva(gComp(), R).Γ; let modo = 'uno';
    for (let t = entero(r, 0, 30); t > 0; t--) {
      const x = r(); let sol;
      if (x < 0.25) { modo = elegir(r, ['uno', 'dos', 'tres'].filter(m => m !== modo)); sol = fijarP({ modo }); } else sol = { u: 'dueño', sid: nuevoSid(), tipo: x < 0.7 ? 'nacer' : 'a', args: {} };
      Γ = comprometerTodas(Γ, [sol]);
    }
    const reales = Γ.entradas.map((e, j) => (e.tipo === 'nacer' ? j + 1 : 0)).filter(Boolean);
    assert.deepEqual(Γ.estados.at(-1).D.nacidos, reales, `semilla ${SEMILLA} caso ${c}`);
    assert.equal(new Set(reales).size, reales.length); nacidos += reales.length;
  }
  assert.ok(nacidos > 100);
});
