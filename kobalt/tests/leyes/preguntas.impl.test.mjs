// Kobalt — CONTRATO DE IMPLEMENTACIÓN de la fase 2: álgebra de preguntas.
// Compara `kobalt/src/preguntas/index.mjs` contra el modelo de referencia `kobalt/tests/modelos/preguntas.modelo.mjs`
// y contra el núcleo REAL `kobalt/src/nucleo/index.mjs` (aprobado).
// Spec: kobalt/specs/2026-11-11_fase2-preguntas.md (con su Anexo) sobre la enmienda E1
// (kobalt/specs/2026-11-11_fase1-enmienda-preguntas.md). Mientras el módulo no exista, TODAS estas pruebas fallan con un
// mensaje que indica la ruta esperada y la API pendiente.
//
// Ejecutar:  node --test 'kobalt/tests/leyes/*.test.mjs'
// Variables: KOBALT_SEED, KOBALT_CASOS, KOBALT_PREGUNTAS_IMPL (ruta alternativa de la implementación: así se ejecutan
//            los mutantes sobre una COPIA temporal y se valida este contrato contra el propio modelo).
//
// ═══════════════════════════════════════ API EXIGIDA ═══════════════════════════════════════
// `kobalt/src/preguntas/index.mjs` exporta estos nombres (puede exportar más). Sin dependencias externas. Importa el núcleo
// SOLO por `../nucleo/index.mjs`. NO importa nada de kobalt/tests/. Las funciones son síncronas o devuelven Promesa (las
// pruebas usan `await`).
//
// REGLAS DE CONSTRUCCIÓN (revisión estática + pruebas dinámicas):
//  R1 Sin motor de resolución propio (E1): toda respuesta sale de `resolverProyeccion`, `aportes` o `proyectarCorte` del
//     núcleo sobre la Π que devuelve `compilar`. Prueba dinámica: I.responder(q) ≡ N.resolverProyeccion({proy:
//     I.compilar(q).proy, …}) y I.distribuir ≡ N.proyectarCorte con esa Π. El código no recorre `Γ.entradas` para plegar.
//  R2 Ninguna operación escribe en Γ (L16, L27): el texto de kobalt/src/preguntas/ no menciona appendIfHead,
//     anexarSiCabeza, incorporar ni crear(…) del núcleo.
//  R3 Vocabulario (regla de la spec): `grep -niE 'producto|variante|stock|sku|bodega|precio|inventario|catálogo|venta|
//     cliente|depósito' kobalt/src/preguntas/` vacío. [PV] Por eso el producto de §5/§7.3 se llama `tupla`.
//  R4 Sin reloj, azar ni E/S: el texto no menciona Date, Math.random, performance, process, fs, fetch, crypto.getRandom.
//
// Notación: Γ = trayectoria verificada del núcleo {streamId, g, entradas, hashes}; registro = registro de reglas del núcleo;
// lectores = registro de lectores (abajo). Valores = valores CV (null, boolean, entero seguro, Uint8Array, texto, lista, mapa).
//
// 1. Pregunta (§4.1)                                    [PV] = precisión fijada por el verificador (la spec no la fija)
//   q ::= {φ: expr, aporte: Aporte, M: DescM, obs: DescObs [, sello: expr] [, ventanaTiempo: 'prefijo'|'filtro']}
//       | [q₁ … q_m]  (m ≥ 1; el producto de P5: Y = [Y₁…Y_m], acum = [acum₁…acum_m])
//       | {derivada: 'prefijos'|'segmentos', de: q}   (q^▷ / q^▦; las construye materializar)
//     Claves exactas ('φ' es la letra griega). Toda clave fuera de esa lista ⇒ PREGUNTA_INVÁLIDA.
//   Aporte ::= expr | {clave: expr, valor: expr [, etiqueta: expr]}; la segunda forma ≡ {op:'mapa', de:[{v:'clave'}, clave,
//     ({v:'etiqueta'}, etiqueta,)? {v:'valor'}, valor]}. [PV]
//   ETIQUETA = 'kobalt:preguntas:q:1'.  identidad(q) → hex64 = derivar(ETIQUETA, cv(q)) del núcleo (lanza si q no es CV).
//   tupla(qs) → qs (lista no vacía; id(tupla(qs)) = id(lista)).
//
// 2. Expresiones (§4.2) — total y determinista; null es falso en contexto booleano
//   expr ::= {v: CV} | {e: 'tipo'|'u'|'epoca'|'sid'|'clase'|'k'} | {a: [texto|entero≥0 …]} | {p: texto} | {x: texto}
//          | {lee: 'nombre@versión', con: [expr…]} | {op: o, de: [expr…]}             (claves exactas)
//   CAMPOS, OPERADORES (= {o ↦ [aridadMín, aridadMáx]}): '+','×','y','o','lista' [0,∞) · '−' [1,2] · '=','≠','<','≤','en',
//     'prefijo','campo' [2,2] · 'no','long','nulo?' [1,1] · 'si' [3,3] · 'mapa' [0,∞) y par. Aridad fuera ⇒ inválida.
//   validarExpr(expr, lectores) → {ok:true, leeEstado, usaTRef} | {ok:false, motivo}
//   evaluar(expr, amb) → CV | null.  amb = {e?, k?, parametros?, S?, vars?, lectores}
//     {e:c}: campo de la entrada (k = posición 1‑based); sin entrada ⇒ null. {a:ruta}: args[ruta] (texto ⇒ clave de mapa,
//     entero ⇒ índice de lista); si no existe ⇒ null. {p}: parametros[p] ?? null. {x}: vars[x] ?? null.
//     {lee}: lector de entrada fn(e, k, …args) (sin entrada ⇒ null) · de estado fn(S, …args) (sin S ⇒ null); si lanza o
//       devuelve algo que no es CV ⇒ null.
//     '+','×','−': enteros, resultado EXACTO (se comprueba al final, no en sumas parciales) dentro de los enteros seguros;
//       si no ⇒ null; −0 ⇒ 0. '+'() = 0, '×'() = 1, '−'(x) = −x.  '=','≠': igualdad de CV.  '<','≤': solo enteros (si no, null).
//     'y'/'o': todos/alguno === true ('y'() = true, 'o'() = false); 'no'(x) = x !== true; 'si'(c,a,b) = c === true ? a : b.
//     'en'(x, lista) = algún elemento CV‑igual; 'en'(x, mapa) = x es texto y clave propia; otro ⇒ null.
//     'prefijo'(p, t) = t empieza por p (ambos texto; si no, null). 'long': texto ⇒ nº de puntos de código; lista ⇒ largo;
//       mapa ⇒ nº de claves; otro ⇒ null. 'lista'(…) = la lista. 'mapa'(k1,v1,…): claves texto y sin repetir (si no, null).
//     'campo'(mapa, texto) | (lista, índice) ⇒ el elemento o null. 'nulo?'(x) = x === null.
//   Lectores: LECTORES_VACIO (registro congelado vacío) · registrarLector(lectores, 'nombre@versión', {clase:'entrada'|
//     'estado', fn}) → NUEVO registro congelado; registrar lo mismo devuelve el mismo registro; otro def con el mismo id lanza.
//   leeEstado(q) se DERIVA: verdadero sii alguna expresión (φ, aporte, sello o parámetros de obs) usa un lector de estado.
//   {x:'tRef'} solo puede aparecer en parámetros de obs: en φ, aporte o sello ⇒ PREGUNTA_INVÁLIDA (E1: f no recibe tRef). [PV]
//
// 3. Monoides (§7.3). DescM = {nombre, parametros?}. monoide(desc) → {unidad, op(a,b), inv?(a), conmutativo, idempotente,
//    grupo, envolvente?} (lanza si desc no está en la lista). Elementos (CV) y valor de aporte que aceptan («no aporta» ⇒ unidad):
//   'suma' ℤ, 0; aporte entero. inv. · 'sumaPorClave' mapas texto ↦ entero ≠ 0 (claves ordenadas, sin ceros), {}; aporte
//   {clave: texto, valor: entero} (valor 0 ⇒ {}). inv. · 'conteo' igual con valor ≥ 0; NO declara inv; envolvente =
//   sumaPorClave (ventanas por prefijos en ℤ^X). · 'mínimo'/'máximo' entero o null (= ±∞, unidad); aporte entero.
//   · 'último' [] (unidad) o [x]; aporte x ≠ null ⇒ [x]. · 'máximoPor' null (unidad) o [clave entera, v]; mayor clave y, a
//   igual clave, mayor hex(CV(v)). · 'extremoPrefijo' {modo:'mín'|'máx'}: [s, e] con e entero o null (= +∞ en mín, −∞ en
//   máx); unidad [0, null]; (s₁,e₁)⊗(s₂,e₂) = (s₁+s₂, ext(e₁, s₁+e₂)); aporte [s, e]. · 'unión' conjunto = lista sin
//   repetidos ordenada por hex(CV(x)), []; aporte lista. · 'conjuntoAQ' [A, Q] (conjuntos como el anterior), [[],[]];
//   aporte [listaA, listaQ]. · 'secuencia' lista, []; aporte lista (se concatena). · 'tupla' {de:[DescM…]} (m ≥ 1) = el
//   producto(M₁…M_m) de §7.3: componente a componente; aporte lista de m valores (cada uno «no aporta» ⇒ su unidad); inv si
//   todos son grupo; envolvente si todos son grupo o tienen envolvente y no todos son grupo. · 'mapa' {etiquetas:{τ: DescM}}
//   (ninguna etiqueta 'mapa'): mapa clave ↦ [τ, m_τ] o null (pregunta mal formada: dos etiquetas en una clave; absorbente);
//   unidad {}; aporte {clave, etiqueta, valor}; NUNCA es grupo (precisión [V] de la tabla §7.3). · 'escaneo' {de} y
//   'segmentos' {de}: materializaciones (VQ2: [L, t] con (L₁,t₁)(L₂,t₂) = (L₁ ‖ t₁⊗L₂, t₁⊗t₂); VQ3: niveles), no se
//   admiten como M de una pregunta.
//   leyes(desc) → {conmutativo, idempotente, grupo, envolvente: bool, ventana: 'prefijos'|'segmentos', distribucion:
//   'cubrimiento'|'particion'|'no', materializable: bool}  (ventana = prefijos sii grupo o envolvente; distribución:
//   conm∧idem ⇒ cubrimiento, conm ⇒ partición, si no 'no'; materializable = false sii contiene 'secuencia').
//   construirSegmentos(M, lista) → niveles: [] si vacía; N₀ = lista; N_ℓ[b] = N_{ℓ−1}[2b] ⊗ N_{ℓ−1}[2b+1]; hasta < 2 bloques.
//   ventanaSegmentos(M, niveles, i, j) → {acum, usados}: ⊗ EN ORDEN de los bloques diádicos alineados; usados ≤ 2⌈log₂ n⌉.
//   ventanaPrefijos(M, tabla=[P₁…P_n], i, j) → {acum: P_i⁻¹ ⊗ P_j (P₀ = unidad), usados ≤ 2}  (exige M.inv; ¡no P_j⊗P_i⁻¹!).
//   M en estas tres puede ser cualquier {unidad, op, inv?} (p. ej. S₃).
//
// 4. Observaciones (§7.5). DescObs = {nombre, parametros?}. Los parámetros que son valores son EXPRESIONES [PV], evaluadas
//    con {parametros: C_{ε_j}, S: S_j (si leeEstado), vars: {tRef, acum}, lectores} (sin entrada). Sobre qué M se define:
//   'identidad' (cualquiera) · 'valor' {de} (cualquiera; [PV] obs libre) · 'componente' {clave} (sumaPorClave, conteo:
//   acum[c] ?? 0; clave no texto ⇒ null) · 'ordenDesc' {n} (idem: [[clave, valor]…] por valor desc y clave asc (orden de
//   unidades UTF‑16), los n primeros) · 'fibra' {universo, conocidos} (unión, conjuntoAQ — usa A —: {miembros: [bool],
//   complemento: [conocido ∧ ¬miembro]}; formas incoherentes ⇒ null) · 'aplicar' {x0} (extremoPrefijo: x0 + min(0,e) en mín,
//   x0 + max(0,e) en máx; e null ⇒ x0) · 'cociente' (tupla(suma, suma): fracción reducida [a, b] con b > 0; b = 0 ⇒ null)
//   · 'umbral' {op ∈ '<','≤','=','≥','>' (LITERAL), valor} (suma, mínimo, máximo: acum op valor; no enteros ⇒ null)
//   · 'lista' {saldo?} (secuencia: sin saldo, la lista; con saldo, [[it, Σ saldo(it)]…] con vars.it; no entero ⇒ null).
//   Sobre un 'mapa' null, toda obs da null. obs fuera de su M o parámetros que faltan/sobran ⇒ PREGUNTA_INVÁLIDA.
//
// 5. Compilación (§4.1, E1)
//   compilar(q, {lectores}) → {resultado:'COMPILADA', id, proy} | {resultado:'PREGUNTA_INVÁLIDA', motivo}  (nunca lanza)
//     proy = Π MONOIDAL del núcleo: {id:'preguntas:'‖id, ver:id, sensibleAEpoca:false, sensibleATiempo: (obs usa tRef),
//       leeEstado (derivado), f(e, ctx), monoide:{unidad, op, inv? (solo grupos), conmutativo, idempotente}, obs(acum, ctx)}
//     f(e, ctx) = eval(φ) === true ? (inyectar(eval(aporte)) ?? unidad) : unidad, con amb {e, k: ctx.k, parametros:
//       ctx.parametros, S: ctx.S, vars: {}}. Para [q₁…q_m]: f = [f₁…f_m], monoide = tupla, obs = [obs₁…obs_m].
//
// 6. Operaciones (§5) — opciones o = {registro, lectores, snapshots?, tRef?}
//   responder(q, Γ, {i=0, j=n, guardado=null, …o}) → {resultado:'OK', accion, Y, acum, checkpoint, desde}
//     ≡ N.resolverProyeccion({proy: compilar(q).proy, guardado, trayectoria: Γ, i, m: j, registro, snapshots, tRef})
//   materializar(q, Γ, j, {tipo:'prefijos'|'segmentos', guardado?: mat, …o}) → {resultado:'OK', accion, mat} | {resultado:
//     'NO_GRUPO'} (prefijos sin grupo ni envolvente) | {resultado:'NO_MATERIALIZABLE'} (contiene secuencia: L34)
//     mat = {tipo, acum, checkpoint} = el registro del núcleo de la pregunta derivada {derivada: tipo, de: q} en (0, j]:
//     prefijos: acum = [[P₁…P_j], P_j] (en el grupo o la envolvente; P_k = acum(0,k)); segmentos: acum = niveles.
//   ventana(q, Γ, i, j, mat, o) → {resultado:'OK', Y, acum, usados} | {resultado:'MATERIALIZACIÓN_INVÁLIDA'} (mat de otra
//     pregunta o tipo, otro streamId, i ≠ 0 en el checkpoint, c.n < j, c.n > n, h o época que no casan con Γ: L22).
//     Y = obs(acum, ctx_j) (S_j por Fold: E5).
//   sellosEfectivos(q, Γ, o) → [τ₀=null, τ₁ … τ_n] con τ_k = max_{k'≤k} sello(e_k') (null = −∞; sello no entero no cuenta).
//   porTiempo(q, Γ, t₁, t₂, o) → {…responder, i, j} | SIN_SELLO | VENTANA_INVÁLIDA (t no entero ni null, o t₁ > t₂).
//     t = null ⇒ sin cota. 'prefijo' (por defecto): i = j(t₁), j = j(t₂) con j(t) = max{k : τ_k ≤ t} (búsqueda binaria).
//     'filtro': responder(filtroTiempo(q, t₁, t₂)) en (0, n], con filtroTiempo(q,t₁,t₂) = {…q, φ: {op:'y', de:[q.φ,
//     ({op:'<', de:[{v:t₁}, q.sello]})?, ({op:'≤', de:[q.sello, {v:t₂}]})?]}} (se omite la cota nula).
//   distribuir(q, σ, trayectorias, o) → {resultado:'OK', acum, Y} | NO_CONMUTATIVO | DEPENDE_DEL_ESTADO | NO_CERRADO |
//     PREGUNTA_INVÁLIDA, en ese orden de comprobación; acum = N.proyectarCorte(σ, trayectorias, registro, proy).valor;
//     Y = obs(acum, {parametros: {}, tRef}).
//   Toda operación con una pregunta inválida devuelve {resultado:'PREGUNTA_INVÁLIDA', motivo}.
// ═════════════════════════════════════════════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as N from '../../src/nucleo/index.mjs';
import * as P from '../modelos/preguntas.modelo.mjs';
import * as G from './preguntas.comun.mjs';

