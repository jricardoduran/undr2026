// Kobalt — CONTRATO DE IMPLEMENTACIÓN de la regla de dominio `kobalt.dominio@1` (fase 3: Forma + red de flujo).
// Compara `kobalt/src/dominio/index.mjs` contra el modelo de referencia `kobalt/tests/modelos/dominio.modelo.mjs`, ambos
// montados sobre el NÚCLEO REAL (`kobalt/src/nucleo/index.mjs`). Spec: kobalt/specs/2026-11-11_fase3-forma-y-flujo.md.
// Mientras el módulo no exista, TODAS estas pruebas fallan con un mensaje que indica la ruta esperada y la API pendiente.
//
// Ejecutar:  node --test 'kobalt/tests/leyes/*.test.mjs'
// Variables: KOBALT_SEED, KOBALT_CASOS_DOMINIO, KOBALT_DOMINIO_IMPL (ruta alternativa de la implementación: así se
//            ejecutan los mutantes sobre una COPIA y se valida este contrato contra el propio modelo).
//
// ════════════════════════════════════ API EXIGIDA (fase 3 rehecha: Anexo C) ════════════════════════════════════
// `kobalt/src/dominio/index.mjs` exporta (puede exportar más). Sin dependencias externas. Importa el núcleo SOLO de
// `../nucleo/` y el álgebra de preguntas SOLO de `../preguntas/index.mjs` (C.4); NO importa nada de kobalt/tests/ ni de
// kobalt/kernels/. Todo es síncrono y puro.
//
// 0. Reutilización obligatoria de la fase 2 (C.4, C.5) — revisión estática + pruebas
//   · Expresiones: `evaluar`, `validarExpr`, `registrarLector` de ../preguntas/. Prohibido un evaluador propio: fuera de
//     inicial.mjs ningún archivo de kobalt/src/dominio/ contiene los literales de operador 'nulo?' / 'prefijo' ni una tabla
//     de operadores; prueba dinámica: −x unario, resultado exacto y desbordamiento ⇒ null, como la fase 2.
//   · Monoides: `monoide(desc)` de ../preguntas/ (sumaPorClave, mapa{último}, unión…). La fase 3 AÑADE al catálogo
//     `kobalt/src/preguntas/monoides.mjs` el monoide `{nombre: 'nacimientos'}`: listas de IDs [i, j], unidad [], ⊗ =
//     concatenación, inyectar(v) = v si es lista de IDs (si no, undefined); conmutativo = idempotente = grupo = false, sin
//     envolvente; leyes(·) = {ventana: 'segmentos', distribucion: 'no', materializable: true} (NO es `secuencia`: L34 no
//     aplica; su cociente de Nerode es él mismo). Debe pasar también las pruebas de catálogo de la fase 2. Π_T lo usa.
//   · Sumas de ℤ con frontera (C.6): el intérprete de depósitos y las sumas de las preguntas lanzan RangeError al salirse de
//     los enteros seguros (error visible, nunca truncamiento); la guarda rechaza con 'cantidad' lo que desbordaría.
//
// 1. La regla (dato que el núcleo interpreta; fase 1 §3.1 + E3/E4 + C.1)
//   ID_REGLA = 'kobalt.dominio@1'
//   crearRegla({guardaAdicional?}) → regla; REGLA = crearRegla(). guardaAdicional(D, acción, {u, par, i, nacidos}) → motivo
//     | null se evalúa DENTRO de la guarda tras las guardas de §5.1 de cada acción (simula una guarda corregida en código).
//   regla = {id, D0, tipos, tiposInternos, guarda(D, e, C) → 'ok'|motivo, T(D, e, C) → D', sigma, guardaPar, codD}
//   efecto(D, e, C) → δ  TOTAL (C.1): nunca devuelve motivos ni lanza sobre una entrada comprometida. T = aplicar(D,
//     efecto(D, e, C)) con nd + 1; el lector `movimientos` usa SOLO efecto. Con guardaAdicional, Fold y preguntas de una Γ
//     válida NO cambian (prueba exigida). T es PURA (D congelado no lanza ni cambia).
//   tipos (E3): {'Nacer:*', 'Fijar:*', 'Añadir:*', 'Quitar:*', 'Disparar:*', 'Lote'} — validan SOLO la forma (G5):
//     Nacer:<τ> {valores: mapa} · Fijar:<τ>.<k> {e: ref, v: valor|null} · Añadir|Quitar:<τ>.<k> {e: ref, x}
//     · Disparar:<t> mapa · Lote {acciones: [{tipo, args}…]};  ref = [i, j] | {nacido: j}.  tiposInternos(e) (E4).
//   REGLA.sigma: los 7 parámetros `dominio.*` (forma, red, liberaciones, alcancePropio, propietarios (null ⇒
//     [nucleo.constituyente]), lote, conjunto) con los iniciales del modelo. El dominio de forma y red valida TODAS sus
//     expresiones con validarExpr(·, LECTORES) de la fase 2 (una expresión inválida ⇒ FijarParámetro 'fueraDeDominio').
//
// 2. FORMATO DE DATOS (deepEqual a los del modelo; las pruebas escriben Formas y Redes nuevas en este formato)
//   FORMA_INICIAL = {tipos: {τ: {características: {k | 'ns:*' | '*:*': Decl}, padre?: k_ref, denso?: true, κ?: [k…],
//                    actividad?: {característica: k, valores: [v…]}  (C.2; ausente ⇒ toda entidad del tipo es activa),
//                    restricciones?: [expr], alNacer?: t}}}
//     Decl = {clase: 'asignación'|'conjunto'|'ciclo'|'referencia', valor: TipoValor, cardinalidad?: 'uno'|'muchos',
//             ciclo?: {estados, inicial, transiciones: [[de, a]…]}, heredable?, inmutable?, requerida?, defecto?, máximo?,
//             clave?: [campo…], admite?: {fijar?, añadir?, quitar?: expr}, visibilidad?: expr (C.3: regla por defecto de
//             la pregunta `visible`, con x.u actor, x.e entidad, x.it elemento)}
//     TipoValor = {texto: [mín, máx]} | {entero: [mín, máx]} | {bool: true} | {Q: true} | {enum: [v…]} | {ref: τ|'*'}
//             | {lista: T, máx?} | {registro: {campo: T}} | {alguno: [T…]} | {opcional: T}
//   RED_INICIAL = {familias: {f: {especie, índices: [τ…], restringida: bool}}, exterior: {especie: f},
//                  transiciones: {t: {args: {x: TipoValor}, movimientos: [{desde: [f, expr…], hacia: [f, expr…],
//                  cantidad: expr}…], objetivo?: expr, canal?: expr, interna?: true, nulo: 'admitir'|'rechazar',
//                  restricción: 'todas'|'ninguna'|[f…]}}, auditoría: [{nombre, términos: [{f, coef: expr, clave:
//                  [expr…]}], rango?: [mín, máx]}]}   (vars i0, i1… = índices del lugar)
//   Expresiones: sintaxis de la fase 2 §4.2 ({v}, {a:[…]} = args resueltos de la acción, {p}, {x}, {lee:'nombre@1', con},
//     {op, de}). LIBERACIONES_INICIAL = [{transiciones: [t…], canal, familias: [f…]}].
//   Parámetros de lectura (C.3; solo valores POR DEFECTO, nunca autoridad):
//     DISPONIBILIDAD_INICIAL = {familias: {existencias, libre, comprometido, pendiente, pendienteNoElegible, noApto,
//       descuadre}, demanda: {tipo, bodega, variante}, agregación: 'sumaDeMáximos' | 'máximoDeSuma'}
//       (las familias de existencias/libre/comprometido van indexadas [bodega, variante]; G^par fija los índices: C.7)
//     VISIBILIDAD_INICIAL = {característica: 'galería'} · TIPO_FIBRA = 'variante'
//
// 3. Semántica (= modelo). ID = [i, j] con i = nd + e.ε + 1. Clave de lugar = `${familia}[${ids "i.j" separados por ","}]`.
//   Motivos de INADMISIBLE (mismo orden de guardas que el modelo; §5.1): tipoDesconocido · característicaDesconocida ·
//     valorInválido · cicloInválido · requerida · referenciaInexistente · referenciaTipo · admite · padre · máximo ·
//     κDuplicada · restricción · ajeno · tipoIncoherente · claseIncompatible · inmutable · yaPresente · ausente ·
//     transiciónDesconocida · transiciónInterna · argumentos · familiaDesconocida · cantidad (expresión null o suma que
//     desborda) · sinEfecto · negativo:<clave de lugar> · loteTamaño · loteAnidado · (G^par) formaQuitaTipo ·
//     formaCambiaPadre · formaRelajaInmutable · formaQuitaCaracterística · formaCambiaClase · formaCambiaValor · κNoÚnica
//     (también al cambiar la actividad, C.2) · redQuitaFamilia · redCambiaEspecie · redCambiaÍndices (mismos índices EN EL
//     MISMO ORDEN para toda familia con marcado, C.7) · redTipoDesconocido · redFamiliaDesconocida · redInterEspecie.
//   Búsquedas por nombre con Object.hasOwn (`__proto__`, `toString`… son nombres desconocidos); −0 = 0 (CV) (C.8).
//   «dato, no código» (revisión estática): fuera de `inicial.mjs` ningún archivo contiene nombres de transiciones ni de
//   características (regex de la spec) ni literales iguales a nombres de tipos, transiciones, familias o características
//   de RED_INICIAL / FORMA_INICIAL (salvo `nombre`); ningún `case`/`if` sobre ellos. La actividad ya no es convención:
//   `estado`/`activo` solo aparecen como dato.
//
// 4. Lectores de dominio (C.4): LECTORES = registro de la fase 2 (registrarLector) con, como mínimo, estos ids y clases:
//   estado: carac@1(id, k) · activa@1(id) · padre@1(id) · dueño@1(id) · creador@1(id) · tipo@1(id) · propietario@1(u) ·
//           marcado@1(f, …ids) · disp.libre@1(v, agregación?) · movimientos@1(tipo, args, u, epoca, familia?)
//   entrada: nacimientos@1(τ?) · contribuciones@1(Φ)
//   (un lector de estado recibe S = {D, parametros, …}; las preguntas de la fase 2 los usan sobre esta Γ con
//   `responder(q, Γ, {registro, lectores: LECTORES})`, y el resultado debe ser el del modelo.)
//
// 5. Lectores públicos sobre D (preguntas; nunca escriben). IDs [i, j]; mapas por "i.j".
//   entidades · seccionPropia · carac(D, C, id, k) (undefined = desconocido) · activa · dueño · coordenadas · slot ·
//   marcado · valorLugar · disponibilidad(D, C, w | null, v, cfg = DISPONIBILIDAD_INICIAL) (w = null ⇒ total con la
//   agregación de cfg) · auditoria(D, C) · visible(D, C, u, id, x, regla = null, k = 'galería') (regla null ⇒ la de Φ) ·
//   fibra(D, C, k, valor, τ = TIPO_FIBRA) · filtrar(D, C, τ, φ) · ficha(D, C, id) · movimientos(D, C, e).
//
// 6. Preguntas (E1, forma monoidal; monoides del catálogo): PROYECCIONES = {T (monoide nacimientos), catalogo (mapa{último}),
//   marcado, auditoria, readmision(regla = REGLA) (unión de [k, motivo] de las entradas que la guarda de `regla` ya no
//   admitiría; informa, no impide leer), flat(w, defecto = 0), disponibilidad(w | null, v, cfg), fibra(k, valor, τ)};
//   su Y y su acum (resolverProyeccion) = los del modelo para la misma Γ.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import * as M from '../modelos/dominio.modelo.mjs';
import * as C from './dominio.comun.mjs';
import { registrarAceptacion } from './dominio.aceptacion.mjs';

