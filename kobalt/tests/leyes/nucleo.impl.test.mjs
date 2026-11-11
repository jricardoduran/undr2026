// Kobalt — CONTRATO DE IMPLEMENTACIÓN del núcleo general (fase 1).
// Compara `kobalt/src/nucleo/index.mjs` contra el modelo de referencia `kobalt/tests/modelos/nucleo.modelo.mjs`.
// Spec: kobalt/specs/2026-11-11_fase1-nucleo.md. Mientras el módulo no exista, TODAS estas pruebas fallan con
// un mensaje que indica la ruta esperada y la API pendiente.
//
// Ejecutar:  node --test 'kobalt/tests/leyes/*.test.mjs'
// Variables: KOBALT_SEED, KOBALT_CASOS, KOBALT_NUCLEO_IMPL (ruta alternativa de la implementación: así se
//            ejecutan los mutantes sobre una COPIA temporal; también sirve para validar estas pruebas contra el modelo).
//
// ════════════════════════════════════ API EXIGIDA ════════════════════════════════════
// `kobalt/src/nucleo/index.mjs` debe exportar exactamente estos nombres (puede exportar más). Cualquier función
// puede devolver su valor o una Promesa: las pruebas usan `await` siempre. Sin dependencias externas; sin
// vocabulario de dominio (el grep de la cabecera de la spec debe salir vacío); NO puede importar nada de kobalt/tests/.
//
// Representación: bytes opacos en la API = texto hex en minúsculas (StreamID: 16 B ⇒ 32 hex; h: 32 B ⇒ 64 hex;
// sid: ≥ 1 B). Dentro de CV viajan como bytes (etiqueta 05). Los valores CV son: null, boolean, entero seguro,
// Uint8Array, texto bien formado, Array y objeto plano (mapa con claves de texto).
//
// 1. Codificación y derivación (§4.2)
//   cv(v) → Uint8Array                       CV canónico. Lanza si v no es un valor CV (reales, surrogates sueltos…).
//   decCV(b: Uint8Array) → v                 Inversa; lanza ante cualquier byte que no sea imagen de CV.
//   derivar(tag: string, ...partes: Uint8Array) → hex64     𝔇 = KOB2.View.derive(clear, utf8(tag), partes).
//   ETIQUETAS = {GENESIS, PASO, SID, SNAPSHOT} = 'kobalt:nucleo:{genesis|paso|sid|snapshot}:1'.
//   encGenesis(g) → Uint8Array  · decGenesis(b) → g        g = {streamId, predecesor: null|{streamId,n,h}, C0}
//                                                           CV(g) = CV([bytes(streamId), null|[bytes(s), n, bytes(h)], C0])
//   hashGenesis(g) → hex64                   h_0 = 𝔇(T_G, bytes(streamId), CV(g))
//   encEntrada(e) → Uint8Array · decEntrada(b) → e         e = {epoca, u, sid, deps:[{stream,k,h}], clase, tipo, args}
//                                                           Enc(e) = CV([ε, u, bytes(sid), [[bytes(stream),k,bytes(h)]…], clase, tipo, args])
//   hashPaso(hPrevio: hex64, bloque: Uint8Array) → hex64   h_i = 𝔇(T_P, bytes(h_{i−1}), Enc(e_i))
//   deriveSid(dom: string|Uint8Array, v) → hex64           𝔇(T_S, dom (utf8 si es texto), CV(v))
//
// 2. Contrato y estado (§3, §4.1, §5.1–§5.2)
//   S = {n, epoca, parametros, sellado, sids: {sidHex ↦ posición}, D}
//   estadoInicial(g, registro) → S_0          (lanza si la génesis no es válida)
//   admitir(S, e, ctx) → {ok: true} | {ok: false, rechazo, motivo?, i?}
//        ctx = {registro, conocidas?: {StreamID ↦ Trayectoria}, epocaEsperada?}
//        Orden de evaluación FIJO: G0 SELLADO → G5 INADMISIBLE('forma') → G1 NO_AUTORIZADO → G2 YA_COMPROMETIDO(i)
//        → G3 ÉPOCA_CAMBIADA → G4 DEPENDENCIA_NO_VERIFICABLE → guarda de la acción INADMISIBLE(motivo).
//        Motivos de FijarParámetro (§5.2 i–vi, en este orden): 'fueraDeDominio' (regla no registrada),
//        'parametroDesconocido', 'fueraDeDominio', 'sinCambio', 'sinMigracion', 'autobloqueo', motivo de guardaPar.
//        Clase: 'contrato' para tipo ∈ {'FijarParámetro','Sellar'}; 'dominio' para el resto.
//        Capacidad exigida: 'FijarParámetro:<p>' ∀p ∈ dom m; 'Sellar'; o el tipo de dominio. Patrón = exacto o prefijo con '*'.
//   transformar(S, e, registro) → S'         pura; usa C_ε de S (época de la entrada)
//   fold(S, entradas, registro) → S
//   Parámetros reservados (presentes en toda regla): 'nucleo.capacidades', 'nucleo.regla', 'nucleo.constituyente',
//   'nucleo.derivación' (= 'kobalt:nucleo:1'), 'nucleo.retenciónSids' ('ilimitada' | {ventana: N≥1}).
//
//   Regla (dato que aporta cada instancia; el núcleo NO trae reglas salvo REGLA_NODO):
//     {id, D0, tipos: {tipo ↦ args → bool}, guarda(D, e, parametros, lect) → 'ok'|motivo, T(D, e, parametros) → D',
//      sigma: {p ↦ {dominio: v → bool, inicial}}, guardaPar?(m, D, parametros), migraDesde?: {idRegla ↦ D → D},
//      estables?: {nombre ↦ (D, ...args) → bool}, codD?(D) → valor CV}
//     lect.estable(stream, nombre, ...args) → bool: evalúa en S_Y en el checkpoint (Y,k,h) de e.deps; nombres del
//     núcleo: 'nucleo.sellado', 'nucleo.sid'(sidHex), 'nucleo.nAlMenos'(k); el resto, estables de la regla de Y.
//     T se llama SIEMPRE con exactamente 3 argumentos (nunca recibe lect, L20).
//
// 3. Secuencia y materialidad (§5.3–§5.5)
//   crearAlmacenMemoria(compartido?) → almacén       compartido = otro adaptador cuyo almacén subyacente se reutiliza.
//     almacén: crear(streamId, gBytes, h0) → {resultado:'OK'|'EXISTE'} · cabeza(streamId) → {n,h}|null
//              leerGenesis(streamId) → Uint8Array|null · leer(streamId, i, j) → [b_i…b_j] (1‑based, inclusivo)
//              anexarSiCabeza(streamId, {n,h}, bloques, {n:m,h:h_m}) → {resultado:'OK'} | {resultado:'CONFLICTO', n, h}
//              guardar(clave, registro) / leerRegistro(clave) (registro = una sola unidad, M4) · streams() → [StreamID] ordenados
//     Ninguna otra operación de escritura (sin borrar ni sobrescribir: M3).
//   crear(almacen, g, registro) → {resultado:'CREADO', n:0, h} | {resultado:'EXISTE'} | {resultado:'INADMISIBLE', motivo}
//   appendIfHead(almacen, streamId, cabeza:{n,h}, mecanismo, sol, ctx:{registro}) → resultado
//        sol = {u, sid, tipo, args, deps?, epocaEsperada?}; las dependencias se verifican contra los demás StreamID del almacén.
//        Orden: (a) (n,h) debe ser una posición de Γ local, si no CABEZA_CAMBIADA(n',h'); (b) NO_CONSTITUYENTE si
//        mecanismo ≠ C_ε.constituyente de S_n; (c) admitir sobre S_n; (d) anexarSiCabeza ⇒ CABEZA_CAMBIADA(n',h') si cambió.
//        Resultados: {resultado:'COMPROMETIDO', n, h, epoca} · {resultado:'CABEZA_CAMBIADA', n, h} · {resultado:'NO_CONSTITUYENTE'}
//        · {resultado: rechazo de admitir, motivo?, i?}
//   incorporar(almacen, streamId, cabeza, bloques, cabezaFinal, ctx:{registro, readmitir? = true}) → resultado (ATÓMICO)
//        {resultado:'INCORPORADO', n, h} · {resultado:'CABEZA_CAMBIADA', n, h} (la cabeza local no es `cabeza`)
//        · {resultado:'DISCONTINUIDAD', i, motivo} con motivo ∈ 'TRUNCADA'|'SOBRANTES'|'CADENA' (i = n_local+1),
//          'FORMA'|'ÉPOCA' (i exacta, solo si la cadena cuadra), 'READMISIÓN' (i exacta; contrato de la época REGISTRADA)
//        · {resultado:'READMISIÓN_PENDIENTE', i, dep, n, h}: la cadena SE incorpora; i = primera entrada cuya dep no se conoce.
//   leerCopia(almacen, streamId) → {streamId, gBytes, bloques, cabeza} | null
//   verificar(copia, desde?: {k, h}) → {resultado:'OK', n, h} | {resultado:'DISCONTINUIDAD', i, motivo}  (mismas reglas de i)
//   leerTrayectoria(almacen, streamId) → Trayectoria = {streamId, g, entradas, bloques, hashes:[h_0…h_n]} (verificada) | null
//   estado(almacen, streamId, ctx:{registro}) → S_n | null
//   apiReplica(almacen, ctx) → {crear, incorporar, verificar, estado, cabeza} (sin appendIfHead ni anexarSiCabeza, L16)
//   resolver(hashesA, hashesB) → {resultado:'EXACTO'|'CADENA'|'FORK', c, h} | {resultado:'GÉNESIS_DISTINTA', c:-1}
//        | {resultado:'SIN_EVIDENCIA'} (alguna posición ≤ min(n,n') es null)
//
// 4. Proyecciones (§7)
//   Proyección = {id, ver, pi(S, ctx), g?(Y, e, ctx), sensibleAEpoca, sensibleATiempo}
//        ctx de pi = {registro, tRef, h, hashes, parametros}; ctx de g = {registro, parametros (C_ε antes de e), tRef}
//   PROYECCIONES = {cabeza, hashes, epoca, sids}   (§7.7; Y = {n,h} · [h_0…h_n] · {epoca, parametros} · {n, sids})
//   crearSnapshot(S, h, registro) → {S, n, h, epoca, ver, Q}   Q = 𝔇(T_N, CV({D: codD(D), epoca, n, parametros, sellado, sids}))
//   restaurarSnapshot(snap, hashesLocales, registro) → S | null
//   resolverProyeccion({proy, guardado: null|{Y, checkpoint}, trayectoria, m, registro, snapshots?, tRef?})
//        → {accion: 'REUTILIZAR'|'ACTUALIZAR'|'RECONSTRUIR'|'DISCONTINUIDAD', Y, checkpoint, desde}
//        checkpoint = {streamId, n, h, ver, epoca[, tRef si sensibleATiempo]}; desde = posición de partida usada.
//   esCerrado(σ, trayectorias) → bool · cerrarCorte(σ, trayectorias) → {resultado:'CERRADO', σ} | {resultado:'DIVERGENCIA_DEP', X, i, Y}
//   proyectarCorte(σ, trayectorias, registro, φ) → {resultado:'OK', valor} | {resultado:'NO_CERRADO'}
//   componer(aportes:[{streamId, hechos}]) → {resultado:'COMPUESTO', hechos:{clave ↦ {streamId, valor}}} | {resultado:'CONFLICTO', clave, streams}
//
// 5. Diferencia (§7.8)
//   diferencia(O, A, {id, rec, reconocidos?}) → {delta, conflictos, exceso}   (pura; una sola función para todas las instancias)
//
// 6. Configuración del nodo (§3.4–§3.5)
//   REGLA_NODO: regla 'nucleo.nodo@1' sin tipos, con sigma {'nodo.reintentos': 3, 'nodo.verificarAlAbrir': 'completa',
//   'nodo.verificarAlIncorporar': 'cadena+readmisión', 'nodo.anteFork': 'suspender', 'nodo.materialización': 'bajoDemanda',
//   'nodo.snapshots': 'bajoDemanda' | {cada: N}} (valores iniciales).
// ═══════════════════════════════════════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as M from '../modelos/nucleo.modelo.mjs';
import * as C from './nucleo.comun.mjs';

