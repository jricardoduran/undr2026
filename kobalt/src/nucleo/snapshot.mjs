// Kobalt · núcleo · snapshot — Snapshots y la ÚNICA forma de obtener S_k (spec §7.2; enmienda E5). Núcleo puro.
//
// Correspondencia:
//   snapshot (S_n, n, h_n, ε_n, ver, Q = 𝔇(T_N, CV(S_n)))       ↔ crearSnapshot / restaurarSnapshot
//   S_k = Fold(S_0, Γ_k)  o  Fold(restaurar(snap), Γ_{n_snap:k}) ↔ estadoPorSnapshot(Γ, k, registro, snapshots)
//
// E5 [D]: dentro del núcleo, S_k SOLO se obtiene por Fold desde la génesis o desde un snapshot validado contra h_{n_snap}
// de la Γ local verificada. Una lista de estados en caché (`Γ.estados`) es una proyección sin checkpoint: se IGNORA.
// Leyes: L4 (snapshot + sufijo = Fold; el snapshot no es otra fuente de verdad), L22 (solo se usa si h_n coincide),
// L27 (todo snapshot es reconstruible). [L] Q detecta corrupción de bytes del snapshot, NO un S_n mal calculado (L23).

import { cv } from './cv.mjs';
import { derivar, ETIQUETAS } from './derivacion.mjs';
import { estadoInicial, fold } from './contrato.mjs';

const codS = (S, registro) => {
  const regla = registro[S.parametros['nucleo.regla']];
  return { D: regla.codD ? regla.codD(S.D) : S.D, epoca: S.epoca, n: S.n, parametros: S.parametros, sellado: S.sellado, sids: S.sids };
};

/** Snapshot de S_n en la posición de hash h. */
export function crearSnapshot(S, h, registro) {
  return { S: structuredClone(S), n: S.n, h, epoca: S.epoca, ver: S.parametros['nucleo.regla'], Q: derivar(ETIQUETAS.SNAPSHOT, cv(codS(S, registro))) };
}

/** S si el snapshot casa con la Γ local verificada (h_n) y su Q es íntegro; si no, null. */
export function restaurarSnapshot(snap, hashesLocales, registro) {
  if (!snap || !snap.S || !Number.isSafeInteger(snap.n) || hashesLocales[snap.n] !== snap.h) return null;
  if (snap.S.n !== snap.n || snap.S.epoca !== snap.epoca) return null;
  let Q;
  try { Q = derivar(ETIQUETAS.SNAPSHOT, cv(codS(snap.S, registro))); } catch { return null; }
  return Q === snap.Q ? structuredClone(snap.S) : null;
}

/** S_k con el mayor snapshot válido ≤ k más el sufijo, o desde la génesis. Γ = {g, entradas, hashes}. → {S, desde}. */
export function estadoPorSnapshot(Γ, k, registro, snapshots = []) {
  const candidatos = snapshots.filter(s => s && Number.isSafeInteger(s.n) && s.n <= k).sort((a, b) => b.n - a.n);
  for (const s of candidatos) {
    const R = restaurarSnapshot(s, Γ.hashes, registro);
    if (R) return { S: fold(R, Γ.entradas.slice(s.n, k), registro), desde: s.n };
  }
  return { S: fold(estadoInicial(Γ.g, registro), Γ.entradas.slice(0, k), registro), desde: 0 };
}
