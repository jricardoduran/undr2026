/* ════════════════════════════════════════════════════════════════════════════════
 * KOBALT KERNEL 9.0.1 — KOB2 / REDUCCIÓN CONSTITUCIONAL
 * 2026-09-18 — America/Bogota (UTC-5)
 *
 * Kernel mínimo:
 *   Frame + View + Derivation + Cell + CellVector + Grammar + Recognition + Resolution
 *
 * Leyes centrales:
 *   View = Clear ⊔ Keyed(B^32)
 *   Cell = descriptorSlot(4) || referent(32)                  => 36 bytes
 *   CellVector = Cell*
 *   prefix = extensión conservativa del carrier
 *   Trajectory(Cell*) = historia exacta (EMIT/EXPAND, nunca FOLLOW)
 *   Index(Cell*)      = composición exacta
 *   0 → EMIT, 1 → EXPAND, 2 → FOLLOW
 *
 * Este kernel NO conoce: D como continuidad, autoridad A, Table, coproducto,
 * Source concreta, red, receipts, policies, Appearance, World, Principal,
 * usuario, App, UI, MIME, filesystem o storage.
 *
 * No hay compatibilidad contractual con KOB2 9.0.0. Esta release materializa
 * la ley clarificada, no una migración de API.
 * ════════════════════════════════════════════════════════════════════════════════ */

