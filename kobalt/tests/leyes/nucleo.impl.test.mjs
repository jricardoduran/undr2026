// Kobalt — CONTRATO DE IMPLEMENTACIÓN del núcleo general (fase 1 + ENMIENDA E1–E8).
// Compara `kobalt/src/nucleo/index.mjs` contra el modelo de referencia `kobalt/tests/modelos/nucleo.modelo.mjs`.
// Specs: kobalt/specs/2026-11-11_fase1-nucleo.md (con su Anexo) y kobalt/specs/2026-11-11_fase1-enmienda-preguntas.md
// (prevalece en lo que dice; su Anexo enumera los 11 cambios de este encabezado, marcados aquí con [E…]).
// Mientras el módulo no exista, TODAS estas pruebas fallan con un mensaje que indica la ruta esperada y la API pendiente.
//
// Ejecutar:  node --test 'kobalt/tests/leyes/*.test.mjs'
// Variables: KOBALT_SEED, KOBALT_CASOS, KOBALT_NUCLEO_IMPL (ruta alternativa de la implementación: así se
//            ejecutan los mutantes sobre una COPIA temporal; también sirve para validar estas pruebas contra el modelo).
//
// ════════════════════════════════════ API EXIGIDA ════════════════════════════════════
// `kobalt/src/nucleo/index.mjs` debe exportar exactamente estos nombres (puede exportar más) [E1: + `aportes`]. Cualquier función
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
//     {id, D0, tipos: {tipo | 'prefijo*' ↦ (args, tipo) → bool}, tiposInternos?(e) → [tipo],
//      guarda(D, e, parametros, lect) → 'ok'|motivo, T(D, e, parametros) → D',
//      sigma: {p ↦ {dominio: v → bool, inicial}}, guardaPar?(m, D, parametros), migraDesde?: {idRegla ↦ D → D},
//      estables?: {nombre ↦ (D, ...args) → bool}, codD?(D) → valor CV}
//     [E3] tipos: una clave exacta gana; entre claves patrón 'prefijo*', la de prefijo más largo. El validador recibe
//          (args, tipo). Ningún patrón coincide con 'FijarParámetro' ni con 'Sellar' (reservados del núcleo).
//     [E4] G1 exige capacidad para tipo(e) Y para cada t ∈ tiposInternos(e) (solo se llama sobre entradas de dominio que
//          pasaron G5); si falta alguna ⇒ NO_AUTORIZADO. Si tiposInternos no devuelve una lista de textos ⇒ NO_AUTORIZADO.
//     lect.estable(stream, nombre, ...args) → bool: evalúa en el checkpoint (Y,k,h) de e.deps; nombres del núcleo:
//     'nucleo.sellado', 'nucleo.sid'(sidHex), 'nucleo.nAlMenos'(k); el resto, estables de la regla de Y sobre S_Y(k).
//     [E2] 'nucleo.sid'(s₀) = ∃ i ≤ k : Γ_Y.entradas[i−1].sid = s₀ (sobre la TRAYECTORIA; no depende de retenciónSids).
//     [E5] S_k (de X o de Y) se obtiene SOLO por Fold o por un snapshot validado contra h_k. `Γ.estados` (si viene en
//          una trayectoria pasada como argumento: conocidas, trayectoria, tray) es una proyección sin checkpoint: se
//          IGNORA. Prueba: alterar Γ.estados no cambia ningún resultado.
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
//   incorporar(almacen, streamId, cabeza, bloques, cabezaFinal, ctx:{registro, readmitir?, nodo?}) → resultado (ATÓMICO)
//        [E6] readmitir := ctx.readmitir si viene; si no, ctx.nodo.parametros['nodo.verificarAlIncorporar'] =
//        'cadena+readmisión'; si tampoco hay ctx.nodo, REGLA_NODO.sigma['nodo.verificarAlIncorporar'].inicial. Sin literal
//        de configuración en el código (revisión estática: ningún «readmitir ?? true»).
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
//   Proyección = {id, ver, sensibleAEpoca, sensibleATiempo} más UNA de dos formas [E1]:
//     clásica:  {pi(S, ctx), g?(Y, e, ctx)}   ctx de pi = {registro, tRef, h, hashes, parametros}; ctx de g = {registro,
//               parametros (C_ε antes de e), tRef}
//     monoidal: {f(e, ctx), monoide: {unidad, op(a, b), inv?(a), conmutativo?, idempotente?}, obs(acum, ctx), leeEstado?}
//               ctx de f = {k, parametros (C_ε antes de e_k), S: S_{k−1} (solo si leeEstado)} — f NUNCA recibe tRef;
//               ctx de obs = {parametros (C_{ε_j}), S: S_j (solo si leeEstado), tRef}. Se distingue por `typeof f`.
//   PROYECCIONES = {cabeza, hashes, epoca, sids}   (§7.7; Y = {n,h} · [h_0…h_n] · {epoca, parametros} · {n, sids})
//   crearSnapshot(S, h, registro) → {S, n, h, epoca, ver, Q}   Q = 𝔇(T_N, CV({D: codD(D), epoca, n, parametros, sellado, sids}))
//   restaurarSnapshot(snap, hashesLocales, registro) → S | null
//   resolverProyeccion({proy, guardado, trayectoria, i? = 0, m, registro, snapshots?, tRef?})
//        → {accion: 'REUTILIZAR'|'ACTUALIZAR'|'RECONSTRUIR'|'DISCONTINUIDAD', Y, acum? (solo monoidal), checkpoint, desde}
//        clásica: guardado = null|{Y, checkpoint}; exige i = 0; checkpoint = {streamId, n, h, ver, epoca[, tRef si
//          sensibleATiempo]}; tabla §7.4 de la fase 1; desde = posición de partida usada (snapshot o checkpoint).
//        [E1] monoidal: guardado = null|{acum, checkpoint}; ventana (i, m]; se guarda acum (nunca obs(acum)) y
//          Y = obs(acum, ctx_m) se calcula SIEMPRE. checkpoint = {streamId, n: m, h: h_m, ver, epoca: ε_m[, i, hI: h_i si
//          i > 0]} y NUNCA tRef. Tabla (en este orden): sin guardado, ver distinta, (c.i ?? 0) ≠ i o (i > 0 y c.hI ≠ h_i)
//          ⇒ RECONSTRUIR · streamId distinto, c.n < i, c.n > n_local, h(c.n) ≠ c.h o c.epoca ≠ ε(Γ_{c.n}) ⇒
//          DISCONTINUIDAD (y se reconstruye) · c.n > m ⇒ RECONSTRUIR · c.n = m ⇒ REUTILIZAR · c.n < m ⇒ ACTUALIZAR con
//          acum ⊗ (⊗ aportes(c.n, m)). desde = i al reconstruir; c.n al reutilizar o actualizar. Con leeEstado, S_a se
//          obtiene del mayor snapshot válido ≤ a + sufijo (E5).
//   [E1] aportes(proy, trayectoria, i, j, registro, snapshots?) → [f(e_k, ctx_k)]_{k=i+1..j} (pura; lanza si 0 ≤ i ≤ j ≤ n
//        no se cumple). Es la única definición de la contribución.
//   esCerrado(σ, trayectorias) → bool · cerrarCorte(σ, trayectorias) → {resultado:'CERRADO', σ} | {resultado:'DIVERGENCIA_DEP', X, i, Y}
//   proyectarCorte(σ, trayectorias, registro, φ | proyecciónMonoidal) → {resultado:'OK', valor} | {resultado:'NO_CERRADO'}
//        [E1.5] con una proyección monoidal: si !monoide.conmutativo ⇒ {resultado:'NO_CONMUTATIVO'} (se juzga ANTES que el
//        cierre del corte); si no, valor = ⊗_X acum_X(0, σ_X) (obs no se aplica aquí: C_ε es por trayectoria).
//   componer(aportes:[{streamId, hechos}]) → {resultado:'COMPUESTO', hechos:{clave ↦ {streamId, valor}}} | {resultado:'CONFLICTO', clave, streams}
//        [E8] dos aportes con el mismo StreamID ⇒ {resultado:'STREAM_DUPLICADO', streamId} (el primero repetido; se
//        comprueba antes que los conflictos). Las claves son propiedades propias (una clave «__proto__» es un hecho).
//
// 5. Diferencia (§7.8)
//   diferencia(O, A, {id, rec, reconocidos?}) → {delta, conflictos, exceso}   (pura; una sola función para todas las instancias)
//        [E7] las identidades son valores CV y se comparan por hex(CV(id)); una id que no es CV ⇒ lanza. conflictos y exceso
//        devuelven identidades (la primera aparición, en orden de aparición).
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

