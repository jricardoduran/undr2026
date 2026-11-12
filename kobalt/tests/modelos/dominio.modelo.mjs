// Kobalt — MODELO DE REFERENCIA (oráculo) de la regla de dominio `kobalt.dominio@1` (fase 3: Forma + red de flujo).
// Traducción literal de kobalt/specs/2026-11-11_fase3-forma-y-flujo.md (§3–§7, Anexos A, B, «un solo verbo» y C),
// montada sobre el NÚCLEO REAL (kobalt/src/nucleo/index.mjs) y el ÁLGEBRA DE PREGUNTAS REAL (kobalt/src/preguntas/
// index.mjs, fase 2 integrada): la regla es un DATO que el núcleo interpreta; las expresiones se evalúan con el único
// lenguaje (`evaluar`, `validarExpr`, `registrarLector`) y las preguntas usan el único catálogo (`monoide(…)`) (C.4).
// No optimiza, no persiste, no tiene red. La implementación (kobalt/src/dominio/index.mjs) se compara contra él.
//
// ═══════════════ Correspondencia objeto matemático ↔ símbolo ═══════════════
//   Φ (Forma) · 𝒩 (Red) · liberaciones · alcance propio … ↔ parámetros Σ_r `dominio.*` (SIGMA); valores iniciales
//                                                       FORMA_INICIAL (Anexo A + actividad C.2 + visibilidad C.3) · RED_INICIAL
//   D = (nd, ent, val, conj, m)                        ↔ REGLA.D0 / estado de dominio (§4)
//   ID = (i, j), i = nd + e.ε + 1                       ↔ [i, j] (texto «i.j» como clave interna)
//   acción = δ ∈ ∏_{(e,k)} M_clase(k) (un solo verbo)   ↔ δ = {coordenada ↦ elemento}
//   efecto(D, e, C) → δ  TOTAL (C.1)                    ↔ efecto: IDs, ciclos iniciales, W(t) en S_{k−1}, δ(alNacer)
//   guarda(D, e, C) → 'ok' | motivo (solo admite)       ↔ guarda: usa efecto y añade las comprobaciones (§5.1)
//   T = aplicar(D, efecto(D, e, C)), nd + 1              ↔ REGLA.T (nunca lanza sobre una entrada comprometida)
//   intérprete = una función por clase de coordenada   ↔ INTERPRETE.{ent, val, conj, m} (m con suma exacta: C.6)
//   Lote = producto del monoide                         ↔ componer(δ₁, δ₂) (PRODUCTO por clase)
//   guarda universal (L35): m + W ≥ 0 en R_c(t)        ↔ guardaDisparo: «negativo:<lugar>»
//   G^par (compatibilidad de épocas, C.2, C.7)          ↔ guardaPar
//   lectores de dominio nombre@versión (C.4)            ↔ LECTORES (registro de la fase 2)
//   Π_T (monoide `nacimientos`, C.5), Π_cat, Π_marcado, Π_flat(w), Π_disp(w,v,cfg), Π_fibra, Π_aud, Π_readmisión ↔ PROYECCIONES
//
// Leyes: L1, L2, L3, L4, L6, L7, L9, L10, L12, L16, L17, L20, L26, L28, L29, L31, L32, L33, L35; VF1–VF10; Teorema 6.1.
// Límites [L]: un solo proceso; no prueba consenso ni exclusión entre dispositivos ni durabilidad.

import * as N from '../../src/nucleo/index.mjs';
import * as P from '../../src/preguntas/index.mjs';

export const ID_REGLA = 'kobalt.dominio@1';
const MAX = Number.MAX_SAFE_INTEGER;
const Q9 = 1_000_000_000;
const D12 = 1_000_000_000_000;

// ─────────────────────────── utilidades ───────────────────────────
export const esMapa = v => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Uint8Array);
const tiene = (o, k) => esMapa(o) && typeof k === 'string' && Object.hasOwn(o, k);
const propio = (o, k) => (tiene(o, k) ? o[k] : undefined);
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
/** Igualdad de valores = igualdad de CV (−0 = 0, C.8). Valores no CV: solo idénticos. */
export const igual = (a, b) => { if (a === undefined || b === undefined) return a === b; try { return hexCV(a) === hexCV(b); } catch { return a === b; } };
const largo = s => [...s].length;
const coincide = (p, t) => p === t || (p.endsWith('*') && t.startsWith(p.slice(0, -1)));
const sinMenosCero = x => (x === 0 ? 0 : x);
/** Suma exacta en ℤ (enteros seguros). Fuera de rango: error VISIBLE (C.6), nunca un truncamiento. */
export function sumaExacta(a, b) {
  const r = BigInt(a) + BigInt(b);
  if (r > BigInt(MAX) || r < -BigInt(MAX)) throw new RangeError('desbordamiento: suma fuera de los enteros seguros');
  return sinMenosCero(Number(r));
}
const sumaSegura = (a, b) => { try { return sumaExacta(a, b); } catch { return null; } };
const ERR = motivo => ({ motivo });
const MOTIVO_REF = Symbol('referenciaInexistente');

// ─────────────────────────── expresiones (sintaxis de la fase 2 §4.2) ───────────────────────────
const V = c => ({ v: c });
const A = n => ({ a: [n] });
const X = n => ({ x: n });
const lee = (id, ...con) => ({ lee: `${id}@1`, con });
const op = (o, ...de) => ({ op: o, de });
const car = (x, k) => lee('carac', x, V(k));
const mk = (f, ...idx) => lee('marcado', V(f), ...idx);
const campo = (x, c) => op('campo', x, V(c));
const xIt = X('it'), xU = X('u'), xE = X('e');
const ES_PROPIETARIO = lee('propietario', xU);
const DUEÑO_E = op('=', lee('dueño', xE), xU);

// ─────────────────────────── Forma inicial (Anexo A + C.2 actividad + C.3 visibilidad) ───────────────────────────
const txt = (a, b) => ({ texto: [a, b] });
const ent = (a, b) => ({ entero: [a, b] });
const BOOL = { bool: true };
const ref = τ => ({ ref: τ });
const opc = tv => ({ opcional: tv });
const asig = (valor, marcas = {}) => ({ clase: 'asignación', valor, ...marcas });
const R_ = { requerida: true }, I_ = { inmutable: true }, H_ = { heredable: true };
const CICLO_ESTADO = { clase: 'ciclo', valor: { enum: ['activo', 'retirado'] }, ciclo: { estados: ['activo', 'retirado'], inicial: 'activo', transiciones: [['activo', 'retirado'], ['retirado', 'activo']] } };
const ACTIVIDAD_ESTADO = { característica: 'estado', valores: ['activo'] };
const SIMPLE = { clase: 'asignación', valor: { alguno: [txt(0, 2000), ent(-MAX, MAX), BOOL] }, máximo: 60 };

const ADMITE_AÑADIR_GALERIA = op('y',
  op('=', campo(xIt, 'creador'), xU),
  op('o', car(xE, 'público'), ES_PROPIETARIO, DUEÑO_E),
  op('o', ES_PROPIETARIO, op('y', op('=', campo(xIt, 'propósito'), V('vendedor')), op('≠', campo(xIt, 'audiencia'), V('público'))), DUEÑO_E));
const ADMITE_QUITAR_GALERIA = op('o', ES_PROPIETARIO, DUEÑO_E, op('=', campo(xIt, 'creador'), xU));
const VISIBILIDAD_GALERIA = op('o',
  op('=', campo(xIt, 'audiencia'), V('público')), op('=', xU, campo(xIt, 'creador')), DUEÑO_E, ES_PROPIETARIO,
  op('y', op('=', campo(xIt, 'audiencia'), V('usuarios')), op('en', xU, campo(xIt, 'permitidos'))));
const ADMITE_VENTA_VARIANTE = op('y', lee('activa', xIt), lee('activa', lee('padre', xIt)),
  op('o', car(lee('padre', xIt), 'público'), op('=', lee('dueño', xIt), xU), ES_PROPIETARIO));
const RESTRICCION_DESCUENTO = op('o', op('nulo?', car(xE, 'descuento')), op('=', car(xE, 'descuento'), V(0)), op('≤', car(xE, 'descuento'), car(xE, 'precio')));

const GALERIA = {
  clase: 'referencia', cardinalidad: 'muchos',
  valor: { registro: { Q: { Q: true }, creador: txt(1, 200), propósito: { enum: ['página', 'vendedor'] }, audiencia: { enum: ['público', 'creador', 'usuarios'] }, permitidos: { lista: txt(1, 200), máx: 30 } } },
  clave: ['Q', 'creador', 'propósito', 'audiencia'],
  admite: { añadir: ADMITE_AÑADIR_GALERIA, quitar: ADMITE_QUITAR_GALERIA },
  visibilidad: VISIBILIDAD_GALERIA,
};