const API = ['ID_REGLA', 'REGLA', 'crearRegla', 'efecto', 'LECTORES', 'FORMA_INICIAL', 'RED_INICIAL', 'LIBERACIONES_INICIAL',
  'DISPONIBILIDAD_INICIAL', 'VISIBILIDAD_INICIAL', 'TIPO_FIBRA',
  'entidades', 'seccionPropia', 'carac', 'activa', 'dueño', 'coordenadas', 'slot', 'marcado', 'valorLugar', 'disponibilidad',
  'auditoria', 'visible', 'fibra', 'filtrar', 'ficha', 'movimientos', 'PROYECCIONES'];
const DIR = fileURLToPath(new URL('../../src/dominio/', import.meta.url));
const RUTA = process.env.KOBALT_DOMINIO_IMPL ? pathToFileURL(process.env.KOBALT_DOMINIO_IMPL).href : new URL('../../src/dominio/index.mjs', import.meta.url).href;
let I = null, errorCarga = null;
try { I = await import(RUTA); } catch (err) { errorCarga = err; }
function exigir() {
  if (!I) assert.fail(`IMPLEMENTACIÓN AUSENTE: no se pudo importar ${fileURLToPath(RUTA)}\n  causa: ${errorCarga?.code ?? ''} ${errorCarga?.message ?? ''}\n`
    + `  Debe exportar: ${API.join(', ')} (ver el encabezado de kobalt/tests/leyes/dominio.impl.test.mjs).`);
  const faltan = API.filter(k => !(k in I));
  if (faltan.length) assert.fail(`API incompleta en ${fileURLToPath(RUTA)}: faltan ${faltan.join(', ')}`);
  return I;
}
const N = C.N;
const igual = isDeepStrictEqual;
const { SEMILLA, CASOS, S } = C;
const RM = M.REGISTRO;
const RI = () => ({ [I.ID_REGLA]: I.REGLA });
const msg = (c, extra = '') => `semilla=${SEMILLA + c} (KOBALT_SEED=${SEMILLA}, caso ${c}) ${extra}`;
const generados = new Map();
const generado = c => { if (!generados.has(c)) generados.set(c, C.generar(M, SEMILLA + c)); return generados.get(c); };

