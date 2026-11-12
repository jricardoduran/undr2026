// Kobalt — utilidades comunes de las pruebas de la fase 2 (preguntas). No es un archivo de pruebas.
// Lectores de juguete, el grupo S₃, generadores de expresiones, de preguntas (desde el catálogo), de elementos de cada
// monoide y de trayectorias (reglas de juguete del modelo del núcleo: contador@1/@2, conjunto@1, compuesto@1).
// Semilla: KOBALT_SEED (la de nucleo.comun.mjs). Casos: KOBALT_CASOS.

import * as MN from '../modelos/nucleo.modelo.mjs';
import * as C from './nucleo.comun.mjs';

export const { SEMILLA, CASOS, prng, entero, elegir } = C;
export const R = MN.REGISTRO_JUGUETE;
const esMapa = v => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Uint8Array);

// ─────────── Lectores de juguete (los registra la «fase 3» de juguete; aquí son datos de prueba) ───────────
/** valor@1 (estado): valor de `clave` en S (explícito o defecto de contador@*); null si no hay. */
export const valorLector = (S, clave) => {
  if (!S?.D || !esMapa(S.D.v) || typeof clave !== 'string') return null;
  if (Object.hasOwn(S.D.v, clave)) return S.D.v[clave];
  return Number.isSafeInteger(S.parametros?.defecto) ? S.parametros.defecto : null;
};
/** miembros@1 (estado): miembros de conjunto@1, ordenados. */
export const miembrosLector = S => (S?.D && esMapa(S.D.miembros) ? Object.keys(S.D.miembros).sort() : []);
/** internos@1 (entrada): acciones internas de un `lote` (compuesto@1). */
export const internosLector = e => (e.tipo === 'lote' && Array.isArray(e.args?.acciones) ? [...e.args.acciones] : []);
/** claveDe@1 (entrada): la clave tocada por una entrada de contador@* o conjunto@1. */
export const claveLector = e => (esMapa(e.args) ? (typeof e.args.clave === 'string' ? e.args.clave : typeof e.args.x === 'string' ? e.args.x : null) : null);

export function lectoresJuguete(api) {
  let L = api.LECTORES_VACIO;
  L = api.registrarLector(L, 'valor@1', { clase: 'estado', fn: valorLector });
  L = api.registrarLector(L, 'miembros@1', { clase: 'estado', fn: miembrosLector });
  L = api.registrarLector(L, 'internos@1', { clase: 'entrada', fn: internosLector });
  L = api.registrarLector(L, 'claveDe@1', { clase: 'entrada', fn: claveLector });
  return L;
}

// ─────────── S₃ (grupo no conmutativo de juguete, Teorema 7.2) ───────────
// Elementos: permutaciones de [0,1,2]; a ⊗ b = «primero a, luego b»: (a⊗b)[x] = b[a[x]].
export const S3_ELEMENTOS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
export const S3 = Object.freeze({
  unidad: [0, 1, 2], op: (a, b) => [b[a[0]], b[a[1]], b[a[2]]],
  inv: a => { const r = [0, 0, 0]; a.forEach((y, x) => { r[y] = x; }); return r; }, conmutativo: false,
});
// Monoides no conmutativos «de tabla» para el Teorema 7.3 (independientes del catálogo).
export const NO_CONMUTATIVOS = Object.freeze({
  S3,
  sumaMinPref: { unidad: [0, null], op: ([s1, e1], [s2, e2]) => [s1 + s2, e1 === null ? (e2 === null ? null : s1 + e2) : e2 === null ? e1 : Math.min(e1, s1 + e2)] },
  ultimo: { unidad: [], op: (a, b) => (b.length ? b : a) },
  secuencia: { unidad: [], op: (a, b) => [...a, ...b] },
  matrices2: { unidad: [1, 0, 0, 1], op: ([a, b, c, d], [e, f, g, h]) => [(a * e + b * g) % 7, (a * f + b * h) % 7, (c * e + d * g) % 7, (c * f + d * h) % 7] },
});
export const elementoNoConm = (r, nombre) => {
  switch (nombre) {
    case 'S3': return elegir(r, S3_ELEMENTOS);
    case 'sumaMinPref': { const q = entero(r, -3, 3); return [q, q]; }
    case 'ultimo': return r() < 0.3 ? [] : [entero(r, 0, 9)];
    case 'secuencia': return Array.from({ length: entero(r, 0, 2) }, () => entero(r, 0, 9));
    default: return [entero(r, 0, 6), entero(r, 0, 6), entero(r, 0, 6), entero(r, 0, 6)];
  }
};