const API = [
  'cv', 'decCV', 'derivar', 'ETIQUETAS', 'encGenesis', 'decGenesis', 'hashGenesis', 'encEntrada', 'decEntrada', 'hashPaso', 'deriveSid',
  'estadoInicial', 'admitir', 'transformar', 'fold',
  'crearAlmacenMemoria', 'crear', 'appendIfHead', 'incorporar', 'leerCopia', 'verificar', 'leerTrayectoria', 'estado', 'apiReplica', 'resolver',
  'PROYECCIONES', 'crearSnapshot', 'restaurarSnapshot', 'resolverProyeccion', 'esCerrado', 'cerrarCorte', 'proyectarCorte', 'componer',
  'diferencia', 'REGLA_NODO',
];
const DIR_NUCLEO = fileURLToPath(new URL('../../src/nucleo/', import.meta.url));
const RUTA = process.env.KOBALT_NUCLEO_IMPL ? pathToFileURL(process.env.KOBALT_NUCLEO_IMPL).href : new URL('../../src/nucleo/index.mjs', import.meta.url).href;
let I = null, errorCarga = null;
try { I = await import(RUTA); } catch (err) { errorCarga = err; }
function exigir() {
  if (!I) assert.fail(`IMPLEMENTACIÓN AUSENTE: no se pudo importar ${fileURLToPath(RUTA)}\n  causa: ${errorCarga?.code ?? ''} ${errorCarga?.message ?? ''}\n`
    + `  Debe exportar: ${API.join(', ')} (ver el encabezado de kobalt/tests/leyes/nucleo.impl.test.mjs).`);
  const faltan = API.filter(k => !(k in I));
  if (faltan.length) assert.fail(`API incompleta en ${fileURLToPath(RUTA)}: faltan ${faltan.join(', ')}`);
}

