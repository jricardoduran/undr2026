// Kobalt — LEYES de la fase 2 (álgebra de preguntas) contra el MODELO DE REFERENCIA.
// Spec: kobalt/specs/2026-11-11_fase2-preguntas.md (con su Anexo) sobre la enmienda E1
// (kobalt/specs/2026-11-11_fase1-enmienda-preguntas.md; su Anexo C.4 pide probar aquí las leyes de cada monoide).
// Teoría: kobalt/docs/2026-11-11_ALGEBRA_DE_PREGUNTAS.md (P1–P7). Leyes: L2, L9, L10, L13, L15, L21, L32, L33, L34.
//
// El modelo (kobalt/tests/modelos/preguntas.modelo.mjs) compila cada pregunta a una Π monoidal y la resuelve con el
// núcleo REAL (kobalt/src/nucleo). El oráculo es `directo`: recorrer Γ con el Fold del MODELO del núcleo en paralelo.
// Proporcionalidad (CLAUDE.md, 2026‑11‑12): oráculo derivado de las leyes en todo; mutantes solo para las leyes críticas
// de esta fase (incrementalidad y ventanas = recorrido directo; distribución).
//
// Ejecutar:  node --test 'kobalt/tests/leyes/*.test.mjs'
// Variables: KOBALT_SEED, KOBALT_CASOS (escala), KOBALT_PREGUNTAS_MODELO (ruta de una COPIA mutada del modelo).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import * as N from '../../src/nucleo/index.mjs';
import * as MN from '../modelos/nucleo.modelo.mjs';
import * as G from './preguntas.comun.mjs';

const P = await import(process.env.KOBALT_PREGUNTAS_MODELO ? pathToFileURL(process.env.KOBALT_PREGUNTAS_MODELO).href : '../modelos/preguntas.modelo.mjs');
const { SEMILLA, CASOS, prng, entero, elegir, R } = G;
const L = G.lectoresJuguete(P);
const O = (extra = {}) => ({ registro: R, lectores: L, ...extra });
const msg = (c, extra = '') => `semilla=${SEMILLA + c} (KOBALT_SEED=${SEMILLA}, caso ${c}) ${extra}`;
const igual = (a, b) => P.hexCV(a) === P.hexCV(b);
const usaPosicion = q => /"e":"(k|sid)"/.test(JSON.stringify(q)); // k y sid dependen de la trayectoria concreta
const compilada = q => { const c = P.compilar(q, { lectores: L }); assert.equal(c.resultado, 'COMPILADA', c.motivo); return c; };

// ═════════════════════════ L32 / L9 / V10 ═════════════════════════
test('L32 L9 responder = oráculo directo en toda ventana (i, j] y desde todo checkpoint (válido, adelantado, de otra i, de otra pregunta, manipulado)', () => {
  const stats = { casos: 0, noUnidad: 0, leeEstado: 0, producto: 0, acciones: new Set() };
  const nT = Math.max(10, Math.floor(CASOS / 4));
  for (let c = 0; c < nT; c++) {
    const r = prng(SEMILLA + c);
    const Γ = G.trayectoria(SEMILLA + 7919 * c);
    const n = Γ.entradas.length;
    for (let t = 0; t < 4; t++) {
      const q = G.generarPregunta(r);
      const q2 = G.generarPregunta(r);
      const comp = compilada(q);
      if (comp.proy.leeEstado) stats.leeEstado++;
      if (Array.isArray(q)) stats.producto++;
      for (let w = 0; w < 4; w++) {
        const i = entero(r, 0, n), j = entero(r, i, n), tRef = entero(r, -3, 6);
        const o = O({ i, j, tRef });
        const d = P.directo(q, Γ, i, j, o);
        if (!igual(d.acum, comp.proy.monoide.unidad)) stats.noUnidad++;
        const ver = (res, acciones, etiqueta) => {
          const m = msg(c, `q=${JSON.stringify(q)} (${i},${j}] ${etiqueta}`);
          assert.equal(res.resultado, 'OK', m);
          assert.ok(acciones.includes(res.accion), `${m}: acción ${res.accion} ∉ ${acciones}`);
          assert.ok(igual(res.acum, d.acum), `${m}: acum ${JSON.stringify(res.acum)} ≠ ${JSON.stringify(d.acum)}`);
          assert.ok(igual(res.Y, d.Y), `${m}: Y ${JSON.stringify(res.Y)} ≠ ${JSON.stringify(d.Y)}`);
          assert.ok(!('tRef' in res.checkpoint), `${m}: el checkpoint monoidal no lleva tRef (L15)`);
          assert.equal(res.checkpoint.ver, P.identidad(q), m);
          stats.acciones.add(res.accion); stats.casos++;
        };
        ver(P.responder(q, Γ, o), ['RECONSTRUIR'], 'sin guardado');
        const j0 = entero(r, i, j);
        const g0 = P.responder(q, Γ, O({ i, j: j0 }));
        ver(P.responder(q, Γ, { ...o, guardado: g0 }), j0 === j ? ['REUTILIZAR'] : ['ACTUALIZAR'], `checkpoint válido j0=${j0}`);
        if (j < n) { const g1 = P.responder(q, Γ, O({ i, j: entero(r, j + 1, n) })); ver(P.responder(q, Γ, { ...o, guardado: g1 }), ['RECONSTRUIR'], 'adelantado'); }
        if (j > 0) { const i2 = (i + 1 + entero(r, 0, j - 1)) % (j + 1); if (i2 !== i) { const g2 = P.responder(q, Γ, O({ i: i2, j: Math.max(i2, j0) })); ver(P.responder(q, Γ, { ...o, guardado: g2 }), ['RECONSTRUIR'], `de otra i=${i2}`); } }
        if (P.identidad(q2) !== P.identidad(q)) { const g3 = P.responder(q2, Γ, O({ i, j: j0 })); ver(P.responder(q, Γ, { ...o, guardado: g3 }), ['RECONSTRUIR'], 'de otra pregunta'); }
        const g4 = structuredClone(g0); g4.checkpoint.h = 'ee'.repeat(32);
        ver(P.responder(q, Γ, { ...o, guardado: { acum: g0.acum, checkpoint: g4.checkpoint } }), ['DISCONTINUIDAD'], 'manipulado');
      }
    }
  }
  assert.ok(stats.noUnidad > stats.casos / 20, `generador vacío: ${JSON.stringify({ ...stats, acciones: [...stats.acciones] })}`);
  assert.ok(stats.leeEstado > 0 && stats.producto > 0, 'el generador debe producir preguntas con leeEstado y productos');
});

test('L32 una pregunta es un valor CV: identidad determinista; cambiar un componente cambia la identidad y no reutiliza lo guardado', () => {
  const qv = { φ: { v: true }, aporte: { a: ['q'] }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } };
  assert.equal(P.identidad(qv), G.VECTOR_IDENTIDAD.id, 'vector publicado de identidad');
  assert.equal(P.identidad(qv), N.derivar(P.ETIQUETA, N.cv(qv)));
  const invertida = { obs: qv.obs, M: qv.M, aporte: qv.aporte, φ: qv.φ };
  assert.equal(P.identidad(invertida), P.identidad(qv), 'CV canónico: el orden de las claves no cuenta');
  for (let c = 0; c < Math.max(10, CASOS / 5); c++) {
    const r = prng(SEMILLA + 31 * c);
    const Γ = G.trayectoria(SEMILLA + 101 * c);
    const q = G.generarSimple(r);
    const id = P.identidad(q);
    assert.match(id, /^[0-9a-f]{64}$/);
    assert.equal(P.identidad(structuredClone(q)), id, msg(c, 'mismo valor ⇒ misma identidad'));
    const comp = compilada(q);
    assert.equal(comp.proy.id, `preguntas:${id}`); assert.equal(comp.proy.ver, id);
    assert.equal(comp.proy.sensibleAEpoca, false, 'Teorema E1.4a');
    // Cambiar un componente: φ, aporte, M u obs.
    const variantes = [
      { ...q, φ: { op: 'no', de: [q.φ] } },
      { ...q, φ: { op: 'y', de: [q.φ, { op: '=', de: [{ e: 'tipo' }, { v: 'sumar' }] }] } },
      { ...q, obs: q.obs.nombre === 'identidad' ? { nombre: 'valor', parametros: { de: { x: 'acum' } } } : { nombre: 'identidad' } },
      { ...q, ventanaTiempo: 'filtro' },
    ];
    const n = Γ.entradas.length;
    const g = P.responder(q, Γ, O({ j: n }));
    for (const q2 of variantes) {
      if (P.compilar(q2, { lectores: L }).resultado !== 'COMPILADA') continue;
      assert.notEqual(P.identidad(q2), id, msg(c, 'otro componente ⇒ otra identidad'));
      const res = P.responder(q2, Γ, O({ j: n, guardado: g }));
      assert.equal(res.accion, 'RECONSTRUIR', msg(c, 'lo guardado con otra pregunta no se reutiliza (L22)'));
      assert.ok(igual(res.Y, P.directo(q2, Γ, 0, n, O()).Y), msg(c));
    }
  }
  const qs = [qv, { ...qv, M: { nombre: 'máximo' } }];
  assert.equal(P.identidad(P.tupla(qs)), N.derivar(P.ETIQUETA, N.cv(qs)), 'P5: id(q_×) = id(lista de los q_i)');
});