(function bootstrapKOB2(root) {
  'use strict';

  // ────────────────────────────────────────────────────────────────────────────
  // 0. Entorno + geometría material
  // ────────────────────────────────────────────────────────────────────────────

  const cryptoApi = root.crypto || (
    typeof require === 'function' ? require('node:crypto').webcrypto : null
  );
  if (!cryptoApi || !cryptoApi.subtle) throw new Error('KOB2 requiere WebCrypto (crypto.subtle).');

  const subtle = cryptoApi.subtle;
  const encoder = new TextEncoder();

  const ID_BYTES = 32;
  const NAME_BYTES = 32;
  const DESCRIPTOR_SLOT_BYTES = 4;
  const CELL_BYTES = DESCRIPTOR_SLOT_BYTES + ID_BYTES; // 36
  const VECTOR_STRIDE = CELL_BYTES;

  const MAGIC = encoder.encode('KOB2');
  const ENVELOPE_VERSION = 3;
  const ENVELOPE_VERSION_BYTES = uint16be(ENVELOPE_VERSION);
  const VIEW_KIND_BYTES = 1;
  const COMMITMENT_BYTES = 32;
  const CLEAR_KIND_BYTE = 0;
  const KEYED_KIND_BYTE = 1;
  const HEADER_BYTES = MAGIC.length + ENVELOPE_VERSION_BYTES.length + VIEW_KIND_BYTES + COMMITMENT_BYTES;

  const NONCE_BYTES = 12;
  const GCM_TAG_BITS = 128;
  const GCM_TAG_BYTES = GCM_TAG_BITS / 8;

  const FRAME_COUNT_BYTES = 4;
  const FRAME_LENGTH_BYTES = 8;

  const TAG_CLEAR_DERIVE = ascii('kobalt:clear:derive:3');
  const TAG_IDENTITY = ascii('kobalt:identity:3');
  const TAG_CONTENT = ascii('kobalt:content:3');
  const TAG_NAME = ascii('kobalt:name:3');
  const TAG_COMMITMENT = ascii('kobalt:commitment:3');
  const TAG_AEAD_KEY = ascii('kobalt:aead:key:3');
  const TAG_AEAD_NONCE = ascii('kobalt:aead:nonce:3');

  const Operator = Object.freeze({
    EMIT: 'EMIT',
    EXPAND: 'EXPAND',
    FOLLOW: 'FOLLOW',
  });

  const GenesisSlot = Object.freeze({
    EMIT: 0,
    EXPAND: 1,
    FOLLOW: 2,
  });

  const ViewKind = Object.freeze({
    CLEAR: 'CLEAR',
    KEYED: 'KEYED',
  });

  const ResolveKind = Object.freeze({
    NO_EVIDENCE: 'NO_EVIDENCE',
    UNRECOGNIZED: 'UNRECOGNIZED',
    EXACT: 'EXACT',
    EMPTY: 'EMPTY',
    CHAIN: 'CHAIN',
    FORK: 'FORK',
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Contratos + bytes
  // ────────────────────────────────────────────────────────────────────────────

  class KobaltError extends Error {
    constructor(code, message, details = undefined, cause = undefined) {
      super(message);
      this.name = 'KobaltError';
      this.code = code;
      if (details !== undefined) this.details = details;
      if (cause !== undefined) this.cause = cause;
    }
  }

  function invariant(condition, code, message, details = undefined) {
    if (!condition) throw new KobaltError(code, message, details);
  }

  function wrapError(error, code, message, details = undefined) {
    if (error instanceof KobaltError) return error;
    return new KobaltError(code, message, details, error);
  }

  function ascii(text) {
    invariant(typeof text === 'string', 'E_ASCII_TYPE', 'ascii requiere string.');
    invariant(/^[\x00-\x7F]*$/.test(text), 'E_ASCII_RANGE', 'ascii sólo acepta ASCII.');
    return encoder.encode(text);
  }

  function utf8(text) {
    invariant(typeof text === 'string', 'E_UTF8_TYPE', 'utf8 requiere string.');
    return encoder.encode(text);
  }

  function isByteLike(value) {
    return value instanceof Uint8Array || value instanceof ArrayBuffer || ArrayBuffer.isView(value);
  }

  function byteView(value, label = 'bytes', expectedLength = undefined) {
    invariant(isByteLike(value), 'E_BYTES_REQUIRED', `${label} debe ser material binario.`);
    let out;
    if (value instanceof Uint8Array) out = value;
    else if (value instanceof ArrayBuffer) out = new Uint8Array(value);
    else out = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (expectedLength !== undefined) {
      invariant(out.length === expectedLength, 'E_BYTES_LENGTH',
        `${label} debe medir exactamente ${expectedLength} bytes.`, {
          expectedLength, actualLength: out.length,
        });
    }
    return out;
  }

  function bytes(value, label = 'bytes', expectedLength = undefined) {
    return new Uint8Array(byteView(value, label, expectedLength));
  }

  function concat(...values) {
    const parts = values.map((value, i) => byteView(value, `parts[${i}]`));
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }

  function equal(aValue, bValue) {
    const a = byteView(aValue, 'a');
    const b = byteView(bValue, 'b');
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  function compareLex(aValue, bValue) {
    const a = byteView(aValue, 'a');
    const b = byteView(bValue, 'b');
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i += 1) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }
    return Math.sign(a.length - b.length);
  }

  function slice(value, start, end = undefined) {
    return bytes(byteView(value, 'value').slice(start, end));
  }

  function bytesToHex(value) {
    let out = '';
    for (const byte of byteView(value, 'value')) out += byte.toString(16).padStart(2, '0');
    return out;
  }

  function hexToBytes(hex, expectedLength = undefined) {
    invariant(typeof hex === 'string' && hex.length % 2 === 0 && /^[0-9a-fA-F]*$/.test(hex),
      'E_HEX', 'hex inválido.');
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (expectedLength !== undefined) invariant(out.length === expectedLength, 'E_HEX_LENGTH',
      `hex debe representar ${expectedLength} bytes.`);
    return out;
  }

  function uint8(value) {
    invariant(Number.isInteger(value) && value >= 0 && value <= 0xff, 'E_U8', 'uint8 fuera de rango.');
    return Uint8Array.of(value);
  }

  function uint16be(value) {
    invariant(Number.isInteger(value) && value >= 0 && value <= 0xffff, 'E_U16', 'uint16 fuera de rango.');
    return Uint8Array.of((value >>> 8) & 0xff, value & 0xff);
  }

  function readUint16be(value, offset = 0) {
    const v = byteView(value, 'value');
    invariant(offset >= 0 && offset + 2 <= v.length, 'E_U16_READ', 'Lectura uint16 fuera de rango.');
    return (v[offset] << 8) | v[offset + 1];
  }

  function uint32be(value) {
    invariant(Number.isInteger(value) && value >= 0 && value <= 0xffffffff, 'E_U32', 'uint32 fuera de rango.');
    const out = new Uint8Array(4);
    new DataView(out.buffer).setUint32(0, value, false);
    return out;
  }

  function readUint32be(value, offset = 0) {
    const v = byteView(value, 'value');
    invariant(offset >= 0 && offset + 4 <= v.length, 'E_U32_READ', 'Lectura uint32 fuera de rango.');
    return new DataView(v.buffer, v.byteOffset + offset, 4).getUint32(0, false);
  }

  function uint64be(value) {
    const n = typeof value === 'bigint' ? value : BigInt(value);
    invariant(n >= 0n && n <= 0xffffffffffffffffn, 'E_U64', 'uint64 fuera de rango.');
    const out = new Uint8Array(8);
    const view = new DataView(out.buffer);
    view.setUint32(0, Number((n >> 32n) & 0xffffffffn), false);
    view.setUint32(4, Number(n & 0xffffffffn), false);
    return out;
  }

  function readUint64be(value, offset = 0) {
    const v = byteView(value, 'value');
    invariant(offset >= 0 && offset + 8 <= v.length, 'E_U64_READ', 'Lectura uint64 fuera de rango.');
    const view = new DataView(v.buffer, v.byteOffset + offset, 8);
    return (BigInt(view.getUint32(0, false)) << 32n) | BigInt(view.getUint32(4, false));
  }

  function frame(parts) {
    invariant(Array.isArray(parts), 'E_FRAME_PARTS', 'frame requiere array.');
    const atoms = parts.map((value, i) => bytes(value, `parts[${i}]`));
    return concat(uint32be(atoms.length), ...atoms.flatMap((atom) => [uint64be(atom.length), atom]));
  }

  function unframe(value) {
    const input = bytes(value, 'frame');
    invariant(input.length >= FRAME_COUNT_BYTES, 'E_FRAME_TRUNCATED', 'Frame truncado.');
    const count = readUint32be(input, 0);
    let offset = FRAME_COUNT_BYTES;
    const out = [];
    for (let i = 0; i < count; i += 1) {
      invariant(offset + FRAME_LENGTH_BYTES <= input.length, 'E_FRAME_TRUNCATED', 'Longitud de átomo truncada.');
      const length = readUint64be(input, offset);
      offset += FRAME_LENGTH_BYTES;
      invariant(length <= BigInt(Number.MAX_SAFE_INTEGER), 'E_FRAME_LENGTH', 'Átomo demasiado grande.');
      const n = Number(length);
      invariant(offset + n <= input.length, 'E_FRAME_TRUNCATED', 'Átomo truncado.');
      out.push(input.slice(offset, offset + n));
      offset += n;
    }
    invariant(offset === input.length, 'E_FRAME_TRAILING', 'Frame contiene bytes sobrantes.');
    return out;
  }

  async function sha256(value) {
    return new Uint8Array(await subtle.digest('SHA-256', bytes(value, 'sha256.input')));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. View = Clear ⊔ Keyed(B^32)
  // ────────────────────────────────────────────────────────────────────────────

  const CLEAR_VIEW = Object.freeze({ kind: ViewKind.CLEAR });

  function clearView() { return CLEAR_VIEW; }

  function keyedView(keyValue) {
    return Object.freeze({ kind: ViewKind.KEYED, key: bytes(keyValue, 'view.key', ID_BYTES) });
  }

  function assertView(value, label = 'view') {
    invariant(value && typeof value === 'object', 'E_VIEW', `${label} inválida.`);
    if (value.kind === ViewKind.CLEAR) return CLEAR_VIEW;
    if (value.kind === ViewKind.KEYED) return keyedView(value.key);
    throw new KobaltError('E_VIEW_KIND', `${label}.kind desconocido.`, { kind: value.kind });
  }

  function viewKindByte(viewValue) {
    const view = assertView(viewValue);
    return view.kind === ViewKind.CLEAR ? CLEAR_KIND_BYTE : KEYED_KIND_BYTE;
  }

  async function hmac(keyValue, messageValue) {
    const keyBytes = bytes(keyValue, 'hmac.key', ID_BYTES);
    const key = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await subtle.sign('HMAC', key, bytes(messageValue, 'hmac.message')));
  }

  async function derive(viewValue, tagValue, parts = []) {
    const view = assertView(viewValue);
    const tag = bytes(tagValue, 'derive.tag');
    invariant(Array.isArray(parts), 'E_DERIVE_PARTS', 'derive requiere parts[].');
    const atoms = parts.map((part, i) => bytes(part, `derive.parts[${i}]`));
    if (view.kind === ViewKind.KEYED) return hmac(view.key, frame([tag, ...atoms]));
    return sha256(frame([TAG_CLEAR_DERIVE, tag, ...atoms]));
  }

  async function identity(viewValue, atoms) {
    invariant(Array.isArray(atoms), 'E_IDENTITY_ATOMS', 'identity requiere atoms[].');
    return derive(viewValue, TAG_IDENTITY, atoms);
  }

  async function contentId(viewValue, contentValue) {
    return derive(viewValue, TAG_CONTENT, [bytes(contentValue, 'content')]);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Cell + gramática irreducible
  // ────────────────────────────────────────────────────────────────────────────

  function cell(descriptorSlotValue, referentValue) {
    invariant(Number.isInteger(descriptorSlotValue) && descriptorSlotValue >= 0 && descriptorSlotValue <= 0xffffffff,
      'E_DESCRIPTOR_SLOT', 'descriptorSlot debe ser uint32.', { descriptorSlot: descriptorSlotValue });
    return Object.freeze({
      descriptorSlot: descriptorSlotValue,
      referent: bytes(referentValue, 'cell.referent', ID_BYTES),
    });
  }

  function assertCell(value, label = 'cell') {
    invariant(value && typeof value === 'object', 'E_CELL', `${label} debe ser Cell.`);
    return cell(value.descriptorSlot, value.referent);
  }

  function encodeCell(value) {
    const c = assertCell(value);
    return concat(uint32be(c.descriptorSlot), c.referent);
  }

  function decodeCell(value) {
    const encoded = bytes(value, 'encodedCell', CELL_BYTES);
    return cell(readUint32be(encoded, 0), encoded.slice(DESCRIPTOR_SLOT_BYTES));
  }

  function equalCell(aValue, bValue) {
    const a = assertCell(aValue, 'a');
    const b = assertCell(bValue, 'b');
    return a.descriptorSlot === b.descriptorSlot && equal(a.referent, b.referent);
  }

  function cellKey(value) { return bytesToHex(encodeCell(assertCell(value))); }

  function genesisResolver(slot) {
    if (slot === GenesisSlot.EMIT) return Operator.EMIT;
    if (slot === GenesisSlot.EXPAND) return Operator.EXPAND;
    if (slot === GenesisSlot.FOLLOW) return Operator.FOLLOW;
    throw new KobaltError('E_DESCRIPTOR_UNKNOWN', 'DescriptorSlot no resuelto.', { slot });
  }

  function operator(slot, resolver = genesisResolver) {
    let result;
    if (typeof resolver === 'function') result = resolver(slot);
    else if (resolver && typeof resolver.operator === 'function') result = resolver.operator(slot);
    else throw new KobaltError('E_DESCRIPTOR_RESOLVER', 'Se requiere resolver(slot) u objeto .operator(slot).');
    invariant(Object.values(Operator).includes(result), 'E_DESCRIPTOR_OPERATOR', 'Operador inválido.', { slot, result });
    return result;
  }

  function operatorOf(value, resolver = genesisResolver) {
    const c = assertCell(value);
    return operator(c.descriptorSlot, resolver);
  }

  function emit(qValue) { return cell(GenesisSlot.EMIT, qValue); }
  function expand(qValue) { return cell(GenesisSlot.EXPAND, qValue); }
  function follow(identityValue) { return cell(GenesisSlot.FOLLOW, identityValue); }

  function exact(value, resolver = genesisResolver) {
    const c = assertCell(value);
    const op = operatorOf(c, resolver);
    invariant(op === Operator.EMIT || op === Operator.EXPAND,
      'E_EXACT_REQUIRED', 'Una realización exacta debe ser EMIT o EXPAND, nunca FOLLOW.', { operator: op });
    return c;
  }

  async function name(viewValue, cellValue) {
    return derive(viewValue, TAG_NAME, [encodeCell(assertCell(cellValue))]);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 4. CellVector: carrier discreto, sin semántica temporal/topológica
  // ────────────────────────────────────────────────────────────────────────────

  function assertVector(value, label = 'vector') {
    const vector = byteView(value, label);
    invariant(vector.length % VECTOR_STRIDE === 0, 'E_VECTOR_STRIDE',
      `El vector debe medir múltiplo de ${VECTOR_STRIDE}.`, { length: vector.length });
    return vector;
  }

  function vectorFrom(cells = []) {
    invariant(Array.isArray(cells), 'E_VECTOR_CELLS', 'vectorFrom requiere Cell[].');
    return concat(...cells.map((c, i) => encodeCell(assertCell(c, `cells[${i}]`))));
  }

  function vectorLength(value) { return assertVector(value).length / VECTOR_STRIDE; }

  function vectorAt(value, index) {
    const vector = assertVector(value);
    const length = vectorLength(vector);
    invariant(Number.isInteger(index) && index >= 0 && index < length,
      'E_VECTOR_INDEX', 'Coordenada fuera de rango.', { index, length });
    const offset = index * VECTOR_STRIDE;
    return decodeCell(vector.slice(offset, offset + VECTOR_STRIDE));
  }

  function vectorAppend(value, cellValue) {
    return concat(assertVector(value), encodeCell(assertCell(cellValue)));
  }

  function vectorLast(value) {
    const vector = assertVector(value);
    const length = vectorLength(vector);
    invariant(length > 0, 'E_VECTOR_EMPTY', 'El vector vacío no tiene último elemento.');
    return vectorAt(vector, length - 1);
  }

  function vectorIsPrefix(prefixValue, fullValue) {
    const prefix = assertVector(prefixValue, 'prefix');
    const full = assertVector(fullValue, 'full');
    return prefix.length <= full.length && equal(prefix, full.slice(0, prefix.length));
  }

  function vectorCommonPrefix(aValue, bValue) {
    const a = assertVector(aValue, 'a');
    const b = assertVector(bValue, 'b');
    const n = Math.min(vectorLength(a), vectorLength(b));
    let i = 0;
    while (i < n && equalCell(vectorAt(a, i), vectorAt(b, i))) i += 1;
    return a.slice(0, i * VECTOR_STRIDE);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Interpretaciones universales: Trajectory / Index
  // ────────────────────────────────────────────────────────────────────────────

  function assertTrajectory(value, resolver = genesisResolver, label = 'trajectory') {
    const trajectory = assertVector(value, label);
    for (let i = 0; i < vectorLength(trajectory); i += 1) exact(vectorAt(trajectory, i), resolver);
    return trajectory;
  }

  function trajectoryFrom(cells = [], resolver = genesisResolver) {
    return bytes(assertTrajectory(vectorFrom(cells), resolver));
  }

  function trajectoryLength(value, resolver = genesisResolver) {
    return assertTrajectory(value, resolver).length / VECTOR_STRIDE;
  }

  function trajectoryAt(value, index, resolver = genesisResolver) {
    return exact(vectorAt(assertTrajectory(value, resolver), index), resolver);
  }

  function trajectoryAppend(value, exactCellValue, resolver = genesisResolver) {
    return concat(assertTrajectory(value, resolver), encodeCell(exact(exactCellValue, resolver)));
  }

  function trajectoryLast(value, resolver = genesisResolver) {
    const trajectory = assertTrajectory(value, resolver);
    invariant(trajectoryLength(trajectory, resolver) > 0, 'E_TRAJECTORY_EMPTY', 'Trayectoria vacía sin actualidad.');
    return exact(vectorLast(trajectory), resolver);
  }

  function trajectoryIsPrefix(prefixValue, fullValue, resolver = genesisResolver) {
    return vectorIsPrefix(assertTrajectory(prefixValue, resolver, 'prefix'), assertTrajectory(fullValue, resolver, 'full'));
  }

  function trajectoryCommonPrefix(aValue, bValue, resolver = genesisResolver) {
    return vectorCommonPrefix(assertTrajectory(aValue, resolver, 'a'), assertTrajectory(bValue, resolver, 'b'));
  }

  function assertIndex(value, resolver = genesisResolver, label = 'index') {
    const index = assertVector(value, label);
    for (let i = 0; i < vectorLength(index); i += 1) operatorOf(vectorAt(index, i), resolver);
    return index;
  }

  function indexFrom(cells = [], resolver = genesisResolver) {
    return bytes(assertIndex(vectorFrom(cells), resolver));
  }

  function indexLength(value, resolver = genesisResolver) {
    return assertIndex(value, resolver).length / VECTOR_STRIDE;
  }

  function indexAt(value, index, resolver = genesisResolver) {
    return vectorAt(assertIndex(value, resolver), index);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 6. Envelope de View: Clear o Keyed
  // ────────────────────────────────────────────────────────────────────────────

  function header(kindByte, commitmentValue) {
    return concat(MAGIC, ENVELOPE_VERSION_BYTES, uint8(kindByte), bytes(commitmentValue, 'commitment', COMMITMENT_BYTES));
  }

  function parseEnvelope(envelopeValue) {
    const envelope = bytes(envelopeValue, 'envelope');
    invariant(envelope.length >= HEADER_BYTES + CELL_BYTES, 'E_ENVELOPE_TRUNCATED', 'Envelope demasiado corto.');
    invariant(equal(envelope.slice(0, MAGIC.length), MAGIC), 'E_ENVELOPE_MAGIC', 'Magic inválido.');
    const version = readUint16be(envelope, MAGIC.length);
    invariant(version === ENVELOPE_VERSION, 'E_ENVELOPE_VERSION', 'Versión de envelope no soportada.', { version });
    const kindOffset = MAGIC.length + ENVELOPE_VERSION_BYTES.length;
    const kindByte = envelope[kindOffset];
    invariant(kindByte === CLEAR_KIND_BYTE || kindByte === KEYED_KIND_BYTE, 'E_ENVELOPE_VIEW', 'View kind inválido.');
    const commitmentOffset = kindOffset + VIEW_KIND_BYTES;
    const commitment = envelope.slice(commitmentOffset, commitmentOffset + COMMITMENT_BYTES);
    const payload = envelope.slice(commitmentOffset + COMMITMENT_BYTES);
    return Object.freeze({ version, kindByte, commitment, payload });
  }

  async function commitment(viewValue, plaintextValue) {
    const view = assertView(viewValue);
    const P = bytes(plaintextValue, 'plaintext');
    const context = [uint16be(ENVELOPE_VERSION), uint8(viewKindByte(view)), P];
    if (view.kind === ViewKind.KEYED) return derive(view, TAG_COMMITMENT, context);
    return sha256(frame([TAG_COMMITMENT, ...context]));
  }

  async function keyedAeadMaterial(viewValue, commitmentValue) {
    const view = assertView(viewValue);
    invariant(view.kind === ViewKind.KEYED, 'E_KEYED_VIEW_REQUIRED', 'Se requiere Keyed(d).');
    const C = bytes(commitmentValue, 'commitment', COMMITMENT_BYTES);
    const keyBytes = await derive(view, TAG_AEAD_KEY, [uint16be(ENVELOPE_VERSION), C]);
    const nonceFull = await derive(view, TAG_AEAD_NONCE, [uint16be(ENVELOPE_VERSION), C]);
    const key = await subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    return Object.freeze({ key, nonce: nonceFull.slice(0, NONCE_BYTES) });
  }

  function validateBody(cellValue, BValue, resolver = genesisResolver) {
    const c = assertCell(cellValue);
    const B = bytes(BValue, 'B');
    const op = operatorOf(c, resolver);
    if (op === Operator.FOLLOW) assertTrajectory(B, resolver, 'trajectory');
    if (op === Operator.EXPAND) assertIndex(B, resolver, 'index');
    return op;
  }

  async function seal(viewValue, cellValue, contentValue, resolver = genesisResolver) {
    const view = assertView(viewValue);
    const c = assertCell(cellValue);
    const B = bytes(contentValue, 'B');
    const op = validateBody(c, B, resolver);

    let Q = null;
    if (op === Operator.EMIT || op === Operator.EXPAND) {
      Q = await contentId(view, B);
      invariant(equal(c.referent, Q), 'E_EXACT_REFERENT_MISMATCH',
        'EMIT/EXPAND debe referenciar ContentId(B).', {
          expected: bytesToHex(c.referent), actual: bytesToHex(Q), operator: op,
        });
    }

    const P = concat(encodeCell(c), B);
    const C = await commitment(view, P);
    const kindByte = viewKindByte(view);
    const H = header(kindByte, C);
    let payload;
    if (view.kind === ViewKind.CLEAR) {
      payload = P;
    } else {
      const material = await keyedAeadMaterial(view, C);
      payload = new Uint8Array(await subtle.encrypt({
        name: 'AES-GCM', iv: material.nonce, additionalData: H, tagLength: GCM_TAG_BITS,
      }, material.key, P));
    }

    const objectName = await name(view, c);
    return Object.freeze({
      viewKind: view.kind,
      cell: c,
      operator: op,
      contentId: Q,
      name: objectName,
      nameHex: bytesToHex(objectName),
      commitment: C,
      envelope: concat(H, payload),
    });
  }

  async function open(viewValue, envelopeValue, resolver = genesisResolver) {
    const view = assertView(viewValue);
    const envelope = bytes(envelopeValue, 'envelope');
    const parsed = parseEnvelope(envelope);
    invariant(parsed.kindByte === viewKindByte(view), 'E_VIEW_MISMATCH', 'Envelope pertenece a otro régimen de View.');
    const H = envelope.slice(0, HEADER_BYTES);
    let P;

    if (view.kind === ViewKind.CLEAR) {
      P = bytes(parsed.payload);
    } else {
      const material = await keyedAeadMaterial(view, parsed.commitment);
      try {
        P = new Uint8Array(await subtle.decrypt({
          name: 'AES-GCM', iv: material.nonce, additionalData: H, tagLength: GCM_TAG_BITS,
        }, material.key, parsed.payload));
      } catch (error) {
        throw wrapError(error, 'E_AEAD', 'Envelope no autentica bajo Keyed(d).');
      }
    }

    invariant(P.length >= CELL_BYTES, 'E_INNER_TRUNCATED', 'Envelope no contiene Cell completa.');
    const recomputed = await commitment(view, P);
    invariant(equal(parsed.commitment, recomputed), 'E_COMMITMENT', 'El envelope no recompone su commitment.');

    const c = decodeCell(P.slice(0, CELL_BYTES));
    const B = P.slice(CELL_BYTES);
    const op = validateBody(c, B, resolver);
    let Q = null;
    if (op === Operator.EMIT || op === Operator.EXPAND) {
      Q = await contentId(view, B);
      invariant(equal(c.referent, Q), 'E_EXACT_INTEGRITY', 'Contenido exacto no corresponde a Q.');
    }

    const objectName = await name(view, c);
    return Object.freeze({
      viewKind: view.kind,
      cell: c,
      operator: op,
      contentId: Q,
      content: bytes(B),
      name: objectName,
      nameHex: bytesToHex(objectName),
      commitment: parsed.commitment,
      version: parsed.version,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 7. Recognition: material observado → candidatos reconocidos
  // ────────────────────────────────────────────────────────────────────────────

  function dedupeByteSequences(values) {
    const map = new Map();
    for (const value of values) map.set(bytesToHex(value), bytes(value));
    return [...map.values()].sort(compareLex);
  }

  async function recognize(viewValue, expectedCellValue, envelopeValues, resolver = genesisResolver) {
    const view = assertView(viewValue);
    const expected = assertCell(expectedCellValue);
    invariant(Array.isArray(envelopeValues), 'E_RECOGNITION_CANDIDATES', 'recognize requiere envelope[].');

    const accepted = [];
    const otherCell = [];
    const rejected = [];

    for (let i = 0; i < envelopeValues.length; i += 1) {
      const envelope = bytes(envelopeValues[i], `envelopes[${i}]`);
      try {
        const opened = await open(view, envelope, resolver);
        if (equalCell(opened.cell, expected)) accepted.push(opened);
        else otherCell.push(Object.freeze({ envelope, cell: opened.cell }));
      } catch (error) {
        rejected.push(Object.freeze({ envelope, code: error.code || 'E_OPEN', message: error.message }));
      }
    }

    return Object.freeze({
      expectedCell: expected,
      accepted: Object.freeze(accepted),
      otherCell: Object.freeze(otherCell),
      rejected: Object.freeze(rejected),
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 8. Resolution: exactitud / cadena por prefijo / fork
  // ────────────────────────────────────────────────────────────────────────────

  function resolveTrajectories(values, resolver = genesisResolver) {
    invariant(Array.isArray(values), 'E_TRAJECTORY_VALUES', 'resolveTrajectories requiere array.');
    const trajectories = dedupeByteSequences(values.map((v) => bytes(assertTrajectory(v, resolver))));
    invariant(trajectories.length > 0, 'E_TRAJECTORY_NONE', 'resolveTrajectories requiere al menos una trayectoria observada.');

    let maximum = trajectories[0];
    for (const candidate of trajectories) if (candidate.length > maximum.length) maximum = candidate;
    const incomparable = trajectories.filter((candidate) => !trajectoryIsPrefix(candidate, maximum, resolver));

    if (incomparable.length > 0) {
      const commonPrefix = trajectories.reduce(
        (prefix, trajectory) => trajectoryCommonPrefix(prefix, trajectory, resolver), trajectories[0]
      );
      return Object.freeze({
        kind: ResolveKind.FORK,
        trajectories: Object.freeze(trajectories),
        commonPrefix: bytes(commonPrefix),
      });
    }

    if (trajectoryLength(maximum, resolver) === 0) {
      return Object.freeze({ kind: ResolveKind.EMPTY, trajectory: bytes(maximum), candidates: Object.freeze(trajectories) });
    }

    return Object.freeze({ kind: ResolveKind.CHAIN, trajectory: bytes(maximum), candidates: Object.freeze(trajectories) });
  }

  function forkFrontier(forkResult, resolver = genesisResolver) {
    invariant(forkResult && forkResult.kind === ResolveKind.FORK, 'E_FORK_REQUIRED', 'Se requiere resultado FORK.');
    const out = [];
    for (const trajectory of forkResult.trajectories) {
      const extended = forkResult.trajectories.some((other) =>
        other.length > trajectory.length && trajectoryIsPrefix(trajectory, other, resolver));
      if (!extended && trajectoryLength(trajectory, resolver) > 0) out.push(trajectoryLast(trajectory, resolver));
    }
    const map = new Map();
    for (const c of out) map.set(cellKey(c), c);
    return Object.freeze([...map.values()].sort((a, b) => compareLex(encodeCell(a), encodeCell(b))));
  }

  async function resolveExact(viewValue, exactCellValue, envelopeValues, resolver = genesisResolver) {
    const c = exact(exactCellValue, resolver);
    invariant(Array.isArray(envelopeValues), 'E_EXACT_CANDIDATES', 'resolveExact requiere envelope[].');
    if (envelopeValues.length === 0) return Object.freeze({ kind: ResolveKind.NO_EVIDENCE, cell: c });

    const recognition = await recognize(viewValue, c, envelopeValues, resolver);
    if (recognition.accepted.length === 0) {
      return Object.freeze({ kind: ResolveKind.UNRECOGNIZED, cell: c, recognition });
    }

    const distinct = dedupeByteSequences(recognition.accepted.map((candidate) => candidate.content));
    invariant(distinct.length === 1, 'E_EXACT_DIVERGENCE', 'Una Cell exacta reconocida produjo contenidos distintos.');
    return Object.freeze({ kind: ResolveKind.EXACT, cell: c, content: distinct[0], recognition });
  }

  async function resolveFollow(viewValue, identityValue, envelopeValues, resolver = genesisResolver) {
    const I = bytes(identityValue, 'identity', ID_BYTES);
    const c = follow(I);
    invariant(Array.isArray(envelopeValues), 'E_FOLLOW_CANDIDATES', 'resolveFollow requiere envelope[].');
    if (envelopeValues.length === 0) return Object.freeze({ kind: ResolveKind.NO_EVIDENCE, identity: I, cell: c });

    const recognition = await recognize(viewValue, c, envelopeValues, resolver);
    if (recognition.accepted.length === 0) {
      return Object.freeze({ kind: ResolveKind.UNRECOGNIZED, identity: I, cell: c, recognition });
    }

    const trajectories = recognition.accepted.map((candidate) => bytes(assertTrajectory(candidate.content, resolver)));
    const resolved = resolveTrajectories(trajectories, resolver);

    if (resolved.kind === ResolveKind.FORK) {
      return Object.freeze({
        kind: ResolveKind.FORK,
        identity: I,
        cell: c,
        trajectories: resolved.trajectories,
        commonPrefix: resolved.commonPrefix,
        recognition,
      });
    }

    if (resolved.kind === ResolveKind.EMPTY) {
      return Object.freeze({
        kind: ResolveKind.EMPTY,
        identity: I,
        cell: c,
        trajectory: resolved.trajectory,
        length: 0,
        recognition,
      });
    }

    const trajectory = resolved.trajectory;
    const length = trajectoryLength(trajectory, resolver);
    return Object.freeze({
      kind: ResolveKind.CHAIN,
      identity: I,
      cell: c,
      trajectory,
      length,
      currentCell: trajectoryLast(trajectory, resolver),
      recognition,
    });
  }

  async function evaluate(viewValue, cellValue, envelopeValues, resolver = genesisResolver) {
    const c = assertCell(cellValue);
    return operatorOf(c, resolver) === Operator.FOLLOW
      ? resolveFollow(viewValue, c.referent, envelopeValues, resolver)
      : resolveExact(viewValue, c, envelopeValues, resolver);
  }

  function match(result, handlers) {
    invariant(result && typeof result.kind === 'string', 'E_RESULT', 'Resultado inválido.');
    const fn = handlers && handlers[result.kind];
    invariant(typeof fn === 'function', 'E_MATCH_HANDLER', `Falta handler para ${result.kind}.`);
    return fn(result);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 9. KAT / witnesses del Kernel reducido
  // ────────────────────────────────────────────────────────────────────────────

  function testBytes(length, offset = 0) {
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) out[i] = (i + offset) & 0xff;
    return out;
  }

  async function knownAnswerVector() {
    const view = keyedView(testBytes(32, 0x21));
    const I = await identity(view, [ascii('known'), ascii('identity')]);
    const B = ascii('KOBALT-KOB2-9.0.1-KAT');
    const Q = await contentId(view, B);
    const c = emit(Q);
    const N = await name(view, c);
    const E = await seal(view, c, B);
    return Object.freeze({
      identity: bytesToHex(I),
      contentId: bytesToHex(Q),
      cell: bytesToHex(encodeCell(c)),
      name: bytesToHex(N),
      envelope: bytesToHex(E.envelope),
    });
  }

  // Se congela después de materializar la implementación completa.
  const KNOWN_ANSWER = Object.freeze({
    identity: '63115ffc08a376b9971759cd3383757f77c18b519a6fe08bf34b230be0ead75d',
    contentId: '855192844cc4f19012debd8b46ae84932a4ac696dacbc4cffbdfb41562c47b62',
    cell: '00000000855192844cc4f19012debd8b46ae84932a4ac696dacbc4cffbdfb41562c47b62',
    name: 'dc0a60e8620710d5affc24f1591aa5a87d8aac27033d6c1ebd97ba84ece08a52',
    envelope: '4b4f4232000301defbcf6ce3af5807d134faa7e7e781b6f9a194b04092f01b9d7d653c7c65f57e88250a17e43ede65f28703ab122bc29494b4edc87808cb8d0caad238d6b99074d07ec3b86f09f6eeb80718ed7544447efa7de1d7e380dc73c97b84eaed5da45ff0aa8d91aa1db2866d',
  });

  async function knownAnswerTest() {
    const actual = await knownAnswerVector();
    const ready = Object.values(KNOWN_ANSWER).every((v) => typeof v === 'string' && v.length > 0);
    if (!ready) return Object.freeze({ pass: false, reason: 'KNOWN_ANSWER_NOT_FROZEN', actual, expected: KNOWN_ANSWER });
    const checks = {};
    for (const key of Object.keys(KNOWN_ANSWER)) checks[key] = actual[key] === KNOWN_ANSWER[key];
    return Object.freeze({ pass: Object.values(checks).every(Boolean), checks, actual, expected: KNOWN_ANSWER });
  }

  async function selfTest() {
    const tests = [];
    const record = async (nameValue, fn) => {
      try { tests.push({ name: nameValue, pass: (await fn()) === true }); }
      catch (error) { tests.push({ name: nameValue, pass: false, code: error.code, error: error.message }); }
    };
    const throwsCode = async (fn, code) => {
      try { await fn(); return false; } catch (error) { return error && error.code === code; }
    };

    const clear = clearView();
    const keyed = keyedView(testBytes(32, 3));
    const zero = keyedView(new Uint8Array(32));
    const B0 = ascii('alpha');
    const B1 = ascii('beta');
    const I = await identity(keyed, [ascii('continuity'), ascii('x')]);
    const Q0 = await contentId(keyed, B0);
    const Q1 = await contentId(keyed, B1);

    await record('View distingue Clear de Keyed(0^256)', async () => {
      const a = await identity(clear, [ascii('x')]);
      const b = await identity(zero, [ascii('x')]);
      return !equal(a, b);
    });

    await record('Cell = 36 bytes', async () => encodeCell(emit(Q0)).length === CELL_BYTES);

    await record('Cell roundtrip', async () => {
      const c = expand(Q0);
      return equalCell(c, decodeCell(encodeCell(c)));
    });

    await record('Name incluye DescriptorSlot', async () =>
      !equal(await name(keyed, emit(Q0)), await name(keyed, expand(Q0))));

    await record('Frame preserva fronteras', async () =>
      !equal(frame([ascii('ab'), ascii('c')]), frame([ascii('a'), ascii('bc')])));

    await record('Vector prefix = extensión conservativa', async () => {
      const a = vectorFrom([emit(Q0)]);
      const b = vectorAppend(a, expand(Q1));
      return vectorIsPrefix(a, b) && !vectorIsPrefix(b, a);
    });

    await record('Trajectory rechaza FOLLOW', async () =>
      throwsCode(() => Promise.resolve(trajectoryFrom([follow(I)])), 'E_EXACT_REQUIRED'));

    await record('Index acepta FOLLOW/EMIT/EXPAND', async () => {
      const idx = indexFrom([follow(I), emit(Q0), expand(Q1)]);
      return indexLength(idx) === 3;
    });

    await record('Trajectory prefix resuelve CHAIN', async () => {
      const a = trajectoryFrom([emit(Q0)]);
      const b = trajectoryFrom([emit(Q0), expand(Q1)]);
      return resolveTrajectories([a, b]).kind === ResolveKind.CHAIN;
    });

    await record('Trayectorias incompatibles resuelven FORK', async () => {
      const a = trajectoryFrom([emit(Q0)]);
      const b = trajectoryFrom([expand(Q1)]);
      return resolveTrajectories([a, b]).kind === ResolveKind.FORK;
    });

    await record('Trayectoria reconocida vacía es EMPTY', async () => {
      const E = await seal(keyed, follow(I), trajectoryFrom([]));
      const R = await resolveFollow(keyed, I, [E.envelope]);
      return R.kind === ResolveKind.EMPTY && R.length === 0 && !('currentCell' in R);
    });

    await record('Keyed EMIT roundtrip', async () => {
      const S = await seal(keyed, emit(Q0), B0);
      const O = await open(keyed, S.envelope);
      return O.operator === Operator.EMIT && equal(O.content, B0);
    });

    await record('Keyed FOLLOW roundtrip', async () => {
      const T = trajectoryFrom([emit(Q0)]);
      const S = await seal(keyed, follow(I), T);
      const O = await open(keyed, S.envelope);
      return O.operator === Operator.FOLLOW && equal(O.content, T);
    });

    await record('Clear EMIT roundtrip', async () => {
      const Q = await contentId(clear, B0);
      const S = await seal(clear, emit(Q), B0);
      const O = await open(clear, S.envelope);
      return O.viewKind === ViewKind.CLEAR && equal(O.content, B0);
    });

    await record('Clear EXPAND roundtrip', async () => {
      const idx = indexFrom([follow(I)]);
      const Q = await contentId(clear, idx);
      const S = await seal(clear, expand(Q), idx);
      const O = await open(clear, S.envelope);
      return O.operator === Operator.EXPAND && equal(O.content, idx);
    });

    await record('Clear materializa plaintext realmente claro', async () => {
      const Q = await contentId(clear, B0);
      const S = await seal(clear, emit(Q), B0);
      const parsed = parseEnvelope(S.envelope);
      const inner = concat(encodeCell(emit(Q)), B0);
      return equal(parsed.payload, inner);
    });

    await record('Keyed y Clear producen Names distintos', async () => {
      const QK = await contentId(keyed, B0);
      const QC = await contentId(clear, B0);
      return !equal(await name(keyed, emit(QK)), await name(clear, emit(QC)));
    });

    await record('Envelope rechaza View incorrecta', async () => {
      const S = await seal(keyed, emit(Q0), B0);
      return throwsCode(() => open(clear, S.envelope), 'E_VIEW_MISMATCH');
    });

    await record('Cell exacta rechaza bytes ajenos', async () =>
      throwsCode(() => seal(keyed, emit(Q0), B1), 'E_EXACT_REFERENT_MISMATCH'));

    await record('Clear detecta corrupción material', async () => {
      const Q = await contentId(clear, B0);
      const S = await seal(clear, emit(Q), B0);
      const E = bytes(S.envelope);
      E[E.length - 1] ^= 1;
      return throwsCode(() => open(clear, E), 'E_COMMITMENT');
    });

    await record('Recognition ignora otra Cell y reconoce la esperada', async () => {
      const S0 = await seal(keyed, emit(Q0), B0);
      const S1 = await seal(keyed, emit(Q1), B1);
      const R = await recognize(keyed, emit(Q0), [S1.envelope, S0.envelope]);
      return R.accepted.length === 1 && R.otherCell.length === 1;
    });

    await record('Exact resolution es exacta', async () => {
      const S = await seal(keyed, emit(Q0), B0);
      const R = await resolveExact(keyed, emit(Q0), [S.envelope]);
      return R.kind === ResolveKind.EXACT && equal(R.content, B0);
    });

    await record('Follow resolution elige máximo por prefijo', async () => {
      const T0 = trajectoryFrom([emit(Q0)]);
      const T1 = trajectoryFrom([emit(Q0), expand(Q1)]);
      const E0 = await seal(keyed, follow(I), T0);
      const E1 = await seal(keyed, follow(I), T1);
      const R = await resolveFollow(keyed, I, [E0.envelope, E1.envelope]);
      return R.kind === ResolveKind.CHAIN && R.length === 2 && equalCell(R.currentCell, expand(Q1));
    });

    await record('Follow resolution expone FORK, no merge', async () => {
      const T0 = trajectoryFrom([emit(Q0)]);
      const T1 = trajectoryFrom([expand(Q1)]);
      const E0 = await seal(keyed, follow(I), T0);
      const E1 = await seal(keyed, follow(I), T1);
      const R = await resolveFollow(keyed, I, [E0.envelope, E1.envelope]);
      return R.kind === ResolveKind.FORK && forkFrontier(R).length === 2;
    });

    await record('Descriptor desconocido exige resolver', async () =>
      throwsCode(() => Promise.resolve(operatorOf(cell(99, Q0))), 'E_DESCRIPTOR_UNKNOWN'));

    await record('I/Q/Name = 32 bytes', async () => {
      const N = await name(keyed, emit(Q0));
      return I.length === 32 && Q0.length === 32 && N.length === 32;
    });

    return Object.freeze({
      pass: tests.every((t) => t.pass),
      count: tests.length,
      passed: tests.filter((t) => t.pass).length,
      tests: Object.freeze(tests),
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 10. API: jurisdicciones explícitas, sin compatibilidad heredada
  // ────────────────────────────────────────────────────────────────────────────

  const api = Object.freeze({
    release: '9.0.1',
    grammar: Object.freeze({
      family: 'KOB2',
      envelopeVersion: ENVELOPE_VERSION,
      idBytes: ID_BYTES,
      nameBytes: NAME_BYTES,
      descriptorSlotBytes: DESCRIPTOR_SLOT_BYTES,
      cellBytes: CELL_BYTES,
      vectorStride: VECTOR_STRIDE,
      clearEnvelopeOverhead: HEADER_BYTES + CELL_BYTES,
      keyedEnvelopeOverhead: HEADER_BYTES + CELL_BYTES + GCM_TAG_BYTES,
    }),
    Operator,
    GenesisSlot,
    ViewKind,
    ResolveKind,
    KobaltError,

    Bytes: Object.freeze({
      ascii, utf8, bytes, concat, equal, compareLex, slice, bytesToHex, hexToBytes,
      uint16be, uint32be, uint64be,
    }),

    Frame: Object.freeze({ frame, unframe }),

    View: Object.freeze({
      clear: clearView,
      keyed: keyedView,
      assert: assertView,
      derive,
    }),

    Derivation: Object.freeze({ identity, contentId, name }),

    Cell: Object.freeze({
      make: cell,
      assert: assertCell,
      encode: encodeCell,
      decode: decodeCell,
      equal: equalCell,
      key: cellKey,
      emit,
      expand,
      follow,
      exact,
      operatorOf,
    }),

    Vector: Object.freeze({
      assert: assertVector,
      from: vectorFrom,
      length: vectorLength,
      at: vectorAt,
      append: vectorAppend,
      last: vectorLast,
      isPrefix: vectorIsPrefix,
      commonPrefix: vectorCommonPrefix,
    }),

    Trajectory: Object.freeze({
      assert: assertTrajectory,
      from: trajectoryFrom,
      length: trajectoryLength,
      at: trajectoryAt,
      append: trajectoryAppend,
      last: trajectoryLast,
      isPrefix: trajectoryIsPrefix,
      commonPrefix: trajectoryCommonPrefix,
    }),

    Index: Object.freeze({
      assert: assertIndex,
      from: indexFrom,
      length: indexLength,
      at: indexAt,
    }),

    Grammar: Object.freeze({
      genesisResolver,
      operator,
      operatorOf,
    }),

    Envelope: Object.freeze({
      seal,
      open,
      parse: parseEnvelope,
    }),

    Recognition: Object.freeze({ recognize }),

    Resolution: Object.freeze({
      trajectories: resolveTrajectories,
      exact: resolveExact,
      follow: resolveFollow,
      evaluate,
      forkFrontier,
      match,
    }),

    Tests: Object.freeze({
      knownAnswerVector,
      knownAnswerTest,
      selfTest,
    }),
  });

  root.KOB2 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