const API_FASE1 = [
  'cv', 'decCV', 'derivar', 'ETIQUETAS', 'encGenesis', 'decGenesis', 'hashGenesis', 'encEntrada', 'decEntrada', 'hashPaso', 'deriveSid',
  'estadoInicial', 'admitir', 'transformar', 'fold',
  'crearAlmacenMemoria', 'crear', 'appendIfHead', 'incorporar', 'leerCopia', 'verificar', 'leerTrayectoria', 'estado', 'apiReplica', 'resolver',
  'PROYECCIONES', 'crearSnapshot', 'restaurarSnapshot', 'resolverProyeccion', 'esCerrado', 'cerrarCorte', 'proyectarCorte', 'componer',
  'diferencia', 'REGLA_NODO',
];
const API_ENMIENDA = ['aportes'];
const API = [...API_FASE1, ...API_ENMIENDA];
const DIR_NUCLEO = fileURLToPath(new URL('../../src/nucleo/', import.meta.url));
const RUTA = process.env.KOBALT_NUCLEO_IMPL ? pathToFileURL(process.env.KOBALT_NUCLEO_IMPL).href : new URL('../../src/nucleo/index.mjs', import.meta.url).href;
let I = null, errorCarga = null;
try { I = await import(RUTA); } catch (err) { errorCarga = err; }
// exigir() comprueba la API de la fase 1 (y la que pida cada prueba): así una implementación de la fase 1 sin la enmienda
// falla SOLO en las pruebas que la enmienda cambia, no en todas.
function exigir(...extra) {
  if (!I) assert.fail(`IMPLEMENTACIÓN AUSENTE: no se pudo importar ${fileURLToPath(RUTA)}\n  causa: ${errorCarga?.code ?? ''} ${errorCarga?.message ?? ''}\n`
    + `  Debe exportar: ${API.join(', ')} (ver el encabezado de kobalt/tests/leyes/nucleo.impl.test.mjs).`);
  const faltan = [...API_FASE1, ...extra].filter(k => !(k in I));
  if (faltan.length) assert.fail(`API incompleta en ${fileURLToPath(RUTA)}: faltan ${faltan.join(', ')}`);
}