test('L32 (Teorema E1.1, Anexo B.1) una pregunta no es función de S: mismo estado, distinta respuesta', () => {
  const Γ1 = G.trayectoriaDe([{ tipo: 'fijar', args: { clave: 'a', v: 1 } }, { tipo: 'sumar', args: { clave: 'a', q: 1 } }]);
  const Γ2 = G.trayectoriaDe([{ tipo: 'fijar', args: { clave: 'a', v: 2 } }, { tipo: 'fijar', args: { clave: 'a', v: 2 } }]);
  assert.deepStrictEqual(MN.estadoEn(Γ1, 2, R), MN.estadoEn(Γ2, 2, R), 'mismo S_2 (mismos sid)');
  const q = { φ: { op: '=', de: [{ e: 'tipo' }, { v: 'sumar' }] }, aporte: { v: 1 }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } };
  assert.equal(P.responder(q, Γ1, O()).Y, 1); assert.equal(P.responder(q, Γ2, O()).Y, 0);
});

test('L32 (Anexo §2, Teorema 2) las guardas no intervienen en la lectura: responder no llama a ninguna guarda', () => {
  const sinGuardas = Object.fromEntries(Object.entries(R).map(([k, regla]) => [k, Object.freeze({ ...regla, guarda: () => { throw new Error('una lectura llamó a una guarda'); }, guardaPar: () => { throw new Error('guardaPar en lectura'); } })]));
  for (let c = 0; c < Math.max(8, CASOS / 10); c++) {
    const r = prng(SEMILLA + 17 * c); const Γ = G.trayectoria(SEMILLA + 13 * c); const q = G.generarPregunta(r);
    const a = P.responder(q, Γ, O()); const b = P.responder(q, Γ, { ...O(), registro: sinGuardas });
    assert.ok(igual(a.Y, b.Y) && igual(a.acum, b.acum), msg(c));
  }
});

// ═════════════════════════ L33: leyes de cada monoide del catálogo (VQ4, Anexo C.4) ═════════════════════════
for (const desc of G.DESCRIPTORES) {
  test(`L33 leyes del monoide ${JSON.stringify(desc)}: asociatividad, unidad y conmutatividad/idempotencia/inverso declarados = reales`, () => {
    const M = P.monoide(desc);
    const r = prng(SEMILLA ^ P.hexCV(desc).length * 7919);
    const ternas = Math.max(600, 20 * CASOS);
    let contraConm = null, contraIdem = null;
    const op = (a, b) => { const ha = P.hexCV(a), hb = P.hexCV(b); const x = M.op(a, b); assert.ok(P.hexCV(a) === ha && P.hexCV(b) === hb, 'op no muta sus argumentos'); assert.ok(P.esCV(x), 'op da un valor CV'); return x; };
    for (let t = 0; t < ternas; t++) {
      const a = G.elemento(r, desc, P), b = G.elemento(r, desc, P), c = G.elemento(r, desc, P);
      const m = `a=${JSON.stringify(a)} b=${JSON.stringify(b)} c=${JSON.stringify(c)}`;
      assert.ok(igual(op(op(a, b), c), op(a, op(b, c))), `asociatividad: ${m}`);
      assert.ok(igual(op(M.unidad, a), a) && igual(op(a, M.unidad), a), `unidad: ${m}`);
      const conm = igual(op(a, b), op(b, a));
      if (M.conmutativo) assert.ok(conm, `declarado conmutativo: ${m}`); else if (!conm) contraConm ??= [a, b];
      const idem = igual(op(a, a), a);
      if (M.idempotente) assert.ok(idem, `declarado idempotente: ${m}`); else if (!idem) contraIdem ??= a;
      if (M.grupo) assert.ok(igual(op(a, M.inv(a)), M.unidad) && igual(op(M.inv(a), a), M.unidad), `inverso: ${m}`);
      if (M.envolvente) {
        const E = M.envolvente;
        assert.ok(E.grupo && igual(E.op(a, b), op(a, b)), `envolvente (grupo que extiende a M): ${m}`);
        assert.ok(igual(E.op(E.inv(a), a), E.unidad), `inverso en la envolvente: ${m}`);
      }
    }
    if (!M.conmutativo) assert.ok(contraConm, 'declarado NO conmutativo: debe existir un contraejemplo (declarado = real)');
    if (!M.idempotente) assert.ok(contraIdem !== null, 'declarado NO idempotente: debe existir un contraejemplo');
    if (!M.grupo) assert.equal(M.inv, undefined, 'solo los grupos declaran inv');
    const Lq = P.leyes(desc);
    assert.deepStrictEqual([Lq.conmutativo, Lq.idempotente, Lq.grupo], [M.conmutativo, M.idempotente, M.grupo]);
    assert.equal(Lq.ventana, M.grupo || M.envolvente ? 'prefijos' : 'segmentos');
    assert.equal(Lq.distribucion, M.conmutativo ? (M.idempotente ? 'cubrimiento' : 'particion') : 'no');
  });
}

test('L33 tabla §7.3: indicadores del catálogo tal como los declara la spec', () => {
  const t = (d, conm, idem, grupo) => { const l = P.leyes(d); assert.deepStrictEqual([l.conmutativo, l.idempotente, l.grupo], [conm, idem, grupo], JSON.stringify(d)); };
  t({ nombre: 'suma' }, true, false, true); t({ nombre: 'sumaPorClave' }, true, false, true); t({ nombre: 'conteo' }, true, false, false);
  t({ nombre: 'mínimo' }, true, true, false); t({ nombre: 'máximo' }, true, true, false); t({ nombre: 'último' }, false, true, false);
  t({ nombre: 'máximoPor' }, true, true, false); t({ nombre: 'extremoPrefijo', parametros: { modo: 'mín' } }, false, false, false);
  t({ nombre: 'unión' }, true, true, false); t({ nombre: 'conjuntoAQ' }, false, true, false); t({ nombre: 'secuencia' }, false, false, false);
  assert.equal(P.leyes({ nombre: 'conteo' }).ventana, 'prefijos', 'conteo: ventana por prefijos en su grupo envolvente ℤ^X');
  assert.equal(P.leyes({ nombre: 'tupla', parametros: { de: [{ nombre: 'suma' }, { nombre: 'último' }] } }).ventana, 'segmentos', 'producto: la más débil');
  assert.equal(P.leyes({ nombre: 'tupla', parametros: { de: [{ nombre: 'suma' }, { nombre: 'conteo' }] } }).ventana, 'prefijos');
});

test('L33 mapa(etiquetas) no es un grupo aunque todas sus etiquetas lo sean (precisión de la tabla §7.3)', () => {
  const M = P.monoide({ nombre: 'mapa', parametros: { etiquetas: { s: { nombre: 'suma' }, t: { nombre: 'suma' } } } });
  assert.equal(M.grupo, false); assert.equal(M.inv, undefined);
  // Sin normalizar, {k:[s,1]} ⊗ {k:[s,−1]} = {k:[s,0]} ≠ {} = unidad: no hay inverso.
  assert.ok(!igual(M.op({ k: ['s', 1] }, { k: ['s', -1] }), M.unidad));
  // Normalizar (borrar las entradas iguales a la unidad de su etiqueta) rompe la asociatividad:
  const norm = x => (x === null ? null : Object.fromEntries(Object.entries(x).filter(([, [, v]]) => v !== 0)));
  const opN = (a, b) => norm(M.op(a, b));
  const a = { k: ['s', 1] }, b = { k: ['s', -1] }, c = { k: ['t', 3] };
  assert.notDeepStrictEqual(opN(opN(a, b), c), opN(a, opN(b, c)), 'contraejemplo: (a⊗b)⊗c = c, a⊗(b⊗c) = null');
});

// ═════════════════════════ P4 / L21 / L13: distribución (§7.6, E1.5) ═════════════════════════
function particion(r) {
  const acciones = G.accionesLibres(r, entero(r, 0, 25));
  const m = entero(r, 1, 4);
  const asign = acciones.map(() => entero(r, 0, m - 1));
  const etiquetas = Array.from({ length: m }, (_, x) => x);
  const construir = perm => {
    const tray = {}, σ = {};
    for (let x = 0; x < m; x++) { const s = G.streamN(perm[x]); const Γx = G.trayectoriaDe(acciones.filter((_, k) => asign[k] === x), s); tray[s] = Γx; σ[s] = Γx.entradas.length; }
    return { tray, σ };
  };
  const perm2 = [...etiquetas]; for (let x = m - 1; x > 0; x--) { const y = entero(r, 0, x); [perm2[x], perm2[y]] = [perm2[y], perm2[x]]; }
  return { acciones, total: G.trayectoriaDe(acciones), A: construir(etiquetas), B: construir(perm2.map(p => p + 5)) };
}