const R = M.REGISTRO_JUGUETE;
const { SEMILLA, CASOS, prng, entero, elegir, STREAM_X, STREAM_Y, STREAM_Z, hex, deHex, sidDe } = C;
const CASOS_IMPL = Math.min(CASOS, 80);
const te = new TextEncoder();
const N = r => { const o = {}; for (const k of ['resultado', 'n', 'h', 'epoca', 'motivo', 'i', 'dep']) if (r && r[k] !== undefined) o[k] = r[k]; return o; };
const Nadm = r => { const o = { ok: r.ok }; if (!r.ok) { o.rechazo = r.rechazo; if (r.motivo !== undefined) o.motivo = r.motivo; if (r.i !== undefined) o.i = r.i; } return o; };
const escenarios = new Map();
const escenario = c => { if (!escenarios.has(c)) { const esc = C.generarEscenario(M, SEMILLA + c); escenarios.set(c, { esc, run: C.ejecutarPuro(M, esc) }); } return escenarios.get(c); };
const copiaDe = Γ => ({ streamId: Γ.streamId, gBytes: Γ.gBytes, bloques: Γ.bloques, cabeza: M.cabezaDe(Γ) });
const msg = (c, extra = '') => `semilla=${SEMILLA + c} (KOBALT_SEED=${SEMILLA}, caso ${c}) ${extra}`;
async function almacenCon(api, Γs) { // crea un almacén de `api` con las trayectorias dadas (vía crear + anexarSiCabeza)
  const a = await api.crearAlmacenMemoria();
  for (const Γ of Γs) { await api.crear(a, Γ.g, R); if (Γ.bloques.length) assert.equal((await a.anexarSiCabeza(Γ.streamId, { n: 0, h: Γ.hashes[0] }, Γ.bloques, M.cabezaDe(Γ))).resultado, 'OK'); }
  return a;
}

// ═════════════════════════ Contrato de la API y revisión estática ═════════════════════════
test('contrato: kobalt/src/nucleo/index.mjs existe y exporta la API exigida', () => { exigir(); });
test('contrato: vocabulario sin dominio y sin dependencias de kobalt/tests en kobalt/src/nucleo/ (regla de vocabulario)', () => {
  exigir();
  if (process.env.KOBALT_NUCLEO_IMPL && !existsSync(DIR_NUCLEO)) return; // validación del contrato contra el modelo
  const archivos = []; const rec = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) rec(p); else archivos.push(p); } };
  rec(DIR_NUCLEO);
  const prohibido = /producto|variante|stock|sku|bodega|precio|inventario|cat[aá]logo/i;
  for (const f of archivos) {
    const txt = readFileSync(f, 'utf8');
    txt.split('\n').forEach((l, n) => { assert.ok(!prohibido.test(l), `${f}:${n + 1}: vocabulario de dominio: ${l.trim()}`); });
    assert.ok(!/from\s+['"][^'"]*tests\//.test(txt) && !/import\([^)]*tests\//.test(txt), `${f}: no puede importar de kobalt/tests/`);
  }
});

// ═════════════════════════ CV y 𝒟 ═════════════════════════
test('CV impl = modelo en 5.000 valores aleatorios (bytes, ida y vuelta) y rechaza las mismas formas', async () => {
  exigir();
  const r = prng(SEMILLA ^ 0xc0de);
  for (let i = 0; i < 5000; i++) {
    const v = C.valorCV(r); const b = M.cv(v);
    assert.equal(hex(await I.cv(v)), hex(b), C.claveEstructural(v));
    assert.equal(C.claveEstructural(await I.decCV(b)), C.claveEstructural(M.decCV(b)));
  }
  for (const h of ['038000', '0400', '09', '080206016203000601610300', '080206016103000601610300', '060561', '0000', '0601ff', '0603eda080', '080103010301', '070300', '03ffffffffffffffff7f', ''])
    await assert.rejects(async () => I.decCV(deHex(h)), undefined, `decCV debe rechazar ${h}`);
  for (const v of ['\uD800', 1.5, NaN, 2 ** 53, undefined, 10n, new Map()]) await assert.rejects(async () => I.cv(v), undefined, `cv debe rechazar ${String(v)}`);
  assert.equal(await I.decCV(deHex('0603efbbbf')), '﻿');
});
const require_ = createRequire(import.meta.url);
const KOB2 = require_('../../kernels/KOB2/2026-09-18_0100_KOB2_KERNEL_9_0_1.js'); // solo lectura
test('CV/𝒟 derivar = KOB2.View.derive; vectores de la spec y vectores publicados de génesis, entrada y DeriveSid', async () => {
  exigir();
  assert.deepEqual({ ...I.ETIQUETAS }, { ...M.ETIQUETAS });
  assert.equal(await I.derivar('kobalt:nucleo:paso:1', new Uint8Array(32), new Uint8Array(0)), '708cffb32980e9da76d78f564db709a1c27e83298729bf5aa553a0fd879781a1');
  assert.equal(await I.derivar('kobalt:nucleo:genesis:1', new Uint8Array(16).fill(1), te.encode('g')), '341ecd83c6898c04bd4d72f811ef5e507c6bc5d97ab8f6d36d241b5b79bf6638');
  const r = prng(SEMILLA ^ 0xd00d);
  for (let i = 0; i < 200; i++) {
    const tag = String(C.valorCV(r)); const partes = Array.from({ length: entero(r, 0, 4) }, () => M.cv(C.valorCV(r)));
    assert.equal(await I.derivar(tag, ...partes), hex(await KOB2.View.derive(KOB2.View.clear(), te.encode(tag), partes)));
  }
  const V = C.VECTORES;
  assert.equal(hex(await I.encGenesis(V.genesis.g)), V.genesis.cv);
  assert.equal(await I.hashGenesis(V.genesis.g), V.genesis.h0);
  assert.deepEqual(await I.decGenesis(deHex(V.genesis.cv)), V.genesis.g);
  assert.equal(await I.hashGenesis({ ...V.genesis.g, predecesor: { streamId: '04'.repeat(16), n: 7, h: '05'.repeat(32) } }), V.genesisConPredecesor.h0);
  assert.equal(hex(await I.encEntrada(V.entrada.e)), V.entrada.enc);
  assert.deepEqual(await I.decEntrada(deHex(V.entrada.enc)), V.entrada.e);
  assert.equal(await I.hashPaso(V.genesis.h0, deHex(V.entrada.enc)), V.entrada.h1);
  assert.equal(await I.deriveSid(V.deriveSid.dom, V.deriveSid.v), V.deriveSid.sid);
  assert.equal(await I.deriveSid(te.encode(V.deriveSid.dom), V.deriveSid.v), V.deriveSid.sid);
});

