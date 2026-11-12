// Kobalt — leyes de la regla de DOMINIO `kobalt.dominio@1` (fase 3: Forma + red de flujo) sobre el MODELO de referencia,
// montado en el NÚCLEO REAL. Spec: kobalt/specs/2026-11-11_fase3-forma-y-flujo.md (§6, §8, Anexo «un solo verbo»).
// Modelo: kobalt/tests/modelos/dominio.modelo.mjs. Oráculo de aceptación v2/v3: dominio.aceptacion.mjs (se registra aquí
// contra el modelo y en dominio.impl.test.mjs contra la implementación).
//
// Ejecutar:  node --test 'kobalt/tests/leyes/*.test.mjs'
// Variables: KOBALT_SEED (por defecto 20261112), KOBALT_CASOS_DOMINIO (por defecto 40),
//            KOBALT_DOMINIO_MODELO (ruta alternativa del modelo: así se ejecutan los mutantes sobre una COPIA temporal;
//            ver kobalt/tests/mutantes/dominio.mutantes.mjs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import * as C from './dominio.comun.mjs';
import { registrarAceptacion } from './dominio.aceptacion.mjs';

const RUTA = process.env.KOBALT_DOMINIO_MODELO ? pathToFileURL(process.env.KOBALT_DOMINIO_MODELO).href : new URL('../modelos/dominio.modelo.mjs', import.meta.url).href;
const M = await import(RUTA);
const N = C.N;
const R = M.REGISTRO;
const igual = isDeepStrictEqual;
const { SEMILLA, CASOS, S, proponer, nacer, fijar, añadir, disparar, lote, fijarParametro } = C;
const ok = (Γ, sol, msg) => C.comprometer(assert, Γ, sol, msg);

// ─────────── motor de propiedades con reducción por prefijo (Γ es un monoide libre) ───────────
const cache = new Map();
const generado = c => { if (!cache.has(c)) cache.set(c, C.generar(M, SEMILLA + c)); return cache.get(c); };
const prefijo = (gen, k) => { const sols = gen.sols.slice(0, k); return { ...gen, sols, ...C.reejecutar(R, gen.g, sols) }; };
function probar(prop, gen) { try { const r = prop(gen); return r === false ? 'la propiedad devolvió false' : null; } catch (e) { return e.message; } }
function paraTodo(nombre, prop, casos = CASOS) {
  test(nombre, () => {
    for (let c = 0; c < casos; c++) {
      const gen = generado(c);
      const err = probar(prop, gen);
      if (!err) continue;
      let k = 0;
      for (; k <= gen.sols.length; k++) if (probar(prop, prefijo(gen, k))) break;
      assert.fail(`${nombre}\n  semilla=${SEMILLA + c} (KOBALT_SEED=${SEMILLA}, caso ${c}, perfil ${gen.perfil})\n  error: ${err}\n  prefijo mínimo (k=${k}):\n  `
        + gen.sols.slice(0, k).map((s, j) => `${j + 1}. ${JSON.stringify(s)} → ${JSON.stringify(prefijo(gen, k).resultados[j])}`).join('\n  '));
    }
  });
}
const cuentaTodos = f => { let n = 0; for (let c = 0; c < CASOS; c++) n += f(generado(c)); return n; };

// ─────────── escenario dirigido común: bodega W, producto P (con variante v) ───────────
function base(C0extra = {}, streamId) {
  const Γ = C.cauce(R, C.genesisActores(M, { 'dominio.liberaciones': [], ...C0extra }, streamId));
  ok(Γ, nacer('dueño', 'bodega', { nombre: 'W' }));
  const W = [1, 0];
  ok(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'P', público: true, precio: 100 }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'S1', color: 'Azul' })));
  return { Γ, W, P: [2, 0], v: [2, 1] };
}
const venta = (Γ, modo, W, v, q, u = 'dueño', canal = 'POS', precio = 100) => {
  const n = ok(Γ, { u, ...M.plantillaVenta(modo, { variante: v, bodega: W, precio, canal }, q) });
  return [n, 0];
};
const disp = (Γ, W, v) => M.disponibilidad(S(Γ).D, S(Γ).parametros, W, v);

// ═════════════════════════ generador ═════════════════════════
test('generador: produce compromisos, NO_AUTORIZADO, INADMISIBLE(forma), rechazos de guarda (incl. marcado y G^par) y cambios de época', () => {
  const t = { COMPROMETIDO: 0, NO_AUTORIZADO: 0, forma: 0, guarda: 0, negativo: 0, gpar: 0, épocas: 0, lotes: 0 };
  for (let c = 0; c < CASOS; c++) {
    const g = generado(c);
    for (const r of g.resultados) {
      if (r.resultado === 'COMPROMETIDO') t.COMPROMETIDO++;
      else if (r.resultado === 'NO_AUTORIZADO') t.NO_AUTORIZADO++;
      else if (r.motivo === 'forma') t.forma++;
      else if (r.resultado === 'INADMISIBLE') { t.guarda++; if (r.motivo.startsWith('negativo:')) t.negativo++; if (/^(forma[A-Z]|red[A-Z]|κNo)/.test(r.motivo)) t.gpar++; }
    }
    t.épocas += S(g.Γ).epoca;
    t.lotes += g.Γ.entradas.filter(e => e.tipo === 'Lote').length;
  }
  for (const [k, v] of Object.entries(t)) assert.ok(v > 0, `el generador no produce «${k}» (la prueba estaría vacía): ${JSON.stringify(t)}`);
});

// ═════════════════════════ L3 / L4 · Fold, snapshots y épocas ═════════════════════════
paraTodo('L3 L4 el estado de dominio = Fold(Γ); snapshot + sufijo = Fold completo, también cruzando cambios de Φ y 𝒩', g => {
  const Γ = g.Γ, n = Γ.entradas.length;
  const S0 = N.estadoInicial(Γ.g, R);
  assert.deepEqual(N.fold(S0, Γ.entradas, R), S(Γ), 'Fold desde la génesis ≠ estado constituido');
  for (const k of [0, Math.floor(n / 3), Math.floor(n / 2), n]) {
    const snap = N.crearSnapshot(Γ.estados[k], Γ.hashes[k], R);
    const Sk = N.restaurarSnapshot(snap, Γ.hashes, R);
    assert.ok(Sk, `snapshot en ${k} no restaurable`);
    assert.deepEqual(N.fold(Sk, Γ.entradas.slice(k), R), S(Γ), `snapshot(${k}) + sufijo ≠ Fold`);
  }
  return true;
});
test('L3 L4 épocas: los cortes cruzan cambios de Φ y 𝒩 en alguna trayectoria generada', () => {
  const n = cuentaTodos(g => g.Γ.entradas.filter(e => e.tipo === 'FijarParámetro' && (e.args['dominio.forma'] || e.args['dominio.red'])).length);
  assert.ok(n > 0, 'ninguna trayectoria cambió la Forma o la Red');
});

