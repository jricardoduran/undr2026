// Kobalt · núcleo · materialidad — ADAPTADOR en memoria con la interfaz mínima de §5.5. Solo persiste y transporta.
//
// Correspondencia:
//   crear(StreamID, CV(g), h_0)                      ↔ almacen.crear          (solo si no existe)
//   cabeza(StreamID) → (n, h_n)                      ↔ almacen.cabeza
//   leer(StreamID, i, j) → [b_i…b_j]                 ↔ almacen.leer           (1‑based, inclusivo) · leerGenesis
//   anexarSiCabeza(StreamID, (n,h), [b…], (m,h_m))   ↔ almacen.anexarSiCabeza (COMPARE‑AND‑APPEND, M1)
//   guardar(clave, registro) / leerRegistro(clave)   ↔ una sola unidad (Y, checkpoint) por registro (M4)
//
// Propiedades:
//   M1 [T en un proceso]: `anexarSiCabeza` compara y anexa en un único tramo SÍNCRONO; en el modelo de ejecución de
//      JavaScript nadie puede intercalarse entre la comparación y la escritura, así que es atómico y linealizable por
//      StreamID dentro de este proceso. Dos llamadas con la misma cabeza esperada no pueden tener éxito las dos (L8).
//   M2: tras OK, `cabeza` devuelve la nueva cabeza.
//   M3: no hay operación de sobrescritura ni de borrado (L3); se copian los bytes al entrar y al salir.
//   M4: `guardar` sustituye el registro de la clave por una copia completa, en un solo paso (todo o nada).
//   M5 [L]: no hay durabilidad (memoria del proceso), ni exclusión entre procesos o dispositivos, ni orden global.
// El adaptador NO interpreta bytes ni calcula hashes: el núcleo le entrega `h_m` ya calculado (§5.5).
// `compartido`: otro adaptador cuyo almacén subyacente se reutiliza (varios mecanismos sobre el mismo almacén).

import { copiarBytes } from './bytes.mjs';

const subyacentes = new WeakMap(); // adaptador ↦ almacén subyacente (no enumerable desde fuera)

export function crearAlmacenMemoria(compartido) {
  let base;
  if (compartido === undefined || compartido === null) base = { streams: new Map(), registros: new Map() };
  else {
    base = subyacentes.get(compartido);
    if (!base) throw new TypeError('crearAlmacenMemoria: `compartido` no es un almacén en memoria');
  }
  const adaptador = Object.freeze({
    crear(streamId, gBytes, h0) {
      if (base.streams.has(streamId)) return { resultado: 'EXISTE' };
      base.streams.set(streamId, { gBytes: copiarBytes(gBytes), bloques: [], cabeza: { n: 0, h: h0 } });
      return { resultado: 'OK' };
    },
    cabeza(streamId) {
      const s = base.streams.get(streamId);
      return s ? { ...s.cabeza } : null;
    },
    leerGenesis(streamId) {
      const s = base.streams.get(streamId);
      return s ? copiarBytes(s.gBytes) : null;
    },
    leer(streamId, i, j) {
      const s = base.streams.get(streamId);
      return s ? s.bloques.slice(i - 1, j).map(copiarBytes) : null;
    },
    /** M1: compare‑and‑append. O se escriben las entradas y la nueva cabeza, o no se escribe nada. */
    anexarSiCabeza(streamId, esperada, bloques, final) {
      const s = base.streams.get(streamId);
      if (!s) return { resultado: 'CONFLICTO', n: -1, h: null };
      if (s.cabeza.n !== esperada.n || s.cabeza.h !== esperada.h) return { resultado: 'CONFLICTO', ...s.cabeza };
      if (final.n !== esperada.n + bloques.length) return { resultado: 'CONFLICTO', ...s.cabeza };
      const copias = bloques.map(copiarBytes);
      s.bloques = s.bloques.concat(copias);
      s.cabeza = { n: final.n, h: final.h };
      return { resultado: 'OK' };
    },
    /** M4: un registro es una sola unidad. */
    guardar(clave, registro) {
      base.registros.set(clave, structuredClone(registro));
      return { resultado: 'OK' };
    },
    leerRegistro(clave) {
      return base.registros.has(clave) ? structuredClone(base.registros.get(clave)) : null;
    },
    streams() {
      return [...base.streams.keys()].sort();
    },
  });
  subyacentes.set(adaptador, base);
  return adaptador;
}