// ═════════════════════════ L4 / L6 / V8 · estado, admisión y T contra el oráculo ═════════════════════════
test('L4 L6 estadoInicial, admitir, transformar y fold de la impl = oráculo en cada paso de cada trayectoria generada', async () => {
  exigir();
  for (let c = 0; c < CASOS_IMPL; c++) {
    const { esc, run } = escenario(c);
    const conocidas = { [STREAM_Y]: run.ΓY };
    let S = await I.estadoInicial(esc.gX, R);
    assert.deepEqual(S, run.ΓX.estados[0], msg(c, 'S_0'));
    // propuestas (incluidas las rechazadas) evaluadas sobre el estado de la cabeza actual del modelo
    let Γ = M.trayectoriaNueva(esc.gX, R).Γ;
    for (const [j, p] of esc.propX.entries()) {
      const Sm = Γ.estados.at(-1);
      const e = { epoca: Sm.epoca, u: p.sol.u, sid: p.sol.sid, deps: p.sol.deps ?? [], clase: M.claseDe(p.sol.tipo), tipo: p.sol.tipo, args: p.sol.args ?? null };
      const ctx = { registro: R, conocidas, epocaEsperada: p.sol.epocaEsperada };
      assert.deepEqual(Nadm(await I.admitir(Sm, e, ctx)), Nadm(M.admitir(Sm, e, ctx)), msg(c, `propuesta ${j}: ${JSON.stringify(p.sol)}`));
      const res = M.comprometer(Γ, M.cabezaDe(Γ), Sm.parametros['nucleo.constituyente'], p.sol, { registro: R, conocidas });
      if (res.Γ) Γ = res.Γ;
    }
    for (let i = 1; i <= run.ΓX.entradas.length; i++) {
      S = await I.transformar(S, run.ΓX.entradas[i - 1], R);
      assert.deepEqual(S, run.ΓX.estados[i], msg(c, `S_${i}`));
    }
    assert.deepEqual(await I.fold(run.ΓX.estados[0], run.ΓX.entradas, R), run.ΓX.estados.at(-1), msg(c, 'fold'));
  }
});
test('L4 genericidad (Teorema 7.11): con la segunda regla conjunto@1 la impl = oráculo', async () => {
  exigir();
  for (let c = 0; c < CASOS_IMPL; c++) {
    const esc = C.generarEscenarioConjunto(M, SEMILLA + c);
    const esperado = await C.ejecutarAlmacen(M, esc, { registro: R });
    const obtenido = await C.ejecutarAlmacen(I, esc, { registro: R });
    assert.deepEqual(obtenido.logX.map(N), esperado.logX.map(N), msg(c));
    assert.deepEqual(await I.estado(obtenido.almacen, STREAM_X, { registro: R }), M.estado(esperado.almacen, STREAM_X, { registro: R }), msg(c));
  }
});

// ═════════════════════════ L3 / L8 / L16 / L31 · AppendIfHead sobre la materialidad ═════════════════════════
test('L3 L8 L16 L31 appendIfHead de la impl = oráculo en todas las propuestas generadas (resultados, Γ, hashes y S)', async () => {
  exigir();
  for (let c = 0; c < CASOS_IMPL; c++) {
    const { esc, run } = escenario(c);
    const ob = await C.ejecutarAlmacen(I, esc, { registro: R });
    assert.deepEqual(ob.logY.map(N), run.logY.map(N), msg(c, 'Y'));
    for (let j = 0; j < run.logX.length; j++) assert.deepEqual(N(ob.logX[j]), N(run.logX[j]), msg(c, `propuesta ${j}: ${JSON.stringify(esc.propX[j])}`));
    const Γ = await I.leerTrayectoria(ob.almacen, STREAM_X);
    assert.deepEqual(Γ.hashes, run.ΓX.hashes, msg(c));
    assert.deepEqual(Γ.entradas, run.ΓX.entradas, msg(c));
    assert.deepEqual(Γ.bloques.map(hex), run.ΓX.bloques.map(hex), msg(c));
    assert.deepEqual(await I.estado(ob.almacen, STREAM_X, { registro: R }), run.ΓX.estados.at(-1), msg(c));
    assert.deepEqual(await ob.almacen.cabeza(STREAM_X), M.cabezaDe(run.ΓX));
  }
});
test('L3 el almacén en memoria de la impl solo ofrece compare‑and‑append (sin borrar ni sobrescribir)', async () => {
  exigir();
  const a = await I.crearAlmacenMemoria();
  for (const k of ['crear', 'cabeza', 'leerGenesis', 'leer', 'anexarSiCabeza', 'guardar', 'leerRegistro', 'streams']) assert.equal(typeof a[k], 'function', `falta almacén.${k}`);
  for (const k of Object.keys(a)) assert.ok(!/borrar|eliminar|sobrescrib|delete|remove|put$|^set|actualizar|reemplazar|truncar/i.test(k), `operación prohibida en la materialidad: ${k}`);
  const Γ = escenario(1).run.ΓX; await I.crear(a, Γ.g, R);
  assert.equal((await a.anexarSiCabeza(STREAM_X, { n: 0, h: Γ.hashes[0] }, Γ.bloques, M.cabezaDe(Γ))).resultado, 'OK');
  if (Γ.bloques.length) {
    const r = await a.anexarSiCabeza(STREAM_X, { n: 0, h: Γ.hashes[0] }, [Γ.bloques[0]], { n: 1, h: Γ.hashes[1] });
    assert.deepEqual(N(r), { resultado: 'CONFLICTO', ...M.cabezaDe(Γ) });
  }
  assert.deepEqual((await a.crear(STREAM_X, Γ.gBytes, Γ.hashes[0])).resultado, 'EXISTE');
  assert.deepEqual((await I.crear(a, Γ.g, R)).resultado, 'EXISTE');
  assert.deepEqual((await I.crear(a, { ...Γ.g, streamId: 'zz' }, R)).resultado, 'INADMISIBLE');
});
test('L8 dos adaptadores de la impl sobre el mismo almacén, en concurrencia: exactamente un sucesor; reevaluado ⇒ YA_COMPROMETIDO', async () => {
  exigir();
  const a1 = await I.crearAlmacenMemoria(); const a2 = await I.crearAlmacenMemoria(a1);
  assert.equal((await I.crear(a1, C.genesisX(), R)).resultado, 'CREADO');
  for (let ronda = 0; ronda < 25; ronda++) {
    const cab = await a1.cabeza(STREAM_X);
    const s1 = { u: 'dueño', sid: sidDe(3000 + 2 * ronda), tipo: 'sumar', args: { clave: 'a', q: 1 }, deps: [] };
    const s2 = { u: 'cajero', sid: sidDe(3001 + 2 * ronda), tipo: 'sumar', args: { clave: 'b', q: 1 }, deps: [] };
    const rs = await Promise.all([I.appendIfHead(a1, STREAM_X, cab, 'dueño', s1, { registro: R }), I.appendIfHead(a2, STREAM_X, cab, 'dueño', s2, { registro: R })]);
    assert.deepEqual(rs.map(r => r.resultado).sort(), ['CABEZA_CAMBIADA', 'COMPROMETIDO'], `ronda ${ronda}`);
    const perdedor = rs[0].resultado === 'COMPROMETIDO' ? s2 : s1, ganador = rs[0].resultado === 'COMPROMETIDO' ? s1 : s2;
    const cab2 = await a2.cabeza(STREAM_X); assert.equal(cab2.n, cab.n + 1);
    assert.deepEqual(N(await I.appendIfHead(a2, STREAM_X, cab2, 'dueño', ganador, { registro: R })), { resultado: 'YA_COMPROMETIDO', i: cab.n + 1 });
    assert.equal((await I.appendIfHead(a2, STREAM_X, cab2, 'dueño', perdedor, { registro: R })).resultado, 'COMPROMETIDO');
  }
  assert.equal((await I.verificar(await I.leerCopia(a1, STREAM_X))).resultado, 'OK');
  // comparar solo n no basta
  const base = M.trayectoriaNueva(C.genesisX(), R).Γ;
  const B = M.comprometer(base, M.cabezaDe(base), 'dueño', { u: 'dueño', sid: 'beef', tipo: 'sumar', args: { clave: 'z', q: 9 }, deps: [] }, { registro: R }).Γ;
  const a3 = await almacenCon(I, [M.comprometer(base, M.cabezaDe(base), 'dueño', { u: 'dueño', sid: 'cafe', tipo: 'sumar', args: { clave: 'z', q: 1 }, deps: [] }, { registro: R }).Γ]);
  assert.equal((await I.appendIfHead(a3, STREAM_X, M.cabezaDe(B), 'dueño', { u: 'dueño', sid: 'f00d', tipo: 'sumar', args: { clave: 'a', q: 1 }, deps: [] }, { registro: R })).resultado, 'CABEZA_CAMBIADA');
});
test('L16 Teorema 3.1 y API de réplica de la impl: el antiguo constituyente es rechazado; la réplica no ofrece AppendIfHead', async () => {
  exigir();
  const a = await I.crearAlmacenMemoria(); await I.crear(a, C.genesisX(), R);
  const ap = async (mec, sol) => I.appendIfHead(a, STREAM_X, await a.cabeza(STREAM_X), mec, { deps: [], ...sol }, { registro: R });
  assert.equal((await ap('dueño', { u: 'dueño', sid: '0101', tipo: 'FijarParámetro', args: { 'nucleo.constituyente': 'nuevo' } })).resultado, 'COMPROMETIDO');
  assert.equal((await ap('dueño', { u: 'dueño', sid: '0102', tipo: 'sumar', args: { clave: 'a', q: 1 } })).resultado, 'NO_CONSTITUYENTE');
  assert.equal((await ap('nuevo', { u: 'dueño', sid: '0102', tipo: 'sumar', args: { clave: 'a', q: 1 } })).resultado, 'COMPROMETIDO');
  assert.equal((await ap('nuevo', { u: 'intruso', sid: '0103', tipo: 'sumar', args: { clave: 'a', q: 1 } })).resultado, 'NO_AUTORIZADO');
  const S = await I.estado(a, STREAM_X, { registro: R });
  const esc = { epoca: S.epoca, u: 'config', sid: '0104', deps: [], clase: 'contrato', tipo: 'FijarParámetro', args: { 'límite': 'ninguno', 'nucleo.capacidades': { ...C.CAPS_X, config: ['*'] } } };
  assert.deepEqual(Nadm(await I.admitir(S, esc, { registro: R })), { ok: false, rechazo: 'NO_AUTORIZADO' }, 'capacidad para CADA parámetro');
  const rep = await I.apiReplica(await I.crearAlmacenMemoria(), { registro: R });
  for (const k of ['crear', 'incorporar', 'verificar', 'estado', 'cabeza']) assert.equal(typeof rep[k], 'function', `apiReplica.${k}`);
  assert.ok(!Object.keys(rep).some(k => /append|anexar|comprometer/i.test(k)), `la réplica no constituye: ${Object.keys(rep)}`);
});