/** Observables de un estado (lo único que se compara: la representación interna de D es libre). */
function observables(Dom, St) {
  const D = St.D, par = St.parametros;
  const E = Dom.entidades(D);
  return {
    entidades: E,
    secciones: E.map(x => [x.id, Dom.seccionPropia(D, x.id)]),
    marcado: Dom.marcado(D),
    T: Dom.coordenadas(D, par),
    auditoria: Dom.auditoria(D, par),
  };
}
function observablesFinos(Dom, St) {
  const D = St.D, par = St.parametros;
  const E = Dom.entidades(D);
  const B = E.filter(x => x.tipo === 'bodega').map(x => x.id), T = Dom.coordenadas(D, par);
  return {
    disp: B.flatMap(w => T.map(v => Dom.disponibilidad(D, par, w, v))),
    fibras: ['Azul', 'Rojo', 'Verde'].map(c => Dom.fibra(D, par, 'color', c)),
    fichas: E.map(x => Dom.ficha(D, par, x.id)),
    efectivas: E.map(x => ['nombre', 'precio', 'estado', 'color', 'galería', 'público'].map(k => Dom.carac(D, par, x.id, k) ?? '‹desconocido›')),
    activas: E.map(x => Dom.activa(D, par, x.id)),
    dueños: E.map(x => Dom.dueño(D, x.id)),
    slots: T.map(v => Dom.slot(D, par, v)),
    totales: T.map(v => ['sumaDeMáximos', 'máximoDeSuma'].map(a => Dom.disponibilidad(D, par, null, v, { ...M.DISPONIBILIDAD_INICIAL, agregación: a }))),
  };
}
const Nres = r => ({ resultado: r.resultado, ...(r.motivo !== undefined ? { motivo: r.motivo } : {}), ...(r.i !== undefined ? { i: r.i } : {}) });

