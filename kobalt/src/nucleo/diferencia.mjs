// Kobalt · núcleo · diferencia — Δ(objetivo, actualidad): la ÚNICA operación de «trabajo» (spec §7.8, L30; enmienda E7).
// Núcleo puro.
//
// Correspondencia:
//   instancia (U, id, rec[, Reconocidos])                 ↔ {id: o → identidad CV, rec: (o, A) → bool, reconocidos?: A → Iterable}
//   igualdad de identidades ι = ι'                        ↔ claveId(ι) = claveId(ι') con claveId = hex(CV(ι))   (E7)
//   Conflictos(O) = {ι : ∃o ≠ o' ∈ O, id(o) = id(o') = ι}  ↔ conflictos   («≠» por contenido CV; primera aparición)
//   Δ(O, A) = {o ∈ O : id(o) ∉ Conflictos(O) ∧ ¬rec(o, A)} ↔ delta        (deduplicado por identidad: L13, Δ6)
//   Exceso(O, A) = Reconocidos(A) ∖ id(O)                  ↔ exceso
//
// Δ es PURA: no escribe nada. Aplicarla pasa siempre por una operación con guarda (AppendIfHead, Incorporar, put por Q);
// sobre el exceso el núcleo NUNCA actúa (no hay borrado implícito). Importar, faltantes, sincronizar, actualizar
// proyecciones y adquirir material son elecciones de (U, id, rec): la función es la misma (Teorema 7.8, Δ1–Δ6).
// E7: las identidades son VALORES CV y se comparan por su codificación canónica. Con identidades compuestas (listas,
// mapas), comparar referencias no deduplicaría (L13). Una identidad que no es un valor CV lanza un error.
// Hipótesis que debe cumplir quien la usa: (H1) `id` determinista; (H2) aplicación con guarda de identidad (G2) o con
// efecto absoluto. Con un sid aleatorio por intento y una acción relativa, el efecto se duplica [T].

import { cv } from './cv.mjs';
import { bytesAHex } from './bytes.mjs';

/** Clave canónica de una identidad: hex(CV(ι)). Lanza si ι no es un valor CV. */
const claveId = ι => bytesAHex(cv(ι));

export function diferencia(O, A, instancia) {
  const ids = O.map(o => instancia.id(o));
  const claves = ids.map(claveId);
  const contenidos = new Map(); // claveId ↦ conjunto de contenidos CV distintos
  const primera = new Map();    // claveId ↦ la identidad tal como apareció por primera vez
  O.forEach((o, j) => {
    const k = claves[j];
    if (!contenidos.has(k)) { contenidos.set(k, new Set()); primera.set(k, ids[j]); }
    contenidos.get(k).add(bytesAHex(cv(o)));
  });
  const enConflicto = new Set();
  for (const [k, cs] of contenidos) if (cs.size > 1) enConflicto.add(k);
  const conflictos = [...enConflicto].map(k => primera.get(k));
  const vistos = new Set();
  const delta = [];
  O.forEach((o, j) => {
    const k = claves[j];
    if (enConflicto.has(k) || vistos.has(k)) return; // misma identidad, mismo requisito: cuenta una sola vez
    vistos.add(k);
    if (!instancia.rec(o, A)) delta.push(o);
  });
  const exceso = instancia.reconocidos ? [...instancia.reconocidos(A)].filter(ι => !contenidos.has(claveId(ι))) : [];
  return { delta, conflictos, exceso };
}
