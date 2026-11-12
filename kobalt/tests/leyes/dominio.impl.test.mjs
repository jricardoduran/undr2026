// Kobalt — CONTRATO DE IMPLEMENTACIÓN de la regla de dominio `kobalt.dominio@1` (fase 3: Forma + red de flujo).
// Compara `kobalt/src/dominio/index.mjs` contra el modelo de referencia `kobalt/tests/modelos/dominio.modelo.mjs`, ambos
// montados sobre el NÚCLEO REAL (`kobalt/src/nucleo/index.mjs`). Spec: kobalt/specs/2026-11-11_fase3-forma-y-flujo.md.
// Mientras el módulo no exista, TODAS estas pruebas fallan con un mensaje que indica la ruta esperada y la API pendiente.
//
// Ejecutar:  node --test 'kobalt/tests/leyes/*.test.mjs'
// Variables: KOBALT_SEED, KOBALT_CASOS_DOMINIO, KOBALT_DOMINIO_IMPL (ruta alternativa de la implementación: así se
//            ejecutan los mutantes sobre una COPIA y se valida este contrato contra el propio modelo).
//
// ════════════════════════════════════ API EXIGIDA ════════════════════════════════════
// `kobalt/src/dominio/index.mjs` exporta (puede exportar más). Sin dependencias externas; importa el núcleo solo de
// `../nucleo/`; NO importa nada de kobalt/tests/ ni de kobalt/kernels/. Todo es síncrono y puro.
//
// 1. La regla (dato que el núcleo interpreta; fase 1 §3.1 + enmienda E3/E4)
//   ID_REGLA = 'kobalt.dominio@1'
//   REGLA = {id, D0, tipos, tiposInternos, guarda(D, e, C) → 'ok'|motivo, T(D, e, C) → D' (PURA: no muta D; D congelado
//           no lanza), sigma, guardaPar(m, D, C) → 'ok'|motivo, codD(D) → valor CV}
//     tipos (E3): {'Nacer:*', 'Fijar:*', 'Añadir:*', 'Quitar:*', 'Disparar:*', 'Lote'} — validan SOLO la forma (G5):
//       Nacer:<τ>              args = {valores: mapa}
//       Fijar:<τ>.<k>          args = {e: ref, v: valor|null}         (null = quitar el valor explícito)
//       Añadir|Quitar:<τ>.<k>  args = {e: ref, x: elemento}
//       Disparar:<t>           args = mapa
//       Lote                   args = {acciones: [{tipo, args}…]} con cada acción interna de forma válida o tipo 'Lote'
//       ref = ID [i, j] (enteros, i ≥ 1, j ≥ 0) | {nacido: j} (j‑ésimo nacimiento de la misma entrada)
//     tiposInternos(e) (E4): Lote ⇒ tipos de sus acciones; si no ⇒ [].
//   FORMA_INICIAL, RED_INICIAL, LIBERACIONES_INICIAL: deepEqual a los del modelo (Anexo A y §5.3 + pend⁰ del Anexo «un
//     solo verbo»); son el FORMATO de datos de Φ y 𝒩 (las pruebas escriben Redes y Formas nuevas en ese formato).
//     Expresiones: sintaxis de la fase 2 §4.2 ({v}, {a:[…]}, {p}, {x}, {lee, con}, {op, de}); lectores: carac, marcado,
//     activa, padre, dueño, creador, tipo, propietario, 'disp.libre'.
//   REGLA.sigma: los 7 parámetros `dominio.*` con los mismos valores iniciales y dominios que el modelo
//     (forma, red, liberaciones, alcancePropio, propietarios (null ⇒ [nucleo.constituyente]), lote, conjunto).
//
// 2. Semántica (= modelo). ID = [i, j] con i = nd + e.ε + 1. Clave de lugar = `${familia}[${ids "i.j" separados por ","}]`.
//   Motivos de INADMISIBLE (mismo orden de guardas que el modelo; §5.1):
//     tipoDesconocido · característicaDesconocida · valorInválido · cicloInválido · requerida · referenciaInexistente ·
//     referenciaTipo · admite · padre · máximo · κDuplicada · restricción · ajeno · tipoIncoherente · claseIncompatible ·
//     inmutable · yaPresente · ausente · transiciónDesconocida · transiciónInterna · argumentos · familiaDesconocida ·
//     cantidad · sinEfecto · negativo:<clave de lugar> · loteTamaño · loteAnidado · (G^par) formaQuitaTipo ·
//     formaCambiaPadre · formaRelajaInmutable · formaQuitaCaracterística · formaCambiaClase · formaCambiaValor ·
//     κNoÚnica · redQuitaFamilia · redCambiaEspecie · redCambiaÍndices · redTipoDesconocido · redFamiliaDesconocida ·
//     redInterEspecie.
//   «dato, no código» (revisión estática, abajo): fuera de `inicial.mjs` ningún archivo de kobalt/src/dominio/ contiene
//   nombres de transiciones ni de características (regex de la spec) ni literales iguales a nombres de tipos,
//   transiciones, familias o características de RED_INICIAL / FORMA_INICIAL (salvo la convención genérica de actividad
//   `estado`/`activo` y `nombre`); ningún `case`/`if` sobre el nombre de una transición. La configuración de las
//   preguntas de disponibilidad (qué familias son H, libre, pend…) también vive en inicial.mjs.
//
// 3. Lectores (preguntas sobre D; nunca escriben). IDs como [i, j]; mapas indexados por "i.j".
//   entidades(D) → [{id, tipo, creador, padre}] en orden de nacimiento
//   seccionPropia(D, id) → {k ↦ valor | [elementos ordenados por hex(CV(clave))]}   (solo valores explícitos)
//   carac(D, C, id, k) → valor efectivo (herencia por padre, defecto) | undefined (desconocido)
//   activa(D, C, id) → bool · dueño(D, id) → principal
//   coordenadas(D, C) → T = IDs de los tipos densos en orden · slot(D, C, id) → 1..N | null
//   marcado(D) → {clave de lugar ↦ entero ≠ 0} · valorLugar(D, f, [ids]) → entero
//   disponibilidad(D, C, w, v) → {H, A, P, P0, libre, noAsignada, prudente, déficit, noApto, descuadre}
//   auditoria(D, C) → [nombres de invariantes que FALLAN] (VF5:<especie> y las de 𝒩.auditoría)
//   visible(D, C, u, id, elemento) → bool
//   fibra(D, C, k, valor, τ = 'variante') → {miembros, activos, conocidos} · filtrar(D, C, τ, φ) → [IDs]
//   ficha(D, C, id) → {id, tipo, slot, efectiva, existencias} · movimientos(D, C, e) → {clave de lugar ↦ Δ ≠ 0}
//
// 4. Preguntas (E1, forma monoidal del núcleo): PROYECCIONES = {T, catalogo, marcado, auditoria, flat(w, defecto = 0),
//    disponibilidad(w, v), fibra(k, valor, τ)}; su Y (resolverProyeccion) = la del modelo para la misma Γ.
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