// ═════════════════════════ revisión estática «dato, no código» ═════════════════════════
const NOMBRES_SPEC = /Vender|Asignar|Despachar|Cancelar|Cobrar|Devolver|Recibir|Reembolsar|Transferir|Contar|Ingresar|sku|precio|color/;
function nombresDeDatos() {
  const s = new Set();
  for (const t of Object.keys(M.RED_INICIAL.transiciones)) s.add(t);
  for (const f of Object.keys(M.RED_INICIAL.familias)) s.add(f);
  for (const [τ, t] of Object.entries(M.FORMA_INICIAL.tipos)) { s.add(τ); for (const k of Object.keys(t.características)) if (!k.includes('*')) s.add(k); }
  s.delete('nombre'); // nombre común; la actividad ya es dato de Φ (C.2): `estado` cuenta como nombre de característica
  return s;
}
/** Devuelve las violaciones de la regla «dato, no código» en {ruta ↦ texto}. */
function revisarEstatica(archivos) {
  const v = [];
  const nombres = nombresDeDatos();
  if (!Object.values(archivos).some(txt => /from\s+['"]\.\.\/preguntas\/index\.mjs['"]/.test(txt) && /\bevaluar\b/.test(txt))) v.push('ningún archivo importa `evaluar` de ../preguntas/index.mjs (C.4: un solo lenguaje)');
  for (const [ruta, txt] of Object.entries(archivos)) {
    if (/from\s+['"][^'"]*(tests|kernels)\//.test(txt) || /import\([^)]*(tests|kernels)\//.test(txt)) v.push(`${ruta}: importa de kobalt/tests o kobalt/kernels`);
    if (basename(ruta) === 'inicial.mjs') continue;
    if (/['"`](nulo\?|prefijo)['"`]/.test(txt)) v.push(`${ruta}: define operadores del lenguaje (C.4: prohibido un segundo evaluador)`);
    const sinComentarios = txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
    sinComentarios.split('\n').forEach((l, n) => { if (NOMBRES_SPEC.test(l)) v.push(`${ruta}:${n + 1}: nombre de dominio fuera de inicial.mjs: ${l.trim()}`); });
    for (const m of sinComentarios.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
      if (nombres.has(m[2])) v.push(`${ruta}: literal «${m[2]}» (nombre de la Forma o la Red) fuera de inicial.mjs`);
    }
    for (const m of sinComentarios.matchAll(/case\s+(['"`])([^'"`]*)\1/g)) {
      if ([...nombres].some(x => m[2].includes(x))) v.push(`${ruta}: «case '${m[2]}'»: acción de dominio codificada en un switch`);
    }
  }
  return v;
}
function leerDirectorio(dir) {
  const out = {};
  const rec = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) rec(p); else if (/\.(mjs|js|cjs)$/.test(f)) out[p] = readFileSync(p, 'utf8'); } };
  rec(dir);
  return out;
}

test('contrato: kobalt/src/dominio/index.mjs existe y exporta la API exigida', () => { exigir(); });
test('L35 contrato «dato, no código»: kobalt/src/dominio/ tiene inicial.mjs; fuera de él no hay nombres de transiciones, familias ni características, ni switch sobre ellas', () => {
  exigir();
  assert.ok(existsSync(DIR), `falta el directorio ${DIR}`);
  const archivos = leerDirectorio(DIR);
  assert.ok(Object.keys(archivos).some(p => basename(p) === 'inicial.mjs'), 'falta kobalt/src/dominio/inicial.mjs (Forma y Red iniciales)');
  const v = revisarEstatica(archivos);
  assert.deepEqual(v, [], v.join('\n'));
});
test('L35 la revisión estática discrimina: detecta un switch sobre «Asignar», una validación con el literal «libre» y un import de tests', () => {
  const malo = {
    '/x/dominio/interprete.mjs': "import { M } from '../../tests/modelos/x.mjs';\nexport function T(e) { switch (e.t) { case 'Asignar': return m['libre'] - q >= 0; default: return 0; } }\n",
    '/x/dominio/inicial.mjs': "export const RED = { Vender: 1 };\n",
    '/x/dominio/limpio.mjs': "export const aplicar = (D, δ) => δ; // sin nombres\n",
  };
  const v = revisarEstatica(malo);
  assert.ok(v.some(x => x.includes("case 'Asignar'")), v.join('\n'));
  assert.ok(v.some(x => x.includes('«libre»')), v.join('\n'));
  assert.ok(v.some(x => x.includes('importa de kobalt/tests')), v.join('\n'));
  assert.ok(!v.some(x => x.startsWith('/x/dominio/inicial.mjs') || x.startsWith('/x/dominio/limpio.mjs')), v.join('\n'));
  assert.ok(v.some(x => x.includes('importa `evaluar`')), v.join('\n'));
  const segundo = revisarEstatica({ '/x/dominio/expr.mjs': "import { evaluar } from '../preguntas/index.mjs';\nconst OPS = { 'nulo?': x => x === null };\n" });
  assert.ok(segundo.some(x => x.includes('segundo evaluador')), segundo.join('\n'));
});
test('contrato: datos iniciales (Forma, Red, liberaciones, Σ) = los del modelo; ID de la regla; tipos patrón y tiposInternos', () => {
  exigir();
  assert.equal(I.ID_REGLA, 'kobalt.dominio@1');
  assert.equal(I.REGLA.id, I.ID_REGLA);
  assert.deepEqual(I.FORMA_INICIAL, M.FORMA_INICIAL);
  assert.deepEqual(I.RED_INICIAL, M.RED_INICIAL);
  assert.deepEqual(I.LIBERACIONES_INICIAL, M.LIBERACIONES_INICIAL);
  assert.deepEqual(I.DISPONIBILIDAD_INICIAL, M.DISPONIBILIDAD_INICIAL);
  assert.deepEqual(I.VISIBILIDAD_INICIAL, M.VISIBILIDAD_INICIAL);
  assert.equal(I.TIPO_FIBRA, M.TIPO_FIBRA);
  for (const [id, def] of Object.entries(M.LECTORES)) assert.equal(I.LECTORES[id]?.clase, def.clase, `lector ${id}`);
  assert.equal(typeof I.crearRegla, 'function');
  assert.deepEqual(Object.keys(I.REGLA.sigma).sort(), Object.keys(M.SIGMA).sort());
  for (const [p, s] of Object.entries(M.SIGMA)) {
    assert.deepEqual(I.REGLA.sigma[p].inicial, s.inicial, `inicial de ${p}`);
    assert.ok(I.REGLA.sigma[p].dominio(structuredClone(s.inicial)), `dominio de ${p}`);
  }
  assert.deepEqual(Object.keys(I.REGLA.tipos).sort(), Object.keys(M.TIPOS).sort());
  const e = { tipo: 'Lote', args: { acciones: [{ tipo: 'Nacer:venta', args: { valores: {} } }, { tipo: 'Disparar:Contar', args: {} }] } };
  assert.deepEqual(I.REGLA.tiposInternos(e), ['Nacer:venta', 'Disparar:Contar']);
  assert.deepEqual(I.REGLA.tiposInternos({ tipo: 'Disparar:Contar', args: {} }), []);
});

// ═════════════════════════ diferencial impl = modelo sobre trayectorias generadas ═════════════════════════
test('L3 L4 L6 L7 L16 L35 impl = modelo en cada propuesta generada (resultado y motivo) y en los observables de cada estado', () => {
  exigir();
  for (let c = 0; c < CASOS; c++) {
    const g = generado(c);
    const ΓI = C.cauce(RI(), g.g);
    let k = 0;
    g.sols.forEach((sol, j) => {
      const r = C.proponer(ΓI, sol);
      assert.deepEqual(Nres(r), Nres(g.resultados[j]), msg(c, `propuesta ${j + 1}: ${JSON.stringify(sol)}`));
      if (r.resultado === 'COMPROMETIDO') {
        k++;
        assert.deepEqual(observables(I, S(ΓI)), observables(M, g.Γ.estados[k]), msg(c, `observables tras e_${k}`));
      }
    });
    assert.deepEqual(ΓI.hashes, g.Γ.hashes, msg(c, 'cadena de hashes'));
    assert.deepEqual(observablesFinos(I, S(ΓI)), observablesFinos(M, S(g.Γ)), msg(c, 'lectores finales'));
    for (let j = 0; j < g.Γ.entradas.length; j++) {
      const e = g.Γ.entradas[j];
      if (e.clase === 'dominio') assert.deepEqual(I.movimientos(ΓI.estados[j].D, ΓI.estados[j].parametros, e), M.movimientos(g.Γ.estados[j].D, g.Γ.estados[j].parametros, e), msg(c, `movimientos(e_${j + 1})`));
    }
  }
});
test('L4 T de la impl es pura (D congelado no lanza ni cambia), Fold = estado constituido y snapshot + sufijo = Fold (codD es CV)', () => {
  exigir();
  const congelar = o => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.values(o).forEach(congelar); } return o; };
  for (let c = 0; c < Math.min(CASOS, 10); c++) {
    const g = generado(c);
    const ΓI = C.reejecutar(RI(), g.g, g.sols).Γ;
    for (let j = 0; j < ΓI.entradas.length; j++) {
      const antes = structuredClone(ΓI.estados[j]);
      const congelado = congelar(structuredClone(ΓI.estados[j]));
      assert.deepEqual(N.transformar(congelado, ΓI.entradas[j], RI()), ΓI.estados[j + 1], msg(c, `T(e_${j + 1}) sobre D congelado`));
      assert.deepEqual(congelado, antes);
    }
    assert.deepEqual(N.fold(N.estadoInicial(g.g, RI()), ΓI.entradas, RI()), S(ΓI));
    const k = Math.floor(ΓI.entradas.length / 2);
    const snap = N.crearSnapshot(ΓI.estados[k], ΓI.hashes[k], RI());
    assert.deepEqual(N.fold(N.restaurarSnapshot(snap, ΓI.hashes, RI()), ΓI.entradas.slice(k), RI()), S(ΓI), msg(c, 'snapshot + sufijo'));
  }
});
test('L9 L33 preguntas de la impl (E1) = las del modelo, e incrementales = reconstruidas', () => {
  exigir();
  for (let c = 0; c < Math.min(CASOS, 10); c++) {
    const g = generado(c);
    const ΓI = C.reejecutar(RI(), g.g, g.sols).Γ;
    const n = ΓI.entradas.length;
    const B = M.entidades(S(g.Γ).D).filter(x => x.tipo === 'bodega').map(x => x.id);
    const V0 = M.coordenadas(S(g.Γ).D, S(g.Γ).parametros)[0] ?? [2, 1];
    const pares = [['T'], ['catalogo'], ['marcado'], ['auditoria'], ...B.map(w => ['flat', w]), ...(B.length ? [['disponibilidad', B[0], V0]] : []), ['fibra', 'color', 'Azul']];
    for (const [nombre, ...args] of pares) {
      const pI = typeof I.PROYECCIONES[nombre] === 'function' ? I.PROYECCIONES[nombre](...args) : I.PROYECCIONES[nombre];
      const pM = typeof M.PROYECCIONES[nombre] === 'function' ? M.PROYECCIONES[nombre](...args) : M.PROYECCIONES[nombre];
      for (const m of [Math.floor(n / 2), n]) assert.deepEqual(C.consultar(ΓI, pI, m), C.consultar(g.Γ, pM, m), msg(c, `${nombre} en ${m}`));
      const g0 = C.resolverP(ΓI, pI, Math.floor(n / 3));
      const inc = C.resolverP(ΓI, pI, n, { acum: g0.acum, checkpoint: g0.checkpoint });
      assert.deepEqual(inc.Y, C.consultar(ΓI, pI, n), msg(c, `${nombre}: incremental ≠ reconstruido`));
    }
  }
});

// ═════════════════════════ casos dirigidos (diferenciales impl = modelo) ═════════════════════════
const W = [1, 0], P = [2, 0], v = [2, 1];
const inicio = [C.nacer('dueño', 'bodega', { nombre: 'W' }),
  C.lote('dueño', C.nacer('dueño', 'producto', { nombre: 'P', público: true, precio: 100 }), C.nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'S1', color: 'Azul' }))];
function diferencial(nombre, C0extra, pasos) {
  test(nombre, () => {
    exigir();
    const g = C.genesisActores(M, { 'dominio.liberaciones': [], ...C0extra });
    const ΓM = C.cauce(RM, g), ΓI = C.cauce(RI(), g);
    const esperados = [];
    for (const [j, sol0] of [...inicio, ...pasos].entries()) {
      const sol = typeof sol0 === 'function' ? sol0(S(ΓM)) : sol0;
      const rM = C.proponer(ΓM, sol), rI = C.proponer(ΓI, sol);
      esperados.push(rM);
      assert.deepEqual(Nres(rI), Nres(rM), `paso ${j + 1}: ${JSON.stringify(sol)}`);
      assert.deepEqual(observables(I, S(ΓI)), observables(M, S(ΓM)), `paso ${j + 1}`);
    }
    assert.deepEqual(observablesFinos(I, S(ΓI)), observablesFinos(M, S(ΓM)));
    assert.ok(esperados.some(r => r.resultado === 'COMPROMETIDO'));
  });
}
const venta = (modo, q, u = 'dueño', canal = 'POS') => ({ u, ...M.plantillaVenta(modo, { variante: v, bodega: W, precio: 100, canal }, q) });
const redSinTransferir = () => { const r = structuredClone(M.RED_INICIAL); delete r.transiciones['Transferir.salida']; delete r.transiciones['Transferir.llegada']; delete r.familias.tránsito; return r; };
diferencial('L7 impl: libre < 0 tras Contar; un conteo siempre se admite; la guarda bloquea nuevas asignaciones', {}, [
  C.disparar('dueño', 'Ingresar', { w: W, v, q: 5 }), venta('venta.firme', 5), C.disparar('dueño', 'Contar', { w: W, v, h: 0 }),
  C.disparar('dueño', 'Contar', { w: W, v, h: 0 }), venta('venta.firme', 1), venta('venta.suave', 1)]);
diferencial('L7 Teorema 6.1 impl: H < 0 con POS liberado; por Web se rechaza', { 'dominio.liberaciones': M.LIBERACIONES_INICIAL }, [
  venta('venta.inmediata', 1, 'dueño', 'POS'), venta('venta.inmediata', 1, 'dueño', 'Web'), C.disparar('dueño', 'Contar', { w: W, v, h: 3 })]);
diferencial('L35 impl: Transferir añadida como dato en una época posterior', { 'dominio.red': redSinTransferir() }, [
  C.nacer('dueño', 'bodega', { nombre: 'W2' }), C.disparar('dueño', 'Ingresar', { w: W, v, q: 5 }),
  C.disparar('dueño', 'Transferir.salida', { w: W, w2: [3, 0], v, q: 2 }),
  C.fijarParametro('dueño', { 'dominio.red': structuredClone(M.RED_INICIAL) }),
  C.disparar('dueño', 'Transferir.salida', { w: W, w2: [3, 0], v, q: 2 }), C.disparar('dueño', 'Transferir.llegada', { w: W, w2: [3, 0], v, q: 2 }),
  C.disparar('dueño', 'Transferir.llegada', { w: W, w2: [3, 0], v, q: 1 })]);
diferencial('L35 impl: depósito, transición, característica y tipo nuevos = dato; la semántica de Asignar sale de la Red vigente', {}, [
  C.disparar('dueño', 'Ingresar', { w: W, v, q: 1 }), venta('venta.suave', 3),
  C.disparar('dueño', 'Asignar', { s: [4, 0], q: 3 }),
  St => { const r = structuredClone(St.parametros['dominio.red']); r.transiciones.Asignar.restricción = ['pend'];
    r.familias.consignado = { especie: 'U', índices: ['bodega', 'variante'], restringida: true };
    r.transiciones.Consignar = { args: { w: { ref: 'bodega' }, v: { ref: 'variante' }, q: { entero: [1, 100] } }, nulo: 'rechazar', restricción: 'todas',
      movimientos: [{ desde: ['H', { a: ['w'] }, { a: ['v'] }], hacia: ['consignado', { a: ['w'] }, { a: ['v'] }], cantidad: { a: ['q'] } }, { desde: ['libre', { a: ['w'] }, { a: ['v'] }], hacia: ['ext.L'], cantidad: { a: ['q'] } }] };
    return C.fijarParametro('dueño', { 'dominio.red': r, 'dominio.forma': C.formaExtendida(St.parametros['dominio.forma']) }); },
  C.disparar('dueño', 'Asignar', { s: [4, 0], q: 3 }), C.disparar('dueño', 'Consignar', { w: W, v, q: 1 }), C.disparar('dueño', 'Ingresar', { w: W, v, q: 2 }),
  C.disparar('dueño', 'Consignar', { w: W, v, q: 1 }), C.fijar('dueño', 'producto', 'material', P, 'Lino'), C.nacer('dueño', 'proveedor', { nombre: 'Prov' })]);
diferencial('L31 impl: G^par rechaza las migraciones incompatibles con los mismos motivos', {}, [
  C.disparar('dueño', 'Ingresar', { w: W, v, q: 1 }),
  St => C.fijarParametro('dueño', { 'dominio.forma': C.formaSinColor(St.parametros['dominio.forma']) }),
  St => { const F = structuredClone(St.parametros['dominio.forma']); delete F.tipos.venta.características.precio.inmutable; return C.fijarParametro('dueño', { 'dominio.forma': F }); },
  St => { const F = structuredClone(St.parametros['dominio.forma']); F.tipos.variante.características.color.valor = { texto: [0, 5] }; return C.fijarParametro('dueño', { 'dominio.forma': F }); },
  St => C.fijarParametro('dueño', { 'dominio.red': C.redInterEspecie(St.parametros['dominio.red']) }),
  St => { const r = structuredClone(St.parametros['dominio.red']); delete r.familias.H; return C.fijarParametro('dueño', { 'dominio.red': r }); },
  St => { const r = structuredClone(St.parametros['dominio.red']); r.familias.libre.especie = 'U'; return C.fijarParametro('dueño', { 'dominio.red': r }); },
  St => C.fijarParametro('dueño', { 'dominio.red': C.redConMermar(St.parametros['dominio.red']) }),
  C.disparar('dueño', 'Mermar', { w: W, v, q: 1 })]);
diferencial('L16 impl: capacidades finas, E4 en lotes, tipo incoherente y alcance propio', {}, [
  C.disparar('dueño', 'Ingresar', { w: W, v, q: 9 }), C.disparar('U1', 'Contar', { w: W, v, h: 0 }), venta('venta.suave', 1, 'U1', 'Web'),
  C.disparar('U1', 'Asignar', { s: [4, 0], q: 1 }), C.lote('U1', C.disparar('U1', 'Cobrar', { s: [4, 0], x: 1 }), C.disparar('U1', 'Contar', { w: W, v, h: 0 })),
  C.fijar('dueño', 'variante', 'nombre', P, 'X'), C.fijar('U1', 'producto', 'nombre', P, 'X'), venta('venta.suave', 1),
  C.disparar('caja', 'Asignar', { s: [5, 0], q: 1 }), venta('venta.inmediata', 2, 'caja', 'POS'), C.disparar('lector', 'Ingresar', { w: W, v, q: 1 })]);
diferencial('L16 impl: alcance propio falla CERRADO en una transición sin objetivo (capacidad Disparar:Ingresar + alcance Disparar:*)', {
  'nucleo.capacidades': { 'dueño': ['*'], repo: ['Disparar:Ingresar', 'Disparar:Contar'] }, 'dominio.alcancePropio': { repo: ['Disparar:*'] } }, [
  C.disparar('repo', 'Ingresar', { w: W, v, q: 1 }), C.disparar('repo', 'Contar', { w: W, v, h: 0 }), C.disparar('dueño', 'Ingresar', { w: W, v, q: 1 })]);
diferencial('L20 impl: Lote atómico; guarda «final» admite el orden interno libre', {}, [
  C.lote('dueño', C.nacer('dueño', 'venta', { variante: v, bodega: W, precio: 10, canal: 'POS' }), C.disparar('dueño', 'Vender', { s: { nacido: 0 }, q: 2 }),
    C.disparar('dueño', 'Asignar', { s: { nacido: 0 }, q: 2 }), C.disparar('dueño', 'Ingresar', { w: W, v, q: 2 })),
  C.fijarParametro('dueño', { 'dominio.lote': { máximo: 50, guarda: 'final' } }),
  C.lote('dueño', C.nacer('dueño', 'venta', { variante: v, bodega: W, precio: 10, canal: 'POS' }), C.disparar('dueño', 'Vender', { s: { nacido: 0 }, q: 2 }),
    C.disparar('dueño', 'Asignar', { s: { nacido: 0 }, q: 2 }), C.disparar('dueño', 'Ingresar', { w: W, v, q: 2 })),
  { u: 'dueño', tipo: 'Lote', args: { acciones: [] } }, C.lote('dueño', C.lote('dueño', C.disparar('dueño', 'Ingresar', { w: W, v, q: 1 })))]);

// ═════════════════════════ Anexo C (fase 3 rehecha) ═════════════════════════
const PR = await import('../../src/preguntas/index.mjs');
test('C.5 contrato: el catálogo de la fase 2 (kobalt/src/preguntas/monoides.mjs) contiene `nacimientos` con sus leyes, y Π_T de la impl lo usa', () => {
  let Mn;
  assert.doesNotThrow(() => { Mn = PR.monoide({ nombre: 'nacimientos' }); }, 'falta {nombre: "nacimientos"} en kobalt/src/preguntas/monoides.mjs (C.5)');
  const Mr = M.MONOIDE_NACIMIENTOS;
  const r = C.prng(SEMILLA ^ 0x7a7a);
  const lista = () => Array.from({ length: C.entero(r, 0, 3) }, () => [C.entero(r, 1, 9), C.entero(r, 0, 2)]);
  for (let i = 0; i < 300; i++) {
    const [a, b, c] = [lista(), lista(), lista()];
    assert.deepEqual(Mn.op(Mn.op(a, b), c), Mn.op(a, Mn.op(b, c)));
    assert.deepEqual(Mn.op(a, b), Mr.op(a, b));
    assert.deepEqual(Mn.inyectar(a), Mr.inyectar(a));
  }
  assert.deepEqual(Mn.unidad, []);
  assert.equal(Mn.inyectar([1, 2]), undefined);
  assert.deepEqual([Mn.conmutativo, Mn.idempotente, Mn.grupo, Boolean(Mn.envolvente)], [false, false, false, false]);
  assert.deepEqual(PR.leyes({ nombre: 'nacimientos' }), { conmutativo: false, idempotente: false, grupo: false, envolvente: false, ventana: 'segmentos', distribucion: 'no', materializable: true });
  exigir();
  assert.deepEqual(I.PROYECCIONES.T.monoide.op([[1, 0]], [[2, 1]]), [[1, 0], [2, 1]]);
});
test('C.1 impl: con una guarda endurecida (crearRegla({guardaAdicional})) Fold y preguntas de Γ válidas no cambian; readmisión = modelo', () => {
  exigir();
  const endurecida = (D, a) => (a.tipo === 'Disparar:Ingresar' || a.tipo === 'Nacer:cliente' ? 'endurecida' : null);
  const RI2 = { [I.ID_REGLA]: I.crearRegla({ guardaAdicional: endurecida }) }, RM2 = { [M.ID_REGLA]: M.crearRegla({ guardaAdicional: endurecida }) };
  for (let c = 0; c < Math.min(CASOS, 8); c++) {
    const g = generado(c);
    const ΓI = C.reejecutar(RI(), g.g, g.sols).Γ;
    assert.deepEqual(N.fold(N.estadoInicial(g.g, RI2), ΓI.entradas, RI2).D, S(ΓI).D, msg(c, 'Fold con guarda endurecida'));
    const ΓI2 = { ...ΓI, registro: RI2 }, ΓM2 = { ...g.Γ, registro: RM2 };
    for (const n of ['catalogo', 'marcado', 'T', 'auditoria']) assert.deepEqual(C.consultar(ΓI2, I.PROYECCIONES[n]), C.consultar(g.Γ, M.PROYECCIONES[n]), msg(c, n));
    assert.deepEqual(C.consultar(ΓI2, I.PROYECCIONES.readmision(RI2[I.ID_REGLA])), C.consultar(ΓM2, M.PROYECCIONES.readmision(RM2[M.ID_REGLA])), msg(c, 'readmisión'));
    ΓI.entradas.forEach((e, k) => assert.deepEqual(I.movimientos(ΓI.estados[k].D, ΓI.estados[k].parametros, e), M.movimientos(g.Γ.estados[k].D, g.Γ.estados[k].parametros, e)));
  }
});
test('C.4 impl: los lectores de dominio sirven a las preguntas de la fase 2 con el mismo resultado que el modelo', () => {
  exigir();
  const qs = [
    { φ: { v: true }, aporte: { lee: 'nacimientos@1', con: [{ v: 'variante' }] }, M: { nombre: 'unión' }, obs: { nombre: 'identidad' } },
    { φ: { op: '=', de: [{ e: 'tipo' }, { v: 'Disparar:Ingresar' }] }, aporte: { lee: 'marcado@1', con: [{ v: 'H' }, { a: ['w'] }, { a: ['v'] }] }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } },
    { φ: { op: 'prefijo', de: [{ v: 'Disparar:' }, { e: 'tipo' }] }, aporte: { clave: { e: 'tipo' }, valor: { op: 'long', de: [{ lee: 'movimientos@1', con: [{ e: 'tipo' }, { a: [] }, { e: 'u' }, { e: 'epoca' }] }] } }, M: { nombre: 'sumaPorClave' }, obs: { nombre: 'identidad' } },
    { φ: { op: '=', de: [{ e: 'tipo' }, { v: 'Fijar:variante.color' }] }, aporte: { clave: { lee: 'carac@1', con: [{ a: ['e'] }, { v: 'sku' }] }, valor: { v: 1 } }, M: { nombre: 'conteo' }, obs: { nombre: 'identidad' } },
  ];
  for (let c = 0; c < Math.min(CASOS, 6); c++) {
    const g = generado(c);
    const ΓI = C.reejecutar(RI(), g.g, g.sols).Γ;
    for (const q of qs) {
      const rI = PR.responder(q, C.trayectoria(ΓI), { registro: RI(), lectores: I.LECTORES });
      const rM = PR.responder(q, C.trayectoria(g.Γ), { registro: RM, lectores: M.LECTORES });
      assert.equal(rM.resultado, 'OK', JSON.stringify(rM));
      assert.deepEqual([rI.resultado, rI.Y], [rM.resultado, rM.Y], msg(c, JSON.stringify(q.aporte)));
    }
  }
});
test('C.3 impl: disponibilidad total con ambas agregaciones, familias como parámetro y visibilidad con regla de Φ o pasada', () => {
  exigir();
  const g = C.genesisActores(M, { 'dominio.liberaciones': [] });
  const ΓM = C.cauce(RM, g), ΓI = C.cauce(RI(), g);
  const W1 = [1, 0], W2 = [2, 0], v = [3, 1], P1 = [3, 0];
  const pasos = [C.nacer('dueño', 'bodega', { nombre: 'W' }), C.nacer('dueño', 'bodega', { nombre: 'W2' }),
    C.lote('dueño', C.nacer('dueño', 'producto', { nombre: 'P', público: true }), C.nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'S' })),
    C.disparar('dueño', 'Ingresar', { w: W1, v, q: 5 }), C.disparar('dueño', 'Ingresar', { w: W2, v, q: 3 }),
    { u: 'dueño', ...M.plantillaVenta('venta.firme', { variante: v, bodega: W2, precio: 1, canal: 'POS' }, 3) }, C.disparar('dueño', 'Contar', { w: W2, v, h: 0 }),
    { u: 'dueño', ...M.plantillaVenta('venta.registro', { variante: v, bodega: W1, precio: 1, canal: 'POS' }, 2) },
    C.añadir('dueño', 'producto', 'galería', P1, { Q: C.qHex(3), creador: 'dueño', propósito: 'página', audiencia: 'creador', permitidos: [] })];
  for (const sol of pasos) assert.deepEqual(Nres(C.proponer(ΓI, sol)), Nres(C.proponer(ΓM, sol)), JSON.stringify(sol));
  const cfgs = [M.DISPONIBILIDAD_INICIAL, { ...M.DISPONIBILIDAD_INICIAL, agregación: 'máximoDeSuma' },
    { ...M.DISPONIBILIDAD_INICIAL, familias: { ...M.DISPONIBILIDAD_INICIAL.familias, pendiente: 'pend⁰' } }];
  for (const cfg of cfgs) for (const w of [null, W1, W2]) {
    assert.deepEqual(I.disponibilidad(S(ΓI).D, S(ΓI).parametros, w, v, cfg), M.disponibilidad(S(ΓM).D, S(ΓM).parametros, w, v, cfg), `${JSON.stringify(cfg)} w=${w}`);
    assert.deepEqual(C.consultar(ΓI, I.PROYECCIONES.disponibilidad(w, v, cfg)), C.consultar(ΓM, M.PROYECCIONES.disponibilidad(w, v, cfg)));
  }
  const x = I.carac(S(ΓI).D, S(ΓI).parametros, P1, 'galería')[0];
  for (const [u, regla] of [['U1', null], ['U1', { v: true }], ['dueño', null], ['U1', { op: '=', de: [{ x: 'u' }, { v: 'U1' }] }]]) {
    assert.equal(I.visible(S(ΓI).D, S(ΓI).parametros, u, P1, x, regla), M.visible(S(ΓM).D, S(ΓM).parametros, u, P1, x, regla), `${u} ${JSON.stringify(regla)}`);
  }
});
const usuarioEstado = St => { const F = structuredClone(St.parametros['dominio.forma']);
  F.tipos.usuario.características.estado = { clase: 'ciclo', valor: { enum: ['inactivo', 'activo'] }, ciclo: { estados: ['inactivo', 'activo'], inicial: 'inactivo', transiciones: [['inactivo', 'activo'], ['activo', 'inactivo']] } };
  return F; };