// ═════════════════════════ L6 · VF1–VF10 en cada estado intermedio ═════════════════════════
paraTodo('L6 VF5–VF9 q_aud = ∅ en CADA estado intermedio (conservación por especie e invariantes de lugar declaradas)', g => {
  g.Γ.estados.forEach((St, k) => { const a = M.auditoria(St.D, St.parametros); assert.deepEqual(a, [], `S_${k}: fallan ${a.join(', ')}`); });
  const n = g.Γ.entradas.length;
  for (const m of [Math.floor(n / 2), n]) assert.deepEqual(C.consultar(g.Γ, M.PROYECCIONES.auditoria, m), [], `q_aud monoidal en ${m}`);
  return true;
});
paraTodo('L35 VF5 conservación por especie: ∀σ Σ_{f∈σ} m(f, ·) = 0 en cada estado', g => {
  for (const [k, St] of g.Γ.estados.entries()) {
    const sum = {};
    for (const [cl, n] of Object.entries(M.marcado(St.D))) { const e = St.parametros['dominio.red'].familias[M.parsearLugar(cl).f].especie; sum[e] = (sum[e] ?? 0) + n; }
    for (const [e, s] of Object.entries(sum)) assert.equal(s, 0, `S_${k}: especie ${e} suma ${s}`);
  }
  return true;
});
paraTodo('VF1 identidad por nacimiento: (i, j) ∈ ent ⇒ e_i es de dominio y hizo nacer ≥ j+1 entidades de ese tipo; sin repeticiones ni borrados', g => {
  const Γ = g.Γ;
  let previas = [];
  for (const [k, St] of Γ.estados.entries()) {
    const E = M.entidades(St.D);
    const claves = E.map(x => M.kid(x.id));
    assert.equal(new Set(claves).size, claves.length, `S_${k}: IDs repetidos`);
    for (const p of previas) assert.ok(claves.includes(p), `S_${k}: se borró ${p}`);
    for (const x of E) {
      const [i, j] = x.id;
      const ei = Γ.entradas[i - 1];
      assert.ok(ei && ei.clase === 'dominio', `ID ${M.kid(x.id)}: e_${i} no es de dominio`);
      const nac = M.nacimientos(ei, i);
      assert.ok(nac.length > j && nac[j].tipo === x.tipo, `ID ${M.kid(x.id)}: e_${i} no hizo nacer un ${x.tipo} en la posición ${j}`);
    }
    previas = claves;
  }
  return true;
});
paraTodo('VF2 L28 slots densos: T_n es prefijo de T_{n+1}; slots 1..N sin huecos en orden de nacimiento; q_T = coordenadas(D)', g => {
  let prev = [];
  for (const [k, St] of g.Γ.estados.entries()) {
    const T = M.coordenadas(St.D, St.parametros);
    assert.deepEqual(T.slice(0, prev.length), prev, `S_${k}: T no extiende a T anterior (slot reutilizado o reordenado)`);
    T.forEach((id, n) => assert.equal(M.slot(St.D, St.parametros, id), n + 1));
    prev = T;
  }
  assert.deepEqual(C.consultar(g.Γ, M.PROYECCIONES.T), prev, 'q_T (monoidal, sin estado) ≠ coordenadas(D)');
  return true;
});
paraTodo('VF3 referencias bien fundadas (destino declarado, existencia, cadena padre finita) y VF4 inmutables = valor de nacimiento', g => {
  const Γ = g.Γ, St = S(Γ), Φ = St.parametros['dominio.forma'];
  const E = M.entidades(St.D);
  const tipoDe = new Map(E.map(x => [M.kid(x.id), x.tipo]));
  for (const x of E) {
    const sec = M.seccionPropia(St.D, x.id);
    for (const [c, v] of Object.entries(sec)) {
      const d = M.declaracion(Φ, x.tipo, c);
      assert.ok(d, `${M.kid(x.id)}.${c} sin declaración vigente`);
      if (d.valor.ref) {
        assert.ok(tipoDe.has(M.kid(v)), `${M.kid(x.id)}.${c} → ${M.kid(v)} inexistente`);
        if (d.valor.ref !== '*') assert.equal(tipoDe.get(M.kid(v)), d.valor.ref, `${M.kid(x.id)}.${c}: destino`);
        if (d.inmutable) assert.ok(v[0] < x.id[0] || (v[0] === x.id[0] && v[1] < x.id[1]), `${M.kid(x.id)}.${c} → ${M.kid(v)} no nació antes`);
      }
      if (d.inmutable) {
        const [i] = x.id;
        const nacim = M.contribuciones(Γ.entradas[i - 1], i, Γ.estados[i - 1].parametros)[`${M.kid(x.id)}|${c}`];
        assert.deepEqual(v, nacim?.último, `VF4: ${M.kid(x.id)}.${c} cambió desde el nacimiento`);
      }
    }
    let p = x.padre, pasos = 0;
    while (p) { p = E.find(y => igual(y.id, p))?.padre ?? null; assert.ok(++pasos < 50, 'cadena padre infinita'); }
  }
  return true;
});
paraTodo('VF10 unicidad de κ entre las activas con valor explícito no vacío (en cada estado)', g => {
  for (const [k, St] of g.Γ.estados.entries()) {
    const Φ = St.parametros['dominio.forma'];
    for (const [τ, t] of Object.entries(Φ.tipos)) {
      if (!t.κ?.length) continue;
      const vistos = new Set();
      for (const x of M.entidades(St.D).filter(y => y.tipo === τ && M.activa(St.D, St.parametros, y.id))) {
        const sec = M.seccionPropia(St.D, x.id);
        const tupla = t.κ.map(c => sec[c]);
        if (tupla.some(y => y === undefined || y === '')) continue;
        const h = JSON.stringify(tupla);
        assert.ok(!vistos.has(h), `S_${k}: κ(${τ}) = ${h} repetida entre activas`);
        vistos.add(h);
      }
    }
  }
  return true;
});
paraTodo('L11 Déficit · D_no_asignada = 0 y D_prudente ≤ D_no_asignada ≤ H⁺ en cada estado y (w, v)', g => {
  for (const St of g.Γ.estados) {
    const B = M.entidades(St.D).filter(x => x.tipo === 'bodega').map(x => x.id), Vs = M.coordenadas(St.D, St.parametros);
    for (const w of B) for (const v of Vs) {
      const d = M.disponibilidad(St.D, St.parametros, w, v);
      assert.equal(d.déficit * d.noAsignada, 0);
      assert.ok(d.prudente <= d.noAsignada);
      assert.equal(d.H, d.libre + d.A, 'VF6 vista desde la disponibilidad');
    }
  }
  return true;
});

// ═════════════════════════ L7 · guardas ≠ invariantes ═════════════════════════
test('L7 libre < 0 es alcanzable y representable (Ingresar 5, Vender 5, Asignar 5, Contar 0); la guarda sigue bloqueando nuevas asignaciones', () => {
  const { Γ, W, v } = base();
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 5 }));
  const s = venta(Γ, 'venta.suave', W, v, 5);
  ok(Γ, disparar('dueño', 'Asignar', { s, q: 5 }));
  ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: 0 }));
  const d = disp(Γ, W, v);
  assert.deepEqual([d.H, d.A, d.libre, d.déficit, d.noAsignada], [0, 5, -5, 5, 0]);
  assert.deepEqual(M.auditoria(S(Γ).D, S(Γ).parametros), []);
  const s2 = venta(Γ, 'venta.suave', W, v, 1);
  assert.deepEqual(proponer(Γ, disparar('dueño', 'Asignar', { s: s2, q: 1 })), { resultado: 'INADMISIBLE', motivo: `negativo:libre[${M.kid(W)},${M.kid(v)}]` });
});
test('L7 H < 0 es alcanzable con la liberación del canal POS (Teorema 6.1 ⇒) y el mismo flujo por Web se rechaza', () => {
  const { Γ, W, v } = base({ 'dominio.liberaciones': M.LIBERACIONES_INICIAL });
  const s = venta(Γ, 'venta.inmediata', W, v, 1, 'dueño', 'POS');
  assert.ok(s);
  const d = disp(Γ, W, v);
  assert.deepEqual([d.H, d.libre, d.A], [-1, -1, 0]);
  assert.deepEqual(M.auditoria(S(Γ).D, S(Γ).parametros), [], 'el negativo es un descuadre visible, no un fallo de auditoría');
  const r = proponer(Γ, { u: 'dueño', ...M.plantillaVenta('venta.inmediata', { variante: v, bodega: W, precio: 100, canal: 'Web' }, 1) });
  assert.equal(r.resultado, 'INADMISIBLE');
  assert.match(r.motivo, /^negativo:(libre|H)\[/);
});
test('L7 P‑B P‑C un conteo físico SIEMPRE se admite (incluso confirmatorio o por debajo de A), y en las trayectorias generadas ningún Contar bien formado del propietario se rechaza', () => {
  const { Γ, W, v } = base();
  ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: 0 }), 'conteo confirmatorio (disparo nulo admitido)');
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 3 }));
  const s = venta(Γ, 'venta.firme', W, v, 3);
  assert.ok(s);
  ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: 1 }), 'conteo por debajo de lo asignado');
  let vistos = 0;
  for (let c = 0; c < CASOS; c++) {
    const g = generado(c);
    g.sols.forEach((sol, j) => {
      if (sol.tipo !== 'Disparar:Contar' || sol.u !== 'dueño') return;
      const St = g.Γ.estados[g.resultados.slice(0, j).filter(r => r.resultado === 'COMPROMETIDO').length];
      const E = M.entidades(St.D), es = (id, τ) => E.some(x => igual(x.id, id) && x.tipo === τ);
      if (!es(sol.args.w, 'bodega') || !es(sol.args.v, 'variante')) return;
      vistos++;
      assert.equal(g.resultados[j].resultado, 'COMPROMETIDO', `semilla ${SEMILLA + c}: conteo rechazado ${JSON.stringify(sol)} → ${JSON.stringify(g.resultados[j])}`);
    });
  }
  assert.ok(vistos > 0, 'el generador no propuso conteos válidos');
});