test('P4 L33 (§7.6, E1.5) particiones en trayectorias disjuntas: conmutativo ⇒ = total y no depende del orden ni de las etiquetas; no conmutativo ⇒ NO_CONMUTATIVO; leeEstado ⇒ DEPENDE_DEL_ESTADO', () => {
  const cuenta = { ok: 0, noConm: 0, estado: 0 };
  for (let c = 0; c < Math.max(20, CASOS / 3); c++) {
    const r = prng(SEMILLA + 4099 * c);
    const { total, A, B } = particion(r);
    for (let t = 0; t < 4; t++) {
      const q = G.generarPregunta(r, x => !usaPosicion(x));
      const comp = compilada(q);
      const dA = P.distribuir(q, A.σ, A.tray, O({ tRef: 1 })), dB = P.distribuir(q, B.σ, B.tray, O({ tRef: 1 }));
      const m = msg(c, `q=${JSON.stringify(q)}`);
      if (!comp.proy.monoide.conmutativo) { assert.equal(dA.resultado, 'NO_CONMUTATIVO', m); cuenta.noConm++; continue; }
      if (comp.proy.leeEstado) { assert.equal(dA.resultado, 'DEPENDE_DEL_ESTADO', m); cuenta.estado++; continue; }
      assert.equal(dA.resultado, 'OK', m);
      const esperado = P.directo(q, total, 0, total.entradas.length, O()).acum;
      assert.ok(igual(dA.acum, esperado), `${m}: ⊗_X acum_X = ${JSON.stringify(dA.acum)} ≠ total ${JSON.stringify(esperado)}`);
      assert.ok(igual(dB.acum, dA.acum) && igual(dB.Y, dA.Y), `${m}: depende de las etiquetas/orden de las trayectorias`);
      const nucleo = N.proyectarCorte(A.σ, A.tray, R, comp.proy);
      assert.ok(igual(dA.acum, nucleo.valor), `${m}: distribuir debe ser N.proyectarCorte de la Π compilada`);
      cuenta.ok++;
    }
  }
  assert.ok(cuenta.ok > 0 && cuenta.noConm > 0 && cuenta.estado > 0, JSON.stringify(cuenta));
});

test('P4 (§7.6) leeEstado no se distribuye: «sumar 5; fijar 1» da merma 4 y en el otro orden 0', () => {
  const merma = { φ: { op: '=', de: [{ e: 'tipo' }, { v: 'fijar' }] }, aporte: { op: 'si', de: [{ op: '<', de: [{ op: '−', de: [{ lee: 'valor@1', con: [{ a: ['clave'] }] }, { a: ['v'] }] }, { v: 0 }] }, { v: 0 }, { op: '−', de: [{ lee: 'valor@1', con: [{ a: ['clave'] }] }, { a: ['v'] }] }] }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } };
  const s5 = { tipo: 'sumar', args: { clave: 'a', q: 5 } }, f1 = { tipo: 'fijar', args: { clave: 'a', v: 1 } };
  assert.equal(P.responder(merma, G.trayectoriaDe([s5, f1]), O()).Y, 4);
  assert.equal(P.responder(merma, G.trayectoriaDe([f1, s5]), O()).Y, 0);
  // E1.2: la contribución de la MISMA entrada depende del estado previo (producto en corona, no End(S) × M).
  assert.equal(P.responder(merma, G.trayectoriaDe([{ tipo: 'sumar', args: { clave: 'a', q: 2 } }, f1]), O()).Y, 1);
  const tray = { [G.streamN(0)]: G.trayectoriaDe([s5], G.streamN(0)), [G.streamN(1)]: G.trayectoriaDe([f1], G.streamN(1)) };
  assert.equal(P.distribuir(merma, { [G.streamN(0)]: 1, [G.streamN(1)]: 1 }, tray, O()).resultado, 'DEPENDE_DEL_ESTADO');
});

test('P4 L13 (§7.6) réplicas con solape: la suma sin deduplicar cuenta doble, la unión no; deduplicar por (StreamID, k) lo corrige', () => {
  const qSuma = { φ: { v: true }, aporte: { a: ['q'] }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } };
  const qUnion = { φ: { v: true }, aporte: { op: 'lista', de: [{ lee: 'claveDe@1', con: [] }] }, M: { nombre: 'unión' }, obs: { nombre: 'identidad' } };
  let sumaOk = 0, total = 0;
  for (let c = 0; c < Math.max(40, CASOS); c++) {
    const r = prng(SEMILLA + 271 * c);
    const Γ = G.trayectoriaDe(G.accionesLibres(r, entero(r, 1, 15)));
    for (const [q, nombre] of [[qSuma, 'suma'], [qUnion, 'unión']]) {
      const comp = compilada(q); const M = P.monoide(q.M);
      const cs = N.aportes(comp.proy, Γ, 0, Γ.entradas.length, R).map((x, k) => ({ id: `${Γ.streamId}:${k + 1}`, x }));
      const replicas = [[], []]; // cubrimiento con solape: cada entrada en una o en las dos réplicas
      for (const e of cs) { const z = entero(r, 0, 2); if (z !== 1) replicas[0].push(e); if (z !== 0) replicas[1].push(e); }
      const plegar = es => es.reduce((a, e) => M.op(a, e.x), structuredClone(M.unidad));
      const sinDedup = M.op(plegar(replicas[0]), plegar(replicas[1]));
      const dedup = plegar([...new Map([...replicas[0], ...replicas[1]].map(e => [e.id, e])).values()]);
      const esperado = plegar(cs);
      assert.ok(igual(dedup, esperado), msg(c, `${nombre}: deduplicar por identidad = total`));
      if (nombre === 'unión') assert.ok(igual(sinDedup, esperado), msg(c, 'unión (semirretículo): cualquier cubrimiento'));
      else { total++; if (igual(sinDedup, esperado)) sumaOk++; }
    }
  }
  assert.ok(sumaOk < total, `la suma sin deduplicar debe fallar en algún solape (correcta ${sumaOk}/${total})`);
});

test('L21 (Anexo B.2) distribuir con un corte no cerrado ⇒ NO_CERRADO; no conmutativo ⇒ NO_CONMUTATIVO antes que el cierre', () => {
  const ΓY = G.trayectoriaDe([{ tipo: 'sumar', args: { clave: 'a', q: 1 } }, { tipo: 'sumar', args: { clave: 'b', q: 2 } }], C_STREAM_Y);
  const ΓX = G.trayectoriaDe([{ tipo: 'sumar', args: { clave: 'a', q: 3 }, deps: [{ stream: C_STREAM_Y, k: 2, h: ΓY.hashes[2] }], conocidas: { [C_STREAM_Y]: ΓY } }], C_STREAM_X);
  const tray = { [C_STREAM_X]: ΓX, [C_STREAM_Y]: ΓY };
  const qSuma = { φ: { v: true }, aporte: { a: ['q'] }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } };
  assert.equal(P.distribuir(qSuma, { [C_STREAM_X]: 1, [C_STREAM_Y]: 1 }, tray, O()).resultado, 'NO_CERRADO');
  const ok = P.distribuir(qSuma, { [C_STREAM_X]: 1, [C_STREAM_Y]: 2 }, tray, O());
  assert.equal(ok.resultado, 'OK'); assert.equal(ok.acum, 6);
  assert.equal(P.distribuir({ ...qSuma, M: { nombre: 'último' } }, { [C_STREAM_X]: 1, [C_STREAM_Y]: 1 }, tray, O()).resultado, 'NO_CONMUTATIVO');
});
const C_STREAM_X = '0a'.repeat(16), C_STREAM_Y = '0b'.repeat(16);

// ═════════════════════════ L34: lo que se guarda es el cociente de Nerode ═════════════════════════
/** ¿κ es congruencia para obs sobre M? ∀ m, m', w en los universos dados. Devuelve el primer contraejemplo o null. */
function contraCongruencia(M, obs, κ, elems, ws) {
  for (const m of elems) for (const m2 of elems) {
    if (!igual(κ(m), κ(m2))) continue;
    for (const w of ws) if (!igual(obs(M.op(m, w)), obs(M.op(m2, w)))) return { m, m2, w };
  }
  return null;
}
const obsDe = (Mdesc, obs) => { const c = compilada({ φ: { v: true }, aporte: { v: null }, M: Mdesc, obs }); return a => c.proy.obs(a, { parametros: {}, tRef: null }); };
const subconjuntos = xs => xs.reduce((acc, x) => [...acc, ...acc.map(s => [...s, x])], [[]]).map(P.conj);