const API = ['ETIQUETA', 'identidad', 'tupla', 'CAMPOS', 'OPERADORES', 'LECTORES_VACIO', 'registrarLector', 'validarExpr', 'evaluar',
  'monoide', 'leyes', 'construirSegmentos', 'ventanaSegmentos', 'ventanaPrefijos', 'compilar',
  'responder', 'materializar', 'ventana', 'sellosEfectivos', 'porTiempo', 'filtroTiempo', 'distribuir'];
const DIR = fileURLToPath(new URL('../../src/preguntas/', import.meta.url));
const RUTA = process.env.KOBALT_PREGUNTAS_IMPL ? pathToFileURL(process.env.KOBALT_PREGUNTAS_IMPL).href : new URL('../../src/preguntas/index.mjs', import.meta.url).href;
let I = null, errorCarga = null;
try { I = await import(RUTA); } catch (err) { errorCarga = err; }
function exigir() {
  if (!I) assert.fail(`IMPLEMENTACIÓN AUSENTE: no se pudo importar ${fileURLToPath(RUTA)}\n  causa: ${errorCarga?.code ?? ''} ${errorCarga?.message ?? ''}\n`
    + `  Debe exportar: ${API.join(', ')} (ver el encabezado de kobalt/tests/leyes/preguntas.impl.test.mjs).`);
  const faltan = API.filter(k => !(k in I));
  if (faltan.length) assert.fail(`API incompleta en ${fileURLToPath(RUTA)}: faltan ${faltan.join(', ')}`);
}