// ═════════════════════════ Teorema 6.1 ═════════════════════════
paraTodo('Teorema 6.1 (⇐) sin liberaciones en ninguna época, H ≥ 0 en todo estado (y toda familia restringida que Contar no baja)', g => {
  if (g.Γ.estados.some(St => (St.parametros['dominio.liberaciones'] ?? []).length > 0)) return true;
  for (const [k, St] of g.Γ.estados.entries()) {
    for (const [cl, n] of Object.entries(M.marcado(St.D))) {
      const f = M.parsearLugar(cl).f;
      if (f === 'libre') continue; // Contar (restricción: ninguna) baja libre: L7
      if (St.parametros['dominio.red'].familias[f].restringida) assert.ok(n >= 0, `S_${k}: ${cl} = ${n} < 0 sin ninguna liberación`);
    }
  }
  return true;
});
test('Teorema 6.1 (⇒) para cada transición que puede bajar H, si deja H sin restringir, dispararla desde H = 0 da H < 0', () => {
  const { Γ, W, v } = base();
  const W2 = [ok(Γ, nacer('dueño', 'bodega', { nombre: 'W2' })), 0];
  // Transferir.salida restringida ⇒ rechazada desde H = 0
  assert.match(proponer(Γ, disparar('dueño', 'Transferir.salida', { w: W, w2: W2, v, q: 1 })).motivo, /^negativo:H\[/);
  // misma Red con la restricción de Transferir.salida reducida a [tránsito] (H y libre liberados): dato, no código
  const red = structuredClone(S(Γ).parametros['dominio.red']);
  red.transiciones['Transferir.salida'].restricción = ['tránsito'];
  ok(Γ, fijarParametro('dueño', { 'dominio.red': red }));
  ok(Γ, disparar('dueño', 'Transferir.salida', { w: W, w2: W2, v, q: 1 }));
  assert.equal(disp(Γ, W, v).H, -1);
  // Despachar liberado por canal (liberaciones) ⇒ H < 0; Contar lo devuelve a h ≥ 0
  ok(Γ, fijarParametro('dueño', { 'dominio.liberaciones': [{ transiciones: ['Asignar', 'Despachar'], canal: 'POS', familias: ['libre', 'H'] }] }));
  venta(Γ, 'venta.inmediata', W, v, 2, 'dueño', 'POS');
  assert.equal(disp(Γ, W, v).H, -3);
  ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: 4 }));
  assert.equal(disp(Γ, W, v).H, 4);
  assert.deepEqual(M.auditoria(S(Γ).D, S(Γ).parametros), []);
});
test('Teorema 6.1 (⇒) en las trayectorias generadas con POS liberado aparece algún estado con H < 0 sin fallos de auditoría', () => {
  const n = cuentaTodos(g => g.Γ.estados.filter(St => Object.entries(M.marcado(St.D)).some(([cl, x]) => cl.startsWith('H[') && x < 0)).length);
  assert.ok(n > 0, 'ningún estado con H < 0: el generador no ejercita la liberación por canal');
});

// ═════════════════════════ L12 · tabla de efectos (sin doble descuento) ═════════════════════════
const PLANT = { 'venta.registro': { dH: 0, dA: 0, dP: 0, dP0: 1, dl: 0 }, 'venta.suave': { dH: 0, dA: 0, dP: 1, dP0: 0, dl: 0 },
  'venta.firme': { dH: 0, dA: 1, dP: 0, dP0: 0, dl: -1 }, 'venta.inmediata': { dH: -1, dA: 0, dP: 0, dP0: 0, dl: -1 } };
paraTodo('L12 L11 tabla de efectos sobre (H, A, P, P⁰, libre): Asignar no cambia D_prudente; Despachar no cambia libre ni P; Cancelar sube prudente cp+ca; plantillas v3', g => {
  const Γ = g.Γ;
  Γ.entradas.forEach((e, k) => {
    if (e.clase !== 'dominio') return;
    const S0 = Γ.estados[k], S1 = Γ.estados[k + 1], par = S0.parametros;
    const D = (St, w, v) => M.disponibilidad(St.D, par, w, v);
    const deltas = (w, v) => { const a = D(S0, w, v), b = D(S1, w, v); return { dH: b.H - a.H, dA: b.A - a.A, dP: b.P - a.P, dP0: b.P0 - a.P0, dl: b.libre - a.libre, a, b }; };
    const sale = s => [M.carac(S1.D, par, s, 'bodega'), M.carac(S1.D, par, s, 'variante')];
    if (e.tipo === 'Lote') {
      const ts = e.args.acciones.map(a => a.tipo);
      const nombre = Object.keys(M.PLANTILLAS).find(p => igual(ts, ['Nacer:venta', ...M.PLANTILLAS[p].map(t => `Disparar:${t}`)]));
      if (!nombre) return;
      const q = e.args.acciones[1].args.q;
      const [w, v] = sale([k + 1, 0]);
      const dd = deltas(w, v), esp = PLANT[nombre];
      for (const c of ['dH', 'dA', 'dP', 'dP0', 'dl']) assert.equal(dd[c], esp[c] * q, `${nombre}(q=${q}) en e_${k + 1}: ${c}`);
      return;
    }
    const t = e.tipo.startsWith('Disparar:') ? e.tipo.slice(9) : null;
    if (!t) return;
    const a = e.args;
    if (['Asignar', 'Asignar.registro', 'Despachar', 'Cancelar'].includes(t)) {
      const [w, v] = sale(a.s);
      const dd = deltas(w, v);
      if (t === 'Asignar') { assert.deepEqual([dd.dl, dd.dP, dd.dA], [-a.q, -a.q, a.q], `Asignar e_${k + 1}`); assert.equal(dd.dl - dd.dP, 0, 'L12: D_prudente cambió al asignar (doble descuento)'); }
      if (t === 'Asignar.registro') assert.deepEqual([dd.dl, dd.dP, dd.dP0, dd.dA], [-a.q, 0, -a.q, a.q], `Asignar.registro e_${k + 1}`);
      if (t === 'Despachar') assert.deepEqual([dd.dl, dd.dP, dd.dH, dd.dA], [0, 0, -a.q, -a.q], `Despachar e_${k + 1}`);
      if (t === 'Cancelar') {
        const mk = (St, f) => M.valorLugar(St.D, f, [a.s]);
        const cp = mk(S0, 'pend'), ca = mk(S0, 'asig');
        assert.deepEqual([dd.dP, dd.dl, dd.dA, dd.dl - dd.dP], [0 - cp, ca, 0 - ca, cp + ca], `Cancelar e_${k + 1}`);
      }
    }
    if (t === 'Ingresar') { const dd = deltas(a.w, a.v); assert.deepEqual([dd.dH, dd.dl, dd.dA, dd.dP], [a.q, a.q, 0, 0]); }
    if (t === 'Contar') { const dd = deltas(a.w, a.v); assert.deepEqual([dd.b.H, dd.dl, dd.dA, dd.dP], [a.h, a.h - dd.a.H, 0, 0]); }
  });
  return true;
});
paraTodo('L12 D_prudente = max(0, libre − P) = max(0, H − A − P) con A = Σ asig de las ventas (libro tradicional), en cada estado', g => {
  for (const St of g.Γ.estados) {
    const E = M.entidades(St.D), par = St.parametros;
    for (const w of E.filter(x => x.tipo === 'bodega').map(x => x.id)) for (const v of M.coordenadas(St.D, par)) {
      const d = M.disponibilidad(St.D, par, w, v);
      const ventas = E.filter(x => x.tipo === 'venta' && igual(M.carac(St.D, par, x.id, 'bodega'), w) && igual(M.carac(St.D, par, x.id, 'variante'), v));
      const A = ventas.reduce((t, x) => t + M.valorLugar(St.D, 'asig', [x.id]), 0);
      assert.equal(d.A, A, 'VF7');
      assert.equal(d.prudente, Math.max(0, d.H - A - d.P));
    }
  }
  return true;
});