// ═════════════════════════ L7 / L16 / L22 · Incorporar y Verificar ═════════════════════════
test('L16 L22 incorporar de la impl = oráculo: réplica completa, por sufijos, y con manipulación, truncamiento o reordenación', async () => {
  exigir();
  for (let c = 0; c < CASOS_IMPL; c++) {
    const { run } = escenario(c); const Γ = run.ΓX, n = Γ.entradas.length; const r = prng(SEMILLA + 11 * c);
    const k = entero(r, 0, n);
    const rep = await almacenCon(I, [run.ΓY]); await I.crear(rep, Γ.g, R);
    const r1 = await I.incorporar(rep, STREAM_X, { n: 0, h: Γ.hashes[0] }, Γ.bloques.slice(0, k), { n: k, h: Γ.hashes[k] }, { registro: R });
    assert.deepEqual(N(r1), { resultado: 'INCORPORADO', n: k, h: Γ.hashes[k] }, msg(c));
    // manipulaciones del sufijo: deben coincidir con el oráculo y no aplicar nada
    const suf = Γ.bloques.slice(k);
    const variantes = [];
    if (suf.length) {
      const i = entero(r, 0, suf.length - 1);
      variantes.push(suf.map((b, j) => (j === i ? Uint8Array.from(b, (x, t) => (t === b.length - 1 ? x ^ 1 : x)) : b)));
      variantes.push(suf.slice(0, -1));
      if (suf.length > 1) { const s2 = [...suf]; [s2[0], s2[1]] = [s2[1], s2[0]]; variantes.push(s2); }
    }
    variantes.push([...suf, Γ.bloques[0] ?? M.cv(null)]);
    const ΓmK = { ...Γ, entradas: Γ.entradas.slice(0, k), bloques: Γ.bloques.slice(0, k), hashes: Γ.hashes.slice(0, k + 1), estados: Γ.estados.slice(0, k + 1) };
    for (const bl of variantes) {
      const esperado = M.incorporarEn(ΓmK, M.cabezaDe(ΓmK), bl, M.cabezaDe(Γ), { registro: R, conocidas: { [STREAM_Y]: run.ΓY } });
      const obtenido = await I.incorporar(rep, STREAM_X, { n: k, h: Γ.hashes[k] }, bl, M.cabezaDe(Γ), { registro: R });
      assert.deepEqual(N(obtenido), N(esperado), msg(c, 'variante manipulada'));
      assert.deepEqual(await rep.cabeza(STREAM_X), { n: k, h: Γ.hashes[k] }, msg(c, 'no se aplica nada'));
      const v = await I.verificar({ ...copiaDe(Γ), bloques: [...Γ.bloques.slice(0, k), ...bl] });
      assert.deepEqual(N(v), N(M.verificar({ ...copiaDe(Γ), bloques: [...Γ.bloques.slice(0, k), ...bl] })), msg(c, 'verificar'));
    }
    assert.deepEqual(N(await I.incorporar(rep, STREAM_X, { n: 0, h: Γ.hashes[0] }, Γ.bloques, M.cabezaDe(Γ), { registro: R })), k === 0 ? { resultado: 'INCORPORADO', ...M.cabezaDe(Γ) } : { resultado: 'CABEZA_CAMBIADA', n: k, h: Γ.hashes[k] }, msg(c));
    if (k > 0) assert.deepEqual(N(await I.incorporar(rep, STREAM_X, { n: k, h: Γ.hashes[k] }, suf, M.cabezaDe(Γ), { registro: R })), { resultado: 'INCORPORADO', ...M.cabezaDe(Γ) }, msg(c));
    assert.deepEqual(await I.estado(rep, STREAM_X, { registro: R }), Γ.estados.at(-1), msg(c, 'mismo S que el constituyente'));
    assert.deepEqual(N(await I.verificar(await I.leerCopia(rep, STREAM_X))), { resultado: 'OK', ...M.cabezaDe(Γ) });
    if (k > 0) assert.deepEqual(N(await I.verificar(await I.leerCopia(rep, STREAM_X), { k, h: Γ.hashes[k] })), { resultado: 'OK', ...M.cabezaDe(Γ) });
  }
});
test('L7 la re‑admisión de la impl usa C_{ε} de la época REGISTRADA (mutante: parámetro de época posterior aplicado a una entrada anterior)', async () => {
  exigir();
  const sols = [
    { u: 'cajero', sid: '0201', tipo: 'sumar', args: { clave: 'a', q: 1 } },
    { u: 'dueño', sid: '0202', tipo: 'FijarParámetro', args: { 'límite': 'ninguno' } },
    { u: 'cajero', sid: '0203', tipo: 'sumar', args: { clave: 'a', q: -5 } },                // admitida con límite = ninguno
    { u: 'dueño', sid: '0204', tipo: 'FijarParámetro', args: { 'nucleo.capacidades': { 'dueño': ['*'] } } }, // revoca al cajero
    { u: 'dueño', sid: '0205', tipo: 'FijarParámetro', args: { 'límite': '≥0', defecto: 7 } },
    { u: 'dueño', sid: '0206', tipo: 'sumar', args: { clave: 'b', q: 1 } },                  // base = defecto 7 (época 3)
  ];
  let Γ = M.trayectoriaNueva(C.genesisX(), R).Γ;
  for (const s of sols) { const r = M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { deps: [], ...s }, { registro: R }); assert.equal(r.resultado, 'COMPROMETIDO', JSON.stringify(r)); Γ = r.Γ; }
  const rep = await I.crearAlmacenMemoria(); await I.crear(rep, Γ.g, R);
  const res = await I.incorporar(rep, STREAM_X, { n: 0, h: Γ.hashes[0] }, Γ.bloques, M.cabezaDe(Γ), { registro: R, readmitir: true });
  assert.deepEqual(N(res), { resultado: 'INCORPORADO', ...M.cabezaDe(Γ) });
  assert.deepEqual(await I.estado(rep, STREAM_X, { registro: R }), Γ.estados.at(-1));
  assert.deepEqual(Γ.estados.at(-1).D.v, { a: -4, b: 8 });
  // una entrada que su propio contrato no admitía se detecta: cajero firma un FijarParámetro (bloques forjados con cadena coherente)
  const forjada = { epoca: 0, u: 'cajero', sid: '0301', deps: [], clase: 'contrato', tipo: 'FijarParámetro', args: { 'límite': 'ninguno' } };
  const b = M.encEntrada(forjada), h1 = M.hashPaso(Γ.hashes[0], b);
  const rep2 = await I.crearAlmacenMemoria(); await I.crear(rep2, Γ.g, R);
  assert.deepEqual(N(await I.incorporar(rep2, STREAM_X, { n: 0, h: Γ.hashes[0] }, [b], { n: 1, h: h1 }, { registro: R })), { resultado: 'DISCONTINUIDAD', i: 1, motivo: 'READMISIÓN' });
  // atomicidad: una entrada válida seguida de la forjada ⇒ no se aplica ninguna
  const bv = Γ.bloques[0], b2 = M.encEntrada({ ...forjada, sid: '0302' }), h2 = M.hashPaso(Γ.hashes[1], b2);
  assert.deepEqual(N(await I.incorporar(rep2, STREAM_X, { n: 0, h: Γ.hashes[0] }, [bv, b2], { n: 2, h: h2 }, { registro: R })), { resultado: 'DISCONTINUIDAD', i: 2, motivo: 'READMISIÓN' });
  assert.deepEqual(await rep2.cabeza(STREAM_X), { n: 0, h: Γ.hashes[0] }, 'Incorporar es atómico');
  assert.deepEqual(N(await I.incorporar(rep2, STREAM_X, { n: 0, h: Γ.hashes[0] }, [b], { n: 1, h: h1 }, { registro: R, readmitir: false })), { resultado: 'INCORPORADO', n: 1, h: h1 });
  // época registrada falsa (cadena coherente): DISCONTINUIDAD ÉPOCA
  const malaEpoca = M.encEntrada({ ...forjada, u: 'dueño', epoca: 1 }), h1b = M.hashPaso(Γ.hashes[0], malaEpoca);
  const rep3 = await I.crearAlmacenMemoria(); await I.crear(rep3, Γ.g, R);
  assert.deepEqual(N(await I.incorporar(rep3, STREAM_X, { n: 0, h: Γ.hashes[0] }, [malaEpoca], { n: 1, h: h1b }, { registro: R })), { resultado: 'DISCONTINUIDAD', i: 1, motivo: 'ÉPOCA' });
});
test('L21 L22 READMISIÓN_PENDIENTE: la réplica sin Γ_Y incorpora la cadena y señala la primera entrada con dependencia desconocida', async () => {
  exigir();
  let ΓY = M.trayectoriaNueva(C.genesisY(), R).Γ;
  ΓY = M.comprometer(ΓY, M.cabezaDe(ΓY), 'dueño', { u: 'dueño', sid: '0401', tipo: 'fijar', args: { clave: 'k', v: 1 }, deps: [] }, { registro: R }).Γ;
  let Γ = M.trayectoriaNueva(C.genesisX(), R).Γ;
  const dep = { stream: STREAM_Y, k: 1, h: ΓY.hashes[1] };
  for (const s of [{ u: 'dueño', sid: '0402', tipo: 'sumar', args: { clave: 'a', q: 1 }, deps: [] },
    { u: 'dueño', sid: '0403', tipo: 'sumar', args: { clave: 'a', q: 1, requiere: { stream: STREAM_Y, clave: 'k' } }, deps: [dep] }])
    Γ = M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', s, { registro: R, conocidas: { [STREAM_Y]: ΓY } }).Γ;
  assert.equal(Γ.entradas.length, 2);
  const rep = await I.crearAlmacenMemoria(); await I.crear(rep, Γ.g, R);
  const res = await I.incorporar(rep, STREAM_X, { n: 0, h: Γ.hashes[0] }, Γ.bloques, M.cabezaDe(Γ), { registro: R });
  assert.deepEqual(N(res), { resultado: 'READMISIÓN_PENDIENTE', i: 2, dep, ...M.cabezaDe(Γ) });
  assert.deepEqual(await rep.cabeza(STREAM_X), M.cabezaDe(Γ));
  // con Γ_Y conocida: INCORPORADO; con otra Γ_Y en la posición citada: DISCONTINUIDAD por re‑admisión
  const rep2 = await almacenCon(I, [ΓY]); await I.crear(rep2, Γ.g, R);
  assert.deepEqual(N(await I.incorporar(rep2, STREAM_X, { n: 0, h: Γ.hashes[0] }, Γ.bloques, M.cabezaDe(Γ), { registro: R })), { resultado: 'INCORPORADO', ...M.cabezaDe(Γ) });
  const ΓY2 = M.comprometer(M.trayectoriaNueva(C.genesisY(), R).Γ, { n: 0, h: ΓY.hashes[0] }, 'dueño', { u: 'dueño', sid: '0499', tipo: 'fijar', args: { clave: 'k', v: 2 }, deps: [] }, { registro: R }).Γ;
  const rep3 = await almacenCon(I, [ΓY2]); await I.crear(rep3, Γ.g, R);
  assert.deepEqual(N(await I.incorporar(rep3, STREAM_X, { n: 0, h: Γ.hashes[0] }, Γ.bloques, M.cabezaDe(Γ), { registro: R })), { resultado: 'DISCONTINUIDAD', i: 2, motivo: 'READMISIÓN' });
});
test('L22 L26 resolver de la impl = recorrido lineal del oráculo (EXACTO, CADENA, FORK, GÉNESIS_DISTINTA, SIN_EVIDENCIA)', async () => {
  exigir();
  for (let c = 0; c < CASOS_IMPL; c++) {
    const Γ = escenario(c).run.ΓX, n = Γ.entradas.length, r = prng(SEMILLA + 5 * c);
    const pares = [[Γ.hashes.slice(0, entero(r, 0, n) + 1), Γ.hashes.slice(0, entero(r, 0, n) + 1)], [Γ.hashes, M.trayectoriaNueva(C.genesisX({ 'límite': 'ninguno' }), R).Γ.hashes]];
    const k = entero(r, 0, n); const pre = { ...Γ, entradas: Γ.entradas.slice(0, k), bloques: Γ.bloques.slice(0, k), hashes: Γ.hashes.slice(0, k + 1), estados: Γ.estados.slice(0, k + 1) };
    const rama = M.comprometer(pre, M.cabezaDe(pre), Γ.estados[k].parametros['nucleo.constituyente'], { u: 'dueño', sid: 'fa01', tipo: 'Sellar', args: null, deps: [] }, { registro: R });
    if (rama.Γ) pares.push([Γ.hashes, rama.Γ.hashes]);
    if (n) { const hueco = [...Γ.hashes]; hueco[entero(r, 0, n)] = null; pares.push([hueco, Γ.hashes]); }
    for (const [a, b] of pares) { assert.deepEqual(N(await I.resolver(a, b)), N(M.resolver(a, b)), msg(c)); assert.equal((await I.resolver(a, b)).c, M.resolver(a, b).c); }
  }
});

