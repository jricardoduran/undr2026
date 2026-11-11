/* ════════════════════════════════════════════════════════════════════════════════
 * KOBALT MINIMAL FLAT — KERNEL 1.0.0
 * Fecha: 2026-09-11 00:14 UTC-5 / America-Bogota
 *
 * Browser-native · byte-native · offline-first by construction
 * Coordinate + Version + Transform
 *
 * IDEA CENTRAL
 * ────────────
 *   HMAC  -> identidad estable dentro de una jurisdicción.
 *   Table -> comprime HMAC de 32 bytes en un slot local pequeño.
 *   Name  -> compone coordenadas filtrables.
 *   Node  -> separa escritores sin coordinación global.
 *   Version -> timestamp monotónico local + huella HMAC corta del estado.
 *   D     -> transforma/protege bytes; el nombre no concede autoridad.
 *
 * CINCO COORDENADAS LÓGICAS DEL CONTENIDO VERSIONADO
 * ───────────────────────────────────────────────────
 *   U = (registrarPrefix, userSlot)
 *   N = nodeId
 *   A = appSlot
 *   C = continuitySlot
 *   V = (localTimestamp, stateFingerprint)
 *
 *   storageName = registrarPrefix || varuint(userSlot) || nodeId
 *               || varuint(appSlot) || varuint(continuitySlot)
 *               || uint64be(localTimestamp) || stateFingerprint[8]
 *
 * TABLAS RESERVADAS
 * ─────────────────
 *   registrarPrefix || varuint(0)                         -> UserTable del registrador
 *   userPrefix || nodeId || varuint(0) || varuint(0)     -> AppTable del nodo
 *   userPrefix || nodeId || varuint(app) || varuint(0)   -> ContinuityTable de la App
 *
 * El kernel NO conoce red, Drive, R2, IndexedDB, Apps concretas, usuarios humanos,
 * semántica del payload, merge entre nodos ni tiempo global. Un Adapter exterior
 * sólo necesita materializar get/put/list(prefix) y opcionalmente delete.
 * ════════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const VERSION = '1.0.0';

  const D_BYTES = 16;
  const HMAC_BYTES = 32;
  const REGISTRAR_PREFIX_BYTES = 8;
  const NODE_ID_BYTES = 8;
  const STATE_FINGERPRINT_BYTES = 8;
  const VERSION_TIME_BYTES = 8;
  const VERSION_BYTES = VERSION_TIME_BYTES + STATE_FINGERPRINT_BYTES;
  const IV_BYTES = 12;
  const GCM_TAG_BITS = 128;

  // Domain separators: laws of release 1.0.0, never stored in envelopes.
  const TAG = Object.freeze({
    REGISTRAR: 0x11,
    USER: 0x12,
    APP: 0x13,
    CONTINUITY: 0x14,
    STATE: 0x15,
    ENC_KEY: 0x16,
    AAD: 0x17
  });

  function u8(x, label = 'bytes') {
    if (x instanceof Uint8Array) return x;
    if (x instanceof ArrayBuffer) return new Uint8Array(x);
    if (ArrayBuffer.isView(x)) return new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
    throw new TypeError(`${label} must be bytes`);
  }

  function concat(...parts) {
    const xs = parts.map((p) => u8(p, 'part'));
    const length = xs.reduce((n, x) => n + x.length, 0);
    const out = new Uint8Array(length);
    let offset = 0;
    for (const x of xs) {
      out.set(x, offset);
      offset += x.length;
    }
    return out;
  }

  function equalBytes(a, b) {
    a = u8(a, 'a');
    b = u8(b, 'b');
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  function isPrefix(prefix, bytes) {
    prefix = u8(prefix, 'prefix');
    bytes = u8(bytes, 'bytes');
    if (prefix.length > bytes.length) return false;
    for (let i = 0; i < prefix.length; i++) if (prefix[i] !== bytes[i]) return false;
    return true;
  }

  function fixed(bytes, length, label) {
    bytes = u8(bytes, label);
    if (bytes.length !== length) throw new RangeError(`${label} must be exactly ${length} bytes`);
    return bytes;
  }

  function checkD(D) {
    return fixed(D, D_BYTES, 'D');
  }

  function u32be(n) {
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) throw new RangeError('u32 out of range');
    const out = new Uint8Array(4);
    const v = new DataView(out.buffer);
    v.setUint32(0, n, false);
    return out;
  }

  // Injective framing over boundaries. Semantics stay outside the kernel.
  function frame(parts) {
    const xs = parts.map((p) => u8(p, 'frame part'));
    const framed = [];
    for (const x of xs) {
      if (x.length > 0xffffffff) throw new RangeError('frame part too large');
      framed.push(u32be(x.length), x);
    }
    return concat(...framed);
  }

  async function importHmacKey(D) {
    return crypto.subtle.importKey(
      'raw', checkD(D),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    );
  }

  async function hmac(D, message) {
    const key = await importHmacKey(D);
    const sig = await crypto.subtle.sign('HMAC', key, u8(message, 'message'));
    return new Uint8Array(sig);
  }

  async function identity(D, tag, ...atoms) {
    if (!Number.isInteger(tag) || tag < 0 || tag > 255) throw new RangeError('tag must be one byte');
    const parts = [Uint8Array.of(tag), ...atoms.map((a) => u8(a, 'identity atom'))];
    return hmac(D, frame(parts));
  }

  async function userIdentity(DRegistry, userAtom) {
    return identity(DRegistry, TAG.USER, userAtom);
  }

  async function appIdentity(DUser, appAtom) {
    return identity(DUser, TAG.APP, appAtom);
  }

  async function continuityIdentity(DUser, appHmac, continuityAtom) {
    fixed(appHmac, HMAC_BYTES, 'appHmac');
    return identity(DUser, TAG.CONTINUITY, appHmac, continuityAtom);
  }

  function randomNodeId() {
    return crypto.getRandomValues(new Uint8Array(NODE_ID_BYTES));
  }

  async function registrarPrefix(DRegistry, registrarNodeId) {
    registrarNodeId = fixed(registrarNodeId, NODE_ID_BYTES, 'registrarNodeId');
    const full = await identity(DRegistry, TAG.REGISTRAR, registrarNodeId);
    return full.slice(0, REGISTRAR_PREFIX_BYTES);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TABLE — fixed-stride vector whose POSITION means SLOT, not time.
  // Slots are 1-based. Slot 0 is reserved by the name grammar.
  // ─────────────────────────────────────────────────────────────────────────────

  function tableEmpty() {
    return new Uint8Array(0);
  }

  function tableCheck(table) {
    table = u8(table, 'table');
    if (table.length % HMAC_BYTES !== 0) throw new RangeError(`table length must be multiple of ${HMAC_BYTES}`);
    return table;
  }

  function tableCount(table) {
    return tableCheck(table).length / HMAC_BYTES;
  }

  function tableGet(table, slot) {
    table = tableCheck(table);
    if (!Number.isSafeInteger(slot) || slot < 1 || slot > tableCount(table)) return null;
    const start = (slot - 1) * HMAC_BYTES;
    return table.slice(start, start + HMAC_BYTES);
  }

  function tableFind(table, hmacValue) {
    table = tableCheck(table);
    hmacValue = fixed(hmacValue, HMAC_BYTES, 'hmacValue');
    const count = tableCount(table);
    for (let slot = 1; slot <= count; slot++) {
      if (equalBytes(tableGet(table, slot), hmacValue)) return slot;
    }
    return 0;
  }

  function tableEnsure(table, hmacValue) {
    table = tableCheck(table);
    hmacValue = fixed(hmacValue, HMAC_BYTES, 'hmacValue');
    const existing = tableFind(table, hmacValue);
    if (existing) return Object.freeze({ table: table.slice(), slot: existing, added: false });

    const slot = tableCount(table) + 1;
    return Object.freeze({
      table: concat(table, hmacValue),
      slot,
      added: true
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CANONICAL UNSIGNED VARINT — compact local coordinates.
  // ─────────────────────────────────────────────────────────────────────────────

  function encodeVarUint(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('varuint must be a non-negative safe integer');
    const out = [];
    let n = value;
    do {
      const low = n % 128;
      n = Math.floor(n / 128);
      out.push(low | (n > 0 ? 0x80 : 0));
    } while (n > 0);
    return Uint8Array.from(out);
  }

  function decodeVarUintAt(bytes, offset = 0) {
    bytes = u8(bytes, 'varuint bytes');
    if (!Number.isSafeInteger(offset) || offset < 0 || offset >= bytes.length) throw new RangeError('invalid varuint offset');

    let value = 0;
    let multiplier = 1;
    let i = offset;
    for (; i < bytes.length; i++) {
      const b = bytes[i];
      value += (b & 0x7f) * multiplier;
      if (!Number.isSafeInteger(value)) throw new RangeError('varuint exceeds Number.MAX_SAFE_INTEGER');
      if ((b & 0x80) === 0) {
        const encoded = encodeVarUint(value);
        const consumed = bytes.slice(offset, i + 1);
        if (!equalBytes(encoded, consumed)) throw new Error('non-canonical varuint');
        return Object.freeze({ value, nextOffset: i + 1 });
      }
      multiplier *= 128;
      if (!Number.isSafeInteger(multiplier)) throw new RangeError('varuint too large');
    }
    throw new Error('truncated varuint');
  }

  function decodeVarUint(bytes) {
    bytes = u8(bytes, 'varuint bytes');
    const r = decodeVarUintAt(bytes, 0);
    if (r.nextOffset !== bytes.length) throw new Error('trailing bytes after varuint');
    return r.value;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UINT64 BIG-ENDIAN — local monotonic version coordinate.
  // ─────────────────────────────────────────────────────────────────────────────

  const U64_MAX = (1n << 64n) - 1n;

  function asU64(value, label = 'u64') {
    let x;
    if (typeof value === 'bigint') x = value;
    else if (Number.isSafeInteger(value) && value >= 0) x = BigInt(value);
    else throw new TypeError(`${label} must be non-negative bigint or safe integer`);
    if (x < 0n || x > U64_MAX) throw new RangeError(`${label} out of uint64 range`);
    return x;
  }

  function encodeU64BE(value) {
    let x = asU64(value);
    const out = new Uint8Array(8);
    for (let i = 7; i >= 0; i--) {
      out[i] = Number(x & 0xffn);
      x >>= 8n;
    }
    return out;
  }

  function decodeU64BE(bytes) {
    bytes = fixed(bytes, 8, 'uint64 bytes');
    let x = 0n;
    for (const b of bytes) x = (x << 8n) | BigInt(b);
    return x;
  }

  function nextTimestamp(previous = 0n, wallClockMs = Date.now()) {
    const prev = asU64(previous, 'previous timestamp');
    const wall = asU64(typeof wallClockMs === 'bigint' ? wallClockMs : Math.max(0, Math.trunc(wallClockMs)), 'wall clock');
    const next = wall > prev ? wall : prev + 1n;
    if (next > U64_MAX) throw new RangeError('timestamp overflow');
    return next;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // NAME GEOMETRY
  // ─────────────────────────────────────────────────────────────────────────────

  function checkRegistrarPrefix(prefix) {
    return fixed(prefix, REGISTRAR_PREFIX_BYTES, 'registrarPrefix');
  }

  function checkNodeId(nodeId) {
    return fixed(nodeId, NODE_ID_BYTES, 'nodeId');
  }

  function positiveSlot(slot, label) {
    if (!Number.isSafeInteger(slot) || slot < 1) throw new RangeError(`${label} must be >= 1`);
    return slot;
  }

  function userTableName(registrarPrefixBytes) {
    return concat(checkRegistrarPrefix(registrarPrefixBytes), encodeVarUint(0));
  }

  function userPrefix(registrarPrefixBytes, userSlot) {
    return concat(checkRegistrarPrefix(registrarPrefixBytes), encodeVarUint(positiveSlot(userSlot, 'userSlot')));
  }

  function nodePrefix(registrarPrefixBytes, userSlot, nodeId) {
    return concat(userPrefix(registrarPrefixBytes, userSlot), checkNodeId(nodeId));
  }

  function appPrefix(registrarPrefixBytes, userSlot, nodeId, appSlot) {
    return concat(nodePrefix(registrarPrefixBytes, userSlot, nodeId), encodeVarUint(positiveSlot(appSlot, 'appSlot')));
  }

  function appTableName(registrarPrefixBytes, userSlot, nodeId) {
    return concat(nodePrefix(registrarPrefixBytes, userSlot, nodeId), encodeVarUint(0), encodeVarUint(0));
  }

  function continuityTableName(registrarPrefixBytes, userSlot, nodeId, appSlot) {
    return concat(appPrefix(registrarPrefixBytes, userSlot, nodeId, appSlot), encodeVarUint(0));
  }

  function continuityBaseName(registrarPrefixBytes, userSlot, nodeId, appSlot, continuitySlot) {
    return concat(
      appPrefix(registrarPrefixBytes, userSlot, nodeId, appSlot),
      encodeVarUint(positiveSlot(continuitySlot, 'continuitySlot'))
    );
  }

  async function stateFingerprint(DUser, baseName, payload) {
    baseName = u8(baseName, 'baseName');
    payload = u8(payload, 'payload');
    const full = await identity(DUser, TAG.STATE, baseName, payload);
    return full.slice(0, STATE_FINGERPRINT_BYTES);
  }

  async function versionCoordinate(DUser, baseName, payload, timestamp) {
    const t = encodeU64BE(timestamp);
    const q = await stateFingerprint(DUser, baseName, payload);
    return concat(t, q);
  }

  async function versionName(DUser, baseName, payload, timestamp) {
    baseName = u8(baseName, 'baseName');
    return concat(baseName, await versionCoordinate(DUser, baseName, payload, timestamp));
  }

  function decodeName(name) {
    name = u8(name, 'name');
    if (name.length < REGISTRAR_PREFIX_BYTES + 1) throw new Error('name too short');

    let offset = 0;
    const registrarPrefixBytes = name.slice(offset, offset + REGISTRAR_PREFIX_BYTES);
    offset += REGISTRAR_PREFIX_BYTES;

    const userR = decodeVarUintAt(name, offset);
    const userSlot = userR.value;
    offset = userR.nextOffset;

    if (offset === name.length) {
      if (userSlot !== 0) throw new Error('incomplete user prefix');
      return Object.freeze({ kind: 'userTable', registrarPrefix: registrarPrefixBytes, userSlot: 0 });
    }

    if (userSlot === 0) throw new Error('user slot 0 is reserved for registrar UserTable');
    if (offset + NODE_ID_BYTES > name.length) throw new Error('truncated nodeId');
    const nodeId = name.slice(offset, offset + NODE_ID_BYTES);
    offset += NODE_ID_BYTES;

    const appR = decodeVarUintAt(name, offset);
    const appSlot = appR.value;
    offset = appR.nextOffset;

    const contR = decodeVarUintAt(name, offset);
    const continuitySlot = contR.value;
    offset = contR.nextOffset;

    const remaining = name.length - offset;

    if (remaining === 0) {
      if (appSlot === 0 && continuitySlot === 0) {
        return Object.freeze({ kind: 'appTable', registrarPrefix: registrarPrefixBytes, userSlot, nodeId, appSlot: 0, continuitySlot: 0 });
      }
      if (appSlot > 0 && continuitySlot === 0) {
        return Object.freeze({ kind: 'continuityTable', registrarPrefix: registrarPrefixBytes, userSlot, nodeId, appSlot, continuitySlot: 0 });
      }
      if (appSlot > 0 && continuitySlot > 0) {
        return Object.freeze({ kind: 'continuityBase', registrarPrefix: registrarPrefixBytes, userSlot, nodeId, appSlot, continuitySlot });
      }
      throw new Error('invalid reserved coordinates');
    }

    if (remaining !== VERSION_BYTES) throw new Error('invalid trailing bytes in name');
    if (appSlot < 1 || continuitySlot < 1) throw new Error('only continuities may have version coordinate');

    const timestamp = decodeU64BE(name.slice(offset, offset + VERSION_TIME_BYTES));
    offset += VERSION_TIME_BYTES;
    const stateFingerprintBytes = name.slice(offset, offset + STATE_FINGERPRINT_BYTES);

    return Object.freeze({
      kind: 'version',
      registrarPrefix: registrarPrefixBytes,
      userSlot,
      nodeId,
      appSlot,
      continuitySlot,
      timestamp,
      stateFingerprint: stateFingerprintBytes
    });
  }

  function latestVersionName(names, baseName) {
    baseName = u8(baseName, 'baseName');
    let best = null;
    let bestTimestamp = -1n;
    let bestFingerprint = null;

    for (const candidateRaw of names) {
      const candidate = u8(candidateRaw, 'candidate name');
      if (candidate.length !== baseName.length + VERSION_BYTES || !isPrefix(baseName, candidate)) continue;
      const timestamp = decodeU64BE(candidate.slice(baseName.length, baseName.length + VERSION_TIME_BYTES));
      const fp = candidate.slice(baseName.length + VERSION_TIME_BYTES);

      let take = timestamp > bestTimestamp;
      if (!take && timestamp === bestTimestamp && bestFingerprint) {
        // Deterministic tie-break only; correct same-node writers should not tie.
        for (let i = 0; i < fp.length; i++) {
          if (fp[i] === bestFingerprint[i]) continue;
          take = fp[i] > bestFingerprint[i];
          break;
        }
      }
      if (take || best === null) {
        best = candidate.slice();
        bestTimestamp = timestamp;
        bestFingerprint = fp.slice();
      }
    }

    return best;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TRANSFORM — D protects bytes; names are merely coordinates.
  // ─────────────────────────────────────────────────────────────────────────────

  async function encryptionKey(D) {
    const keyBytes = await identity(D, TAG.ENC_KEY);
    return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  async function seal(D, name, payload) {
    name = u8(name, 'name');
    payload = u8(payload, 'payload');
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key = await encryptionKey(D);
    const cipher = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: concat(Uint8Array.of(TAG.AAD), name),
        tagLength: GCM_TAG_BITS
      },
      key,
      payload
    );
    return concat(iv, new Uint8Array(cipher));
  }

  async function open(D, name, envelope) {
    name = u8(name, 'name');
    envelope = u8(envelope, 'envelope');
    const minimum = IV_BYTES + GCM_TAG_BITS / 8;
    if (envelope.length < minimum) throw new RangeError(`envelope must be at least ${minimum} bytes`);

    const iv = envelope.slice(0, IV_BYTES);
    const cipher = envelope.slice(IV_BYTES);
    const key = await encryptionKey(D);
    const plain = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: concat(Uint8Array.of(TAG.AAD), name),
        tagLength: GCM_TAG_BITS
      },
      key,
      cipher
    );
    return new Uint8Array(plain);
  }

  const API = Object.freeze({
    VERSION,
    CONSTANTS: Object.freeze({
      D_BYTES,
      HMAC_BYTES,
      REGISTRAR_PREFIX_BYTES,
      NODE_ID_BYTES,
      STATE_FINGERPRINT_BYTES,
      VERSION_TIME_BYTES,
      VERSION_BYTES,
      IV_BYTES,
      GCM_TAG_BITS
    }),

    identity: Object.freeze({
      generic: identity,
      user: userIdentity,
      app: appIdentity,
      continuity: continuityIdentity
    }),

    randomNodeId,
    registrarPrefix,

    table: Object.freeze({
      empty: tableEmpty,
      count: tableCount,
      get: tableGet,
      find: tableFind,
      ensure: tableEnsure
    }),

    varuint: Object.freeze({
      encode: encodeVarUint,
      decode: decodeVarUint,
      decodeAt: decodeVarUintAt
    }),

    names: Object.freeze({
      userTable: userTableName,
      userPrefix,
      nodePrefix,
      appPrefix,
      appTable: appTableName,
      continuityTable: continuityTableName,
      continuityBase: continuityBaseName,
      version: versionName,
      decode: decodeName,
      latestVersion: latestVersionName
    }),

    version: Object.freeze({
      nextTimestamp,
      stateFingerprint,
      coordinate: versionCoordinate,
      encodeTimestamp: encodeU64BE,
      decodeTimestamp: decodeU64BE
    }),

    seal,
    open
  });

  global.KobaltMinimalFlat = API;
})(globalThis);