// ═════════════════════════ L16 · autoridad ═════════════════════════
test('L16 E3 E4 capacidades finas, lotes, coherencia del tipo y alcance propio', () => {
  const { Γ, W, P, v } = base();
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 10 }));
  assert.equal(proponer(Γ, disparar('U1', 'Contar', { w: W, v, h: 999 })).resultado, 'NO_AUTORIZADO', 'vendedor no cuenta');
  const sU = venta(Γ, 'venta.suave', W, v, 1, 'U1', 'Web');
  assert.equal(proponer(Γ, disparar('U1', 'Asignar', { s: sU, q: 1 })).resultado, 'NO_AUTORIZADO', 'vendedor no asigna');
  assert.equal(proponer(Γ, lote('U1', disparar('U1', 'Cobrar', { s: sU, x: 1 }), disparar('U1', 'Contar', { w: W, v, h: 0 }))).resultado, 'NO_AUTORIZADO', 'E4: Contar colado en un lote');
  assert.equal(proponer(Γ, { u: 'U1', ...M.plantillaVenta('venta.firme', { variante: v, bodega: W, precio: 100, canal: 'Web' }, 1) }).resultado, 'NO_AUTORIZADO', 'E4: venta firme del vendedor');
  assert.deepEqual(proponer(Γ, fijar('dueño', 'variante', 'nombre', P, 'X')), { resultado: 'INADMISIBLE', motivo: 'tipoIncoherente' });
  assert.deepEqual(proponer(Γ, fijar('U1', 'producto', 'nombre', P, 'X')), { resultado: 'INADMISIBLE', motivo: 'ajeno' }, 'alcance propio: el producto es del propietario');
  const sD = venta(Γ, 'venta.suave', W, v, 1, 'dueño');
  assert.deepEqual(proponer(Γ, disparar('caja', 'Asignar', { s: sD, q: 1 })), { resultado: 'INADMISIBLE', motivo: 'ajeno' }, 'cajero sobre venta ajena');
  const sC = venta(Γ, 'venta.inmediata', W, v, 2, 'caja', 'POS');
  assert.ok(sC, 'P‑E: el cajero vende en el POS (lote Nacer:venta + Vender + Asignar + Despachar) sobre su propia venta');
  assert.equal(proponer(Γ, disparar('lector', 'Ingresar', { w: W, v, q: 1 })).resultado, 'NO_AUTORIZADO');
  assert.equal(proponer(Γ, disparar('intruso', 'Ingresar', { w: W, v, q: 1 })).resultado, 'NO_AUTORIZADO');
  // vendedor: alta propia (producto + variante) y edición propia sí; variante sobre producto ajeno no
  const nP = ok(Γ, lote('U1', nacer('U1', 'producto', { nombre: 'Mío', público: false }), nacer('U1', 'variante', { producto: { nacido: 0 }, sku: 'U1-1' })));
  ok(Γ, fijar('U1', 'producto', 'nombre', [nP, 0], 'Mío 2'));
  assert.deepEqual(proponer(Γ, nacer('U1', 'variante', { producto: P, sku: 'U1-2' })), { resultado: 'INADMISIBLE', motivo: 'ajeno' });
});
test('L16 alcance propio falla CERRADO: una transición sin objetivo (Ingresar, Contar) con capacidad y alcance «Disparar:*» ⇒ ajeno', () => {
  const { Γ, W, v } = base({ 'nucleo.capacidades': { 'dueño': ['*'], repo: ['Disparar:Ingresar', 'Disparar:Contar'] }, 'dominio.alcancePropio': { repo: ['Disparar:*'] } });
  assert.deepEqual(proponer(Γ, disparar('repo', 'Ingresar', { w: W, v, q: 1 })), { resultado: 'INADMISIBLE', motivo: 'ajeno' });
  assert.deepEqual(proponer(Γ, disparar('repo', 'Contar', { w: W, v, h: 0 })), { resultado: 'INADMISIBLE', motivo: 'ajeno' });
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 1 }));
});

