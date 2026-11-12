// Kobalt — MODELO DE REFERENCIA (oráculo) de la regla de dominio `kobalt.dominio@1` (fase 3: Forma + red de flujo).
// Traducción literal de kobalt/specs/2026-11-11_fase3-forma-y-flujo.md (§3–§7, Anexos A, B y «un solo verbo»), montada
// sobre el NÚCLEO REAL aprobado (kobalt/src/nucleo/index.mjs): la regla es un DATO que el núcleo interpreta.
// No optimiza, no persiste, no tiene red. La implementación (kobalt/src/dominio/index.mjs) se compara contra él.
//
// ═══════════════ Correspondencia objeto matemático ↔ símbolo ═══════════════
//   Φ (Forma) · 𝒩 (Red) · liberaciones · alcance propio … ↔ parámetros Σ_r `dominio.*` (SIGMA), valores iniciales
//                                                       FORMA_INICIAL (Anexo A) · RED_INICIAL (§5.3 + Anexo «un solo verbo»)
//   D = (nd, ent, val, conj, m)                        ↔ REGLA.D0 / estado de dominio (§4)
//   ID = (i, j), i = nd + e.ε + 1                       ↔ [i, j] (texto «i.j» como clave interna)
//   acción = δ ∈ ∏_{(e,k)} M_clase(k) (un solo verbo)   ↔ δ = {coordenada ↦ elemento}; compilar(D, e, C) → δ | motivo
//   intérprete = una función por clase de coordenada   ↔ INTERPRETE.{ent, val, conj, m}; aplicar(D, δ)
//   Lote = producto del monoide                         ↔ componer(δ₁, δ₂) (PRODUCTO por clase)
//   Nacer/Fijar/Añadir/Quitar/Disparar = formas de δ    ↔ pasoNacer / pasoFijar / pasoConjunto / disparo
//   guarda universal (L35): m + W ≥ 0 en R_c(t)        ↔ disparo(): «negativo:<lugar>»
//   G^par (compatibilidad de épocas)                    ↔ guardaPar
//   expresiones (sintaxis de la fase 2 §4.2)            ↔ evaluar (evaluador mínimo propio: NO depende de la fase 2)
//   lectores (carac, marcado, dueño, activa, padre…)    ↔ lectores()
//   Π_T, Π_cat, Π_flat(w), Π_marcado, Π_disp, Π_fibra, Π_aud (E1, monoidales) ↔ PROYECCIONES
//
// Leyes: L1, L2, L3, L4, L6, L7, L9, L10, L12, L16, L17, L20, L26, L28, L29, L31, L33, L35; VF1–VF10; Teorema 6.1.
// Etiquetas: lo que este modelo fija y la spec no dice está marcado [D‑verificador] en el informe (pend⁰, motivos, etc.).
// Límites [L]: un solo proceso; no prueba consenso ni exclusión entre dispositivos ni durabilidad.

import { isDeepStrictEqual } from 'node:util';
import * as N from '../../src/nucleo/index.mjs';

export const ID_REGLA = 'kobalt.dominio@1';
const MAX = Number.MAX_SAFE_INTEGER;
const Q9 = 1_000_000_000;
const D12 = 1_000_000_000_000;

// ─────────────────────────── utilidades ───────────────────────────
export const esMapa = v => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Uint8Array);
export const esID = x => Array.isArray(x) && x.length === 2 && Number.isSafeInteger(x[0]) && x[0] >= 1 && Number.isSafeInteger(x[1]) && x[1] >= 0;
export const kid = id => `${id[0]}.${id[1]}`;
export const idDe = k => k.split('.').map(Number);
const cmpID = (a, b) => a[0] - b[0] || a[1] - b[1];
const cmpK = (a, b) => cmpID(idDe(a), idDe(b));
export const claveLugar = (f, idx) => `${f}[${idx.map(kid).join(',')}]`;
export function parsearLugar(cl) {
  const p = cl.indexOf('[');
  const dentro = cl.slice(p + 1, -1);
  return { f: cl.slice(0, p), idx: dentro === '' ? [] : dentro.split(',') };
}
const hexCV = v => Buffer.from(N.cv(v)).toString('hex');
const igual = (a, b) => isDeepStrictEqual(a, b);
const largo = s => [...s].length;
const coincide = (p, t) => p === t || (p.endsWith('*') && t.startsWith(p.slice(0, -1)));
const ERR = motivo => ({ motivo });
const MOTIVO_REF = Symbol('referenciaInexistente');

// ─────────────────────────── Forma inicial (Anexo A) ───────────────────────────
const txt = (a, b) => ({ texto: [a, b] });
const ent = (a, b) => ({ entero: [a, b] });
const BOOL = { bool: true };
const ref = τ => ({ ref: τ });
const opc = tv => ({ opcional: tv });
const asig = (valor, marcas = {}) => ({ clase: 'asignación', valor, ...marcas });
const R_ = { requerida: true }, I_ = { inmutable: true }, H_ = { heredable: true };
const CICLO_ESTADO = { clase: 'ciclo', valor: { enum: ['activo', 'retirado'] }, ciclo: { estados: ['activo', 'retirado'], inicial: 'activo', transiciones: [['activo', 'retirado'], ['retirado', 'activo']] } };
const SIMPLE = { clase: 'asignación', valor: { alguno: [txt(0, 2000), ent(-MAX, MAX), BOOL] }, máximo: 60 };

// expresiones (sintaxis de la fase 2 §4.2)
const V = c => ({ v: c });
const A = n => ({ a: [n] });
const X = n => ({ x: n });
const lee = (id, ...con) => ({ lee: id, con });
const op = (o, ...de) => ({ op: o, de });
const car = (x, k) => lee('carac', x, V(k));
const mk = (f, ...idx) => lee('marcado', V(f), ...idx);
const campo = (x, c) => op('campo', x, V(c));
const xIt = X('it'), xU = X('u'), xE = X('e');
const ES_PROPIETARIO = lee('propietario', xU);
const DUEÑO_E = op('=', lee('dueño', xE), xU);

const ADMITE_AÑADIR_GALERIA = op('y',
  op('=', campo(xIt, 'creador'), xU),
  op('o', car(xE, 'público'), ES_PROPIETARIO, DUEÑO_E),
  op('o', ES_PROPIETARIO, op('y', op('=', campo(xIt, 'propósito'), V('vendedor')), op('≠', campo(xIt, 'audiencia'), V('público'))), DUEÑO_E));
const ADMITE_QUITAR_GALERIA = op('o', ES_PROPIETARIO, DUEÑO_E, op('=', campo(xIt, 'creador'), xU));
const ADMITE_VENTA_VARIANTE = op('y', lee('activa', xIt), lee('activa', lee('padre', xIt)),
  op('o', car(lee('padre', xIt), 'público'), op('=', lee('dueño', xIt), xU), ES_PROPIETARIO));
const RESTRICCION_DESCUENTO = op('o', op('nulo?', car(xE, 'descuento')), op('=', car(xE, 'descuento'), V(0)), op('≤', car(xE, 'descuento'), car(xE, 'precio')));

const GALERIA = {
  clase: 'referencia', cardinalidad: 'muchos',
  valor: { registro: { Q: { Q: true }, creador: txt(1, 200), propósito: { enum: ['página', 'vendedor'] }, audiencia: { enum: ['público', 'creador', 'usuarios'] }, permitidos: { lista: txt(1, 200), máx: 30 } } },
  clave: ['Q', 'creador', 'propósito', 'audiencia'],
  admite: { añadir: ADMITE_AÑADIR_GALERIA, quitar: ADMITE_QUITAR_GALERIA },
};

export const FORMA_INICIAL = Object.freeze({
  tipos: {
    bodega: { características: { nombre: asig(txt(1, 80), R_) } },
    producto: {
      restricciones: [RESTRICCION_DESCUENTO],
      características: {
        nombre: asig(txt(1, 140), { ...R_, ...H_ }), descripción: asig(txt(0, 5000), H_), categoría: asig(txt(0, 120), H_),
        costo: asig(ent(0, D12), H_), precio: asig(ent(0, D12), H_), descuento: asig(ent(0, D12), H_),
        público: asig(BOOL, { ...R_, ...H_ }), estado: { ...CICLO_ESTADO, ...H_ }, galería: GALERIA, '*:*': SIMPLE,
      },
    },
    variante: {
      padre: 'producto', denso: true, κ: ['sku'],
      características: {
        producto: { clase: 'referencia', cardinalidad: 'uno', valor: ref('producto'), ...R_, ...I_ },
        sku: asig(txt(0, 100)), código: asig(txt(0, 100)), color: asig(txt(0, 100)), talla: asig(txt(0, 100)),
        umbral: asig(ent(0, MAX)), estado: CICLO_ESTADO, '*:*': SIMPLE,
      },
    },
    cliente: { características: { nombre: asig(txt(1, 120), R_), contacto: asig(txt(0, 200)) } },
    usuario: { κ: ['principal'], características: { nombre: asig(txt(1, 120), R_), principal: asig(txt(1, 200), { ...R_, ...I_ }), papel: asig(txt(0, 80)) } },
    venta: {
      alNacer: 'Abrir',
      características: {
        variante: { clase: 'referencia', cardinalidad: 'uno', valor: ref('variante'), ...R_, ...I_, admite: { fijar: ADMITE_VENTA_VARIANTE } },
        bodega: { clase: 'referencia', cardinalidad: 'uno', valor: ref('bodega'), ...R_, ...I_ },
        precio: asig(ent(0, D12), { ...R_, ...I_ }), canal: asig(txt(1, 80), { ...R_, ...I_ }),
        cliente: { clase: 'referencia', cardinalidad: 'uno', valor: ref('cliente'), ...I_ }, '*:*': SIMPLE,
      },
    },
    devolución: { alNacer: 'Abrir', características: { venta: { clase: 'referencia', cardinalidad: 'uno', valor: ref('venta'), ...R_, ...I_ } } },
  },
});

