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
const venta = (Γ, modo, W, v, q, u = 'dueño', canal = 'POS', precio = 100, pedido = null) => {
  const n = ok(Γ, { u, ...M.plantillaLínea({ canal }, { variante: v, bodega: W, precio, cantidad: q, modalidad: modo }, pedido) });
  return M.idLínea(n, pedido); // Anexo D: con pedido nuevo la venta es @1 ⇒ (n, 1); con pedido existente, @0 ⇒ (n, 0)
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
        const nacim = M.contribuciones(Γ.entradas[i - 1], i, Γ.estados[i - 1].parametros)[`${M.kid(x.id)}|${c}`]; // ['último', [{v}]]
        assert.deepEqual(v, nacim?.[1]?.[0]?.v, `VF4: ${M.kid(x.id)}.${c} cambió desde el nacimiento`);
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
  const s = venta(Γ, 'pedido', W, v, 5);
  ok(Γ, disparar('dueño', 'Asignar', { s, q: 5 }));
  ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: 0 }));
  const d = disp(Γ, W, v);
  assert.deepEqual([d.H, d.A, d.libre, d.déficit, d.noAsignada], [0, 5, -5, 5, 0]);
  assert.deepEqual(M.auditoria(S(Γ).D, S(Γ).parametros), []);
  const s2 = venta(Γ, 'pedido', W, v, 1);
  assert.deepEqual(proponer(Γ, disparar('dueño', 'Asignar', { s: s2, q: 1 })), { resultado: 'INADMISIBLE', motivo: `negativo:libre[${M.kid(W)},${M.kid(v)}]` });
});
test('L7 H < 0 es alcanzable con la liberación del canal POS (Teorema 6.1 ⇒) y el mismo flujo por Web se rechaza', () => {
  const { Γ, W, v } = base({ 'dominio.liberaciones': M.LIBERACIONES_INICIAL });
  const s = venta(Γ, 'entregarAhora', W, v, 1, 'dueño', 'POS');
  assert.ok(s);
  const d = disp(Γ, W, v);
  assert.deepEqual([d.H, d.libre, d.A], [-1, -1, 0]);
  assert.deepEqual(M.auditoria(S(Γ).D, S(Γ).parametros), [], 'el negativo es un descuadre visible, no un fallo de auditoría');
  const r = proponer(Γ, { u: 'dueño', ...M.plantillaLínea({ canal: 'Web' }, { variante: v, bodega: W, precio: 100, cantidad: 1, modalidad: 'entregarAhora' }) });
  assert.equal(r.resultado, 'INADMISIBLE');
  assert.match(r.motivo, /^negativo:(libre|H)\[/);
});
test('L7 P‑B P‑C un conteo físico SIEMPRE se admite (incluso confirmatorio o por debajo de A), y en las trayectorias generadas ningún Contar bien formado del propietario se rechaza', () => {
  const { Γ, W, v } = base();
  ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: 0 }), 'conteo confirmatorio (disparo nulo admitido)');
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 3 }));
  const s = venta(Γ, 'apartar', W, v, 3);
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
  venta(Γ, 'entregarAhora', W, v, 2, 'dueño', 'POS');
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
// Tabla D.3 (por unidad): efectos (H, A, P, P⁰, libre) y sobre D_prudente = libre − P y D_no_asignada = libre (sin max)
const PLANT = { registrar: { dH: 0, dA: 0, dP: 0, dP0: 1, dl: 0, dPrud: 0, dNoAs: 0 }, pedido: { dH: 0, dA: 0, dP: 1, dP0: 0, dl: 0, dPrud: -1, dNoAs: 0 },
  apartar: { dH: 0, dA: 1, dP: 0, dP0: 0, dl: -1, dPrud: -1, dNoAs: -1 }, entregarAhora: { dH: -1, dA: 0, dP: 0, dP0: 0, dl: -1, dPrud: -1, dNoAs: -1 } };
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
      const primera = ts[0] === 'Nacer:pedido';
      const resto = ts.slice(primera ? 2 : 1);
      if (ts[primera ? 1 : 0] !== 'Nacer:venta' || !resto.length || !resto.every(t => t.startsWith('Disparar:'))) return;
      const nombre = Object.keys(M.MODALIDADES).find(p => igual(resto, M.MODALIDADES[p].map(t => `Disparar:${t}`)));
      if (!nombre) return;
      const q = e.args.acciones.at(-1).args.q;
      const [w, v] = sale(M.idLínea(k + 1, primera ? null : e.args.acciones[0].args.valores.pedido));
      const dd = deltas(w, v), esp = PLANT[nombre];
      for (const c of ['dH', 'dA', 'dP', 'dP0', 'dl']) assert.equal(dd[c], esp[c] * q, `${nombre}(q=${q}) en e_${k + 1}: ${c}`);
      assert.equal((dd.b.libre - dd.b.P) - (dd.a.libre - dd.a.P), esp.dPrud * q, `${nombre}: D_prudente`);
      assert.equal(dd.b.libre - dd.a.libre, esp.dNoAs * q, `${nombre}: D_no_asignada`);
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
  const sU = venta(Γ, 'pedido', W, v, 1, 'U1', 'Web');
  assert.equal(proponer(Γ, disparar('U1', 'Asignar', { s: sU, q: 1 })).resultado, 'NO_AUTORIZADO', 'vendedor no asigna');
  assert.equal(proponer(Γ, lote('U1', disparar('U1', 'Cobrar', { s: sU, x: 1 }), disparar('U1', 'Contar', { w: W, v, h: 0 }))).resultado, 'NO_AUTORIZADO', 'E4: Contar colado en un lote');
  assert.equal(proponer(Γ, { u: 'U1', ...M.plantillaLínea({ canal: 'Web' }, { variante: v, bodega: W, precio: 100, cantidad: 1, modalidad: 'apartar' }) }).resultado, 'NO_AUTORIZADO', 'E4: venta firme del vendedor');
  assert.deepEqual(proponer(Γ, fijar('dueño', 'variante', 'nombre', P, 'X')), { resultado: 'INADMISIBLE', motivo: 'tipoIncoherente' });
  assert.deepEqual(proponer(Γ, fijar('U1', 'producto', 'nombre', P, 'X')), { resultado: 'INADMISIBLE', motivo: 'ajeno' }, 'alcance propio: el producto es del propietario');
  const sD = venta(Γ, 'pedido', W, v, 1, 'dueño');
  assert.deepEqual(proponer(Γ, disparar('caja', 'Asignar', { s: sD, q: 1 })), { resultado: 'INADMISIBLE', motivo: 'ajeno' }, 'cajero sobre venta ajena');
  const sC = venta(Γ, 'entregarAhora', W, v, 2, 'caja', 'POS');
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
    ...(B.length ? [M.PROYECCIONES.disponibilidad(B[0], V0)] : []), M.PROYECCIONES.fibra('color', 'Azul'),
    ...M.entidades(S(Γ).D).filter(x => x.tipo === 'pedido').slice(0, 2).map(x => M.PROYECCIONES.hijos(x.id, 'venta', 'pedido', ['porCobrar', 'cobrado', 'pend', 'desp']))];
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
      const d1 = M.efecto(S0.D, e1, S0.parametros), d2 = M.efecto(Γ.estados[k + 1].D, e2, Γ.estados[k + 1].parametros);
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
  const s = venta(Γ, 'apartar', W, v, 1); ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: 0 })); // libre = −1
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
  const s = venta(Γ, 'pedido', W, v, 3);
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
  const s2 = venta(Γ, 'pedido', W, v, 1);
  ok(Γ, disparar('dueño', 'Asignar', { s: s2, q: 1 }));
  assert.equal(M.valorLugar(S(Γ).D, 'marca', [s2]), 1);
});
test('L35 Teorema 5.2: cada validación de cantidad de la v2 es «un lugar restringido no baja de 0» (motivo = el lugar)', () => {
  const { Γ, W, v } = base();
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 2 }));
  const s = venta(Γ, 'pedido', W, v, 2);
  const K = x => M.kid(x);
  assert.equal(proponer(Γ, disparar('dueño', 'Asignar', { s, q: 3 })).motivo, `negativo:pend[${K(s)}]`);
  assert.equal(proponer(Γ, disparar('dueño', 'Despachar', { s, q: 1 })).motivo, `negativo:asig[${K(s)}]`);
  assert.equal(proponer(Γ, disparar('dueño', 'Cobrar', { s, x: 201 })).motivo, `negativo:porCobrar[${K(s)}]`);
  const s3 = venta(Γ, 'pedido', W, v, 5);
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
  const desordenado = [nacer('dueño', 'pedido', { canal: 'POS' }), nacer('dueño', 'venta', { pedido: { nacido: 0 }, variante: v, bodega: W, precio: 10 }),
    disparar('dueño', 'Vender', { s: { nacido: 1 }, q: 2 }), disparar('dueño', 'Asignar', { s: { nacido: 1 }, q: 2 }), disparar('dueño', 'Ingresar', { w: W, v, q: 2 })];
  assert.match(proponer(Γ, lote('dueño', ...desordenado)).motivo, /^negativo:libre\[/);
  assert.equal(Γ.entradas.length, n, 'lote rechazado: ninguna entrada');
  const Γo = C.bifurcar(Γ);
  ok(Γo, fijarParametro('dueño', { 'dominio.conjunto': { añadirExistente: 'sinEfecto', quitarAusente: 'rechazar' } })); // misma época que Γ ⇒ mismos IDs
  ok(Γo, lote('dueño', desordenado[4], ...desordenado.slice(0, 4)));
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
  const s = venta(Γ, 'entregarAhora', W, v, 1);
  assert.deepEqual(proponer(Γ, disparar('dueño', 'Cancelar', { s })), { resultado: 'INADMISIBLE', motivo: 'sinEfecto' });
});