// ═════════════════════════ L1 / L2 / L17 · secciones, columnas, fibras, ficha ═════════════════════════
paraTodo('L1 Reconstruct(secciones) = Reconstruct(columnas) = R sobre q_cat', g => {
  const secs = C.consultar(g.Γ, M.PROYECCIONES.catalogo);
  const Rset = new Set(), porColumna = {};
  for (const [ik, s] of Object.entries(secs)) for (const [c, v] of Object.entries(s.propia)) { Rset.add(JSON.stringify([ik, c, v])); (porColumna[c] ??= []).push([ik, v]); }
  const desdeColumnas = new Set();
  for (const [c, col] of Object.entries(porColumna)) for (const [ik, v] of col) desdeColumnas.add(JSON.stringify([ik, c, v]));
  assert.deepEqual([...desdeColumnas].sort(), [...Rset].sort());
  const desdeD = new Set();
  for (const x of M.entidades(S(g.Γ).D)) for (const [c, v] of Object.entries(M.seccionPropia(S(g.Γ).D, x.id))) desdeD.add(JSON.stringify([M.kid(x.id), c, v]));
  assert.deepEqual([...desdeD].sort(), [...Rset].sort(), 'R desde el estado ≠ R desde q_cat');
  return true;
});
paraTodo('L2 fibras: álgebra booleana; F_v disjuntas y su unión = conocidos; complemento relativo a los conocidos (nunca incluye «desconocido»)', g => {
  const St = S(g.Γ), par = St.parametros;
  const Fs = ['Azul', 'Rojo', 'Verde'].map(c => M.fibra(St.D, par, 'color', c));
  const conocidos = Fs[0].conocidos.map(M.kid);
  const todas = Fs.flatMap(F => F.miembros.map(M.kid));
  assert.equal(new Set(todas).size, todas.length, 'fibras de valores distintos se solapan');
  assert.deepEqual([...todas].sort(), [...conocidos].sort(), '∪ F_v ≠ conocidos');
  const comp = M.complemento(Fs[0]).map(M.kid).sort();
  assert.deepEqual(comp, Fs.slice(1).flatMap(F => F.miembros.map(M.kid)).sort(), 'complemento ≠ unión de las demás fibras');
  const desconocidos = M.coordenadas(St.D, par).map(M.kid).filter(k => !conocidos.includes(k));
  for (const k of desconocidos) assert.ok(!comp.includes(k), `el complemento incluye ${k}, de color desconocido`);
  const viaPi = C.consultar(g.Γ, M.PROYECCIONES.fibra('color', 'Azul'));
  assert.deepEqual(viaPi, Fs[0], 'q_fibra monoidal ≠ fibra sobre el estado');
  return true;
});
test('L2 caso dirigido: una variante sin color no está en F_Azul ni en su complemento', () => {
  const { Γ, P } = base();
  ok(Γ, nacer('dueño', 'variante', { producto: P, sku: 'S2' }));
  const F = M.fibra(S(Γ).D, S(Γ).parametros, 'color', 'Azul');
  assert.deepEqual(F.miembros, [[2, 1]]);
  assert.deepEqual(M.complemento(F), []);
  assert.deepEqual(F.conocidos, [[2, 1]]);
});
test('L17 la ficha es composición en obs: cambia con un Fijar del producto (herencia) sin compromiso sobre la variante; leer no escribe', () => {
  const { Γ, P, v } = base();
  const n0 = Γ.entradas.length;
  const f0 = M.ficha(S(Γ).D, S(Γ).parametros, v);
  assert.equal(f0.efectiva.precio, 100);
  assert.equal(f0.efectiva.nombre, 'P');
  const congelar = o => { if (o && typeof o === 'object') { Object.freeze(o); Object.values(o).forEach(congelar); } return o; };
  const St = congelar(structuredClone(S(Γ)));
  for (const f of [() => M.ficha(St.D, St.parametros, v), () => M.fibra(St.D, St.parametros, 'color', 'Azul'), () => M.disponibilidad(St.D, St.parametros, [1, 0], v),
    () => M.auditoria(St.D, St.parametros), () => M.secciones(St.D), () => M.coordenadas(St.D, St.parametros), () => M.carac(St.D, St.parametros, v, 'precio')]) f();
  assert.equal(Γ.entradas.length, n0, 'leer produjo compromisos');
  ok(Γ, fijar('dueño', 'producto', 'precio', P, 150));
  assert.equal(M.ficha(S(Γ).D, S(Γ).parametros, v).efectiva.precio, 150);
  assert.deepEqual(M.seccionPropia(S(Γ).D, v), M.seccionPropia(Γ.estados[n0].D, v), 'la sección propia de la variante no cambia');
  // orientación (L17): el mismo cambio desde la ficha o desde la columna es la misma entrada
  const a = fijar('dueño', 'variante', 'color', v, 'Rojo'), b = fijar('dueño', 'variante', 'color', [2, 1], 'Rojo');
  assert.equal(Buffer.from(N.encEntrada({ epoca: 0, u: a.u, sid: '01', deps: [], clase: 'dominio', tipo: a.tipo, args: a.args })).toString('hex'),
    Buffer.from(N.encEntrada({ epoca: 0, u: b.u, sid: '01', deps: [], clase: 'dominio', tipo: b.tipo, args: b.args })).toString('hex'));
});

// ═════════════════════════ L9 / L33 · incremental = reconstrucción ═════════════════════════
paraTodo('L9 L33 V10 resolverProyeccion (ACTUALIZAR desde cualquier checkpoint) = RECONSTRUIR para T, catálogo, marcado, auditoría, Flat, disponibilidad y fibra', g => {
  const Γ = g.Γ, n = Γ.entradas.length;
  const B = M.entidades(S(Γ).D).filter(x => x.tipo === 'bodega').map(x => x.id);
  const V0 = M.coordenadas(S(Γ).D, S(Γ).parametros)[0] ?? [2, 1];
  const proys = [M.PROYECCIONES.T, M.PROYECCIONES.catalogo, M.PROYECCIONES.marcado, M.PROYECCIONES.auditoria, ...B.map(w => M.PROYECCIONES.flat(w)),
    ...(B.length ? [M.PROYECCIONES.disponibilidad(B[0], V0)] : []), M.PROYECCIONES.fibra('color', 'Azul')];
  const cortes = [...new Set([0, Math.floor(n / 3), n - 1, n].filter(x => x >= 0))];
  for (const proy of proys) {
    const rec = new Map(cortes.map(k => [k, C.resolverP(Γ, proy, k)])); // RECONSTRUIR desde la génesis (oráculo)
    for (const c of cortes) for (const m of cortes) {
      if (c >= m) continue;
      const g0 = rec.get(c), r = rec.get(m);
      const inc = C.resolverP(Γ, proy, m, { acum: g0.acum, checkpoint: g0.checkpoint });
      assert.equal(inc.accion, 'ACTUALIZAR', `${proy.id} ${c}→${m}`);
      assert.deepEqual(inc.acum, r.acum, `${proy.id}: acum incremental ${c}→${m} ≠ reconstruido`);
      assert.deepEqual(inc.Y, r.Y, `${proy.id}: Y incremental ${c}→${m} ≠ reconstruido`);
    }
    const r = rec.get(n);
    assert.equal(C.resolverP(Γ, proy, n, { acum: r.acum, checkpoint: r.checkpoint }).accion, 'REUTILIZAR');
  }
  // y cada pregunta coincide con su lectura directa sobre S_n
  const St = S(Γ), par = St.parametros;
  assert.deepEqual(C.consultar(Γ, M.PROYECCIONES.catalogo), M.seccionesCanonicas(St.D), 'q_cat ≠ secciones propias de D');
  assert.deepEqual(C.consultar(Γ, M.PROYECCIONES.marcado), M.marcado(St.D), 'Π_marcado ≠ m');
  for (const w of B) {
    const fl = C.consultar(Γ, M.PROYECCIONES.flat(w));
    assert.deepEqual(fl.T, M.coordenadas(St.D, par));
    assert.deepEqual(fl.valores, fl.T.map(v => M.valorLugar(St.D, 'H', [w, v])), 'q_flat ≠ H[w, ·]');
    if (B.length) assert.deepEqual(C.consultar(Γ, M.PROYECCIONES.disponibilidad(w, V0)), M.disponibilidad(St.D, par, w, V0));
  }
  return true;
}, Math.min(CASOS, 20));
test('L33 clases = monoides: asociatividad y unidad de PRODUCTO por clase; aplicar es una acción (aplicar(aplicar(D,δ₁),δ₂) = aplicar(D, δ₁·δ₂))', () => {
  const r = C.prng(SEMILLA ^ 0x5eed);
  const gen = {
    val: () => ({ '=': C.elegir(r, [null, 1, 2, 'a']) }),
    conj: () => { const ks = ['x', 'y', 'z']; const A = {}, Q = {}; for (const k of ks) { const t = r(); if (t < 0.3) A[k] = k + C.entero(r, 0, 2); else if (t < 0.5) Q[k] = k; } return { A, Q }; },
    m: () => (r() < 0.7 ? { '+': C.entero(r, -3, 3) } : { '=': C.entero(r, -2, 5) }),
  };
  for (const [clase, g] of Object.entries(gen)) {
    for (let i = 0; i < 2000; i++) {
      const [a, b, c] = [g(), g(), g()];
      assert.deepEqual(M.PRODUCTO[clase](M.PRODUCTO[clase](a, b), c), M.PRODUCTO[clase](a, M.PRODUCTO[clase](b, c)), `asociatividad de ${clase}`);
    }
  }
  // acción sobre estados reales: δ de dos entradas consecutivas compuestas = aplicarlas en orden
  let pares = 0;
  for (let c = 0; c < Math.min(CASOS, 15); c++) {
    const Γ = generado(c).Γ;
    for (let k = 0; k + 1 < Γ.entradas.length; k++) {
      const [e1, e2] = [Γ.entradas[k], Γ.entradas[k + 1]];
      if (e1.clase !== 'dominio' || e2.clase !== 'dominio') continue;
      const S0 = Γ.estados[k];
      const d1 = M.compilar(S0.D, e1, S0.parametros).δ, d2 = M.compilar(Γ.estados[k + 1].D, e2, S0.parametros).δ;
      const un = M.aplicar(M.aplicar(S0.D, d1), d2), dos = M.aplicar(S0.D, M.componer(d1, d2));
      assert.deepEqual({ ...dos, nd: 0 }, { ...un, nd: 0 });
      assert.deepEqual({ ...dos, nd: 0 }, { ...Γ.estados[k + 2].D, nd: 0 });
      pares++;
    }
  }
  assert.ok(pares > 50);
});
test('Anexo «un solo verbo» Teorema 4: +(−1) y =9 son elementos distintos de M_depósito (misma imagen desde 10, distinta composición: no hay actualización perdida)', () => {
  const D = { ...M.D0, m: { 'H[1.0,2.1]': 10 } };
  const menos = { 'm|H[1.0,2.1]': { '+': -1 } }, fija = { 'm|H[1.0,2.1]': { '=': 9 } };
  assert.deepEqual(M.aplicar(D, menos).m, M.aplicar(D, fija).m);
  assert.equal(M.aplicar(D, M.componer(menos, menos)).m['H[1.0,2.1]'], 8, 'dos ventas concurrentes +(−1)·+(−1) ⇒ 8');
  assert.equal(M.aplicar(D, M.componer(fija, fija)).m['H[1.0,2.1]'], 9, '«=9»·«=9» ⇒ 9 (la intención se perdió)');
});