// ─────────────────────────── Red inicial (§5.3 + Anexo «un solo verbo»: pend⁰) ───────────────────────────
const fam = (especie, índices, restringida) => ({ especie, índices, restringida });
const BV = ['bodega', 'variante'];
const mov = (desde, hacia, cantidad) => ({ desde, hacia, cantidad });
const trans = o => ({ args: {}, nulo: 'rechazar', restricción: 'todas', ...o });
const aS = A('s'), aD = A('d'), aQ = A('q'), aX = A('x'), aW = A('w'), aW2 = A('w2'), aV = A('v');
const wS = car(aS, 'bodega'), vS = car(aS, 'variante'), pS = car(aS, 'precio'), canalS = car(aS, 'canal');
const sD = car(aD, 'venta'), wD = car(sD, 'bodega'), vD = car(sD, 'variante'), pD = car(sD, 'precio');
const ARGS_SQ = { s: ref('venta'), q: ent(1, Q9) };
const ARGS_DQ = { d: ref('devolución'), q: ent(1, Q9) };
const ARGS_WVQ = { w: ref('bodega'), w2: ref('bodega'), v: ref('variante'), q: ent(1, Q9) };
const DELTA_CONTAR = op('−', A('h'), mk('H', aW, aV));
const venderA = pend => trans({ args: ARGS_SQ, objetivo: aS, canal: canalS, movimientos: [
  mov(['abierta', aS], ['ext.C'], V(1)), mov(['ext.D'], [pend, aS], aQ), mov(['ext.$'], ['porCobrar', aS], op('×', aQ, pS))] });
const asignarDe = pend => trans({ args: ARGS_SQ, objetivo: aS, canal: canalS, movimientos: [
  mov([pend, aS], ['asig', aS], aQ), mov(['libre', wS, vS], ['comprometido', wS, vS], aQ)] });
const coefS = car(X('i0'), 'precio');
const coefD = car(car(X('i0'), 'venta'), 'precio');
const término = (f, coef, clave) => ({ f, coef, clave });
const K0 = [X('i0')], K01 = [X('i0'), X('i1')];

export const RED_INICIAL = Object.freeze({
  familias: {
    H: fam('U', BV, true), noApto: fam('U', BV, true), descuadre: fam('U', BV, false), tránsito: fam('U', ['bodega', 'bodega', 'variante'], true), 'ext.U': fam('U', [], false),
    libre: fam('L', BV, true), comprometido: fam('L', BV, true), 'ext.L': fam('L', [], false),
    pend: fam('D', ['venta'], true), 'pend⁰': fam('D', ['venta'], true), asig: fam('D', ['venta'], true), desp: fam('D', ['venta'], true),
    cancel: fam('D', ['venta'], false), sol: fam('D', ['devolución'], true), recibido: fam('D', ['devolución'], false), 'ext.D': fam('D', [], false),
    porCobrar: fam('$', ['venta'], true), cobrado: fam('$', ['venta'], true), anulado: fam('$', ['venta'], false), reembolsado: fam('$', ['venta'], false), 'ext.$': fam('$', [], false),
    cupo: fam('R', ['devolución'], true), cupoUsado: fam('R', ['devolución'], false), 'ext.R': fam('R', [], false),
    abierta: fam('C', ['*'], true), 'ext.C': fam('C', [], false),
  },
  exterior: { U: 'ext.U', L: 'ext.L', D: 'ext.D', $: 'ext.$', R: 'ext.R', C: 'ext.C' },
  transiciones: {
    Abrir: trans({ interna: true, args: { x: ref('*') }, movimientos: [mov(['ext.C'], ['abierta', aX], V(1))] }),
    Ingresar: trans({ args: { w: ref('bodega'), v: ref('variante'), q: ent(1, Q9), costo: opc(ent(0, D12)) },
      movimientos: [mov(['ext.U'], ['H', aW, aV], aQ), mov(['ext.L'], ['libre', aW, aV], aQ)] }),
    Contar: trans({ args: { w: ref('bodega'), v: ref('variante'), h: ent(0, Q9), motivo: opc(txt(0, 200)) }, restricción: 'ninguna', nulo: 'admitir',
      movimientos: [mov(['descuadre', aW, aV], ['H', aW, aV], DELTA_CONTAR), mov(['ext.L'], ['libre', aW, aV], DELTA_CONTAR)] }),
    Vender: venderA('pend'),
    'Vender.registro': venderA('pend⁰'),
    Asignar: asignarDe('pend'),
    'Asignar.registro': asignarDe('pend⁰'),
    Despachar: trans({ args: ARGS_SQ, objetivo: aS, canal: canalS, movimientos: [
      mov(['asig', aS], ['desp', aS], aQ), mov(['H', wS, vS], ['ext.U'], aQ), mov(['comprometido', wS, vS], ['ext.L'], aQ)] }),
    Cancelar: trans({ args: { s: ref('venta') }, objetivo: aS, canal: canalS, movimientos: [
      mov(['pend', aS], ['cancel', aS], mk('pend', aS)), mov(['pend⁰', aS], ['cancel', aS], mk('pend⁰', aS)),
      mov(['asig', aS], ['cancel', aS], mk('asig', aS)), mov(['comprometido', wS, vS], ['libre', wS, vS], mk('asig', aS)),
      mov(['porCobrar', aS], ['anulado', aS], op('×', op('+', mk('pend', aS), mk('pend⁰', aS), mk('asig', aS)), pS))] }),
    Cobrar: trans({ args: { s: ref('venta'), x: ent(1, D12) }, objetivo: aS, canal: canalS, movimientos: [mov(['porCobrar', aS], ['cobrado', aS], aX)] }),
    Devolver: trans({ args: ARGS_DQ, objetivo: sD, movimientos: [
      mov(['abierta', aD], ['ext.C'], V(1)), mov(['desp', sD], ['sol', aD], aQ), mov(['ext.R'], ['cupo', aD], op('×', aQ, pD))] }),
    'Recibir.apto': trans({ args: ARGS_DQ, objetivo: aD, movimientos: [
      mov(['sol', aD], ['recibido', aD], aQ), mov(['ext.U'], ['H', wD, vD], aQ), mov(['ext.L'], ['libre', wD, vD], aQ)] }),
    'Recibir.noApto': trans({ args: ARGS_DQ, objetivo: aD, movimientos: [mov(['sol', aD], ['recibido', aD], aQ), mov(['ext.U'], ['noApto', wD, vD], aQ)] }),
    Reembolsar: trans({ args: { d: ref('devolución'), x: ent(1, D12) }, objetivo: aD, movimientos: [
      mov(['cupo', aD], ['cupoUsado', aD], aX), mov(['cobrado', sD], ['reembolsado', sD], aX)] }),
    'Transferir.salida': trans({ args: ARGS_WVQ, movimientos: [mov(['H', aW, aV], ['tránsito', aW, aW2, aV], aQ), mov(['libre', aW, aV], ['ext.L'], aQ)] }),
    'Transferir.llegada': trans({ args: ARGS_WVQ, movimientos: [mov(['tránsito', aW, aW2, aV], ['H', aW2, aV], aQ), mov(['ext.L'], ['libre', aW2, aV], aQ)] }),
  },
  // Invariantes de lugar declaradas (VF6–VF9) como DATO: ∀ grupo, Σ coef·m ∈ rango (por defecto [0, 0]).
  auditoría: [
    { nombre: 'VF6', términos: [término('H', V(1), K01), término('libre', V(-1), K01), término('comprometido', V(-1), K01)] },
    { nombre: 'VF7', términos: [término('comprometido', V(1), K01), término('asig', V(-1), [car(X('i0'), 'bodega'), car(X('i0'), 'variante')])] },
    { nombre: 'VF8', términos: [
      ...['pend', 'pend⁰', 'asig', 'desp'].map(f => término(f, coefS, K0)),
      ...['sol', 'recibido'].map(f => término(f, coefD, [car(X('i0'), 'venta')])),
      ...['porCobrar', 'cobrado', 'reembolsado'].map(f => término(f, V(-1), K0))] },
    { nombre: 'VF8.devolución', términos: [término('sol', coefD, K0), término('recibido', coefD, K0), término('cupo', V(-1), K0), término('cupoUsado', V(-1), K0)] },
    { nombre: 'VF9', términos: [término('abierta', V(1), K0)], rango: [0, 1] },
  ],
});

export const LIBERACIONES_INICIAL = Object.freeze([{ transiciones: ['Asignar', 'Despachar'], canal: 'POS', familias: ['libre', 'H'] }]);

// Plantillas de capacidades y alcance (§3, con P‑E y el depósito pend⁰ del Anexo): datos de configuración, no código.
export const CAPACIDADES = Object.freeze({
  propietario: ['*'],
  cajero: ['Lote', 'Nacer:venta', 'Nacer:cliente', 'Nacer:devolución', 'Disparar:Vender', 'Disparar:Vender.registro', 'Disparar:Asignar', 'Disparar:Despachar', 'Disparar:Cobrar', 'Disparar:Devolver'],
  vendedor: ['Lote', 'Nacer:producto', 'Nacer:variante', 'Nacer:cliente', 'Nacer:venta', 'Nacer:devolución', 'Fijar:producto.*', 'Fijar:variante.*',
    'Añadir:producto.galería', 'Quitar:producto.galería', 'Disparar:Vender', 'Disparar:Vender.registro', 'Disparar:Cobrar', 'Disparar:Cancelar', 'Disparar:Devolver'],
  lector: [],
});
export const ALCANCE = Object.freeze({ cajero: ['Disparar:*'], vendedor: ['Fijar:*', 'Nacer:variante', 'Disparar:*'] });

// Plantillas de venta (Anexo, modalidades de la v3): sintaxis de la puerta; lo comprometido es el Lote [P].
export const PLANTILLAS = Object.freeze({
  'venta.registro': ['Vender.registro'],
  'venta.suave': ['Vender'],
  'venta.firme': ['Vender', 'Asignar'],
  'venta.inmediata': ['Vender', 'Asignar', 'Despachar'],
});
/** Expande una plantilla de venta en un Lote: Nacer:venta + Disparar:t{s: @0, q} por cada t. */
export function plantillaVenta(nombre, valores, q) {
  return { tipo: 'Lote', args: { acciones: [{ tipo: 'Nacer:venta', args: { valores } }, ...PLANTILLAS[nombre].map(t => ({ tipo: `Disparar:${t}`, args: { s: { nacido: 0 }, q } }))] } };
}