// ─────────── Expresiones aleatorias (totalidad del lenguaje §4.2) ───────────
const CONST = [null, true, false, 0, 1, -1, 2, 7, 2 ** 53 - 1, -(2 ** 53 - 1), '', 'a', 'b', 'sumar', 'fijar', 'ab', [1, 'a'], ['a', 'b'], { clave: 'a' }, { a: 1, b: [2] }, Uint8Array.of(1, 2)];
const RUTAS = [['clave'], ['q'], ['v'], ['x'], ['acciones'], ['acciones', 0], ['requiere', 'clave'], [0], ['nada', 'más']];
const OPS = ['+', '−', '×', '=', '≠', '<', '≤', 'y', 'o', 'no', 'si', 'en', 'prefijo', 'long', 'lista', 'mapa', 'campo', 'nulo?'];
const ARIDAD = { '+': [0, 3], '−': [1, 2], '×': [0, 3], '=': [2, 2], '≠': [2, 2], '<': [2, 2], '≤': [2, 2], y: [0, 3], o: [0, 3], no: [1, 1], si: [3, 3], en: [2, 2], prefijo: [2, 2], long: [1, 1], lista: [0, 3], mapa: [0, 4], campo: [2, 2], 'nulo?': [1, 1] };
export function generarExpr(r, prof = 0, conLectores = true) {
  const t = r();
  if (prof > 3 || t < 0.3) {
    const h = entero(r, 0, conLectores ? 6 : 4);
    switch (h) {
      case 0: return { v: structuredClone(elegir(r, CONST)) };
      case 1: return { e: elegir(r, ['tipo', 'u', 'epoca', 'sid', 'clase', 'k']) };
      case 2: return { a: elegir(r, RUTAS) };
      case 3: return { p: elegir(r, ['límite', 'defecto', 'factor', 'nucleo.regla', 'nada']) };
      case 4: return { x: elegir(r, ['tRef', 'acum', 'it', 'nada']) };
      case 5: return { lee: elegir(r, ['valor@1', 'claveDe@1']), con: [generarExpr(r, prof + 1, conLectores)] };
      default: return { lee: elegir(r, ['internos@1', 'miembros@1']), con: [] };
    }
  }
  const op = elegir(r, OPS);
  let [a, b] = ARIDAD[op]; let n = entero(r, a, b); if (op === 'mapa' && n % 2) n--;
  const de = Array.from({ length: n }, (_, i) => (op === 'mapa' && i % 2 === 0 && r() < 0.8 ? { v: elegir(r, ['a', 'b', 'c']) } : generarExpr(r, prof + 1, conLectores)));
  return { op, de };
}

// ─────────── Trayectorias ───────────
/** Escenario del núcleo (contador@1 con épocas, migraciones, rechazos intercalados): devuelve ΓX. */
export function trayectoria(seed, largo) {
  const esc = C.generarEscenario(MN, seed, largo);
  return C.ejecutarPuro(MN, esc).ΓX;
}
export function trayectoriaConjunto(seed) { return C.ejecutarPuro(MN, C.generarEscenarioConjunto(MN, seed)).ΓX; }
export function trayectoriaCompuesto(seed) { return C.ejecutarPuro(MN, C.generarEscenarioCompuesto(MN, seed)).ΓX; }