// ═════════════════════════ Anexo D · pedido (VF11–VF13, plantillas, casos dirigidos) ═════════════════════════
const líneasDe = (D, ρ) => M.entidades(D).filter(x => x.tipo === 'venta' && igual(x.padre, ρ)).map(x => x.id);
paraTodo('VF11 toda venta tiene por padre un pedido que nació antes o en su mismo lote; VF12 su sección propia no tiene canal ni cliente y canal(s) = canal(padre)', g => {
  for (const [k, St] of g.Γ.estados.entries()) {
    const E = M.entidades(St.D), tipo = new Map(E.map(x => [M.kid(x.id), x.tipo]));
    for (const x of E.filter(y => y.tipo === 'venta')) {
      assert.ok(x.padre && tipo.get(M.kid(x.padre)) === 'pedido', `S_${k}: ${M.kid(x.id)} sin pedido por padre`);
      assert.ok(x.padre[0] < x.id[0] || (x.padre[0] === x.id[0] && x.padre[1] < x.id[1]), `VF11: el pedido de ${M.kid(x.id)} no nació antes`);
      const sec = M.seccionPropia(St.D, x.id);
      assert.ok(!('canal' in sec) && !('cliente' in sec), `VF12: ${M.kid(x.id)} guarda contexto propio`);
      assert.deepEqual(M.carac(St.D, St.parametros, x.id, 'canal'), M.carac(St.D, St.parametros, x.padre, 'canal'), 'VF12');
      assert.deepEqual(M.carac(St.D, St.parametros, x.id, 'cliente'), M.carac(St.D, St.parametros, x.padre, 'cliente'), 'VF12 cliente');
    }
  }
  return true;
});
paraTodo('VF13 p·(pend + pend⁰ + asig + desp + cancel + Σ(sol + recibido)) = porCobrar + cobrado + reembolsado + anulado en cada línea y estado (recalculado del marcado, no de la auditoría); el pedido no interviene en la Red', g => {
  for (const [k, St] of g.Γ.estados.entries()) {
    const D = St.D, par = St.parametros, m = f => id => M.valorLugar(D, f, [id]);
    for (const x of M.entidades(D).filter(y => y.tipo === 'venta')) {
      const p = M.carac(D, par, x.id, 'precio');
      const devs = M.entidades(D).filter(y => y.tipo === 'devolución' && igual(M.carac(D, par, y.id, 'venta'), x.id)).map(y => y.id);
      const unidades = ['pend', 'pend⁰', 'asig', 'desp', 'cancel'].reduce((t, f) => t + m(f)(x.id), 0) + devs.reduce((t, d) => t + m('sol')(d) + m('recibido')(d), 0);
      const valor = ['porCobrar', 'cobrado', 'reembolsado', 'anulado'].reduce((t, f) => t + m(f)(x.id), 0);
      assert.equal(p * unidades, valor, `S_${k}: VF13 en ${M.kid(x.id)}`);
    }
  }
  assert.ok(!Object.values(S(g.Γ).parametros['dominio.red'].familias).some(F => F.índices.includes('pedido')), 'ninguna familia de la Red tiene índice de tipo pedido');
  return true;
});
paraTodo('total(ρ) = Σ q·p de los Vender admitidos del pedido (ventana (0, j] y por prefijos); fibra(pedido, ρ, venta) = líneas de ρ; hijos(ρ, …) = fibra', g => {
  const Γ = g.Γ, par = S(Γ).parametros, D = S(Γ).D;
  const F = ['porCobrar', 'cobrado', 'reembolsado', 'anulado'];
  const pedidos = M.entidades(D).filter(x => x.tipo === 'pedido').map(x => x.id).slice(0, 12);
  const esperado = new Map(pedidos.map(ρ => [M.kid(ρ), 0]));
  Γ.entradas.forEach((e, k) => {
    if (e.clase !== 'dominio') return;
    const nac = M.nacimientos(e, k + 1);
    for (const a of M.accionesDe(e)) {
      if (a.tipo !== 'Disparar:Vender' && a.tipo !== 'Disparar:Vender.registro') continue;
      const s = Array.isArray(a.args.s) ? a.args.s : nac[a.args.s.nacido].id;
      const padre = M.entidades(D).find(x => igual(x.id, s)).padre;
      if (!esperado.has(M.kid(padre))) continue;
      esperado.set(M.kid(padre), esperado.get(M.kid(padre)) + a.args.q * M.carac(D, par, s, 'precio'));
    }
  });
  for (const ρ of pedidos) {
    const h = C.consultar(Γ, M.PROYECCIONES.hijos(ρ, 'venta', 'pedido', F));
    assert.equal(Object.values(h.suma).reduce((t, x) => t + x, 0), esperado.get(M.kid(ρ)), `total(${M.kid(ρ)})`);
    assert.deepEqual(h.hijos, líneasDe(D, ρ));
    assert.deepEqual(M.fibra(D, par, 'pedido', ρ, 'venta').miembros, líneasDe(D, ρ), 'fibra');
    assert.deepEqual(C.consultar(Γ, M.PROYECCIONES.fibra('pedido', ρ, 'venta')).miembros, líneasDe(D, ρ), 'fibra monoidal (q_cat)');
  }
  return true;
}, Math.min(CASOS, 15));
test('Anexo D.4 hijos es GENÉRICA (τ, k, F parámetros): las devoluciones de una venta; ventanas por prefijos (grupo) = suma de los Vender de la ventana; hijos del catálogo = hijos del estado', () => {
  const { Γ, W, v } = base();
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 20 }));
  const l1 = venta(Γ, 'entregarAhora', W, v, 3);
  const ρ = [l1[0], 0];
  const n1 = Γ.entradas.length;
  const l2 = venta(Γ, 'apartar', W, v, 2, 'dueño', 'POS', 7, ρ);
  const d = [ok(Γ, lote('dueño', nacer('dueño', 'devolución', { venta: l1 }), disparar('dueño', 'Devolver', { d: { nacido: 0 }, q: 1 }))), 0];
  const hd = C.consultar(Γ, M.PROYECCIONES.hijos(l1, 'devolución', 'venta', ['sol', 'recibido']));
  assert.deepEqual(hd.hijos, [d]);
  assert.deepEqual(hd.suma, { sol: 1, recibido: 0 });
  assert.deepEqual(hd.m[M.kid(d)], { sol: 1, recibido: 0 });
  const h = M.PROYECCIONES.hijos(ρ, 'venta', 'pedido', ['porCobrar']);
  const ventana = C.resolverP(Γ, h, n1 + 1, null, n1);                 // (n1, n1+1]: solo la segunda línea
  assert.equal(ventana.Y.suma.porCobrar, 2 * 7, 'ventana = flujo de Vender del período');
  const total = C.resolverP(Γ, h, Γ.entradas.length, null, 0);
  assert.equal(total.Y.suma.porCobrar, 3 * 100 + 2 * 7);
  const antes = C.resolverP(Γ, h, n1, null, 0);
  assert.equal(antes.Y.suma.porCobrar, 3 * 100);
  // por checkpoint: ACTUALIZAR = RECONSTRUIR
  const inc = C.resolverP(Γ, h, Γ.entradas.length, { acum: antes.acum, checkpoint: antes.checkpoint });
  assert.equal(inc.accion, 'ACTUALIZAR'); assert.deepEqual(inc.Y, total.Y);
  assert.deepEqual(h.monoide.op(h.monoide.unidad, h.monoide.unidad), h.monoide.unidad);
  // la parte de catálogo del acumulado da los mismos hijos que el estado (VF4: el padre no cambia)
  const secs = M.PROYECCIONES.catalogo.obs(total.acum[0]);
  assert.deepEqual(Object.keys(secs).filter(k => secs[k].tipo === 'venta' && igual(secs[k].padre, ρ)).map(M.idDe), [l1, l2]);
  assert.equal(l2[0] > l1[0] && l2[1] === 0, true);
});
test('Anexo D.7 sin la capacidad Nacer:pedido ⇒ NO_AUTORIZADO (E4: ni el lote ni la acción interna); con ella, sí', () => {
  const { Γ, W, v } = base({ 'nucleo.capacidades': { 'dueño': ['*'], sinPed: M.CAPACIDADES.cajero.filter(c => c !== 'Nacer:pedido'), conPed: M.CAPACIDADES.cajero }, 'dominio.alcancePropio': { sinPed: M.ALCANCE.cajero, conPed: M.ALCANCE.cajero } });
  const sol = u => ({ u, ...M.plantillaLínea({ canal: 'POS' }, { variante: v, bodega: W, precio: 1, cantidad: 1, modalidad: 'pedido' }) });
  assert.deepEqual(proponer(Γ, sol('sinPed')), { resultado: 'NO_AUTORIZADO' });
  assert.deepEqual(proponer(Γ, nacer('sinPed', 'pedido', { canal: 'POS' })), { resultado: 'NO_AUTORIZADO' });
  ok(Γ, sol('conPed'));
});
test('Anexo D.7 Nacer:pedido bajo alcance propio falla CERRADO (ajeno); Nacer:venta bajo alcance exige dueño(pedido) = u: U1 en el pedido de caja ⇒ ajeno; el propietario sí y la línea sigue siendo de caja', () => {
  const { Γ, W, v } = base({ 'nucleo.capacidades': { 'dueño': ['*'], caja: M.CAPACIDADES.cajero, U1: M.CAPACIDADES.vendedor, raro: M.CAPACIDADES.cajero },
    'dominio.alcancePropio': { caja: M.ALCANCE.cajero, U1: M.ALCANCE.vendedor, raro: ['Nacer:pedido', 'Nacer:venta', 'Disparar:*'] } });
  assert.deepEqual(proponer(Γ, nacer('raro', 'pedido', { canal: 'POS' })), { resultado: 'INADMISIBLE', motivo: 'ajeno' }, 'Nacer:pedido en el alcance: no hay padre ni objetivo');
  const linea = (u, ρ, canal = 'POS') => ({ u, ...M.plantillaLínea({ canal }, { variante: v, bodega: W, precio: 5, cantidad: 1, modalidad: 'pedido' }, ρ) });
  const n = ok(Γ, linea('caja', null));
  const ρ = [n, 0];
  assert.deepEqual(proponer(Γ, linea('U1', ρ)), { resultado: 'INADMISIBLE', motivo: 'ajeno' });
  assert.deepEqual(proponer(Γ, linea('caja', ρ)).resultado, 'COMPROMETIDO', 'caja añade a SU pedido');
  const m = ok(Γ, linea('dueño', ρ));
  assert.equal(M.dueño(S(Γ).D, [m, 0]), 'caja');
  assert.equal(M.entidades(S(Γ).D).find(x => igual(x.id, [m, 0])).creador, 'dueño');
  ok(Γ, disparar('caja', 'Cobrar', { s: [m, 0], x: 1 }));
  assert.equal(proponer(Γ, disparar('U1', 'Cobrar', { s: [m, 0], x: 1 })).resultado, 'INADMISIBLE');
});
test('Anexo D.7 Nacer:venta con canal propio ⇒ característicaDesconocida (no se almacena dos veces); Nacer:pedido solo se compromete (pedido vacío); la venta exige pedido', () => {
  const { Γ, W, v } = base();
  assert.deepEqual(proponer(Γ, lote('dueño', nacer('dueño', 'pedido', { canal: 'POS' }), nacer('dueño', 'venta', { pedido: { nacido: 0 }, variante: v, bodega: W, precio: 1, canal: 'POS' }))), { resultado: 'INADMISIBLE', motivo: 'característicaDesconocida' });
  assert.deepEqual(proponer(Γ, lote('dueño', nacer('dueño', 'pedido', { canal: 'POS' }), nacer('dueño', 'venta', { pedido: { nacido: 0 }, variante: v, bodega: W, precio: 1, cliente: [1, 0] }))), { resultado: 'INADMISIBLE', motivo: 'característicaDesconocida' });
  const n = ok(Γ, nacer('dueño', 'pedido', { canal: 'Web' }));
  assert.equal(M.entidades(S(Γ).D).find(x => igual(x.id, [n, 0])).tipo, 'pedido');
  assert.deepEqual(M.auditoria(S(Γ).D, S(Γ).parametros), []);
  assert.deepEqual(proponer(Γ, nacer('dueño', 'venta', { variante: v, bodega: W, precio: 1 })), { resultado: 'INADMISIBLE', motivo: 'requerida' });
  assert.deepEqual(proponer(Γ, nacer('dueño', 'pedido', {})), { resultado: 'INADMISIBLE', motivo: 'requerida' }, 'canal requerida');
  assert.deepEqual(proponer(Γ, nacer('dueño', 'pedido', { canal: 'POS', cliente: [1, 0] })), { resultado: 'INADMISIBLE', motivo: 'referenciaTipo' }, 'cliente debe ser un cliente');
  assert.deepEqual(proponer(Γ, fijar('dueño', 'pedido', 'canal', [n, 0], 'POS')), { resultado: 'INADMISIBLE', motivo: 'inmutable' });
  assert.deepEqual(proponer(Γ, fijar('dueño', 'venta', 'pedido', [n, 0], [n, 0])), { resultado: 'INADMISIBLE', motivo: 'tipoIncoherente' });
});
test('Anexo D.2 el máximo del lote cuenta ACCIONES: 12 líneas entregarAhora (49 acciones) se admiten y 13 ⇒ loteTamaño', () => {
  const { Γ, W, v } = base();
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 100 }));
  const lote_ = n => { const acc = [nacer('dueño', 'pedido', { canal: 'POS' })];
    for (let i = 0; i < n; i++) acc.push(nacer('dueño', 'venta', { pedido: { nacido: 0 }, variante: v, bodega: W, precio: 1 }), ...['Vender', 'Asignar', 'Despachar'].map(t => disparar('dueño', t, { s: { nacido: i + 1 }, q: 1 })));
    return lote('dueño', ...acc); };
  assert.equal(lote_(12).args.acciones.length, 49);
  assert.deepEqual(proponer(Γ, lote_(13)), { resultado: 'INADMISIBLE', motivo: 'loteTamaño' });
  const n = ok(Γ, lote_(12));
  assert.equal(líneasDe(S(Γ).D, [n, 0]).length, 12);
  assert.equal(disp(Γ, W, v).H, 88);
});
test('Anexo D.1 la liberación POS se lee del canal HEREDADO del pedido: H = −1 con un pedido POS; negativo:libre con un pedido Web, también en una segunda línea', () => {
  const { Γ, W, v } = base({ 'dominio.liberaciones': M.LIBERACIONES_INICIAL });
  const n = ok(Γ, { u: 'dueño', ...M.plantillaLínea({ canal: 'POS' }, { variante: v, bodega: W, precio: 1, cantidad: 1, modalidad: 'entregarAhora' }) });
  assert.equal(disp(Γ, W, v).H, -1);
  const w = M.plantillaLínea({ canal: 'Web' }, { variante: v, bodega: W, precio: 1, cantidad: 1, modalidad: 'entregarAhora' });
  assert.match(proponer(Γ, { u: 'dueño', ...w }).motivo, /^negativo:libre\[/);
  const nW = ok(Γ, { u: 'dueño', ...M.plantillaLínea({ canal: 'Web' }, { variante: v, bodega: W, precio: 1, cantidad: 1, modalidad: 'registrar' }) });
  const sig = (ρ, m) => ({ u: 'dueño', ...M.plantillaLínea(null, { variante: v, bodega: W, precio: 1, cantidad: 1, modalidad: m }, ρ) });
  assert.match(proponer(Γ, sig([nW, 0], 'entregarAhora')).motivo, /^negativo:libre\[/, 'segunda línea de un pedido Web: el canal se hereda');
  ok(Γ, sig([n, 0], 'entregarAhora'));
  assert.equal(disp(Γ, W, v).H, -2);
  assert.deepEqual(M.auditoria(S(Γ).D, S(Γ).parametros), []);
});
test('Anexo D.1 G^par: añadir SOLO el tipo pedido a una Γ con ventas del Anexo A se admite; hacer de pedido el padre de venta ⇒ formaCambiaPadre', () => {
  const A = C.formaAnexoA(M.FORMA_INICIAL);
  const Γ = C.cauce(R, C.genesisActores(M, { 'dominio.liberaciones': [], 'dominio.forma': A }));
  ok(Γ, nacer('dueño', 'bodega', { nombre: 'W' }));
  ok(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'P', público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'S' })));
  const W = [1, 0], v = [2, 1];
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 3 }));
  ok(Γ, lote('dueño', nacer('dueño', 'venta', { variante: v, bodega: W, precio: 1, canal: 'POS' }), disparar('dueño', 'Vender', { s: { nacido: 0 }, q: 1 }), disparar('dueño', 'Asignar', { s: { nacido: 0 }, q: 1 })));
  assert.equal(M.carac(S(Γ).D, S(Γ).parametros, [4, 0], 'canal'), 'POS', 'forma del Anexo A: el canal es propio de la venta');
  assert.deepEqual(proponer(Γ, fijarParametro('dueño', { 'dominio.forma': M.FORMA_INICIAL })), { resultado: 'INADMISIBLE', motivo: 'formaCambiaPadre' });
  const conPedido = structuredClone(A); conPedido.tipos.pedido = structuredClone(M.FORMA_INICIAL.tipos.pedido);
  ok(Γ, fijarParametro('dueño', { 'dominio.forma': conPedido }), 'añadir solo el tipo pedido');
  ok(Γ, nacer('dueño', 'pedido', { canal: 'Web' }));
  assert.equal(M.carac(S(Γ).D, S(Γ).parametros, [4, 0], 'canal'), 'POS', 'las ventas históricas no se reinterpretan');
  // una Γ nueva con la Forma del Anexo D: el padre es inmutable en cuanto hay ventas
  const Γ2 = C.cauce(R, C.genesisActores(M, {}));
  assert.equal(S(Γ2).parametros['dominio.forma'].tipos.venta.padre, 'pedido');
});