// ─────────────────────────── Σ_r: dominios y valores iniciales (L31) ───────────────────────────
const CLASES = ['asignación', 'conjunto', 'ciclo', 'referencia'];
const esListaTextos = v => Array.isArray(v) && v.every(x => typeof x === 'string');
function esForma(v) {
  if (!esMapa(v) || !esMapa(v.tipos)) return false;
  for (const t of Object.values(v.tipos)) {
    if (!esMapa(t) || !esMapa(t.características)) return false;
    for (const d of Object.values(t.características)) if (!esMapa(d) || !CLASES.includes(d.clase) || !esMapa(d.valor)) return false;
    if (t.κ !== undefined && !esListaTextos(t.κ)) return false;
    if (t.restricciones !== undefined && !Array.isArray(t.restricciones)) return false;
  }
  return true;
}
function esRed(v) {
  if (!esMapa(v) || !esMapa(v.familias) || !esMapa(v.transiciones)) return false;
  for (const f of Object.values(v.familias)) if (!esMapa(f) || typeof f.especie !== 'string' || !esListaTextos(f.índices) || typeof f.restringida !== 'boolean') return false;
  for (const t of Object.values(v.transiciones)) {
    if (!esMapa(t) || !esMapa(t.args) || !Array.isArray(t.movimientos) || !['admitir', 'rechazar'].includes(t.nulo)) return false;
    if (!(t.restricción === 'todas' || t.restricción === 'ninguna' || esListaTextos(t.restricción))) return false;
    for (const m of t.movimientos) if (!esMapa(m) || !Array.isArray(m.desde) || !Array.isArray(m.hacia) || typeof m.desde[0] !== 'string' || typeof m.hacia[0] !== 'string') return false;
  }
  return v.auditoría === undefined || Array.isArray(v.auditoría);
}
export const SIGMA = Object.freeze({
  'dominio.forma': { dominio: esForma, inicial: FORMA_INICIAL },
  'dominio.red': { dominio: esRed, inicial: RED_INICIAL },
  'dominio.liberaciones': { dominio: v => Array.isArray(v) && v.every(l => esMapa(l) && esListaTextos(l.transiciones) && typeof l.canal === 'string' && esListaTextos(l.familias)), inicial: LIBERACIONES_INICIAL },
  'dominio.alcancePropio': { dominio: v => esMapa(v) && Object.values(v).every(esListaTextos), inicial: {} },
  // null ⇒ [nucleo.constituyente] (Σ no puede leer la génesis: precisión [D‑verificador] del valor inicial de §3).
  'dominio.propietarios': { dominio: v => v === null || esListaTextos(v), inicial: null },
  'dominio.lote': { dominio: v => esMapa(v) && Number.isSafeInteger(v.máximo) && v.máximo >= 1 && ['cadaPaso', 'final'].includes(v.guarda), inicial: { máximo: 50, guarda: 'cadaPaso' } },
  'dominio.conjunto': { dominio: v => esMapa(v) && ['rechazar', 'sinEfecto'].includes(v.añadirExistente) && ['rechazar', 'sinEfecto'].includes(v.quitarAusente), inicial: { añadirExistente: 'rechazar', quitarAusente: 'rechazar' } },
});
export const propietarios = par => par['dominio.propietarios'] ?? [par['nucleo.constituyente']];

// ─────────────────────────── evaluador de expresiones (sintaxis fase 2 §4.2; total y determinista) ───────────────────────────
const entSeguro = n => (Number.isSafeInteger(n) ? n : null);
export function evaluar(x, c) {
  if (!esMapa(x)) return null;
  if (Object.hasOwn(x, 'v')) return x.v;
  if (Object.hasOwn(x, 'a')) {
    let o = c.args;
    for (const k of x.a) { if (!(esMapa(o) || Array.isArray(o)) || !Object.hasOwn(o, k)) return null; o = o[k]; }
    return o === undefined ? null : o;
  }
  if (Object.hasOwn(x, 'p')) return c.par?.[x.p] ?? null;
  if (Object.hasOwn(x, 'x')) return c.vars && Object.hasOwn(c.vars, x.x) ? c.vars[x.x] : null;
  if (Object.hasOwn(x, 'e')) return c.entrada?.[x.e] ?? null;
  if (Object.hasOwn(x, 'lee')) {
    const f = c.lectores?.[x.lee];
    if (typeof f !== 'function') return null;
    const r = f(...(x.con ?? []).map(y => evaluar(y, c)));
    return r === undefined ? null : r;
  }
  if (Object.hasOwn(x, 'op')) return operar(x.op, x.de ?? [], c);
  return null;
}
function operar(o, de, c) {
  const ev = i => evaluar(de[i], c);
  const todos = () => de.map((_, i) => ev(i));
  switch (o) {
    case 'y': for (let i = 0; i < de.length; i++) if (ev(i) !== true) return false; return true;
    case 'o': for (let i = 0; i < de.length; i++) if (ev(i) === true) return true; return false;
    case 'no': return ev(0) !== true;
    case 'si': return ev(0) === true ? ev(1) : ev(2);
    case '+': { const xs = todos(); if (!xs.every(Number.isSafeInteger)) return null; return entSeguro(xs.reduce((a, b) => a + b, 0)); }
    case '×': { const xs = todos(); if (!xs.every(Number.isSafeInteger)) return null; return entSeguro(xs.reduce((a, b) => a * b, 1)); }
    case '−': { const [a, b] = [ev(0), ev(1)]; return Number.isSafeInteger(a) && Number.isSafeInteger(b) ? entSeguro(a - b) : null; }
    case '=': return igual(ev(0), ev(1));
    case '≠': return !igual(ev(0), ev(1));
    case '<': case '≤': { const [a, b] = [ev(0), ev(1)]; if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) return null; return o === '<' ? a < b : a <= b; }
    case 'en': { const [a, l] = [ev(0), ev(1)]; return Array.isArray(l) ? l.some(y => igual(y, a)) : null; }
    case 'campo': { const [m, k] = [ev(0), ev(1)]; return esMapa(m) && typeof k === 'string' && Object.hasOwn(m, k) ? m[k] : null; }
    case 'nulo?': return ev(0) === null;
    case 'lista': return todos();
    case 'long': { const a = ev(0); return Array.isArray(a) ? a.length : typeof a === 'string' ? largo(a) : null; }
    case 'prefijo': { const [a, b] = [ev(0), ev(1)]; return typeof a === 'string' && typeof b === 'string' ? b.startsWith(a) : null; }
    default: return null;
  }
}

// ─────────────────────────── tipos de valor ───────────────────────────
export function valido(tv, v) {
  if (!esMapa(tv)) return false;
  if (Object.hasOwn(tv, 'opcional')) return valido(tv.opcional, v);
  if (Object.hasOwn(tv, 'texto')) return typeof v === 'string' && largo(v) >= tv.texto[0] && largo(v) <= tv.texto[1];
  if (Object.hasOwn(tv, 'entero')) return Number.isSafeInteger(v) && v >= tv.entero[0] && v <= tv.entero[1];
  if (Object.hasOwn(tv, 'bool')) return typeof v === 'boolean';
  if (Object.hasOwn(tv, 'Q')) return typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
  if (Object.hasOwn(tv, 'enum')) return tv.enum.some(x => igual(x, v));
  if (Object.hasOwn(tv, 'ref')) return esID(v);
  if (Object.hasOwn(tv, 'lista')) return Array.isArray(v) && v.length <= (tv.máx ?? MAX) && v.every(x => valido(tv.lista, x));
  if (Object.hasOwn(tv, 'registro')) {
    if (!esMapa(v) || !Object.keys(v).every(c => Object.hasOwn(tv.registro, c))) return false;
    return Object.entries(tv.registro).every(([c, t]) => (Object.hasOwn(v, c) ? valido(t, v[c]) : Object.hasOwn(t, 'opcional')));
  }
  if (Object.hasOwn(tv, 'alguno')) return tv.alguno.some(t => valido(t, v));
  return false;
}
function refsDe(tv, v, out) {
  if (!esMapa(tv)) return out;
  if (Object.hasOwn(tv, 'opcional')) return refsDe(tv.opcional, v, out);
  if (Object.hasOwn(tv, 'ref')) { if (esID(v)) out.push({ τ: tv.ref, id: v }); }
  else if (Object.hasOwn(tv, 'lista') && Array.isArray(v)) v.forEach(x => refsDe(tv.lista, x, out));
  else if (Object.hasOwn(tv, 'registro') && esMapa(v)) for (const [c, t] of Object.entries(tv.registro)) { if (Object.hasOwn(v, c)) refsDe(t, v[c], out); }
  else if (Object.hasOwn(tv, 'alguno')) { const t = tv.alguno.find(t2 => valido(t2, v)); if (t) refsDe(t, v, out); }
  return out;
}

// ─────────────────────────── Forma: declaración, herencia, actividad, dueño ───────────────────────────
const esConj = d => d.clase === 'conjunto' || (d.clase === 'referencia' && d.cardinalidad === 'muchos');
const esFamilia = k => k.includes('*');
const RE_CLAVE_NS = /^([^:|*[\]]+):([^:|*[\]]+)$/;
/** Declaración de k en τ: exacta, o por familia «ns:*», o «*:*». */
export function declaracion(Φ, τ, k) {
  const t = Φ?.tipos?.[τ];
  if (!esMapa(t) || typeof k !== 'string' || k.includes('|') || esFamilia(k)) return null;
  if (Object.hasOwn(t.características, k)) return t.características[k];
  const m = RE_CLAVE_NS.exec(k);
  if (!m) return null;
  return t.características[`${m[1]}:*`] ?? t.características['*:*'] ?? null;
}
const claveDeclaracion = (Φ, τ, k) => {
  const t = Φ.tipos[τ];
  if (Object.hasOwn(t.características, k)) return k;
  const m = RE_CLAVE_NS.exec(k);
  return m ? (Object.hasOwn(t.características, `${m[1]}:*`) ? `${m[1]}:*` : '*:*') : null;
};
export const claveElemento = (d, x) => hexCV(Array.isArray(d.clave) ? d.clave.map(c => (esMapa(x) && Object.hasOwn(x, c) ? x[c] : null)) : x);

