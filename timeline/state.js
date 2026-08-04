(() => {
  'use strict';

  const model = globalThis.WorldlineTimelineModel;
  if (!model) throw new Error('Worldline timeline model must load before timeline state.');

  const { BUILD, SLIDER_MAX, EARTH_STOPS, HUMAN_STOPS } = model;
  const STORAGE_KEY = 'worldline.timeline.v18';
  const listeners = new Set();
  const diagnostics = [];
  let revision = 0;
  let transactionCounter = 0;
  let commitCounter = 0;
  let previewFrame = 0;
  let queuedPreview = null;

  function defaultState() {
    return {
      build: BUILD,
      domain: 'earth',
      earthAgeMa: 250,
      humanYear: -10000,
      previewDomain: 'earth',
      previewValue: 250,
      previewPosition: model.ageMaToPosition(250),
      committedPosition: model.ageMaToPosition(250),
      interaction: 'idle',
      activeTransactionId: null,
      revision: 0,
      commitCounter: 0,
      settledRevision: 0,
      lastSource: 'initial'
    };
  }

  function hydrate() {
    const base = defaultState();
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || !['earth', 'human'].includes(stored.domain)) return Object.freeze(base);
      base.domain = stored.domain;
      base.earthAgeMa = model.clamp(stored.earthAgeMa ?? 250, 0, EARTH_STOPS[0]);
      base.humanYear = Math.round(model.clamp(stored.humanYear ?? -10000, HUMAN_STOPS[0], HUMAN_STOPS.at(-1)));
      const value = base.domain === 'earth' ? base.earthAgeMa : base.humanYear;
      const position = base.domain === 'earth' ? model.ageMaToPosition(value) : model.yearToPosition(value);
      Object.assign(base, { previewDomain: base.domain, previewValue: value, previewPosition: position, committedPosition: position, lastSource: 'hydrate-storage' });
    } catch (_) {}
    return Object.freeze(base);
  }

  let state = hydrate();

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

  function annotate(action, detail = {}) {
    const entry = Object.freeze({
      at: Math.round(performance.now()),
      action,
      revision: state.revision,
      domain: state.domain,
      interaction: state.interaction,
      transactionId: state.activeTransactionId,
      ...detail
    });
    diagnostics.push(entry);
    if (diagnostics.length > 240) diagnostics.shift();
    window.dispatchEvent(new CustomEvent('worldline:timeline-diagnostics', { detail: entry }));
  }

  function publish(next, eventName = 'worldline:timeline-state', extra = {}) {
    const previous = state;
    state = Object.freeze({ ...next, build: BUILD, revision: ++revision });
    persist(state);
    const detail = { previous, current: state, ...extra };
    listeners.forEach((listener) => {
      try { listener(state, previous, extra); } catch (error) { console.warn('Worldline timeline listener failed:', error); }
    });
    if (eventName !== 'worldline:timeline-state') window.dispatchEvent(new CustomEvent(eventName, { detail }));
    window.dispatchEvent(new CustomEvent('worldline:timeline-state', { detail }));
    return state;
  }

  function positionFor(domain, source = state) {
    return domain === 'earth' ? model.ageMaToPosition(source.earthAgeMa) : model.yearToPosition(source.humanYear);
  }

  function valueFor(domain, source = state) {
    return domain === 'earth' ? Number(source.earthAgeMa) : Number(source.humanYear);
  }

  function valueFromPosition(domain, position) {
    return domain === 'earth' ? model.positionToAgeMa(position) : model.positionToYear(position);
  }

  function setDomain(domain, options = {}) {
    if (!['earth', 'human'].includes(domain)) return state;
    const value = valueFor(domain);
    const position = positionFor(domain);
    return publish({
      ...state,
      domain,
      previewDomain: domain,
      previewValue: value,
      previewPosition: position,
      committedPosition: position,
      interaction: 'idle',
      activeTransactionId: null,
      lastSource: options.source || 'set-domain'
    }, 'worldline:timeline-domain', { domain, value, position, phase: 'commit' });
  }

  function commit(domain, value, source) {
    const nextValue = domain === 'earth'
      ? model.clamp(value, 0, EARTH_STOPS[0])
      : Math.round(model.clamp(value, HUMAN_STOPS[0], HUMAN_STOPS.at(-1)));
    const position = domain === 'earth' ? model.ageMaToPosition(nextValue) : model.yearToPosition(nextValue);
    commitCounter += 1;
    return publish({
      ...state,
      domain,
      earthAgeMa: domain === 'earth' ? nextValue : state.earthAgeMa,
      humanYear: domain === 'human' ? nextValue : state.humanYear,
      previewDomain: domain,
      previewValue: nextValue,
      previewPosition: position,
      committedPosition: position,
      interaction: 'idle',
      activeTransactionId: null,
      commitCounter,
      settledRevision: revision + 1,
      lastSource: source
    }, 'worldline:timeline-commit', { domain, value: nextValue, position, phase: 'commit', commitCounter });
  }

  function preview(domain, value, source = 'preview') {
    const nextValue = domain === 'earth'
      ? model.clamp(value, 0, EARTH_STOPS[0])
      : Math.round(model.clamp(value, HUMAN_STOPS[0], HUMAN_STOPS.at(-1)));
    const position = domain === 'earth' ? model.ageMaToPosition(nextValue) : model.yearToPosition(nextValue);
    return publish({
      ...state,
      previewDomain: domain,
      previewValue: nextValue,
      previewPosition: position,
      interaction: state.interaction === 'idle' ? 'previewing' : state.interaction,
      lastSource: source
    }, 'worldline:timeline-preview', { domain, value: nextValue, position, phase: 'preview' });
  }

  function setEarthAge(value, options = {}) {
    if (options.preview) return preview('earth', value, options.source || 'set-earth-preview');
    if (options.keepDomain && state.domain !== 'earth') {
      return publish({ ...state, earthAgeMa: model.clamp(value, 0, EARTH_STOPS[0]), lastSource: options.source || 'set-earth' },
        'worldline:timeline-commit', { domain: 'earth', value: Number(value), phase: 'commit' });
    }
    return commit('earth', value, options.source || 'set-earth');
  }

  function setHumanYear(value, options = {}) {
    if (options.preview) return preview('human', value, options.source || 'set-human-preview');
    if (options.keepDomain && state.domain !== 'human') {
      return publish({ ...state, humanYear: Math.round(model.clamp(value, HUMAN_STOPS[0], HUMAN_STOPS.at(-1))), lastSource: options.source || 'set-human' },
        'worldline:timeline-commit', { domain: 'human', value: Number(value), phase: 'commit' });
    }
    return commit('human', value, options.source || 'set-human');
  }

  const api = Object.freeze({
    BUILD, SLIDER_MAX, EARTH_STOPS, HUMAN_STOPS,
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    beginGesture(source = 'pointer') {
      const transactionId = ++transactionCounter;
      return publish({ ...state, interaction: 'dragging', activeTransactionId: transactionId, lastSource: source },
        'worldline:timeline-gesture', { phase: 'begin', transactionId });
    },
    queuePreview(position, source = 'input') {
      queuedPreview = { position, source };
      if (previewFrame) return;
      previewFrame = requestAnimationFrame(() => {
        previewFrame = 0;
        const queued = queuedPreview;
        queuedPreview = null;
        if (queued) api.previewFromPosition(queued.position, { source: queued.source });
      });
    },
    previewFromPosition(position, options = {}) {
      const domain = state.previewDomain || state.domain;
      return preview(domain, valueFromPosition(domain, position), options.source || 'position-preview');
    },
    previewValue: preview,
    commitGesture(options = {}) {
      return commit(state.previewDomain || state.domain, state.previewValue, options.source || 'gesture-commit');
    },
    cancelGesture(source = 'cancel') {
      const domain = state.domain;
      const value = valueFor(domain);
      const position = positionFor(domain);
      return publish({ ...state, previewDomain: domain, previewValue: value, previewPosition: position, committedPosition: position, interaction: 'idle', activeTransactionId: null, lastSource: source },
        'worldline:timeline-gesture', { phase: 'cancel' });
    },
    setDomain, setEarthAge, setHumanYear,
    applySearchTarget(target = {}, options = {}) {
      if (target.domain === 'earth' || Number.isFinite(Number(target.ageMa))) {
        return Number.isFinite(Number(target.ageMa)) ? setEarthAge(Number(target.ageMa), { source: options.source || 'search-result' }) : setDomain('earth', options);
      }
      if (target.domain === 'human' || Number.isFinite(Number(target.year))) {
        return Number.isFinite(Number(target.year)) ? setHumanYear(Number(target.year), { source: options.source || 'search-result' }) : setDomain('human', options);
      }
      return state;
    },
    ageMaToPosition: model.ageMaToPosition,
    positionToAgeMa: model.positionToAgeMa,
    yearToPosition: model.yearToPosition,
    positionToYear: model.positionToYear,
    positionFor: (domain) => positionFor(domain),
    formatEarthAge: (value) => model.formatTime(value, { domain: 'earth', style: 'full' }),
    formatHumanYear: (value) => model.formatTime(value, { domain: 'human', style: 'full' }),
    formatTime: model.formatTime,
    diagnostics: () => diagnostics.slice()
  });

  globalThis.WorldlineTimelineState = api;
  globalThis.WorldlineDiagnostics = Object.freeze({ timeline: () => diagnostics.slice(), annotate });
  annotate('timeline-state-ready', { build: BUILD });
  window.dispatchEvent(new CustomEvent('worldline:timeline-ready', { detail: { current: state } }));
})();
