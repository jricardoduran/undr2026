// Kobalt — utilidades comunes de las pruebas de DOMINIO (fase 3). No es un archivo de pruebas.
// - cauce: una Γ en memoria construida con el NÚCLEO REAL (admitir, transformar, encEntrada, hashPaso): cada propuesta
//   pasa por Accept del núcleo con la regla de dominio dada (modelo o implementación) como dato del registro.
// - generador de trayectorias (semilla KOBALT_SEED) con los cinco verbos + Lote + FijarParámetro, tres actores con
//   capacidades finas, dos bodegas, canales POS/Web, plantillas de venta, rechazos intercalados.
// Spec: kobalt/specs/2026-11-11_fase3-forma-y-flujo.md §8 («Generador»).

import * as N from '../../src/nucleo/index.mjs';

export const SEMILLA = Number(process.env.KOBALT_SEED ?? 20261112);
export const CASOS = Number(process.env.KOBALT_CASOS_DOMINIO ?? process.env.KOBALT_CASOS ?? 40);
export { N };

export function prng(seed) { // mulberry32
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const elegir = (r, xs) => xs[Math.floor(r() * xs.length)];
export const entero = (r, a, b) => a + Math.floor(r() * (b - a + 1));

export const STREAM_A = 'a1'.repeat(16);
export const STREAM_B = 'b2'.repeat(16);

/** Génesis de dominio. `C0extra` sobrescribe parámetros (p. ej. perfil v2: liberaciones = []). */
export function genesis(M, C0extra = {}, streamId = STREAM_A) {
  return { streamId, predecesor: null, C0: { 'nucleo.regla': M.ID_REGLA, 'nucleo.constituyente': 'dueño', 'nucleo.capacidades': { 'dueño': ['*'] }, ...C0extra } };
}
/** Génesis con los tres actores del generador (propietario, cajero «caja», vendedor «U1»), lector e intruso sin capacidad. */
export function genesisActores(M, C0extra = {}, streamId = STREAM_A) {
  return genesis(M, {
    'nucleo.capacidades': { 'dueño': ['*'], caja: M.CAPACIDADES.cajero, U1: M.CAPACIDADES.vendedor, lector: [] },
    'dominio.alcancePropio': { caja: M.ALCANCE.cajero, U1: M.ALCANCE.vendedor },
    ...C0extra,
  }, streamId);
}

// ─────────── cauce: Γ en memoria sobre el núcleo real ───────────
export function cauce(registro, g) {
  return { g, streamId: g.streamId, registro, entradas: [], bloques: [], hashes: [N.hashGenesis(g)], estados: [N.estadoInicial(g, registro)], sidN: 0 };
}
export const S = Γ => Γ.estados[Γ.estados.length - 1];
export const cabeza = Γ => ({ n: Γ.entradas.length, h: Γ.hashes[Γ.hashes.length - 1] });
export const sidHex = n => n.toString(16).padStart(8, '0');
export function bifurcar(Γ) { return { ...Γ, entradas: [...Γ.entradas], bloques: [...Γ.bloques], hashes: [...Γ.hashes], estados: [...Γ.estados] }; }
/** Propone sol = {u, tipo, args, sid?} sobre la cabeza de Γ. Si el núcleo la acepta, la anexa (Γ es append‑only). */
export function proponer(Γ, sol) {
  const St = S(Γ);
  const e = { epoca: St.epoca, u: sol.u, sid: sol.sid ?? sidHex(++Γ.sidN), deps: [], clase: N.claseDe(sol.tipo), tipo: sol.tipo, args: sol.args ?? null };
  const r = N.admitir(St, e, { registro: Γ.registro });
  if (!r.ok) return { resultado: r.rechazo, ...(r.motivo !== undefined ? { motivo: r.motivo } : {}), ...(r.i !== undefined ? { i: r.i } : {}) };
  const b = N.encEntrada(e);
  const h = N.hashPaso(Γ.hashes[Γ.hashes.length - 1], b);
  Γ.entradas.push(e); Γ.bloques.push(b); Γ.hashes.push(h); Γ.estados.push(N.transformar(St, e, Γ.registro));
  return { resultado: 'COMPROMETIDO', n: Γ.entradas.length, h };
}
/** Compromete o falla con un mensaje claro. Devuelve n. */
export function comprometer(assert, Γ, sol, msg = '') {
  const r = proponer(Γ, sol);
  assert.equal(r.resultado, 'COMPROMETIDO', `${msg}\n  ${JSON.stringify(sol)}\n  → ${JSON.stringify(r)}`);
  return r.n;
}
export const trayectoria = Γ => ({ streamId: Γ.streamId, g: Γ.g, entradas: Γ.entradas, hashes: Γ.hashes });
export function resolverP(Γ, proy, m = Γ.entradas.length, guardado = null, i = 0, snapshots) {
  return N.resolverProyeccion({ proy, guardado, trayectoria: trayectoria(Γ), i, m, registro: Γ.registro, snapshots });
}
export const consultar = (Γ, proy, m) => resolverP(Γ, proy, m).Y;

// ─────────── atajos de solicitudes ───────────
export const nacer = (u, τ, valores) => ({ u, tipo: `Nacer:${τ}`, args: { valores } });
export const fijar = (u, τ, c, e, v) => ({ u, tipo: `Fijar:${τ}.${c}`, args: { e, v } });
export const añadir = (u, τ, c, e, x) => ({ u, tipo: `Añadir:${τ}.${c}`, args: { e, x } });
export const quitar = (u, τ, c, e, x) => ({ u, tipo: `Quitar:${τ}.${c}`, args: { e, x } });
export const disparar = (u, t, args) => ({ u, tipo: `Disparar:${t}`, args });
export const lote = (u, ...acciones) => ({ u, tipo: 'Lote', args: { acciones: acciones.map(a => ({ tipo: a.tipo, args: a.args })) } });
export const fijarParametro = (u, m) => ({ u, tipo: 'FijarParámetro', args: m });
export const qHex = n => n.toString(16).padStart(2, '0').repeat(32);

// ─────────── generador de trayectorias (§8) ───────────
const SKUS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', ''];
const COLORES = ['Azul', 'Rojo', 'Verde'];
const ACTORES = ['dueño', 'dueño', 'dueño', 'dueño', 'dueño', 'dueño', 'caja', 'caja', 'U1', 'U1', 'lector', 'intruso'];
const MODALIDADES = ['venta.registro', 'venta.suave', 'venta.suave', 'venta.firme', 'venta.inmediata'];

/** Forma extendida compatible: añade «material» (heredable) a producto y el tipo «proveedor». */
export function formaExtendida(Φ) {
  const F = structuredClone(Φ);
  F.tipos.producto.características.material = { clase: 'asignación', valor: { texto: [0, 60] }, heredable: true };
  F.tipos.proveedor = { características: { nombre: { clase: 'asignación', valor: { texto: [1, 80] }, requerida: true } } };
  return F;
}
/** Forma incompatible: quita «color» de variante (rechazada por G^par si alguna variante tiene color). */
export function formaSinColor(Φ) { const F = structuredClone(Φ); delete F.tipos.variante.características.color; return F; }
/** Red con transición nueva «Mermar» (H → descuadre, intra‑especie U, más su holgura): compatible. */
export function redConMermar(𝒩) {
  const R = structuredClone(𝒩);
  const w = { a: ['w'] }, v = { a: ['v'] }, q = { a: ['q'] };
  R.transiciones.Mermar = { args: { w: { ref: 'bodega' }, v: { ref: 'variante' }, q: { entero: [1, 1_000_000_000] } }, nulo: 'rechazar', restricción: 'todas',
    movimientos: [{ desde: ['H', w, v], hacia: ['descuadre', w, v], cantidad: q }, { desde: ['libre', w, v], hacia: ['ext.L'], cantidad: q }] };
  return R;
}
/** Red incompatible: un movimiento entre especies (U → L). */
export function redInterEspecie(𝒩) {
  const R = structuredClone(𝒩);
  const w = { a: ['w'] }, v = { a: ['v'] }, q = { a: ['q'] };
  R.transiciones.Magia = { args: { w: { ref: 'bodega' }, v: { ref: 'variante' }, q: { entero: [1, 9] } }, nulo: 'rechazar', restricción: 'todas',
    movimientos: [{ desde: ['ext.U'], hacia: ['libre', w, v], cantidad: q }] };
  return R;
}

/** Propuesta aleatoria consciente del estado (puede ser inadmisible, no autorizada o mal formada: a propósito). */
export function proponerAleatoria(r, M, St) {
  const D = St.D, par = St.parametros;
  const E = M.entidades(D);
  const de = τ => E.filter(x => x.tipo === τ).map(x => x.id);
  const bod = de('bodega'), prod = de('producto'), vari = de('variante'), ven = de('venta'), dev = de('devolución');
  if (bod.length < 2) return nacer('dueño', 'bodega', { nombre: `B${bod.length + 1}` });
  const u = r() < 0.72 ? 'dueño' : elegir(r, ACTORES);
  const al = xs => (xs.length && r() > 0.04 ? elegir(r, xs) : [entero(r, 200, 299), 0]);
  const x = r();
  const valoresProducto = () => {
    const v = { nombre: `P${entero(r, 1, 99)}`, público: r() < 0.8, precio: elegir(r, [100, 200, 350]) };
    if (r() < 0.6) v.descuento = elegir(r, [0, 0, 50, 500]);
    if (r() < 0.5) v.categoría = elegir(r, ['Ropa', 'Hogar']);
    if (r() < 0.3) v['comercio:marca'] = 'K';
    return v;
  };
  const valoresVariante = p => { const v = { producto: p, sku: elegir(r, SKUS), color: elegir(r, COLORES) }; if (r() < 0.3) v.talla = String(entero(r, 1, 9)); return v; };
  if (x < 0.07 || (vari.length < 3 && r() < 0.5)) {
    const uu = elegir(r, ['dueño', 'dueño', 'U1', 'caja']);
    const acc = [nacer(uu, 'producto', valoresProducto())];
    for (let k = entero(r, 0, 2); k > 0; k--) acc.push(nacer(uu, 'variante', valoresVariante({ nacido: 0 })));
    return lote(uu, ...acc);
  }
  if (x < 0.11) return nacer(elegir(r, ['dueño', 'U1']), 'variante', valoresVariante(al(prod)));
  if (x < 0.19) {
    const todos = E.map(y => y.id);
    const e = al(todos);
    const τ = E.find(y => y.id[0] === e[0] && y.id[1] === e[1])?.tipo ?? elegir(r, ['producto', 'variante']);
    const c = elegir(r, ['color', 'sku', 'sku', 'umbral', 'precio', 'descuento', 'estado', 'estado', 'nombre', 'temporada', 'comercio:temporada', 'público', 'categoría', 'producto']);
    const valor = { color: elegir(r, COLORES), sku: elegir(r, SKUS), umbral: entero(r, 0, 8), precio: elegir(r, [80, 200, 400]), descuento: elegir(r, [0, 60, 900]),
      estado: elegir(r, ['retirado', 'activo', 'roto']), nombre: 'N', temporada: '2026', 'comercio:temporada': '2026', público: r() < 0.5, categoría: 'Ropa', producto: al(prod) }[c];
    const τs = r() < 0.92 ? τ : elegir(r, ['producto', 'variante', 'venta']);
    return fijar(u, τs, c, e, r() < 0.06 ? null : valor);
  }
  if (x < 0.22) {
    const p = al(prod);
    const el = { Q: qHex(entero(r, 1, 4)), creador: elegir(r, [u, 'dueño']), propósito: elegir(r, ['página', 'vendedor']), audiencia: elegir(r, ['público', 'creador', 'usuarios']), permitidos: r() < 0.5 ? [] : ['U1'] };
    return (r() < 0.65 ? añadir : quitar)(u, 'producto', 'galería', p, el);
  }
  if (x < 0.38) {
    const modo = elegir(r, MODALIDADES);
    const valores = { variante: al(vari), bodega: al(bod), precio: elegir(r, [100, 250]), canal: elegir(r, ['POS', 'POS', 'Web']) };
    return { u: elegir(r, ['dueño', 'dueño', 'caja', 'U1']), ...M.plantillaVenta(modo, valores, entero(r, 1, 4)) };
  }
  if (x < 0.45) return disparar(u, 'Ingresar', { w: al(bod), v: al(vari), q: entero(r, 1, 6) });
  if (x < 0.50) return disparar(u, 'Contar', { w: al(bod), v: al(vari), h: entero(r, 0, 6) });
  if (x < 0.57) return disparar(u, elegir(r, ['Asignar', 'Asignar', 'Asignar.registro']), { s: al(ven), q: entero(r, 1, 3) });
  if (x < 0.63) return disparar(u, 'Despachar', { s: al(ven), q: entero(r, 1, 3) });
  if (x < 0.65) return disparar(u, 'Cancelar', { s: al(ven) });
  if (x < 0.69) return disparar(u, 'Cobrar', { s: al(ven), x: elegir(r, [50, 100, 250, 1000]) });
  if (x < 0.73) return lote(u, nacer(u, 'devolución', { venta: al(ven) }), disparar(u, 'Devolver', { d: { nacido: 0 }, q: entero(r, 1, 2) }));
  if (x < 0.77) return disparar(u, elegir(r, ['Recibir.apto', 'Recibir.noApto']), { d: al(dev), q: entero(r, 1, 2) });
  if (x < 0.79) return disparar(u, 'Reembolsar', { d: al(dev), x: elegir(r, [50, 100, 250]) });
  if (x < 0.84) return disparar(u, elegir(r, ['Transferir.salida', 'Transferir.llegada']), { w: al(bod), w2: al(bod), v: al(vari), q: entero(r, 1, 3) });
  if (x < 0.86) {
    const uu = elegir(r, ['dueño', 'dueño', 'dueño', 'caja']);
    const opciones = [
      () => ({ 'dominio.liberaciones': r() < 0.5 ? [] : M.LIBERACIONES_INICIAL }),
      () => ({ 'dominio.lote': { máximo: 50, guarda: elegir(r, ['final', 'cadaPaso']) } }),
      () => ({ 'dominio.conjunto': { añadirExistente: elegir(r, ['rechazar', 'sinEfecto']), quitarAusente: elegir(r, ['rechazar', 'sinEfecto']) } }),
      () => ({ 'dominio.forma': formaExtendida(par['dominio.forma']) }),
      () => ({ 'dominio.forma': formaSinColor(par['dominio.forma']) }),
      () => ({ 'dominio.red': redConMermar(par['dominio.red']) }),
      () => ({ 'dominio.red': redInterEspecie(par['dominio.red']) }),
    ];
    return fijarParametro(uu, elegir(r, opciones)());
  }
  if (x < 0.88 && par['dominio.red'].transiciones.Mermar) return disparar(u, 'Mermar', { w: al(bod), v: al(vari), q: entero(r, 1, 2) });
  if (x < 0.90 && par['dominio.forma'].tipos.proveedor) return nacer(u, 'proveedor', { nombre: 'Prov' });
  const raras = [
    () => ({ u, tipo: 'VENTA_MAGICA', args: {} }),
    () => ({ u, tipo: 'Lote', args: { acciones: [] } }),
    () => lote(u, lote(u, disparar(u, 'Ingresar', { w: al(bod), v: al(vari), q: 1 }))),
    () => disparar(u, 'Abrir', { x: al(ven) }),
    () => nacer(u, 'fantasma', {}),
    () => disparar(u, 'Inventada', {}),
    () => lote(u, disparar(u, 'Ingresar', { w: al(bod), v: al(vari), q: 2 }), disparar(u, 'Contar', { w: al(bod), v: al(vari), h: 1 })),
  ];
  return elegir(r, raras)();
}

/** Genera y ejecuta una trayectoria con el modelo M sobre el núcleo real. Devuelve {g, sols, resultados, Γ}. */
export function generar(M, seed, largo) {
  const r = prng(seed);
  const perfil = r() < 0.5 ? 'v2' : 'pos';
  const g = genesisActores(M, perfil === 'v2' ? { 'dominio.liberaciones': [] } : {});
  const Γ = cauce(M.REGISTRO, g);
  const L = largo ?? entero(r, 40, 110);
  const sols = [], resultados = [];
  for (let k = 0; k < L; k++) {
    const sol = proponerAleatoria(r, M, S(Γ));
    sol.sid = sidHex(k + 1);
    sols.push(sol);
    resultados.push(proponer(Γ, sol));
  }
  return { g, perfil, sols, resultados, Γ };
}
/** Re‑ejecuta una lista de solicitudes con otro registro (p. ej. la implementación). */
export function reejecutar(registro, g, sols) {
  const Γ = cauce(registro, g);
  const resultados = sols.map(sol => proponer(Γ, sol));
  return { Γ, resultados };
}
