// Kobalt · preguntas · observaciones — repertorio de observaciones genéricas obs (spec fase 2 §7.5, Anexo B). Núcleo puro.
//
// Correspondencia (obs : M × ctx_j → Y; se aplica SIEMPRE al leer, nunca se guarda: Corolario E1.3):
//   identidad                      ↔ acum
//   valor{de} (P7, L15)            ↔ eval(de) con vars {acum, tRef}
//   componente{clave}              ↔ acum[c] ?? 0                         (cociente menor: m[c], Anexo B.3)
//   ordenDesc{n} (ranking)         ↔ n primeros por valor desc, clave asc (sin cociente menor que el mapa)
//   fibra{universo, conocidos}     ↔ miembros y complemento RELATIVO a los conocidos (L2)
//   aplicar{x0}                    ↔ x0 + min(0, e) (mín) · x0 + max(0, e) (máx)   (cociente menor: (s, min(0,e)))
//   cociente                       ↔ fracción reducida [a, b], b > 0 sobre tupla(suma, suma)
//   umbral{op, valor}              ↔ acum op valor  (NO congruente: por eso se guarda acum y no obs(acum), L10)
//   lista{saldo?}                  ↔ la secuencia, o [[it, Σ saldo(it)]…] (kárdex genérico = Γ filtrada)
//   Los parámetros que son valores son EXPRESIONES evaluadas con {parametros: C_{ε_j}, S: S_j si leeEstado,
//   vars: {tRef, acum}} y sin entrada. umbral.op es el único literal.
//
// Leyes: L10 (obs no necesita ser congruente: nunca se actualiza obs(acum)), L15 (tRef solo lo lee obs; el checkpoint
// no lo lleva), L2 (complemento relativo a los conocidos), L34 (cocientes declarados en el comentario de cada obs).

import { esMapa, ent, aEntero, pertenece } from './valores.mjs';
import { validarExpr, evaluar } from './expresiones.mjs';

/** Para cada obs: monoides sobre los que se define, parámetros-expresión, literales y opcionales. */
export const OBSERVACIONES = Object.freeze({
  identidad: { sobre: null, exprs: [] },
  valor: { sobre: null, exprs: ['de'] },
  componente: { sobre: ['sumaPorClave', 'conteo'], exprs: ['clave'] },
  ordenDesc: { sobre: ['sumaPorClave', 'conteo'], exprs: ['n'] },
  fibra: { sobre: ['unión', 'conjuntoAQ'], exprs: ['universo', 'conocidos'] },
  aplicar: { sobre: ['extremoPrefijo'], exprs: ['x0'] },
  cociente: { sobre: ['tupla'], exprs: [] },
  umbral: { sobre: ['suma', 'mínimo', 'máximo'], exprs: ['valor'], literales: { op: ['<', '≤', '=', '≥', '>'] } },
  lista: { sobre: ['secuencia'], exprs: ['saldo'], opcionales: ['saldo'] },
});

/** Buena forma de obs sobre el monoide M (ya construido). → {ok, leeEstado, usaTRef} | {ok:false, motivo}. */
export function validarObs(desc, M, lectores) {
  if (!esMapa(desc) || typeof desc.nombre !== 'string' || !Object.keys(desc).every(k => k === 'nombre' || k === 'parametros')) {
    return { ok: false, motivo: 'obs: descriptor inválido' };
  }
  if (!Object.hasOwn(OBSERVACIONES, desc.nombre)) return { ok: false, motivo: `obs desconocida: ${desc.nombre}` };
  const O = OBSERVACIONES[desc.nombre];
  if (O.sobre && !O.sobre.includes(M.nombre)) return { ok: false, motivo: `obs ${desc.nombre} no se define sobre ${M.nombre}` };
  if (desc.nombre === 'cociente' && !(M.componentes?.length === 2 && M.componentes.every(c => c.nombre === 'suma'))) {
    return { ok: false, motivo: 'obs cociente: solo sobre tupla(suma, suma)' };
  }
  const P = desc.parametros ?? {};
  if (!esMapa(P)) return { ok: false, motivo: 'obs: los parámetros no son un mapa' };
  const literales = O.literales ?? {};
  const permitidos = [...O.exprs, ...Object.keys(literales)];
  if (!Object.keys(P).every(k => permitidos.includes(k))) return { ok: false, motivo: 'obs: parámetro sobrante' };
  const info = { ok: true, leeEstado: false, usaTRef: false };
  for (const k of permitidos) {
    if (!Object.hasOwn(P, k)) {
      if ((O.opcionales ?? []).includes(k)) continue;
      return { ok: false, motivo: `obs ${desc.nombre}: falta el parámetro ${k}` };
    }
    if (Object.hasOwn(literales, k)) {
      if (!literales[k].includes(P[k])) return { ok: false, motivo: `obs ${desc.nombre}: ${k} fuera de su dominio` };
      continue;
    }
    const r = validarExpr(P[k], lectores);
    if (!r.ok) return { ok: false, motivo: `obs ${desc.nombre}.${k}: ${r.motivo}` };
    info.leeEstado ||= r.leeEstado;
    info.usaTRef ||= r.usaTRef;
  }
  return info;
}

