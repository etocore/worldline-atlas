(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r24';
  const INSTALL_RETRY_MS = 50;
  const MANUAL_SCROLL_GRACE_MS = 650;

  // One chronological set of non-overlapping Earth intervals. The rail keeps
  // the same DOM and complete chronology as the selected date changes.
  const EARTH_INTERVALS = Object.freeze([
    { id: 'hadean', label: 'Hadean', older: 4567.3, younger: 4000, group: 'Hadean' },
    { id: 'archean', label: 'Archean', older: 4000, younger: 2500, group: 'Archean', groupStart: true },
    { id: 'paleoproterozoic', label: 'Paleoproterozoic', older: 2500, younger: 1600, group: 'Proterozoic', groupStart: true },
    { id: 'mesoproterozoic', label: 'Mesoproterozoic', older: 1600, younger: 1000, group: 'Proterozoic' },
    { id: 'neoproterozoic', label: 'Neoproterozoic', older: 1000, younger: 538.8, group: 'Proterozoic' },
    { id: 'cambrian', label: 'Cambrian', older: 538.8, younger: 485.4, group: 'Paleozoic', groupStart: true },
    { id: 'ordovician', label: 'Ordovician', older: 485.4, younger: 443.8, group: 'Paleozoic' },
    { id: 'silurian', label: 'Silurian', older: 443.8, younger: 419.2, group: 'Paleozoic' },
    { id: 'devonian', label: 'Devonian', older: 419.2, younger: 358.9, group: 'Paleozoic' },
    { id: 'carboniferous', label: 'Carboniferous', older: 358.9, younger: 298.9, group: 'Paleozoic' },
    { id: 'permian', label: 'Permian', older: 298.9, younger: 251.902, group: 'Paleozoic' },
    { id: 'triassic', label: 'Triassic', older: 251.902, younger: 201.4, group: 'Mesozoic', groupStart: true },
    { id: 'jurassic', label: 'Jurassic', older: 201.4, younger: 145, group: 'Mesozoic' },
    { id: 'cretaceous', label: 'Cretaceous', older: 145, younger: 66, group: 'Mesozoic' },
    { id: 'paleogene', label: 'Paleogene', older: 66, younger: 23.03, group: 'Cenozoic', groupStart: true },
    { id: 'neogene', label: 'Neogene', older: 23.03, younger: 2.58, group: 'Cenozoic' },
    { id: 'quaternary', label: 'Quaternary', older: 2.58, younger: 0, group: 'Cenozoic' }
  ]);

  const HUMAN_INTERVALS = Object.freeze([
    { id: 'origins', label: 'Origins', start: -300000, end: -70000 },
    { id: 'dispersal', label: 'Dispersal', start: -70000, end: -12000 },
    { id: 'settlement', label: 'Settlement', start: -12000, end: -3000 },
    { id: 'ancient', label: 'Ancient worlds', start: -3000, end: 500 },
    { id: 'medieval', label: 'Medieval worlds', start: 500, end: 1500 },
    { id: 'early-modern', label: 'Early modern', start: 1500, end: 1800 },
    { id: 'industrial', label: 'Industrial to present', start: 1800, end: 2026 }
  ]);

  let installed = false;
  let rail = null;
  let renderedDomain = '';
  let activeId = '';
  let userInteracting = false;
  let lastManualScrollAt = -Infinity;
  let requestedCenterId = '';
  let centerRequestToken = 0;

  function timelineApi() {
    return globalThis.WorldlineTimelineState;
  }

  function intervalsForDomain(domain) {
    return domain === 'human' ? HUMAN_INTERVALS : EARTH_INTERVALS;
  }

  function stateDomain(state) {
    return state.previewDomain || state.domain || 'earth';
  }

  function stateValue(state, domain) {
    if (state.interaction !== 'idle' && Number.isFinite(Number(state.previewValue))) {
      return Number(state.previewValue);
    }
    return domain === 'human' ? Number(state.humanYear) : Number(state.earthAgeMa);
  }

  function contains(interval, value, domain) {
    if (domain === 'human') return value >= Number(interval.start) && value <= Number(interval.end);
    return value <= Number(interval.older) && value >= Number(interval.younger);
  }

  function midpoint(interval, domain) {
    return domain === 'human'
      ? Math.round((Number(interval.start) + Number(interval.end)) / 2)
      : (Number(interval.older) + Number(interval.younger)) / 2;
  }

  function activeInterval(intervals, value, domain) {
    return intervals.find((interval) => contains(interval, value, domain)) || intervals.at(-1);
  }

  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  function centerButton(button, { force = false, immediate = false } = {}) {
    if (!rail || !button || userInteracting) return false;
    if (!force && performance.now() - lastManualScrollAt < MANUAL_SCROLL_GRACE_MS) return false;

    const railRect = rail.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const comfortablyVisible = buttonRect.left >= railRect.left + 12 && buttonRect.right <= railRect.right - 12;
    if (comfortablyVisible && !force) return true;

    const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const target = button.offsetLeft + (button.offsetWidth / 2) - (rail.clientWidth / 2);
    rail.scrollTo({
      left: Math.max(0, Math.min(maximum, target)),
      behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth'
    });
    return true;
  }

  function scheduleCenter(button, options = {}) {
    const token = ++centerRequestToken;
    requestAnimationFrame(() => {
      if (token !== centerRequestToken) return;
      const centered = centerButton(button, options);
      if (centered && requestedCenterId === button?.dataset.intervalId) requestedCenterId = '';
    });
  }

  function accessibleRange(interval, domain) {
    if (domain === 'human') return `${interval.label}, ${interval.start} to ${interval.end}`;
    return `${interval.label}, ${interval.older} to ${interval.younger} million years ago`;
  }

  function buildRail(domain) {
    const intervals = intervalsForDomain(domain);
    renderedDomain = domain;
    activeId = '';
    rail.replaceChildren();
    rail.setAttribute('aria-label', domain === 'human' ? 'Human history intervals' : 'Geological time intervals');
    rail.dataset.domain = domain;

    const fragment = document.createDocumentFragment();
    intervals.forEach((interval, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.intervalId = interval.id;
      button.dataset.group = interval.group || '';
      button.className = 'timeline-interval-bubble';
      if (interval.groupStart && index > 0) button.classList.add('is-group-start');
      button.textContent = interval.label;
      button.setAttribute('aria-label', accessibleRange(interval, domain));
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-posinset', String(index + 1));
      button.setAttribute('aria-setsize', String(intervals.length));
      button.tabIndex = -1;
      fragment.appendChild(button);
    });
    rail.appendChild(fragment);
  }

  function updateRail(state = timelineApi().getState(), { initial = false } = {}) {
    if (!rail) return;
    const domain = stateDomain(state);
    const domainChanged = renderedDomain !== domain;
    if (domainChanged) buildRail(domain);

    const intervals = intervalsForDomain(domain);
    const interval = activeInterval(intervals, stateValue(state, domain), domain);
    if (!interval) return;

    const changed = activeId !== interval.id;
    activeId = interval.id;
    rail.querySelectorAll('[data-interval-id]').forEach((button) => {
      const selected = button.dataset.intervalId === activeId;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    const selected = rail.querySelector(`[data-interval-id="${CSS.escape(activeId)}"]`);
    const explicitlyRequested = requestedCenterId === activeId;

    if (initial) {
      // Establish the initial rail position synchronously before publishing the
      // build-ready flag. This prevents a stale startup frame from overriding
      // a user's first manual swipe.
      centerRequestToken += 1;
      centerButton(selected, { force: true, immediate: true });
      requestedCenterId = '';
      return;
    }

    if (explicitlyRequested) {
      scheduleCenter(selected, { force: true });
      return;
    }

    if (domainChanged || changed) {
      scheduleCenter(selected, { force: domainChanged });
    }
  }

  function selectInterval(intervalId) {
    const state = timelineApi().getState();
    const domain = stateDomain(state);
    const intervals = intervalsForDomain(domain);
    const interval = intervals.find((candidate) => candidate.id === intervalId);
    if (!interval) return;

    const current = stateValue(state, domain);
    const next = contains(interval, current, domain) ? current : midpoint(interval, domain);
    requestedCenterId = interval.id;
    if (domain === 'human') timelineApi().setHumanYear(next, { source: 'timeline-r24-interval' });
    else timelineApi().setEarthAge(next, { source: 'timeline-r24-interval' });
  }

  function finishInteraction() {
    userInteracting = false;
    lastManualScrollAt = performance.now();
    rail.classList.remove('is-user-scrolling');

    if (requestedCenterId && requestedCenterId === activeId) {
      const selected = rail.querySelector(`[data-interval-id="${CSS.escape(activeId)}"]`);
      scheduleCenter(selected, { force: true });
    }
  }

  function bindRail() {
    rail.addEventListener('click', (event) => {
      const button = event.target.closest('[data-interval-id]');
      if (!button || !rail.contains(button)) return;
      selectInterval(button.dataset.intervalId);
    });

    rail.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const buttons = [...rail.querySelectorAll('[data-interval-id]')];
      if (!buttons.length) return;
      const currentIndex = Math.max(0, buttons.findIndex((button) => button.dataset.intervalId === activeId));
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : Math.max(0, Math.min(buttons.length - 1, currentIndex + (event.key === 'ArrowRight' ? 1 : -1)));
      event.preventDefault();
      selectInterval(buttons[nextIndex].dataset.intervalId);
      buttons[nextIndex].focus({ preventScroll: true });
    });

    rail.addEventListener('pointerdown', () => {
      centerRequestToken += 1;
      userInteracting = true;
      rail.classList.add('is-user-scrolling');
    }, { passive: true });

    rail.addEventListener('pointerup', finishInteraction, { passive: true });
    rail.addEventListener('pointercancel', finishInteraction, { passive: true });
    rail.addEventListener('scroll', () => {
      // Any scroll takes ownership from an auto-center frame. This includes
      // touch momentum, keyboard scrolling, assistive scrolling, and browser
      // scroll adjustments that do not arrive with a pointer held down.
      centerRequestToken += 1;
      lastManualScrollAt = performance.now();
    }, { passive: true });

    rail.addEventListener('wheel', (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      centerRequestToken += 1;
      lastManualScrollAt = performance.now();
      rail.scrollLeft += event.deltaY;
    }, { passive: false });
  }

  function replaceVisibleRail() {
    const oldRail = document.querySelector('#timelineIntervalRail');
    if (!oldRail) return false;
    if (oldRail.dataset.timelineRailOwner === BUILD) {
      rail = oldRail;
      return true;
    }

    const replacement = oldRail.cloneNode(false);
    replacement.id = 'timelineIntervalRail';
    replacement.className = `${oldRail.className} worldline-r24-rail`;
    replacement.dataset.timelineRailOwner = BUILD;
    oldRail.replaceWith(replacement);
    rail = replacement;
    bindRail();
    updateRail(timelineApi().getState(), { initial: true });
    return true;
  }

  function install() {
    if (installed) return true;
    if (!timelineApi() || !window.__WORLDLINE_TIMELINE_NAVIGATION_BUILD__) return false;
    if (!replaceVisibleRail()) return false;

    timelineApi().subscribe((state) => updateRail(state));
    window.__WORLDLINE_TIMELINE_RAIL_BUILD__ = BUILD;
    window.WorldlineTimelineRail = Object.freeze({
      BUILD,
      earthIntervals: EARTH_INTERVALS,
      humanIntervals: HUMAN_INTERVALS,
      getActiveInterval: () => activeId
    });
    installed = true;
    return true;
  }

  const installer = window.setInterval(() => {
    if (install()) window.clearInterval(installer);
  }, INSTALL_RETRY_MS);
})();