/** Acceso a secciones propias: sobre D (estado) o sobre las secciones del catálogo (obs de Π_cat). */
export function accD(D) {
  return {
    ent: k => D.ent[k] ?? null,
    propio: (k, c) => {
      if (D.val[k] && Object.hasOwn(D.val[k], c)) return D.val[k][c];
      if (D.conj[k] && Object.hasOwn(D.conj[k], c)) { const s = D.conj[k][c]; return Object.keys(s).sort().map(h => s[h]); }
      return undefined;
    },
    claves: () => Object.keys(D.ent),
    propias: k => [...Object.keys(D.val[k] ?? {}), ...Object.keys(D.conj[k] ?? {})],
  };
}
export function accSecciones(secs) {
  return {
    ent: k => (secs[k] ? { tipo: secs[k].tipo, creador: secs[k].creador, padre: secs[k].padre } : null),
    propio: (k, c) => (secs[k] && Object.hasOwn(secs[k].propia, c) ? secs[k].propia[c] : undefined),
    claves: () => Object.keys(secs),
    propias: k => Object.keys(secs[k]?.propia ?? {}),
  };
}
/** efectiva(e,k) = propia | efectiva(padre, k) si heredable en tipo(padre) | defecto | (conjunto ⇒ []) | desconocido (undefined). */
export function efectiva(acc, Φ, k, c) {
  const e = acc.ent(k);
  if (!e) return undefined;
  const propio = acc.propio(k, c);
  if (propio !== undefined) return propio;
  let d = declaracion(Φ, e.tipo, c);
  if (e.padre) {
    const pk = kid(e.padre), pe = acc.ent(pk);
    const dp = pe ? declaracion(Φ, pe.tipo, c) : null;
    if (dp?.heredable) return efectiva(acc, Φ, pk, c);
    d = d ?? dp;
  }
  if (!d) return undefined;
  if (d.defecto !== undefined && d.defecto !== 'desconocido') return d.defecto;
  if (d.clase === 'ciclo') return d.ciclo.inicial;
  if (esConj(d)) return [];
  return undefined;
}
const ESTADO = 'estado', ACTIVO = 'activo';
export function activaAcc(acc, Φ, k) {
  const v = efectiva(acc, Φ, k, ESTADO);
  return v === undefined ? true : v === ACTIVO;
}
export function dueñoAcc(acc, k) {
  let e = acc.ent(k), n = 0;
  while (e && e.padre && n++ < 1000) e = acc.ent(kid(e.padre)) ?? null;
  return e ? e.creador : null;
}

function lectores(acc, D, par) {
  const Φ = par['dominio.forma'];
  const enT = id => esID(id) && acc.ent(kid(id)) !== null;
  return {
    carac: (id, c) => { if (!enT(id) || typeof c !== 'string') return null; const v = efectiva(acc, Φ, kid(id), c); return v === undefined ? null : v; },
    activa: id => (enT(id) ? activaAcc(acc, Φ, kid(id)) : null),
    padre: id => (enT(id) ? acc.ent(kid(id)).padre ?? null : null),
    dueño: id => (enT(id) ? dueñoAcc(acc, kid(id)) : null),
    creador: id => (enT(id) ? acc.ent(kid(id)).creador : null),
    tipo: id => (enT(id) ? acc.ent(kid(id)).tipo : null),
    propietario: u => typeof u === 'string' && propietarios(par).includes(u),
    marcado: (f, ...idx) => (D && typeof f === 'string' && idx.every(esID) ? (D.m[claveLugar(f, idx)] ?? 0) : null),
    'disp.libre': id => (D && esID(id) ? libreTotal(D, kid(id)) : null),
  };
}
// Configuración de las preguntas de disponibilidad (L11: la disponibilidad mostrada es configuración de la pregunta).
export const DISP = Object.freeze({ H: 'H', libre: 'libre', comprometido: 'comprometido', pend: 'pend', pend0: 'pend⁰', noApto: 'noApto', descuadre: 'descuadre', venta: 'venta', bodega: 'bodega', variante: 'variante' });
function libreTotal(D, vk) {
  let t = 0;
  for (const [cl, n] of Object.entries(D.m)) { const { f, idx } = parsearLugar(cl); if (f === DISP.libre && idx[1] === vk) t += Math.max(0, n); }
  return t;
}

// ─────────────────────────── δ: el único verbo (Anexo) ───────────────────────────
// Coordenadas: «ent|i.j» (nacimiento) · «val|i.j|k» (último: {=v}) · «conj|i.j|k» ((A,Q)) · «m|lugar» ({+q} ∪ {=h}).
const claseCoord = ck => ck.slice(0, ck.indexOf('|'));
function partir(ck) {
  const p = ck.indexOf('|'), clase = ck.slice(0, p), resto = ck.slice(p + 1);
  if (clase === 'val' || clase === 'conj') { const q = resto.indexOf('|'); return [clase, resto.slice(0, q), resto.slice(q + 1)]; }
  return [clase, resto, null];
}
const sinClaves = (m, ks) => { const r = { ...m }; for (const k of ks) delete r[k]; return r; };
/** Operación del monoide de cada clase de coordenada (para Lote = producto). */
export const PRODUCTO = Object.freeze({
  ent: () => { throw new Error('dos nacimientos en la misma coordenada'); },
  val: (a, b) => b,
  conj: (a, b) => ({ A: { ...sinClaves(a.A, Object.keys(b.Q)), ...b.A }, Q: { ...sinClaves(a.Q, Object.keys(b.A)), ...b.Q } }),
  m: (a, b) => (Object.hasOwn(b, '=') ? b : Object.hasOwn(a, '=') ? { '=': a['='] + b['+'] } : { '+': a['+'] + b['+'] }),
});
/** Acción de cada clase sobre su valor: el intérprete (una función por clase de coordenada). */
export const INTERPRETE = Object.freeze({
  ent: (actual, el) => { if (actual !== undefined) throw new Error('nacimiento sobre coordenada existente'); return el.nace; },
  val: (actual, el) => (el['='] === null ? undefined : el['=']),
  conj: (actual, el) => { const r = sinClaves(actual ?? {}, Object.keys(el.Q)); Object.assign(r, el.A); return Object.keys(r).length ? r : undefined; },
  m: (actual, el) => { const v = Object.hasOwn(el, '=') ? el['='] : (actual ?? 0) + el['+']; return v === 0 ? undefined : v; },
});
export function componer(δ1, δ2) {
  const r = { ...δ1 };
  for (const [ck, b] of Object.entries(δ2)) r[ck] = Object.hasOwn(r, ck) ? PRODUCTO[claseCoord(ck)](r[ck], b) : b;
  return r;
}
/** aplicar(D, δ): S'(e,k) = m_{e,k} · S(e,k), coordenada a coordenada. Pura (copia en escritura). */
export function aplicar(D, δ) {
  const out = { ...D };
  const copiado = new Set();
  const cow = c => { if (!copiado.has(c)) { out[c] = { ...out[c] }; copiado.add(c); } return out[c]; };
  for (const [ck, el] of Object.entries(δ)) {
    const [clase, a, b] = partir(ck);
    if (clase === 'ent') cow('ent')[a] = INTERPRETE.ent(out.ent[a], el);
    else if (clase === 'm') { const v = INTERPRETE.m(out.m[a], el); const m = cow('m'); if (v === undefined) delete m[a]; else m[a] = v; }
    else {
      const campoD = clase === 'val' ? 'val' : 'conj';
      const tabla = cow(campoD);
      const sec = { ...(tabla[a] ?? {}) };
      const v = INTERPRETE[clase](sec[b], el);
      if (v === undefined) delete sec[b]; else sec[b] = v;
      if (Object.keys(sec).length) tabla[a] = sec; else delete tabla[a];
    }
  }
  return out;
}

// ─────────────────────────── compilación de una acción a δ (guardas en el orden de §5.1) ───────────────────────────
function resolver(v, cx) {
  if (esMapa(v)) {
    const ks = Object.keys(v);
    if (ks.length === 1 && ks[0] === 'nacido') {
      if (!Number.isSafeInteger(v.nacido) || v.nacido < 0 || v.nacido >= cx.nacidos.length) throw MOTIVO_REF;
      return [...cx.nacidos[v.nacido]];
    }
    const o = {};
    for (const k of ks) o[k] = resolver(v[k], cx);
    return o;
  }
  if (Array.isArray(v)) return v.map(x => resolver(x, cx));
  return v;
}
const resolverSeguro = (v, cx) => { try { return { v: resolver(v, cx) }; } catch (e) { if (e === MOTIVO_REF) return null; throw e; } };
const alcanza = (par, u, tipo) => { const pats = par['dominio.alcancePropio']?.[u]; return Array.isArray(pats) && pats.some(p => coincide(p, tipo)); };
function comprobarRefs(acc, refs) {
  for (const r of refs) {
    const e = acc.ent(kid(r.id));
    if (!e) return 'referenciaInexistente';
    if (r.τ !== '*' && e.tipo !== r.τ) return 'referenciaTipo';
  }
  return null;
}
function κLibre(D, Φ, k) {
  const e = D.ent[k];
  const κ = Φ.tipos[e.tipo]?.κ;
  if (!Array.isArray(κ) || κ.length === 0) return null;
  const acc = accD(D);
  const tupla = x => κ.map(c => acc.propio(x, c));
  const vacía = t => t.some(x => x === undefined || x === null || x === '');
  const t0 = tupla(k);
  if (vacía(t0) || !activaAcc(acc, Φ, k)) return null;
  for (const k2 of Object.keys(D.ent)) {
    if (k2 === k || D.ent[k2].tipo !== e.tipo || !activaAcc(acc, Φ, k2)) continue;
    const t2 = tupla(k2);
    if (!vacía(t2) && igual(t0, t2)) return 'κDuplicada';
  }
  return null;
}
function restricciones(D, cx, τ, id) {
  for (const ρ of cx.Φ.tipos[τ].restricciones ?? []) {
    if (evaluar(ρ, { vars: { e: id, u: cx.u }, par: cx.par, lectores: lectores(accD(D), D, cx.par) }) !== true) return 'restricción';
  }
  return null;
}
function excedeMáximo(D, Φ, τ, k, c) {
  const kd = claveDeclaracion(Φ, τ, c);
  const d = Φ.tipos[τ].características[kd];
  if (!esFamilia(kd) || !Number.isSafeInteger(d.máximo)) return false;
  const n = Object.keys(D.val[k] ?? {}).filter(c2 => claveDeclaracion(Φ, τ, c2) === kd).length;
  return n > d.máximo;
}