export const FORMA_INICIAL = Object.freeze({
  tipos: {
    bodega: { características: { nombre: asig(txt(1, 80), R_) } },
    producto: {
      actividad: ACTIVIDAD_ESTADO,
      restricciones: [RESTRICCION_DESCUENTO],
      características: {
        nombre: asig(txt(1, 140), { ...R_, ...H_ }), descripción: asig(txt(0, 5000), H_), categoría: asig(txt(0, 120), H_),
        costo: asig(ent(0, D12), H_), precio: asig(ent(0, D12), H_), descuento: asig(ent(0, D12), H_),
        público: asig(BOOL, { ...R_, ...H_ }), estado: { ...CICLO_ESTADO, ...H_ }, galería: GALERIA, '*:*': SIMPLE,
      },
    },
    variante: {
      padre: 'producto', denso: true, κ: ['sku'], actividad: ACTIVIDAD_ESTADO,
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

// Valores POR DEFECTO de los parámetros de las preguntas de lectura (C.3, L32): nunca autoridad, solo configuración.
export const DISPONIBILIDAD_INICIAL = Object.freeze({
  familias: { existencias: 'H', libre: 'libre', comprometido: 'comprometido', pendiente: 'pend', pendienteNoElegible: 'pend⁰', noApto: 'noApto', descuadre: 'descuadre' },
  demanda: { tipo: 'venta', bodega: 'bodega', variante: 'variante' },
  agregación: 'sumaDeMáximos', // 'sumaDeMáximos' = Σ_w max(0,·) · 'máximoDeSuma' = max(0, Σ_w ·)  (§7.4, §10)
});
export const VISIBILIDAD_INICIAL = Object.freeze({ característica: 'galería' });
export const TIPO_FIBRA = 'variante';

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
export function plantillaVenta(nombre, valores, q) {
  return { tipo: 'Lote', args: { acciones: [{ tipo: 'Nacer:venta', args: { valores } }, ...PLANTILLAS[nombre].map(t => ({ tipo: `Disparar:${t}`, args: { s: { nacido: 0 }, q } }))] } };
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

// ─────────────────────────── Forma: declaración, herencia, actividad (C.2), dueño ───────────────────────────
const esConj = d => d.clase === 'conjunto' || (d.clase === 'referencia' && d.cardinalidad === 'muchos');
const esFamilia = k => k.includes('*');
const RE_CLAVE_NS = /^([^:|*[\]]+):([^:|*[\]]+)$/;
export const tipoDe = (Φ, τ) => { const t = propio(Φ?.tipos, τ); return esMapa(t) ? t : null; };
/** Declaración de k en τ: exacta, o por familia «ns:*», o «*:*» (búsquedas con Object.hasOwn, C.8). */
export function declaracion(Φ, τ, k) {
  const t = tipoDe(Φ, τ);
  if (!t || typeof k !== 'string' || k.includes('|') || esFamilia(k)) return null;
  const cs = t.características;
  if (tiene(cs, k)) return cs[k];
  const m = RE_CLAVE_NS.exec(k);
  if (!m) return null;
  return propio(cs, `${m[1]}:*`) ?? propio(cs, '*:*') ?? null;
}
const claveDeclaracion = (Φ, τ, k) => {
  const t = tipoDe(Φ, τ);
  if (!t) return null;
  if (tiene(t.características, k)) return k;
  const m = RE_CLAVE_NS.exec(k);
  return m ? (tiene(t.características, `${m[1]}:*`) ? `${m[1]}:*` : '*:*') : null;
};
export const claveElemento = (d, x) => hexCV(Array.isArray(d?.clave) ? d.clave.map(c => (tiene(x, c) ? x[c] : null)) : x);

export function accD(D) {
  return {
    ent: k => propio(D.ent, k) ?? null,
    propio: (k, c) => {
      const v = propio(D.val, k), s = propio(D.conj, k);
      if (v && Object.hasOwn(v, c)) return v[c];
      if (s && Object.hasOwn(s, c)) { const m = s[c]; return Object.keys(m).sort().map(h => m[h]); }
      return undefined;
    },
    claves: () => Object.keys(D.ent),
    propias: k => [...Object.keys(propio(D.val, k) ?? {}), ...Object.keys(propio(D.conj, k) ?? {})],
  };
}
export function accSecciones(secs) {
  return {
    ent: k => (tiene(secs, k) ? { tipo: secs[k].tipo, creador: secs[k].creador, padre: secs[k].padre } : null),
    propio: (k, c) => (tiene(secs, k) && Object.hasOwn(secs[k].propia, c) ? secs[k].propia[c] : undefined),
    claves: () => Object.keys(secs),
    propias: k => (tiene(secs, k) ? Object.keys(secs[k].propia) : []),
  };
}
/** efectiva(e,k) = propia | efectiva(padre, k) si heredable en tipo(padre) | defecto | inicial del ciclo | [] | desconocido. */
export function efectiva(acc, Φ, k, c) {
  const e = acc.ent(k);
  if (!e) return undefined;
  const p = acc.propio(k, c);
  if (p !== undefined) return p;
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
/** C.2: activa(x) ⟺ el tipo no declara actividad, o efectiva(x, actividad.característica) ∈ actividad.valores. */
export function activaAcc(acc, Φ, k) {
  const e = acc.ent(k);
  const a = e ? tipoDe(Φ, e.tipo)?.actividad : null;
  if (!esMapa(a)) return true;
  const v = efectiva(acc, Φ, k, a.característica);
  return v !== undefined && a.valores.some(x => igual(x, v));
}
export function dueñoAcc(acc, k) {
  let e = acc.ent(k), n = 0;
  while (e && e.padre && n++ < 1000) e = acc.ent(kid(e.padre)) ?? null;
  return e ? e.creador : null;
}
export const propietarios = par => par['dominio.propietarios'] ?? [par['nucleo.constituyente']];

// ─────────────────────────── δ: el único verbo ───────────────────────────
// Coordenadas: «ent|i.j» (nacimiento) · «val|i.j|k» (último: {=v}) · «conj|i.j|k» ((A,Q)) · «m|lugar» ({+q} ∪ {=h}).
const claseCoord = ck => ck.slice(0, ck.indexOf('|'));
function partir(ck) {
  const p = ck.indexOf('|'), clase = ck.slice(0, p), resto = ck.slice(p + 1);
  if (clase === 'val' || clase === 'conj') { const q = resto.indexOf('|'); return [clase, resto.slice(0, q), resto.slice(q + 1)]; }
  return [clase, resto, null];
}
const sinClaves = (m, ks) => { const r = { ...m }; for (const k of ks) delete r[k]; return r; };
export const PRODUCTO = Object.freeze({
  ent: () => { throw new Error('dos nacimientos en la misma coordenada'); },
  val: (a, b) => b,
  conj: (a, b) => ({ A: { ...sinClaves(a.A, Object.keys(b.Q)), ...b.A }, Q: { ...sinClaves(a.Q, Object.keys(b.A)), ...b.Q } }),
  m: (a, b) => (Object.hasOwn(b, '=') ? b : Object.hasOwn(a, '=') ? { '=': sumaExacta(a['='], b['+']) } : { '+': sumaExacta(a['+'], b['+']) }),
});
export const INTERPRETE = Object.freeze({
  ent: (actual, el) => { if (actual !== undefined) throw new Error('nacimiento sobre coordenada existente'); return el.nace; },
  val: (actual, el) => (el['='] === null ? undefined : el['=']),
  conj: (actual, el) => { const r = sinClaves(actual ?? {}, Object.keys(el.Q)); Object.assign(r, el.A); return Object.keys(r).length ? r : undefined; },
  m: (actual, el) => { const v = Object.hasOwn(el, '=') ? sinMenosCero(el['=']) : sumaExacta(actual ?? 0, el['+']); return v === 0 ? undefined : v; },
});
export function componer(δ1, δ2) {
  const r = { ...δ1 };
  for (const [ck, b] of Object.entries(δ2)) r[ck] = Object.hasOwn(r, ck) ? PRODUCTO[claseCoord(ck)](r[ck], b) : b;
  return r;
}
export function aplicar(D, δ) {
  const out = { ...D };
  const copiado = new Set();
  const cow = c => { if (!copiado.has(c)) { out[c] = { ...out[c] }; copiado.add(c); } return out[c]; };
  for (const [ck, el] of Object.entries(δ)) {
    const [clase, a, b] = partir(ck);
    if (clase === 'ent') { const t = cow('ent'); t[a] = INTERPRETE.ent(propio(t, a), el); }
    else if (clase === 'm') { const t = cow('m'); const v = INTERPRETE.m(propio(t, a), el); if (v === undefined) delete t[a]; else t[a] = v; }
    else {
      const tabla = cow(clase);
      const sec = { ...(propio(tabla, a) ?? {}) };
      const v = INTERPRETE[clase](propio(sec, b), el);
      if (v === undefined) delete sec[b]; else sec[b] = v;
      if (Object.keys(sec).length) tabla[a] = sec; else delete tabla[a];
    }
  }
  return out;
}

// ─────────────────────────── lectores de dominio (C.4: registro de la fase 2, nombre@versión) ───────────────────────────
const accS = S => accD(S.D);
const ΦS = S => S.parametros['dominio.forma'];
const enS = (S, id) => esID(id) && accS(S).ent(kid(id)) !== null;
const anular = v => (v === undefined ? null : v);
let L = P.LECTORES_VACIO;
const estado = (id, fn) => { L = P.registrarLector(L, id, { clase: 'estado', fn }); };
const deEntrada = (id, fn) => { L = P.registrarLector(L, id, { clase: 'entrada', fn }); };
estado('carac@1', (S, id, c) => (enS(S, id) && typeof c === 'string' ? anular(efectiva(accS(S), ΦS(S), kid(id), c)) : null));
estado('activa@1', (S, id) => (enS(S, id) ? activaAcc(accS(S), ΦS(S), kid(id)) : null));
estado('padre@1', (S, id) => (enS(S, id) ? accS(S).ent(kid(id)).padre ?? null : null));
estado('dueño@1', (S, id) => (enS(S, id) ? dueñoAcc(accS(S), kid(id)) : null));
estado('creador@1', (S, id) => (enS(S, id) ? accS(S).ent(kid(id)).creador : null));
estado('tipo@1', (S, id) => (enS(S, id) ? accS(S).ent(kid(id)).tipo : null));
estado('propietario@1', (S, u) => typeof u === 'string' && propietarios(S.parametros).includes(u));
estado('marcado@1', (S, f, ...idx) => (typeof f === 'string' && idx.every(esID) ? (propio(S.D.m, claveLugar(f, idx)) ?? 0) : null));
estado('disp.libre@1', (S, v, agregación) => (esID(v) ? disponibilidad(S.D, S.parametros, null, v, { ...DISPONIBILIDAD_INICIAL, ...(typeof agregación === 'string' ? { agregación } : {}) }).noAsignada : null));
estado('movimientos@1', (S, tipo, args, u, epoca, familia) => {
  if (typeof tipo !== 'string' || !Number.isSafeInteger(epoca)) return null;
  const mv = movimientos(S.D, S.parametros, { clase: N.claseDe(tipo), tipo, args, u, epoca });
  if (typeof familia !== 'string') return mv;
  return Object.fromEntries(Object.entries(mv).filter(([cl]) => parsearLugar(cl).f === familia));
});
deEntrada('nacimientos@1', (e, k, τ) => nacimientos(e, k).filter(n => typeof τ !== 'string' || n.tipo === τ).map(n => n.id));
deEntrada('contribuciones@1', (e, k, Φ) => (esMapa(Φ) ? contribuciones(e, k, { 'dominio.forma': Φ }) : null));
export const LECTORES = L;

/** Estado mínimo que ven los lectores en una guarda: D intermedio + los parámetros que leen (copia barata). */
const Smin = (D, par) => ({ D, parametros: { 'dominio.forma': par['dominio.forma'], 'dominio.propietarios': par['dominio.propietarios'], 'nucleo.constituyente': par['nucleo.constituyente'] } });
/** Ámbito de evaluación de la fase 2: {a:…} lee los args (resueltos) de la acción; {x:u} el actor. */
const amb = (D, cx, extra = {}) => ({ S: Smin(D, cx.par), parametros: cx.par, lectores: LECTORES, ...extra, vars: { u: cx.u, ...(extra.vars ?? {}) } });
const evaluar = (x, a) => P.evaluar(x, a);

// ─────────────────────────── EFECTO: total (C.1) ───────────────────────────
function resolver(v, cx) {
  if (esMapa(v)) {
    const ks = Object.keys(v);
    if (ks.length === 1 && ks[0] === 'nacido') {
      if (!Number.isSafeInteger(v.nacido) || v.nacido < 0 || v.nacido >= cx.nacidos.length) throw MOTIVO_REF;
      return [...cx.nacidos[v.nacido]];
    }
    const o = {};
    for (const k of ks) Object.defineProperty(o, k, { value: resolver(v[k], cx), enumerable: true, writable: true, configurable: true });
    return o;
  }
  if (Array.isArray(v)) return v.map(x => resolver(x, cx));
  return v;
}
const resolverSeguro = (v, cx) => { try { return { v: resolver(v, cx) }; } catch (e) { if (e === MOTIVO_REF) return null; throw e; } };
const resolverTotal = (v, cx) => resolverSeguro(v, cx)?.v ?? null;
const RE_SECCION = /^(Fijar|Añadir|Quitar):([^.:*|]+)\.(.+)$/;

/** Lugares y W de un disparo (sin juzgar nada): {lugares: Map clave ↦ {f, clave}, W: Map, problemas: [motivo en orden]}. */
function planDisparo(Dc, T, as, cx) {
  const acc = accD(Dc), ctx = amb(Dc, cx, { e: { args: as, u: cx.u } });
  const problemas = [];
  const lugar = xs => {
    const f = xs[0], F = propio(cx.𝒩.familias, f);
    if (!esMapa(F) || xs.length - 1 !== F.índices.length) { problemas.push('familiaDesconocida'); return null; }
    const idx = [];
    for (let n = 1; n < xs.length; n++) {
      const id = evaluar(xs[n], ctx);
      if (!esID(id) || !acc.ent(kid(id))) { problemas.push('referenciaInexistente'); return null; }
      const τ = F.índices[n - 1];
      if (τ !== '*' && acc.ent(kid(id)).tipo !== τ) { problemas.push('referenciaTipo'); return null; }
      idx.push(id);
    }
    return { f, clave: claveLugar(f, idx) };
  };
  const movs = [];
  for (const mv of T.movimientos) { const l1 = lugar(mv.desde), l2 = lugar(mv.hacia); movs.push({ l1, l2, mv }); }
  const W = new Map(), orden = new Map();
  const problemasCantidad = [];
  for (const { l1, l2, mv } of movs) {
    if (!l1 || !l2) continue;
    const q = evaluar(mv.cantidad, ctx);
    if (!Number.isSafeInteger(q)) { problemasCantidad.push('cantidad'); continue; }
    if (!orden.has(l1.clave)) orden.set(l1.clave, l1);
    if (!orden.has(l2.clave)) orden.set(l2.clave, l2);
    const a = sumaSegura(W.get(l2.clave) ?? 0, q), b = a === null ? null : sumaSegura(W.get(l1.clave) ?? 0, -q);
    if (a === null || b === null) { problemasCantidad.push('cantidad'); continue; }
    W.set(l2.clave, a); W.set(l1.clave, b);
  }
  return { W, orden, problemas, problemasCantidad, ctx, acc };
}
function efectoDisparo(Dc, t, args, cx) {
  const T = propio(cx.𝒩.transiciones, t);
  if (!esMapa(T)) return {};
  const as = resolverTotal(args, cx);
  if (!esMapa(as)) return {};
  const { W, orden } = planDisparo(Dc, T, as, cx);
  const δ = {};
  for (const l of orden.values()) { const w = W.get(l.clave); if (w !== 0) δ[`m|${l.clave}`] = { '+': w }; }
  return δ;
}
function efectoNacimiento(Dc, a, cx, id) {
  const τ = a.tipo.slice('Nacer:'.length), tdef = tipoDe(cx.Φ, τ);
  const valores = resolverTotal(a.args?.valores, cx);
  const k = kid(id);
  const padreK = tdef?.padre;
  const padre = esMapa(valores) && typeof padreK === 'string' && esID(propio(valores, padreK)) ? valores[padreK] : null;
  const δ = { [`ent|${k}`]: { nace: { tipo: τ, creador: cx.u, padre } } };
  if (!tdef || !esMapa(valores)) return δ;
  for (const [c, v] of Object.entries(valores)) {
    const d = declaracion(cx.Φ, τ, c);
    if (!d) continue;
    if (esConj(d)) { if (!Array.isArray(v)) continue; const Am = {}; for (const x of v) Am[claveElemento(d, x)] = x; δ[`conj|${k}|${c}`] = { A: Am, Q: {} }; }
    else if (v !== null) δ[`val|${k}|${c}`] = { '=': v };
  }
  for (const [c, d] of Object.entries(tdef.características)) if (!esFamilia(c) && d.clase === 'ciclo' && !Object.hasOwn(valores, c)) δ[`val|${k}|${c}`] = { '=': d.ciclo.inicial };
  return δ;
}
function efectoNacer(Dc, a, cx) {
  const id = [cx.i, cx.nacidos.length];
  let δ = efectoNacimiento(Dc, a, cx, id);
  const tdef = tipoDe(cx.Φ, a.tipo.slice('Nacer:'.length));
  if (tdef && typeof tdef.alNacer === 'string') δ = componer(δ, efectoDisparo(aplicar(Dc, δ), tdef.alNacer, { x: id }, cx));
  cx.nacidos.push(id);
  return δ;
}
function efectoSeccion(Dc, a, cx) {
  const [, verbo, τ, c] = RE_SECCION.exec(a.tipo);
  const e = resolverTotal(a.args?.e, cx);
  if (!esID(e)) return {};
  const k = kid(e);
  if (verbo === 'Fijar') return { [`val|${k}|${c}`]: { '=': resolverTotal(a.args.v, cx) } };
  const x = resolverTotal(a.args.x, cx), cl = claveElemento(declaracion(cx.Φ, τ, c), x);
  return { [`conj|${k}|${c}`]: verbo === 'Añadir' ? { A: { [cl]: x }, Q: {} } : { A: {}, Q: { [cl]: x } } };
}
function efectoAccion(Dc, a, cx) {
  if (typeof a?.tipo !== 'string') return {};
  if (a.tipo.startsWith('Nacer:')) return efectoNacer(Dc, a, cx);
  if (RE_SECCION.test(a.tipo)) return efectoSeccion(Dc, a, cx);
  if (a.tipo.startsWith('Disparar:')) return efectoDisparo(Dc, a.tipo.slice('Disparar:'.length), a.args, cx);
  return {};
}
export const accionesDe = e => (e.tipo === 'Lote' ? (Array.isArray(e.args?.acciones) ? e.args.acciones : []) : [{ tipo: e.tipo, args: e.args }]);
const contexto = (D, e, par) => ({ i: D.nd + e.epoca + 1, u: e.u, par, Φ: par['dominio.forma'], 𝒩: par['dominio.red'], nacidos: [], final: par['dominio.lote']?.guarda === 'final', restringidas: new Set() });
/** efecto(D, e, C) → δ. TOTAL: nunca devuelve motivos ni lanza sobre una entrada comprometida (C.1, Teorema 2, L7). */
export function efecto(D, e, par) {
  if (e.clase !== 'dominio') return {};
  const cx = contexto(D, e, par);
  let Dc = D, δ = {};
  for (const a of accionesDe(e)) { if (a?.tipo === 'Lote') continue; const d = efectoAccion(Dc, a, cx); Dc = aplicar(Dc, d); δ = componer(δ, d); }
  return δ;
}

// ─────────────────────────── GUARDA: solo admite (§5.1, en orden; el primer fallo da el motivo) ───────────────────────────
const alcanza = (par, u, tipo) => { const pats = propio(par['dominio.alcancePropio'], u); return Array.isArray(pats) && pats.some(p => coincide(p, tipo)); };
function comprobarRefs(acc, refs) {
  for (const r of refs) {
    const e = acc.ent(kid(r.id));
    if (!e) return 'referenciaInexistente';
    if (r.τ !== '*' && e.tipo !== r.τ) return 'referenciaTipo';
  }
  return null;
}
function κLibre(D, Φ, k) {
  const e = propio(D.ent, k);
  const κ = tipoDe(Φ, e.tipo)?.κ;
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
  for (const ρ of tipoDe(cx.Φ, τ).restricciones ?? []) if (evaluar(ρ, amb(D, cx, { vars: { e: id } })) !== true) return 'restricción';
  return null;
}
function excedeMáximo(D, Φ, τ, k, c) {
  const kd = claveDeclaracion(Φ, τ, c);
  const d = propio(tipoDe(Φ, τ).características, kd);
  if (!kd || !esFamilia(kd) || !Number.isSafeInteger(d?.máximo)) return false;
  return Object.keys(propio(D.val, k) ?? {}).filter(c2 => claveDeclaracion(Φ, τ, c2) === kd).length > d.máximo;
}
const excedeMáximoTodas = (D, Φ, τ, k) => Object.keys(propio(D.val, k) ?? {}).some(c => excedeMáximo(D, Φ, τ, k, c));

function guardaNacer(Dc, a, cx) {
  const τ = a.tipo.slice('Nacer:'.length);
  const tdef = tipoDe(cx.Φ, τ);
  if (!tdef) return 'tipoDesconocido';                                                                                // (1)
  const rv = resolverSeguro(a.args.valores, cx);
  if (!rv) return 'referenciaInexistente';
  const valores = rv.v;
  const id = [cx.i, cx.nacidos.length];
  const refs = [];
  for (const [c, v] of Object.entries(valores)) {                                                                     // (2)
    const d = declaracion(cx.Φ, τ, c);
    if (!d) return 'característicaDesconocida';
    if (esConj(d)) {
      if (!Array.isArray(v) || !v.every(x => valido(d.valor, x))) return 'valorInválido';
      for (const x of v) refsDe(d.valor, x, []).forEach(r => refs.push({ ...r, d }));
    } else {
      if (v === null || !valido(d.valor, v)) return 'valorInválido';
      if (d.clase === 'ciclo' && !d.ciclo.estados.includes(v)) return 'cicloInválido';
      refsDe(d.valor, v, []).forEach(r => refs.push({ ...r, d }));
    }
  }
  for (const [c, d] of Object.entries(tdef.características)) if (!esFamilia(c) && d.requerida && !Object.hasOwn(valores, c)) return 'requerida';
  const acc = accD(Dc);
  const mr = comprobarRefs(acc, refs);                                                                                // (3)
  if (mr) return mr;
  for (const r of refs) {
    const φ = r.d.admite?.fijar;
    if (φ && evaluar(φ, amb(Dc, cx, { vars: { it: r.id, e: id } })) !== true) return 'admite';
  }
  let padre = null;                                                                                                   // (4)
  if (tdef.padre) { padre = propio(valores, tdef.padre) ?? null; if (!esID(padre)) return 'padre'; }
  const Dt = aplicar(Dc, efectoNacimiento(Dc, a, cx, id));
  if (excedeMáximoTodas(Dt, cx.Φ, τ, kid(id))) return 'máximo';
  const mκ = κLibre(Dt, cx.Φ, kid(id));                                                                               // (5)
  if (mκ) return mκ;
  const mρ = restricciones(Dt, cx, τ, id);                                                                            // (6)
  if (mρ) return mρ;
  if (alcanza(cx.par, cx.u, a.tipo) && (!padre || dueñoAcc(accD(Dt), kid(padre)) !== cx.u)) return 'ajeno';          // (7)
  if (typeof tdef.alNacer === 'string') return guardaDisparo(Dt, tdef.alNacer, { x: id }, cx, true);                 // (8)
  return null;
}
function objetivoSeccion(Dc, a, cx) {
  const [, verbo, τ, c] = RE_SECCION.exec(a.tipo);
  const re = resolverSeguro(a.args.e, cx);
  if (!re || !esID(re.v)) return ERR('referenciaInexistente');
  const k = kid(re.v), acc = accD(Dc), en = acc.ent(k);
  if (!en) return ERR('referenciaInexistente');
  if (en.tipo !== τ) return ERR('tipoIncoherente');
  const d = declaracion(cx.Φ, τ, c);
  if (!d) return ERR('característicaDesconocida');
  return { verbo, τ, c, id: re.v, k, acc, d };
}
function guardaFijar(Dc, a, cx) {
  const o = objetivoSeccion(Dc, a, cx);
  if (o.motivo) return o.motivo;
  const { τ, c, id, k, acc, d } = o;
  if (esConj(d)) return 'claseIncompatible';
  if (d.inmutable) return 'inmutable';
  const rv = resolverSeguro(a.args.v, cx);
  if (!rv) return 'referenciaInexistente';
  const v = rv.v;
  if (v === null) {
    if (d.requerida) return 'requerida';
    if (d.clase === 'ciclo') return 'valorInválido';
  } else {
    if (!valido(d.valor, v)) return 'valorInválido';
    if (d.clase === 'ciclo') {
      const actual = acc.propio(k, c) ?? d.ciclo.inicial;
      if (!d.ciclo.transiciones.some(([x, y]) => x === actual && y === v)) return 'cicloInválido';
    }
    const refs = refsDe(d.valor, v, []);
    const mr = comprobarRefs(acc, refs);
    if (mr) return mr;
    for (const r of refs) if (d.admite?.fijar && evaluar(d.admite.fijar, amb(Dc, cx, { vars: { it: r.id, e: id } })) !== true) return 'admite';
  }
  const Dt = aplicar(Dc, efectoSeccion(Dc, a, cx));
  if (v !== null && excedeMáximo(Dt, cx.Φ, τ, k, c)) return 'máximo';
  const reactiva = !activaAcc(acc, cx.Φ, k) && activaAcc(accD(Dt), cx.Φ, k);
  if ((tipoDe(cx.Φ, τ).κ ?? []).includes(c) || reactiva) { const mκ = κLibre(Dt, cx.Φ, k); if (mκ) return mκ; }
  const mρ = restricciones(Dt, cx, τ, id);
  if (mρ) return mρ;
  if (alcanza(cx.par, cx.u, a.tipo) && dueñoAcc(acc, k) !== cx.u) return 'ajeno';
  return null;
}
function guardaConjunto(Dc, a, cx) {
  const o = objetivoSeccion(Dc, a, cx);
  if (o.motivo) return o.motivo;
  const { verbo, c, id, k, acc, d } = o;
  if (!esConj(d)) return 'claseIncompatible';
  const rx = resolverSeguro(a.args.x, cx);
  if (!rx) return 'referenciaInexistente';
  const x = rx.v;
  if (!valido(d.valor, x)) return 'valorInválido';
  const mr = comprobarRefs(acc, refsDe(d.valor, x, []));
  if (mr) return mr;
  const φ = d.admite?.[verbo === 'Añadir' ? 'añadir' : 'quitar'];
  if (φ && evaluar(φ, amb(Dc, cx, { vars: { it: x, e: id } })) !== true) return 'admite';
  const cl = claveElemento(d, x);
  const actual = propio(propio(Dc.conj, k), c) ?? {};
  const presente = Object.hasOwn(actual, cl);
  const pol = cx.par['dominio.conjunto'];
  if (verbo === 'Añadir' && presente && pol.añadirExistente === 'rechazar') return 'yaPresente';
  if (verbo === 'Quitar' && !presente && pol.quitarAusente === 'rechazar') return 'ausente';
  if (verbo === 'Añadir' && Number.isSafeInteger(d.máximo) && !presente && Object.keys(actual).length + 1 > d.máximo) return 'máximo';
  if (alcanza(cx.par, cx.u, a.tipo) && dueñoAcc(acc, k) !== cx.u) return 'ajeno';
  return null;
}
/** Guarda de un disparo (§5.3): forma de los args, índices, alcance, cantidades, disparo nulo y guarda universal (L35). */
function guardaDisparo(Dc, t, args, cx, interna) {
  const T = propio(cx.𝒩.transiciones, t);
  if (!esMapa(T)) return 'transiciónDesconocida';
  if (T.interna && !interna) return 'transiciónInterna';
  const ra = resolverSeguro(args, cx);
  if (!ra) return 'referenciaInexistente';
  const as = ra.v;
  if (!esMapa(as)) return 'argumentos';
  for (const k of Object.keys(as)) if (!Object.hasOwn(T.args, k)) return 'argumentos';
  const refs = [];
  for (const [k, tv] of Object.entries(T.args)) {
    if (!Object.hasOwn(as, k)) { if (!Object.hasOwn(tv, 'opcional')) return 'argumentos'; continue; }
    if (!valido(tv, as[k])) return 'argumentos';
    refsDe(tv, as[k], refs);
  }
  const mr = comprobarRefs(accD(Dc), refs);
  if (mr) return mr;
  const plan = planDisparo(Dc, T, as, cx);
  if (plan.problemas.length) return plan.problemas[0];                                                                 // índices
  if (!interna && alcanza(cx.par, cx.u, `Disparar:${t}`)) {                                                            // alcance propio
    const obj = T.objetivo ? evaluar(T.objetivo, plan.ctx) : null;
    if (!esID(obj) || !plan.acc.ent(kid(obj)) || dueñoAcc(plan.acc, kid(obj)) !== cx.u) return 'ajeno';
  }
  if (plan.problemasCantidad.length) return 'cantidad';                                                               // cantidades
  if ([...plan.W.values()].every(w => w === 0) && T.nulo !== 'admitir') return 'sinEfecto';                          // disparo nulo
  for (const l of plan.orden.values()) if (sumaSegura(propio(Dc.m, l.clave) ?? 0, plan.W.get(l.clave)) === null) return 'cantidad'; // C.6
  const canal = T.canal ? evaluar(T.canal, plan.ctx) : null;
  const R = T.restricción === 'todas' ? [...new Set([...plan.orden.values()].map(l => l.f))] : T.restricción === 'ninguna' ? [] : T.restricción;
  const lib = new Set();
  for (const l of cx.par['dominio.liberaciones'] ?? []) if (l.transiciones.includes(t) && l.canal === canal) l.familias.forEach(f => lib.add(f));
  const famR = new Set(R.filter(f => propio(cx.𝒩.familias, f)?.restringida === true && !lib.has(f)));
  if (cx.final) { famR.forEach(f => cx.restringidas.add(f)); return null; }
  for (const l of plan.orden.values()) {                                                                              // guarda universal
    const w = plan.W.get(l.clave);
    if (w < 0 && famR.has(l.f) && (propio(Dc.m, l.clave) ?? 0) + w < 0) return `negativo:${l.clave}`;
  }
  return null;
}
function guardaAccion(Dc, a, cx) {
  if (a.tipo.startsWith('Nacer:')) return guardaNacer(Dc, a, cx);
  if (a.tipo.startsWith('Fijar:')) return guardaFijar(Dc, a, cx);
  if (a.tipo.startsWith('Añadir:') || a.tipo.startsWith('Quitar:')) return guardaConjunto(Dc, a, cx);
  if (a.tipo.startsWith('Disparar:')) return guardaDisparo(Dc, a.tipo.slice('Disparar:'.length), a.args, cx, false);
  return 'forma';
}
/** guarda(D, e, C) → 'ok' | motivo. Usa `efecto` para el estado intermedio y añade las comprobaciones. */
function guardaCon(adicional) {
  return (D, e, par) => {
    const acciones = accionesDe(e);
    const cfg = par['dominio.lote'];
    if (e.tipo === 'Lote') {
      if (acciones.length < 1 || acciones.length > cfg.máximo) return 'loteTamaño';
      if (acciones.some(a => a.tipo === 'Lote')) return 'loteAnidado';
    }
    const cx = contexto(D, e, par);
    let Dc = D, δ = {};
    for (const a of acciones) {
      const m = guardaAccion(Dc, a, cx) ?? (adicional ? adicional(Dc, a, { u: cx.u, par, i: cx.i, nacidos: [...cx.nacidos] }) : null);
      if (m) return m;
      const d = efectoAccion(Dc, a, cx);
      Dc = aplicar(Dc, d); δ = componer(δ, d);
    }
    if (cx.final) {                                                                                                   // Lote «final»: W = Σ W(a_j)
      for (const [ck, el] of Object.entries(δ)) {
        if (claseCoord(ck) !== 'm' || !(el['+'] < 0)) continue;
        const cl = ck.slice(2);
        if (cx.restringidas.has(parsearLugar(cl).f) && (propio(Dc.m, cl) ?? 0) < 0) return `negativo:${cl}`;
      }
    }
    return 'ok';
  };
}
export const guarda = guardaCon(null);

// ─────────────────────────── G5 (forma) y E4 (tipos internos) ───────────────────────────
const claves = (m, ks) => esMapa(m) && Object.keys(m).length === ks.length && ks.every(k => Object.hasOwn(m, k));
const esRef = x => esID(x) || (esMapa(x) && Object.keys(x).length === 1 && Number.isSafeInteger(x.nacido) && x.nacido >= 0);
const RE_NACER = /^Nacer:[^.:*|]+$/, RE_DISP = /^Disparar:[^|*]+$/;
const vNacer = (args, tipo) => RE_NACER.test(tipo) && claves(args, ['valores']) && esMapa(args.valores);
const vFijar = (args, tipo) => RE_SECCION.test(tipo) && tipo.startsWith('Fijar:') && claves(args, ['e', 'v']) && esRef(args.e);
const vConj = (args, tipo) => RE_SECCION.test(tipo) && !tipo.startsWith('Fijar:') && claves(args, ['e', 'x']) && esRef(args.e);
const vDisp = (args, tipo) => RE_DISP.test(tipo) && esMapa(args);
const vInterna = a => claves(a, ['tipo', 'args']) && typeof a.tipo === 'string'
  && (a.tipo === 'Lote' || vNacer(a.args, a.tipo) || vFijar(a.args, a.tipo) || vConj(a.args, a.tipo) || vDisp(a.args, a.tipo));
export const TIPOS = Object.freeze({
  'Nacer:*': vNacer, 'Fijar:*': vFijar, 'Añadir:*': vConj, 'Quitar:*': vConj, 'Disparar:*': vDisp,
  Lote: args => claves(args, ['acciones']) && Array.isArray(args.acciones) && args.acciones.every(vInterna),
});
export const tiposInternos = e => (e.tipo === 'Lote' ? e.args.acciones.map(a => a.tipo) : []);

// ─────────────────────────── Σ_r: dominios y valores iniciales (L31); expresiones validadas con la fase 2 ───────────────────────────
const CLASES = ['asignación', 'conjunto', 'ciclo', 'referencia'];
const esListaTextos = v => Array.isArray(v) && v.every(x => typeof x === 'string');
const exprOk = x => P.validarExpr(x, LECTORES).ok === true;
function esForma(v) {
  if (!esMapa(v) || !esMapa(v.tipos)) return false;
  for (const t of Object.values(v.tipos)) {
    if (!esMapa(t) || !esMapa(t.características)) return false;
    for (const d of Object.values(t.características)) {
      if (!esMapa(d) || !CLASES.includes(d.clase) || !esMapa(d.valor)) return false;
      for (const x of [...Object.values(d.admite ?? {}), ...(d.visibilidad !== undefined ? [d.visibilidad] : [])]) if (!exprOk(x)) return false;
    }
    if (t.κ !== undefined && !esListaTextos(t.κ)) return false;
    if (t.actividad !== undefined && !(esMapa(t.actividad) && typeof t.actividad.característica === 'string' && Array.isArray(t.actividad.valores))) return false;
    if (t.restricciones !== undefined && !(Array.isArray(t.restricciones) && t.restricciones.every(exprOk))) return false;
  }
  return true;
}
function esRed(v) {
  if (!esMapa(v) || !esMapa(v.familias) || !esMapa(v.transiciones)) return false;
  for (const f of Object.values(v.familias)) if (!esMapa(f) || typeof f.especie !== 'string' || !esListaTextos(f.índices) || typeof f.restringida !== 'boolean') return false;
  for (const t of Object.values(v.transiciones)) {
    if (!esMapa(t) || !esMapa(t.args) || !Array.isArray(t.movimientos) || !['admitir', 'rechazar'].includes(t.nulo)) return false;
    if (!(t.restricción === 'todas' || t.restricción === 'ninguna' || esListaTextos(t.restricción))) return false;
    for (const x of [t.objetivo, t.canal]) if (x !== undefined && !exprOk(x)) return false;
    for (const m of t.movimientos) {
      if (!esMapa(m) || !Array.isArray(m.desde) || !Array.isArray(m.hacia) || typeof m.desde[0] !== 'string' || typeof m.hacia[0] !== 'string') return false;
      if (![...m.desde.slice(1), ...m.hacia.slice(1), m.cantidad].every(exprOk)) return false;
    }
  }
  if (v.auditoría === undefined) return true;
  return Array.isArray(v.auditoría) && v.auditoría.every(i => esMapa(i) && Array.isArray(i.términos) && i.términos.every(t => exprOk(t.coef) && Array.isArray(t.clave) && t.clave.every(exprOk)));
}
export const SIGMA = Object.freeze({
  'dominio.forma': { dominio: esForma, inicial: FORMA_INICIAL },
  'dominio.red': { dominio: esRed, inicial: RED_INICIAL },
  'dominio.liberaciones': { dominio: v => Array.isArray(v) && v.every(l => esMapa(l) && esListaTextos(l.transiciones) && typeof l.canal === 'string' && esListaTextos(l.familias)), inicial: LIBERACIONES_INICIAL },
  'dominio.alcancePropio': { dominio: v => esMapa(v) && Object.values(v).every(esListaTextos), inicial: {} },
  'dominio.propietarios': { dominio: v => v === null || esListaTextos(v), inicial: null },
  'dominio.lote': { dominio: v => esMapa(v) && Number.isSafeInteger(v.máximo) && v.máximo >= 1 && ['cadaPaso', 'final'].includes(v.guarda), inicial: { máximo: 50, guarda: 'cadaPaso' } },
  'dominio.conjunto': { dominio: v => esMapa(v) && ['rechazar', 'sinEfecto'].includes(v.añadirExistente) && ['rechazar', 'sinEfecto'].includes(v.quitarAusente), inicial: { añadirExistente: 'rechazar', quitarAusente: 'rechazar' } },
});

// ─────────────────────────── G^par (compatibilidad de épocas, §3, C.2, C.7) ───────────────────────────
function conValores(D, Φ, τ, kd) {
  for (const [k, e] of Object.entries(D.ent)) {
    if (e.tipo !== τ) continue;
    for (const c of [...Object.keys(propio(D.val, k) ?? {}), ...Object.keys(propio(D.conj, k) ?? {})]) if (claveDeclaracion(Φ, τ, c) === kd) return true;
  }
  return false;
}
function compatForma(Φ, Φ2, D) {
  for (const [τ, t] of Object.entries(Φ.tipos)) {
    const t2 = tipoDe(Φ2, τ);
    if (!t2) return 'formaQuitaTipo';
    const hay = Object.values(D.ent).some(e => e.tipo === τ);
    if (hay && (t.padre ?? null) !== (t2.padre ?? null)) return 'formaCambiaPadre';
    for (const [kd, d] of Object.entries(t.características)) {
      const d2 = propio(t2.características, kd);
      if (d.inmutable && !(d2?.inmutable)) return 'formaRelajaInmutable';
      if (!conValores(D, Φ, τ, kd)) continue;
      if (!esMapa(d2)) return 'formaQuitaCaracterística';
      if (d2.clase !== d.clase || (d2.cardinalidad ?? null) !== (d.cardinalidad ?? null)) return 'formaCambiaClase';
      if (!igual(d2.valor, d.valor)) return 'formaCambiaValor';
    }
    // C.2: cambiar κ o la actividad (qué entidades son activas) exige la fibra κ única entre las activas (VF10)
    if (hay && (!igual(t.κ ?? [], t2.κ ?? []) || !igual(t.actividad ?? null, t2.actividad ?? null))) {
      for (const k of Object.keys(D.ent)) if (D.ent[k].tipo === τ && κLibre(D, Φ2, k)) return 'κNoÚnica';
    }
  }
  return null;
}
function compatRed(𝒩, 𝒩2, D, Φ2) {
  for (const [cl, n] of Object.entries(D.m)) {
    if (n === 0) continue;
    const { f } = parsearLugar(cl);
    const F = propio(𝒩.familias, f), F2 = propio(𝒩2.familias, f);
    if (!esMapa(F2)) return 'redQuitaFamilia';
    if (F2.especie !== F?.especie) return 'redCambiaEspecie';
    if (!igual(F2.índices, F?.índices)) return 'redCambiaÍndices';                                                    // C.7
  }
  for (const F of Object.values(𝒩2.familias)) for (const τ of F.índices) if (τ !== '*' && !tipoDe(Φ2, τ)) return 'redTipoDesconocido';
  for (const T of Object.values(𝒩2.transiciones)) {
    for (const mv of T.movimientos) {
      const Fd = propio(𝒩2.familias, mv.desde[0]), Fh = propio(𝒩2.familias, mv.hacia[0]);
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
/** T = aplicar(D, efecto(D, e, C)); nd + 1. Usa SOLO `efecto` (C.1). */
export function T(D, e, par) {
  const D2 = aplicar(D, efecto(D, e, par));
  return { nd: D.nd + 1, ent: D2.ent, val: D2.val, conj: D2.conj, m: D2.m };
}
/**
 * crearRegla({guardaAdicional?}) → regla. `guardaAdicional(D, acción, {u, par, i, nacidos}) → motivo | null` se evalúa
 * DENTRO de la guarda para cada acción (simula una guarda corregida en código): T y los lectores no dependen de ella.
 */
export function crearRegla(opciones = {}) {
  return Object.freeze({
    id: ID_REGLA, D0, tipos: TIPOS, tiposInternos,
    guarda: guardaCon(typeof opciones.guardaAdicional === 'function' ? opciones.guardaAdicional : null),
    T, sigma: SIGMA, guardaPar, codD: D => D,
  });
}
export const REGLA = crearRegla();
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
const densos = (acc, Φ) => acc.claves().filter(k => tipoDe(Φ, acc.ent(k).tipo)?.denso === true).sort(cmpK).map(idDe);
export const coordenadas = (D, par) => densos(accD(D), par['dominio.forma']);
export function slot(D, par, id) {
  const n = coordenadas(D, par).findIndex(x => igual(x, id));
  return n < 0 ? null : n + 1;
}
export const marcado = D => ({ ...D.m });
export const valorLugar = (D, f, idx) => propio(D.m, claveLugar(f, idx)) ?? 0;

/** Disponibilidad por bodega sobre un marcado m (de S o de un acumulado). Supone índices [bodega, variante] (G^par C.7 los fija). */
function disponibilidadBodega(m, acc, Φ, w, v, cfg) {
  const F = cfg.familias, dem = cfg.demanda;
  const lv = (f, idx) => propio(m, claveLugar(f, idx)) ?? 0;
  let Pq = 0, P0 = 0;
  for (const k of acc.claves()) {
    if (acc.ent(k).tipo !== dem.tipo) continue;
    if (!igual(efectiva(acc, Φ, k, dem.bodega), w) || !igual(efectiva(acc, Φ, k, dem.variante), v)) continue;
    Pq += lv(F.pendiente, [idDe(k)]); P0 += lv(F.pendienteNoElegible, [idDe(k)]);
  }
  const H = lv(F.existencias, [w, v]), libre = lv(F.libre, [w, v]), Aq = lv(F.comprometido, [w, v]);
  return { H, A: Aq, P: Pq, P0, libre, noAsignada: Math.max(0, libre), prudente: Math.max(0, libre - Pq), déficit: Math.max(0, -libre),
    noApto: lv(F.noApto, [w, v]), descuadre: lv(F.descuadre, [w, v]) };
}
/** q_disp(w, v, cfg) (§7.4, C.3). w = null ⇒ total sobre las entidades del tipo al que apunta demanda.bodega, con la
 *  agregación de cfg (§10). Los max están en obs (L10). */
export function disponibilidadDe(m, acc, Φ, w, v, cfg = DISPONIBILIDAD_INICIAL) {
  if (w !== null) return disponibilidadBodega(m, acc, Φ, w, v, cfg);
  const τB = declaracion(Φ, cfg.demanda.tipo, cfg.demanda.bodega)?.valor?.ref;
  const B = acc.claves().filter(k => acc.ent(k).tipo === τB).sort(cmpK).map(idDe);
  const ds = B.map(b => disponibilidadBodega(m, acc, Φ, b, v, cfg));
  const Σ = f => ds.reduce((t, d) => t + f(d), 0);
  const sumaMax = cfg.agregación !== 'máximoDeSuma';
  const libre = Σ(d => d.libre), Pq = Σ(d => d.P);
  return { H: Σ(d => d.H), A: Σ(d => d.A), P: Pq, P0: Σ(d => d.P0), libre,
    noAsignada: sumaMax ? Σ(d => d.noAsignada) : Math.max(0, libre),
    prudente: sumaMax ? Σ(d => d.prudente) : Math.max(0, libre - Pq),
    déficit: sumaMax ? Σ(d => d.déficit) : Math.max(0, -libre),
    noApto: Σ(d => d.noApto), descuadre: Σ(d => d.descuadre) };
}
export const disponibilidad = (D, par, w, v, cfg = DISPONIBILIDAD_INICIAL) => disponibilidadDe(D.m, accD(D), par['dominio.forma'], w, v, cfg);

/** Auditoría (§7.6): VF5 (conservación por especie) + invariantes declaradas en 𝒩.auditoría. Devuelve las que FALLAN. */
export function auditoria(D, par, sumasEspecie) {
  const 𝒩 = par['dominio.red'];
  const fallos = new Set();
  const porEspecie = {};
  for (const [cl, n] of Object.entries(D.m)) { const e = propio(𝒩.familias, parsearLugar(cl).f)?.especie ?? '?'; porEspecie[e] = (porEspecie[e] ?? 0) + n; }
  for (const [e, s] of Object.entries(sumasEspecie ?? porEspecie)) if (s !== 0) fallos.add(`VF5:${e}`);
  const S = Smin(D, par);
  for (const inv of 𝒩.auditoría ?? []) {
    const grupos = new Map();
    for (const [cl, n] of Object.entries(D.m)) {
      const { f, idx } = parsearLugar(cl);
      for (const t of inv.términos) {
        if (t.f !== f) continue;
        const vars = {};
        idx.forEach((x, j) => { vars[`i${j}`] = idDe(x); });
        const c = { vars, parametros: par, S, lectores: LECTORES };
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

/** Visibilidad de un elemento (pregunta, no guarda): la regla vive en la declaración de la característica en Φ (C.3). */
export function visible(D, par, u, id, x, regla = null, c = VISIBILIDAD_INICIAL.característica) {
  const e = accD(D).ent(kid(id));
  const φ = regla ?? (e ? declaracion(par['dominio.forma'], e.tipo, c)?.visibilidad : null);
  if (!φ) return false;
  return evaluar(φ, { vars: { u, e: id, it: x }, parametros: par, S: Smin(D, par), lectores: LECTORES }) === true;
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
export const fibra = (D, par, c, valor, τ = TIPO_FIBRA) => fibraAcc(accD(D), par['dominio.forma'], c, valor, τ);
export const complemento = (F, U = F.conocidos) => U.filter(x => !F.miembros.some(y => igual(x, y)));
export function filtrar(D, par, τ, φ) {
  const acc = accD(D), S = Smin(D, par);
  return acc.claves().filter(k => acc.ent(k).tipo === τ).sort(cmpK).map(idDe).filter(id => evaluar(φ, { vars: { e: id }, parametros: par, S, lectores: LECTORES }) === true);
}
export function ficha(D, par, id, cfg = DISPONIBILIDAD_INICIAL) {
  const Φ = par['dominio.forma'], acc = accD(D), k = kid(id), e = acc.ent(k);
  if (!e) return null;
  const cs = new Set([...Object.keys(tipoDe(Φ, e.tipo).características).filter(c => !esFamilia(c)), ...acc.propias(k)]);
  if (e.padre) {
    const pk = kid(e.padre), pτ = acc.ent(pk).tipo;
    for (const c of [...Object.keys(tipoDe(Φ, pτ).características), ...acc.propias(pk)]) if (!esFamilia(c) && declaracion(Φ, pτ, c)?.heredable) cs.add(c);
  }
  const efectivaM = {};
  for (const c of [...cs].sort()) { const v = efectiva(acc, Φ, k, c); if (v !== undefined) efectivaM[c] = v; }
  const existencias = {};
  for (const [cl, n] of Object.entries(D.m)) { const { f, idx } = parsearLugar(cl); if (f === cfg.familias.existencias && idx[1] === k) existencias[idx[0]] = n; }
  return { id, tipo: e.tipo, slot: slot(D, par, id), efectiva: efectivaM, existencias };
}
/** movimientos(e) = W de la entrada evaluado en S_{k−1}: {lugar ↦ Δ}. Usa SOLO `efecto` (C.1): nunca lanza. */
export function movimientos(D, par, e) {
  const out = {};
  for (const [ck, el] of Object.entries(efecto(D, e, par))) if (claseCoord(ck) === 'm' && el['+'] !== 0) out[ck.slice(2)] = el['+'];
  return out;
}

// ─────────────────────────── aportes de entrada (sin estado) ───────────────────────────
export function nacimientos(e, k) {
  if (e.clase !== 'dominio' || !esMapa(e.args)) return [];
  const out = [];
  for (const a of accionesDe(e)) if (typeof a?.tipo === 'string' && a.tipo.startsWith('Nacer:')) out.push({ id: [k, out.length], tipo: a.tipo.slice('Nacer:'.length) });
  return out;
}
/** contribuciones(e, k, C): elemento del monoide mapa(etiquetas {último}) del catálogo de la fase 2 (C.4):
 *  «i.j|k» ↦ ['último', [{v} | {quitado: true}]] (asignación, ciclo, ref‑uno, y @tipo/@creador/@padre);
 *  «i.j|k|clave» ↦ ['último', [{v: x} | {quitado: true}]] (conjunto/ref‑muchos: (A,Q) por clave = «último» por elemento). */
export function contribuciones(e, k, par) {
  if (e.clase !== 'dominio' || !esMapa(e.args)) return {};
  const Φ = par['dominio.forma'];
  const pares = [], cx = { nacidos: [] };
  const pon = (key, x) => pares.push([key, ['último', [x]]]);
  for (const a of accionesDe(e)) {
    if (typeof a?.tipo !== 'string') continue;
    if (a.tipo.startsWith('Nacer:')) {
      const τ = a.tipo.slice('Nacer:'.length), tdef = tipoDe(Φ, τ);
      const valores = resolverTotal(a.args?.valores, cx) ?? {};
      const id = [k, cx.nacidos.length], ik = kid(id);
      cx.nacidos.push(id);
      pon(`${ik}|@tipo`, { v: τ });
      pon(`${ik}|@creador`, { v: e.u });
      pon(`${ik}|@padre`, { v: tdef?.padre && esID(propio(valores, tdef.padre)) ? valores[tdef.padre] : null });
      if (!tdef) continue;
      for (const [c, v] of Object.entries(valores)) {
        const d = declaracion(Φ, τ, c);
        if (!d) continue;
        if (esConj(d)) { if (Array.isArray(v)) for (const x of v) pon(`${ik}|${c}|${claveElemento(d, x)}`, { v: x }); } else if (v !== null) pon(`${ik}|${c}`, { v });
      }
      for (const [c, d] of Object.entries(tdef.características)) if (!esFamilia(c) && d.clase === 'ciclo' && !Object.hasOwn(valores, c)) pon(`${ik}|${c}`, { v: d.ciclo.inicial });
    } else if (RE_SECCION.test(a.tipo)) {
      const [, verbo, τ, c] = RE_SECCION.exec(a.tipo);
      const eid = resolverTotal(a.args?.e, cx);
      if (!esID(eid)) continue;
      const ik = kid(eid);
      if (verbo === 'Fijar') { const v = resolverTotal(a.args.v, cx); pon(`${ik}|${c}`, v === null ? { quitado: true } : { v }); }
      else { const x = resolverTotal(a.args.x, cx); pon(`${ik}|${c}|${claveElemento(declaracion(Φ, τ, c), x)}`, verbo === 'Añadir' ? { v: x } : { quitado: true }); }
    }
  }
  // dentro de una misma entrada, la última contribución a una clave gana («último»): se pliega con el monoide del catálogo
  return pares.reduce((acc, [key, val]) => M_CAT.op(acc, { [key]: val }), M_CAT.unidad);
}
function seccionesDeAcum(acum) {
  const secs = {};
  for (const [key, [, ult]] of Object.entries(acum ?? {})) {
    if (!ult.length) continue;
    const x = ult[0];
    const partes = key.split('|'), ik = partes[0], c = partes[1];
    const s = secs[ik] ?? (secs[ik] = { tipo: null, creador: null, padre: null, propia: {}, conj: {} });
    if (c === '@tipo') s.tipo = x.v;
    else if (c === '@creador') s.creador = x.v;
    else if (c === '@padre') s.padre = x.v;
    else if (partes.length === 2) { if (!x.quitado) s.propia[c] = x.v; }
    else if (!x.quitado) (s.conj[c] ??= {})[partes.slice(2).join('|')] = x.v;
  }
  const out = {};
  for (const ik of Object.keys(secs).sort(cmpK)) {
    const s = secs[ik];
    for (const [c, m] of Object.entries(s.conj)) s.propia[c] = Object.keys(m).sort().map(h => m[h]);
    const propia = {};
    for (const c of Object.keys(s.propia).sort()) propia[c] = s.propia[c];
    out[ik] = { tipo: s.tipo, creador: s.creador, padre: s.padre, propia };
  }
  return out;
}
export const seccionesCanonicas = D => {
  const secs = secciones(D), out = {};
  for (const ik of Object.keys(secs)) { const p = {}; for (const c of Object.keys(secs[ik].propia).sort()) p[c] = secs[ik].propia[c]; out[ik] = { ...secs[ik], propia: p }; }
  return out;
};

// ─────────────────────────── monoides: el ÚNICO catálogo (fase 2, C.4) + `nacimientos` (C.5) ───────────────────────────
/** Definición de referencia del monoide `nacimientos` (C.5): concatenación de listas de IDs; materializable (no es
 *  `secuencia`: su cociente de Nerode es él mismo porque cada ID hace falta para la alineación implícita, L29).
 *  La fase 3 lo añade al catálogo `kobalt/src/preguntas/monoides.mjs`; mientras no exista allí, el modelo usa esta. */
export const MONOIDE_NACIMIENTOS = Object.freeze({
  nombre: 'nacimientos', unidad: [], conmutativo: false, idempotente: false, grupo: false,
  op: (a, b) => [...a.map(x => [...x]), ...b.map(x => [...x])],
  inyectar: v => (Array.isArray(v) && v.every(esID) ? v.map(x => [...x]) : undefined),
});
export const monoideCatalogo = desc => {
  try { return P.monoide(desc); } catch (e) { if (desc?.nombre === 'nacimientos') return MONOIDE_NACIMIENTOS; throw e; }
};
const M_CLAVE = P.monoide({ nombre: 'sumaPorClave' });
const M_CAT = P.monoide({ nombre: 'mapa', parametros: { etiquetas: { último: { nombre: 'último' } } } });
const M_NAC = monoideCatalogo({ nombre: 'nacimientos' });

// ─────────────────────────── proyecciones (E1: forma monoidal del núcleo) ───────────────────────────
const base = id => ({ id, ver: 1, sensibleAEpoca: false, sensibleATiempo: false });
const especieDe = (par, cl) => propio(par['dominio.red'].familias, parsearLugar(cl).f)?.especie ?? '?';
const ordenada = m => Object.fromEntries(Object.entries(m).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

export const PROYECCIONES = Object.freeze({
  /** q_T (§7.1, C.5): monoide `nacimientos` de los nacimientos densos; slot = posición. No lee el estado. */
  T: Object.freeze({ ...base('dominio.T'), monoide: M_NAC,
    f: (e, ctx) => nacimientos(e, ctx.k).filter(n => tipoDe(ctx.parametros['dominio.forma'], n.tipo)?.denso === true).map(n => n.id),
    obs: acum => acum }),
  /** q_cat (§7.2): mapa(etiquetas {último}) de secciones PROPIAS; herencia y defectos en obs/lectores. No lee el estado. */
  catalogo: Object.freeze({ ...base('dominio.catalogo'), monoide: M_CAT,
    f: (e, ctx) => contribuciones(e, ctx.k, ctx.parametros), obs: acum => seccionesDeAcum(acum) }),
  /** marcado: sumaPorClave de los movimientos realizados (pregunta levantada, leeEstado). */
  marcado: Object.freeze({ ...base('dominio.marcado'), monoide: M_CLAVE, leeEstado: true,
    f: (e, ctx) => ordenada(movimientos(ctx.S.D, ctx.parametros, e)), obs: acum => acum }),
  /** q_aud (§7.6): Σ por especie (VF5) + invariantes declaradas sobre S. Debe ser vacía. */
  auditoria: Object.freeze({ ...base('dominio.auditoria'), monoide: M_CLAVE, leeEstado: true,
    f: (e, ctx) => { const out = {}; for (const [cl, d] of Object.entries(movimientos(ctx.S.D, ctx.parametros, e))) { const s = especieDe(ctx.parametros, cl); out[s] = sumaExacta(out[s] ?? 0, d); } return ordenada(Object.fromEntries(Object.entries(out).filter(([, x]) => x !== 0))); },
    obs: (acum, ctx) => auditoria(ctx.S.D, ctx.parametros, acum) }),
  /** q_readmisión(regla) (C.1): entradas que la guarda de `regla` ya no admitiría sobre su S_{k−1}. Informa; no impide leer. */
  readmision: (regla = REGLA) => Object.freeze({ ...base('dominio.readmision'), monoide: P.monoide({ nombre: 'unión' }), leeEstado: true,
    f: (e, ctx) => { if (e.clase !== 'dominio') return []; const g = regla.guarda(ctx.S.D, e, ctx.parametros); return g === 'ok' ? [] : [[ctx.k, g]]; },
    obs: acum => acum }),
  /** q_flat(w) (§7.3): Δ de existencias[w,·] por variante; obs alinea con T (defecto, L29). */
  flat: (w, defecto = 0, cfg = DISPONIBILIDAD_INICIAL) => Object.freeze({ ...base(`dominio.flat:${kid(w)}`), monoide: M_CLAVE, leeEstado: true,
    f: (e, ctx) => { const out = {}; for (const [cl, d] of Object.entries(movimientos(ctx.S.D, ctx.parametros, e))) { const { f, idx } = parsearLugar(cl); if (f === cfg.familias.existencias && idx[0] === kid(w)) out[idx[1]] = sumaExacta(out[idx[1]] ?? 0, d); } return ordenada(Object.fromEntries(Object.entries(out).filter(([, x]) => x !== 0))); },
    obs: (acum, ctx) => { const T = coordenadas(ctx.S.D, ctx.parametros); return { T, valores: T.map(v => propio(acum, kid(v)) ?? defecto) }; } }),
  /** q_disp(w, v, cfg) (§7.4, C.3) como pregunta levantada sumaPorClave sobre los lugares; obs con max y agregación. */
  disponibilidad: (w, v, cfg = DISPONIBILIDAD_INICIAL) => Object.freeze({ ...base(`dominio.disp:${w === null ? '*' : kid(w)}:${kid(v)}:${hexCV(cfg)}`), monoide: M_CLAVE, leeEstado: true,
    f: (e, ctx) => ordenada(movimientos(ctx.S.D, ctx.parametros, e)),
    obs: (acum, ctx) => disponibilidadDe(acum, accD(ctx.S.D), ctx.parametros['dominio.forma'], w, v, cfg) }),
  /** q_fibra(k, v, τ) (§7.5) sobre las secciones propias de q_cat + Φ vigente (herencia en obs). */
  fibra: (c, valor, τ = TIPO_FIBRA) => Object.freeze({ ...base(`dominio.fibra:${τ}:${c}:${hexCV(valor)}`), monoide: M_CAT,
    f: (e, ctx) => contribuciones(e, ctx.k, ctx.parametros),
    obs: (acum, ctx) => fibraAcc(accSecciones(seccionesDeAcum(acum)), ctx.parametros['dominio.forma'], c, valor, τ) }),
});
