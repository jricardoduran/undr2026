/* ════════════════════════════════════════════════════════════════════════════════
 * KOBALT MECHANISMS 1.0.0
 * 2026-09-18 — America/Bogota (UTC-5)
 *
 * Biblioteca de construcciones demostrables sobre KOB2 9.0.1.
 *
 * Un mecanismo NO es una primitive del Kernel. Su valor consiste precisamente
 * en que puede expresarse usando leyes más pequeñas del Kernel.
 *
 * Mecanismos materializados aquí:
 *   Continuity, Publication, CoordinateTable, Coproduct, Evidence,
 *   MemorySource, DescriptorTable, Closure, Principal, DomainContinuity,
 *   AuthorityContinuity.
 * ════════════════════════════════════════════════════════════════════════════════ */

(function bootstrapKobaltMechanisms(root) {
  'use strict';

  const K = root.KOB2 || (typeof require === 'function' ? null : null);
  if (!K) throw new Error('KobaltMechanisms requiere KOB2 9.0.1 cargado previamente.');

  const { Bytes: B, Frame: F, View, Derivation, Cell, Vector, Trajectory, Index, Grammar, Envelope, Resolution } = K;

  const MechanismResult = Object.freeze({
    NO_EVIDENCE: 'NO_EVIDENCE',
    UNRECOGNIZED: 'UNRECOGNIZED',
    EMPTY: 'EMPTY',
    FORK: 'FORK',
    CONTENT_MISSING: 'CONTENT_MISSING',
    CURRENT: 'CURRENT',
  });

  function invariant(condition, code, message, details = undefined) {
    if (!condition) throw new K.KobaltError(code, message, details);
  }

  function hex(value) { return B.bytesToHex(value); }

  // ────────────────────────────────────────────────────────────────────────────
  // 1. CONTINUITY
  // Identity + Trajectory + Current (derivado del máximo por prefijo)
  // ────────────────────────────────────────────────────────────────────────────

  async function queryCell(view, cellValue, query, resolver = Grammar.genesisResolver) {
    invariant(typeof query === 'function', 'E_QUERY', 'Se requiere query(name) -> envelope[].');
    const name = await Derivation.name(view, cellValue);
    const envelopes = await query(name);
    invariant(Array.isArray(envelopes), 'E_QUERY_RESULT', 'query(name) debe devolver envelope[].');
    return Resolution.evaluate(view, cellValue, envelopes, resolver);
  }

  async function openTrajectory(options) {
    const { view, identity, query, resolver = Grammar.genesisResolver } = options || {};
    const I = B.bytes(identity, 'identity', K.grammar.idBytes);
    return queryCell(view, Cell.follow(I), query, resolver);
  }

  async function openExact(options) {
    const { view, cell, query, resolver = Grammar.genesisResolver } = options || {};
    return queryCell(view, Cell.exact(cell, resolver), query, resolver);
  }

  function continuityState(followResult) {
    invariant(followResult && typeof followResult.kind === 'string', 'E_FOLLOW_RESULT', 'Resultado FOLLOW inválido.');
    switch (followResult.kind) {
      case K.ResolveKind.NO_EVIDENCE:
        return Object.freeze({ kind: MechanismResult.NO_EVIDENCE, identity: followResult.identity });
      case K.ResolveKind.UNRECOGNIZED:
        return Object.freeze({ kind: MechanismResult.UNRECOGNIZED, identity: followResult.identity, recognition: followResult.recognition });
      case K.ResolveKind.EMPTY:
        return Object.freeze({ kind: MechanismResult.EMPTY, identity: followResult.identity, trajectory: followResult.trajectory });
      case K.ResolveKind.FORK:
        return Object.freeze({
          kind: MechanismResult.FORK,
          identity: followResult.identity,
          trajectories: followResult.trajectories,
          commonPrefix: followResult.commonPrefix,
        });
      case K.ResolveKind.CHAIN:
        return Object.freeze({
          kind: MechanismResult.CURRENT,
          identity: followResult.identity,
          trajectory: followResult.trajectory,
          length: followResult.length,
          currentCell: followResult.currentCell,
        });
      default:
        throw new K.KobaltError('E_FOLLOW_RESULT_KIND', 'Resultado FOLLOW desconocido.', { kind: followResult.kind });
    }
  }

  async function openAt(options) {
    const { view, identity, index, query, resolver = Grammar.genesisResolver } = options || {};
    const followResult = await openTrajectory({ view, identity, query, resolver });
    const state = continuityState(followResult);
    if (state.kind !== MechanismResult.CURRENT) return state;
    invariant(Number.isSafeInteger(index) && index >= 0 && index < state.length,
      'E_CONTINUITY_INDEX', 'Índice fuera de trayectoria.', { index, length: state.length });
    const realizationCell = Trajectory.at(state.trajectory, index, resolver);
    const exactResult = await openExact({ view, cell: realizationCell, query, resolver });
    if (exactResult.kind === K.ResolveKind.NO_EVIDENCE) {
      return Object.freeze({ kind: MechanismResult.CONTENT_MISSING, identity: state.identity, index, realizationCell, trajectory: state.trajectory });
    }
    if (exactResult.kind === K.ResolveKind.UNRECOGNIZED) {
      return Object.freeze({ kind: MechanismResult.UNRECOGNIZED, identity: state.identity, index, realizationCell, recognition: exactResult.recognition });
    }
    invariant(exactResult.kind === K.ResolveKind.EXACT, 'E_EXACT_RESULT', 'Resultado exacto inesperado.');
    return Object.freeze({
      kind: MechanismResult.CURRENT,
      identity: state.identity,
      index,
      trajectory: state.trajectory,
      length: state.length,
      realizationCell,
      operator: Cell.operatorOf(realizationCell, resolver),
      content: exactResult.content,
    });
  }

  async function openCurrent(options) {
    const { view, identity, query, resolver = Grammar.genesisResolver } = options || {};
    const followResult = await openTrajectory({ view, identity, query, resolver });
    const state = continuityState(followResult);
    if (state.kind !== MechanismResult.CURRENT) return state;
    return openAt({ view, identity, index: state.length - 1, query, resolver });
  }

  async function planUpdate(options) {
    const {
      view,
      identity,
      currentTrajectory = new Uint8Array(0),
      state,
      descriptorSlot = K.GenesisSlot.EMIT,
      resolver = Grammar.genesisResolver,
    } = options || {};

    const I = B.bytes(identity, 'identity', K.grammar.idBytes);
    const previous = B.bytes(Trajectory.assert(currentTrajectory, resolver, 'currentTrajectory'));
    const payload = B.bytes(state, 'state');
    const Q = await Derivation.contentId(view, payload);
    const realizationCell = Cell.make(descriptorSlot, Q);
    Cell.exact(realizationCell, resolver);
    const nextTrajectory = Trajectory.append(previous, realizationCell, resolver);
    const exactObject = await Envelope.seal(view, realizationCell, payload, resolver);
    const followCell = Cell.follow(I);
    const followObject = await Envelope.seal(view, followCell, nextTrajectory, resolver);

    return Object.freeze({
      identity: I,
      previousTrajectory: previous,
      nextTrajectory,
      occurrence: Object.freeze({ index: Trajectory.length(nextTrajectory, resolver) - 1, realizationCell }),
      objects: Object.freeze([
        Object.freeze({ role: 'realization', cell: realizationCell, name: exactObject.name, envelope: exactObject.envelope }),
        Object.freeze({ role: 'follow', cell: followCell, name: followObject.name, envelope: followObject.envelope }),
      ]),
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. PUBLICATION
  // Ley causal: exacto antes que FOLLOW. El efecto de persistir se inyecta.
  // ────────────────────────────────────────────────────────────────────────────

  async function publish(plan, put) {
    invariant(plan && Array.isArray(plan.objects) && plan.objects.length === 2, 'E_PUBLICATION_PLAN', 'Plan inválido.');
    invariant(typeof put === 'function', 'E_PUBLICATION_PUT', 'Se requiere put(name,envelope,step).');
    invariant(plan.objects[0].role === 'realization' && plan.objects[1].role === 'follow',
      'E_PUBLICATION_ORDER', 'La realización debe preceder FOLLOW.');
    const receipts = [];
    for (const step of plan.objects) receipts.push(await put(step.name, step.envelope, step));
    return Object.freeze({ plan, receipts: Object.freeze(receipts) });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3. COORDINATE TABLE
  // Continuity + Index + extensión conservativa de una inyección parcial.
  // Materialización canónica: Index[FOLLOW(H0), FOLLOW(H1), ...].
  // ────────────────────────────────────────────────────────────────────────────

  function coordinateTableState(identityValues, resolver = Grammar.genesisResolver) {
    invariant(Array.isArray(identityValues), 'E_TABLE_IDENTITIES', 'CoordinateTable requiere identity[].');
    const seen = new Set();
    const cells = identityValues.map((identity, i) => {
      const I = B.bytes(identity, `identities[${i}]`, K.grammar.idBytes);
      const key = hex(I);
      invariant(!seen.has(key), 'E_TABLE_DUPLICATE_IDENTITY', 'CoordinateTable debe ser inyectiva.', { identity: key });
      seen.add(key);
      return Cell.follow(I);
    });
    return Index.from(cells, resolver);
  }

  function coordinateTableIdentities(stateValue, resolver = Grammar.genesisResolver) {
    const state = Index.assert(stateValue, resolver, 'coordinateTable');
    const out = [];
    const seen = new Set();
    for (let i = 0; i < Index.length(state, resolver); i += 1) {
      const c = Index.at(state, i, resolver);
      invariant(Cell.operatorOf(c, resolver) === K.Operator.FOLLOW,
        'E_TABLE_ENTRY', 'CoordinateTable debe contener FOLLOW(identity) en cada slot.', { slot: i });
      const key = hex(c.referent);
      invariant(!seen.has(key), 'E_TABLE_DUPLICATE_IDENTITY', 'CoordinateTable debe ser inyectiva.', { identity: key });
      seen.add(key);
      out.push(B.bytes(c.referent));
    }
    return Object.freeze(out);
  }

  function tableSlotOf(stateValue, identityValue, resolver = Grammar.genesisResolver) {
    const target = B.bytes(identityValue, 'identity', K.grammar.idBytes);
    const identities = coordinateTableIdentities(stateValue, resolver);
    for (let i = 0; i < identities.length; i += 1) if (B.equal(identities[i], target)) return i;
    return -1;
  }

  function tableAt(stateValue, slot, resolver = Grammar.genesisResolver) {
    const identities = coordinateTableIdentities(stateValue, resolver);
    invariant(Number.isSafeInteger(slot) && slot >= 0 && slot < identities.length,
      'E_TABLE_SLOT', 'Slot fuera de rango.', { slot, length: identities.length });
    return identities[slot];
  }

  function tableAppend(stateValue, identityValue, resolver = Grammar.genesisResolver) {
    const state = Index.assert(stateValue, resolver, 'coordinateTable');
    const I = B.bytes(identityValue, 'identity', K.grammar.idBytes);
    invariant(tableSlotOf(state, I, resolver) < 0, 'E_TABLE_DUPLICATE_IDENTITY', 'La identidad ya tiene coordenada.');
    return B.concat(state, Cell.encode(Cell.follow(I)));
  }

  function tableIsExtension(previousValue, nextValue, resolver = Grammar.genesisResolver) {
    coordinateTableIdentities(previousValue, resolver);
    coordinateTableIdentities(nextValue, resolver);
    return K.Vector.isPrefix(previousValue, nextValue);
  }

  function assertTableExtension(previousValue, nextValue, resolver = Grammar.genesisResolver) {
    invariant(tableIsExtension(previousValue, nextValue, resolver), 'E_TABLE_NON_MONOTONE',
      'La nueva CoordinateTable debe conservar todas las coordenadas anteriores.');
    return B.bytes(nextValue);
  }

  function coordinate(tableIdentityValue, slot) {
    const tableIdentity = B.bytes(tableIdentityValue, 'tableIdentity', K.grammar.idBytes);
    invariant(Number.isSafeInteger(slot) && slot >= 0 && slot <= 0xffffffff,
      'E_TABLE_SLOT', 'slot debe ser uint32.', { slot });
    return Object.freeze({ tableIdentity, slot });
  }

  function encodeCoordinate(value) {
    invariant(value && value.tableIdentity !== undefined, 'E_COORDINATE', 'Coordinate inválida.');
    return F.frame([B.bytes(value.tableIdentity, 'tableIdentity', K.grammar.idBytes), B.uint32be(value.slot)]);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 4. COPRODUCT
  // Contexto + valor local. No identifica fibras distintas aunque el valor local coincida.
  // ────────────────────────────────────────────────────────────────────────────

  function inject(contextValue, localValue) {
    return Object.freeze({ context: B.bytes(contextValue, 'context'), local: B.bytes(localValue, 'local') });
  }

  function encodeInjection(value) {
    invariant(value && value.context !== undefined && value.local !== undefined, 'E_COPRODUCT', 'Inyección inválida.');
    return F.frame([B.bytes(value.context, 'context'), B.bytes(value.local, 'local')]);
  }

  function injectionKey(value) { return hex(encodeInjection(value)); }

  // ────────────────────────────────────────────────────────────────────────────
  // 5. EVIDENCE
  // Observation/Report = causas situadas; Evidence = normalización;
  // EvidenceBook = índice derivado.
  // ────────────────────────────────────────────────────────────────────────────

  const ObservationKind = Object.freeze({ FOUND: 'FOUND', ABSENT: 'ABSENT', NO_CLAIM: 'NO_CLAIM' });
  const Completeness = Object.freeze({ COMPLETE: 'COMPLETE', PARTIAL: 'PARTIAL' });

  function sourceId(value) {
    invariant(typeof value === 'string' && value.length > 0, 'E_SOURCE_ID', 'sourceId debe ser string no vacío.');
    return value;
  }

  function found(source, envelopes, completeness = Completeness.COMPLETE) {
    const id = sourceId(source);
    invariant(Array.isArray(envelopes) && envelopes.length > 0, 'E_FOUND', 'FOUND requiere envelope[].');
    invariant(Object.values(Completeness).includes(completeness), 'E_COMPLETENESS', 'Completitud inválida.');
    return Object.freeze({
      sourceId: id,
      kind: ObservationKind.FOUND,
      completeness,
      envelopes: Object.freeze(envelopes.map((e) => B.bytes(e)).sort(B.compareLex)),
    });
  }

  function absent(source) {
    return Object.freeze({ sourceId: sourceId(source), kind: ObservationKind.ABSENT, completeness: Completeness.COMPLETE, envelopes: Object.freeze([]) });
  }

  function noClaim(source, reason = 'UNSPECIFIED') {
    return Object.freeze({ sourceId: sourceId(source), kind: ObservationKind.NO_CLAIM, reason: String(reason), completeness: null, envelopes: Object.freeze([]) });
  }

  function evidenceReport(nameValue, basisValue, observationsValue) {
    const name = B.bytes(nameValue, 'name', K.grammar.nameBytes);
    invariant(Array.isArray(basisValue), 'E_BASIS', 'basis debe ser array.');
    const basis = [...new Set(basisValue.map(sourceId))].sort();
    invariant(basis.length === basisValue.length, 'E_BASIS_DUPLICATE', 'basis no admite duplicados.');
    invariant(Array.isArray(observationsValue), 'E_OBSERVATIONS', 'observations debe ser array.');
    const basisSet = new Set(basis);
    const seen = new Set();
    const observations = observationsValue.map((obs) => {
      invariant(obs && typeof obs === 'object', 'E_OBSERVATION', 'Observación inválida.');
      invariant(basisSet.has(obs.sourceId), 'E_OBSERVATION_BASIS', 'Observación fuera de basis.', { sourceId: obs.sourceId });
      invariant(!seen.has(obs.sourceId), 'E_OBSERVATION_DUPLICATE', 'Source repetida.');
      seen.add(obs.sourceId);
      return obs;
    }).sort((a, b) => a.sourceId.localeCompare(b.sourceId));
    return Object.freeze({ name, basis: Object.freeze(basis), observations: Object.freeze(observations) });
  }

  function normalizeEvidence(reportValue) {
    const report = evidenceReport(reportValue.name, reportValue.basis, reportValue.observations);
    const candidateMap = new Map();
    const queried = [];
    const complete = [];
    const material = [];
    for (const obs of report.observations) {
      queried.push(obs.sourceId);
      if (obs.kind === ObservationKind.ABSENT || (obs.kind === ObservationKind.FOUND && obs.completeness === Completeness.COMPLETE)) complete.push(obs.sourceId);
      if (obs.kind === ObservationKind.FOUND) {
        material.push(obs.sourceId);
        for (const envelope of obs.envelopes) {
          const key = hex(envelope);
          if (!candidateMap.has(key)) candidateMap.set(key, { envelope, sources: new Set() });
          candidateMap.get(key).sources.add(obs.sourceId);
        }
      }
    }
    const candidates = [...candidateMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => Object.freeze({
      envelope: B.bytes(value.envelope),
      sources: Object.freeze([...value.sources].sort()),
    }));
    const queriedSet = new Set(queried);
    return Object.freeze({
      name: report.name,
      candidates: Object.freeze(candidates),
      coverage: Object.freeze({
        basis: report.basis,
        queried: Object.freeze(queried.sort()),
        complete: Object.freeze(complete.sort()),
        material: Object.freeze(material.sort()),
        notQueried: Object.freeze(report.basis.filter((id) => !queriedSet.has(id))),
      }),
    });
  }

  function evidenceEnvelopes(evidenceValue) {
    invariant(evidenceValue && Array.isArray(evidenceValue.candidates), 'E_EVIDENCE', 'Evidence inválida.');
    return Object.freeze(evidenceValue.candidates.map((candidate) => B.bytes(candidate.envelope)));
  }

  function evidenceSupport(evidenceValue, envelopeValue) {
    const target = hex(envelopeValue);
    const hit = evidenceValue.candidates.find((candidate) => hex(candidate.envelope) === target);
    return hit ? hit.sources : Object.freeze([]);
  }

  function evidenceBook(evidenceValues = []) {
    invariant(Array.isArray(evidenceValues), 'E_EVIDENCE_BOOK', 'evidenceBook requiere array.');
    const map = new Map();
    for (const ev of evidenceValues) {
      invariant(ev && ev.name && Array.isArray(ev.candidates), 'E_EVIDENCE', 'Evidence inválida.');
      map.set(hex(ev.name), ev);
    }
    return Object.freeze({
      entries: Object.freeze([...map.entries()].sort(([a], [b]) => a.localeCompare(b))
        .map(([nameHex, evidence]) => Object.freeze({ nameHex, evidence }))),
    });
  }

  function evidenceAt(book, nameValue) {
    const key = hex(B.bytes(nameValue, 'name', K.grammar.nameBytes));
    const hit = book.entries.find((entry) => entry.nameHex === key);
    return hit ? hit.evidence : null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 6. MEMORY SOURCE — adapter de probeta, no autoridad
  // ────────────────────────────────────────────────────────────────────────────

  function memorySource(idValue) {
    const id = sourceId(idValue);
    const store = new Map();
    return Object.freeze({
      id,
      put(nameValue, envelopeValue, accumulate = true) {
        const key = hex(B.bytes(nameValue, 'name', K.grammar.nameBytes));
        const previous = store.get(key) || [];
        const envelope = B.bytes(envelopeValue, 'envelope');
        store.set(key, accumulate ? [...previous, envelope] : [envelope]);
        return Object.freeze({ sourceId: id, stored: true });
      },
      get(nameValue) {
        const key = hex(B.bytes(nameValue, 'name', K.grammar.nameBytes));
        return Object.freeze((store.get(key) || []).map((e) => B.bytes(e)));
      },
      size(nameValue) {
        const key = hex(B.bytes(nameValue, 'name', K.grammar.nameBytes));
        return (store.get(key) || []).length;
      },
    });
  }

  async function collect(sources, nameValue) {
    invariant(Array.isArray(sources) && sources.length > 0, 'E_SOURCES', 'collect requiere sources[].');
    const observations = [];
    for (const source of sources) {
      invariant(source && typeof source.get === 'function' && typeof source.id === 'string', 'E_SOURCE', 'Source inválida.');
      try {
        const envelopes = source.get(nameValue);
        observations.push(envelopes.length > 0 ? found(source.id, envelopes) : absent(source.id));
      } catch (error) {
        observations.push(noClaim(source.id, error && error.code ? error.code : 'FAILED'));
      }
    }
    return evidenceReport(nameValue, sources.map((s) => s.id), observations);
  }

  function queryFromSources(sources) {
    return async (nameValue) => evidenceEnvelopes(normalizeEvidence(await collect(sources, nameValue)));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 7. DESCRIPTOR TABLE
  // CoordinateTable + Continuities. El Kernel sólo exige resolver(slot)->Operator.
  // ────────────────────────────────────────────────────────────────────────────

  const ATOM_DESCRIPTOR_TABLE = B.ascii('kobalt:descriptor-table:mechanism:1');
  const ATOM_DESCRIPTOR = B.ascii('kobalt:descriptor:mechanism:1');

  async function descriptorTableIdentity(view) {
    return Derivation.identity(view, [ATOM_DESCRIPTOR_TABLE]);
  }

  async function descriptorIdentity(view, name) {
    return Derivation.identity(view, [ATOM_DESCRIPTOR, B.utf8(String(name))]);
  }

  async function coreDescriptorIdentities(view) {
    return Object.freeze({
      emit: await descriptorIdentity(view, 'emit'),
      expand: await descriptorIdentity(view, 'expand'),
      follow: await descriptorIdentity(view, 'follow'),
    });
  }

  async function descriptorGenesis(view) {
    const ids = await coreDescriptorIdentities(view);
    const tableIdentity = await descriptorTableIdentity(view);
    const objects = [];

    for (const I of [ids.emit, ids.expand, ids.follow]) {
      const state = Index.from([Cell.follow(I)]);
      const plan = await planUpdate({ view, identity: I, state, descriptorSlot: K.GenesisSlot.EXPAND });
      objects.push(...plan.objects);
    }

    const tableState = coordinateTableState([ids.emit, ids.expand, ids.follow]);
    const tablePlan = await planUpdate({ view, identity: tableIdentity, state: tableState, descriptorSlot: K.GenesisSlot.EXPAND });
    objects.push(...tablePlan.objects);

    return Object.freeze({ tableIdentity, core: ids, tableState, objects: Object.freeze(objects) });
  }

  function coreOperatorFromReference(reference, core) {
    if (B.equal(reference, core.emit)) return K.Operator.EMIT;
    if (B.equal(reference, core.expand)) return K.Operator.EXPAND;
    if (B.equal(reference, core.follow)) return K.Operator.FOLLOW;
    throw new K.KobaltError('E_DESCRIPTOR_OPERATOR_REF', 'Descriptor no referencia un operador Genesis.');
  }

  async function descriptorOperatorFromHistory(options) {
    const { view, identity, core, query } = options;
    const followResult = await openTrajectory({ view, identity, query });
    const state = continuityState(followResult);
    invariant(state.kind === MechanismResult.CURRENT, 'E_DESCRIPTOR_HISTORY', 'Descriptor sin historia Current.', { kind: state.kind });
    let chosen = null;
    for (let i = 0; i < state.length; i += 1) {
      const opened = await openAt({ view, identity, index: i, query });
      invariant(opened.kind === MechanismResult.CURRENT && opened.operator === K.Operator.EXPAND,
        'E_DESCRIPTOR_STATE', 'Estado de Descriptor debe ser EXPAND.');
      const idx = Index.assert(opened.content, Grammar.genesisResolver, 'descriptorState');
      invariant(Index.length(idx) >= 1, 'E_DESCRIPTOR_STATE', 'Descriptor debe declarar operador en slot 0.');
      const opCell = Index.at(idx, 0);
      invariant(Cell.operatorOf(opCell) === K.Operator.FOLLOW, 'E_DESCRIPTOR_STATE', 'Descriptor[0] debe FOLLOW operador core.');
      const op = coreOperatorFromReference(opCell.referent, core);
      if (chosen === null) chosen = op;
      else invariant(chosen === op, 'E_DESCRIPTOR_OPERATOR_MUTATION', 'Descriptor no puede cambiar de operador.', { before: chosen, after: op });
    }
    return chosen;
  }

  async function compileDescriptorTable(options) {
    const { view, tableIdentity, query } = options || {};
    const core = await coreDescriptorIdentities(view);
    const openedTable = await openCurrent({ view, identity: tableIdentity, query });
    invariant(openedTable.kind === MechanismResult.CURRENT && openedTable.operator === K.Operator.EXPAND,
      'E_DESCRIPTOR_TABLE', 'DescriptorTable debe estar Current como EXPAND.');
    const tableState = openedTable.content;
    const ids = coordinateTableIdentities(tableState);
    invariant(ids.length >= 3, 'E_DESCRIPTOR_TABLE', 'DescriptorTable requiere slots Genesis 0..2.');
    invariant(B.equal(ids[0], core.emit) && B.equal(ids[1], core.expand) && B.equal(ids[2], core.follow),
      'E_DESCRIPTOR_GENESIS', 'Slots 0..2 no corresponden al Génesis.');

    const operators = new Map();
    for (let slot = 0; slot < ids.length; slot += 1) {
      operators.set(slot, await descriptorOperatorFromHistory({ view, identity: ids[slot], core, query }));
    }

    return Object.freeze({
      size: ids.length,
      tableIdentity: B.bytes(tableIdentity),
      operator(slot) {
        invariant(operators.has(slot), 'E_DESCRIPTOR_UNKNOWN', 'DescriptorSlot no constituido.', { slot });
        return operators.get(slot);
      },
      identity(slot) {
        invariant(Number.isSafeInteger(slot) && slot >= 0 && slot < ids.length, 'E_DESCRIPTOR_UNKNOWN', 'DescriptorSlot no constituido.', { slot });
        return B.bytes(ids[slot]);
      },
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 8. CLOSURE / APPEARANCE
  // Closure es semántica; vertices/edges/frontier son traza/proyección.
  // ────────────────────────────────────────────────────────────────────────────

  async function openCellFromQuery(options) {
    const { view, cell, query, resolver = Grammar.genesisResolver } = options || {};
    return queryCell(view, cell, query, resolver);
  }

  async function closure(options) {
    const {
      view,
      root: rootCell,
      query,
      resolver = Grammar.genesisResolver,
      maxCells = 4096,
      maxDepth = 256,
    } = options || {};

    const root = Cell.assert(rootCell);
    const queue = [{ cell: root, depth: 0 }];
    const visited = new Map();
    const edges = [];
    const frontier = [];

    while (queue.length > 0) {
      if (visited.size >= maxCells) {
        frontier.push(Object.freeze({ kind: 'BUDGET', reason: 'maxCells' }));
        break;
      }
      const item = queue.shift();
      const key = Cell.key(item.cell);
      if (visited.has(key)) continue;
      if (item.depth > maxDepth) {
        frontier.push(Object.freeze({ kind: 'BUDGET', reason: 'maxDepth', cell: item.cell }));
        continue;
      }

      const result = await openCellFromQuery({ view, cell: item.cell, query, resolver });
      visited.set(key, Object.freeze({ cell: item.cell, depth: item.depth, result }));
      const op = Cell.operatorOf(item.cell, resolver);

      if (op === K.Operator.FOLLOW) {
        if (result.kind === K.ResolveKind.CHAIN) {
          edges.push(Object.freeze({ from: item.cell, to: result.currentCell, relation: 'CURRENT' }));
          queue.push({ cell: result.currentCell, depth: item.depth + 1 });
        } else if (result.kind === K.ResolveKind.FORK) {
          frontier.push(Object.freeze({ kind: 'FORK', cell: item.cell, result }));
        } else if (result.kind === K.ResolveKind.NO_EVIDENCE || result.kind === K.ResolveKind.UNRECOGNIZED) {
          frontier.push(Object.freeze({ kind: result.kind, cell: item.cell, result }));
        }
        continue;
      }

      if (result.kind !== K.ResolveKind.EXACT) {
        frontier.push(Object.freeze({ kind: result.kind, cell: item.cell, result }));
        continue;
      }

      if (op === K.Operator.EXPAND) {
        const idx = Index.assert(result.content, resolver, 'closure.index');
        for (let i = 0; i < Index.length(idx, resolver); i += 1) {
          const child = Index.at(idx, i, resolver);
          edges.push(Object.freeze({ from: item.cell, to: child, relation: 'EXPAND', slot: i }));
          queue.push({ cell: child, depth: item.depth + 1 });
        }
      }
    }

    return Object.freeze({
      complete: frontier.length === 0,
      root,
      vertices: Object.freeze([...visited.values()]),
      edges: Object.freeze(edges),
      frontier: Object.freeze(frontier),
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 9. PRINCIPAL / DOMAIN CONTINUITY / AUTHORITY CONTINUITY
  // Construcciones superiores; ninguna se convierte en primitive del Kernel.
  // ────────────────────────────────────────────────────────────────────────────

  const ATOM_PRINCIPAL = B.ascii('kobalt:principal:1');
  const ATOM_DOMAIN = B.ascii('kobalt:principal-domain:1');
  const ATOM_AUTHORITY = B.ascii('kobalt:principal-authority:1');

  async function principalOrigin(commonView, policyAtom, originAtoms) {
    invariant(Array.isArray(originAtoms), 'E_ORIGIN_ATOMS', 'originAtoms debe ser array.');
    return Derivation.identity(commonView, [ATOM_PRINCIPAL, B.bytes(policyAtom, 'policyAtom'), ...originAtoms.map((a) => B.bytes(a))]);
  }

  async function domainIdentity(commonView, principalH) {
    return Derivation.identity(commonView, [ATOM_DOMAIN, B.bytes(principalH, 'H', K.grammar.idBytes)]);
  }

  async function authorityIdentity(commonView, principalH) {
    return Derivation.identity(commonView, [ATOM_AUTHORITY, B.bytes(principalH, 'H', K.grammar.idBytes)]);
  }

  async function effectiveView(constitutionValue, capabilities, constituter) {
    invariant(typeof constituter === 'function', 'E_CONSTITUTER', 'Se requiere constituter(g,capabilities).');
    const d = await constituter(B.bytes(constitutionValue, 'constitution'), capabilities);
    return View.keyed(B.bytes(d, 'effective d', K.grammar.idBytes));
  }

  async function audience(constitutionValue, nodes, constituter) {
    invariant(Array.isArray(nodes), 'E_NODES', 'nodes debe ser array.');
    const accepted = [];
    for (const node of nodes) {
      try {
        await effectiveView(constitutionValue, node.capabilities, constituter);
        accepted.push(node);
      } catch (_) { /* fuera de audiencia */ }
    }
    return Object.freeze(accepted);
  }

  async function admitAuthority(options) {
    const { authorityState, proposals, verify } = options || {};
    invariant(Array.isArray(proposals), 'E_PROPOSALS', 'proposals debe ser array.');
    invariant(typeof verify === 'function', 'E_AUTHORITY_VERIFY', 'Se requiere verify(authorityState,proposal).');
    const admitted = [];
    const rejected = [];
    for (const proposal of proposals) {
      if (await verify(B.bytes(authorityState, 'authorityState'), proposal)) admitted.push(proposal);
      else rejected.push(proposal);
    }
    return Object.freeze({ admitted: Object.freeze(admitted), rejected: Object.freeze(rejected) });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 10. KAT de mecanismos: propiedades emergentes, no features aisladas
  // ────────────────────────────────────────────────────────────────────────────

  function testBytes(length, offset = 0) {
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) out[i] = (i + offset) & 0xff;
    return out;
  }

  async function selfTest() {
    const tests = [];
    const record = async (name, fn) => {
      try { tests.push({ name, pass: (await fn()) === true }); }
      catch (error) { tests.push({ name, pass: false, code: error.code, error: error.message }); }
    };

    const common = View.keyed(testBytes(32, 0x30));
    const private0 = View.keyed(testBytes(32, 0x60));
    const source = memorySource('local');
    const query = queryFromSources([source]);

    await record('Continuity: identidad estable, Current cambia por trayectoria', async () => {
      const I = await Derivation.identity(private0, [B.ascii('continuity-test')]);
      const p0 = await planUpdate({ view: private0, identity: I, state: B.ascii('v0') });
      await publish(p0, (n, e) => source.put(n, e));
      const c0 = await openCurrent({ view: private0, identity: I, query });
      const p1 = await planUpdate({ view: private0, identity: I, currentTrajectory: p0.nextTrajectory, state: B.ascii('v1') });
      await publish(p1, (n, e) => source.put(n, e));
      const c1 = await openCurrent({ view: private0, identity: I, query });
      return c0.kind === MechanismResult.CURRENT && c1.kind === MechanismResult.CURRENT &&
        B.equal(c0.identity, c1.identity) && !B.equal(c0.content, c1.content) && c1.length === 2;
    });

    await record('Publication: realización precede FOLLOW', async () => {
      const I = await Derivation.identity(private0, [B.ascii('publication')]);
      const plan = await planUpdate({ view: private0, identity: I, state: B.ascii('state') });
      return plan.objects[0].role === 'realization' && plan.objects[1].role === 'follow';
    });

    await record('CoordinateTable: slot es posición estable', async () => {
      const A = await Derivation.identity(common, [B.ascii('A')]);
      const C = await Derivation.identity(common, [B.ascii('C')]);
      const D = await Derivation.identity(common, [B.ascii('D')]);
      const t0 = coordinateTableState([A, C]);
      const t1 = tableAppend(t0, D);
      return tableIsExtension(t0, t1) && tableSlotOf(t1, A) === 0 && tableSlotOf(t1, C) === 1 && tableSlotOf(t1, D) === 2;
    });

    await record('CoordinateTable: coordenada es (I_T,slot), no slot global', async () => {
      const I0 = await Derivation.identity(common, [B.ascii('T0')]);
      const I1 = await Derivation.identity(common, [B.ascii('T1')]);
      const c0 = coordinate(I0, 0);
      const c1 = coordinate(I1, 0);
      return !B.equal(encodeCoordinate(c0), encodeCoordinate(c1));
    });

    await record('Coproduct: valores locales iguales no colisionan entre contextos', async () => {
      const C0 = await Derivation.identity(common, [B.ascii('context-0')]);
      const C1 = await Derivation.identity(common, [B.ascii('context-1')]);
      const local = B.uint32be(1);
      return injectionKey(inject(C0, local)) !== injectionKey(inject(C1, local));
    });

    await record('Evidence: mismos bytes en dos Sources conservan procedencia', async () => {
      const Q = await Derivation.contentId(private0, B.ascii('evidence'));
      const obj = await Envelope.seal(private0, Cell.emit(Q), B.ascii('evidence'));
      const r = evidenceReport(obj.name, ['s0', 's1'], [found('s0', [obj.envelope]), found('s1', [obj.envelope])]);
      const e = normalizeEvidence(r);
      return e.candidates.length === 1 && evidenceSupport(e, obj.envelope).length === 2;
    });

    await record('DescriptorTable: gramática extendida emerge sin descriptor TABLE', async () => {
      const s = memorySource('descriptor-store');
      const q = queryFromSources([s]);
      const genesis = await descriptorGenesis(common);
      for (const object of genesis.objects) s.put(object.name, object.envelope);

      const cssI = await descriptorIdentity(common, 'css');
      const core = await coreDescriptorIdentities(common);
      const cssState = Index.from([Cell.follow(core.emit)]);
      const cssPlan = await planUpdate({ view: common, identity: cssI, state: cssState, descriptorSlot: K.GenesisSlot.EXPAND });
      await publish(cssPlan, (n, e) => s.put(n, e));

      const tableCurrent = await openCurrent({ view: common, identity: genesis.tableIdentity, query: q });
      const nextTable = tableAppend(tableCurrent.content, cssI);
      const tablePlan = await planUpdate({
        view: common,
        identity: genesis.tableIdentity,
        currentTrajectory: tableCurrent.trajectory,
        state: nextTable,
        descriptorSlot: K.GenesisSlot.EXPAND,
      });
      await publish(tablePlan, (n, e) => s.put(n, e));

      const resolver = await compileDescriptorTable({ view: common, tableIdentity: genesis.tableIdentity, query: q });
      return resolver.size === 4 && resolver.operator(3) === K.Operator.EMIT && B.equal(resolver.identity(3), cssI);
    });

    await record('D como Continuity: rotación cambia d sin cambiar J_D', async () => {
      const H = await principalOrigin(common, B.ascii('origin-policy-v1'), [B.ascii('ricardo')]);
      const JD = await domainIdentity(common, H);
      const d0 = testBytes(32, 0x80);
      const d1 = testBytes(32, 0xa0);
      const g0 = F.frame([d0]);
      const g1 = F.frame([d1]);
      const ds = memorySource('domain-store');
      const dq = queryFromSources([ds]);
      const p0 = await planUpdate({ view: common, identity: JD, state: g0 });
      await publish(p0, (n, e) => ds.put(n, e));
      const current0 = await openCurrent({ view: common, identity: JD, query: dq });
      const v0 = await effectiveView(current0.content, {}, (g) => F.unframe(g)[0]);
      const p1 = await planUpdate({ view: common, identity: JD, currentTrajectory: p0.nextTrajectory, state: g1 });
      await publish(p1, (n, e) => ds.put(n, e));
      const current1 = await openCurrent({ view: common, identity: JD, query: dq });
      const v1 = await effectiveView(current1.content, {}, (g) => F.unframe(g)[0]);
      return B.equal(current0.identity, current1.identity) && !B.equal(v0.key, v1.key) && B.equal(current1.identity, JD);
    });

    await record('Authority como Continuity: revocación emerge de cambiar Current(A)', async () => {
      const H = await principalOrigin(common, B.ascii('origin-policy-v1'), [B.ascii('principal')]);
      const JA = await authorityIdentity(common, H);
      const as = memorySource('authority-store');
      const aq = queryFromSources([as]);
      const a0 = B.ascii('writer-A');
      const a1 = B.ascii('writer-B');
      const p0 = await planUpdate({ view: common, identity: JA, state: a0 });
      await publish(p0, (n, e) => as.put(n, e));
      const c0 = await openCurrent({ view: common, identity: JA, query: aq });
      const before = await admitAuthority({
        authorityState: c0.content,
        proposals: [{ proof: 'writer-A' }, { proof: 'writer-B' }],
        verify: (state, proposal) => new TextDecoder().decode(state) === proposal.proof,
      });
      const p1 = await planUpdate({ view: common, identity: JA, currentTrajectory: p0.nextTrajectory, state: a1 });
      await publish(p1, (n, e) => as.put(n, e));
      const c1 = await openCurrent({ view: common, identity: JA, query: aq });
      const after = await admitAuthority({
        authorityState: c1.content,
        proposals: [{ proof: 'writer-A' }, { proof: 'writer-B' }],
        verify: (state, proposal) => new TextDecoder().decode(state) === proposal.proof,
      });
      return before.admitted[0].proof === 'writer-A' && after.admitted[0].proof === 'writer-B' && B.equal(c0.identity, c1.identity);
    });

    await record('Closure: FOLLOW→EXPAND→EMIT deriva estructura sin GraphDB', async () => {
      const s = memorySource('closure-store');
      const q = queryFromSources([s]);
      const leafB = B.ascii('leaf');
      const leafQ = await Derivation.contentId(private0, leafB);
      const leaf = Cell.emit(leafQ);
      const leafObj = await Envelope.seal(private0, leaf, leafB);
      s.put(leafObj.name, leafObj.envelope);

      const rootI = await Derivation.identity(private0, [B.ascii('root')]);
      const idx = Index.from([leaf]);
      const p = await planUpdate({ view: private0, identity: rootI, state: idx, descriptorSlot: K.GenesisSlot.EXPAND });
      await publish(p, (n, e) => s.put(n, e));
      const C = await closure({ view: private0, root: Cell.follow(rootI), query: q });
      return C.complete && C.vertices.length === 3 && C.edges.length === 2;
    });

    await record('Colaboración: multi-actor global sin trayectoria multi-writer', async () => {
      const IA = await Derivation.identity(private0, [B.ascii('alice')]);
      const IB = await Derivation.identity(private0, [B.ascii('bob')]);
      const QA = await Derivation.contentId(private0, B.ascii('A'));
      const QB = await Derivation.contentId(private0, B.ascii('B'));
      const ta = Trajectory.from([Cell.emit(QA)]);
      const tb = Trajectory.from([Cell.emit(QB)]);
      const composition = Index.from([Cell.follow(IA), Cell.follow(IB)]);
      return Trajectory.length(ta) === 1 && Trajectory.length(tb) === 1 && Index.length(composition) === 2;
    });

    return Object.freeze({
      pass: tests.every((t) => t.pass),
      count: tests.length,
      passed: tests.filter((t) => t.pass).length,
      tests: Object.freeze(tests),
    });
  }

  const api = Object.freeze({
    release: '1.0.0',
    MechanismResult,

    Continuity: Object.freeze({
      openTrajectory,
      openExact,
      state: continuityState,
      openAt,
      openCurrent,
      planUpdate,
    }),

    Publication: Object.freeze({ publish }),

    CoordinateTable: Object.freeze({
      state: coordinateTableState,
      identities: coordinateTableIdentities,
      slotOf: tableSlotOf,
      at: tableAt,
      append: tableAppend,
      isExtension: tableIsExtension,
      assertExtension: assertTableExtension,
      coordinate,
      encodeCoordinate,
    }),

    Coproduct: Object.freeze({ inject, encode: encodeInjection, key: injectionKey }),

    Evidence: Object.freeze({
      ObservationKind,
      Completeness,
      found,
      absent,
      noClaim,
      report: evidenceReport,
      normalize: normalizeEvidence,
      envelopes: evidenceEnvelopes,
      support: evidenceSupport,
      book: evidenceBook,
      at: evidenceAt,
    }),

    MemorySource: Object.freeze({ create: memorySource, collect, query: queryFromSources }),

    DescriptorTable: Object.freeze({
      identity: descriptorTableIdentity,
      descriptorIdentity,
      coreIdentities: coreDescriptorIdentities,
      genesis: descriptorGenesis,
      compile: compileDescriptorTable,
    }),

    Closure: Object.freeze({ walk: closure }),

    Principal: Object.freeze({ origin: principalOrigin }),

    Domain: Object.freeze({
      identity: domainIdentity,
      effectiveView,
      audience,
    }),

    Authority: Object.freeze({
      identity: authorityIdentity,
      admit: admitAuthority,
    }),

    Tests: Object.freeze({ selfTest }),
  });

  root.KobaltMechanisms = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