function pasoNacer(Dc, a, cx) {
  const τ = a.tipo.slice('Nacer:'.length);
  const tdef = cx.Φ.tipos[τ];
  if (!esMapa(tdef)) return ERR('tipoDesconocido');                                                                   // (1)
  const rv = resolverSeguro(a.args.valores, cx);
  if (!rv) return ERR('referenciaInexistente');
  const valores = rv.v;
  const id = [cx.i, cx.nacidos.length], k = kid(id);
  const cuerpo = {}, refs = [];
  for (const [c, v] of Object.entries(valores)) {                                                                     // (2)
    const d = declaracion(cx.Φ, τ, c);
    if (!d) return ERR('característicaDesconocida');
    if (esConj(d)) {
      if (!Array.isArray(v) || !v.every(x => valido(d.valor, x))) return ERR('valorInválido');
      const Am = {};
      for (const x of v) Am[claveElemento(d, x)] = x;
      cuerpo[`conj|${k}|${c}`] = { A: Am, Q: {} };
      for (const x of v) refsDe(d.valor, x, []).forEach(r => refs.push({ ...r, d }));
    } else {
      if (v === null || !valido(d.valor, v)) return ERR('valorInválido');
      if (d.clase === 'ciclo' && !d.ciclo.estados.includes(v)) return ERR('cicloInválido');
      cuerpo[`val|${k}|${c}`] = { '=': v };
      refsDe(d.valor, v, []).forEach(r => refs.push({ ...r, d }));
    }
  }
  for (const [c, d] of Object.entries(tdef.características)) {
    if (esFamilia(c)) continue;
    if (d.requerida && !Object.hasOwn(valores, c)) return ERR('requerida');
    if (d.clase === 'ciclo' && !Object.hasOwn(valores, c)) cuerpo[`val|${k}|${c}`] = { '=': d.ciclo.inicial };
  }
  const acc = accD(Dc);
  const mr = comprobarRefs(acc, refs);                                                                                // (3)
  if (mr) return ERR(mr);
  for (const r of refs) {
    const φ = r.d.admite?.fijar;
    if (φ && evaluar(φ, { vars: { u: cx.u, it: r.id, e: id }, par: cx.par, lectores: lectores(acc, Dc, cx.par) }) !== true) return ERR('admite');
  }
  let padre = null;                                                                                                   // (4)
  if (tdef.padre) { padre = valores[tdef.padre]; if (!esID(padre)) return ERR('padre'); }
  let δ = { [`ent|${k}`]: { nace: { tipo: τ, creador: cx.u, padre } }, ...cuerpo };
  const Dt = aplicar(Dc, δ);
  if (excedeMáximoTodas(Dt, cx.Φ, τ, k)) return ERR('máximo');
  const mκ = κLibre(Dt, cx.Φ, k);                                                                                     // (5)
  if (mκ) return ERR(mκ);
  const mρ = restricciones(Dt, cx, τ, id);                                                                            // (6)
  if (mρ) return ERR(mρ);
  if (alcanza(cx.par, cx.u, a.tipo) && (!padre || dueñoAcc(accD(Dt), kid(padre)) !== cx.u)) return ERR('ajeno');     // (7)
  if (tdef.alNacer) {                                                                                                 // (8)
    const r = disparo(Dt, tdef.alNacer, { x: id }, cx, true);
    if (r.motivo) return r;
    δ = componer(δ, r.δ);
  }
  cx.nacidos.push(id);
  return { δ };
}
function excedeMáximoTodas(D, Φ, τ, k) {
  const vistas = new Set();
  for (const c of Object.keys(D.val[k] ?? {})) {
    const kd = claveDeclaracion(Φ, τ, c);
    if (vistas.has(kd)) continue;
    vistas.add(kd);
    if (excedeMáximo(D, Φ, τ, k, c)) return true;
  }
  return false;
}

const RE_FIJAR = /^(Fijar|Añadir|Quitar):([^.:*|]+)\.(.+)$/;
function objetivoEntidad(Dc, a, cx) {
  const [, verbo, τ, c] = RE_FIJAR.exec(a.tipo);
  const re = resolverSeguro(a.args.e, cx);
  if (!re || !esID(re.v)) return ERR('referenciaInexistente');
  const k = kid(re.v), acc = accD(Dc), en = acc.ent(k);
  if (!en) return ERR('referenciaInexistente');
  if (en.tipo !== τ) return ERR('tipoIncoherente');
  const d = declaracion(cx.Φ, τ, c);
  if (!d) return ERR('característicaDesconocida');
  return { verbo, τ, c, id: re.v, k, acc, d };
}
function pasoFijar(Dc, a, cx) {
  const o = objetivoEntidad(Dc, a, cx);
  if (o.motivo) return o;
  const { τ, c, id, k, acc, d } = o;
  if (esConj(d)) return ERR('claseIncompatible');
  if (d.inmutable) return ERR('inmutable');
  const rv = resolverSeguro(a.args.v, cx);
  if (!rv) return ERR('referenciaInexistente');
  const v = rv.v;
  if (v === null) {
    if (d.requerida) return ERR('requerida');
    if (d.clase === 'ciclo') return ERR('valorInválido');
  } else {
    if (!valido(d.valor, v)) return ERR('valorInválido');
    if (d.clase === 'ciclo') {
      const actual = acc.propio(k, c) ?? d.ciclo.inicial;
      if (!d.ciclo.transiciones.some(([x, y]) => x === actual && y === v)) return ERR('cicloInválido');
    }
    const refs = refsDe(d.valor, v, []);
    const mr = comprobarRefs(acc, refs);
    if (mr) return ERR(mr);
    for (const r of refs) {
      if (d.admite?.fijar && evaluar(d.admite.fijar, { vars: { u: cx.u, it: r.id, e: id }, par: cx.par, lectores: lectores(acc, Dc, cx.par) }) !== true) return ERR('admite');
    }
  }
  const δ = { [`val|${k}|${c}`]: { '=': v } };
  const Dt = aplicar(Dc, δ);
  if (v !== null && excedeMáximo(Dt, cx.Φ, τ, k, c)) return ERR('máximo');
  const reactiva = !activaAcc(acc, cx.Φ, k) && activaAcc(accD(Dt), cx.Φ, k);
  if ((cx.Φ.tipos[τ].κ ?? []).includes(c) || reactiva) { const mκ = κLibre(Dt, cx.Φ, k); if (mκ) return ERR(mκ); }
  const mρ = restricciones(Dt, cx, τ, id);
  if (mρ) return ERR(mρ);
  if (alcanza(cx.par, cx.u, a.tipo) && dueñoAcc(acc, k) !== cx.u) return ERR('ajeno');
  return { δ };
}
function pasoConjunto(Dc, a, cx) {
  const o = objetivoEntidad(Dc, a, cx);
  if (o.motivo) return o;
  const { verbo, c, id, k, acc, d } = o;
  if (!esConj(d)) return ERR('claseIncompatible');
  const rx = resolverSeguro(a.args.x, cx);
  if (!rx) return ERR('referenciaInexistente');
  const x = rx.v;
  if (!valido(d.valor, x)) return ERR('valorInválido');
  const mr = comprobarRefs(acc, refsDe(d.valor, x, []));
  if (mr) return ERR(mr);
  const φ = d.admite?.[verbo === 'Añadir' ? 'añadir' : 'quitar'];
  if (φ && evaluar(φ, { vars: { u: cx.u, it: x, e: id }, par: cx.par, lectores: lectores(acc, Dc, cx.par) }) !== true) return ERR('admite');
  const cl = claveElemento(d, x);
  const actual = Dc.conj[k]?.[c] ?? {};
  const presente = Object.hasOwn(actual, cl);
  const pol = cx.par['dominio.conjunto'];
  if (verbo === 'Añadir' && presente && pol.añadirExistente === 'rechazar') return ERR('yaPresente');
  if (verbo === 'Quitar' && !presente && pol.quitarAusente === 'rechazar') return ERR('ausente');
  if (verbo === 'Añadir' && Number.isSafeInteger(d.máximo) && !presente && Object.keys(actual).length + 1 > d.máximo) return ERR('máximo');
  if (alcanza(cx.par, cx.u, a.tipo) && dueñoAcc(acc, k) !== cx.u) return ERR('ajeno');
  // sinEfecto = se admite; el efecto es el elemento (A,Q) del monoide (reemplazo por clave): precisión [D‑verificador].
  return { δ: { [`conj|${k}|${c}`]: verbo === 'Añadir' ? { A: { [cl]: x }, Q: {} } : { A: {}, Q: { [cl]: x } } } };
}