const { SEMILLA, CASOS, prng, entero, R } = G;
const msg = (c, extra = '') => `semilla=${SEMILLA + c} (KOBALT_SEED=${SEMILLA}, caso ${c}) ${extra}`;
const igual = (a, b) => P.hexCV(a) === P.hexCV(b);
const ver = (a, b, m) => assert.ok(igual(a, b), `${m}\n  impl:   ${JSON.stringify(a)}\n  modelo: ${JSON.stringify(b)}`);
const pick = (r, ks) => (r && typeof r === 'object' ? Object.fromEntries(ks.filter(k => r[k] !== undefined).map(k => [k, r[k]])) : r);
const KR = ['resultado', 'accion', 'Y', 'acum', 'checkpoint', 'desde', 'i', 'j', 'usados'];
let LI = null; const LP = G.lectoresJuguete(P);
const OI = (x = {}) => ({ registro: R, lectores: LI, ...x }), OP = (x = {}) => ({ registro: R, lectores: LP, ...x });
const preparar = () => { exigir(); LI ??= G.lectoresJuguete(I); };

// ═════════════════════════ Contrato de la API y revisión estática ═════════════════════════
test('contrato: kobalt/src/preguntas/index.mjs existe y exporta la API exigida', () => { exigir(); });

test('contrato R1–R4 (L16, L27, vocabulario): importa solo el núcleo, sin dominio, sin escrituras en Γ, sin reloj/azar/E/S, sin motor propio', () => {
  exigir();
  if (process.env.KOBALT_PREGUNTAS_IMPL && !existsSync(DIR)) return; // validación del contrato contra el modelo o un mutante
  const archivos = []; const rec = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) rec(p); else archivos.push(p); } };
  rec(DIR);
  const vocab = /producto|variante|stock|sku|bodega|precio|inventario|catálogo|venta(?!na)|cliente|depósito/i;
  let todo = '';
  for (const f of archivos) {
    const txt = readFileSync(f, 'utf8'); todo += txt;
    txt.split('\n').forEach((l, n) => assert.ok(!vocab.test(l), `${f}:${n + 1}: vocabulario de dominio (R3): ${l.trim()}`));
    for (const m of txt.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g)) {
      const dest = m[1];
      assert.ok(dest.startsWith('./') || dest === '../nucleo/index.mjs', `${f}: importación no permitida «${dest}» (solo ./… y ../nucleo/index.mjs)`);
      assert.ok(!/tests\//.test(dest), `${f}: no puede importar de kobalt/tests/`);
    }
    assert.ok(!/\b(appendIfHead|anexarSiCabeza|apiReplica)\b|\bincorporar\s*\(/.test(txt), `${f}: R2 — ninguna operación escribe en Γ (L16, L27)`);
    assert.ok(!/\bDate\b|Math\.random|performance\.|process\.|\bfetch\(|getRandomValues|require\(/.test(txt), `${f}: R4 — sin reloj, azar ni E/S`);
  }
  assert.ok(/resolverProyeccion/.test(todo) && /proyectarCorte/.test(todo), 'R1: la resolución debe delegarse en resolverProyeccion y proyectarCorte del núcleo');
});

// ═════════════════════════ Identidad, expresiones y lectores ═════════════════════════
test('contrato L32 identidad(q) = 𝔇(ETIQUETA, CV(q)) (vector publicado) y = modelo en preguntas generadas; tupla', async () => {
  preparar();
  assert.equal(I.ETIQUETA, P.ETIQUETA);
  assert.equal(await I.identidad(G.VECTOR_IDENTIDAD.q), G.VECTOR_IDENTIDAD.id);
  for (let c = 0; c < Math.max(20, CASOS / 3); c++) {
    const q = G.generarPregunta(prng(SEMILLA + c));
    assert.equal(await I.identidad(q), P.identidad(q), msg(c));
    assert.equal(await I.identidad(structuredClone(q)), P.identidad(q));
  }
  const qs = [G.VECTOR_IDENTIDAD.q, { ...G.VECTOR_IDENTIDAD.q, M: { nombre: 'máximo' } }];
  assert.equal(await I.identidad(await I.tupla(qs)), N.derivar(P.ETIQUETA, N.cv(qs)));
  assert.throws(() => I.identidad({ a: undefined }));
});

test('contrato §4.2 evaluar y validarExpr = modelo (expresiones aleatorias, casos dirigidos, totalidad); CAMPOS y OPERADORES', async () => {
  preparar();
  assert.deepStrictEqual([...I.CAMPOS], [...P.CAMPOS]);
  assert.deepStrictEqual(Object.fromEntries(Object.entries(I.OPERADORES).map(([k, v]) => [k, [...v]])), Object.fromEntries(Object.entries(P.OPERADORES).map(([k, v]) => [k, [...v]])));
  const Γ = G.trayectoria(SEMILLA + 1), Γc = G.trayectoriaCompuesto(SEMILLA + 2);
  const MN = await import('../modelos/nucleo.modelo.mjs');
  for (let c = 0; c < Math.max(800, 10 * CASOS); c++) {
    const r = prng(SEMILLA + 17 * c);
    const x = G.generarExpr(r);
    const Γs = r() < 0.5 ? Γ : Γc; const k = entero(r, 1, Math.max(1, Γs.entradas.length));
    const S = MN.estadoEn(Γs, k - 1, R);
    const amb = L => ({ e: Γs.entradas[k - 1], k, parametros: S.parametros, S, vars: { tRef: 3, acum: [1], it: { t: 'sumar' } }, lectores: L });
    const vi = await I.validarExpr(x, LI), vp = P.validarExpr(x, LP);
    assert.deepStrictEqual(pick(vi, ['ok', 'leeEstado', 'usaTRef']), pick(vp, ['ok', 'leeEstado', 'usaTRef']), msg(c, JSON.stringify(x)));
    let a; try { a = await I.evaluar(x, amb(LI)); } catch (err) { assert.fail(msg(c, `evaluar lanzó (debe ser total): ${JSON.stringify(x)}: ${err.message}`)); }
    ver(a, P.evaluar(x, amb(LP)), msg(c, JSON.stringify(x)));
  }
  const malas = [null, 5, [], { v: 1, e: 'tipo' }, { e: 'otro' }, { a: 'clave' }, { a: [-1] }, { op: 'xor', de: [] }, { op: 'no', de: [] }, { op: 'si', de: [{ v: 1 }] }, { op: 'mapa', de: [{ v: 'a' }] }, { lee: 'nadie@1', con: [] }, { v: 1.5 }, { op: '+' }, { x: 1 }];
  for (const x of malas) assert.equal((await I.validarExpr(x, LI)).ok, false, JSON.stringify(x));
  const MAX = Number.MAX_SAFE_INTEGER;
  for (const [x, esperado] of [[{ op: '+', de: [{ v: MAX }, { v: 1 }, { v: -1 }] }, MAX], [{ op: '+', de: [{ v: MAX }, { v: 1 }] }, null], [{ op: 'long', de: [{ v: '𝔇a' }] }, 2], [{ op: 'y', de: [{ v: true }, { v: null }] }, false], [{ op: 'mapa', de: [{ v: 'a' }, { v: 1 }, { v: 'a' }, { v: 2 }] }, null]]) {
    ver(await I.evaluar(x, { lectores: LI }), esperado, JSON.stringify(x));
  }
});

test('contrato lectores: registro congelado, inmutable por identificador; leeEstado se deriva', async () => {
  preparar();
  const f = () => 1;
  const L1 = await I.registrarLector(I.LECTORES_VACIO, 'x@1', { clase: 'entrada', fn: f });
  assert.equal(await I.registrarLector(L1, 'x@1', { clase: 'entrada', fn: f }), L1);
  assert.throws(() => I.registrarLector(L1, 'x@1', { clase: 'entrada', fn: () => 2 }));
  assert.throws(() => I.registrarLector(L1, 'sinversion', { clase: 'entrada', fn: f }));
  assert.throws(() => I.registrarLector(L1, 'y@1', { clase: 'otra', fn: f }));
  assert.ok(Object.isFrozen(L1) && Object.isFrozen(I.LECTORES_VACIO)); assert.equal(Object.hasOwn(I.LECTORES_VACIO, 'x@1'), false);
  const base = { φ: { v: true }, M: { nombre: 'unión' }, obs: { nombre: 'identidad' } };
  for (const [aporte, le] of [[{ op: 'lista', de: [{ lee: 'claveDe@1', con: [] }] }, false], [{ op: 'lista', de: [{ lee: 'valor@1', con: [{ v: 'a' }] }] }, true]]) {
    assert.equal((await I.compilar({ ...base, aporte }, { lectores: LI })).proy.leeEstado, le);
  }
  assert.equal((await I.compilar({ ...base, aporte: { v: [] }, obs: { nombre: 'valor', parametros: { de: { lee: 'miembros@1', con: [] } } } }, { lectores: LI })).proy.leeEstado, true, 'también en obs');
});

// ═════════════════════════ Monoides (L33, VQ4, Anexo C.4) ═════════════════════════
test('contrato L33 monoide(desc) = modelo (unidad, op, inv, indicadores) y sus leyes se cumplen en la implementación; leyes(desc) = modelo', async () => {
  preparar();
  for (const desc of G.DESCRIPTORES) {
    const Mi = await I.monoide(desc), Mp = P.monoide(desc);
    const m = JSON.stringify(desc);
    ver(Mi.unidad, Mp.unidad, `${m}: unidad`);
    assert.deepStrictEqual([Mi.conmutativo, Mi.idempotente, Mi.grupo, Boolean(Mi.envolvente), typeof Mi.inv === 'function'], [Mp.conmutativo, Mp.idempotente, Mp.grupo, Boolean(Mp.envolvente), typeof Mp.inv === 'function'], `${m}: indicadores`);
    assert.deepStrictEqual(pick(await I.leyes(desc), Object.keys(P.leyes(desc))), P.leyes(desc), `${m}: leyes`);
    const r = prng(SEMILLA + m.length);
    for (let t = 0; t < Math.max(300, 4 * CASOS); t++) {
      const a = G.elemento(r, desc, P), b = G.elemento(r, desc, P), c = G.elemento(r, desc, P);
      const ab = Mi.op(structuredClone(a), structuredClone(b));
      ver(ab, Mp.op(a, b), `${m}: op(${JSON.stringify(a)}, ${JSON.stringify(b)})`);
      assert.ok(igual(Mi.op(ab, c), Mi.op(a, Mi.op(b, c))), `${m}: asociatividad en la implementación`);
      assert.ok(igual(Mi.op(Mi.unidad, a), a) && igual(Mi.op(a, Mi.unidad), a), `${m}: unidad en la implementación`);
      if (Mi.conmutativo) assert.ok(igual(ab, Mi.op(b, a)), `${m}: declarado conmutativo`);
      if (Mi.idempotente) assert.ok(igual(Mi.op(a, a), a), `${m}: declarado idempotente`);
      if (Mi.grupo) { ver(Mi.inv(a), Mp.inv(a), `${m}: inv`); assert.ok(igual(Mi.op(a, Mi.inv(a)), Mi.unidad)); }
    }
  }
  assert.throws(() => I.monoide({ nombre: 'mediana' }));
});

test('contrato P3 (Teorema 7.2) y Teorema 7.3: ventanaPrefijos/ventanaSegmentos/construirSegmentos con S₃ y monoides no conmutativos = plegado directo', async () => {
  preparar();
  for (const [nombre, M] of Object.entries(G.NO_CONMUTATIVOS)) {
    for (const n of [0, 1, 5, 16, 33, 100]) {
      const r = prng(SEMILLA + n + nombre.length * 101);
      const xs = Array.from({ length: n }, () => G.elementoNoConm(r, nombre));
      const niv = await I.construirSegmentos(M, xs);
      ver(niv, P.construirSegmentos(M, xs), `${nombre} n=${n}: niveles VQ3`);
      const tabla = []; let acc = M.unidad; for (const x of xs) { acc = M.op(acc, x); tabla.push(acc); }
      const cota = Math.max(1, 2 * Math.ceil(Math.log2(Math.max(n, 2))));
      for (let i = 0; i <= n; i++) {
        let d = structuredClone(M.unidad);
        for (let j = i; j <= n; j++) {
          if (j > i) d = M.op(d, xs[j - 1]);
          const s = await I.ventanaSegmentos(M, niv, i, j);
          assert.ok(igual(s.acum, d) && s.usados <= cota, `${nombre} n=${n} (${i},${j}] segmentos: ${JSON.stringify(s)} ≠ ${JSON.stringify(d)}`);
          if (M.inv) { const p = await I.ventanaPrefijos(M, tabla, i, j); assert.ok(igual(p.acum, d) && p.usados <= 2, `${nombre} n=${n} (${i},${j}] prefijos (P_i⁻¹ ⊗ P_j)`); }
        }
      }
    }
  }
});

// ═════════════════════════ Compilación y resolución (L32, L9, V10, E1) ═════════════════════════
test('contrato compilar = modelo (id, ver, leeEstado, sensibleATiempo, sensibleAEpoca = false, monoide) e inválidas ⇒ PREGUNTA_INVÁLIDA sin lanzar', async () => {
  preparar();
  for (let c = 0; c < Math.max(30, CASOS / 2); c++) {
    const q = G.generarPregunta(prng(SEMILLA + 3 * c));
    const ci = await I.compilar(q, { lectores: LI }), cp = P.compilar(q, { lectores: LP });
    assert.equal(ci.resultado, 'COMPILADA', msg(c, ci.motivo));
    const { proy: pi } = ci, { proy: pp } = cp;
    assert.equal(ci.id, cp.id);
    assert.deepStrictEqual([pi.id, pi.ver, pi.leeEstado, pi.sensibleATiempo, pi.sensibleAEpoca, pi.monoide.conmutativo, pi.monoide.idempotente, typeof pi.monoide.inv],
      [pp.id, pp.ver, pp.leeEstado, pp.sensibleATiempo, false, pp.monoide.conmutativo, pp.monoide.idempotente, typeof pp.monoide.inv], msg(c, JSON.stringify(q)));
    assert.equal(typeof pi.f, 'function', 'Π monoidal del núcleo: f es una función');
    ver(pi.monoide.unidad, pp.monoide.unidad, msg(c));
  }
  const ok = { φ: { v: true }, aporte: { a: ['q'] }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } };
  const malas = [{ ...ok, φ: { v: 1.5 } }, { ...ok, extra: 1 }, { ...ok, M: { nombre: 'mediana' } }, { ...ok, M: { nombre: 'extremoPrefijo' } },
    { ...ok, M: { nombre: 'escaneo', parametros: { de: { nombre: 'suma' } } } }, { ...ok, obs: { nombre: 'componente', parametros: { clave: { v: 'a' } } } },
    { ...ok, obs: { nombre: 'umbral', parametros: { op: '!=', valor: { v: 0 } } } }, { ...ok, ventanaTiempo: 'otro' }, { ...ok, aporte: { clave: { v: 'a' } } },
    { ...ok, φ: { op: '<', de: [{ a: ['q'] }, { x: 'tRef' }] } }, { ...ok, sello: { x: 'tRef' } }, [], 'texto', { ...ok, M: { nombre: 'producto', parametros: { de: [{ nombre: 'suma' }] } } },
    { ...ok, M: { nombre: 'mapa', parametros: { etiquetas: { m: { nombre: 'mapa', parametros: { etiquetas: { s: { nombre: 'suma' } } } } } } } }];
  for (const q of malas) {
    let r; try { r = await I.compilar(q, { lectores: LI }); } catch (err) { assert.fail(`compilar lanzó con ${JSON.stringify(q)}: ${err.message}`); }
    assert.equal(r.resultado, 'PREGUNTA_INVÁLIDA', JSON.stringify(q));
  }
});

