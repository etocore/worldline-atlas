(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r18';
  const INSTALL_RETRY_MS = 60;
  let installed = false;
  let slider;
  let hudValue;
  let hudEra;
  let activePointerId = null;
  let lastPointerX = null;
  let lastPointerTime = 0;
  let lastVelocity = 0;
  let applyingToLegacy = false;

  function stateApi() {
    return globalThis.WorldlineTimelineState;
  }

  function earthApi() {
    return globalThis.WorldlineEarthHistory;
  }

  function stopLegacy(event) {
    event.stopImmediatePropagation();
  }

  function clampPercent(position) {
    const max = stateApi()?.SLIDER_MAX || 1000;
    return `${Math.max(0, Math.min(100, (Number(position) / max) * 100))}%`;
  }

  function currentDisplay(current = stateApi().getState()) {
    const domain = current.previewDomain || current.domain;
    const value = current.interaction === 'idle'
      ? (domain === 'earth' ? current.earthAgeMa : current.humanYear)
      : current.previewValue;
    return {
      domain,
      value,
      title: domain === 'earth'
        ? stateApi().formatEarthAge(value)
        : stateApi().formatHumanYear(value),
      kicker: domain === 'earth' ? 'Earth History' : 'Human History'
    };
  }

  function chapterTitle(domain, value) {
    const history = globalThis.WorldlineHistory;
    if (!history?.resolve) return domain === 'earth' ? 'Earth timeline' : 'Human timeline';
    try {
      const result = domain === 'earth'
        ? history.resolve({ timeline: 'earth', ageMa: Number(value) })
        : history.resolve({ timeline: 'human', year: Number(value) });
      return result?.chapter?.title || result?.title || (domain === 'earth' ? 'Earth timeline' : 'Human timeline');
    } catch (_) {
      return domain === 'earth' ? 'Earth timeline' : 'Human timeline';
    }
  }

  function updateSlider(current = stateApi().getState()) {
    if (!slider) return;
    const position = current.interaction === 'idle' ? current.committedPosition : current.previewPosition;
    slider.value = String(Math.round(position));
    slider.style.setProperty('--timeline-progress', clampPercent(position));
    slider.style.setProperty('--timeline-thumb-position', clampPercent(position));
    const display = currentDisplay(current);
    slider.setAttribute('aria-valuetext', display.title);
    slider.setAttribute('aria-label', `${display.kicker} timeline`);
  }

  function updateLabels(current = stateApi().getState()) {
    const display = currentDisplay(current);
    if (hudValue) hudValue.textContent = display.title;
    if (hudEra) hudEra.textContent = chapterTitle(display.domain, display.value);
    const yearLabel = document.querySelector('#yearLabel');
    const eraLabel = document.querySelector('#eraLabel');
    if (yearLabel) yearLabel.textContent = display.title;
    if (eraLabel) eraLabel.textContent = display.domain === 'earth' ? 'Earth timeline' : 'Human timeline';
    const yearButton = document.querySelector('#yearButton');
    if (yearButton) {
      yearButton.setAttribute('aria-label', `Open ${display.kicker} timeline at ${display.title}`);
      yearButton.title = yearButton.getAttribute('aria-label');
    }
  }

  function updateModeControl(current = stateApi().getState()) {
    const buttons = document.querySelectorAll('[data-worldline-domain], [data-timeline-domain], [data-mode], .timeline-mode-control button, #timelineModeControl button');
    buttons.forEach((button) => {
      const text = button.textContent.toLowerCase();
      const domain = button.dataset.worldlineDomain || button.dataset.timelineDomain || button.dataset.mode ||
        (text.includes('human') ? 'human' : text.includes('earth') ? 'earth' : '');
      if (domain !== 'earth' && domain !== 'human') return;
      button.dataset.worldlineDomain = domain;
      const selected = domain === current.domain;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function applyToLegacyEngine(current, reason = 'state-sync') {
    const earth = earthApi();
    if (!earth || applyingToLegacy) return;
    applyingToLegacy = true;
    try {
      if (earth.getMode?.() !== current.domain) earth.setMode?.(current.domain, { source: `timeline-r18-${reason}` });
      if (current.domain === 'earth') earth.setEarthAge?.(current.earthAgeMa, { source: `timeline-r18-${reason}` });
      else earth.setHumanYear?.(current.humanYear, { source: `timeline-r18-${reason}` });
    } catch (error) {
      console.warn('Worldline r18 could not sync legacy Earth history runtime:', error);
    } finally {
      applyingToLegacy = false;
    }
  }

  function render(current = stateApi().getState(), meta = {}) {
    updateSlider(current);
    updateLabels(current);
    updateModeControl(current);
    if (meta.commit) applyToLegacyEngine(current, meta.reason || 'commit');
  }

  function ownSlider() {
    const existing = document.querySelector('#timelinePrimarySlider');
    if (!existing) return false;
    if (existing.dataset.timelineOwner === BUILD) {
      slider = existing;
      return true;
    }
    const replacement = existing.cloneNode(true);
    replacement.dataset.timelineOwner = BUILD;
    replacement.dataset.legacyListenersRemoved = 'true';
    existing.replaceWith(replacement);
    slider = replacement;
    return true;
  }

  function pointerVelocity(event) {
    const now = performance.now();
    if (lastPointerX == null || !lastPointerTime) {
      lastPointerX = event.clientX;
      lastPointerTime = now;
      return 0;
    }
    const dx = event.clientX - lastPointerX;
    const dt = Math.max(1, now - lastPointerTime);
    lastPointerX = event.clientX;
    lastPointerTime = now;
    lastVelocity = dx / dt;
    return lastVelocity;
  }

  function onPointerDown(event) {
    stopLegacy(event);
    activePointerId = event.pointerId ?? 'mouse';
    lastPointerX = event.clientX;
    lastPointerTime = performance.now();
    lastVelocity = 0;
    slider.setPointerCapture?.(event.pointerId);
    stateApi().beginGesture('pointerdown');
  }

  function onInput(event) {
    stopLegacy(event);
    if (stateApi().getState().interaction === 'idle') stateApi().beginGesture('input-autobegin');
    stateApi().queuePreview(Number(event.currentTarget.value), 'slider-input');
  }

  function onPointerMove(event) {
    if (activePointerId == null) return;
    pointerVelocity(event);
  }

  function finishGesture(source) {
    const current = stateApi().getState();
    if (current.interaction === 'idle') return;
    stateApi().commitGesture({ source, velocity: lastVelocity });
    activePointerId = null;
    lastPointerX = null;
    lastPointerTime = 0;
    lastVelocity = 0;
  }

  function onPointerUp(event) {
    stopLegacy(event);
    finishGesture('pointerup');
  }

  function onChange(event) {
    stopLegacy(event);
    if (stateApi().getState().interaction !== 'idle') finishGesture('change');
  }

  function onKeyDown(event) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];
    if (!keys.includes(event.key)) return;
    stopLegacy(event);
    if (stateApi().getState().interaction === 'idle') stateApi().beginGesture('keyboard');
    requestAnimationFrame(() => {
      stateApi().previewFromPosition(Number(slider.value), { source: 'keyboard-preview' });
      stateApi().commitGesture({ source: 'keyboard', snap: true });
    });
  }

  function bindSlider() {
    slider.addEventListener('pointerdown', onPointerDown, { capture: true });
    slider.addEventListener('pointermove', onPointerMove, { capture: true });
    slider.addEventListener('pointerup', onPointerUp, { capture: true });
    slider.addEventListener('pointercancel', () => stateApi().cancelGesture('pointercancel'), { capture: true });
    slider.addEventListener('input', onInput, { capture: true });
    slider.addEventListener('change', onChange, { capture: true });
    slider.addEventListener('keydown', onKeyDown, { capture: true });
    slider.addEventListener('touchend', (event) => {
      stopLegacy(event);
      finishGesture('touchend');
    }, { capture: true, passive: false });
  }

  function handleModeClick(event) {
    const button = event.target.closest?.('[data-worldline-domain], [data-timeline-domain], [data-mode], .timeline-mode-control button, #timelineModeControl button');
    if (!button) return;
    const text = button.textContent.toLowerCase();
    const domain = button.dataset.worldlineDomain || button.dataset.timelineDomain || button.dataset.mode ||
      (text.includes('human') ? 'human' : text.includes('earth') ? 'earth' : '');
    if (domain !== 'earth' && domain !== 'human') return;
    event.stopImmediatePropagation();
    event.preventDefault();
    stateApi().setDomain(domain, { source: 'mode-control' });
  }

  function inferSearchTarget(text) {
    const value = String(text || '').toLowerCase();
    if (!value.trim()) return null;
    const yearMatch = value.match(/\b(\d{1,4})\s*(ce|ad)\b/i);
    const bceMatch = value.match(/\b(\d{1,6})\s*(bce|bc)\b/i);
    const maMatch = value.match(/\b(\d+(?:\.\d+)?)\s*(ma|million years)\b/i);
    if (maMatch) return { domain: 'earth', ageMa: Number(maMatch[1]) };
    if (bceMatch) return { domain: 'human', year: -Number(bceMatch[1]) };
    if (yearMatch) return { domain: 'human', year: Number(yearMatch[1]) };
    if (/\b(ga|billion years|pangea|pangaea|permian|triassic|jurassic|cretaceous|cambrian|devonian|carboniferous|ordovician|silurian|paleogene|neogene|hadean|archean|proterozoic|dinosaur|fossil|ammonite|trilobite|mass extinction|snowball earth)\b/.test(value)) return { domain: 'earth' };
    if (/\b(bce|bc|ce|ad|century|empire|kingdom|dynasty|civilization|city|settlement|war|revolution|rome|egypt|mesopotamia|medieval|renaissance|industrial|human|homo sapiens|agriculture|writing|plague)\b/.test(value)) return { domain: 'human' };
    return null;
  }

  function bindSearchBridge() {
    document.addEventListener('pointerdown', (event) => {
      const suggestion = event.target.closest?.('.search-suggestion');
      if (!suggestion) return;
      const text = [
        suggestion.querySelector('.search-suggestion-title')?.textContent,
        suggestion.querySelector('.search-suggestion-subtitle')?.textContent,
        suggestion.querySelector('.search-suggestion-status')?.textContent,
        document.querySelector('#historySearch')?.value
      ].filter(Boolean).join(' ');
      const target = inferSearchTarget(text);
      if (target) stateApi().applySearchTarget(target, { source: 'search-result' });
    }, true);

    document.querySelector('#historySearch')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const target = inferSearchTarget(event.currentTarget.value);
      if (target) stateApi().applySearchTarget(target, { source: 'search-enter' });
    }, true);
  }

  function install() {
    if (installed) return true;
    const api = stateApi();
    if (!api || !earthApi() || !ownSlider()) return false;
    hudValue = document.querySelector('#timelineHudValue');
    hudEra = document.querySelector('#timelineHudEra');
    document.body.classList.add('worldline-r18-timeline');
    bindSlider();
    bindSearchBridge();
    document.addEventListener('click', handleModeClick, true);
    api.subscribe((current, previous, extra) => {
      const commit = current.interaction === 'idle' && previous.revision !== current.revision;
      render(current, { commit, reason: extra?.phase || current.lastSource });
    });
    window.addEventListener('worldline:timeline-commit', (event) => render(event.detail.current, { commit: true, reason: 'timeline-commit-event' }));
    window.addEventListener('worldline:timeline-preview', (event) => render(event.detail.current, { commit: false, reason: 'timeline-preview-event' }));
    render(api.getState(), { commit: true, reason: 'initial-sync' });
    window.__WORLDLINE_TIMELINE_CONTROLLER_BUILD__ = BUILD;
    installed = true;
    return true;
  }

  const installer = setInterval(() => {
    if (install()) clearInterval(installer);
  }, INSTALL_RETRY_MS);
})();