/** Disparo de t (§5.3): W = Σ cantidad·(𝟙_hacia − 𝟙_desde); guarda universal m + W ≥ 0 en R_c(t) ∖ liberadas. */
function disparo(Dc, t, args, cx, interna) {
  const T = cx.𝒩.transiciones[t];
  if (!esMapa(T)) return ERR('transiciónDesconocida');
  if (T.interna && !interna) return ERR('transiciónInterna');
  const ra = resolverSeguro(args, cx);
  if (!ra) return ERR('referenciaInexistente');
  const as = ra.v;
  if (!esMapa(as)) return ERR('argumentos');
  for (const k of Object.keys(as)) if (!Object.hasOwn(T.args, k)) return ERR('argumentos');
  const refs = [];
  for (const [k, tv] of Object.entries(T.args)) {
    if (!Object.hasOwn(as, k)) { if (!Object.hasOwn(tv, 'opcional')) return ERR('argumentos'); continue; }
    if (!valido(tv, as[k])) return ERR('argumentos');
    refsDe(tv, as[k], refs);
  }
  const acc = accD(Dc);
  const mr = comprobarRefs(acc, refs);
  if (mr) return ERR(mr);
  const C = { args: as, vars: { u: cx.u }, par: cx.par, lectores: lectores(acc, Dc, cx.par) };
  const lugar = xs => {
    const f = xs[0], F = cx.𝒩.familias[f];
    if (!esMapa(F) || xs.length - 1 !== F.índices.length) return ERR('familiaDesconocida');
    const idx = [];
    for (let n = 1; n < xs.length; n++) {
      const id = evaluar(xs[n], C);
      if (!esID(id) || !acc.ent(kid(id))) return ERR('referenciaInexistente');
      const τ = F.índices[n - 1];
      if (τ !== '*' && acc.ent(kid(id)).tipo !== τ) return ERR('referenciaTipo');
      idx.push(id);
    }
    return { f, clave: claveLugar(f, idx) };
  };
  const movs = [];
  for (const mv of T.movimientos) {                                                                                   // índices
    const l1 = lugar(mv.desde); if (l1.motivo) return l1;
    const l2 = lugar(mv.hacia); if (l2.motivo) return l2;
    movs.push({ l1, l2, mv });
  }
  if (!interna && alcanza(cx.par, cx.u, `Disparar:${t}`)) {                                                           // alcance propio
    const obj = T.objetivo ? evaluar(T.objetivo, C) : null;
    if (!esID(obj) || !acc.ent(kid(obj)) || dueñoAcc(acc, kid(obj)) !== cx.u) return ERR('ajeno');
  }
  const W = new Map(), orden = new Map();
  const sumar = (l, q) => { const v = (W.get(l.clave) ?? 0) + q; if (!Number.isSafeInteger(v)) return false; W.set(l.clave, v); return true; };
  for (const { l1, l2, mv } of movs) {                                                                                // cantidades (estado ANTES)
    const q = evaluar(mv.cantidad, C);
    if (!Number.isSafeInteger(q)) return ERR('cantidad');
    if (!orden.has(l1.clave)) orden.set(l1.clave, l1);
    if (!orden.has(l2.clave)) orden.set(l2.clave, l2);
    if (!sumar(l2, q) || !sumar(l1, -q)) return ERR('cantidad');
  }
  if ([...W.values()].every(w => w === 0) && T.nulo !== 'admitir') return ERR('sinEfecto');                          // disparo nulo
  const canal = T.canal ? evaluar(T.canal, C) : null;
  const R = T.restricción === 'todas' ? [...new Set([...orden.values()].map(l => l.f))] : T.restricción === 'ninguna' ? [] : T.restricción;
  const lib = new Set();
  for (const l of cx.par['dominio.liberaciones'] ?? []) if (l.transiciones.includes(t) && l.canal === canal) l.familias.forEach(f => lib.add(f));
  const famR = new Set(R.filter(f => cx.𝒩.familias[f]?.restringida === true && !lib.has(f)));
  if (cx.final) famR.forEach(f => cx.restringidas.add(f));
  else {
    for (const l of orden.values()) {                                                                                 // guarda universal (L35)
      const w = W.get(l.clave);
      if (w < 0 && famR.has(l.f) && (Dc.m[l.clave] ?? 0) + w < 0) return ERR(`negativo:${l.clave}`);
    }
  }
  const δ = {};
  for (const l of orden.values()) { const w = W.get(l.clave); if (w !== 0) δ[`m|${l.clave}`] = { '+': w }; }
  return { δ };
}

function paso(Dc, a, cx) {
  if (a.tipo.startsWith('Nacer:')) return pasoNacer(Dc, a, cx);
  if (a.tipo.startsWith('Fijar:')) return pasoFijar(Dc, a, cx);
  if (a.tipo.startsWith('Añadir:') || a.tipo.startsWith('Quitar:')) return pasoConjunto(Dc, a, cx);
  if (a.tipo.startsWith('Disparar:')) return disparo(Dc, a.tipo.slice('Disparar:'.length), a.args, cx, false);
  return ERR('forma');
}
export const accionesDe = e => (e.tipo === 'Lote' ? e.args.acciones : [{ tipo: e.tipo, args: e.args }]);

/** compilar(D, e, C_ε) → {δ, D'} | {motivo}. La entrada es un elemento δ; Lote = producto δ₁·…·δ_k. */
export function compilar(D, e, par) {
  const Φ = par['dominio.forma'], 𝒩 = par['dominio.red'];
  const acciones = accionesDe(e);
  const cfg = par['dominio.lote'];
  if (e.tipo === 'Lote') {
    if (acciones.length < 1 || acciones.length > cfg.máximo) return ERR('loteTamaño');
    if (acciones.some(a => a.tipo === 'Lote')) return ERR('loteAnidado');
  }
  const cx = { i: D.nd + e.epoca + 1, u: e.u, par, Φ, 𝒩, nacidos: [], final: cfg.guarda === 'final', restringidas: new Set() };
  let Dc = D, δ = {};
  for (const a of acciones) {
    const r = paso(Dc, a, cx);
    if (r.motivo) return r;
    Dc = aplicar(Dc, r.δ);
    δ = componer(δ, r.δ);
  }
  if (cx.final) {                                                                                                     // Lote «final»: W = Σ W(a_j)
    for (const [ck, el] of Object.entries(δ)) {
      if (claseCoord(ck) !== 'm' || !(el['+'] < 0)) continue;
      const cl = ck.slice(2);
      if (cx.restringidas.has(parsearLugar(cl).f) && (Dc.m[cl] ?? 0) < 0) return ERR(`negativo:${cl}`);
    }
  }
  return { δ, D: Dc, nacidos: cx.nacidos };
}

// ─────────────────────────── G5 (forma) y E4 (tipos internos) ───────────────────────────
const claves = (m, ks) => esMapa(m) && Object.keys(m).length === ks.length && ks.every(k => Object.hasOwn(m, k));
const esRef = x => esID(x) || (esMapa(x) && Object.keys(x).length === 1 && Number.isSafeInteger(x.nacido) && x.nacido >= 0);
const RE_NACER = /^Nacer:[^.:*|]+$/, RE_DISP = /^Disparar:[^|*]+$/;
const vNacer = (args, tipo) => RE_NACER.test(tipo) && claves(args, ['valores']) && esMapa(args.valores);
const vFijar = (args, tipo) => RE_FIJAR.test(tipo) && tipo.startsWith('Fijar:') && claves(args, ['e', 'v']) && esRef(args.e);
const vConj = (args, tipo) => RE_FIJAR.test(tipo) && !tipo.startsWith('Fijar:') && claves(args, ['e', 'x']) && esRef(args.e);
const vDisp = (args, tipo) => RE_DISP.test(tipo) && esMapa(args);
const vInterna = a => claves(a, ['tipo', 'args']) && typeof a.tipo === 'string'
  && (a.tipo === 'Lote' || vNacer(a.args, a.tipo) || vFijar(a.args, a.tipo) || vConj(a.args, a.tipo) || vDisp(a.args, a.tipo));
export const TIPOS = Object.freeze({
  'Nacer:*': vNacer, 'Fijar:*': vFijar, 'Añadir:*': vConj, 'Quitar:*': vConj, 'Disparar:*': vDisp,
  Lote: args => claves(args, ['acciones']) && Array.isArray(args.acciones) && args.acciones.every(vInterna),
});
export const tiposInternos = e => (e.tipo === 'Lote' ? e.args.acciones.map(a => a.tipo) : []);

// ─────────────────────────── G^par (compatibilidad de épocas, §3) ───────────────────────────
function conValores(D, Φ, τ, kd) {
  for (const [k, e] of Object.entries(D.ent)) {
    if (e.tipo !== τ) continue;
    for (const c of [...Object.keys(D.val[k] ?? {}), ...Object.keys(D.conj[k] ?? {})]) if (claveDeclaracion(Φ, τ, c) === kd) return true;
  }
  return false;
}
function compatForma(Φ, Φ2, D) {
  for (const [τ, t] of Object.entries(Φ.tipos)) {
    const t2 = Φ2.tipos[τ];
    if (!esMapa(t2)) return 'formaQuitaTipo';
    const hay = Object.values(D.ent).some(e => e.tipo === τ);
    if (hay && (t.padre ?? null) !== (t2.padre ?? null)) return 'formaCambiaPadre';
    for (const [kd, d] of Object.entries(t.características)) {
      const d2 = t2.características[kd];
      if (d.inmutable && !(d2?.inmutable)) return 'formaRelajaInmutable';
      if (!conValores(D, Φ, τ, kd)) continue;
      if (!esMapa(d2)) return 'formaQuitaCaracterística';
      if (d2.clase !== d.clase || (d2.cardinalidad ?? null) !== (d.cardinalidad ?? null)) return 'formaCambiaClase';
      if (!igual(d2.valor, d.valor)) return 'formaCambiaValor';
    }
    if (!igual(t.κ ?? [], t2.κ ?? []) && hay) {
      const prueba = { ...D };
      for (const k of Object.keys(D.ent)) if (D.ent[k].tipo === τ && κLibre(prueba, Φ2, k)) return 'κNoÚnica';
    }
  }
  return null;
}
function compatRed(𝒩, 𝒩2, D, Φ2) {
  for (const [cl, n] of Object.entries(D.m)) {
    if (n === 0) continue;
    const { f, idx } = parsearLugar(cl);
    const F = 𝒩.familias[f], F2 = 𝒩2.familias[f];
    if (!esMapa(F2)) return 'redQuitaFamilia';
    if (F2.especie !== F.especie) return 'redCambiaEspecie';
    if (F2.índices.length !== idx.length) return 'redCambiaÍndices';
  }
  for (const F of Object.values(𝒩2.familias)) for (const τ of F.índices) if (τ !== '*' && !esMapa(Φ2.tipos[τ])) return 'redTipoDesconocido';
  for (const T of Object.values(𝒩2.transiciones)) {
    for (const mv of T.movimientos) {
      const Fd = 𝒩2.familias[mv.desde[0]], Fh = 𝒩2.familias[mv.hacia[0]];
      if (!esMapa(Fd) || !esMapa(Fh)) return 'redFamiliaDesconocida';
      if (Fd.especie !== Fh.especie) return 'redInterEspecie';
      if (mv.desde.length - 1 !== Fd.índices.length || mv.hacia.length - 1 !== Fh.índices.length) return 'redCambiaÍndices';
    }
  }
  return null;
}
export function guardaPar(m, D, par) {
  const Φ = par['dominio.forma'], 𝒩 = par['dominio.red'];
  const Φ2 = Object.hasOwn(m, 'dominio.forma') ? m['dominio.forma'] : Φ;
  const 𝒩2 = Object.hasOwn(m, 'dominio.red') ? m['dominio.red'] : 𝒩;
  if (Φ2 !== Φ) { const r = compatForma(Φ, Φ2, D); if (r) return r; }
  if (Φ2 !== Φ || 𝒩2 !== 𝒩) { const r = compatRed(𝒩, 𝒩2, D, Φ2); if (r) return r; }
  return 'ok';
}