test('L34 cocientes congruentes (búsqueda exhaustiva en universos pequeños): componente, fibra (unión y conjuntoAQ), aplicar', () => {
  const mapas = []; for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) mapas.push(Object.fromEntries([['a', a], ['b', b]].filter(([, v]) => v !== 0)));
  const MS = P.monoide({ nombre: 'sumaPorClave' });
  assert.equal(contraCongruencia(MS, obsDe({ nombre: 'sumaPorClave' }, { nombre: 'componente', parametros: { clave: { v: 'a' } } }), m => m.a ?? 0, mapas, mapas), null,
    'componente(c): κ(m) = m[c] es congruencia (más pequeño que «el mapa» de la tabla §7.5)');
  const U = ['a', 'b', 'c'];
  const fib = { nombre: 'fibra', parametros: { universo: { v: U }, conocidos: { v: [true, true, false] } } };
  const subs = subconjuntos(['a', 'b', 'c', 'x', 'y']);
  const corta = s => s.filter(x => U.includes(x));
  assert.equal(contraCongruencia(P.monoide({ nombre: 'unión' }), obsDe({ nombre: 'unión' }, fib), corta, subs, subs), null, 'fibra sobre unión: κ(A) = A ∩ U');
  const subs2 = subconjuntos(['a', 'x']); const pares = subs2.flatMap(A => subs2.map(Q => [A, Q]));
  assert.equal(contraCongruencia(P.monoide({ nombre: 'conjuntoAQ' }), obsDe({ nombre: 'conjuntoAQ' }, fib), ([A, Q]) => [corta(A), corta(Q)], pares, pares), null, 'fibra sobre conjuntoAQ: κ(A,Q) = (A∩U, Q∩U)');
  const ext = []; for (let s = -2; s <= 2; s++) for (const e of [null, -3, -2, -1, 0, 1, 2]) ext.push([s, e]);
  const Mext = P.monoide({ nombre: 'extremoPrefijo', parametros: { modo: 'mín' } });
  assert.equal(contraCongruencia(Mext, obsDe({ nombre: 'extremoPrefijo', parametros: { modo: 'mín' } }, { nombre: 'aplicar', parametros: { x0: { v: 0 } } }), ([s, e]) => [s, e === null ? 0 : Math.min(0, e)], ext, ext), null,
    'aplicar(x0): κ(s, e) = (s, min(0, e)) es congruencia');
});

test('L34 L10 umbral no es congruente: guardar obs(acum) y actualizar sobre él daría otra respuesta (contraejemplo exhaustivo); responder recalcula obs siempre', () => {
  const M = P.monoide({ nombre: 'suma' });
  const qU = { φ: { op: '=', de: [{ e: 'tipo' }, { v: 'sumar' }] }, aporte: { a: ['q'] }, M: { nombre: 'suma' }, obs: { nombre: 'umbral', parametros: { op: '≥', valor: { v: 0 } } } };
  const obs = obsDe({ nombre: 'suma' }, qU.obs);
  const xs = [-3, -2, -1, 0, 1, 2, 3];
  const contra = contraCongruencia(M, obs, obs, xs, xs);
  assert.ok(contra, 'debe existir m, m\' con umbral(m) = umbral(m\') y umbral(m⊗w) ≠ umbral(m\'⊗w)');
  // Caso dirigido: el mismo umbral tras el prefijo, distinto tras el sufijo; responder desde el checkpoint acierta.
  const Γ1 = G.trayectoriaDe([{ tipo: 'sumar', args: { clave: 'a', q: 0 } }, { tipo: 'sumar', args: { clave: 'a', q: -1 } }]);
  const Γ2 = G.trayectoriaDe([{ tipo: 'sumar', args: { clave: 'a', q: 3 } }, { tipo: 'sumar', args: { clave: 'a', q: -1 } }]);
  for (const [Γ, esperado] of [[Γ1, false], [Γ2, true]]) {
    const g = P.responder(qU, Γ, O({ j: 1 }));
    assert.equal(g.Y, true);
    const r = P.responder(qU, Γ, O({ j: 2, guardado: g }));
    assert.equal(r.accion, 'ACTUALIZAR'); assert.equal(r.Y, esperado);
  }
});

test('L34 sin cociente más pequeño: la mediana (spec §4.3) y ordenDesc (Nerode = identidad en universos pequeños)', () => {
  const med = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)]; };
  assert.equal(med([1, 5, 9]), med([5, 5, 5])); assert.equal(med([1, 5, 9, 0, 0]), 1); assert.equal(med([5, 5, 5, 0, 0]), 5);
  const V = [0, 1, 2, 3]; const ms = []; for (const a of V) for (const b of V) for (const c of V) if (a <= b && b <= c) ms.push([a, b, c]);
  const ws = [[]]; for (const a of V) { ws.push([a]); for (const b of V) if (a <= b) { ws.push([a, b]); for (const c of V) if (b <= c) ws.push([a, b, c]); } }
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
    assert.ok(ws.some(w => med([...ms[i], ...w]) !== med([...ms[j], ...w])), `mediana: ${ms[i]} y ${ms[j]} serían Nerode‑equivalentes`);
  }
  const M = P.monoide({ nombre: 'conteo' });
  const obs = obsDe({ nombre: 'conteo' }, { nombre: 'ordenDesc', parametros: { n: { v: 1 } } });
  const mapas = []; for (const a of [0, 1, 2]) for (const b of [0, 1, 2]) mapas.push(Object.fromEntries([['a', a], ['b', b]].filter(([, v]) => v)));
  const ws2 = []; for (const a of [0, 1, 2, 3]) for (const b of [0, 1, 2, 3]) ws2.push(Object.fromEntries([['a', a], ['b', b]].filter(([, v]) => v)));
  for (const m of mapas) for (const m2 of mapas) if (!igual(m, m2)) assert.ok(ws2.some(w => !igual(obs(M.op(m, w)), obs(M.op(m2, w)))), `ordenDesc(1): ${JSON.stringify(m)} ~ ${JSON.stringify(m2)}`);
});

test('L34 (§7.3) secuencia no se materializa nunca (ni sola ni dentro de un producto o de un mapa)', () => {
  const Γ = G.trayectoria(SEMILLA + 5);
  const qSeq = { φ: { v: true }, aporte: { op: 'lista', de: [{ e: 'tipo' }] }, M: { nombre: 'secuencia' }, obs: { nombre: 'identidad' } };
  for (const tipo of ['prefijos', 'segmentos']) {
    assert.equal(P.materializar(qSeq, Γ, Γ.entradas.length, O({ tipo })).resultado, 'NO_MATERIALIZABLE');
    assert.equal(P.materializar([qSeq, { ...qSeq, M: { nombre: 'unión' } }], Γ, Γ.entradas.length, O({ tipo })).resultado, 'NO_MATERIALIZABLE');
  }
  assert.equal(P.leyes({ nombre: 'mapa', parametros: { etiquetas: { s: { nombre: 'secuencia' } } } }).materializable, false);
});

// ═════════════════════════ Ventanas: P3 (Teorema 7.2), Teorema 7.3, VQ2, VQ3 ═════════════════════════
const plegarLista = (M, xs) => xs.reduce((a, b) => M.op(a, b), structuredClone(M.unidad));

test('P3 (Teorema 7.2) en S₃ (no conmutativo) la ventana por prefijos es P_i⁻¹ ⊗ P_j en TODA ventana; P_j ⊗ P_i⁻¹ falla (documental)', () => {
  let malas = 0, todas = 0;
  for (let c = 0; c < Math.max(10, CASOS / 10); c++) {
    const r = prng(SEMILLA + 61 * c);
    const xs = Array.from({ length: entero(r, 1, 60) }, () => elegir(r, G.S3_ELEMENTOS));
    const tabla = []; let acc = G.S3.unidad; for (const x of xs) { acc = G.S3.op(acc, x); tabla.push(acc); }
    for (let i = 0; i <= xs.length; i++) for (let j = i; j <= xs.length; j++) {
      const directo = plegarLista(G.S3, xs.slice(i, j));
      const v = P.ventanaPrefijos(G.S3, tabla, i, j);
      assert.deepStrictEqual(v.acum, directo, msg(c, `(${i},${j}]`));
      assert.ok(v.usados <= 2);
      const Pi = i ? tabla[i - 1] : G.S3.unidad, Pj = j ? tabla[j - 1] : G.S3.unidad;
      todas++; if (!igual(G.S3.op(Pj, G.S3.inv(Pi)), directo)) malas++;
    }
  }
  assert.ok(malas > 0, `P_j·P_i⁻¹ debería fallar en algún caso (falló ${malas}/${todas})`);
});

test('Teorema 7.3 ventana por segmentos = plegado directo con monoides no conmutativos, n ≤ 200, TODAS las ventanas; usados ≤ 2⌈log₂ n⌉', () => {
  for (const [nombre, M] of Object.entries(G.NO_CONMUTATIVOS)) {
    for (const n of [0, 1, 2, 3, 7, 8, 9, 64, 200]) {
      const r = prng(SEMILLA + n * 13 + nombre.length);
      const xs = Array.from({ length: n }, () => G.elementoNoConm(r, nombre));
      const niveles = P.construirSegmentos(M, xs);
      // VQ3: contenido de cada bloque alineado
      niveles.forEach((nivel, l) => nivel.forEach((blq, b) => assert.ok(igual(blq, plegarLista(M, xs.slice(b * 2 ** l, (b + 1) * 2 ** l))), `${nombre} n=${n} bloque ℓ=${l} b=${b}`)));
      const cota = Math.max(1, 2 * Math.ceil(Math.log2(Math.max(n, 2))));
      for (let i = 0; i <= n; i++) {
        let d = structuredClone(M.unidad);
        for (let j = i; j <= n; j++) {
          if (j > i) d = M.op(d, xs[j - 1]);
          const v = P.ventanaSegmentos(M, niveles, i, j);
          assert.ok(igual(v.acum, d), `${nombre} n=${n} (${i},${j}]: ${JSON.stringify(v.acum)} ≠ ${JSON.stringify(d)}`);
          assert.ok(v.usados <= cota, `${nombre} n=${n} (${i},${j}]: ${v.usados} bloques > ${cota}`);
        }
      }
    }
  }
});