diferencial('C.2 impl: actividad como dato (ciclo «estado» en usuario sin actividad no cambia κ; declarar o quitar actividad pasa por G^par)', {}, [
  C.nacer('dueño', 'usuario', { nombre: 'A', principal: 'p1' }),
  St => C.fijarParametro('dueño', { 'dominio.forma': usuarioEstado(St) }),
  C.nacer('dueño', 'usuario', { nombre: 'B', principal: 'p1' }),
  St => { const F = structuredClone(St.parametros['dominio.forma']); F.tipos.usuario.actividad = { característica: 'estado', valores: ['activo'] }; return C.fijarParametro('dueño', { 'dominio.forma': F }); },
  C.nacer('dueño', 'usuario', { nombre: 'B', principal: 'p1' }),
  St => { const F = structuredClone(St.parametros['dominio.forma']); delete F.tipos.usuario.actividad; return C.fijarParametro('dueño', { 'dominio.forma': F }); },
  C.fijar('dueño', 'variante', 'estado', v, 'retirado'), C.nacer('dueño', 'variante', { producto: P, sku: 'S1' }),
  St => { const F = structuredClone(St.parametros['dominio.forma']); delete F.tipos.variante.actividad; return C.fijarParametro('dueño', { 'dominio.forma': F }); }]);