// ─────────────────────────── la regla (dato que el núcleo interpreta) ───────────────────────────
export const D0 = Object.freeze({ nd: 0, ent: {}, val: {}, conj: {}, m: {} });
export const REGLA = Object.freeze({
  id: ID_REGLA,
  D0,
  tipos: TIPOS,
  tiposInternos,
  guarda: (D, e, par) => { const r = compilar(D, e, par); return r.motivo ?? 'ok'; },
  T: (D, e, par) => {
    const r = compilar(D, e, par);
    if (r.motivo) throw new Error(`T sobre una entrada inadmisible: ${r.motivo}`);
    const D2 = aplicar(D, r.δ);
    return { nd: D.nd + 1, ent: D2.ent, val: D2.val, conj: D2.conj, m: D2.m };
  },
  sigma: SIGMA,
  guardaPar,
  codD: D => D,
});
export const REGISTRO = Object.freeze({ [ID_REGLA]: REGLA });

// ─────────────────────────── lectores públicos sobre D (preguntas, nunca escritores) ───────────────────────────
export function entidades(D) {
  return Object.keys(D.ent).sort(cmpK).map(k => ({ id: idDe(k), tipo: D.ent[k].tipo, creador: D.ent[k].creador, padre: D.ent[k].padre }));
}
export function seccionPropia(D, id) {
  const k = kid(id), acc = accD(D), out = {};
  for (const c of acc.propias(k)) out[c] = acc.propio(k, c);
  return out;
}
export function secciones(D) {
  const out = {};
  for (const k of Object.keys(D.ent).sort(cmpK)) out[k] = { tipo: D.ent[k].tipo, creador: D.ent[k].creador, padre: D.ent[k].padre, propia: seccionPropia(D, idDe(k)) };
  return out;
}
export const carac = (D, par, id, c) => efectiva(accD(D), par['dominio.forma'], kid(id), c);
export const activa = (D, par, id) => activaAcc(accD(D), par['dominio.forma'], kid(id));
export const dueño = (D, id) => dueñoAcc(accD(D), kid(id));
const densos = (accs, Φ) => accs.claves().filter(k => Φ.tipos[accs.ent(k).tipo]?.denso === true).sort(cmpK).map(idDe);
export const coordenadas = (D, par) => densos(accD(D), par['dominio.forma']);
export function slot(D, par, id) {
  const T = coordenadas(D, par);
  const n = T.findIndex(x => igual(x, id));
  return n < 0 ? null : n + 1;
}
export const marcado = D => ({ ...D.m });
export const valorLugar = (D, f, idx) => D.m[claveLugar(f, idx)] ?? 0;

function disponibilidadDe(m, acc, Φ, w, v) {
  const lv = (f, idx) => m[claveLugar(f, idx)] ?? 0;
  let P = 0, P0 = 0;
  for (const k of acc.claves()) {
    if (acc.ent(k).tipo !== DISP.venta) continue;
    if (!igual(efectiva(acc, Φ, k, DISP.bodega), w) || !igual(efectiva(acc, Φ, k, DISP.variante), v)) continue;
    P += lv(DISP.pend, [idDe(k)]); P0 += lv(DISP.pend0, [idDe(k)]);
  }
  const H = lv(DISP.H, [w, v]), libre = lv(DISP.libre, [w, v]), A = lv(DISP.comprometido, [w, v]);
  return { H, A, P, P0, libre, noAsignada: Math.max(0, libre), prudente: Math.max(0, libre - P), déficit: Math.max(0, -libre),
    noApto: lv(DISP.noApto, [w, v]), descuadre: lv(DISP.descuadre, [w, v]) };
}
/** q_disp(w, v) sobre S (§7.4): los max están en obs (L10 no aplica, Corolario E1.3). */
export const disponibilidad = (D, par, w, v) => disponibilidadDe(D.m, accD(D), par['dominio.forma'], w, v);

/** Auditoría (§7.6): VF5 (conservación por especie) + invariantes declaradas en 𝒩.auditoría. Devuelve las que FALLAN. */
export function auditoria(D, par, sumasEspecie) {
  const 𝒩 = par['dominio.red'];
  const fallos = new Set();
  const porEspecie = {};
  for (const [cl, n] of Object.entries(D.m)) { const e = 𝒩.familias[parsearLugar(cl).f]?.especie ?? '?'; porEspecie[e] = (porEspecie[e] ?? 0) + n; }
  for (const [e, s] of Object.entries(sumasEspecie ?? porEspecie)) if (s !== 0) fallos.add(`VF5:${e}`);
  const L = lectores(accD(D), D, par);
  for (const inv of 𝒩.auditoría ?? []) {
    const grupos = new Map();
    for (const [cl, n] of Object.entries(D.m)) {
      const { f, idx } = parsearLugar(cl);
      for (const t of inv.términos) {
        if (t.f !== f) continue;
        const vars = {};
        idx.forEach((x, j) => { vars[`i${j}`] = idDe(x); });
        const c = { vars, par, lectores: L };
        const coef = evaluar(t.coef, c);
        const g = t.clave.map(y => evaluar(y, c));
        if (!Number.isSafeInteger(coef) || g.some(y => y === null)) { fallos.add(inv.nombre); continue; }
        const h = hexCV(g);
        grupos.set(h, (grupos.get(h) ?? 0) + coef * n);
      }
    }
    const [mín, máx] = inv.rango ?? [0, 0];
    for (const s of grupos.values()) if (s < mín || s > máx) fallos.add(inv.nombre);
  }
  return [...fallos].sort();
}

/** Visibilidad de un elemento de galería (pregunta, no guarda; Anexo A). */
export function visible(D, par, u, id, x) {
  return x.audiencia === 'público' || u === x.creador || u === dueño(D, id) || propietarios(par).includes(u)
    || (x.audiencia === 'usuarios' && Array.isArray(x.permitidos) && x.permitidos.includes(u));
}

function fibraAcc(acc, Φ, c, valor, τ) {
  const ids = acc.claves().filter(k => acc.ent(k).tipo === τ).sort(cmpK);
  const miembros = [], activos = [], conocidos = [];
  for (const k of ids) {
    const v = efectiva(acc, Φ, k, c);
    if (v !== undefined) conocidos.push(idDe(k));
    if (v !== undefined && (Array.isArray(v) && !Array.isArray(valor) ? v.some(y => igual(y, valor)) : igual(v, valor))) miembros.push(idDe(k));
    if (activaAcc(acc, Φ, k)) activos.push(idDe(k));
  }
  return { miembros, activos, conocidos };
}
/** F_{k,v} con máscaras de activos y conocidos (§7.5). El complemento es relativo a los conocidos (L2). */
export const fibra = (D, par, c, valor, τ = 'variante') => fibraAcc(accD(D), par['dominio.forma'], c, valor, τ);
export const complemento = (F, U = F.conocidos) => U.filter(x => !F.miembros.some(y => igual(x, y)));
/** Filtro compuesto (expresión de la fase 2 con x.e ligada a cada entidad del tipo). */
export function filtrar(D, par, τ, φ) {
  const acc = accD(D), L = lectores(acc, D, par);
  return acc.claves().filter(k => acc.ent(k).tipo === τ).sort(cmpK).map(idDe).filter(id => evaluar(φ, { vars: { e: id }, par, lectores: L }) === true);
}
/** Ficha (§7.2): composición en obs de la sección efectiva + existencias (L17). Nunca una autoridad. */
export function ficha(D, par, id) {
  const Φ = par['dominio.forma'], acc = accD(D), k = kid(id), e = acc.ent(k);
  if (!e) return null;
  const cs = new Set([...Object.keys(Φ.tipos[e.tipo].características).filter(c => !esFamilia(c)), ...acc.propias(k)]);
  if (e.padre) {
    const pk = kid(e.padre), pt = Φ.tipos[acc.ent(pk).tipo];
    for (const c of [...Object.keys(pt.características), ...acc.propias(pk)]) if (!esFamilia(c) && declaracion(Φ, acc.ent(pk).tipo, c)?.heredable) cs.add(c);
  }
  const efectivaM = {};
  for (const c of [...cs].sort()) { const v = efectiva(acc, Φ, k, c); if (v !== undefined) efectivaM[c] = v; }
  const existencias = {};
  for (const [cl, n] of Object.entries(D.m)) { const { f, idx } = parsearLugar(cl); if (f === DISP.H && idx[1] === k) existencias[idx[0]] = n; }
  return { id, tipo: e.tipo, slot: slot(D, par, id), efectiva: efectivaM, existencias };
}
/** movimientos(e) = W de la entrada evaluado en S_{k−1} (lector de estado de §7): {lugar ↦ Δ}. */
export function movimientos(D, par, e) {
  if (e.clase !== 'dominio') return {};
  const r = compilar(D, e, par);
  if (r.motivo) throw new Error(`movimientos de una entrada inadmisible: ${r.motivo}`);
  const out = {};
  for (const [ck, el] of Object.entries(r.δ)) if (claseCoord(ck) === 'm' && el['+'] !== 0) out[ck.slice(2)] = el['+'];
  return out;
}