/** Trayectoria dirigida: lista de {u?, tipo, args} comprometidas en orden sobre contador@1 con límite 'ninguno'. */
export function trayectoriaDe(acciones, streamId = C.STREAM_X, C0extra = {}) {
  let Γ = MN.trayectoriaNueva({ streamId, predecesor: null, C0: { 'nucleo.regla': 'contador@1', 'nucleo.constituyente': 'dueño', 'límite': 'ninguno', ...C0extra } }, R).Γ;
  acciones.forEach((a, i) => {
    const res = MN.comprometer(Γ, MN.cabezaDe(Γ), 'dueño', { u: a.u ?? 'dueño', sid: (i + 1).toString(16).padStart(6, '0') + streamId.slice(0, 2), tipo: a.tipo, args: a.args, deps: a.deps ?? [] }, { registro: R, conocidas: a.conocidas ?? {} });
    if (res.resultado !== 'COMPROMETIDO') throw new Error(`trayectoriaDe: ${a.tipo} ${JSON.stringify(a.args)} ⇒ ${JSON.stringify(res)}`);
    Γ = res.Γ;
  });
  return Γ;
}
/** Acciones aleatorias siempre admisibles en contador@1 con límite 'ninguno'. */
export function accionesLibres(r, n) {
  return Array.from({ length: n }, () => (r() < 0.65
    ? { tipo: 'sumar', args: { clave: elegir(r, ['a', 'b', 'c']), q: entero(r, -3, 4) } }
    : { tipo: 'fijar', args: { clave: elegir(r, ['a', 'b', 'c']), v: entero(r, -2, 6) } }));
}
export const streamN = i => (i + 16).toString(16).padStart(2, '0').repeat(16);

