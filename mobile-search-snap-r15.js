(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r15';
  const SLIDER_MAX = 1000;
  const EARTH_STOPS = [4567.3, 4000, 2500, 1800, 1000, 541, 252, 66, 2.58, 0.3, 0.0117, 0];
  const HUMAN_STOPS = [-300000, -200000, -100000, -50000, -12000, -3000, 0, 1000, 1500, 1800, 1950, 2026];
  const SNAP_DISTANCE = 52;

  let slider;
  let searchInput;
  let searchShell;
  let snapLabel;
  let snapTimer;
  let lastScrollY = 0;
  let installed = false;

  function positionInStops(value, stops, descending = false) {
    const segment = SLIDER_MAX / (stops.length - 1);
    for (let index = 0; index < stops.length - 1; index += 1) {
      const start = stops[index];
      const end = stops[index + 1];
      const inside = descending
        ? value <= start && value >= end
        : value >= start && value <= end;
      if (!inside) continue;
      const ratio = descending
        ? (start - value) / (start - end || 1)
        : (value - start) / (end - start || 1);
      return (index + ratio) * segment;
    }
    if (descending) return value >= stops[0] ? 0 : SLIDER_MAX;
    return value <= stops[0] ? 0 : SLIDER_MAX;
  }

  function milestonePosition(mode, milestone) {
    return mode === 'earth'
      ? positionInStops(Number(milestone.ageMa), EARTH_STOPS, true)
      : positionInStops(Number(milestone.year), HUMAN_STOPS, false);
  }

  function closestMilestone() {
    const engine = globalThis.WorldlineEarthHistory;
    if (!engine || !slider) return null;
    const mode = engine.getMode();
    const milestones = mode === 'earth' ? engine.earthMilestones : engine.humanMilestones;
    const currentPosition = Number(slider.value);
    return milestones
      .map((milestone) => ({ milestone, position: milestonePosition(mode, milestone) }))
      .map((entry) => ({ ...entry, distance: Math.abs(entry.position - currentPosition) }))
      .sort((left, right) => left.distance - right.distance)[0] || null;
  }

  function ensureSnapLabel() {
    if (snapLabel) return snapLabel;
    const wrap = slider?.closest('.timeline-slider-wrap');
    if (!wrap) return null;
    snapLabel = document.createElement('div');
    snapLabel.className = 'timeline-snap-label';
    snapLabel.setAttribute('aria-hidden', 'true');
    wrap.appendChild(snapLabel);
    return snapLabel;
  }

  function announceSnap(entry) {
    const label = ensureSnapLabel();
    if (!label) return;
    const percent = Math.max(7, Math.min(93, (entry.position / SLIDER_MAX) * 100));
    label.textContent = entry.milestone.title;
    label.style.setProperty('--wl-snap-left', `${percent}%`);
    label.dataset.visible = 'true';
    slider.classList.add('is-snapping');
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      label.dataset.visible = 'false';
      slider.classList.remove('is-snapping');
    }, 900);
  }

  function snapTimeline() {
    const engine = globalThis.WorldlineEarthHistory;
    const entry = closestMilestone();
    if (!engine || !entry || entry.distance > SNAP_DISTANCE) return;
    const mode = engine.getMode();
    if (mode === 'earth') engine.setEarthAge(entry.milestone.ageMa, { source: 'milestone-snap' });
    else engine.setHumanYear(entry.milestone.year, { source: 'milestone-snap' });
    slider.value = String(Math.round(entry.position));
    slider.style.setProperty('--timeline-progress', `${(entry.position / SLIDER_MAX) * 100}%`);
    announceSnap(entry);
    if (navigator.vibrate) navigator.vibrate(8);
  }

  function viewportMetrics() {
    const viewport = window.visualViewport;
    return {
      top: viewport?.offsetTop || 0,
      height: viewport?.height || window.innerHeight
    };
  }

  function positionSearch() {
    if (!document.body.classList.contains('search-active') || !searchShell) return;
    const { top, height } = viewportMetrics();
    const shellHeight = Math.max(64, searchShell.querySelector('.search-row')?.getBoundingClientRect().height || 64);
    const gutter = 12;
    const searchTop = Math.max(top + 10, top + height - shellHeight - gutter);
    const availableAbove = Math.max(116, searchTop - top - 18);
    const resultHeight = Math.min(268, availableAbove);
    const root = document.documentElement;
    root.style.setProperty('--wl-vv-top', `${top}px`);
    root.style.setProperty('--wl-vv-height', `${height}px`);
    root.style.setProperty('--wl-search-top', `${searchTop}px`);
    root.style.setProperty('--wl-search-results-height', `${resultHeight}px`);
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  }

  function lockSearchViewport() {
    lastScrollY = window.scrollY;
    document.documentElement.classList.add('worldline-search-locked');
    requestAnimationFrame(() => {
      positionSearch();
      requestAnimationFrame(positionSearch);
    });
  }

  function unlockSearchViewport() {
    document.documentElement.classList.remove('worldline-search-locked');
    document.documentElement.style.removeProperty('--wl-search-top');
    document.documentElement.style.removeProperty('--wl-search-results-height');
    if (lastScrollY) window.scrollTo(0, lastScrollY);
    lastScrollY = 0;
  }

  function syncSearchState() {
    if (document.body.classList.contains('search-active')) lockSearchViewport();
    else unlockSearchViewport();
  }

  function install() {
    if (installed) return true;
    slider = document.querySelector('#timelinePrimarySlider');
    searchInput = document.querySelector('#historySearch');
    searchShell = document.querySelector('.search-shell');
    if (!slider || !searchInput || !searchShell || !globalThis.WorldlineEarthHistory) return false;

    slider.addEventListener('change', snapTimeline);
    slider.addEventListener('pointerup', snapTimeline);
    slider.addEventListener('touchend', snapTimeline, { passive: true });
    slider.addEventListener('keyup', (event) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) snapTimeline();
    });

    searchInput.addEventListener('focus', lockSearchViewport);
    const observer = new MutationObserver(syncSearchState);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.visualViewport?.addEventListener('resize', positionSearch);
    window.visualViewport?.addEventListener('scroll', positionSearch);
    window.addEventListener('orientationchange', () => setTimeout(positionSearch, 120));

    installed = true;
    window.__WORLDLINE_MOBILE_SEARCH_SNAP_BUILD__ = BUILD;
    return true;
  }

  const installer = setInterval(() => {
    if (install()) clearInterval(installer);
  }, 80);
})();
