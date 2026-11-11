// Kobalt · núcleo · diferencia — Δ(objetivo, actualidad): la ÚNICA operación de «trabajo» (spec §7.8, L30). Núcleo puro.
//
// Correspondencia:
//   instancia (U, id, rec[, Reconocidos])                 ↔ {id: o → identidad, rec: (o, A) → bool, reconocidos?: A → Iterable}
//   Conflictos(O) = {ι : ∃o ≠ o' ∈ O, id(o) = id(o') = ι}  ↔ conflictos   («≠» por contenido CV)
//   Δ(O, A) = {o ∈ O : id(o) ∉ Conflictos(O) ∧ ¬rec(o, A)} ↔ delta        (deduplicado por identidad: L13, Δ6)
//   Exceso(O, A) = Reconocidos(A) ∖ id(O)                  ↔ exceso
//
// Δ es PURA: no escribe nada. Aplicarla pasa siempre por una operación con guarda (AppendIfHead, Incorporar, put por Q);
// sobre el exceso el núcleo NUNCA actúa (no hay borrado implícito). Importar, faltantes, sincronizar, actualizar
// proyecciones y adquirir material son elecciones de (U, id, rec): la función es la misma (Teorema 7.8, Δ1–Δ6).
// Hipótesis que debe cumplir quien la usa: (H1) `id` determinista; (H2) aplicación con guarda de identidad (G2) o con
// efecto absoluto. Con un sid aleatorio por intento y una acción relativa, el efecto se duplica [T].

import { cv } from './cv.mjs';
import { bytesAHex } from './bytes.mjs';

export function diferencia(O, A, instancia) {
  const contenidos = new Map(); // identidad ↦ conjunto de contenidos CV distintos
  for (const o of O) {
    const ι = instancia.id(o);
    if (!contenidos.has(ι)) contenidos.set(ι, new Set());
    contenidos.get(ι).add(bytesAHex(cv(o)));
  }
  const conflictos = [];
  for (const [ι, cs] of contenidos) if (cs.size > 1) conflictos.push(ι);
  const enConflicto = new Set(conflictos);
  const vistos = new Set();
  const delta = [];
  for (const o of O) {
    const ι = instancia.id(o);
    if (enConflicto.has(ι) || vistos.has(ι)) continue; // misma identidad, mismo requisito: cuenta una sola vez
    vistos.add(ι);
    if (!instancia.rec(o, A)) delta.push(o);
  }
  const exceso = instancia.reconocidos ? [...instancia.reconocidos(A)].filter(ι => !contenidos.has(ι)) : [];
  return { delta, conflictos, exceso };
}
