// Kobalt · núcleo · nodo — Regla `nucleo.nodo@1`: la configuración del nodo es un contrato (spec §3.4–§3.5, L31).
//
// Correspondencia:
//   Γ_{Nodo_d} con regla nucleo.nodo@1        ↔ trayectoria local cuya génesis declara 'nucleo.regla': 'nucleo.nodo@1'
//   Σ_{nodo} (dominio, valor inicial)         ↔ REGLA_NODO.sigma
//   cambiar la configuración del nodo         ↔ FijarParámetro en Γ_{Nodo_d} (abre una época de ese nodo)
//
// Sin acciones de dominio: solo parámetros. Ninguno cambia una respuesta; solo cuándo o cómo se calcula.
// Cada posibilidad que la matemática abre está en el dominio; el valor elegido solo aparece como `inicial` (L31).
// Prohibido 7: `nodo.anteFork` no admite ninguna heurística de elección de rama (p. ej. «la más larga»).

import { esMapa } from './cv.mjs';

const enumerado = (...valores) => v => valores.includes(v);

export const REGLA_NODO = Object.freeze({
  id: 'nucleo.nodo@1',
  D0: null,
  tipos: Object.freeze({}),
  sigma: Object.freeze({
    // Reevaluaciones automáticas tras CABEZA_CAMBIADA (L8: reevaluar sobre la nueva cabeza siempre es correcto).
    'nodo.reintentos': Object.freeze({ dominio: v => Number.isSafeInteger(v) && v >= 0, inicial: 3 }),
    // Verificación al abrir: cadena completa desde la génesis / desde el último checkpoint local (confía en él, §9.5).
    'nodo.verificarAlAbrir': Object.freeze({ dominio: enumerado('completa', 'desdeCheckpoint'), inicial: 'completa' }),
    // Verificación al incorporar: solo cadena / cadena + re‑admisión bajo C_{ε_{i−1}}.
    'nodo.verificarAlIncorporar': Object.freeze({ dominio: enumerado('cadena', 'cadena+readmisión'), inicial: 'cadena+readmisión' }),
    // Ante un FORK: suspender constitución / seguir en la rama propia, marcada. Nunca se elige rama por heurística.
    'nodo.anteFork': Object.freeze({ dominio: enumerado('suspender', 'seguirMarcada'), inicial: 'suspender' }),
    // Materialización de proyecciones: el mismo Δ (§7.8); solo cambia cuándo se invoca.
    'nodo.materialización': Object.freeze({ dominio: enumerado('bajoDemanda', 'notificación', 'anticipada'), inicial: 'bajoDemanda' }),
    // Frecuencia de snapshots: L4 los hace correctos con cualquier N.
    'nodo.snapshots': Object.freeze({
      dominio: v => v === 'bajoDemanda' || (esMapa(v) && Object.keys(v).length === 1 && Number.isSafeInteger(v.cada) && v.cada >= 1),
      inicial: 'bajoDemanda',
    }),
  }),
  guarda: () => 'INADMISIBLE', // no hay tipos de dominio: inalcanzable (G5 rechaza antes por forma)
  T: D => D,
});