function casosVentana(filtro, nCasos) {
  const out = [];
  for (let c = 0; out.length < nCasos && c < 50 * nCasos; c++) {
    const r = prng(SEMILLA + 977 * c);
    const q = G.generarPregunta(r, filtro);
    out.push({ c, r, q, Γ: G.trayectoria(SEMILLA + 1543 * c) });
  }
  return out;
}

test('P3 L9 VQ2 ventana(q) por prefijos (grupos; conteo en ℤ^X; con leeEstado) = oráculo; la tabla actualizada por sufijos = reconstruida', () => {
  const esGrupo = q => P.leyes(q.M).ventana === 'prefijos';
  let conEstado = 0;
  for (const { c, r, q, Γ } of casosVentana(q => esGrupo(q), Math.max(8, CASOS / 10))) {
    const n = Γ.entradas.length;
    if (compilada(q).proy.leeEstado) conEstado++;
    const j0 = entero(r, 0, n);
    const m0 = P.materializar(q, Γ, j0, O({ tipo: 'prefijos' }));
    assert.equal(m0.resultado, 'OK', msg(c));
    const m1 = P.materializar(q, Γ, n, O({ tipo: 'prefijos', guardado: m0.mat }));
    assert.equal(m1.accion, j0 === n ? 'REUTILIZAR' : 'ACTUALIZAR', msg(c));
    const rec = P.materializar(q, Γ, n, O({ tipo: 'prefijos' }));
    assert.ok(igual(m1.mat.acum, rec.mat.acum), msg(c, 'VQ2: actualizada = reconstruida'));
    // VQ2: ([P_1…P_n], P_n) con P_k = acum(0, k)
    for (let k = 1; k <= n; k++) assert.ok(igual(rec.mat.acum[0][k - 1], P.directo(q, Γ, 0, k, O()).acum), msg(c, `P_${k}`));
    assert.ok(igual(rec.mat.acum[1], P.directo(q, Γ, 0, n, O()).acum));
    for (let t = 0; t < 40; t++) {
      const i = entero(r, 0, n), j = entero(r, i, n);
      const v = P.ventana(q, Γ, i, j, rec.mat, O({ tRef: 2 }));
      const d = P.directo(q, Γ, i, j, O({ tRef: 2 }));
      assert.equal(v.resultado, 'OK', msg(c));
      assert.ok(igual(v.acum, d.acum) && igual(v.Y, d.Y), msg(c, `q=${JSON.stringify(q)} (${i},${j}]: ${JSON.stringify(v.acum)} ≠ ${JSON.stringify(d.acum)}`));
      assert.ok(v.usados <= 2);
    }
    // Una materialización que no casa con Γ no se usa (L22).
    const falsa = structuredClone(rec.mat); falsa.checkpoint.h = 'ee'.repeat(32);
    if (n > 0) assert.equal(P.ventana(q, Γ, 0, n, falsa, O()).resultado, 'MATERIALIZACIÓN_INVÁLIDA');
    const otra = P.materializar({ ...q, φ: { op: 'no', de: [q.φ] } }, Γ, n, O({ tipo: 'prefijos' }));
    assert.equal(P.ventana(q, Γ, 0, n, otra.mat, O()).resultado, 'MATERIALIZACIÓN_INVÁLIDA', 'materialización de otra pregunta');
  }
  assert.ok(conEstado > 0, 'debe haber preguntas de grupo con leeEstado (merma)');
  assert.equal(P.materializar({ φ: { v: true }, aporte: { e: 'k' }, M: { nombre: 'último' }, obs: { nombre: 'identidad' } }, G.trayectoria(SEMILLA), 0, O({ tipo: 'prefijos' })).resultado, 'NO_GRUPO');
});

test('Teorema 7.3 L9 VQ3 ventana(q) por segmentos (cualquier M, también no conmutativos y con leeEstado) = oráculo; el índice actualizado por sufijos = reconstruido', () => {
  let noConm = 0;
  for (const { c, r, q, Γ } of casosVentana(q => P.leyes(Array.isArray(q) ? { nombre: 'tupla', parametros: { de: q.map(x => x.M) } } : q.M).materializable, Math.max(10, CASOS / 8))) {
    const n = Γ.entradas.length;
    if (!compilada(q).proy.monoide.conmutativo) noConm++;
    const j0 = entero(r, 0, n);
    const m0 = P.materializar(q, Γ, j0, O({ tipo: 'segmentos' }));
    const m1 = P.materializar(q, Γ, n, O({ tipo: 'segmentos', guardado: m0.mat }));
    const rec = P.materializar(q, Γ, n, O({ tipo: 'segmentos' }));
    assert.equal(m1.accion, j0 === n ? 'REUTILIZAR' : 'ACTUALIZAR', msg(c));
    assert.ok(igual(m1.mat.acum, rec.mat.acum), msg(c, 'VQ3: actualizado = reconstruido'));
    const cota = Math.max(1, 2 * Math.ceil(Math.log2(Math.max(n, 2))));
    for (let t = 0; t < 40; t++) {
      const i = entero(r, 0, n), j = entero(r, i, n);
      const v = P.ventana(q, Γ, i, j, rec.mat, O({ tRef: 1 }));
      const d = P.directo(q, Γ, i, j, O({ tRef: 1 }));
      assert.ok(igual(v.acum, d.acum) && igual(v.Y, d.Y), msg(c, `q=${JSON.stringify(q)} (${i},${j}]`));
      assert.ok(v.usados <= cota);
    }
  }
  assert.ok(noConm > 0);
});

// ═════════════════════════ P5, P6, P7 ═════════════════════════
test('P5 producto = componentes por separado, en UNA sola pasada (instrumentado: llamadas a T de la regla)', () => {
  let llamadas = 0;
  const RI = Object.fromEntries(Object.entries(R).map(([k, regla]) => [k, regla.T ? Object.freeze({ ...regla, T: (...a) => { llamadas++; return regla.T(...a); } }) : regla]));
  for (let c = 0; c < Math.max(8, CASOS / 10); c++) {
    const r = prng(SEMILLA + 8191 * c); const Γ = G.trayectoria(SEMILLA + 3 * c);
    const qs = Array.from({ length: 3 }, () => G.generarSimple(r));
    const sueltas = qs.map(q => { llamadas = 0; const x = P.responder(q, Γ, { ...O({ tRef: 2 }), registro: RI }); return { x, llamadas }; });
    llamadas = 0; const prod = P.responder(P.tupla(qs), Γ, { ...O({ tRef: 2 }), registro: RI }); const lProd = llamadas;
    assert.ok(igual(prod.Y, sueltas.map(s => s.x.Y)) && igual(prod.acum, sueltas.map(s => s.x.acum)), msg(c));
    assert.ok(lProd <= Math.max(...sueltas.map(s => s.llamadas)), msg(c, `una pasada: ${lProd} llamadas a T frente a ${sueltas.map(s => s.llamadas)}`));
  }
});

test('P6 composición de filtros: φ₁ ∧ φ₂ = φ₂ sobre la subsecuencia de φ₁; ∧ conmuta; De Morgan; φ ∨ ¬φ = todo', () => {
  for (let c = 0; c < Math.max(10, CASOS / 5); c++) {
    const r = prng(SEMILLA + 3571 * c); const Γ = G.trayectoria(SEMILLA + 11 * c); const n = Γ.entradas.length;
    const base = G.generarSimple(r); const φ1 = G.generarφ(r), φ2 = G.generarφ(r);
    const conφ = φ => ({ ...base, φ });
    const A = compilada(base).analisis; const M = A.M;
    // oráculo literal: recorrer Γ, quedarse con la subsecuencia de φ₁ y aplicar φ₂ y el aporte sobre ella
    let S = MN.estadoInicial(Γ.g, R), acum = structuredClone(M.unidad);
    const ap = base.aporte.clave !== undefined ? { op: 'mapa', de: [{ v: 'clave' }, base.aporte.clave, ...(base.aporte.etiqueta ? [{ v: 'etiqueta' }, base.aporte.etiqueta] : []), { v: 'valor' }, base.aporte.valor] } : base.aporte;
    for (let k = 1; k <= n; k++) {
      const e = Γ.entradas[k - 1]; const amb = { e, k, parametros: S.parametros, S, vars: {}, lectores: L };
      if (P.evaluar(φ1, amb) === true && P.evaluar(φ2, amb) === true) { const x = M.inyectar(P.evaluar(ap, amb)); if (x !== undefined) acum = M.op(acum, x); }
      S = MN.transformar(S, e, R);
    }
    const y12 = P.responder(conφ({ op: 'y', de: [φ1, φ2] }), Γ, O());
    assert.ok(igual(y12.acum, acum), msg(c, 'φ₁∧φ₂ = φ₂ sobre la subsecuencia de φ₁'));
    assert.ok(igual(P.responder(conφ({ op: 'y', de: [φ2, φ1] }), Γ, O()).acum, acum), msg(c, '∧ conmuta'));
    const dm1 = P.responder(conφ({ op: 'no', de: [{ op: 'y', de: [φ1, φ2] }] }), Γ, O()).acum;
    const dm2 = P.responder(conφ({ op: 'o', de: [{ op: 'no', de: [φ1] }, { op: 'no', de: [φ2] }] }), Γ, O()).acum;
    assert.ok(igual(dm1, dm2), msg(c, 'De Morgan'));
    assert.ok(igual(P.responder(conφ({ op: 'o', de: [φ1, { op: 'no', de: [φ1] }] }), Γ, O()).acum, P.responder(conφ({ v: true }), Γ, O()).acum), msg(c, 'φ ∨ ¬φ'));
  }
});