// ═════════════════════════ L4 / L9 / L15 / L27 · snapshots y proyecciones ═════════════════════════
test('L4 L23 snapshots de la impl: mismo Q que el oráculo; se rechazan h_n ajeno y Q roto; snapshot + sufijo = Fold', async () => {
  exigir();
  for (let c = 0; c < Math.min(CASOS_IMPL, 40); c++) {
    const Γ = escenario(c).run.ΓX;
    for (let k = 0; k <= Γ.entradas.length; k += Math.max(1, Math.floor(Γ.entradas.length / 5))) {
      const snapI = await I.crearSnapshot(Γ.estados[k], Γ.hashes[k], R), snapM = M.crearSnapshot(Γ.estados[k], Γ.hashes[k], R);
      assert.equal(snapI.Q, snapM.Q, msg(c, `Q en ${k}`));
      assert.deepEqual({ n: snapI.n, h: snapI.h, epoca: snapI.epoca }, { n: snapM.n, h: snapM.h, epoca: snapM.epoca });
      const S = await I.restaurarSnapshot(snapI, Γ.hashes, R);
      assert.deepEqual(await I.fold(S, Γ.entradas.slice(k), R), Γ.estados.at(-1));
      assert.equal(await I.restaurarSnapshot({ ...snapI, h: C.HASH_FALSO }, Γ.hashes, R), null);
      assert.equal(await I.restaurarSnapshot({ ...snapI, Q: C.HASH_FALSO }, Γ.hashes, R), null);
    }
  }
});
const PROY_JUGUETE = M.JUGUETE_PROY;
test('L9 L10 PROYECCIONES del núcleo en la impl: π y g coinciden con el oráculo paso a paso', async () => {
  exigir();
  for (const k of ['cabeza', 'hashes', 'epoca', 'sids']) {
    const p = I.PROYECCIONES[k], q = M.PROYECCIONES[k];
    assert.ok(p && typeof p.pi === 'function' && typeof p.g === 'function', `PROYECCIONES.${k}`);
    assert.equal(p.sensibleAEpoca, false); assert.equal(p.sensibleATiempo, false);
  }
  for (let c = 0; c < Math.min(CASOS_IMPL, 40); c++) {
    const Γ = escenario(c).run.ΓX;
    for (let i = 0; i <= Γ.entradas.length; i++) {
      const S = Γ.estados[i], ctx = { registro: R, h: Γ.hashes[i], hashes: Γ.hashes.slice(0, i + 1), parametros: S.parametros };
      for (const k of ['cabeza', 'hashes', 'epoca', 'sids']) {
        const y = await I.PROYECCIONES[k].pi(S, ctx);
        assert.deepEqual(y, M.PROYECCIONES[k].pi(S, ctx), msg(c, `${k}.pi(S_${i})`));
        if (i < Γ.entradas.length) assert.deepEqual(await I.PROYECCIONES[k].g(y, Γ.entradas[i], { registro: R, parametros: S.parametros }),
          M.PROYECCIONES[k].pi(Γ.estados[i + 1], { registro: R, h: Γ.hashes[i + 1], hashes: Γ.hashes.slice(0, i + 2), parametros: Γ.estados[i + 1].parametros }), msg(c, `${k}.g en ${i + 1}`));
      }
    }
  }
});
test('L9 L15 L22 L27 resolverProyeccion de la impl = oráculo (acción, Y, checkpoint, desde) con snapshots, t_ref y checkpoints corruptos', async () => {
  exigir();
  for (let c = 0; c < Math.min(CASOS_IMPL, 40); c++) {
    const Γ = escenario(c).run.ΓX, L = Γ.entradas.length, r = prng(SEMILLA + 13 * c);
    const tray = { streamId: Γ.streamId, g: Γ.g, entradas: Γ.entradas, bloques: Γ.bloques, hashes: Γ.hashes };
    const snaps = [entero(r, 0, L), entero(r, 0, L)].map(k => M.crearSnapshot(Γ.estados[k], Γ.hashes[k], R));
    snaps.push({ ...M.crearSnapshot(Γ.estados[L], Γ.hashes[L], R), Q: C.HASH_FALSO });
    const proys = [['impl.cabeza', I.PROYECCIONES.cabeza, M.PROYECCIONES.cabeza], ['impl.epoca', I.PROYECCIONES.epoca, M.PROYECCIONES.epoca],
      ...Object.entries(PROY_JUGUETE).map(([k, p]) => [k, p, p])];
    for (const [nombre, pI, pM] of proys) for (let rep = 0; rep < 6; rep++) {
      const n = entero(r, 0, L), m = entero(r, 0, L), tRef = pM.sensibleATiempo ? entero(r, 0, 2) : undefined;
      const Yn = pM.pi(Γ.estados[n], { registro: R, tRef, h: Γ.hashes[n], hashes: Γ.hashes.slice(0, n + 1), parametros: Γ.estados[n].parametros });
      let cp = { streamId: Γ.streamId, n, h: Γ.hashes[n], ver: pM.ver, epoca: Γ.estados[n].epoca, ...(pM.sensibleATiempo ? { tRef: elegir(r, [tRef, tRef + 1]) } : {}) };
      const x = r();
      if (x < 0.1) cp = { ...cp, h: C.HASH_FALSO }; else if (x < 0.15) cp = { ...cp, ver: pM.ver + 1 }; else if (x < 0.2) cp = { ...cp, epoca: cp.epoca + 1 };
      const guardado = r() < 0.1 ? null : { Y: Yn, checkpoint: cp };
      const args = { proy: pM, guardado, trayectoria: tray, m, registro: R, snapshots: snaps, tRef };
      const esperado = M.resolverProyeccion(args);
      const obtenido = await I.resolverProyeccion({ ...args, proy: pI });
      assert.deepEqual({ accion: obtenido.accion, Y: obtenido.Y, checkpoint: obtenido.checkpoint, desde: obtenido.desde },
        { accion: esperado.accion, Y: esperado.Y, checkpoint: esperado.checkpoint, desde: esperado.desde }, msg(c, `${nombre} n=${n} m=${m}`));
    }
  }
});

