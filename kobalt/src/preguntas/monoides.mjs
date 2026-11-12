// Kobalt · preguntas · monoides — repertorio de monoides genéricos (spec fase 2 §7.3, Anexo B) y los dos teoremas de
// intervalos (7.2 y 7.3). Núcleo puro: sin I/O, sin reloj, sin azar.
//
// Correspondencia (M = (unidad, ⊗ [, inv]) con sus leyes declaradas como DATO):
//   (ℤ, +, 0)                                     ↔ 'suma'           (grupo)
//   (ℤ^X, +, 0) mapas dispersos sin ceros         ↔ 'sumaPorClave'   (grupo)
//   (ℕ^X, +) ⊂ ℤ^X                                ↔ 'conteo'         (envolvente = sumaPorClave: resta en ℤ^X)
//   (ℤ ∪ {±∞}, min/max), ±∞ ↔ null                ↔ 'mínimo' · 'máximo'          (semirretículos)
//   X ∪ {1}, x ⊗ y = y si y ≠ 1                   ↔ 'último'  ([] = 1, [x])      (NO conmutativo)
//   (clave, v) con máximo lexicográfico           ↔ 'máximoPor'  (desempate por hex(CV(v)))
//   (s, e)⊗(s', e') = (s+s', ext(e, s+e'))        ↔ 'extremoPrefijo' {modo: mín|máx}
//   (𝒫(X), ∪, ∅)                                  ↔ 'unión'
//   (A, Q)⊗(A', Q') = ((A∖Q')∪A', (Q∖A')∪Q')      ↔ 'conjuntoAQ'
//   (A*, ‖, ε)                                    ↔ 'secuencia'     (cociente de Nerode = la propia lista: L34)
//   M₁ × … × M_m (§7.3, componente a componente) ↔ 'tupla' {de: [M…]}  (nombre fijado por el Anexo B.1)
//   X ⇀ M_τ con etiqueta τ por valor              ↔ 'mapa' {etiquetas}  (null absorbente = mal formada; NUNCA grupo)
//   escaneo(M): (L, t)(L', t') = (L ‖ t⊗L', t⊗t') ↔ 'escaneo' {de}    (VQ2: tabla de prefijos como pregunta)
//   segmentos(M): niveles de bloques diádicos     ↔ 'segmentos' {de}  (VQ3: índice de segmentos como pregunta)
//   valor del aporte → elemento de M               ↔ inyectar(v) (undefined = «no aporta» ⇒ la contribución es la unidad)
//   q_leyes(M) (P3, P4, L34)                       ↔ leyes(desc | M)
//   Teorema 7.2: acum(i, j) = P_i⁻¹ ⊗ P_j          ↔ intervalo por prefijos  (¡no P_j ⊗ P_i⁻¹!)
//   Teorema 7.3: ⊗ en orden de bloques diádicos    ↔ intervalo por segmentos · construirSegmentos
//
// Leyes: L33 (VQ4: asociatividad, unidad e indicadores declarados = reales; lo comprueban las pruebas), L34 (qué se
// guarda: el elemento de M, o nada si contiene 'secuencia'), P3 (grupos e intervalos por prefijos, también en la
// envolvente ℤ^X), P4 (conmutativo ⇒ partición; conmutativo e idempotente ⇒ cubrimiento; si no, por trayectoria).
// [L] Los enteros son los seguros de JS: una suma que se sale lanza (frontera de ℤ, no un error de la pregunta).
// [L] El ⊗ de 'escaneo' y 'segmentos' es puro y copia: plegar n contribuciones cuesta O(n²) en tiempo.

import {
  esMapa, ent, sinMenosCero, sumaExacta, mapaDe, conj, pertenece, compararCV,
} from './valores.mjs';

const copia = v => structuredClone(v);

// ─────────── Piezas ───────────
/** a + b en ℤ^X (claves texto, sin ceros). */
function sumarMapas(a, b) {
  const m = new Map(Object.entries(a));
  for (const [k, x] of Object.entries(b)) {
    const y = sumaExacta(m.has(k) ? m.get(k) : 0, x);
    if (y === 0) m.delete(k); else m.set(k, y);
  }
  return mapaDe([...m.entries()].sort(([p], [q]) => (p < q ? -1 : p > q ? 1 : 0)));
}
const negarMapa = a => mapaDe(Object.keys(a).sort().map(k => [k, sinMenosCero(-a[k])]));
const inyectarClave = (v, minimo) => (esMapa(v) && typeof v.clave === 'string' && ent(v.valor) && v.valor >= minimo
  ? (v.valor === 0 ? {} : mapaDe([[v.clave, sinMenosCero(v.valor)]]))
  : undefined);