const mcd = (a, b) => (b === 0n ? a : mcd(b, a % b));
const COMPARA = Object.freeze({ '<': (a, b) => a < b, '≤': (a, b) => a <= b, '=': (a, b) => a === b, '≥': (a, b) => a >= b, '>': (a, b) => a > b });

/** obs(acum, amb) para un descriptor válido sobre M. amb = {parametros, S?, vars: {tRef, acum}, lectores}. */
export function funcionObs(desc, M) {
  const P = desc.parametros ?? {};
  const par = (k, amb) => evaluar(P[k], amb);
  switch (desc.nombre) {
    case 'identidad': return acum => acum;
    case 'valor': return (acum, amb) => par('de', amb);
    case 'componente': return (acum, amb) => {
      const c = par('clave', amb);
      if (typeof c !== 'string') return null;
      return Object.hasOwn(acum, c) ? acum[c] : 0;
    };
    case 'ordenDesc': return (acum, amb) => {
      const n = par('n', amb);
      if (!ent(n) || n < 0) return null;
      return Object.entries(acum)
        .sort(([ka, va], [kb, vb]) => (vb !== va ? (vb > va ? 1 : -1) : ka < kb ? -1 : ka > kb ? 1 : 0))
        .slice(0, n);
    };
    case 'fibra': return (acum, amb) => {
      const U = par('universo', amb), K = par('conocidos', amb);
      if (!Array.isArray(U) || !Array.isArray(K) || K.length !== U.length || !K.every(b => typeof b === 'boolean')) return null;
      const A = M.nombre === 'conjuntoAQ' ? acum[0] : acum;
      const miembros = U.map(x => pertenece(A, x));
      return { miembros, complemento: U.map((_, i) => K[i] && !miembros[i]) };
    };
    case 'aplicar': return (acum, amb) => {
      const x0 = par('x0', amb);
      if (!ent(x0)) return null;
      const e = acum[1];
      const d = e === null ? 0 : M.modo === 'mín' ? Math.min(0, e) : Math.max(0, e);
      return aEntero(BigInt(x0) + BigInt(d));
    };
    case 'cociente': return acum => {
      const [a, b] = acum;
      if (b === 0) return null;
      let x = BigInt(a), y = BigInt(b);
      if (y < 0n) { x = -x; y = -y; }
      const d = mcd(x < 0n ? -x : x, y);
      return [aEntero(x / d), aEntero(y / d)];
    };
    case 'umbral': return (acum, amb) => {
      const v = par('valor', amb);
      if (!ent(v) || !ent(acum)) return null;
      return COMPARA[P.op](acum, v);
    };
    case 'lista': return (acum, amb) => {
      if (!Object.hasOwn(P, 'saldo')) return acum;
      let s = 0n; const out = [];
      for (const it of acum) {
        const d = evaluar(P.saldo, { ...amb, vars: { ...amb.vars, it } });
        if (!ent(d)) return null;
        s += BigInt(d);
        const sv = aEntero(s);
        if (sv === null) return null;
        out.push([it, sv]);
      }
      return out;
    };
    default: throw new Error(`obs desconocida: ${desc.nombre}`);
  }
}