test('contrato R1 (E1: sin motor propio) responder ≡ N.resolverProyeccion de la Π compilada ≡ modelo, en toda ventana y desde todo checkpoint', async () => {
  preparar();
  for (let c = 0; c < Math.max(10, CASOS / 6); c++) {
    const r = prng(SEMILLA + 7 * c); const Γ = G.trayectoria(SEMILLA + 7919 * c); const n = Γ.entradas.length;
    for (let t = 0; t < 3; t++) {
      const q = G.generarPregunta(r); const q2 = G.generarPregunta(r);
      const { proy } = await I.compilar(q, { lectores: LI });
      for (let w = 0; w < 3; w++) {
        const i = entero(r, 0, n), j = entero(r, i, n), j0 = entero(r, i, j), tRef = entero(r, -2, 5);
        const gp0 = P.responder(q, Γ, OP({ i, j: j0 }));
        const gs = [null, gp0, P.responder(q, Γ, OP({ i: 0, j: entero(r, j, n) })), P.responder(q2, Γ, OP({ i, j: j0 })), { acum: gp0.acum, checkpoint: { ...gp0.checkpoint, h: 'ee'.repeat(32) } }];
        for (const g of gs) {
          const guardado = g ? { acum: g.acum, checkpoint: g.checkpoint } : null;
          const ri = await I.responder(q, Γ, OI({ i, j, tRef, guardado: structuredClone(guardado) }));
          const rp = P.responder(q, Γ, OP({ i, j, tRef, guardado }));
          const rn = N.resolverProyeccion({ proy, guardado: structuredClone(guardado), trayectoria: Γ, i, m: j, registro: R, snapshots: [], tRef });
          const m = msg(c, `q=${JSON.stringify(q)} (${i},${j}] guardado=${g ? g.checkpoint.n : null}`);
          ver(pick(ri, KR), pick(rp, KR), m);
          ver(pick(ri, ['accion', 'Y', 'acum', 'checkpoint', 'desde']), pick(rn, ['accion', 'Y', 'acum', 'checkpoint', 'desde']), `${m} — responder debe ser N.resolverProyeccion(compilar(q).proy)`);
        }
      }
    }
  }
  const malo = { φ: { v: true }, aporte: { v: 1 }, M: { nombre: 'nada' }, obs: { nombre: 'identidad' } };
  assert.equal((await I.responder(malo, G.trayectoria(SEMILLA), OI())).resultado, 'PREGUNTA_INVÁLIDA');
});

