// Kobalt — leyes del inventario como pruebas de propiedades.
// Ejecutar:  node --test .claude/skills/kobalt-verificar-leyes/ejemplo/
// Sin dependencias: generador con semilla + reducción por prefijo (Γ es un monoide
// libre, así que el contraejemplo mínimo natural es el prefijo más corto que falla).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from './inventario.modelo.mjs';

// ─────────── Mini‑motor de propiedades ───────────
const SEMILLA = Number(process.env.KOBALT_SEED ?? 20261110);
const CASOS = Number(process.env.KOBALT_CASOS ?? 300);

function prng(seed) { // mulberry32
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const elegir = (r, xs) => xs[Math.floor(r() * xs.length)];
const entero = (r, a, b) => a + Math.floor(r() * (b - a + 1));

/** Propuesta aleatoria de acción (puede ser inadmisible o no autorizada: a propósito). */
function proponer(r) {
  const p = elegir(r, ['P1', 'P2']);
  const id = `q${entero(r, 1, 12)}`;               // pool pequeño ⇒ ids repetidos ⇒ prueba idempotencia
  const tipo = elegir(r, ['Ingresar', 'Ingresar', 'CorregirConteo', 'Solicitar', 'Solicitar', 'Solicitar',
                          'Asignar', 'Asignar', 'Rechazar', 'AsignarInterna', 'Despachar']);
  const actor = r() < 0.75 ? 'admin' : 'vendedor';
  const base = { Ingresar: { p, q: entero(r, 1, 6) }, CorregirConteo: { p, h: entero(r, 0, 8) },
    Solicitar: { id, p, q: entero(r, 1, 3) }, AsignarInterna: { id, p, q: entero(r, 1, 3) } }[tipo] ?? { id };
  return { actor, a: { tipo, ...base } };
}

/** Construye Γ comprometiendo solo lo autorizado y admisible, vía AppendIfHead. */
function trayectoria(r, largo) {
  let Γ = M.genesis('inv:bodega-1');
  const rechazos = {};
  for (let i = 0; i < largo; i++) {
    const { actor, a } = proponer(r);
    const res = M.comprometer(Γ, M.cabeza(Γ), actor, a);
    if (res.Γ) Γ = res.Γ; else rechazos[res.rechazo] = (rechazos[res.rechazo] ?? 0) + 1;
  }
  return { Γ, rechazos };
}

/** ∀ semilla: prop(Γ) ; si falla, reduce al prefijo más corto que aún falla. */
function paraTodaTrayectoria(nombre, prop) {
  test(nombre, () => {
    for (let c = 0; c < CASOS; c++) {
      const seed = SEMILLA + c;
      const { Γ } = trayectoria(prng(seed), entero(prng(seed ^ 0x9e37), 0, 60));
      if (prop(Γ.acciones)) continue;
      let k = 0; while (k < Γ.acciones.length && prop(Γ.acciones.slice(0, k))) k++;
      assert.fail(`${nombre}\n  semilla=${seed}  prefijo mínimo que falla (n=${k}):\n  ` +
        Γ.acciones.slice(0, k).map(M.codificar).join('\n  '));
    }
  });
}
const S = acc => M.fold(M.estadoInicial(), acc);
const productos = ['P1', 'P2'];

// ─────────── L4 · Fold es acción de monoide ⇒ snapshots correctos ───────────
paraTodaTrayectoria('L4 Fold(S0, Γ‖Δ) = Fold(Fold(S0,Γ), Δ) en todo corte', acc => {
  for (let n = 0; n <= acc.length; n++) {
    const snap = S(acc.slice(0, n));
    if (JSON.stringify(M.fold(snap, acc.slice(n))) !== JSON.stringify(S(acc))) return false;
  }
  return true;
});

// ─────────── L6 · Invariantes verdaderos (inducción sobre Γ) ───────────
paraTodaTrayectoria('L6 invariantes: H≥0, A≥0, P≥0, A = Σ asignadas', acc => {
  let s = M.estadoInicial();
  for (const a of acc) {
    s = M.transformar(s, a);
    for (const p of productos) {
      const x = s.productos[p] ?? { H: 0, A: 0 };
      const sumaAsignadas = Object.values(s.registros).filter(r => r.p === p && r.estado === 'asignada').reduce((t, r) => t + r.q, 0);
      if (x.H < 0 || x.A < 0 || M.pendientes(s, p) < 0 || x.A !== sumaAsignadas) return false;
    }
  }
  return true;
});

// ─────────── L7 · Guardas ≠ invariantes: H ≥ A NO es invariante ───────────
test('L7 un conteo físico legítimo puede dejar H < A (déficit representable)', () => {
  let Γ = M.genesis('inv:L7');
  for (const a of [{ tipo: 'Ingresar', p: 'P1', q: 5 }, { tipo: 'AsignarInterna', id: 'i1', p: 'P1', q: 4 },
                   { tipo: 'CorregirConteo', p: 'P1', h: 1 }]) {
    const r = M.comprometer(Γ, M.cabeza(Γ), 'admin', a); assert.ok(r.Γ, r.rechazo); Γ = r.Γ;
  }
  assert.equal(M.deficit(Γ.S, 'P1'), 3);
  assert.equal(M.noAsignada(Γ.S, 'P1'), 0);
  // …y la guarda sigue impidiendo nuevas asignaciones mientras haya déficit:
  assert.equal(M.comprometer(Γ, M.cabeza(Γ), 'admin', { tipo: 'AsignarInterna', id: 'i2', p: 'P1', q: 1 }).rechazo, 'NO_ADMISIBLE');
});

// ─────────── L8 · Atomicidad: un único sucesor por cabeza ───────────
test('L8 dos vendedores sobre la última unidad: solo un sucesor por (n,h_n)', () => {
  let Γ = M.genesis('inv:L8');
  for (const a of [{ tipo: 'Ingresar', p: 'P1', q: 1 }, { tipo: 'Solicitar', id: 'b', p: 'P1', q: 1 }, { tipo: 'Solicitar', id: 'c', p: 'P1', q: 1 }])
    Γ = M.comprometer(Γ, M.cabeza(Γ), 'admin', a).Γ;
  const vista = M.cabeza(Γ);                                   // ambos observan el mismo prefijo
  const r1 = M.comprometer(Γ, vista, 'admin', { tipo: 'Asignar', id: 'b' });
  const r2 = M.comprometer(r1.Γ, vista, 'admin', { tipo: 'Asignar', id: 'c' });
  assert.ok(r1.Γ); assert.equal(r2.rechazo, 'CABEZA_CAMBIADA');
  const r3 = M.comprometer(r1.Γ, M.cabeza(r1.Γ), 'admin', { tipo: 'Asignar', id: 'c' }); // reevaluada
  assert.equal(r3.rechazo, 'NO_ADMISIBLE');
});

// ─────────── L9 · Coherencia incremental: Π(Fold(S0,Γ_m)) = Update(Π_n, Γ_{n+1:m}) ───────────
paraTodaTrayectoria('L9 incremental desde cualquier checkpoint = reconstrucción completa', acc => {
  const completo = S(acc);
  for (let n = 0; n <= acc.length; n++) {
    const Yn = M.actualizarIncremental(M.proyeccionVacia(), acc.slice(0, n));
    const Ym = M.actualizarIncremental(Yn, acc.slice(n));
    for (const p of productos) if (M.prudenteDesdeY(Ym, p) !== M.prudente(completo, p)) return false;
  }
  return true;
});

// ─────────── L10 · Criterio de incrementalidad (núcleo = congruencia) ───────────
/** Busca s, s' con π(s)=π(s') pero π(T_a s) ≠ π(T_a s'). Si existe, π NO es incremental desde sí misma. */
function contraejemploCongruencia(pi, estados, acciones) {
  for (const s of estados) for (const t of estados) {
    if (pi(s) !== pi(t)) continue;
    for (const a of acciones) {
      if (!M.admisible(s, a) || !M.admisible(t, a)) continue;
      if (pi(M.transformar(s, a)) !== pi(M.transformar(t, a))) return { s, t, a };
    }
  }
  return null;
}
test('L10 D_no_asignada no es actualizable desde sí misma: (H2,A5) vs (H3,A3)', () => {
  const st = (H, A) => ({ productos: { P1: { H, A } }, registros: {} });
  const ce = contraejemploCongruencia(s => M.noAsignada(s, 'P1'), [st(2, 5), st(3, 3)], [{ tipo: 'Ingresar', p: 'P1', q: 2 }]);
  assert.ok(ce, 'se esperaba contraejemplo');
  assert.deepEqual([M.noAsignada(M.transformar(ce.s, ce.a), 'P1'), M.noAsignada(M.transformar(ce.t, ce.a), 'P1')].sort(), [0, 2]);
});
test('L10 el par (H,A) sí es congruencia para Ingresar/Corregir', () => {
  const estados = []; for (let H = 0; H <= 4; H++) for (let A = 0; A <= 4; A++) estados.push({ productos: { P1: { H, A } }, registros: {} });
  const acciones = [{ tipo: 'Ingresar', p: 'P1', q: 1 }, { tipo: 'Ingresar', p: 'P1', q: 3 }, { tipo: 'CorregirConteo', p: 'P1', h: 2 }];
  assert.equal(contraejemploCongruencia(s => `${s.productos.P1.H},${s.productos.P1.A}`, estados, acciones), null);
});

// ─────────── L11 · Disponibilidades ───────────
paraTodaTrayectoria('L11 0 ≤ prudente ≤ no_asignada, y déficit·no_asignada = 0', acc => {
  const s = S(acc);
  return productos.every(p => 0 <= M.prudente(s, p) && M.prudente(s, p) <= M.noAsignada(s, p)
                              && M.deficit(s, p) * M.noAsignada(s, p) === 0);
});

// ─────────── L12 · Efecto de cada transición sobre las disponibilidades ───────────
paraTodaTrayectoria('L12 Asignar conserva prudente; Rechazar no la baja; Despachar conserva ambas', acc => {
  let s = M.estadoInicial();
  for (const a of acc) {
    const s2 = M.transformar(s, a);
    const p = a.p ?? s.registros[a.id]?.p;
    const [pr, pr2, na, na2] = [M.prudente(s, p), M.prudente(s2, p), M.noAsignada(s, p), M.noAsignada(s2, p)];
    if (a.tipo === 'Asignar' && pr2 !== pr) return false;
    if (a.tipo === 'Rechazar' && pr2 < pr) return false;
    if (a.tipo === 'Despachar' && (pr2 !== pr || na2 !== na)) return false;
    s = s2;
  }
  return true;
});

// ─────────── L13 · Unión de solicitudes (no mínimo) + idempotencia por identidad ───────────
test('L13 P se calcula sobre Q_B ∪ Q_C; el mínimo de disponibilidades locales es incorrecto', () => {
  const H = 10, QB = new Map([['b1', 1], ['b2', 1]]), QC = new Map([['c1', 1], ['c2', 1], ['c3', 1]]);
  const local = Q => H - [...Q.values()].reduce((s, q) => s + q, 0);
  const union = new Map([...QB, ...QC]);
  assert.equal(Math.min(local(QB), local(QC)), 7);   // respuesta tradicional: incorrecta
  assert.equal(local(union), 5);                      // respuesta Kobalt
  assert.equal(local(new Map([...union, ...QB])), 5); // reenviar Q_B no cuenta dos veces
});
paraTodaTrayectoria('L13 una solicitud repetida (mismo id) nunca se compromete dos veces', acc => {
  const ids = acc.filter(a => a.tipo === 'Solicitar' || a.tipo === 'AsignarInterna').map(a => a.id);
  return new Set(ids).size === ids.length;
});

// ─────────── L16 · Autoridad previa ───────────
test('L16 un vendedor puede solicitar pero no constituir asignaciones', () => {
  let Γ = M.genesis('inv:L16');
  Γ = M.comprometer(Γ, M.cabeza(Γ), 'admin', { tipo: 'Ingresar', p: 'P1', q: 3 }).Γ;
  Γ = M.comprometer(Γ, M.cabeza(Γ), 'vendedor', { tipo: 'Solicitar', id: 'v1', p: 'P1', q: 1 }).Γ;
  assert.equal(M.comprometer(Γ, M.cabeza(Γ), 'vendedor', { tipo: 'Asignar', id: 'v1' }).rechazo, 'NO_AUTORIZADO');
});

// ─────────── L22 · Continuidad verificable ───────────
paraTodaTrayectoria('L22 manipular o truncar un prefijo se detecta contra el checkpoint', acc => {
  if (acc.length < 2) return true;
  let Γ = M.genesis('inv:bodega-1');
  for (const a of acc) Γ = M.comprometer(Γ, M.cabeza(Γ), 'admin', a).Γ ?? Γ;
  const cp = M.cabeza(Γ);
  const manipulada = acc.map((a, i) => (i === 0 && 'q' in a ? { ...a, q: a.q + 1 } : i === 0 && 'h' in a ? { ...a, h: a.h + 1 } : a));
  const cambio = M.codificar(manipulada[0]) !== M.codificar(acc[0]);
  return M.verificarCadena('inv:bodega-1', acc, cp).ok
      && (!cambio || !M.verificarCadena('inv:bodega-1', manipulada, cp).ok)
      && M.verificarCadena('inv:bodega-1', acc.slice(0, -1), cp).motivo === 'TRUNCADA';
});

// ─────────── Cobertura del generador (no es una ley: evita pruebas vacías) ───────────
test('generador: produce compromisos y rechazos de los tres tipos', () => {
  const tot = { compromisos: 0, NO_AUTORIZADO: 0, NO_ADMISIBLE: 0 };
  for (let c = 0; c < 50; c++) { const { Γ, rechazos } = trayectoria(prng(SEMILLA + c), 60);
    tot.compromisos += Γ.acciones.length; tot.NO_AUTORIZADO += rechazos.NO_AUTORIZADO ?? 0; tot.NO_ADMISIBLE += rechazos.NO_ADMISIBLE ?? 0; }
  assert.ok(tot.compromisos > 500 && tot.NO_AUTORIZADO > 50 && tot.NO_ADMISIBLE > 50, JSON.stringify(tot));
});