const extremo = f => (x, y) => (x === null ? y : y === null ? x : f(x, y));

const BASE = Object.freeze({ conmutativo: false, idempotente: false, grupo: false });

function exigirSinParametros(nombre, P) { if (Object.keys(P).length) throw new Error(`monoide ${nombre}: no admite parámetros`); }
function exigirSoloDe(nombre, P) { if (Object.keys(P).length !== 1 || !Object.hasOwn(P, 'de')) throw new Error(`monoide ${nombre}: parámetros {de: M}`); }

/** M₁ × … × M_m sobre monoides ya construidos. */
export function tuplaDeMonoides(Ms) {
  const grupo = Ms.every(m => m.grupo);
  const conEnvolvente = !grupo && Ms.every(m => m.grupo || m.envolvente);
  return {
    nombre: 'tupla', componentes: Ms,
    unidad: Ms.map(m => copia(m.unidad)),
    op: (a, b) => Ms.map((m, i) => m.op(a[i], b[i])),
    ...(grupo ? { inv: a => Ms.map((m, i) => m.inv(a[i])) } : {}),
    conmutativo: Ms.every(m => m.conmutativo), idempotente: Ms.every(m => m.idempotente), grupo,
    ...(conEnvolvente ? { envolvente: tuplaDeMonoides(Ms.map(m => (m.grupo ? m : m.envolvente))) } : {}),
    inyectar: v => (Array.isArray(v) && v.length === Ms.length
      ? Ms.map((m, i) => { const c = m.inyectar(v[i]); return c === undefined ? copia(m.unidad) : c; })
      : undefined),
  };
}

/** escaneo(B) o segmentos(B) sobre un monoide ya construido (también sobre tuplas de preguntas). */
export function monoideDerivado(nombre, B) {
  if (nombre === 'escaneo') {
    return {
      ...BASE, nombre, base: B, unidad: [[], copia(B.unidad)],
      op: ([L1, t1], [L2, t2]) => [[...L1, ...L2.map(x => B.op(t1, x))], B.op(t1, t2)],
      inyectar: v => { const c = B.inyectar(v); const x = c === undefined ? copia(B.unidad) : c; return [[x], copia(x)]; },
    };
  }
  return {
    ...BASE, nombre, base: B, unidad: [],
    op: (a, b) => construirSegmentos(B, [...(a[0] ?? []), ...(b[0] ?? [])]),
    inyectar: v => { const c = B.inyectar(v); return [[c === undefined ? copia(B.unidad) : c]]; },
  };
}