test('contrato P5 tupla([q…]) = componentes por separado en UNA sola pasada (llamadas a T instrumentadas)', async () => {
  preparar();
  let llamadas = 0;
  const RI = Object.fromEntries(Object.entries(R).map(([k, regla]) => [k, regla.T ? Object.freeze({ ...regla, T: (...a) => { llamadas++; return regla.T(...a); } }) : regla]));
  for (let c = 0; c < Math.max(6, CASOS / 15); c++) {
    const r = prng(SEMILLA + 8191 * c); const Γ = G.trayectoria(SEMILLA + 3 * c);
    const qs = Array.from({ length: 3 }, () => G.generarSimple(r));
    const sueltas = [];
    for (const q of qs) { llamadas = 0; await I.responder(q, Γ, { ...OI(), registro: RI }); sueltas.push(llamadas); }
    llamadas = 0; const prod = await I.responder(await I.tupla(qs), Γ, { ...OI({ tRef: 1 }), registro: RI }); const lp = llamadas;
    ver(pick(prod, KR), pick(P.responder(qs, Γ, OP({ tRef: 1 })), KR), msg(c));
    assert.ok(lp <= Math.max(...sueltas), msg(c, `una pasada: ${lp} llamadas a T frente a ${sueltas}`));
  }
});

// ═════════════════════════ Ventanas y materialización (VQ2, VQ3, P3, Teorema 7.3, L34) ═════════════════════════
test('contrato VQ2 VQ3 L9 materializar = modelo; actualizada por sufijos = reconstruida; ventana = modelo; NO_GRUPO; NO_MATERIALIZABLE; MATERIALIZACIÓN_INVÁLIDA', async () => {
  preparar();
  let hechos = 0;
  for (let c = 0; hechos < Math.max(10, CASOS / 8) && c < 400; c++) {
    const r = prng(SEMILLA + 977 * c); const q = G.generarPregunta(r); const Γ = G.trayectoria(SEMILLA + 1543 * c); const n = Γ.entradas.length;
    for (const tipo of ['prefijos', 'segmentos']) {
      const j0 = entero(r, 0, n);
      const pi0 = await I.materializar(q, Γ, j0, OI({ tipo })), pp0 = P.materializar(q, Γ, j0, OP({ tipo }));
      assert.equal(pi0.resultado, pp0.resultado, msg(c, `${tipo} q=${JSON.stringify(q)}`));
      if (pp0.resultado !== 'OK') continue;
      ver(pi0.mat, pp0.mat, msg(c, `${tipo}: materialización`));
      const pi1 = await I.materializar(q, Γ, n, OI({ tipo, guardado: structuredClone(pi0.mat) }));
      const rec = P.materializar(q, Γ, n, OP({ tipo }));
      assert.equal(pi1.accion, j0 === n ? 'REUTILIZAR' : 'ACTUALIZAR', msg(c));
      ver(pi1.mat, rec.mat, msg(c, `${tipo}: actualizada por sufijo = reconstruida`));
      for (let t = 0; t < 15; t++) {
        const i = entero(r, 0, n), j = entero(r, i, n);
        const vi = await I.ventana(q, Γ, i, j, structuredClone(rec.mat), OI({ tRef: 2 })), vp = P.ventana(q, Γ, i, j, rec.mat, OP({ tRef: 2 }));
        ver(pick(vi, ['resultado', 'Y', 'acum']), pick(vp, ['resultado', 'Y', 'acum']), msg(c, `${tipo} (${i},${j}] q=${JSON.stringify(q)}`));
        assert.ok(vi.usados <= (tipo === 'prefijos' ? 2 : Math.max(1, 2 * Math.ceil(Math.log2(Math.max(n, 2))))), 'usados acotado');
      }
      if (n > 0) {
        const falsa = structuredClone(rec.mat); falsa.checkpoint.h = 'ee'.repeat(32);
        assert.equal((await I.ventana(q, Γ, 0, n, falsa, OI())).resultado, 'MATERIALIZACIÓN_INVÁLIDA', 'L22');
        const corta = P.materializar(q, Γ, n - 1, OP({ tipo })).mat;
        assert.equal((await I.ventana(q, Γ, 0, n, corta, OI())).resultado, 'MATERIALIZACIÓN_INVÁLIDA', 'c.n < j');
      }
      hechos++;
    }
  }
  const Γ = G.trayectoria(SEMILLA);
  const seq = { φ: { v: true }, aporte: { op: 'lista', de: [{ e: 'tipo' }] }, M: { nombre: 'secuencia' }, obs: { nombre: 'identidad' } };
  assert.equal((await I.materializar(seq, Γ, 0, OI({ tipo: 'segmentos' }))).resultado, 'NO_MATERIALIZABLE', 'L34: secuencia no se materializa');
  assert.equal((await I.materializar({ ...seq, M: { nombre: 'último' }, aporte: { e: 'k' } }, Γ, 0, OI({ tipo: 'prefijos' }))).resultado, 'NO_GRUPO');
});

