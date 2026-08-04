(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r18';
  const SLIDER_MAX = 1000;
  const EARTH_STOPS = Object.freeze([4567.3, 4000, 2500, 1800, 1000, 541, 252, 66, 2.58, 0.3, 0.0117, 0]);
  const HUMAN_STOPS = Object.freeze([-300000, -200000, -100000, -50000, -12000, -3000, 0, 1000, 1500, 1800, 1950, 2026]);
  const STORAGE_KEY = 'worldline.timeline.v18';
  const SNAP_UNIT_DISTANCE = 38;
  const MAX_LOG = 240;

  const listeners = new Set();
  const diagnostics = [];
  let raf = 0;
  let queuedPreview = null;
  let transactionCounter = 0;
  let commitCounter = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function positionInStops(value, stops, descending = false) {
    const bounded = descending
      ? clamp(value, stops.at(-1), stops[0])
      : clamp(value, stops[0], stops.at(-1));
    const segment = SLIDER_MAX / (stops.length - 1);
    for (let index = 0; index < stops.length - 1; index += 1) {
      const start = stops[index];
      const end = stops[index + 1];
      const inside = descending
        ? bounded <= start && bounded >= end
        : bounded >= start && bounded <= end;
      if (!inside) continue;
      const ratio = descending
        ? (start - bounded) / (start - end || 1)
        : (bounded - start) / (end - start || 1);
      return Math.round((index + ratio) * segment);
    }
    return descending
      ? (bounded >= stops[0] ? 0 : SLIDER_MAX)
      : (bounded <= stops[0] ? 0 : SLIDER_MAX);
  }

  function valueFromStops(position, stops, descending = false) {
    const bounded = clamp(position, 0, SLIDER_MAX);
    const segment = SLIDER_MAX / (stops.length - 1);
    const scaled = bounded / segment;
    const index = Math.min(stops.length - 2, Math.max(0, Math.floor(scaled)));
    const ratio = scaled - index;
    const start = stops[index];
    const end = stops[index + 1];
    return descending
      ? start - ((start - end) * ratio)
      : start + ((end - start) * ratio);
  }

  function ageMaToPosition(ageMa) {
    return positionInStops(Number(ageMa), EARTH_STOPS, true);
  }

  function positionToAgeMa(position) {
    return valueFromStops(position, EARTH_STOPS, true);
  }

  function yearToPosition(year) {
    return positionInStops(Number(year), HUMAN_STOPS, false);
  }

  function positionToYear(position) {
    return Math.round(valueFromStops(position, HUMAN_STOPS, false));
  }

  function formatEarthAge(ageMa) {
    const value = Number(ageMa);
    if (!Number.isFinite(value)) return 'Earth history';
    if (value <= 0.0005) return 'Present day';
    if (value >= 1000) {
      const billions = value / 1000;
      return `${Number.isInteger(billions) ? billions : billions.toFixed(billions < 10 ? 2 : 1)} billion years ago`;
    }
    if (value >= 1) return `${Number.isInteger(value) ? value : value.toFixed(value < 10 ? 2 : 1)} million years ago`;
    const years = Math.max(1, Math.round(value * 1000000));
    if (years >= 1000) return `${Math.round(years / 1000).toLocaleString()} thousand years ago`;
    return `${years.toLocaleString()} years ago`;
  }

  function formatHumanYear(year) {
    const value = Math.round(Number(year));
    if (!Number.isFinite(value)) return 'Human history';
    if (value >= 2026) return 'Present day';
    if (value < -10000) return `${Math.abs(value).toLocaleString()} years ago`;
    if (value < 0) return `${Math.abs(value).toLocaleString()} BCE`;
    return `${value.toLocaleString()} CE`;
  }

  function defaultState() {
    return Object.freeze({
      build: BUILD,
      domain: 'earth',
      earthAgeMa: 250,
      humanYear: -10000,
      previewDomain: 'earth',
      previewPosition: ageMaToPosition(250),
      previewValue: 250,
      committedPosition: ageMaToPosition(250),
      interaction: 'idle',
      activeTransactionId: null,
      revision: 0,
      commitCounter,
      settledRevision: 0,
      lastSource: 'initial'
    });
  }

  let state = hydrate(defaultState());

  function isDomain(value) {
    return value === 'earth' || value === 'human';
  }

  function hydrate(base) {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || !isDomain(stored.domain)) return base;
      const next = { ...base, domain: stored.domain };
      if (Number.isFinite(Number(stored.earthAgeMa))) next.earthAgeMa = clamp(Number(stored.earthAgeMa), 0, EARTH_STOPS[0]);
      if (Number.isFinite(Number(stored.humanYear))) next.humanYear = clamp(Number(stored.humanYear), HUMAN_STOPS[0], HUMAN_STOPS.at(-1));
      const position = positionFor(next.domain, next);
      return Object.freeze({
        ...next,
        previewDomain: next.domain,
        previewPosition: position,
        previewValue: valueFor(next.domain, next),
        committedPosition: position,
        lastSource: 'hydrate-storage'
      });
    } catch (_) {
      return base;
    }
  }

  function persist(next) {
    if (next.interaction !== 'idle') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        domain: next.domain,
        earthAgeMa: next.earthAgeMa,
        humanYear: next.humanYear
      }));
    } catch (_) {}
  }

  function valueFor(domain, source = state) {
    return domain === 'earth' ? Number(source.earthAgeMa) : Number(source.humanYear);
  }

  function positionFor(domain, source = state) {
    return domain === 'earth' ? ageMaToPosition(source.earthAgeMa) : yearToPosition(source.humanYear);
  }

  function valueFromPosition(domain, position) {
    return domain === 'earth' ? positionToAgeMa(position) : positionToYear(position);
  }

  function annotate(action, detail = {}) {
    const entry = Object.freeze({
      at: Math.round(performance.now()),
      action,
      revision: state.revision,
      transactionId: state.activeTransactionId,
      domain: state.domain,
      interaction: state.interaction,
      ...detail
    });
    diagnostics.push(entry);
    if (diagnostics.length > MAX_LOG) diagnostics.shift();
    window.dispatchEvent(new CustomEvent('worldline:timeline-diagnostics', { detail: entry }));
  }

  function publish(next, eventName = 'worldline:timeline-state', extra = {}) {
    const previous = state;
    state = Object.freeze({ ...next, revision: previous.revision + 1 });
    persist(state);
    const detail = { previous, current: state, ...extra };
    listeners.forEach((listener) => {
      try { listener(state, previous, extra); } catch (error) { console.warn('Worldline timeline listener failed:', error); }
    });
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    window.dispatchEvent(new CustomEvent('worldline:timeline-state', { detail }));
    return state;
  }

  function update(mutator, source, eventName, extra = {}) {
    const next = mutator({ ...state, lastSource: source || 'timeline-r18' });
    return publish(next, eventName, extra);
  }

  function beginGesture(source = 'pointer') {
    const transactionId = ++transactionCounter;
    const position = positionFor(state.domain);
    return update((draft) => ({
      ...draft,
      interaction: 'dragging',
      activeTransactionId: transactionId,
      previewDomain: draft.domain,
      previewPosition: position,
      previewValue: valueFor(draft.domain, draft),
      committedPosition: position
    }), source, 'worldline:timeline-gesture', { phase: 'begin', transactionId });
  }

  function queuePreview(position, source = 'input') {
    queuedPreview = { position, source };
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const queued = queuedPreview;
      queuedPreview = null;
      if (!queued) return;
      previewFromPosition(queued.position, { source: queued.source });
    });
  }

  function previewFromPosition(position, options = {}) {
    const domain = state.previewDomain || state.domain;
    const bounded = clamp(position, 0, SLIDER_MAX);
    const value = valueFromPosition(domain, bounded);
    return update((draft) => ({
      ...draft,
      interaction: draft.interaction === 'idle' ? 'previewing' : draft.interaction,
      previewDomain: domain,
      previewPosition: bounded,
      previewValue: value
    }), options.source || 'preview', 'worldline:timeline-preview', {
      phase: 'preview',
      transactionId: state.activeTransactionId,
      domain,
      value,
      position: bounded
    });
  }

  function snapCandidate(position, domain = state.previewDomain || state.domain, velocity = 0) {
    const milestones = domain === 'earth'
      ? (globalThis.WorldlineEarthHistory?.earthMilestones || [])
      : (globalThis.WorldlineEarthHistory?.humanMilestones || []);
    if (!milestones.length) return null;
    const entries = milestones.map((milestone) => {
      const milestonePosition = domain === 'earth'
        ? ageMaToPosition(Number(milestone.ageMa))
        : yearToPosition(Number(milestone.year));
      return { milestone, position: milestonePosition, distance: Math.abs(milestonePosition - Number(position)) };
    }).sort((left, right) => left.distance - right.distance);
    const threshold = Math.max(20, SNAP_UNIT_DISTANCE - Math.min(16, Math.abs(Number(velocity)) * 4));
    return entries[0]?.distance <= threshold ? entries[0] : null;
  }

  function oneCommitPerTransaction(transactionId) {
    if (transactionId && state.lastCommittedTransactionId === transactionId) return false;
    return true;
  }

  function commitGesture(options = {}) {
    const transactionId = state.activeTransactionId;
    if (!oneCommitPerTransaction(transactionId)) {
      annotate('ignored-duplicate-commit', { transactionId });
      return state;
    }
    const domain = state.previewDomain || state.domain;
    const snapped = options.snap === false ? null : snapCandidate(state.previewPosition, domain, options.velocity || 0);
    const position = snapped?.position ?? state.previewPosition;
    const value = snapped
      ? (domain === 'earth' ? Number(snapped.milestone.ageMa) : Number(snapped.milestone.year))
      : valueFromPosition(domain, position);
    commitCounter += 1;
    return update((draft) => ({
      ...draft,
      domain,
      earthAgeMa: domain === 'earth' ? clamp(value, 0, EARTH_STOPS[0]) : draft.earthAgeMa,
      humanYear: domain === 'human' ? clamp(value, HUMAN_STOPS[0], HUMAN_STOPS.at(-1)) : draft.humanYear,
      previewDomain: domain,
      previewPosition: position,
      previewValue: value,
      committedPosition: position,
      interaction: 'idle',
      activeTransactionId: null,
      lastCommittedTransactionId: transactionId,
      commitCounter,
      settledRevision: draft.revision + 1
    }), options.source || 'commit', 'worldline:timeline-commit', {
      phase: 'commit',
      transactionId,
      domain,
      value,
      position,
      snapped: Boolean(snapped),
      milestone: snapped?.milestone || null,
      commitCounter
    });
  }

  function cancelGesture(source = 'cancel') {
    return update((draft) => {
      const position = positionFor(draft.domain, draft);
      return {
        ...draft,
        interaction: 'idle',
        activeTransactionId: null,
        previewDomain: draft.domain,
        previewPosition: position,
        previewValue: valueFor(draft.domain, draft),
        committedPosition: position
      };
    }, source, 'worldline:timeline-gesture', { phase: 'cancel' });
  }

  function setDomain(domain, options = {}) {
    if (!isDomain(domain)) return state;
    return update((draft) => {
      const position = positionFor(domain, draft);
      return {
        ...draft,
        domain,
        previewDomain: domain,
        previewPosition: position,
        previewValue: valueFor(domain, draft),
        committedPosition: position,
        interaction: options.preview ? 'previewing' : 'idle',
        activeTransactionId: options.preview ? draft.activeTransactionId : null
      };
    }, options.source || 'set-domain', 'worldline:timeline-domain', { domain });
  }

  function setEarthAge(ageMa, options = {}) {
    const value = clamp(ageMa, 0, EARTH_STOPS[0]);
    return update((draft) => {
      const domain = options.keepDomain ? draft.domain : 'earth';
      const position = ageMaToPosition(value);
      return {
        ...draft,
        domain,
        earthAgeMa: value,
        previewDomain: domain,
        previewPosition: domain === 'earth' ? position : positionFor(domain, draft),
        previewValue: domain === 'earth' ? value : valueFor(domain, draft),
        committedPosition: domain === 'earth' ? position : positionFor(domain, draft),
        interaction: options.preview ? 'previewing' : 'idle',
        activeTransactionId: options.preview ? draft.activeTransactionId : null
      };
    }, options.source || 'set-earth-age', options.preview ? 'worldline:timeline-preview' : 'worldline:timeline-commit', { domain: 'earth', value });
  }

  function setHumanYear(year, options = {}) {
    const value = Math.round(clamp(year, HUMAN_STOPS[0], HUMAN_STOPS.at(-1)));
    return update((draft) => {
      const domain = options.keepDomain ? draft.domain : 'human';
      const position = yearToPosition(value);
      return {
        ...draft,
        domain,
        humanYear: value,
        previewDomain: domain,
        previewPosition: domain === 'human' ? position : positionFor(domain, draft),
        previewValue: domain === 'human' ? value : valueFor(domain, draft),
        committedPosition: domain === 'human' ? position : positionFor(domain, draft),
        interaction: options.preview ? 'previewing' : 'idle',
        activeTransactionId: options.preview ? draft.activeTransactionId : null
      };
    }, options.source || 'set-human-year', options.preview ? 'worldline:timeline-preview' : 'worldline:timeline-commit', { domain: 'human', value });
  }

  function applySearchTarget(target = {}, options = {}) {
    if (target.domain === 'earth' || Number.isFinite(Number(target.ageMa))) {
      return Number.isFinite(Number(target.ageMa))
        ? setEarthAge(Number(target.ageMa), { source: options.source || 'search-result' })
        : setDomain('earth', { source: options.source || 'search-result' });
    }
    if (target.domain === 'human' || Number.isFinite(Number(target.year))) {
      return Number.isFinite(Number(target.year))
        ? setHumanYear(Number(target.year), { source: options.source || 'search-result' })
        : setDomain('human', { source: options.source || 'search-result' });
    }
    return state;
  }

  function getState() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function diagnosticsSnapshot() {
    return diagnostics.slice();
  }

  const api = Object.freeze({
    BUILD,
    SLIDER_MAX,
    EARTH_STOPS,
    HUMAN_STOPS,
    getState,
    subscribe,
    beginGesture,
    queuePreview,
    previewFromPosition,
    commitGesture,
    cancelGesture,
    setDomain,
    setEarthAge,
    setHumanYear,
    applySearchTarget,
    snapCandidate,
    ageMaToPosition,
    positionToAgeMa,
    yearToPosition,
    positionToYear,
    positionFor: (domain) => positionFor(domain),
    formatEarthAge,
    formatHumanYear,
    diagnostics: diagnosticsSnapshot
  });

  globalThis.WorldlineTimelineState = api;
  globalThis.WorldlineDiagnostics = Object.freeze({
    timeline: diagnosticsSnapshot,
    annotate
  });
  annotate('timeline-state-ready', { build: BUILD });
  window.dispatchEvent(new CustomEvent('worldline:timeline-ready', { detail: { current: state } }));
})();