/** monoide(desc) → {nombre, unidad, op, inv?, conmutativo, idempotente, grupo, envolvente?, inyectar}. Lanza si desc no es del repertorio. */
export function monoide(desc) {
  if (!esMapa(desc) || typeof desc.nombre !== 'string') throw new Error('monoide: descriptor inválido');
  if (!Object.keys(desc).every(k => k === 'nombre' || k === 'parametros')) throw new Error('monoide: claves sobrantes en el descriptor');
  const P = desc.parametros ?? {};
  if (!esMapa(P)) throw new Error('monoide: los parámetros no son un mapa');
  const { nombre } = desc;
  switch (nombre) {
    case 'suma':
      exigirSinParametros(nombre, P);
      return { ...BASE, nombre, unidad: 0, op: sumaExacta, inv: a => sinMenosCero(-a), conmutativo: true, grupo: true, inyectar: v => (ent(v) ? sinMenosCero(v) : undefined) };
    case 'sumaPorClave':
      exigirSinParametros(nombre, P);
      return { ...BASE, nombre, unidad: {}, op: sumarMapas, inv: negarMapa, conmutativo: true, grupo: true, inyectar: v => inyectarClave(v, -Infinity) };
    case 'conteo':
      exigirSinParametros(nombre, P);
      return { ...BASE, nombre, unidad: {}, op: sumarMapas, conmutativo: true, envolvente: monoide({ nombre: 'sumaPorClave' }), inyectar: v => inyectarClave(v, 0) };
    case 'mínimo': case 'máximo':
      exigirSinParametros(nombre, P);
      return { ...BASE, nombre, unidad: null, op: extremo(nombre === 'mínimo' ? Math.min : Math.max), conmutativo: true, idempotente: true, inyectar: v => (ent(v) ? sinMenosCero(v) : undefined) };
    case 'último':
      exigirSinParametros(nombre, P);
      return { ...BASE, nombre, unidad: [], op: (a, b) => (b.length ? b : a), idempotente: true, inyectar: v => (v === null ? undefined : [v]) };
    case 'máximoPor': {
      exigirSinParametros(nombre, P);
      const gana = (a, b) => (a[0] !== b[0] ? a[0] > b[0] : compararCV(a[1], b[1]) >= 0);
      return {
        ...BASE, nombre, unidad: null, op: (a, b) => (a === null ? b : b === null ? a : gana(a, b) ? a : b), conmutativo: true, idempotente: true,
        inyectar: v => (Array.isArray(v) && v.length === 2 && ent(v[0]) ? [sinMenosCero(v[0]), v[1]] : undefined),
      };
    }
    case 'extremoPrefijo': {
      if (Object.keys(P).length !== 1 || (P.modo !== 'mín' && P.modo !== 'máx')) throw new Error('monoide extremoPrefijo: parámetros {modo: mín|máx}');
      const ext = extremo(P.modo === 'mín' ? Math.min : Math.max);
      return {
        ...BASE, nombre, modo: P.modo, unidad: [0, null],
        op: ([s1, e1], [s2, e2]) => [sumaExacta(s1, s2), ext(e1, e2 === null ? null : sumaExacta(s1, e2))],
        inyectar: v => (Array.isArray(v) && v.length === 2 && ent(v[0]) && (v[1] === null || ent(v[1]))
          ? [sinMenosCero(v[0]), v[1] === null ? null : sinMenosCero(v[1])] : undefined),
      };
    }
    case 'unión':
      exigirSinParametros(nombre, P);
      return { ...BASE, nombre, unidad: [], op: (a, b) => conj([...a, ...b]), conmutativo: true, idempotente: true, inyectar: v => (Array.isArray(v) ? conj(v) : undefined) };
    case 'conjuntoAQ':
      exigirSinParametros(nombre, P);
      return {
        ...BASE, nombre, unidad: [[], []], idempotente: true,
        op: ([A1, Q1], [A2, Q2]) => [conj([...A1.filter(x => !pertenece(Q2, x)), ...A2]), conj([...Q1.filter(x => !pertenece(A2, x)), ...Q2])],
        inyectar: v => (Array.isArray(v) && v.length === 2 && Array.isArray(v[0]) && Array.isArray(v[1]) ? [conj(v[0]), conj(v[1])] : undefined),
      };
    case 'secuencia':
      exigirSinParametros(nombre, P);
      return { ...BASE, nombre, unidad: [], op: (a, b) => [...a, ...b], inyectar: v => (Array.isArray(v) ? v : undefined) };
    case 'tupla':
      if (Object.keys(P).length !== 1 || !Array.isArray(P.de) || P.de.length < 1) throw new Error('monoide tupla: parámetros {de: [M…]} con m ≥ 1');
      return tuplaDeMonoides(P.de.map(monoide));
    case 'mapa': {
      if (Object.keys(P).length !== 1 || !esMapa(P.etiquetas) || !Object.keys(P.etiquetas).length) throw new Error('monoide mapa: parámetros {etiquetas: {τ: M}}');
      const T = new Map();
      for (const [τ, d] of Object.entries(P.etiquetas)) {
        const m = monoide(d);
        if (m.nombre === 'mapa') throw new Error('monoide mapa: una etiqueta no puede ser otro mapa');
        T.set(τ, m);
      }
      const op = (a, b) => {
        if (a === null || b === null) return null; // mal formada: absorbente
        const r = new Map(Object.entries(a));
        for (const [k, [τ, y]] of Object.entries(b)) {
          if (!r.has(k)) { r.set(k, [τ, y]); continue; }
          const [τa, x] = r.get(k);
          if (τa !== τ) return null; // dos etiquetas en una clave
          r.set(k, [τ, T.get(τ).op(x, y)]);
        }
        return mapaDe([...r.entries()].sort(([p], [q]) => (p < q ? -1 : p > q ? 1 : 0)));
      };
      const todos = [...T.values()];
      return {
        ...BASE, nombre, unidad: {}, op, etiquetas: Object.fromEntries(T),
        conmutativo: todos.every(m => m.conmutativo), idempotente: todos.every(m => m.idempotente), grupo: false,
        inyectar: v => {
          if (!esMapa(v) || typeof v.clave !== 'string' || typeof v.etiqueta !== 'string' || !T.has(v.etiqueta) || !Object.hasOwn(v, 'valor')) return undefined;
          const m = T.get(v.etiqueta).inyectar(v.valor);
          return m === undefined ? undefined : mapaDe([[v.clave, [v.etiqueta, m]]]);
        },
      };
    }
    case 'escaneo': case 'segmentos':
      exigirSoloDe(nombre, P);
      return monoideDerivado(nombre, monoide(P.de));
    default:
      throw new Error(`monoide desconocido: ${nombre}`);
  }
}