// ═════════════════════════ L10 · congruencia ═════════════════════════
test('L10 la sección EFECTIVA no es congruente (contraejemplo §7.2); la propia + herencia en obs sí (incremental = reconstruido)', () => {
  const { Γ, W, P } = base();
  const Φ2 = structuredClone(S(Γ).parametros['dominio.forma']);
  Φ2.tipos.producto.características.color = { clase: 'asignación', valor: { texto: [0, 100] }, heredable: true };
  ok(Γ, fijarParametro('dueño', { 'dominio.forma': Φ2 }), 'característica nueva = dato');
  ok(Γ, fijar('dueño', 'producto', 'color', P, 'Azul'));
  const b = [ok(Γ, nacer('dueño', 'variante', { producto: P, sku: 'S2' })), 0];
  const a = [2, 1]; // color Azul explícito
  const efe = id => M.carac(S(Γ).D, S(Γ).parametros, id, 'color');
  assert.deepEqual([efe(a), efe(b)], ['Azul', 'Azul'], 'misma sección efectiva');
  const n = Γ.entradas.length;
  const guardado = C.resolverP(Γ, M.PROYECCIONES.catalogo, n);
  ok(Γ, fijar('dueño', 'producto', 'color', P, 'Rojo'));
  assert.deepEqual([efe(a), efe(b)], ['Azul', 'Rojo'], 'tras Fijar(producto, color, Rojo) divergen: la efectiva no es congruente');
  const inc = C.resolverP(Γ, M.PROYECCIONES.catalogo, n + 1, { acum: guardado.acum, checkpoint: guardado.checkpoint });
  assert.equal(inc.accion, 'ACTUALIZAR');
  assert.deepEqual(inc.Y, C.consultar(Γ, M.PROYECCIONES.catalogo));
  assert.ok(W);
});
test('L10 max(0, libre) no es congruente: dos estados con D_no_asignada = 0 divergen tras Ingresar 1 (por eso vive en obs)', () => {
  const { Γ, W, v } = base();
  const Γ2 = C.bifurcar(Γ);
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 1 }));
  const s = venta(Γ, 'venta.firme', W, v, 1); ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: 0 })); // libre = −1
  assert.ok(s);
  assert.equal(disp(Γ, W, v).noAsignada, 0); assert.equal(disp(Γ2, W, v).noAsignada, 0);
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 1 })); ok(Γ2, disparar('dueño', 'Ingresar', { w: W, v, q: 1 }));
  assert.notEqual(disp(Γ, W, v).noAsignada, disp(Γ2, W, v).noAsignada);
});

// ═════════════════════════ L26 / L28 / L29 · identidad, slots y Flat ═════════════════════════
test('L26 ID (i,j) ≠ slot ≠ SKU: corregir el SKU no cambia ni el slot ni el ID; el mismo (i,j) en dos Γ no designa la misma entidad (L25)', () => {
  const { Γ, v } = base();
  const antes = { slot: M.slot(S(Γ).D, S(Γ).parametros, v), ids: M.entidades(S(Γ).D).map(x => M.kid(x.id)) };
  ok(Γ, fijar('dueño', 'variante', 'sku', v, 'S1-corregido'));
  assert.equal(M.slot(S(Γ).D, S(Γ).parametros, v), antes.slot);
  assert.deepEqual(M.entidades(S(Γ).D).map(x => M.kid(x.id)), antes.ids);
  const Γb = C.cauce(R, C.genesis(M, {}, C.STREAM_B));
  ok(Γb, nacer('dueño', 'cliente', { nombre: 'Otro' }));
  assert.equal(M.entidades(S(Γb).D)[0].tipo, 'cliente');
  assert.equal(M.entidades(S(Γ).D)[0].tipo, 'bodega');
  const hechos = Γx => Object.fromEntries(M.entidades(S(Γx).D).map(x => [`${Γx.streamId}/${M.kid(x.id)}`, x.tipo]));
  const r = N.componer([{ streamId: Γ.streamId, hechos: hechos(Γ) }, { streamId: Γb.streamId, hechos: hechos(Γb) }]);
  assert.equal(r.resultado, 'COMPUESTO', 'la identidad es (StreamID, i, j)');
  assert.notEqual(r.hechos[`${C.STREAM_A}/1.0`].valor, r.hechos[`${C.STREAM_B}/1.0`].valor);
});
test('L28 un lote rechazado no consume posición, ID ni slot; la siguiente variante toma el slot |T|+1', () => {
  const { Γ, W, P } = base();
  const n = Γ.entradas.length, T0 = M.coordenadas(S(Γ).D, S(Γ).parametros);
  const r = proponer(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'Q', público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'X' }),
    disparar('dueño', 'Contar', { w: W, v: [99, 0], h: 10 })));
  assert.deepEqual(r, { resultado: 'INADMISIBLE', motivo: 'referenciaInexistente' });
  assert.equal(Γ.entradas.length, n);
  assert.deepEqual(M.coordenadas(S(Γ).D, S(Γ).parametros), T0);
  const k = ok(Γ, nacer('dueño', 'variante', { producto: P, sku: 'Y' }));
  assert.equal(M.slot(S(Γ).D, S(Γ).parametros, [k, 0]), T0.length + 1);
  assert.equal(k, n + 1, 'i = posición de la entrada de nacimiento');
});
paraTodo('L28 en las trayectorias generadas ningún rechazo cambia T ni el estado', g => {
  let k = 0;
  g.resultados.forEach(r => { if (r.resultado === 'COMPROMETIDO') k++; });
  assert.equal(k, g.Γ.entradas.length);
  return true;
});
test('L29 Flat construido en T_n sigue valiendo en T_m sin reescribirse; una variante nueva vale 0 sin ninguna acción de existencias', () => {
  const { Γ, W, P, v } = base();
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 7 }));
  const n = Γ.entradas.length;
  const f1 = C.resolverP(Γ, M.PROYECCIONES.flat(W), n);
  assert.deepEqual(f1.Y.valores, [7]);
  ok(Γ, nacer('dueño', 'variante', { producto: P, sku: 'N1' }));
  ok(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'Q', público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'N2' })));
  const f2 = C.resolverP(Γ, M.PROYECCIONES.flat(W), Γ.entradas.length, { acum: f1.acum, checkpoint: f1.checkpoint });
  assert.equal(f2.accion, 'ACTUALIZAR');
  assert.deepEqual(f2.acum, f1.acum, 'altas sin existencias no cambian lo guardado');
  assert.deepEqual(f2.Y.valores, [7, 0, 0]);
  assert.deepEqual(f2.Y.valores.slice(0, f1.Y.valores.length), f1.Y.valores);
});