// ═════════════════════════ L21 / L25 · cortes y composición ═════════════════════════
test('L21 esCerrado, cerrarCorte y proyectarCorte de la impl = oráculo en grafos aleatorios; DIVERGENCIA_DEP', async () => {
  exigir();
  const r = prng(SEMILLA ^ 0x3131); const S = [STREAM_X, STREAM_Y, STREAM_Z];
  const hS = (x, k) => (x * 1000 + k + 1).toString(16).padStart(64, '0');
  for (let caso = 0; caso < 800; caso++) {
    const largos = S.map(() => entero(r, 0, 4)); const tray = {};
    S.forEach((X, xi) => { tray[X] = { hashes: Array.from({ length: largos[xi] + 1 }, (_, k) => hS(xi, k)), entradas: [] }; });
    S.forEach((X, xi) => { for (let i = 0; i < largos[xi]; i++) {
      const deps = []; for (const [yi, Y] of S.entries()) if (yi !== xi && r() < 0.3) { const k = entero(r, 0, largos[yi]); deps.push({ stream: Y, k, h: r() < 0.03 ? C.HASH_FALSO : hS(yi, k) }); }
      tray[X].entradas.push({ deps });
    } });
    const σ = {}; S.forEach((X, xi) => { if (r() < 0.85) σ[X] = entero(r, 0, largos[xi]); });
    assert.equal(await I.esCerrado(σ, tray), M.esCerrado(σ, tray), `caso ${caso}`);
    assert.deepEqual(await I.cerrarCorte(σ, tray), M.cerrarCorte(σ, tray), `caso ${caso}`);
  }
  // proyectarCorte con trayectorias reales
  const { run } = escenario(2);
  const tray = { [STREAM_X]: run.ΓX, [STREAM_Y]: run.ΓY };
  const φ = est => Object.fromEntries(Object.entries(est).map(([k, s]) => [k, s.n]));
  for (let nx = 0; nx <= run.ΓX.entradas.length; nx++) for (const ny of [0, run.ΓY.entradas.length]) {
    const σ = { [STREAM_X]: nx, [STREAM_Y]: ny };
    assert.deepEqual(await I.proyectarCorte(σ, tray, R, φ), M.proyectarCorte(σ, tray, R, φ));
  }
});
test('L25 componer de la impl = oráculo (procedencia y CONFLICTO)', async () => {
  exigir();
  const casos = [[{ streamId: STREAM_X, hechos: { a: 1, b: 2 } }, { streamId: STREAM_Y, hechos: { c: 3 } }],
    [{ streamId: STREAM_X, hechos: { a: 1 } }, { streamId: STREAM_Y, hechos: { a: 1 } }], [{ streamId: STREAM_X, hechos: {} }], []];
  for (const a of casos) assert.deepEqual(await I.componer(a), M.componer(a));
});