// ═════════════════════════ Tiempo (Teorema 7.4) ═════════════════════════
test('contrato Teorema 7.4 sellosEfectivos y porTiempo (prefijo y filtro) = modelo; contraejemplo [10,20,15,30], t = 17', async () => {
  preparar();
  const Γ4 = G.trayectoriaDe([10, 20, 15, 30].map(v => ({ tipo: 'fijar', args: { clave: 'a', v } })));
  const q4 = { φ: { v: true }, aporte: { op: 'lista', de: [{ e: 'k' }] }, M: { nombre: 'secuencia' }, obs: { nombre: 'identidad' }, sello: { a: ['v'] } };
  ver(await I.sellosEfectivos(q4, Γ4, OI()), [null, 10, 20, 20, 30], 'τ');
  const a = await I.porTiempo(q4, Γ4, null, 17, OI()), b = await I.porTiempo({ ...q4, ventanaTiempo: 'filtro' }, Γ4, null, 17, OI());
  assert.deepStrictEqual([a.i, a.j, a.Y, b.i, b.j, b.Y], [0, 1, [1], 0, 4, [1, 3]]);
  assert.equal((await I.porTiempo({ φ: q4.φ, aporte: q4.aporte, M: q4.M, obs: q4.obs }, Γ4, 0, 1, OI())).resultado, 'SIN_SELLO');
  assert.equal((await I.porTiempo(q4, Γ4, 20, 10, OI())).resultado, 'VENTANA_INVÁLIDA');
  ver(await I.filtroTiempo(q4, 1, 9), P.filtroTiempo(q4, 1, 9), 'filtroTiempo');
  for (let c = 0; c < Math.max(15, CASOS / 5); c++) {
    const r = prng(SEMILLA + 6007 * c); const Γ = G.trayectoria(SEMILLA + 19 * c); const n = Γ.entradas.length;
    const q = { ...G.generarSimple(r), sello: G.elegir(r, [{ a: ['v'] }, { op: '×', de: [{ e: 'k' }, { v: 10 }] }, { lee: 'valor@1', con: [{ v: 'a' }] }]) };
    if (r() < 0.5) q.ventanaTiempo = G.elegir(r, ['prefijo', 'filtro']);
    ver(await I.sellosEfectivos(q, Γ, OI()), P.sellosEfectivos(q, Γ, OP()), msg(c, 'τ'));
    const t1 = r() < 0.2 ? null : entero(r, -2, 10 * n), t2 = r() < 0.2 ? null : entero(r, t1 ?? -2, 10 * n + 5);
    ver(pick(await I.porTiempo(q, Γ, t1, t2, OI({ tRef: 1 })), KR), pick(P.porTiempo(q, Γ, t1, t2, OP({ tRef: 1 })), KR), msg(c, `q=${JSON.stringify(q)} (${t1},${t2}]`));
  }
});

