// Kobalt — modelo de referencia (oráculo) del ámbito de inventario H/A/P.
//
// Es la traducción literal de las leyes de la skill `kobalt-kernels`
// (references/leyes.md, L3–L15). No busca eficiencia: es la definición contra la
// que se comparan las implementaciones reales. No usa almacenamiento ni red.
//
//   Γ ∈ A*  (trayectoria append-only)        S_n = Fold(S_0, Γ_n)
//   Accept_C(u,a,S) ⟺ Authorized_C(u,a) ∧ Admissible_C(a,S)
//   h_0 = H(dominio ‖ ámbito),  h_{n+1} = H(h_n ‖ Frame(Encode(a_{n+1})))

import { createHash } from 'node:crypto';

// ───────────────────────── Estado y transformación T ─────────────────────────
// Estado mínimo suficiente (cociente de Nerode respecto de las preguntas de
// disponibilidad): por producto {H, A} y el mapa de solicitudes/asignaciones
// identificadas. P NO se guarda como acumulador: se deriva del mapa (L10).

export const estadoInicial = () => ({ productos: {}, registros: {} });

const prod = (S, p) => S.productos[p] ?? { H: 0, A: 0 };

/** Admisibilidad: GUARDAS de cada acción (L7: guardas ≠ invariantes). */
export function admisible(S, a) {
  const r = a.id !== undefined ? S.registros[a.id] : undefined;
  switch (a.tipo) {
    case 'Ingresar':        return a.q > 0;
    case 'CorregirConteo':  return a.h >= 0;                       // puede dejar H < A: déficit legítimo
    case 'Solicitar':       return a.q > 0 && r === undefined;     // identidad nueva (idempotencia L13)
    case 'Asignar':         return r?.estado === 'pendiente'
                                   && prod(S, r.p).H - prod(S, r.p).A >= r.q;   // guarda H−A ≥ q
    case 'Rechazar':        return r?.estado === 'pendiente';
    case 'AsignarInterna':  return a.q > 0 && r === undefined
                                   && prod(S, a.p).H - prod(S, a.p).A >= a.q;
    case 'Despachar':       return r?.estado === 'asignada' && prod(S, r.p).H >= r.q;
    default:                return false;
  }
}

/** T_C : S × A ⇀ S. Pura: nunca muta S. Solo se llama si admisible(S,a). */
export function transformar(S, a) {
  const productos = { ...S.productos };
  const registros = { ...S.registros };
  const upd = (p, f) => { productos[p] = f({ ...prod(S, p) }); };
  const r = a.id !== undefined ? S.registros[a.id] : undefined;
  switch (a.tipo) {
    case 'Ingresar':       upd(a.p, x => ({ ...x, H: x.H + a.q })); break;
    case 'CorregirConteo': upd(a.p, x => ({ ...x, H: a.h })); break;
    case 'Solicitar':      registros[a.id] = { p: a.p, q: a.q, estado: 'pendiente' }; break;
    case 'Asignar':        registros[a.id] = { ...r, estado: 'asignada' };
                           upd(r.p, x => ({ ...x, A: x.A + r.q })); break;
    case 'Rechazar':       registros[a.id] = { ...r, estado: 'rechazada' }; break;
    case 'AsignarInterna': registros[a.id] = { p: a.p, q: a.q, estado: 'asignada' };
                           upd(a.p, x => ({ ...x, A: x.A + a.q })); break;
    case 'Despachar':      registros[a.id] = { ...r, estado: 'despachada' };
                           upd(r.p, x => ({ ...x, H: x.H - r.q, A: x.A - r.q })); break;
    default: throw new Error(`acción desconocida: ${a.tipo}`);
  }
  return { productos, registros };
}

/** Fold: acción del monoide libre A* sobre S (L4). */
export const fold = (S0, acciones) => acciones.reduce(transformar, S0);

// ───────────────────────── Contrato: autoridad ─────────────────────────
// «Muchos pueden solicitar; un mecanismo constituye el compromiso» (L16).
export const contratoDemo = {
  admin:    new Set(['Ingresar', 'CorregirConteo', 'Solicitar', 'Asignar', 'Rechazar', 'AsignarInterna', 'Despachar']),
  vendedor: new Set(['Solicitar']),
};
export const autorizado = (contrato, actor, a) => contrato[actor]?.has(a.tipo) ?? false;