test('P7 la Actualidad es una pregunta: obs valor(lee estado) en j = lo que da Fold(S_0, Γ_j)', () => {
  const q = { φ: { v: false }, aporte: { v: 0 }, M: { nombre: 'suma' },
    obs: { nombre: 'valor', parametros: { de: { op: 'lista', de: [{ lee: 'valor@1', con: [{ v: 'a' }] }, { lee: 'valor@1', con: [{ v: 'b' }] }, { lee: 'miembros@1', con: [] }, { p: 'nucleo.regla' }] } } } };
  assert.equal(compilada(q).proy.leeEstado, true, 'leeEstado se deriva del uso de un lector de estado (también en obs)');
  for (let c = 0; c < Math.max(6, CASOS / 15); c++) {
    for (const Γ of [G.trayectoria(SEMILLA + 29 * c), G.trayectoriaConjunto(SEMILLA + 29 * c)]) {
      for (let j = 0; j <= Γ.entradas.length; j++) {
        const S = MN.estadoEn(Γ, j, R);
        assert.deepStrictEqual(P.responder(q, Γ, O({ j })).Y, [G.valorLector(S, 'a'), G.valorLector(S, 'b'), G.miembrosLector(S), S.parametros['nucleo.regla']], msg(c, `j=${j}`));
      }
    }
  }
});

// ═════════════════════════ Teorema 7.4: ventanas por tiempo ═════════════════════════
test('Teorema 7.4 contraejemplo de la spec: sellos [10, 20, 15, 30] y t = 17 ⇒ el prefijo tiene 1 entrada, el filtro {1, 3}', () => {
  const Γ = G.trayectoriaDe([10, 20, 15, 30].map(v => ({ tipo: 'fijar', args: { clave: 'a', v } })));
  const q = { φ: { v: true }, aporte: { op: 'lista', de: [{ e: 'k' }] }, M: { nombre: 'secuencia' }, obs: { nombre: 'identidad' }, sello: { a: ['v'] } };
  assert.deepStrictEqual(P.sellosEfectivos(q, Γ, O()), [null, 10, 20, 20, 30], 'τ_k = max sello (monótono)');
  const pre = P.porTiempo(q, Γ, null, 17, O());
  assert.deepStrictEqual([pre.i, pre.j, pre.Y], [0, 1, [1]]);
  const fil = P.porTiempo({ ...q, ventanaTiempo: 'filtro' }, Γ, null, 17, O());
  assert.deepStrictEqual([fil.i, fil.j, fil.Y], [0, 4, [1, 3]]);
  assert.equal(P.porTiempo({ φ: q.φ, aporte: q.aporte, M: q.M, obs: q.obs }, Γ, 0, 1, O()).resultado, 'SIN_SELLO');
  assert.equal(P.porTiempo(q, Γ, 20, 10, O()).resultado, 'VENTANA_INVÁLIDA');
});

test('Teorema 7.4 sellos monótonos ⇒ prefijo = filtro; j(t) por búsqueda binaria = barrido lineal; sellos no monótonos ⇒ difieren alguna vez', () => {
  let difieren = 0;
  for (let c = 0; c < Math.max(10, CASOS / 5); c++) {
    const r = prng(SEMILLA + 6007 * c); const Γ = G.trayectoria(SEMILLA + 19 * c); const n = Γ.entradas.length;
    const base = G.generarSimple(r);
    const mono = { ...base, sello: { op: '×', de: [{ e: 'k' }, { v: 10 }] } };
    const t1 = entero(r, -1, 10 * n + 5), t2 = entero(r, t1, 10 * n + 10);
    const a = P.porTiempo(mono, Γ, t1, t2, O()), b = P.porTiempo({ ...mono, ventanaTiempo: 'filtro' }, Γ, t1, t2, O());
    assert.ok(igual(a.acum, b.acum), msg(c, `monótono (${t1},${t2}]: prefijo ${JSON.stringify(a.acum)} ≠ filtro ${JSON.stringify(b.acum)}`));
    assert.ok(igual(a.acum, P.directo(mono, Γ, a.i, a.j, O()).acum));
    const libre = { ...base, sello: { a: ['v'] } };
    const τ = P.sellosEfectivos(libre, Γ, O());
    for (let k = 1; k < τ.length; k++) assert.ok(τ[k - 1] === null || (τ[k] !== null && τ[k] >= τ[k - 1]), msg(c, 'τ monótono'));
    const t = entero(r, -2, 6);
    const lineal = τ.reduce((m, x, k) => (x === null || x <= t ? k : m), 0);
    const p = P.porTiempo(libre, Γ, null, t, O());
    assert.equal(p.j, lineal, msg(c, 'j(t) = max{k : τ_k ≤ t}'));
    const f = P.porTiempo({ ...libre, ventanaTiempo: 'filtro' }, Γ, null, t, O());
    if (!igual(p.acum, f.acum)) difieren++;
  }
  assert.ok(difieren > 0, 'con sellos no monótonos el prefijo y el filtro deben diferir en algún caso');
});

// ═════════════════════════ L15, L2 ═════════════════════════
test('L15 (E1.4b) obs con tRef: el mismo acum responde a dos tRef sin reconstruir; el checkpoint no lleva tRef; tRef fuera de obs es inválido', () => {
  const q = { φ: { v: true }, aporte: { a: ['q'] }, M: { nombre: 'suma' }, obs: { nombre: 'umbral', parametros: { op: '≥', valor: { x: 'tRef' } } } };
  assert.equal(compilada(q).proy.sensibleATiempo, true);
  assert.equal(compilada({ ...q, obs: { nombre: 'identidad' } }).proy.sensibleATiempo, false);
  for (let c = 0; c < Math.max(6, CASOS / 15); c++) {
    const Γ = G.trayectoria(SEMILLA + 37 * c); const n = Γ.entradas.length;
    const g = P.responder(q, Γ, O({ tRef: -100 }));
    assert.ok(!('tRef' in g.checkpoint));
    for (const tRef of [-2, 0, 3, 100]) {
      const r = P.responder(q, Γ, O({ tRef, guardado: g }));
      assert.equal(r.accion, 'REUTILIZAR', msg(c)); assert.ok(igual(r.acum, g.acum));
      assert.equal(r.Y, P.directo(q, Γ, 0, n, O({ tRef })).Y, msg(c, `tRef=${tRef}`));
    }
  }
  for (const campo of ['φ', 'aporte', 'sello']) {
    const malo = { ...q, obs: { nombre: 'identidad' }, [campo]: campo === 'φ' ? { op: '<', de: [{ a: ['q'] }, { x: 'tRef' }] } : { x: 'tRef' } };
    assert.equal(P.compilar(malo, { lectores: L }).resultado, 'PREGUNTA_INVÁLIDA', `tRef en ${campo}`);
  }
});

test('L2 fibra: miembros sobre el universo; el complemento es relativo a los conocidos', () => {
  const Γ = G.trayectoriaDe([{ tipo: 'sumar', args: { clave: 'a', q: 1 } }, { tipo: 'fijar', args: { clave: 'b', v: 2 } }, { tipo: 'sumar', args: { clave: 'a', q: 1 } }]);
  const q = { φ: { v: true }, aporte: { op: 'lista', de: [{ lee: 'claveDe@1', con: [] }] }, M: { nombre: 'unión' },
    obs: { nombre: 'fibra', parametros: { universo: { v: ['a', 'b', 'c', 'd'] }, conocidos: { v: [true, true, true, false] } } } };
  assert.deepStrictEqual(P.responder(q, Γ, O()).Y, { miembros: [true, true, false, false], complemento: [false, false, true, false] });
  for (let c = 0; c < Math.max(10, CASOS / 5); c++) {
    const r = prng(SEMILLA + 43 * c); const Γc = G.trayectoria(SEMILLA + 47 * c);
    const U = ['a', 'b', 'c', 'd', 'x']; const K = U.map(() => r() < 0.7);
    const Y = P.responder({ ...q, obs: { nombre: 'fibra', parametros: { universo: { v: U }, conocidos: { v: K } } } }, Γc, O()).Y;
    U.forEach((_, i) => { assert.equal(Y.complemento[i], K[i] && !Y.miembros[i], msg(c)); if (!K[i]) assert.equal(Y.complemento[i], false, 'lo desconocido nunca está en el complemento'); });
  }
});