const R = M.REGISTRO_JUGUETE;
const { SEMILLA, CASOS, prng, entero, elegir, STREAM_X, STREAM_Y, STREAM_Z, hex, deHex, sidDe } = C;
const CASOS_IMPL = CASOS; // H6: sin tope; KOBALT_CASOS escala también el contrato
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
test('contrato: kobalt/src/nucleo/index.mjs existe y exporta la API exigida (incluida la de la enmienda)', () => { exigir(...API_ENMIENDA); });
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
  for (let c = 0; c < CASOS_IMPL; c++) {
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
  for (let c = 0; c < CASOS_IMPL; c++) {
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
  for (let c = 0; c < CASOS_IMPL; c++) {
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

// ═══════════════════════════ Huecos detectados en la verificación de la fase 2 (H1–H4) ═══════════════════════════
test('L8 M1 (H1) anexarSiCabeza del adaptador de la impl compara n Y h, y exige m = n + |bloques|', async () => {
  exigir();
  const Γ = escenario(3).run.ΓX.bloques.length >= 2 ? escenario(3).run.ΓX : C.ejecutarPuro(M, C.generarEscenario(M, 3, 30)).ΓX;
  assert.ok(Γ.bloques.length >= 2);
  const a = await I.crearAlmacenMemoria(); await I.crear(a, Γ.g, R);
  assert.equal((await a.anexarSiCabeza(STREAM_X, { n: 0, h: Γ.hashes[0] }, [Γ.bloques[0]], { n: 1, h: Γ.hashes[1] })).resultado, 'OK');
  assert.deepEqual(N(await a.anexarSiCabeza(STREAM_X, { n: 1, h: C.HASH_FALSO }, [Γ.bloques[1]], { n: 2, h: Γ.hashes[2] })), { resultado: 'CONFLICTO', n: 1, h: Γ.hashes[1] }, 'misma n, otro h: dos copias distintas');
  assert.equal((await a.anexarSiCabeza(STREAM_X, { n: 1, h: Γ.hashes[1] }, [Γ.bloques[1]], { n: 1, h: Γ.hashes[2] })).resultado, 'CONFLICTO', 'cabeza final incoherente con |bloques|');
  assert.deepEqual(await a.cabeza(STREAM_X), { n: 1, h: Γ.hashes[1] });
});
test('L20 (H2) la impl llama a T de la regla SIEMPRE con exactamente 3 argumentos (nunca recibe Lect)', async () => {
  exigir();
  const vigilar = r => Object.freeze({ ...r, T: (...xs) => { if (xs.length !== 3) throw new Error(`T recibió ${xs.length} argumentos`); return r.T(...xs); } });
  const R3 = Object.freeze(Object.fromEntries(Object.entries(R).map(([k, r]) => [k, vigilar(r)])));
  for (let c = 0; c < Math.min(CASOS_IMPL, 40); c++) {
    const { esc, run } = escenario(c);
    const ob = await C.ejecutarAlmacen(I, esc, { registro: R3 });
    assert.deepEqual(ob.logX.map(N), run.logX.map(N), msg(c));
    assert.deepEqual(await I.fold(await I.estadoInicial(esc.gX, R3), run.ΓX.entradas, R3), run.ΓX.estados.at(-1), msg(c));
  }
});
test('L31 §4.3 (H3) retenciónSids = ventana(N) en la impl = oráculo; el reintento fuera de la ventana se readmite', async () => {
  exigir();
  for (const V of [1, 2, 3]) for (let c = 0; c < Math.min(CASOS_IMPL, 25); c++) {
    const esc = { ...C.generarEscenario(M, SEMILLA + 300 + c), gX: C.genesisX({ 'nucleo.retenciónSids': { ventana: V } }) };
    const run = C.ejecutarPuro(M, esc), ob = await C.ejecutarAlmacen(I, esc, { registro: R });
    assert.deepEqual(ob.logX.map(N), run.logX.map(N), msg(300 + c, `ventana ${V}`));
    assert.deepEqual(await I.estado(ob.almacen, STREAM_X, { registro: R }), run.ΓX.estados.at(-1), msg(300 + c, `ventana ${V}`));
  }
  const a = await I.crearAlmacenMemoria(); await I.crear(a, C.genesisX({ 'nucleo.retenciónSids': { ventana: 2 } }), R);
  const ap = async sid => (await I.appendIfHead(a, STREAM_X, await a.cabeza(STREAM_X), 'dueño', { u: 'dueño', sid, tipo: 'sumar', args: { clave: 'a', q: 1 }, deps: [] }, { registro: R })).resultado;
  assert.equal(await ap('0001'), 'COMPROMETIDO'); assert.equal(await ap('0001'), 'YA_COMPROMETIDO');
  assert.equal(await ap('0002'), 'COMPROMETIDO'); assert.equal(await ap('0003'), 'COMPROMETIDO');
  assert.equal(await ap('0001'), 'COMPROMETIDO', 'fuera de la ventana: doble efecto (contraejemplo §4.3)');
});
test('L18 L31 (H4) la impl rechaza cambiar de regla sin Migra registrada: INADMISIBLE(sinMigracion)', async () => {
  exigir();
  const S0 = await I.estadoInicial(C.genesisX(), R);
  const e = { epoca: 0, u: 'dueño', sid: '0001', deps: [], clase: 'contrato', tipo: 'FijarParámetro', args: { 'nucleo.regla': 'conjunto@1' } };
  assert.deepEqual(Nadm(await I.admitir(S0, e, { registro: R })), { ok: false, rechazo: 'INADMISIBLE', motivo: 'sinMigracion' });
  assert.equal((await I.admitir(S0, { ...e, args: { 'nucleo.regla': 'contador@2' } }, { registro: R })).ok, true);
});

// ═══════════════════════════ ENMIENDA E1–E8 (contrato) ═══════════════════════════
const MONO = M.JUGUETE_MONO;
const NR = r => ({ accion: r.accion, Y: r.Y, acum: r.acum, checkpoint: r.checkpoint, desde: r.desde });
const falsificar = Γ => ({ ...Γ, estados: (Γ.estados ?? [M.estadoInicial(Γ.g, R)]).map(S => ({ ...S, D: { orden: ['zz'], v: { zz: 99 }, miembros: { zz: true }, nd: 99, nacidos: [], hechos: [] },
  parametros: { ...S.parametros, 'nucleo.capacidades': { nadie: [] }, 'límite': '≥0' }, sids: {}, sellado: !S.sellado, epoca: S.epoca + 7 })) });
test('E1 aportes de la impl = oráculo para toda proyección monoidal de juguete, en ventanas aleatorias (con y sin snapshots)', async () => {
  exigir('aportes');
  for (let c = 0; c < CASOS_IMPL; c++) {
    const Γ = escenario(c).run.ΓX, L = Γ.entradas.length, r = prng(SEMILLA + 23 * c);
    const snaps = [entero(r, 0, L)].map(k => M.crearSnapshot(Γ.estados[k], Γ.hashes[k], R));
    for (const [k, campo] of [[entero(r, 0, L), 'Q'], [entero(r, 0, L), 'h']]) { // inválidos con S alterado: se ignoran (E5)
      const malo = structuredClone(Γ.estados[k]); malo.D = { orden: ['zz'], v: { zz: 99, a: 99 }, miembros: {}, ops: 0 };
      snaps.push({ ...M.crearSnapshot(Γ.estados[k], Γ.hashes[k], R), S: malo, [campo]: C.HASH_FALSO });
    }
    for (const proy of Object.values(MONO)) for (let rep = 0; rep < 3; rep++) {
      const i = entero(r, 0, L), j = entero(r, i, L), sn = r() < 0.5 ? snaps : [];
      assert.deepEqual(await I.aportes(proy, Γ, i, j, R, sn), M.aportes(proy, Γ, i, j, R, sn), msg(c, `${proy.id} (${i},${j}]`));
    }
    await assert.rejects(async () => I.aportes(MONO.conteo, Γ, 1, 0, R), undefined, 'i > j');
    await assert.rejects(async () => I.aportes(MONO.conteo, Γ, 0, L + 1, R), undefined, 'j > n');
  }
});
test('L9 L22 V10 E1 resolverProyeccion MONOIDAL de la impl = oráculo (acción, Y, acum, checkpoint, desde) en ventanas (i,j] y checkpoints válidos, adelantados, de otra i o manipulados', async () => {
  exigir('aportes');
  for (let c = 0; c < CASOS_IMPL; c++) {
    const Γ = escenario(c).run.ΓX, L = Γ.entradas.length, r = prng(SEMILLA + 29 * c);
    const snaps = [M.crearSnapshot(Γ.estados[entero(r, 0, L)], null, R)].map(s => ({ ...s, h: Γ.hashes[s.n] }));
    { const k = entero(r, 0, L), malo = structuredClone(Γ.estados[k]); malo.D = { orden: ['zz'], v: { zz: 99, a: 99 }, miembros: {}, ops: 0 };
      snaps.push({ ...M.crearSnapshot(Γ.estados[k], Γ.hashes[k], R), S: malo, h: C.HASH_FALSO }); }
    for (const proy of Object.values(MONO)) for (let rep = 0; rep < 4; rep++) {
      const i = entero(r, 0, L), j = entero(r, i, L), n = entero(r, 0, L), tRef = entero(r, -1, 3);
      const base = { streamId: Γ.streamId, n, h: Γ.hashes[n], ver: proy.ver, epoca: Γ.estados[n].epoca, ...(i > 0 ? { i, hI: Γ.hashes[i] } : {}) };
      const x = r();
      const cp = x < 0.08 ? { ...base, h: C.HASH_FALSO } : x < 0.14 ? { ...base, epoca: base.epoca + 1 } : x < 0.2 ? { ...base, ver: proy.ver + 1 }
        : x < 0.26 ? { ...base, i: i + 1, hI: Γ.hashes[i + 1] ?? C.HASH_FALSO } : x < 0.3 && i > 0 ? { ...base, hI: C.HASH_FALSO } : x < 0.34 ? { ...base, n: L + 1 } : base;
      const guardado = r() < 0.1 ? null : { acum: M.plegar(proy.monoide, M.aportes(proy, Γ, Math.min(i, n), n, R)), checkpoint: cp };
      const args = { proy, guardado, trayectoria: { streamId: Γ.streamId, g: Γ.g, entradas: Γ.entradas, bloques: Γ.bloques, hashes: Γ.hashes }, i, m: j, registro: R, snapshots: snaps, tRef };
      assert.deepEqual(NR(await I.resolverProyeccion(args)), NR(M.resolverProyeccion(args)), msg(c, `${proy.id} i=${i} j=${j} n=${n} cp=${JSON.stringify(cp)}`));
    }
  }
});
test('L15 E1.4b la impl no guarda tRef en el checkpoint monoidal y nunca pasa tRef (ni nada más que k, parametros[, S]) a f', async () => {
  exigir('aportes');
  const Γ = escenario(4).run.ΓX, L = Γ.entradas.length; const claves = new Set();
  const espia = { ...MONO.umbral, id: 'mono.espia', f: (e, ctx) => { Object.keys(ctx).forEach(k => claves.add(k)); return MONO.umbral.f(e, ctx); } };
  const r1 = await I.resolverProyeccion({ proy: espia, guardado: null, trayectoria: Γ, m: Math.floor(L / 2), registro: R, tRef: 0 });
  assert.equal(Object.hasOwn(r1.checkpoint, 'tRef'), false);
  const r2 = await I.resolverProyeccion({ proy: espia, guardado: { acum: r1.acum, checkpoint: r1.checkpoint }, trayectoria: Γ, m: L, registro: R, tRef: 3 });
  assert.deepEqual(NR(r2), NR(M.resolverProyeccion({ proy: espia, guardado: { acum: r1.acum, checkpoint: r1.checkpoint }, trayectoria: Γ, m: L, registro: R, tRef: 3 })));
  assert.deepEqual([...claves].sort(), L ? ['k', 'parametros'] : []);
  const conS = new Set(); const espiaS = { ...MONO.merma, id: 'mono.espiaS', f: (e, ctx) => { Object.keys(ctx).forEach(k => conS.add(k)); return MONO.merma.f(e, ctx); } };
  await I.resolverProyeccion({ proy: espiaS, guardado: null, trayectoria: Γ, m: L, registro: R, tRef: 9 });
  assert.deepEqual([...conS].sort(), L ? ['S', 'k', 'parametros'] : []);
});
test('L21 E1.5 proyectarCorte de la impl con proyección monoidal = oráculo; no conmutativo ⇒ NO_CONMUTATIVO', async () => {
  exigir('aportes');
  for (let c = 0; c < Math.min(CASOS_IMPL, 60); c++) {
    const { run } = escenario(c); const r = prng(SEMILLA + 31 * c);
    const tray = { [STREAM_X]: run.ΓX, [STREAM_Y]: run.ΓY };
    const σ = { [STREAM_X]: entero(r, 0, run.ΓX.entradas.length), [STREAM_Y]: entero(r, 0, run.ΓY.entradas.length) };
    for (const p of Object.values(MONO)) assert.deepEqual(await I.proyectarCorte(σ, tray, R, p), M.proyectarCorte(σ, tray, R, p), msg(c, p.id));
    assert.deepEqual(await I.proyectarCorte({ [STREAM_X]: -1 }, tray, R, MONO.sumaMinPref), { resultado: 'NO_CONMUTATIVO' });
  }
});
test('L3 E2 lect.estable(Y, nucleo.sid) en la impl se define sobre la trayectoria: vale con retención ventana(1) posterior (Teorema E2.1)', async () => {
  exigir();
  let ΓY = M.trayectoriaNueva(C.genesisY(), R).Γ;
  for (const s of [{ u: 'dueño', sid: 'a0a0', tipo: 'fijar', args: { clave: 'k', v: 1 } }, { u: 'dueño', sid: 'a0a1', tipo: 'FijarParámetro', args: { 'nucleo.retenciónSids': { ventana: 1 } } },
    { u: 'dueño', sid: 'a0a2', tipo: 'fijar', args: { clave: 'z', v: 2 } }]) ΓY = M.comprometer(ΓY, M.cabezaDe(ΓY), 'dueño', { deps: [], ...s }, { registro: R }).Γ;
  assert.equal(ΓY.entradas.length, 3);
  const a = await almacenCon(I, [ΓY]); await I.crear(a, C.genesisX(), R);
  for (const [j, [k, sid, esperado]] of [[3, 'a0a0', 'COMPROMETIDO'], [1, 'a0a0', 'COMPROMETIDO'], [0, 'a0a0', 'INADMISIBLE'], [3, 'b0b0', 'INADMISIBLE']].entries()) {
    const sol = { u: 'dueño', sid: C.sidDe(4000 + j), tipo: 'sumar', args: { clave: 'a', q: 1, requiereSid: { stream: STREAM_Y, sid } }, deps: [{ stream: STREAM_Y, k, h: ΓY.hashes[k] }] };
    const S = await I.estado(a, STREAM_X, { registro: R });
    const e = { epoca: S.epoca, u: sol.u, sid: sol.sid, deps: sol.deps, clase: 'dominio', tipo: 'sumar', args: sol.args };
    assert.deepEqual(Nadm(await I.admitir(S, e, { registro: R, conocidas: { [STREAM_Y]: ΓY } })), Nadm(M.admitir(S, e, { registro: R, conocidas: { [STREAM_Y]: ΓY } })), `k=${k} sid=${sid}`);
    assert.equal((await I.appendIfHead(a, STREAM_X, await a.cabeza(STREAM_X), 'dueño', sol, { registro: R })).resultado, esperado, `k=${k} sid=${sid}`);
  }
});
test('E3 L16 E4 admitir de la impl = oráculo con tipos patrón y lotes (compuesto@1, todo@1)', async () => {
  exigir();
  const gC = C.genesisCompuesto(), S = await I.estadoInicial(gC, R);
  const gT = { streamId: STREAM_Z, predecesor: null, C0: { 'nucleo.regla': 'todo@1', 'nucleo.constituyente': 'dueño' } }, ST = await I.estadoInicial(gT, R);
  assert.deepEqual(S, M.estadoInicial(gC, R)); assert.deepEqual(ST, M.estadoInicial(gT, R));
  const casos = [
    [S, 'dueño', 'hacer:x', { x: '1' }], [S, 'dueño', 'hacer:', { x: '1' }], [S, 'dueño', 'hacer:largoX', { x: '1' }], [S, 'dueño', 'hacer:largoX', { x: '1', largo: true }],
    [S, 'dueño', 'hacer:exacto', {}], [S, 'dueño', 'hacer:exacto', { x: '1' }], [S, 'dueño', 'deshacer', { x: '1' }], [S, 'hacedor', 'hacer:y', { x: '1' }], [S, 'cajero', 'hacer:y', { x: '1' }],
    [S, 'cajero', 'lote', { acciones: ['a', 'b'] }], [S, 'cajero', 'lote', { acciones: ['a'] }], [S, 'cajero2', 'lote', { acciones: ['a', 'b'] }], [S, 'hacedor', 'lote', { acciones: ['a'] }],
    [S, 'cajero', 'lote', { acciones: ['lote'] }], [S, 'cajero', 'lote', { acciones: [] }], [S, 'cajero2', 'lote', { acciones: ['a', 'hacer:x'] }],
    [ST, 'dueño', 'cualquiera', null], [ST, 'dueño', 'cualquiera', 1], [ST, 'dueño', 'FijarParámetro', {}], [ST, 'dueño', 'FijarParámetro', null], [ST, 'dueño', 'FijarParámetro', { x: 1 }], [ST, 'dueño', 'Sellar', null],
  ];
  for (const [S_, u, tipo, args] of casos) {
    const e = { epoca: 0, u, sid: '0e0e', deps: [], clase: M.claseDe(tipo), tipo, args };
    assert.deepEqual(Nadm(await I.admitir(S_, e, { registro: R })), Nadm(M.admitir(S_, e, { registro: R })), `${u} ${tipo} ${JSON.stringify(args)}`);
  }
  const R2 = { ...R, 'compuesto@1': { ...M.COMPUESTO_1, tiposInternos: () => null } };
  const e = { epoca: 0, u: 'cajero2', sid: '0e0f', deps: [], clase: 'dominio', tipo: 'lote', args: { acciones: ['a'] } };
  assert.deepEqual(Nadm(await I.admitir(S, e, { registro: R2 })), { ok: false, rechazo: 'NO_AUTORIZADO' }, 'tiposInternos mal formado ⇒ falla cerrada');
});
test('E3 E4 posición: appendIfHead de la impl = oráculo en escenarios generados con compuesto@1 (patrones, lotes, i = nd + ε + 1)', async () => {
  exigir();
  for (let c = 0; c < CASOS_IMPL; c++) {
    const esc = C.generarEscenarioCompuesto(M, SEMILLA + c);
    const esperado = C.ejecutarPuro(M, esc), obtenido = await C.ejecutarAlmacen(I, esc, { registro: R });
    assert.deepEqual(obtenido.logX.map(N), esperado.logX.map(N), msg(c));
    const S = await I.estado(obtenido.almacen, STREAM_X, { registro: R });
    assert.deepEqual(S, esperado.ΓX.estados.at(-1), msg(c));
    assert.deepEqual(S.D.nacidos, esperado.ΓX.entradas.map((x, j) => (x.tipo === 'nacer' ? j + 1 : 0)).filter(Boolean), msg(c, 'posición'));
  }
});
test('L27 E5 Γ.estados falsos no influyen en la impl: admitir (G4/Lect), resolverProyeccion, aportes y proyectarCorte', async () => {
  exigir();
  let fallos = 0;
  for (let c = 0; c < Math.min(CASOS_IMPL, 60); c++) {
    const { esc, run } = escenario(c); const ΓX = run.ΓX, ΓY = run.ΓY, fX = falsificar(ΓX), fY = falsificar(ΓY), L = ΓX.entradas.length;
    for (const [j, p] of esc.propX.entries()) {
      const Sm = ΓX.estados.at(-1);
      const e = { epoca: Sm.epoca, u: p.sol.u, sid: p.sol.sid, deps: p.sol.deps ?? [], clase: M.claseDe(p.sol.tipo), tipo: p.sol.tipo, args: p.sol.args ?? null };
      assert.deepEqual(Nadm(await I.admitir(Sm, e, { registro: R, conocidas: { [STREAM_Y]: fY } })), Nadm(M.admitir(Sm, e, { registro: R, conocidas: { [STREAM_Y]: ΓY } })), msg(c, `propuesta ${j}`));
    }
    for (let i = 1; i <= L; i++) {
      const e = ΓX.entradas[i - 1];
      assert.deepEqual(Nadm(await I.admitir(ΓX.estados[i - 1], e, { registro: R, conocidas: { [STREAM_Y]: fY } })), Nadm(M.admitir(ΓX.estados[i - 1], e, { registro: R, conocidas: { [STREAM_Y]: ΓY } })), msg(c, `re‑admisión ${i}`));
    }
    for (const proy of [M.JUGUETE_PROY.coord, M.PROYECCIONES.epoca, M.JUGUETE_PROY.valores]) {
      const args = { proy, guardado: null, trayectoria: ΓX, m: L, registro: R, tRef: 1 };
      assert.deepEqual(NR(await I.resolverProyeccion({ ...args, trayectoria: fX })), NR(M.resolverProyeccion(args)), msg(c, proy.id));
    }
    const σ = { [STREAM_X]: L, [STREAM_Y]: ΓY.entradas.length };
    const φ = est => [est[STREAM_X].D, est[STREAM_Y].D];
    assert.deepEqual(await I.proyectarCorte(σ, { [STREAM_X]: fX, [STREAM_Y]: fY }, R, φ), M.proyectarCorte(σ, { [STREAM_X]: ΓX, [STREAM_Y]: ΓY }, R, φ), msg(c, 'proyectarCorte'));
    if ('aportes' in I) assert.deepEqual(await I.aportes(MONO.merma, fX, 0, L, R), M.aportes(MONO.merma, ΓX, 0, L, R), msg(c, 'aportes'));
    fallos++;
  }
  assert.ok(fallos > 0);
});
function forjadaE6() {
  let Γ = M.trayectoriaNueva(C.genesisX(), R).Γ;
  Γ = M.comprometer(Γ, M.cabezaDe(Γ), 'dueño', { u: 'dueño', sid: '0601', tipo: 'sumar', args: { clave: 'a', q: 1 }, deps: [] }, { registro: R }).Γ;
  const b2 = M.encEntrada({ epoca: 0, u: 'cajero', sid: '0602', deps: [], clase: 'contrato', tipo: 'FijarParámetro', args: { 'límite': 'ninguno' } });
  return { Γ, bloques: [Γ.bloques[0], b2], fin: { n: 2, h: M.hashPaso(Γ.hashes[1], b2) } };
}
const gNodo = { streamId: '0d'.repeat(16), predecesor: null, C0: { 'nucleo.regla': 'nucleo.nodo@1', 'nucleo.constituyente': 'nodo' } };
test('L31 E6 incorporar de la impl toma readmitir de ctx.nodo (o explícito; si no, el inicial de REGLA_NODO); sin literal en el código', async () => {
  exigir();
  const { Γ, bloques, fin } = forjadaE6();
  const nodo = v => ({ parametros: { ...M.estadoInicial(gNodo, R).parametros, 'nodo.verificarAlIncorporar': v } });
  for (const ctx of [{}, { nodo: nodo('cadena') }, { nodo: nodo('cadena+readmisión') }, { nodo: nodo('cadena+readmisión'), readmitir: false }, { nodo: nodo('cadena'), readmitir: true }]) {
    const a = await I.crearAlmacenMemoria(); await I.crear(a, Γ.g, R);
    const am = M.crearAlmacenMemoria(); M.crear(am, Γ.g, R);
    assert.deepEqual(N(await I.incorporar(a, STREAM_X, { n: 0, h: Γ.hashes[0] }, bloques, fin, { registro: R, ...ctx })),
      N(M.incorporar(am, STREAM_X, { n: 0, h: Γ.hashes[0] }, bloques, fin, { registro: R, ...ctx })), JSON.stringify(Object.keys(ctx).map(k => [k, ctx[k]?.parametros?.['nodo.verificarAlIncorporar'] ?? ctx[k]])));
  }
  if (process.env.KOBALT_NUCLEO_IMPL && !existsSync(DIR_NUCLEO)) return;
  const dir = process.env.KOBALT_NUCLEO_IMPL ? fileURLToPath(new URL('.', pathToFileURL(process.env.KOBALT_NUCLEO_IMPL))) : DIR_NUCLEO;
  for (const f of readdirSync(dir).filter(f => f.endsWith('.mjs'))) {
    const txt = readFileSync(join(dir, f), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
    assert.ok(!/readmitir\s*(\?\?|\|\|)\s*(true|false)\b/.test(txt) && !/readmitir\s*=\s*(true|false)\b/.test(txt), `${f}: valor por defecto de readmitir como literal (L31, E6)`);
  }
});
test('L13 E7 diferencia de la impl = oráculo con identidades compuestas (listas) e ids no CV ⇒ lanza', async () => {
  exigir();
  const r = prng(SEMILLA ^ 0xe7e7);
  const inst = { id: o => o.id, rec: (o, A) => A.some(x => JSON.stringify(x) === JSON.stringify(o.id)), reconocidos: A => A };
  for (let caso = 0; caso < 400; caso++) {
    const idA = () => elegir(r, [['a', 1], ['a', 2], ['b', 1], 'a', ['a', [1]], { k: 'a' }, 7]);
    const O = Array.from({ length: entero(r, 0, 10) }, () => ({ id: structuredClone(idA()), q: entero(r, 0, 1) }));
    const A = Array.from({ length: entero(r, 0, 4) }, () => structuredClone(idA()));
    assert.deepEqual(await I.diferencia(O, A, inst), M.diferencia(O, A, inst), `caso ${caso}`);
  }
  for (const malo of [undefined, 1.5, new Map(), () => 1]) await assert.rejects(async () => I.diferencia([{ id: malo }], [], inst), undefined, String(malo));
});
test('L25 E8 componer de la impl: StreamID duplicado ⇒ STREAM_DUPLICADO; la clave «__proto__» es un hecho (H5)', async () => {
  exigir();
  const casos = [[{ streamId: STREAM_X, hechos: { a: 1 } }, { streamId: STREAM_X, hechos: { b: 2 } }],
    [{ streamId: STREAM_X, hechos: {} }, { streamId: STREAM_Y, hechos: {} }, { streamId: STREAM_X, hechos: {} }],
    [{ streamId: STREAM_X, hechos: { a: 1 } }, { streamId: STREAM_Y, hechos: { a: 1 } }, { streamId: STREAM_Y, hechos: {} }],
    [{ streamId: STREAM_X, hechos: JSON.parse('{"__proto__": 1}') }, { streamId: STREAM_Y, hechos: JSON.parse('{"__proto__": 2}') }],
    [{ streamId: STREAM_X, hechos: JSON.parse('{"__proto__": 1, "b": 2}') }]];
  for (const a of casos) assert.deepEqual(await I.componer(a), M.componer(a), JSON.stringify(a));
  assert.equal(Object.hasOwn((await I.componer(casos[4])).hechos, '__proto__'), true);
});