// ─────────────────────────── aportes de entrada (sin estado) ───────────────────────────
/** nacimientos(e, k): IDs (k, j) nacidos en la entrada k, con su tipo. Lector de entrada (no lee S). */
export function nacimientos(e, k) {
  if (e.clase !== 'dominio' || !esMapa(e.args)) return [];
  const out = [];
  for (const a of accionesDe(e)) if (a.tipo.startsWith('Nacer:')) out.push({ id: [k, out.length], tipo: a.tipo.slice('Nacer:'.length) });
  return out;
}
const opEtiqueta = (a, b) => (Object.hasOwn(a, 'último') && Object.hasOwn(b, 'último') ? b
  : Object.hasOwn(a, 'aq') && Object.hasOwn(b, 'aq') ? { aq: PRODUCTO.conj(a.aq, b.aq) } : null);
/** contribuciones(e, k, C): {«i.j|k» ↦ {último: v} | {aq: (A,Q)}} — la parte de δ en coordenadas de sección. Sin estado. */
export function contribuciones(e, k, par) {
  if (e.clase !== 'dominio' || !esMapa(e.args)) return {};
  const Φ = par['dominio.forma'];
  const out = {}, cx = { nacidos: [] };
  const put = (key, tag) => { out[key] = Object.hasOwn(out, key) ? opEtiqueta(out[key], tag) : tag; };
  for (const a of accionesDe(e)) {
    if (a.tipo.startsWith('Nacer:')) {
      const τ = a.tipo.slice('Nacer:'.length), tdef = Φ.tipos[τ];
      const valores = resolver(a.args.valores, cx);
      const id = [k, cx.nacidos.length], ik = kid(id);
      cx.nacidos.push(id);
      put(`${ik}|@tipo`, { último: τ });
      put(`${ik}|@creador`, { último: e.u });
      put(`${ik}|@padre`, { último: tdef.padre ? valores[tdef.padre] : null });
      for (const [c, v] of Object.entries(valores)) {
        const d = declaracion(Φ, τ, c);
        if (esConj(d)) { const Am = {}; for (const x of v) Am[claveElemento(d, x)] = x; put(`${ik}|${c}`, { aq: { A: Am, Q: {} } }); } else put(`${ik}|${c}`, { último: v });
      }
      for (const [c, d] of Object.entries(tdef.características)) if (!esFamilia(c) && d.clase === 'ciclo' && !Object.hasOwn(valores, c)) put(`${ik}|${c}`, { último: d.ciclo.inicial });
    } else if (RE_FIJAR.test(a.tipo)) {
      const [, verbo, τ, c] = RE_FIJAR.exec(a.tipo);
      const ik = kid(resolver(a.args.e, cx));
      if (verbo === 'Fijar') put(`${ik}|${c}`, { último: resolver(a.args.v, cx) });
      else {
        const d = declaracion(Φ, τ, c), x = resolver(a.args.x, cx), cl = claveElemento(d, x);
        put(`${ik}|${c}`, { aq: verbo === 'Añadir' ? { A: { [cl]: x }, Q: {} } : { A: {}, Q: { [cl]: x } } });
      }
    }
  }
  return out;
}
function seccionesDeAcum(acum) {
  const secs = {};
  for (const [key, tag] of Object.entries(acum)) {
    const p = key.indexOf('|'), ik = key.slice(0, p), c = key.slice(p + 1);
    const s = secs[ik] ?? (secs[ik] = { tipo: null, creador: null, padre: null, propia: {} });
    if (c === '@tipo') s.tipo = tag.último;
    else if (c === '@creador') s.creador = tag.último;
    else if (c === '@padre') s.padre = tag.último;
    else if (Object.hasOwn(tag, 'último')) { if (tag.último !== null) s.propia[c] = tag.último; }
    else { const ks = Object.keys(tag.aq.A).sort(); if (ks.length) s.propia[c] = ks.map(h => tag.aq.A[h]); }
  }
  const out = {};
  for (const ik of Object.keys(secs).sort(cmpK)) {
    const s = secs[ik];
    const propia = {};
    for (const c of Object.keys(s.propia).sort()) propia[c] = s.propia[c];
    out[ik] = { ...s, propia };
  }
  return out;
}
const ordenarSecciones = secs => { const out = {}; for (const ik of Object.keys(secs).sort(cmpK)) { const p = {}; for (const c of Object.keys(secs[ik].propia).sort()) p[c] = secs[ik].propia[c]; out[ik] = { ...secs[ik], propia: p }; } return out; };
export const seccionesCanonicas = D => ordenarSecciones(secciones(D));

// ─────────────────────────── proyecciones (E1: forma monoidal del núcleo) ───────────────────────────
const SUMA_POR_CLAVE = Object.freeze({
  unidad: {}, conmutativo: true,
  op: (a, b) => { const r = { ...a }; for (const [k, v] of Object.entries(b)) { const s = (r[k] ?? 0) + v; if (s === 0) delete r[k]; else r[k] = s; } return r; },
  inv: a => Object.fromEntries(Object.entries(a).map(([k, v]) => [k, -v])),
});
const SECUENCIA = Object.freeze({ unidad: [], op: (a, b) => [...a, ...b] });
const MAPA_ETIQUETAS = Object.freeze({ unidad: {}, op: (a, b) => { const r = { ...a }; for (const [k, t] of Object.entries(b)) r[k] = Object.hasOwn(r, k) ? opEtiqueta(r[k], t) : t; return r; } });
const base = (id) => ({ id, ver: 1, sensibleAEpoca: false, sensibleATiempo: false });
const especieDe = (par, cl) => par['dominio.red'].familias[parsearLugar(cl).f]?.especie ?? '?';

export const PROYECCIONES = Object.freeze({
  /** q_T (§7.1): secuencia de los nacimientos densos; slot = posición. No lee el estado. */
  T: Object.freeze({ ...base('dominio.T'), monoide: SECUENCIA,
    f: (e, ctx) => nacimientos(e, ctx.k).filter(n => ctx.parametros['dominio.forma'].tipos[n.tipo]?.denso === true).map(n => n.id),
    obs: acum => acum }),
  /** q_cat (§7.2): mapa(etiquetas) de secciones PROPIAS; herencia y defectos en obs/lectores. No lee el estado. */
  catalogo: Object.freeze({ ...base('dominio.catalogo'), monoide: MAPA_ETIQUETAS,
    f: (e, ctx) => contribuciones(e, ctx.k, ctx.parametros), obs: acum => seccionesDeAcum(acum) }),
  /** marcado: sumaPorClave de los movimientos realizados (pregunta levantada, leeEstado). */
  marcado: Object.freeze({ ...base('dominio.marcado'), monoide: SUMA_POR_CLAVE, leeEstado: true,
    f: (e, ctx) => movimientos(ctx.S.D, ctx.parametros, e), obs: acum => acum }),
  /** q_aud (§7.6): Σ por especie (VF5) + invariantes declaradas sobre S. Debe ser vacía. */
  auditoria: Object.freeze({ ...base('dominio.auditoria'), monoide: SUMA_POR_CLAVE, leeEstado: true,
    f: (e, ctx) => { const out = {}; for (const [cl, d] of Object.entries(movimientos(ctx.S.D, ctx.parametros, e))) { const s = especieDe(ctx.parametros, cl); out[s] = (out[s] ?? 0) + d; } return out; },
    obs: (acum, ctx) => auditoria(ctx.S.D, ctx.parametros, acum) }),
  /** q_flat(w) (§7.3): Δ de H[w,·] por variante; obs alinea con T (defecto 0, L29). */
  flat: (w, defecto = 0) => Object.freeze({ ...base(`dominio.flat:${kid(w)}`), monoide: SUMA_POR_CLAVE, leeEstado: true,
    f: (e, ctx) => { const out = {}; for (const [cl, d] of Object.entries(movimientos(ctx.S.D, ctx.parametros, e))) { const { f, idx } = parsearLugar(cl); if (f === DISP.H && idx[0] === kid(w)) out[idx[1]] = (out[idx[1]] ?? 0) + d; } return out; },
    obs: (acum, ctx) => { const T = coordenadas(ctx.S.D, ctx.parametros); return { T, valores: T.map(v => acum[kid(v)] ?? defecto) }; } }),
  /** q_disp(w, v) (§7.4) como pregunta levantada sumaPorClave sobre los lugares; obs con max. */
  disponibilidad: (w, v) => Object.freeze({ ...base(`dominio.disp:${kid(w)}:${kid(v)}`), monoide: SUMA_POR_CLAVE, leeEstado: true,
    f: (e, ctx) => movimientos(ctx.S.D, ctx.parametros, e),
    obs: (acum, ctx) => disponibilidadDe(acum, accD(ctx.S.D), ctx.parametros['dominio.forma'], w, v) }),
  /** q_fibra(k, v) (§7.5) sobre las secciones propias de q_cat + Φ vigente (herencia en obs). */
  fibra: (c, valor, τ = 'variante') => Object.freeze({ ...base(`dominio.fibra:${τ}:${c}:${hexCV(valor)}`), monoide: MAPA_ETIQUETAS,
    f: (e, ctx) => contribuciones(e, ctx.k, ctx.parametros),
    obs: (acum, ctx) => fibraAcc(accSecciones(seccionesDeAcum(acum)), ctx.parametros['dominio.forma'], c, valor, τ) }),
});