// ───────────────────────── Trayectoria y cadena de hashes ─────────────────────────
const sha = (...partes) => {
  const h = createHash('sha256');
  // Frame: conteo + longitud de cada parte, para que [ab,c] ≠ [a,bc].
  h.update(Buffer.from(String(partes.length).padStart(8, '0')));
  for (const p of partes) { const b = Buffer.from(p); h.update(Buffer.from(String(b.length).padStart(16, '0'))); h.update(b); }
  return h.digest('hex');
};
// Codificación canónica de una acción (claves ordenadas). En producción esto lo
// fija el contrato de derivación de Exacto, no JSON.stringify sin más.
export const codificar = a => JSON.stringify(Object.keys(a).sort().reduce((o, k) => (o[k] = a[k], o), {}));

export function genesis(streamId) {
  return { streamId, acciones: [], hashes: [sha('kobalt/ejemplo/v1', streamId)], S: estadoInicial() };
}
export const cabeza = Γ => ({ streamId: Γ.streamId, n: Γ.acciones.length, h: Γ.hashes.at(-1) });

/**
 * AppendIfHead(Γ, (n,h_n), a): compromiso atómico (L8). Devuelve una NUEVA
 * trayectoria (Γ_n ⪯ Γ_{n+1}) o {rechazo}. Nunca modifica Γ.
 */
export function comprometer(Γ, cabezaEsperada, actor, a, contrato = contratoDemo) {
  const c = cabeza(Γ);
  if (cabezaEsperada.n !== c.n || cabezaEsperada.h !== c.h) return { rechazo: 'CABEZA_CAMBIADA' };
  if (!autorizado(contrato, actor, a)) return { rechazo: 'NO_AUTORIZADO' };
  if (!admisible(Γ.S, a)) return { rechazo: 'NO_ADMISIBLE' };
  return {
    Γ: {
      streamId: Γ.streamId,
      acciones: [...Γ.acciones, a],
      hashes: [...Γ.hashes, sha(c.h, codificar(a))],
      S: transformar(Γ.S, a),
    },
  };
}

/** Recalcula la cadena; detecta manipulación y truncamiento respecto de un checkpoint (L22). */
export function verificarCadena(streamId, acciones, checkpoint) {
  let h = sha('kobalt/ejemplo/v1', streamId);
  for (let i = 0; i < acciones.length; i++) {
    h = sha(h, codificar(acciones[i]));
    if (checkpoint && i + 1 === checkpoint.n && h !== checkpoint.h) return { ok: false, motivo: 'PREFIJO_DISTINTO' };
  }
  if (checkpoint && acciones.length < checkpoint.n) return { ok: false, motivo: 'TRUNCADA' };
  return { ok: true, h };
}

// ───────────────────────── Proyecciones Π_q ─────────────────────────
export const pendientes = (S, p) =>
  Object.values(S.registros).filter(r => r.p === p && r.estado === 'pendiente').reduce((s, r) => s + r.q, 0);
export const noAsignada = (S, p) => Math.max(0, prod(S, p).H - prod(S, p).A);
export const prudente   = (S, p) => Math.max(0, prod(S, p).H - prod(S, p).A - pendientes(S, p));
export const deficit    = (S, p) => Math.max(0, prod(S, p).A - prod(S, p).H);

// ───────────────────────── Proyección incremental (optimización) ─────────────────────────
// Estado de proyección: agregados por producto + mapa de registros abiertos.
// Sin el mapa, Y={H,A,P} NO es incremental: Asignar(id) necesita (p,q) de la
// solicitud concreta (L10). La reconstrucción completa es el oráculo (L9).
export const proyeccionVacia = () => ({ agg: {}, abiertos: {} });

export function actualizarIncremental(Y, acciones) {
  const agg = structuredClone(Y.agg), abiertos = structuredClone(Y.abiertos);
  const g = p => (agg[p] ??= { H: 0, A: 0, P: 0 });
  for (const a of acciones) {
    const r = abiertos[a.id];
    switch (a.tipo) {
      case 'Ingresar':       g(a.p).H += a.q; break;
      case 'CorregirConteo': g(a.p).H = a.h; break;
      case 'Solicitar':      g(a.p).P += a.q; abiertos[a.id] = { p: a.p, q: a.q, estado: 'pendiente' }; break;
      case 'Asignar':        g(r.p).P -= r.q; g(r.p).A += r.q; r.estado = 'asignada'; break;
      case 'Rechazar':       g(r.p).P -= r.q; delete abiertos[a.id]; break;
      case 'AsignarInterna': g(a.p).A += a.q; abiertos[a.id] = { p: a.p, q: a.q, estado: 'asignada' }; break;
      case 'Despachar':      g(r.p).H -= r.q; g(r.p).A -= r.q; delete abiertos[a.id]; break;
    }
  }
  return { agg, abiertos };
}
export const prudenteDesdeY = (Y, p) => { const x = Y.agg[p] ?? { H: 0, A: 0, P: 0 }; return Math.max(0, x.H - x.A - x.P); };
