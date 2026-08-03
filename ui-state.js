(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r9';
  const SURFACES = ['timeline', 'search', 'settings', 'place'];
  const adapters = new Map();
  const listeners = new Set();
  let state = Object.freeze({ active: 'none', payload: null, reason: 'initial', revision: 0 });
  let transitionDepth = 0;
  let reconcileQueued = false;
  let preferredSurface = null;

  const detectors = {
    timeline: () => document.querySelector('#timelineHud')?.dataset.open === 'true',
    search: () => document.querySelector('#searchSuggestions')?.dataset.open === 'true',
    settings: () => document.querySelector('#searchShell')?.classList.contains('is-open') === true,
    place: () => {
      const detent = document.querySelector('#placeSheet')?.dataset.detent;
      return Boolean(detent && detent !== 'closed');
    }
  };

  function isKnownSurface(name) {
    return SURFACES.includes(name);
  }

  function surfaceIsOpen(name) {
    const adapter = adapters.get(name);
    try {
      if (adapter?.isOpen) return Boolean(adapter.isOpen());
      return Boolean(detectors[name]?.());
    } catch (error) {
      console.warn(`Worldline could not inspect the ${name} surface:`, error);
      return false;
    }
  }

  function snapshot() {
    return { ...state };
  }

  function announce(nextActive, payload, reason) {
    const previous = state;
    state = Object.freeze({
      active: nextActive,
      payload: payload ?? null,
      reason: reason || 'transition',
      revision: previous.revision + 1
    });
    document.body?.setAttribute('data-ui-surface', nextActive);
    const detail = { previous: { ...previous }, current: snapshot() };
    window.dispatchEvent(new CustomEvent('worldline:ui-state', { detail }));
    listeners.forEach((listener) => {
      try { listener(detail.current, detail.previous); } catch (error) { console.warn('Worldline UI listener failed:', error); }
    });
  }

  function closeSurface(name, meta = {}) {
    const adapter = adapters.get(name);
    if (!adapter || !surfaceIsOpen(name)) return;
    try {
      adapter.close?.(meta);
    } catch (error) {
      console.warn(`Worldline could not close the ${name} surface:`, error);
    }
  }

  function closeOtherSurfaces(keep, meta = {}) {
    SURFACES.forEach((name) => {
      if (name !== keep) closeSurface(name, { ...meta, replacedBy: keep });
    });
  }

  function activate(name, payload = null, meta = {}) {
    if (!isKnownSurface(name)) throw new Error(`Unknown Worldline UI surface: ${name}`);
    const adapter = adapters.get(name);
    if (!adapter) {
      preferredSurface = name;
      scheduleReconcile(name);
      return false;
    }

    transitionDepth += 1;
    try {
      closeOtherSurfaces(name, { reason: meta.reason || 'replace' });
      if (!surfaceIsOpen(name) || meta.force) adapter.open?.(payload, meta);
      announce(name, payload, meta.reason || 'activate');
    } finally {
      transitionDepth -= 1;
    }
    return true;
  }

  function dismiss(meta = {}) {
    transitionDepth += 1;
    try {
      SURFACES.forEach((name) => closeSurface(name, { reason: meta.reason || 'dismiss' }));
      announce('none', null, meta.reason || 'dismiss');
    } finally {
      transitionDepth -= 1;
    }
  }

  function close(name, meta = {}) {
    if (!isKnownSurface(name)) return;
    transitionDepth += 1;
    try {
      closeSurface(name, meta);
      if (state.active === name) announce('none', null, meta.reason || 'close');
      else reconcileFromDom(null, meta.reason || 'close');
    } finally {
      transitionDepth -= 1;
    }
  }

  function toggle(name, payload = null, meta = {}) {
    if (state.active === name && surfaceIsOpen(name)) close(name, { ...meta, reason: meta.reason || 'toggle-close' });
    else activate(name, payload, { ...meta, reason: meta.reason || 'toggle-open' });
  }

  function reconcileFromDom(preferred = null, reason = 'dom-reconcile') {
    if (transitionDepth > 0) return;
    const open = SURFACES.filter(surfaceIsOpen);
    if (!open.length) {
      if (state.active !== 'none') announce('none', null, reason);
      return;
    }

    let chosen = preferred && open.includes(preferred) ? preferred : null;
    if (!chosen && open.includes(state.active)) chosen = state.active;
    if (!chosen) chosen = open.at(-1);

    if (open.length > 1) {
      transitionDepth += 1;
      try { closeOtherSurfaces(chosen, { reason: 'heal-overlap' }); } finally { transitionDepth -= 1; }
    }
    if (state.active !== chosen) announce(chosen, null, reason);
  }

  function scheduleReconcile(preferred = null) {
    if (preferred) preferredSurface = preferred;
    if (reconcileQueued) return;
    reconcileQueued = true;
    queueMicrotask(() => {
      reconcileQueued = false;
      const preferredNow = preferredSurface;
      preferredSurface = null;
      reconcileFromDom(preferredNow);
    });
  }

  function preferredFromMutation(target) {
    if (!(target instanceof Element)) return null;
    if (target.id === 'timelineHud' || target.closest?.('#timelineHud')) return 'timeline';
    if (target.id === 'searchSuggestions' || target.closest?.('#searchSuggestions')) return 'search';
    if (target.id === 'searchShell' || target.closest?.('#searchShell')) return 'settings';
    if (target.id === 'placeSheet' || target.closest?.('#placeSheet')) return 'place';
    return null;
  }

  function observeDom() {
    if (!document.body) return;
    const observer = new MutationObserver((mutations) => {
      if (transitionDepth > 0) return;
      let preferred = null;
      for (const mutation of mutations) {
        const candidate = preferredFromMutation(mutation.target);
        if (candidate && surfaceIsOpen(candidate)) preferred = candidate;
      }
      scheduleReconcile(preferred);
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-open', 'data-detent', 'aria-hidden']
    });
  }

  function register(name, adapter) {
    if (!isKnownSurface(name)) throw new Error(`Unknown Worldline UI surface: ${name}`);
    if (!adapter || typeof adapter !== 'object') throw new TypeError(`Adapter required for ${name}`);
    adapters.set(name, adapter);
    scheduleReconcile(surfaceIsOpen(name) ? name : null);
    return () => adapters.delete(name);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  globalThis.WorldlineUI = Object.freeze({
    BUILD,
    SURFACES: Object.freeze([...SURFACES]),
    register,
    activate,
    dismiss,
    close,
    toggle,
    isActive: (name) => state.active === name,
    isOpen: surfaceIsOpen,
    snapshot,
    subscribe,
    reconcile: () => scheduleReconcile()
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeDom, { once: true });
  else observeDom();
})();