// ═════════════════════════ §4.2 Lenguaje de expresiones y lectores ═════════════════════════
test('Lenguaje §4.2: total y determinista (expresiones aleatorias nunca lanzan y dan un valor CV); semántica de cada operador', () => {
  const Γ = G.trayectoria(SEMILLA + 1); const Γc = G.trayectoriaCompuesto(SEMILLA + 2);
  for (let c = 0; c < Math.max(1000, 20 * CASOS); c++) {
    const r = prng(SEMILLA + c);
    const x = G.generarExpr(r);
    const v = P.validarExpr(x, L); assert.ok(v.ok, `${JSON.stringify(x)}: ${v.motivo}`);
    const Γs = r() < 0.5 ? Γ : Γc; const k = entero(r, 1, Math.max(1, Γs.entradas.length));
    const amb = { e: Γs.entradas[k - 1], k, parametros: MN.estadoEn(Γs, k - 1, R).parametros, S: MN.estadoEn(Γs, k - 1, R), vars: { tRef: 3, it: { t: 'sumar' } }, lectores: L };
    if (!amb.e) delete amb.e;
    const a = P.evaluar(x, amb), b = P.evaluar(x, amb);
    assert.ok(P.esCV(a), `${JSON.stringify(x)} ⇒ no CV`); assert.ok(igual(a, b), 'determinista');
  }
  const ev = (x, amb = {}) => P.evaluar(x, { lectores: L, ...amb });
  const v = x => ({ v: x }); const op = (o, ...de) => ({ op: o, de });
  const MAX = Number.MAX_SAFE_INTEGER;
  const casos = [
    [op('+'), 0], [op('×'), 1], [op('+', v(1), v(2), v(3)), 6], [op('+', v(MAX), v(1)), null], [op('+', v(MAX), v(1), v(-1)), MAX],
    [op('−', v(3)), -3], [op('−', v(3), v(5)), -2], [op('×', v(-1), v(0)), 0], [op('+', v(1), v('a')), null], [op('+', v(true), v(1)), null],
    [op('=', v(null), v(null)), true], [op('=', v([1, 'a']), v([1, 'a'])), true], [op('=', v({ a: 1, b: 2 }), v({ b: 2, a: 1 })), true], [op('≠', v(1), v('1')), true],
    [op('<', v(1), v(2)), true], [op('≤', v(2), v(2)), true], [op('<', v('a'), v('b')), null],
    [op('y'), true], [op('o'), false], [op('y', v(true), v(null)), false], [op('o', v(null), v(1)), false], [op('no', v(null)), true], [op('no', v(true)), false],
    [op('si', v(null), v(1), v(2)), 2], [op('si', v(true), v(1), v(2)), 1],
    [op('en', v('a'), v(['b', 'a'])), true], [op('en', v([1]), v([[1]])), true], [op('en', v('a'), v({ a: 0 })), true], [op('en', v(1), v({ a: 0 })), false], [op('en', v('a'), v('abc')), null],
    [op('prefijo', v('ab'), v('abc')), true], [op('prefijo', v('b'), v('abc')), false], [op('prefijo', v(1), v('abc')), null],
    [op('long', v('𝔇a')), 2], [op('long', v([1, 2, 3])), 3], [op('long', v({ a: 1 })), 1], [op('long', v(5)), null],
    [op('lista', v(1), v('a')), [1, 'a']], [op('mapa', v('a'), v(1), v('b'), v(2)), { a: 1, b: 2 }], [op('mapa', v('a'), v(1), v('a'), v(2)), null], [op('mapa', v(1), v(1)), null],
    [op('campo', v({ a: 1 }), v('a')), 1], [op('campo', v({ a: 1 }), v('b')), null], [op('campo', v([5, 6]), v(1)), 6], [op('campo', v([5, 6]), v(2)), null],
    [op('nulo?', v(null)), true], [op('nulo?', v(0)), false],
    [{ a: ['nada'] }, null], [{ e: 'tipo' }, null], [{ p: 'x' }, null], [{ x: 'tRef' }, null],
  ];
  for (const [x, esperado] of casos) assert.ok(igual(ev(x), esperado), `${JSON.stringify(x)} ⇒ ${JSON.stringify(ev(x))}, se esperaba ${JSON.stringify(esperado)}`);
  const e = { tipo: 'sumar', u: 'dueño', epoca: 2, sid: '00ff', clase: 'dominio', args: { clave: 'a', lst: [7, { z: 1 }] } };
  assert.deepStrictEqual([ev({ e: 'tipo' }, { e }), ev({ e: 'epoca' }, { e }), ev({ e: 'k' }, { e, k: 4 }), ev({ a: ['lst', 1, 'z'] }, { e }), ev({ a: ['lst', 2] }, { e }), ev({ p: 'm' }, { parametros: { m: 3 } })], ['sumar', 2, 4, 1, null, 3]);
  const malas = [null, 5, [], { v: 1, e: 'tipo' }, { e: 'otro' }, { a: 'clave' }, { a: [-1] }, { op: 'xor', de: [] }, { op: 'no', de: [] }, { op: 'si', de: [{ v: 1 }] }, { op: 'mapa', de: [{ v: 'a' }] }, { lee: 'nadie@1', con: [] }, { v: 1.5 }, { op: '+' }];
  for (const x of malas) assert.equal(P.validarExpr(x, L).ok, false, JSON.stringify(x));
});

test('Lectores: registro inmutable por identificador; un lector de estado implica leeEstado y uno de entrada no (leeEstado se deriva)', () => {
  const f = () => 1;
  const L1 = P.registrarLector(P.LECTORES_VACIO, 'x@1', { clase: 'entrada', fn: f });
  assert.equal(P.registrarLector(L1, 'x@1', { clase: 'entrada', fn: f }), L1, 'registrar lo mismo es idempotente');
  assert.throws(() => P.registrarLector(L1, 'x@1', { clase: 'entrada', fn: () => 2 }), 'inmutable por identificador');
  assert.throws(() => P.registrarLector(L1, 'x@1', { clase: 'estado', fn: f }));
  assert.throws(() => P.registrarLector(L1, 'sinversion', { clase: 'entrada', fn: f }));
  assert.throws(() => P.registrarLector(L1, 'y@1', { clase: 'otra', fn: f }));
  assert.ok(Object.isFrozen(L1)); assert.equal(Object.hasOwn(P.LECTORES_VACIO, 'x@1'), false, 'registrar no muta el registro anterior');
  const base = { φ: { v: true }, M: { nombre: 'unión' }, obs: { nombre: 'identidad' } };
  assert.equal(compilada({ ...base, aporte: { op: 'lista', de: [{ lee: 'claveDe@1', con: [] }] } }).proy.leeEstado, false);
  assert.equal(compilada({ ...base, aporte: { op: 'lista', de: [{ lee: 'internos@1', con: [] }] } }).proy.leeEstado, false);
  assert.equal(compilada({ ...base, aporte: { op: 'lista', de: [{ lee: 'valor@1', con: [{ v: 'a' }] }] } }).proy.leeEstado, true);
  assert.equal(compilada({ ...base, φ: { op: 'nulo?', de: [{ lee: 'valor@1', con: [{ v: 'a' }] }] }, aporte: { v: [] } }).proy.leeEstado, true);
  // Lector de entrada que descompone un lote (compuesto@1): cuenta las acciones internas por tipo.
  const Γ = G.trayectoriaCompuesto(SEMILLA + 3);
  const q = { φ: { op: '=', de: [{ e: 'tipo' }, { v: 'lote' }] }, aporte: { lee: 'internos@1', con: [] }, M: { nombre: 'secuencia' }, obs: { nombre: 'identidad' } };
  const esperado = Γ.entradas.filter(e => e.tipo === 'lote').flatMap(e => e.args.acciones);
  assert.deepStrictEqual(P.responder(q, Γ, O()).Y, esperado);
});