// ═════════════════════════ L35 · «dato, no código» ═════════════════════════
test('L35 transición nueva = dato: Transferir añadida en una época posterior por FijarParámetro, sin código; la historia no se reinterpreta', () => {
  const red0 = structuredClone(M.RED_INICIAL);
  delete red0.transiciones['Transferir.salida']; delete red0.transiciones['Transferir.llegada']; delete red0.familias.tránsito;
  const { Γ, W, v } = base({ 'dominio.red': red0 });
  const W2 = [ok(Γ, nacer('dueño', 'bodega', { nombre: 'W2' })), 0];
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 5 }));
  assert.deepEqual(proponer(Γ, disparar('dueño', 'Transferir.salida', { w: W, w2: W2, v, q: 2 })), { resultado: 'INADMISIBLE', motivo: 'transiciónDesconocida' });
  const n = Γ.entradas.length, Sn = S(Γ);
  ok(Γ, fijarParametro('dueño', { 'dominio.red': structuredClone(M.RED_INICIAL) }));
  ok(Γ, disparar('dueño', 'Transferir.salida', { w: W, w2: W2, v, q: 2 }));
  assert.deepEqual([disp(Γ, W, v).H, M.valorLugar(S(Γ).D, 'tránsito', [W, W2, v]), disp(Γ, W2, v).H], [3, 2, 0], 'tránsito visible');
  ok(Γ, disparar('dueño', 'Transferir.llegada', { w: W, w2: W2, v, q: 2 }));
  assert.deepEqual([disp(Γ, W, v).H, M.valorLugar(S(Γ).D, 'tránsito', [W, W2, v]), disp(Γ, W2, v).H, disp(Γ, W2, v).libre], [3, 0, 2, 2]);
  assert.deepEqual(M.auditoria(S(Γ).D, S(Γ).parametros), []);
  assert.deepEqual(N.fold(N.estadoInicial(Γ.g, R), Γ.entradas.slice(0, n), R), Sn, 'el prefijo anterior a la época se interpreta igual');
});
test('L35 depósito, transición, característica y tipo nuevos = dato (nombres que ningún código conoce)', () => {
  const { Γ, W, P, v } = base();
  const red = structuredClone(S(Γ).parametros['dominio.red']);
  red.familias.consignado = { especie: 'U', índices: ['bodega', 'variante'], restringida: true };
  const w = { a: ['w'] }, vv = { a: ['v'] }, q = { a: ['q'] };
  red.transiciones.Consignar = { args: { w: { ref: 'bodega' }, v: { ref: 'variante' }, q: { entero: [1, 100] } }, nulo: 'rechazar', restricción: 'todas',
    movimientos: [{ desde: ['H', w, vv], hacia: ['consignado', w, vv], cantidad: q }, { desde: ['libre', w, vv], hacia: ['ext.L'], cantidad: q }] };
  const Φ = C.formaExtendida(S(Γ).parametros['dominio.forma']);
  ok(Γ, fijarParametro('dueño', { 'dominio.red': red, 'dominio.forma': Φ }));
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 4 }));
  ok(Γ, disparar('dueño', 'Consignar', { w: W, v, q: 3 }));
  assert.match(proponer(Γ, disparar('dueño', 'Consignar', { w: W, v, q: 2 })).motivo, /^negativo:H\[/, 'la guarda universal aplica a la transición nueva');
  assert.equal(M.valorLugar(S(Γ).D, 'consignado', [W, v]), 3);
  ok(Γ, fijar('dueño', 'producto', 'material', P, 'Algodón'));
  assert.equal(M.carac(S(Γ).D, S(Γ).parametros, v, 'material'), 'Algodón', 'característica nueva heredable');
  ok(Γ, nacer('dueño', 'proveedor', { nombre: 'Prov' }));
  assert.deepEqual(M.auditoria(S(Γ).D, S(Γ).parametros), []);
});
test('L35 la semántica de una transición sale de la Red vigente: liberar libre en Asignar (época posterior) cambia el efecto; antes se rechaza', () => {
  const { Γ, W, v } = base();
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 1 }));
  const s = venta(Γ, 'venta.suave', W, v, 3);
  assert.match(proponer(Γ, disparar('dueño', 'Asignar', { s, q: 3 })).motivo, /^negativo:libre\[/);
  const red = structuredClone(S(Γ).parametros['dominio.red']);
  red.transiciones.Asignar.restricción = ['pend'];
  ok(Γ, fijarParametro('dueño', { 'dominio.red': red }));
  ok(Γ, disparar('dueño', 'Asignar', { s, q: 3 }));
  assert.deepEqual([disp(Γ, W, v).libre, disp(Γ, W, v).A], [-2, 3]);
  // y la Red también define los movimientos: una Asignar que además mueve 1 unidad simbólica a un depósito nuevo
  const red2 = structuredClone(red);
  red2.familias.marca = { especie: 'D', índices: ['venta'], restringida: false };
  red2.transiciones.Asignar.movimientos.push({ desde: ['ext.D'], hacia: ['marca', { a: ['s'] }], cantidad: { v: 1 } });
  ok(Γ, fijarParametro('dueño', { 'dominio.red': red2 }));
  const s2 = venta(Γ, 'venta.suave', W, v, 1);
  ok(Γ, disparar('dueño', 'Asignar', { s: s2, q: 1 }));
  assert.equal(M.valorLugar(S(Γ).D, 'marca', [s2]), 1);
});
test('L35 Teorema 5.2: cada validación de cantidad de la v2 es «un lugar restringido no baja de 0» (motivo = el lugar)', () => {
  const { Γ, W, v } = base();
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 2 }));
  const s = venta(Γ, 'venta.suave', W, v, 2);
  const K = x => M.kid(x);
  assert.equal(proponer(Γ, disparar('dueño', 'Asignar', { s, q: 3 })).motivo, `negativo:pend[${K(s)}]`);
  assert.equal(proponer(Γ, disparar('dueño', 'Despachar', { s, q: 1 })).motivo, `negativo:asig[${K(s)}]`);
  assert.equal(proponer(Γ, disparar('dueño', 'Cobrar', { s, x: 201 })).motivo, `negativo:porCobrar[${K(s)}]`);
  const s3 = venta(Γ, 'venta.suave', W, v, 5);
  assert.equal(proponer(Γ, disparar('dueño', 'Asignar', { s: s3, q: 3 })).motivo, `negativo:libre[${K(W)},${K(v)}]`);
  const r = proponer(Γ, lote('dueño', nacer('dueño', 'devolución', { venta: s }), disparar('dueño', 'Devolver', { d: { nacido: 0 }, q: 1 })));
  assert.equal(r.motivo, `negativo:desp[${K(s)}]`);
});