// ═════════════════════════ Distribución (P4, E1.5, L21) ═════════════════════════
test('contrato P4 L21 distribuir = modelo ≡ N.proyectarCorte de la Π compilada; NO_CONMUTATIVO, DEPENDE_DEL_ESTADO, NO_CERRADO', async () => {
  preparar();
  const usaPos = q => /"e":"(k|sid)"/.test(JSON.stringify(q));
  const cuenta = {};
  for (let c = 0; c < Math.max(15, CASOS / 5); c++) {
    const r = prng(SEMILLA + 4099 * c);
    const acciones = G.accionesLibres(r, entero(r, 0, 20)); const m = entero(r, 1, 3);
    const tray = {}, σ = {};
    for (let x = 0; x < m; x++) { const s = G.streamN(x); tray[s] = G.trayectoriaDe(acciones.filter((_, k) => k % m === x), s); σ[s] = tray[s].entradas.length; }
    for (let t = 0; t < 4; t++) {
      const q = G.generarPregunta(r, x => !usaPos(x));
      const di = await I.distribuir(q, σ, tray, OI({ tRef: 1 })), dp = P.distribuir(q, σ, tray, OP({ tRef: 1 }));
      ver(pick(di, ['resultado', 'acum', 'Y']), pick(dp, ['resultado', 'acum', 'Y']), msg(c, `q=${JSON.stringify(q)}`));
      cuenta[dp.resultado] = (cuenta[dp.resultado] ?? 0) + 1;
      if (dp.resultado === 'OK') ver(di.acum, N.proyectarCorte(σ, tray, R, (await I.compilar(q, { lectores: LI })).proy).valor, 'R1: distribuir ≡ N.proyectarCorte');
    }
  }
  assert.ok(cuenta.OK && cuenta.NO_CONMUTATIVO && cuenta.DEPENDE_DEL_ESTADO, JSON.stringify(cuenta));
  const X = '0a'.repeat(16), Y = '0b'.repeat(16);
  const ΓY = G.trayectoriaDe([{ tipo: 'sumar', args: { clave: 'a', q: 1 } }, { tipo: 'sumar', args: { clave: 'b', q: 2 } }], Y);
  const ΓX = G.trayectoriaDe([{ tipo: 'sumar', args: { clave: 'a', q: 3 }, deps: [{ stream: Y, k: 2, h: ΓY.hashes[2] }], conocidas: { [Y]: ΓY } }], X);
  const qs = { φ: { v: true }, aporte: { a: ['q'] }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } };
  assert.equal((await I.distribuir(qs, { [X]: 1, [Y]: 1 }, { [X]: ΓX, [Y]: ΓY }, OI())).resultado, 'NO_CERRADO');
  assert.equal((await I.distribuir({ ...qs, M: { nombre: 'último' } }, { [X]: 1, [Y]: 1 }, { [X]: ΓX, [Y]: ΓY }, OI())).resultado, 'NO_CONMUTATIVO', 'antes que el cierre (Anexo B.2)');
});

// ═════════════════════════ L15 ═════════════════════════
test('contrato L15 obs con tRef: el mismo acum responde a dos tRef sin reconstruir; el checkpoint no lleva tRef', async () => {
  preparar();
  const q = { φ: { v: true }, aporte: { a: ['q'] }, M: { nombre: 'suma' }, obs: { nombre: 'umbral', parametros: { op: '≥', valor: { x: 'tRef' } } } };
  for (let c = 0; c < 5; c++) {
    const Γ = G.trayectoria(SEMILLA + 37 * c);
    const g = await I.responder(q, Γ, OI({ tRef: -100 }));
    assert.ok(!('tRef' in g.checkpoint));
    for (const tRef of [-2, 0, 3, 100]) {
      const ri = await I.responder(q, Γ, OI({ tRef, guardado: { acum: g.acum, checkpoint: g.checkpoint } }));
      assert.equal(ri.accion, 'REUTILIZAR'); ver(pick(ri, KR), pick(P.responder(q, Γ, OP({ tRef, guardado: { acum: g.acum, checkpoint: g.checkpoint } })), KR), msg(c));
    }
  }
});