/** ¿Contiene 'secuencia'? (su cociente de Nerode es la propia lista: no se materializa, L34). */
function contieneSecuencia(m) {
  if (m.nombre === 'secuencia') return true;
  if ((m.componentes ?? []).some(contieneSecuencia)) return true;
  if (Object.values(m.etiquetas ?? {}).some(contieneSecuencia)) return true;
  return m.base ? contieneSecuencia(m.base) : false;
}

/** q_leyes(M): lo que la arquitectura contesta sola. Acepta un descriptor o un monoide ya construido. */
export function leyes(desc) {
  const m = desc && typeof desc.op === 'function' ? desc : monoide(desc);
  const prefijos = m.grupo || Boolean(m.envolvente);
  return {
    conmutativo: m.conmutativo, idempotente: m.idempotente, grupo: m.grupo, envolvente: Boolean(m.envolvente),
    ventana: prefijos ? 'prefijos' : 'segmentos',
    distribucion: m.conmutativo ? (m.idempotente ? 'cubrimiento' : 'particion') : 'no',
    materializable: !contieneSecuencia(m),
  };
}

// ─────────── Intervalos (i, j] sobre cualquier {unidad, op, inv?} ───────────
/** VQ3: N₀ = lista; N_ℓ[b] = N_{ℓ−1}[2b] ⊗ N_{ℓ−1}[2b+1]; hasta un nivel con < 2 bloques. [] si la lista es vacía. */
export function construirSegmentos(M, lista) {
  if (!lista.length) return [];
  const niveles = [lista.map(copia)];
  for (let prev = niveles[0]; prev.length >= 2; prev = niveles[niveles.length - 1]) {
    const sig = [];
    for (let b = 0; 2 * b + 1 < prev.length; b++) sig.push(M.op(prev[2 * b], prev[2 * b + 1]));
    niveles.push(sig);
  }
  return niveles;
}

/** Teorema 7.3: acum(i, j) = ⊗ EN ORDEN de los bloques diádicos alineados que cubren (i, j]. usados ≤ 2⌈log₂ n⌉. */
export function ventanaSegmentos(M, niveles, i, j) {
  const n = niveles.length ? niveles[0].length : 0;
  if (!ent(i) || !ent(j) || i < 0 || i > j || j > n) throw new Error('intervalo fuera de la materialización de segmentos');
  let acum = copia(M.unidad), pos = i, usados = 0;
  while (pos < j) {
    // el bloque más alto alineado en pos que no se pasa de j
    let l = 0;
    while (l + 1 < niveles.length && pos % 2 ** (l + 1) === 0 && pos + 2 ** (l + 1) <= j) l++;
    acum = M.op(acum, niveles[l][pos / 2 ** l]);
    pos += 2 ** l; usados++;
  }
  return { acum, usados };
}

/** Teorema 7.2: acum(i, j) = P_i⁻¹ ⊗ P_j, con tabla = [P₁ … P_n] y P₀ = unidad. Exige M.inv. usados ≤ 2. */
export function ventanaPrefijos(M, tabla, i, j) {
  if (typeof M.inv !== 'function') throw new Error('intervalo por prefijos: M no es un grupo');
  if (!ent(i) || !ent(j) || i < 0 || i > j || j > tabla.length) throw new Error('intervalo fuera de la tabla de prefijos');
  const P = k => (k === 0 ? copia(M.unidad) : copia(tabla[k - 1]));
  return { acum: M.op(M.inv(P(i)), P(j)), usados: (i > 0 ? 1 : 0) + (j > 0 ? 1 : 0) };
}