const API = ['ID_REGLA', 'REGLA', 'FORMA_INICIAL', 'RED_INICIAL', 'LIBERACIONES_INICIAL',
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
  for (const x of ['estado', 'activo', 'nombre']) s.delete(x); // convención genérica del modelo (actividad) y nombre común
  return s;
}
/** Devuelve las violaciones de la regla «dato, no código» en {ruta ↦ texto}. */
function revisarEstatica(archivos) {
  const v = [];
  const nombres = nombresDeDatos();
  for (const [ruta, txt] of Object.entries(archivos)) {
    if (/from\s+['"][^'"]*(tests|kernels)\//.test(txt) || /import\([^)]*(tests|kernels)\//.test(txt)) v.push(`${ruta}: importa de kobalt/tests o kobalt/kernels`);
    if (basename(ruta) === 'inicial.mjs') continue;
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
});
test('contrato: datos iniciales (Forma, Red, liberaciones, Σ) = los del modelo; ID de la regla; tipos patrón y tiposInternos', () => {
  exigir();
  assert.equal(I.ID_REGLA, 'kobalt.dominio@1');
  assert.equal(I.REGLA.id, I.ID_REGLA);
  assert.deepEqual(I.FORMA_INICIAL, M.FORMA_INICIAL);
  assert.deepEqual(I.RED_INICIAL, M.RED_INICIAL);
  assert.deepEqual(I.LIBERACIONES_INICIAL, M.LIBERACIONES_INICIAL);
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
diferencial('L20 impl: Lote atómico; guarda «final» admite el orden interno libre', {}, [
  C.lote('dueño', C.nacer('dueño', 'venta', { variante: v, bodega: W, precio: 10, canal: 'POS' }), C.disparar('dueño', 'Vender', { s: { nacido: 0 }, q: 2 }),
    C.disparar('dueño', 'Asignar', { s: { nacido: 0 }, q: 2 }), C.disparar('dueño', 'Ingresar', { w: W, v, q: 2 })),
  C.fijarParametro('dueño', { 'dominio.lote': { máximo: 50, guarda: 'final' } }),
  C.lote('dueño', C.nacer('dueño', 'venta', { variante: v, bodega: W, precio: 10, canal: 'POS' }), C.disparar('dueño', 'Vender', { s: { nacido: 0 }, q: 2 }),
    C.disparar('dueño', 'Asignar', { s: { nacido: 0 }, q: 2 }), C.disparar('dueño', 'Ingresar', { w: W, v, q: 2 })),
  { u: 'dueño', tipo: 'Lote', args: { acciones: [] } }, C.lote('dueño', C.lote('dueño', C.disparar('dueño', 'Ingresar', { w: W, v, q: 1 })))]);

// ═════════════════════════ oráculo de aceptación v2/v3 contra la implementación ═════════════════════════
registrarAceptacion(test, () => exigir(), 'implementación');