// ─────────── Preguntas generadas desde el catálogo ───────────
const ATOMOS_φ = [
  { v: true },
  { op: '=', de: [{ e: 'tipo' }, { v: 'sumar' }] },
  { op: '=', de: [{ e: 'tipo' }, { v: 'fijar' }] },
  { op: '=', de: [{ e: 'clase' }, { v: 'dominio' }] },
  { op: '=', de: [{ a: ['clave'] }, { v: 'a' }] },
  { op: 'en', de: [{ e: 'u' }, { v: ['dueño', 'cajero'] }] },
  { op: '≤', de: [{ e: 'epoca' }, { v: 1 }] },
  { op: '=', de: [{ p: 'límite' }, { v: 'ninguno' }] },
  { op: 'prefijo', de: [{ v: 'contador' }, { p: 'nucleo.regla' }] },
  { op: '<', de: [{ v: 0 }, { a: ['q'] }] },
];
export function generarφ(r, prof = 0) {
  const t = r();
  if (prof > 1 || t < 0.55) return structuredClone(elegir(r, ATOMOS_φ));
  if (t < 0.7) return { op: 'no', de: [generarφ(r, prof + 1)] };
  return { op: elegir(r, ['y', 'o']), de: [generarφ(r, prof + 1), generarφ(r, prof + 1)] };
}
const max0 = x => ({ op: 'si', de: [{ op: '<', de: [x, { v: 0 }] }, { v: 0 }, x] });
const TREF = { x: 'tRef' };
/** Plantillas (M, aporte, obs[]) con reglas de juguete (§7.8). */
export const PLANTILLAS = [
  () => ({ M: { nombre: 'suma' }, aporte: { a: ['q'] }, obs: [{ nombre: 'identidad' }, { nombre: 'umbral', parametros: { op: '≥', valor: TREF } }, { nombre: 'valor', parametros: { de: { op: '+', de: [{ x: 'acum' }, TREF] } } }] }),
  () => ({ M: { nombre: 'suma' }, aporte: { op: '−', de: [{ a: ['v'] }, { e: 'k' }] }, obs: [{ nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'sumaPorClave' }, aporte: { clave: { a: ['clave'] }, valor: { a: ['q'] } }, obs: [{ nombre: 'identidad' }, { nombre: 'componente', parametros: { clave: { v: 'a' } } }, { nombre: 'ordenDesc', parametros: { n: { v: 2 } } }] }),
  () => ({ M: { nombre: 'conteo' }, aporte: { clave: { e: 'tipo' }, valor: { v: 1 } }, obs: [{ nombre: 'identidad' }, { nombre: 'ordenDesc', parametros: { n: { v: 3 } } }, { nombre: 'componente', parametros: { clave: { v: 'sumar' } } }] }),
  () => ({ M: { nombre: 'conteo' }, aporte: { clave: { lee: 'claveDe@1', con: [] }, valor: { v: 2 } }, obs: [{ nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'mínimo' }, aporte: { a: ['v'] }, obs: [{ nombre: 'identidad' }, { nombre: 'umbral', parametros: { op: '<', valor: { v: 0 } } }] }),
  () => ({ M: { nombre: 'máximo' }, aporte: { e: 'k' }, obs: [{ nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'último' }, aporte: { a: ['clave'] }, obs: [{ nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'último' }, aporte: { e: 'k' }, obs: [{ nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'máximoPor' }, aporte: { op: 'lista', de: [{ a: ['v'] }, { e: 'u' }] }, obs: [{ nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'extremoPrefijo', parametros: { modo: 'mín' } }, aporte: { op: 'lista', de: [{ a: ['q'] }, { a: ['q'] }] }, obs: [{ nombre: 'aplicar', parametros: { x0: { v: 0 } } }, { nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'extremoPrefijo', parametros: { modo: 'máx' } }, aporte: { op: 'lista', de: [{ a: ['q'] }, { a: ['q'] }] }, obs: [{ nombre: 'aplicar', parametros: { x0: { v: 5 } } }] }),
  () => ({ M: { nombre: 'unión' }, aporte: { op: 'lista', de: [{ lee: 'claveDe@1', con: [] }] }, obs: [{ nombre: 'identidad' }, { nombre: 'fibra', parametros: { universo: { v: ['a', 'b', 'c', 'd'] }, conocidos: { v: [true, true, true, false] } } }] }),
  () => ({ M: { nombre: 'conjuntoAQ' }, aporte: { op: 'lista', de: [
    { op: 'si', de: [{ op: 'o', de: [{ op: '=', de: [{ e: 'tipo' }, { v: 'añadir' }] }, { op: '=', de: [{ e: 'tipo' }, { v: 'fijar' }] }] }, { op: 'lista', de: [{ lee: 'claveDe@1', con: [] }] }, { v: [] }] },
    { op: 'si', de: [{ op: 'o', de: [{ op: '=', de: [{ e: 'tipo' }, { v: 'quitar' }] }, { op: '=', de: [{ e: 'tipo' }, { v: 'sumar' }] }] }, { op: 'lista', de: [{ lee: 'claveDe@1', con: [] }] }, { v: [] }] }] },
    obs: [{ nombre: 'identidad' }, { nombre: 'fibra', parametros: { universo: { v: ['a', 'b', 'c', 'd'] }, conocidos: { v: [true, true, false, true] } } }] }),
  () => ({ M: { nombre: 'secuencia' }, aporte: { op: 'lista', de: [{ op: 'mapa', de: [{ v: 'k' }, { e: 'k' }, { v: 't' }, { e: 'tipo' }] }] }, obs: [{ nombre: 'identidad' }, { nombre: 'lista', parametros: { saldo: { op: 'si', de: [{ op: '=', de: [{ op: 'campo', de: [{ x: 'it' }, { v: 't' }] }, { v: 'sumar' }] }, { v: 1 }, { v: 0 }] } } }] }),
  () => ({ M: { nombre: 'tupla', parametros: { de: [{ nombre: 'suma' }, { nombre: 'suma' }] } }, aporte: { op: 'lista', de: [{ a: ['q'] }, { v: 1 }] }, obs: [{ nombre: 'cociente' }, { nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'tupla', parametros: { de: [{ nombre: 'conteo' }, { nombre: 'suma' }] } }, aporte: { op: 'lista', de: [{ op: 'mapa', de: [{ v: 'clave' }, { e: 'tipo' }, { v: 'valor' }, { v: 1 }] }, { a: ['q'] }] }, obs: [{ nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'mapa', parametros: { etiquetas: { ult: { nombre: 'último' }, sum: { nombre: 'suma' } } } },
    aporte: { clave: { a: ['clave'] }, etiqueta: { op: 'si', de: [{ op: '=', de: [{ e: 'tipo' }, { v: 'fijar' }] }, { v: 'ult' }, { v: 'sum' }] }, valor: { op: 'si', de: [{ op: '=', de: [{ e: 'tipo' }, { v: 'fijar' }] }, { a: ['v'] }, { a: ['q'] }] } },
    obs: [{ nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'mapa', parametros: { etiquetas: { sum: { nombre: 'suma' }, min: { nombre: 'mínimo' } } } },
    aporte: { clave: { a: ['clave'] }, etiqueta: { v: 'sum' }, valor: { a: ['q'] } }, obs: [{ nombre: 'identidad' }] }),
  // dependiente del estado (E1.2): «merma» de juguete = max(0, valor(S_{k−1}, clave) − v) en cada `fijar`
  () => ({ M: { nombre: 'suma' }, aporte: max0({ op: '−', de: [{ lee: 'valor@1', con: [{ a: ['clave'] }] }, { a: ['v'] }] }), obs: [{ nombre: 'identidad' }, { nombre: 'valor', parametros: { de: { op: 'lista', de: [{ x: 'acum' }, { lee: 'valor@1', con: [{ v: 'a' }] }] } } }], φ: { op: '=', de: [{ e: 'tipo' }, { v: 'fijar' }] } }),
  () => ({ M: { nombre: 'último' }, aporte: { lee: 'valor@1', con: [{ a: ['clave'] }] }, obs: [{ nombre: 'identidad' }] }),
  () => ({ M: { nombre: 'sumaPorClave' }, aporte: { clave: { a: ['clave'] }, valor: { op: '−', de: [{ a: ['v'] }, { lee: 'valor@1', con: [{ a: ['clave'] }] }] } }, obs: [{ nombre: 'identidad' }], φ: { op: '=', de: [{ e: 'tipo' }, { v: 'fijar' }] } }),
];
export function generarSimple(r, filtro = () => true) {
  for (;;) {
    const p = elegir(r, PLANTILLAS)();
    const q = { φ: p.φ && r() < 0.7 ? p.φ : generarφ(r), aporte: p.aporte, M: p.M, obs: elegir(r, p.obs) };
    if (r() < 0.2) q.sello = elegir(r, [{ e: 'k' }, { a: ['v'] }, { op: '×', de: [{ e: 'k' }, { v: 10 }] }]);
    if (filtro(q)) return q;
  }
}
export function generarPregunta(r, filtro) {
  if (r() < 0.15) return Array.from({ length: entero(r, 2, 3) }, () => generarSimple(r, filtro));
  return generarSimple(r, filtro);
}

// ─────────── Elementos de cada monoide del catálogo (leyes L33) ───────────
const XS = ['a', 'b', 'c', 'd'];
const subconj = r => XS.filter(() => r() < 0.4);
export const DESCRIPTORES = [
  { nombre: 'suma' }, { nombre: 'sumaPorClave' }, { nombre: 'conteo' }, { nombre: 'mínimo' }, { nombre: 'máximo' },
  { nombre: 'último' }, { nombre: 'máximoPor' }, { nombre: 'extremoPrefijo', parametros: { modo: 'mín' } },
  { nombre: 'extremoPrefijo', parametros: { modo: 'máx' } }, { nombre: 'unión' }, { nombre: 'conjuntoAQ' }, { nombre: 'secuencia' },
  { nombre: 'tupla', parametros: { de: [{ nombre: 'suma' }, { nombre: 'extremoPrefijo', parametros: { modo: 'mín' } }] } },
  { nombre: 'tupla', parametros: { de: [{ nombre: 'suma' }, { nombre: 'conteo' }] } },
  { nombre: 'tupla', parametros: { de: [{ nombre: 'unión' }, { nombre: 'máximo' }] } },
  { nombre: 'mapa', parametros: { etiquetas: { ult: { nombre: 'último' }, sum: { nombre: 'suma' } } } },
  { nombre: 'mapa', parametros: { etiquetas: { sum: { nombre: 'suma' }, uni: { nombre: 'unión' } } } },
  { nombre: 'escaneo', parametros: { de: { nombre: 'extremoPrefijo', parametros: { modo: 'mín' } } } },
  { nombre: 'escaneo', parametros: { de: { nombre: 'suma' } } },
  { nombre: 'segmentos', parametros: { de: { nombre: 'último' } } },
  { nombre: 'segmentos', parametros: { de: { nombre: 'suma' } } },
];
export function elemento(r, desc, api) {
  switch (desc.nombre) {
    case 'suma': return entero(r, -5, 5);
    case 'sumaPorClave': case 'conteo': {
      const o = {}; for (const k of ['a', 'b', 'c']) if (r() < 0.5) { const v = desc.nombre === 'conteo' ? entero(r, 1, 3) : elegir(r, [-3, -2, -1, 1, 2, 3]); o[k] = v; }
      return o;
    }
    case 'mínimo': case 'máximo': return r() < 0.2 ? null : entero(r, -5, 5);
    case 'último': return r() < 0.25 ? [] : [elegir(r, [0, 1, 'a', 'b', [1], null])];
    case 'máximoPor': return r() < 0.2 ? null : [entero(r, 0, 3), elegir(r, ['a', 'b', 0, null, [2]])];
    case 'extremoPrefijo': return [entero(r, -3, 3), r() < 0.2 ? null : entero(r, -4, 3)];
    case 'unión': return api.conj(subconj(r));
    case 'conjuntoAQ': return [api.conj(subconj(r)), api.conj(subconj(r))];
    case 'secuencia': return Array.from({ length: entero(r, 0, 3) }, () => elegir(r, [0, 1, 'a', [2]]));
    case 'tupla': return desc.parametros.de.map(d => elemento(r, d, api));
    case 'mapa': {
      if (r() < 0.08) return null;
      const T = desc.parametros.etiquetas; const o = {};
      for (const k of ['a', 'b']) if (r() < 0.6) { const τ = elegir(r, Object.keys(T).sort()); o[k] = [τ, elemento(r, T[τ], api)]; }
      return o;
    }
    case 'escaneo': // cualquier par (L, t) es un elemento de escaneo(M) (asociativo para todo par)
      return [Array.from({ length: entero(r, 0, 3) }, () => elemento(r, desc.parametros.de, api)), elemento(r, desc.parametros.de, api)];
    case 'segmentos': {
      const B = api.monoide(desc.parametros.de);
      return api.construirSegmentos(B, Array.from({ length: entero(r, 0, 5) }, () => elemento(r, desc.parametros.de, api)));
    }
    default: throw new Error(`sin generador para ${desc.nombre}`);
  }
}

// Vector publicado: identidad de una pregunta fija (𝔇("kobalt:preguntas:q:1", CV(q)), con la 𝔇 y la CV del núcleo).
export const VECTOR_IDENTIDAD = Object.freeze({
  q: { φ: { v: true }, aporte: { a: ['q'] }, M: { nombre: 'suma' }, obs: { nombre: 'identidad' } },
  id: 'a5672b886b6b0935eec23db3f58be8ffa64990253fa1e5eab9e2e43d1bd3c0d0',
});