const redC4 = St => { const r = structuredClone(St.parametros['dominio.red']);
  const t = (cantidad, extra = {}) => ({ args: { w: { ref: 'bodega' }, v: { ref: 'variante' }, q: { entero: [1, 100] } }, nulo: 'rechazar', restricción: 'todas', ...extra,
    movimientos: [{ desde: ['ext.U'], hacia: ['H', { a: ['w'] }, { a: ['v'] }], cantidad }, { desde: ['ext.L'], hacia: ['libre', { a: ['w'] }, { a: ['v'] }], cantidad }] });
  r.transiciones.Sacar = t({ op: '−', de: [{ a: ['q'] }] });
  r.transiciones.Enorme = t({ op: '×', de: [{ a: ['q'] }, { v: 2 ** 52 }] }, { restricción: 'ninguna' });
  r.transiciones.Exacta = t({ op: '+', de: [{ v: Number.MAX_SAFE_INTEGER }, { op: '−', de: [{ a: ['q'] }] }, { v: 1 }] });
  return r; };
diferencial('C.4 C.6 impl: expresiones de la fase 2 en la Red (−x unario, exactitud, desbordamiento ⇒ cantidad) y lector no registrado ⇒ fueraDeDominio', {}, [
  St => C.fijarParametro('dueño', { 'dominio.red': redC4(St) }), C.disparar('dueño', 'Ingresar', { w: W, v, q: 5 }),
  C.disparar('dueño', 'Sacar', { w: W, v, q: 2 }), C.disparar('dueño', 'Sacar', { w: W, v, q: 4 }), C.disparar('dueño', 'Enorme', { w: W, v, q: 4 }),
  C.disparar('dueño', 'Exacta', { w: W, v, q: 3 }), C.disparar('dueño', 'Exacta', { w: W, v, q: 100 }),
  St => { const r = structuredClone(St.parametros['dominio.red']); r.transiciones.Rara = { ...r.transiciones.Sacar, movimientos: [{ desde: ['ext.U'], hacia: ['H', { a: ['w'] }, { a: ['v'] }], cantidad: { lee: 'inventado@1', con: [] } }] }; return C.fijarParametro('dueño', { 'dominio.red': r }); }]);
diferencial('C.7 C.8 impl: reordenar índices con marcado se rechaza; __proto__/toString/constructor son desconocidos; −0 = 0', {}, [
  St => { const r = structuredClone(St.parametros['dominio.red']); r.familias.noApto.índices = ['variante', 'bodega']; return C.fijarParametro('dueño', { 'dominio.red': r }); },
  C.disparar('dueño', 'Ingresar', { w: W, v, q: 2 }),
  St => { const r = structuredClone(St.parametros['dominio.red']); r.familias.H.índices = ['variante', 'bodega']; return C.fijarParametro('dueño', { 'dominio.red': r }); },
  C.disparar('dueño', '__proto__', {}), C.disparar('dueño', 'toString', {}), C.nacer('dueño', '__proto__', {}), C.nacer('dueño', 'constructor', {}),
  C.fijar('dueño', 'bodega', '__proto__', W, 1), C.disparar('dueño', 'Contar', { w: W, v, h: -0 })]);

// ═════════════════════════ oráculo de aceptación v2/v3 contra la implementación ═════════════════════════
registrarAceptacion(test, () => exigir(), 'implementación');