test('compilar: preguntas mal formadas ⇒ PREGUNTA_INVÁLIDA (y responder/materializar/ventana/porTiempo/distribuir lo propagan)', () => {
  const ok = { φ: { v: true }, aporte: { a: ['q'] }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } };
  assert.equal(P.compilar(ok, { lectores: L }).resultado, 'COMPILADA');
  const malas = [
    { ...ok, φ: undefined }, { ...ok, φ: { v: 1.5 } }, (() => { const x = { ...ok }; delete x.φ; return x; })(), { ...ok, extra: 1 },
    { ...ok, M: { nombre: 'mediana' } }, { ...ok, M: { nombre: 'suma', parametros: { x: 1 } } }, { ...ok, M: { nombre: 'extremoPrefijo' } },
    { ...ok, M: { nombre: 'mapa', parametros: { etiquetas: { m: { nombre: 'mapa', parametros: { etiquetas: { s: { nombre: 'suma' } } } } } } } },
    { ...ok, M: { nombre: 'escaneo', parametros: { de: { nombre: 'suma' } } } },
    { ...ok, obs: { nombre: 'componente', parametros: { clave: { v: 'a' } } } }, { ...ok, obs: { nombre: 'umbral', parametros: { op: '!=', valor: { v: 0 } } } },
    { ...ok, obs: { nombre: 'umbral', parametros: { op: '≥' } } }, { ...ok, obs: { nombre: 'mediana' } },
    { ...ok, M: { nombre: 'tupla', parametros: { de: [{ nombre: 'suma' }, { nombre: 'máximo' }] } }, obs: { nombre: 'cociente' } },
    { ...ok, ventanaTiempo: 'otro' }, { ...ok, sello: { lee: 'nadie@1', con: [] } }, { ...ok, aporte: { op: 'si', de: [] } },
    { ...ok, aporte: { clave: { v: 'a' } } }, [], [ok, { ...ok, M: { nombre: 'nada' } }], 'texto', { derivada: 'otra', de: ok },
  ];
  for (const q of malas) {
    let r; try { r = P.compilar(q, { lectores: L }); } catch (err) { assert.fail(`compilar lanzó con ${JSON.stringify(q)}: ${err.message}`); }
    assert.equal(r.resultado, 'PREGUNTA_INVÁLIDA', JSON.stringify(q));
  }
  const Γ = G.trayectoria(SEMILLA); const q = malas[4];
  assert.equal(P.responder(q, Γ, O()).resultado, 'PREGUNTA_INVÁLIDA');
  assert.equal(P.materializar(q, Γ, 0, O({ tipo: 'segmentos' })).resultado, 'PREGUNTA_INVÁLIDA');
  assert.equal(P.porTiempo(q, Γ, null, 1, O()).resultado, 'PREGUNTA_INVÁLIDA');
  assert.equal(P.distribuir(q, {}, {}, O()).resultado, 'PREGUNTA_INVÁLIDA');
  assert.equal(P.ventana(q, Γ, 0, 0, null, O()).resultado, 'PREGUNTA_INVÁLIDA');
});

// ═════════════════════════ §7.8 Familias con reglas de juguete (valores calculados a mano) ═════════════════════════
test('§7.8 familias de ALGEBRA_DE_PREGUNTAS §6 con reglas de juguete: valores calculados a mano (independientes del modelo)', () => {
  const caps = { 'nucleo.capacidades': { 'dueño': ['*'], cajero: ['sumar'] } };
  const Γ = G.trayectoriaDe([
    { tipo: 'sumar', args: { clave: 'a', q: 3 } },                 // 1
    { u: 'cajero', tipo: 'sumar', args: { clave: 'b', q: 2 } },    // 2
    { tipo: 'fijar', args: { clave: 'a', v: 1 } },                 // 3  merma 3−1 = 2
    { tipo: 'sumar', args: { clave: 'a', q: -4 } },                // 4  a = −3
    { tipo: 'FijarParámetro', args: { defecto: 7 } },              // 5  época 1
    { tipo: 'fijar', args: { clave: 'c', v: 5 } },                 // 6  merma 7−5 = 2
    { u: 'cajero', tipo: 'sumar', args: { clave: 'b', q: 1 } },    // 7
    { tipo: 'fijar', args: { clave: 'a', v: 0 } },                 // 8  merma max(0, −3−0) = 0
  ], C_STREAM_X, caps);
  const t = (φ, aporte, M, obs) => ({ φ, aporte, M, obs });
  const es = tipo => ({ op: '=', de: [{ e: 'tipo' }, { v: tipo }] });
  const I = { nombre: 'identidad' };
  const flujos = t(es('sumar'), { a: ['q'] }, { nombre: 'suma' }, I);
  assert.equal(P.responder(flujos, Γ, O()).Y, 2, 'flujos: 3+2−4+1');
  const mat = P.materializar(flujos, Γ, 8, O({ tipo: 'prefijos' })).mat;
  assert.equal(P.ventana(flujos, Γ, 2, 7, mat, O()).Y, -3, 'flujos en (2,7] por prefijos');
  assert.equal(P.responder(flujos, Γ, O({ i: 2, j: 7 })).Y, -3);
  const frec = t({ v: true }, { clave: { e: 'tipo' }, valor: { v: 1 } }, { nombre: 'conteo' }, { nombre: 'ordenDesc', parametros: { n: { v: 2 } } });
  assert.deepStrictEqual(P.responder(frec, Γ, O()).Y, [['sumar', 4], ['fijar', 3]], 'frecuencias');
  assert.deepStrictEqual(P.responder({ ...frec, obs: I }, Γ, O()).Y, { FijarParámetro: 1, fijar: 3, sumar: 4 });
  const ext = t({ op: 'y', de: [es('sumar'), { op: '=', de: [{ a: ['clave'] }, { v: 'a' }] }] }, { op: 'lista', de: [{ a: ['q'] }, { a: ['q'] }] }, { nombre: 'extremoPrefijo', parametros: { modo: 'mín' } }, { nombre: 'aplicar', parametros: { x0: { v: 0 } } });
  assert.equal(P.responder(ext, Γ, O()).Y, -1, 'extremos: sumas 3, −1 ⇒ mínimo −1');
  const conj = t({ v: true }, { op: 'lista', de: [{ lee: 'claveDe@1', con: [] }] }, { nombre: 'unión' }, { nombre: 'fibra', parametros: { universo: { v: ['a', 'b', 'c', 'd'] }, conocidos: { v: [true, true, true, true] } } });
  assert.deepStrictEqual(P.responder(conj, Γ, O()).Y, { miembros: [true, true, true, false], complemento: [false, false, false, true] }, 'conjuntos');
  const ult = t(es('fijar'), { a: ['v'] }, { nombre: 'último' }, I);
  assert.deepStrictEqual(P.responder(ult, Γ, O()).Y, [0]); assert.deepStrictEqual(P.responder(ult, Γ, O({ j: 7 })).Y, [5], 'últimos');
  const sec = t({ op: '=', de: [{ a: ['clave'] }, { v: 'b' }] }, { op: 'lista', de: [{ e: 'k' }] }, { nombre: 'secuencia' }, I);
  assert.deepStrictEqual(P.responder(sec, Γ, O()).Y, [2, 7], 'secuencias = Γ filtrada');
  const merma = t(es('fijar'), { op: 'si', de: [{ op: '<', de: [{ op: '−', de: [{ lee: 'valor@1', con: [{ a: ['clave'] }] }, { a: ['v'] }] }, { v: 0 }] }, { v: 0 }, { op: '−', de: [{ lee: 'valor@1', con: [{ a: ['clave'] }] }, { a: ['v'] }] }] }, { nombre: 'suma' }, I);
  assert.equal(P.responder(merma, Γ, O()).Y, 4, 'dependiente del estado: 2 + 2 + 0');
  const aut = (u, ep) => t({ op: 'y', de: [{ op: '=', de: [{ e: 'u' }, { v: u }] }, { op: '=', de: [{ e: 'epoca' }, { v: ep }] }] }, { op: 'lista', de: [{ e: 'k' }] }, { nombre: 'secuencia' }, I);
  assert.deepStrictEqual([P.responder(aut('cajero', 1), Γ, O()).Y, P.responder(aut('cajero', 0), Γ, O()).Y, P.responder(aut('dueño', 1), Γ, O()).Y], [[7], [2], [6, 8]], 'autoridad (la época de una entrada es la vigente ANTES de ella)');
  const prom = t(es('sumar'), { op: 'lista', de: [{ a: ['q'] }, { v: 1 }] }, { nombre: 'tupla', parametros: { de: [{ nombre: 'suma' }, { nombre: 'suma' }] } }, { nombre: 'cociente' });
  assert.deepStrictEqual(P.responder(prom, Γ, O()).Y, [1, 2], 'promedio = Σ/n = 2/4');
  const kardex = t({ op: '=', de: [{ a: ['clave'] }, { v: 'a' }] }, { op: 'lista', de: [{ a: ['q'] }] }, { nombre: 'secuencia' }, { nombre: 'lista', parametros: { saldo: { op: 'si', de: [{ op: 'nulo?', de: [{ x: 'it' }] }, { v: 0 }, { x: 'it' }] } } });
  assert.deepStrictEqual(P.responder(kardex, Γ, O()).Y, [[3, 3], [null, 3], [-4, -1], [null, -1]], 'lista con saldos');
  const ma = t({ op: 'o', de: [es('fijar'), es('sumar')] }, { clave: { a: ['clave'] }, etiqueta: { op: 'si', de: [es('fijar'), { v: 'ult' }, { v: 'sum' }] }, valor: { op: 'si', de: [es('fijar'), { a: ['v'] }, { a: ['q'] }] } },
    { nombre: 'mapa', parametros: { etiquetas: { ult: { nombre: 'último' }, sum: { nombre: 'suma' } } } }, I);
  assert.equal(P.responder(ma, Γ, O()).Y, null, 'mapa: la clave a recibe dos etiquetas distintas ⇒ null (pregunta mal formada)');
  assert.deepStrictEqual(P.responder({ ...ma, φ: { op: '=', de: [{ a: ['clave'] }, { v: 'b' }] } }, Γ, O()).Y, { b: ['sum', 3] });
});
