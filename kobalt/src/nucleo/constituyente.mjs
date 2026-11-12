// Kobalt · núcleo · constituyente — Orquestación de las operaciones del núcleo sobre una materialidad (spec §5.3, §5.5).
// Lee de la materialidad, decide con el núcleo puro (`secuencia`, `contrato`) y escribe SOLO con compare‑and‑append.
//
// Correspondencia:
//   Crear(g)                                        ↔ crear(almacen, g, registro)
//   AppendIfHead(s, (n,h), u, sid, a, deps[, ε])     ↔ appendIfHead(almacen, s, (n,h), mecanismo, sol, {registro})
//   Incorporar(s, (n,h), [b…], (m,h_m))              ↔ incorporar(almacen, s, (n,h), [b…], (m,h_m), {registro, readmitir?})
//   copia material de s                              ↔ leerCopia(almacen, s)
//   Γ_s verificada                                   ↔ leerTrayectoria(almacen, s)
//   S_n = Fold(S_0, Γ_n)                             ↔ estado(almacen, s, {registro})
//   API de réplica (sin AppendIfHead, L16)           ↔ apiReplica(almacen, ctx)
//
// Las operaciones esperan (`await`) a la materialidad: así sirven igual para el adaptador en memoria y para uno
// asíncrono (IndexedDB, fase 4). Todos los hashes se calculan ANTES de llamar a `anexarSiCabeza` (§5.5).
// Leyes: L3 (solo `anexarSiCabeza`), L8 (dos AppendIfHead con la misma cabeza observada ⇒ uno COMPROMETIDO y el otro
// CABEZA_CAMBIADA, relativo a M1), L16 (el constituyente lo fija C_ε; la réplica solo incorpora lo ya comprometido),
// L20 (ninguna operación escribe en dos StreamID; las demás trayectorias solo se LEEN para G4/Lect),
// L22 (Incorporar verifica la cadena y es atómico), L4/L27 (el estado se reconstruye siempre desde Γ).

import { nacer, decidirAnexo, decidirIncorporacion, trayectoriaDeCopia, verificar, streamsCitados } from './secuencia.mjs';
import { estadoInicial, fold } from './contrato.mjs';

/** Copia material {streamId, gBytes, bloques, cabeza} | null. */
export async function leerCopia(almacen, streamId) {
  const cabeza = await almacen.cabeza(streamId);
  if (!cabeza) return null;
  const gBytes = await almacen.leerGenesis(streamId);
  const bloques = cabeza.n > 0 ? await almacen.leer(streamId, 1, cabeza.n) : [];
  return { streamId, gBytes, bloques, cabeza };
}

/** Γ verificada desde la génesis, o null si no existe. Lanza si la copia local no es continua (L22). */
export async function leerTrayectoria(almacen, streamId) {
  const copia = await leerCopia(almacen, streamId);
  return copia ? trayectoriaDeCopia(copia) : null;
}

/** S_n = Fold(S_0, Γ_n) de la trayectoria guardada, o null. */
export async function estado(almacen, streamId, ctx) {
  const Γ = await leerTrayectoria(almacen, streamId);
  return Γ ? fold(estadoInicial(Γ.g, ctx.registro), Γ.entradas, ctx.registro) : null;
}

/** Trayectorias conocidas de otros ámbitos (solo las citadas): lectura estable para G4 y Lect, nunca co‑acceso. */
async function conocidasPara(almacen, citados, propio) {
  const out = {};
  for (const s of citados) {
    if (s === propio || Object.hasOwn(out, s)) continue;
    const Γ = await leerTrayectoria(almacen, s);
    if (Γ) out[s] = Γ;
  }
  return out;
}

/** Crear(g): StreamID nuevo en la materialidad ⇒ cabeza (0, h_0). */
export async function crear(almacen, g, registro) {
  const r = nacer(g, registro);
  if (r.resultado !== 'CREADO') return { resultado: 'INADMISIBLE', motivo: r.motivo };
  const m = await almacen.crear(g.streamId, r.gBytes, r.h0);
  if (m.resultado !== 'OK') return { resultado: 'EXISTE' };
  return { resultado: 'CREADO', n: 0, h: r.h0 };
}

/**
 * AppendIfHead (§5.3): (a) (n,h) es una posición de Γ local; (b) NO_CONSTITUYENTE; (c) Accept sobre S_n;
 * (d) compare‑and‑append ⇒ CABEZA_CAMBIADA si otro mecanismo comprometió antes.
 * sol = {u, sid, tipo, args, deps?, epocaEsperada?}; ctx = {registro}.
 */
export async function appendIfHead(almacen, streamId, cabeza, mecanismo, sol, ctx) {
  const Γ = await leerTrayectoria(almacen, streamId);
  if (!Γ) return { resultado: 'INEXISTENTE' };
  const citados = Array.isArray(sol?.deps) ? sol.deps.map(d => d?.stream) : [];
  const conocidas = await conocidasPara(almacen, citados, streamId);
  const d = decidirAnexo(Γ, cabeza, mecanismo, sol, { registro: ctx.registro, conocidas });
  if (d.resultado !== 'ACEPTADA') return d;
  const m = await almacen.anexarSiCabeza(streamId, cabeza, [d.bloque], { n: d.n, h: d.h });
  if (m.resultado !== 'OK') return { resultado: 'CABEZA_CAMBIADA', n: m.n, h: m.h };
  return { resultado: 'COMPROMETIDO', n: d.n, h: d.h, epoca: d.epoca };
}

/** Incorporar (§5.3): verifica y, según la configuración del nodo (E6), re‑admite; ATÓMICO (un único compare‑and‑append
 *  con todo el segmento). ctx = {registro, readmitir?, nodo?}. */
export async function incorporar(almacen, streamId, cabeza, bloques, cabezaFinal, ctx) {
  const Γ = await leerTrayectoria(almacen, streamId);
  if (!Γ) return { resultado: 'INEXISTENTE' };
  const conocidas = await conocidasPara(almacen, streamsCitados(bloques), streamId);
  const r = decidirIncorporacion(Γ, cabeza, bloques, cabezaFinal, { registro: ctx.registro, readmitir: ctx.readmitir, nodo: ctx.nodo, conocidas });
  if (r.resultado !== 'INCORPORADO' && r.resultado !== 'READMISIÓN_PENDIENTE') return r;
  const m = await almacen.anexarSiCabeza(streamId, cabeza, bloques, cabezaFinal);
  if (m.resultado !== 'OK') return { resultado: 'CABEZA_CAMBIADA', n: m.n, h: m.h };
  return r;
}

/** API de réplica (L16): incorpora y lee; NO ofrece AppendIfHead ni el compare‑and‑append de la materialidad. */
export function apiReplica(almacen, ctx) {
  return Object.freeze({
    crear: g => crear(almacen, g, ctx.registro),
    incorporar: (streamId, cabeza, bloques, cabezaFinal) => incorporar(almacen, streamId, cabeza, bloques, cabezaFinal, ctx),
    verificar: async (streamId, desde) => verificar(await leerCopia(almacen, streamId), desde),
    estado: streamId => estado(almacen, streamId, ctx),
    cabeza: async streamId => almacen.cabeza(streamId),
  });
}