// ═════════════════════════ Anexo C · resolución de la revisión conceptual ═════════════════════════
const P = await import('../../src/preguntas/index.mjs');
const MAXS = Number.MAX_SAFE_INTEGER;
paraTodo('C.1 L7 Teorema 2: leer no se rompe aunque una guarda se endurezca (Fold, movimientos y preguntas siguen; q_readmisión informa)', g => {
  const Γ = g.Γ;
  const endurecida = (D, a) => (a.tipo === 'Disparar:Ingresar' || a.tipo === 'Nacer:cliente' ? 'endurecida' : null);
  const R2 = { [M.ID_REGLA]: M.crearRegla({ guardaAdicional: endurecida }) };
  const S2 = N.fold(N.estadoInicial(Γ.g, R2), Γ.entradas, R2);
  assert.deepEqual(S2.D, S(Γ).D, 'el Fold con la guarda endurecida cambia el estado (T depende de la guarda)');
  Γ.entradas.forEach((e, k) => { M.movimientos(Γ.estados[k].D, Γ.estados[k].parametros, e); });
  const Γ2 = { ...Γ, registro: R2 };
  for (const proy of [M.PROYECCIONES.catalogo, M.PROYECCIONES.marcado, M.PROYECCIONES.T, M.PROYECCIONES.auditoria]) assert.deepEqual(C.consultar(Γ2, proy), C.consultar(Γ, proy), proy.id);
  const afectadas = Γ.entradas.flatMap((e, k) => (M.accionesDe(e).some(a => a.tipo === 'Disparar:Ingresar' || a.tipo === 'Nacer:cliente') && e.clase === 'dominio' ? [k + 1] : []));
  const rep = C.consultar(Γ2, M.PROYECCIONES.readmision(R2[M.ID_REGLA]));
  assert.deepEqual(rep.map(([k]) => k).sort((a, b) => a - b), afectadas, 'q_readmisión debe listar exactamente las entradas que la guarda nueva ya no admitiría');
  assert.ok(rep.every(([, m]) => m === 'endurecida'));
  assert.deepEqual(C.consultar(Γ, M.PROYECCIONES.readmision()), [], 'con la regla vigente toda entrada comprometida es readmisible');
  return true;
});
test('C.1 la guarda endurecida sí rechaza solicitudes NUEVAS (la guarda admite; el efecto interpreta)', () => {
  const g = C.genesisActores(M, { 'dominio.liberaciones': [] });
  const Γ = C.cauce({ [M.ID_REGLA]: M.crearRegla({ guardaAdicional: (D, a) => (a.tipo === 'Disparar:Ingresar' ? 'endurecida' : null) }) }, g);
  ok(Γ, nacer('dueño', 'bodega', { nombre: 'W' }));
  ok(Γ, lote('dueño', nacer('dueño', 'producto', { nombre: 'P', público: true }), nacer('dueño', 'variante', { producto: { nacido: 0 }, sku: 'S' })));
  assert.deepEqual(proponer(Γ, disparar('dueño', 'Ingresar', { w: [1, 0], v: [2, 1], q: 1 })), { resultado: 'INADMISIBLE', motivo: 'endurecida' });
  ok(Γ, disparar('dueño', 'Contar', { w: [1, 0], v: [2, 1], h: 1 }));
});
test('C.2 actividad = dato de Φ: añadir un ciclo «estado» a usuario NO cambia quién está activo ni rompe κ; declarar actividad sí, y G^par lo vigila', () => {
  const { Γ, P: P1 } = base();
  ok(Γ, nacer('dueño', 'usuario', { nombre: 'A', principal: 'p1' }));
  const Φ1 = structuredClone(S(Γ).parametros['dominio.forma']);
  Φ1.tipos.usuario.características.estado = { clase: 'ciclo', valor: { enum: ['inactivo', 'activo'] }, ciclo: { estados: ['inactivo', 'activo'], inicial: 'inactivo', transiciones: [['inactivo', 'activo'], ['activo', 'inactivo']] } };
  ok(Γ, fijarParametro('dueño', { 'dominio.forma': Φ1 }), 'característica nueva = dato');
  const u1 = M.entidades(S(Γ).D).find(x => x.tipo === 'usuario').id;
  assert.equal(M.carac(S(Γ).D, S(Γ).parametros, u1, 'estado'), 'inactivo');
  assert.equal(M.activa(S(Γ).D, S(Γ).parametros, u1), true, 'sin `actividad` declarada el usuario sigue activo');
  assert.deepEqual(proponer(Γ, nacer('dueño', 'usuario', { nombre: 'B', principal: 'p1' })), { resultado: 'INADMISIBLE', motivo: 'κDuplicada' }, 'κ sigue vigente');
  const Φ2 = structuredClone(Φ1); Φ2.tipos.usuario.actividad = { característica: 'estado', valores: ['activo'] };
  ok(Γ, fijarParametro('dueño', { 'dominio.forma': Φ2 }), 'declarar actividad (solo reduce las activas) abre época');
  assert.equal(M.activa(S(Γ).D, S(Γ).parametros, u1), false);
  ok(Γ, nacer('dueño', 'usuario', { nombre: 'B', principal: 'p1' }), 'κ solo entre activas: el nuevo es «inactivo»');
  // ampliar la actividad hasta que dos activas compartan κ ⇒ G^par: κNoÚnica
  const Φ3 = structuredClone(Φ2); Φ3.tipos.usuario.actividad = { característica: 'estado', valores: ['activo', 'inactivo'] };
  assert.deepEqual(proponer(Γ, fijarParametro('dueño', { 'dominio.forma': Φ3 })), { resultado: 'INADMISIBLE', motivo: 'κNoÚnica' });
  const Φ4 = structuredClone(Φ2); delete Φ4.tipos.usuario.actividad;
  assert.deepEqual(proponer(Γ, fijarParametro('dueño', { 'dominio.forma': Φ4 })), { resultado: 'INADMISIBLE', motivo: 'κNoÚnica' });
  // variante: retirada con el mismo SKU que una activa; quitar su actividad rompería κ
  ok(Γ, fijar('dueño', 'variante', 'estado', [2, 1], 'retirado'));
  ok(Γ, nacer('dueño', 'variante', { producto: P1, sku: 'S1' }));
  const Φ5 = structuredClone(S(Γ).parametros['dominio.forma']); delete Φ5.tipos.variante.actividad;
  assert.deepEqual(proponer(Γ, fijarParametro('dueño', { 'dominio.forma': Φ5 })), { resultado: 'INADMISIBLE', motivo: 'κNoÚnica' });
  // la característica de actividad es dato: otra característica y otros valores
  const Φ6 = structuredClone(S(Γ).parametros['dominio.forma']);
  Φ6.tipos.cliente.características.situación = { clase: 'ciclo', valor: { enum: ['vigente', 'baja'] }, ciclo: { estados: ['vigente', 'baja'], inicial: 'vigente', transiciones: [['vigente', 'baja']] } };
  Φ6.tipos.cliente.actividad = { característica: 'situación', valores: ['vigente'] };
  ok(Γ, fijarParametro('dueño', { 'dominio.forma': Φ6 }));
  const c = [ok(Γ, nacer('dueño', 'cliente', { nombre: 'C' })), 0];
  assert.equal(M.activa(S(Γ).D, S(Γ).parametros, c), true);
  ok(Γ, fijar('dueño', 'cliente', 'situación', c, 'baja'));
  assert.equal(M.activa(S(Γ).D, S(Γ).parametros, c), false);
});
test('C.3 la configuración de lectura son parámetros de la pregunta: agregación Σ_w max(0,·) frente a max(0, Σ_w ·), familias y regla de visibilidad', () => {
  const { Γ, W, P: P1, v } = base();
  const W2 = [ok(Γ, nacer('dueño', 'bodega', { nombre: 'W2' })), 0];
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 5 }));
  ok(Γ, disparar('dueño', 'Ingresar', { w: W2, v, q: 3 }));
  const s = venta(Γ, 'apartar', W2, v, 3);
  ok(Γ, disparar('dueño', 'Contar', { w: W2, v, h: 0 })); // libre(W2) = −3
  assert.ok(s);
  const St = S(Γ), par = St.parametros;
  const Σmax = M.disponibilidad(St.D, par, null, v), maxΣ = M.disponibilidad(St.D, par, null, v, { ...M.DISPONIBILIDAD_INICIAL, agregación: 'máximoDeSuma' });
  assert.deepEqual([Σmax.libre, Σmax.noAsignada, Σmax.déficit], [2, 5, 3]);
  assert.deepEqual([maxΣ.libre, maxΣ.noAsignada, maxΣ.déficit], [2, 2, 0]);
  assert.deepEqual(C.consultar(Γ, M.PROYECCIONES.disponibilidad(null, v, { ...M.DISPONIBILIDAD_INICIAL, agregación: 'máximoDeSuma' })), maxΣ);
  const φ = a => ({ op: '=', de: [{ lee: 'disp.libre@1', con: [{ x: 'e' }, ...(a ? [{ v: a }] : [])] }, { v: a === 'máximoDeSuma' ? 2 : 5 }] });
  assert.deepEqual(M.filtrar(St.D, par, 'variante', φ(null)), [v]);
  assert.deepEqual(M.filtrar(St.D, par, 'variante', φ('máximoDeSuma')), [v]);
  const cfgP0 = { ...M.DISPONIBILIDAD_INICIAL, familias: { ...M.DISPONIBILIDAD_INICIAL.familias, pendiente: 'pend⁰' } };
  ok(Γ, { u: 'dueño', ...M.plantillaLínea({ canal: 'POS' }, { variante: v, bodega: W, precio: 100, cantidad: 2, modalidad: 'registrar' }) });
  assert.deepEqual([M.disponibilidad(S(Γ).D, par, W, v).P, M.disponibilidad(S(Γ).D, par, W, v, cfgP0).P], [0, 2], 'qué familia es «pendiente» es parámetro');
  // visibilidad: la regla vive en la declaración de la galería en Φ; se puede pasar otra a la pregunta
  const x = { Q: C.qHex(9), creador: 'dueño', propósito: 'página', audiencia: 'creador', permitidos: [] };
  ok(Γ, añadir('dueño', 'producto', 'galería', P1, x));
  assert.equal(M.visible(S(Γ).D, S(Γ).parametros, 'U1', P1, x), false);
  assert.equal(M.visible(S(Γ).D, S(Γ).parametros, 'U1', P1, x, { v: true }), true, 'regla pasada como parámetro de la pregunta');
  const Φ = structuredClone(S(Γ).parametros['dominio.forma']); Φ.tipos.producto.características.galería.visibilidad = { v: true };
  ok(Γ, fijarParametro('dueño', { 'dominio.forma': Φ }));
  assert.equal(M.visible(S(Γ).D, S(Γ).parametros, 'U1', P1, x), true, 'la regla por defecto sale de Φ (dato)');
});
test('C.4 un solo lenguaje: las expresiones de la Red se evalúan con la fase 2 (−x unario, resultado exacto, desbordamiento ⇒ «cantidad»); lectores no registrados ⇒ fueraDeDominio', () => {
  const { Γ, W, v } = base();
  const red = structuredClone(S(Γ).parametros['dominio.red']);
  const w = { a: ['w'] }, vv = { a: ['v'] }, q = { a: ['q'] };
  const t = (cantidad, extra = {}) => ({ args: { w: { ref: 'bodega' }, v: { ref: 'variante' }, q: { entero: [1, 100] } }, nulo: 'rechazar', restricción: 'todas', ...extra,
    movimientos: [{ desde: ['ext.U'], hacia: ['H', w, vv], cantidad }, { desde: ['ext.L'], hacia: ['libre', w, vv], cantidad }] });
  red.transiciones.Sacar = t({ op: '−', de: [q] });                                     // −q: invierte el sentido (fase 2: aridad [1,2])
  red.transiciones.Enorme = t({ op: '×', de: [q, { v: 2 ** 52 }] }, { restricción: 'ninguna' }); // desborda con q ≥ 2
  red.transiciones.Exacta = t({ op: '+', de: [{ v: MAXS }, { op: '−', de: [q] }, { v: 1 }] }); // MAX − q + 1: exacto aunque la suma parcial desborde
  ok(Γ, fijarParametro('dueño', { 'dominio.red': red }));
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 5 }));
  ok(Γ, disparar('dueño', 'Sacar', { w: W, v, q: 2 }));
  assert.equal(disp(Γ, W, v).H, 3);
  assert.match(proponer(Γ, disparar('dueño', 'Sacar', { w: W, v, q: 4 })).motivo, /^negativo:H\[/);
  assert.equal(P.evaluar({ op: '×', de: [{ v: 4 }, { v: 2 ** 52 }] }, {}), null, 'la fase 2 da null');
  assert.deepEqual(proponer(Γ, disparar('dueño', 'Enorme', { w: W, v, q: 4 })), { resultado: 'INADMISIBLE', motivo: 'cantidad' });
  assert.deepEqual(proponer(Γ, disparar('dueño', 'Exacta', { w: W, v, q: 3 })), { resultado: 'INADMISIBLE', motivo: 'cantidad' }, 'H + (MAX−2) desborda: error visible al admitir');
  const red2 = structuredClone(S(Γ).parametros['dominio.red']);
  red2.transiciones.Rara = t({ lee: 'inventado@1', con: [] });
  assert.deepEqual(proponer(Γ, fijarParametro('dueño', { 'dominio.red': red2 })), { resultado: 'INADMISIBLE', motivo: 'fueraDeDominio' }, 'validarExpr de la fase 2');
  assert.ok(P.validarExpr({ lee: 'carac@1', con: [{ v: [1, 0] }, { v: 'nombre' }] }, M.LECTORES).ok);
});
test('C.4 los lectores de dominio (nombre@versión) sirven a las preguntas de la fase 2 sobre esta Γ (entrada y estado)', () => {
  const g = generado(1), Γ = g.Γ, o = { registro: R, lectores: M.LECTORES };
  const qT = { φ: { v: true }, aporte: { lee: 'nacimientos@1', con: [{ v: 'variante' }] }, M: { nombre: 'unión' }, obs: { nombre: 'identidad' } };
  const r1 = P.responder(qT, C.trayectoria(Γ), o);
  assert.equal(r1.resultado, 'OK', JSON.stringify(r1));
  assert.deepEqual(r1.Y.map(M.kid).sort(), M.coordenadas(S(Γ).D, S(Γ).parametros).map(M.kid).sort());
  const qH = { φ: { op: '=', de: [{ e: 'tipo' }, { v: 'Disparar:Ingresar' }] }, aporte: { lee: 'marcado@1', con: [{ v: 'H' }, { a: ['w'] }, { a: ['v'] }] }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } };
  const r2 = P.responder(qH, C.trayectoria(Γ), o);
  const esperado = Γ.entradas.reduce((t, e, k) => (e.tipo === 'Disparar:Ingresar' ? t + M.valorLugar(Γ.estados[k].D, 'H', [e.args.w, e.args.v]) : t), 0);
  assert.equal(r2.resultado, 'OK', JSON.stringify(r2));
  assert.equal(r2.Y, esperado, 'el lector de estado ve S_{k−1}');
});
test('C.5 monoide `nacimientos`: asociativo, con unidad, no conmutativo; materializable (no es secuencia); Π_T lo usa', () => {
  const Mn = M.monoideCatalogo({ nombre: 'nacimientos' });
  const r = C.prng(SEMILLA ^ 0xbeef);
  const lista = () => Array.from({ length: C.entero(r, 0, 3) }, () => [C.entero(r, 1, 9), C.entero(r, 0, 2)]);
  for (let i = 0; i < 500; i++) {
    const [a, b, c] = [lista(), lista(), lista()];
    assert.deepEqual(Mn.op(Mn.op(a, b), c), Mn.op(a, Mn.op(b, c)));
    assert.deepEqual(Mn.op(Mn.unidad, a), a); assert.deepEqual(Mn.op(a, Mn.unidad), a);
  }
  assert.notDeepEqual(Mn.op([[1, 0]], [[2, 0]]), Mn.op([[2, 0]], [[1, 0]]));
  assert.deepEqual(P.leyes(Mn), { conmutativo: false, idempotente: false, grupo: false, envolvente: false, ventana: 'segmentos', distribucion: 'no', materializable: true });
  assert.equal(M.PROYECCIONES.T.monoide, Mn);
});
test('C.6 desbordamiento visible: el intérprete de depósitos y las sumas usan ℤ con frontera (error, nunca truncamiento)', () => {
  const D = { ...M.D0, m: { 'H[1.0,2.1]': MAXS } };
  assert.throws(() => M.aplicar(D, { 'm|H[1.0,2.1]': { '+': 1 } }), RangeError);
  assert.throws(() => M.componer({ 'm|H[1.0,2.1]': { '+': MAXS } }, { 'm|H[1.0,2.1]': { '+': 1 } }), RangeError);
  assert.throws(() => P.monoide({ nombre: 'sumaPorClave' }).op({ a: MAXS }, { a: 1 }), RangeError, 'catálogo de la fase 2');
});
test('C.7 G^par: reordenar los índices de una familia con marcado se rechaza (redCambiaÍndices); sin marcado se admite', () => {
  const { Γ, W, v } = base();
  const reord = f => { const r = structuredClone(S(Γ).parametros['dominio.red']); r.familias[f].índices = [...r.familias[f].índices].reverse(); return r; };
  ok(Γ, fijarParametro('dueño', { 'dominio.red': reord('noApto') }), 'noApto sin marcado: se admite');
  ok(Γ, disparar('dueño', 'Ingresar', { w: W, v, q: 2 }));
  assert.deepEqual(proponer(Γ, fijarParametro('dueño', { 'dominio.red': reord('H') })), { resultado: 'INADMISIBLE', motivo: 'redCambiaÍndices' });
});
test('C.8 búsquedas por nombre con Object.hasOwn (__proto__, toString) y −0 = 0', () => {
  const { Γ, W, v } = base();
  assert.deepEqual(proponer(Γ, disparar('dueño', '__proto__', {})), { resultado: 'INADMISIBLE', motivo: 'transiciónDesconocida' });
  assert.deepEqual(proponer(Γ, disparar('dueño', 'toString', {})), { resultado: 'INADMISIBLE', motivo: 'transiciónDesconocida' });
  assert.deepEqual(proponer(Γ, nacer('dueño', '__proto__', {})), { resultado: 'INADMISIBLE', motivo: 'tipoDesconocido' });
  assert.deepEqual(proponer(Γ, nacer('dueño', 'constructor', {})), { resultado: 'INADMISIBLE', motivo: 'tipoDesconocido' });
  assert.deepEqual(proponer(Γ, fijar('dueño', 'bodega', '__proto__', W, 1)), { resultado: 'INADMISIBLE', motivo: 'característicaDesconocida' });
  ok(Γ, disparar('dueño', 'Contar', { w: W, v, h: -0 }));
  assert.ok(Object.is(disp(Γ, W, v).H, 0));
  assert.ok(M.igual(-0, 0));
});

// ═════════════════════════ oráculo de aceptación v2/v3 (contra el modelo) ═════════════════════════
registrarAceptacion(test, M, 'modelo');