// ═════════════════════════ L31 · configuración y G^par ═════════════════════════
test('L31 todos los parámetros de dominio tienen dominio y valor inicial dentro de él', () => {
  for (const [p, s] of Object.entries(M.SIGMA)) { assert.equal(typeof s.dominio, 'function', p); assert.ok(s.dominio(structuredClone(s.inicial)), `${p}: inicial fuera de dominio`); }
  for (const p of ['dominio.forma', 'dominio.red', 'dominio.liberaciones', 'dominio.alcancePropio', 'dominio.propietarios', 'dominio.lote', 'dominio.conjunto']) assert.ok(Object.hasOwn(M.SIGMA, p), `falta ${p}`);
});
test('L31 G^par rechaza quitar una característica con valores, cambiar su clase o tipo de valor, relajar inmutable, quitar un tipo, κ no única, mover entre especies y quitar o cambiar de especie una familia con marcado', () => {
  const { Γ, W, v } = base();
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 1 }));
  ok(Γ, nacer('dueño', 'variante', { producto: [2, 0], sku: 'S1x', color: 'Azul' }));
  const Φ = () => structuredClone(S(Γ).parametros['dominio.forma']), 𝒩 = () => structuredClone(S(Γ).parametros['dominio.red']);
  const rechaza = (m, motivo) => assert.deepEqual(proponer(Γ, fijarParametro('dueño', m)), { resultado: 'INADMISIBLE', motivo }, motivo);
  rechaza({ 'dominio.forma': C.formaSinColor(Φ()) }, 'formaQuitaCaracterística');
  { const F = Φ(); F.tipos.variante.características.color.clase = 'ciclo'; F.tipos.variante.características.color.ciclo = { estados: ['Azul'], inicial: 'Azul', transiciones: [] }; rechaza({ 'dominio.forma': F }, 'formaCambiaClase'); }
  { const F = Φ(); F.tipos.variante.características.color.valor = { texto: [0, 5] }; rechaza({ 'dominio.forma': F }, 'formaCambiaValor'); }
  { const F = Φ(); delete F.tipos.venta.características.precio.inmutable; rechaza({ 'dominio.forma': F }, 'formaRelajaInmutable'); }
  { const F = Φ(); delete F.tipos.cliente; rechaza({ 'dominio.forma': F }, 'formaQuitaTipo'); }
  { const F = Φ(); F.tipos.variante.κ = ['color']; rechaza({ 'dominio.forma': F }, 'κNoÚnica'); }
  rechaza({ 'dominio.red': C.redInterEspecie(𝒩()) }, 'redInterEspecie');
  { const Rd = 𝒩(); delete Rd.familias.H; rechaza({ 'dominio.red': Rd }, 'redQuitaFamilia'); }
  { const Rd = 𝒩(); Rd.familias.H.especie = 'L'; rechaza({ 'dominio.red': Rd }, 'redCambiaEspecie'); }
  assert.deepEqual(proponer(Γ, fijarParametro('dueño', { 'dominio.lote': { máximo: 0, guarda: 'final' } })), { resultado: 'INADMISIBLE', motivo: 'fueraDeDominio' });
  // compatibles: se aceptan y abren época
  const ε = S(Γ).epoca;
  ok(Γ, fijarParametro('dueño', { 'dominio.forma': C.formaExtendida(Φ()) }));
  ok(Γ, fijarParametro('dueño', { 'dominio.red': C.redConMermar(𝒩()) }));
  { const Rd = 𝒩(); Rd.transiciones.Cobrar.nulo = 'admitir'; Rd.transiciones.Cancelar.restricción = ['porCobrar']; ok(Γ, fijarParametro('dueño', { 'dominio.red': Rd })); }
  { const F = Φ(); F.tipos.variante.κ = ['sku', 'color']; ok(Γ, fijarParametro('dueño', { 'dominio.forma': F }), 'κ ampliada única'); }
  assert.equal(S(Γ).epoca, ε + 4);
  assert.equal(proponer(Γ, fijarParametro('caja', { 'dominio.liberaciones': [] })).resultado, 'NO_AUTORIZADO');
});

// ═════════════════════════ L20 · Lote ═════════════════════════
test('L20 Lote: atómico (una entrada o ninguna), sin acciones de contrato, sin anidar, tamaño acotado; guarda «final» admite un orden interno libre con el mismo resultado', () => {
  const { Γ, W, v } = base();
  assert.deepEqual(proponer(Γ, { u: 'dueño', tipo: 'Lote', args: { acciones: [{ tipo: 'FijarParámetro', args: { 'dominio.liberaciones': [] } }] } }), { resultado: 'INADMISIBLE', motivo: 'forma' });
  assert.deepEqual(proponer(Γ, { u: 'dueño', tipo: 'Lote', args: { acciones: [] } }), { resultado: 'INADMISIBLE', motivo: 'loteTamaño' });
  assert.deepEqual(proponer(Γ, lote('dueño', lote('dueño', disparar('dueño', 'Ingresar', { w: W, v, q: 1 })))), { resultado: 'INADMISIBLE', motivo: 'loteAnidado' });
  const n = Γ.entradas.length;
  const desordenado = [nacer('dueño', 'venta', { variante: v, bodega: W, precio: 10, canal: 'POS' }), disparar('dueño', 'Vender', { s: { nacido: 0 }, q: 2 }),
    disparar('dueño', 'Asignar', { s: { nacido: 0 }, q: 2 }), disparar('dueño', 'Ingresar', { w: W, v, q: 2 })];
  assert.match(proponer(Γ, lote('dueño', ...desordenado)).motivo, /^negativo:libre\[/);
  assert.equal(Γ.entradas.length, n, 'lote rechazado: ninguna entrada');
  const Γo = C.bifurcar(Γ);
  ok(Γo, fijarParametro('dueño', { 'dominio.conjunto': { añadirExistente: 'sinEfecto', quitarAusente: 'rechazar' } })); // misma época que Γ ⇒ mismos IDs
  ok(Γo, lote('dueño', desordenado[3], ...desordenado.slice(0, 3)));
  ok(Γ, fijarParametro('dueño', { 'dominio.lote': { máximo: 50, guarda: 'final' } }));
  ok(Γ, lote('dueño', ...desordenado), 'con guarda final el orden interno es libre');
  assert.deepEqual(M.marcado(S(Γ).D), M.marcado(S(Γo).D), 'mismo resultado comprometido que el orden admisible paso a paso');
  assert.deepEqual(M.seccionesCanonicas(S(Γ).D), M.seccionesCanonicas(S(Γo).D));
  ok(Γ, fijarParametro('dueño', { 'dominio.lote': { máximo: 2, guarda: 'cadaPaso' } }));
  assert.deepEqual(proponer(Γ, lote('dueño', ...desordenado.slice(0, 3))), { resultado: 'INADMISIBLE', motivo: 'loteTamaño' });
});
test('P‑C disparo nulo: Contar confirmatorio se admite; Cancelar sin nada pendiente se rechaza (sinEfecto)', () => {
  const { Γ, W, v } = base();
  ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: 0 }));
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 1 }));
  const s = venta(Γ, 'venta.inmediata', W, v, 1);
  assert.deepEqual(proponer(Γ, disparar('dueño', 'Cancelar', { s })), { resultado: 'INADMISIBLE', motivo: 'sinEfecto' });
});

// ═════════════════════════ oráculo de aceptación v2/v3 (contra el modelo) ═════════════════════════
registrarAceptacion(test, M, 'modelo');