// ═════════════════════════ L13 / L30 · diferencia ═════════════════════════
test('L13 L30 diferencia de la impl = oráculo (Δ, Conflictos, Exceso) en objetivos aleatorios con identidades repetidas', async () => {
  exigir();
  const r = prng(SEMILLA ^ 0x4141);
  for (let caso = 0; caso < 500; caso++) {
    const O = Array.from({ length: entero(r, 0, 12) }, () => ({ sid: sidDe(entero(r, 0, 8)), q: entero(r, 0, 2) }));
    const A = new Set(Array.from({ length: entero(r, 0, 6) }, () => sidDe(entero(r, 0, 10))));
    const inst = { id: o => o.sid, rec: (o, A) => A.has(o.sid), reconocidos: A => [...A] };
    assert.deepEqual(await I.diferencia(O, A, inst), M.diferencia(O, A, inst), `caso ${caso}`);
    const instSin = { id: o => o.sid, rec: (o, A) => A.has(o.sid) };
    assert.deepEqual(await I.diferencia(O, A, instSin), M.diferencia(O, A, instSin), `caso ${caso} (sin reconocidos)`);
  }
});
test('L30 importar dos veces con la impl ⇒ 0 compromisos; reanudar = no interrumpir', async () => {
  exigir();
  const inst = { id: o => o.sid, rec: (o, S) => Object.hasOwn(S.sids, o.sid) };
  const O = await Promise.all([['a', 3], ['b', 1], ['c', 4]].map(async (f, j) => ({ u: 'dueño', sid: await I.deriveSid('imp:juguete', [j, f]), tipo: 'sumar', args: { clave: f[0], q: f[1] }, deps: [] })));
  const correr = async (cortes) => {
    const a = await I.crearAlmacenMemoria(); await I.crear(a, C.genesisX(), R); let total = 0;
    for (const k of cortes) {
      const S = await I.estado(a, STREAM_X, { registro: R });
      const { delta } = await I.diferencia(O, S, inst);
      for (const o of delta.slice(0, k)) { const res = await I.appendIfHead(a, STREAM_X, await a.cabeza(STREAM_X), 'dueño', o, { registro: R }); if (res.resultado === 'COMPROMETIDO') total++; }
    }
    return { total, Γ: await I.leerTrayectoria(a, STREAM_X) };
  };
  const una = await correr([Infinity, Infinity]);
  assert.equal(una.total, 3);
  for (const cortes of [[1, Infinity], [2, Infinity], [0, 1, 1, Infinity]]) assert.deepEqual((await correr(cortes)).Γ.hashes, una.Γ.hashes, `cortes ${cortes}`);
});

// ═════════════════════════ L31 · configuración ═════════════════════════
test('L31 REGLA_NODO de la impl: nucleo.nodo@1, sin tipos, parámetros con los valores iniciales de §3.5', async () => {
  exigir();
  assert.equal(I.REGLA_NODO.id, 'nucleo.nodo@1');
  assert.deepEqual(Object.keys(I.REGLA_NODO.tipos ?? {}), []);
  const R2 = { ...R, 'nucleo.nodo@1': I.REGLA_NODO };
  const gN = { streamId: '0d'.repeat(16), predecesor: null, C0: { 'nucleo.regla': 'nucleo.nodo@1', 'nucleo.constituyente': 'nodo' } };
  const S0 = await I.estadoInicial(gN, R2);
  assert.deepEqual(S0.parametros, M.estadoInicial(gN, R).parametros);
  for (const [p, v, ok] of [['nodo.reintentos', 0, true], ['nodo.reintentos', -1, false], ['nodo.snapshots', { cada: 10 }, true], ['nodo.snapshots', { cada: 0 }, false],
    ['nodo.anteFork', 'seguirMarcada', true], ['nodo.anteFork', 'elegirLaMasLarga', false], ['nodo.verificarAlIncorporar', 'cadena', true], ['nodo.materialización', 'anticipada', true], ['nodo.verificarAlAbrir', 'desdeCheckpoint', true]]) {
    const e = { epoca: 0, u: 'nodo', sid: '0001', deps: [], clase: 'contrato', tipo: 'FijarParámetro', args: { [p]: v } };
    assert.equal((await I.admitir(S0, e, { registro: R2 })).ok, ok, `${p} = ${JSON.stringify(v)}`);
  }
});
