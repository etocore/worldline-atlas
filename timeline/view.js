(() => {
  'use strict';

  const model = globalThis.WorldlineTimelineModel;
  const timeline = globalThis.WorldlineTimelineState;
  if (!model || !timeline) throw new Error('Worldline timeline model and state must load before the timeline view.');

  const { BUILD, SLIDER_MAX, EARTH_INTERVALS, HUMAN_INTERVALS } = model;
  const previewCache = new Map();
  let installed = false;
  let hud;
  let slider;
  let valueLabel;
  let breadcrumb;
  let rail;
  let rangeStart;
  let rangeEnd;
  let renderStatus;
  let yearButton;
  let eraLabel;
  let yearLabel;
  let settingsSubtitle;
  let settingsSurface;
  let settingsHistory;
  let railDomain = '';
  let activeIntervalId = '';
  let requestedCenterId = '';
  let centerToken = 0;
  let userScrolling = false;
  let lastManualScroll = -Infinity;
  let dragging = false;
  let dragStart = null;
  let previewTimer = 0;
  let previewController = null;
  let previewSequence = 0;
  let syncingLegacy = false;

  const ui = () => globalThis.WorldlineUI;
  const earth = () => globalThis.WorldlineEarthHistory;
  const mapInstance = () => {
    try { return typeof map !== 'undefined' ? map : null; } catch (_) { return null; }
  };

  function currentContext(state = timeline.getState()) {
    const domain = state.previewDomain || state.domain;
    const value = state.interaction === 'idle'
      ? (domain === 'earth' ? Number(state.earthAgeMa) : Number(state.humanYear))
      : Number(state.previewValue);
    return model.context(domain, value);
  }

  function intervalsFor(domain) {
    return domain === 'human' ? HUMAN_INTERVALS : EARTH_INTERVALS;
  }

  function surfaceDescription(context) {
    if (context.domain === 'human') return 'Historical records update after release';
    if (context.age > 1800) return 'Schematic geography';
    if (context.age >= 245 && context.age <= 255) return 'PaleoDEM relief available';
    return 'Coastlines preview while dragging';
  }

  function createHud() {
    const stage = document.querySelector('.map-stage');
    if (!stage) return false;
    document.querySelector('#timelineHud')?.remove();
    stage.insertAdjacentHTML('beforeend', `
      <section id="timelineHud" class="timeline-hud canonical-timeline" data-open="false" aria-hidden="true" aria-label="Historical timeline">
        <header class="timeline-header">
          <div class="timeline-heading">
            <nav id="timelineBreadcrumb" class="timeline-breadcrumb" aria-label="Timeline hierarchy"></nav>
            <h2 id="timelineHudValue" class="timeline-value">250 million years ago</h2>
          </div>
          <button id="timelineHudClose" class="timeline-close" type="button" aria-label="Close timeline">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
          </button>
        </header>
        <div class="timeline-domain" role="group" aria-label="Timeline domain">
          <button id="timelineEarthMode" type="button" aria-pressed="true">Earth</button>
          <button id="timelineHumanMode" type="button" aria-pressed="false">Human</button>
        </div>
        <div id="timelineIntervalRail" class="timeline-interval-rail" aria-label="Geological time intervals"></div>
        <div class="timeline-local-control">
          <input id="timelinePrimarySlider" class="timeline-local-slider" type="range" min="0" max="${SLIDER_MAX}" step="1" value="500" />
          <div class="timeline-local-scale" aria-hidden="true">
            <span id="timelineRangeStart">Older</span><span id="timelineRangeEnd">Younger</span>
          </div>
        </div>
        <footer class="timeline-footer">
          <span id="timelineRenderStatus" class="timeline-render-status">Coastlines preview while dragging</span>
          <button id="advancedControlsButton" class="timeline-settings-button" type="button">Settings</button>
        </footer>
      </section>
    `);
    hud = document.querySelector('#timelineHud');
    slider = document.querySelector('#timelinePrimarySlider');
    valueLabel = document.querySelector('#timelineHudValue');
    breadcrumb = document.querySelector('#timelineBreadcrumb');
    rail = document.querySelector('#timelineIntervalRail');
    rangeStart = document.querySelector('#timelineRangeStart');
    rangeEnd = document.querySelector('#timelineRangeEnd');
    renderStatus = document.querySelector('#timelineRenderStatus');
    return true;
  }

  function ownLauncher() {
    const existing = document.querySelector('#yearButton');
    if (!existing) return false;
    yearButton = existing.cloneNode(true);
    existing.replaceWith(yearButton);
    yearButton.dataset.timelineOwner = BUILD;
    eraLabel = yearButton.querySelector('#eraLabel');
    yearLabel = yearButton.querySelector('#yearLabel');
    if (!yearButton.querySelector('.time-chip-icon')) {
      yearButton.insertAdjacentHTML('afterbegin', '<span class="time-chip-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.2v5.1l3.5 2.1"></path></svg></span>');
    }
    yearButton.setAttribute('aria-haspopup', 'dialog');
    yearButton.setAttribute('aria-controls', 'timelineHud');
    yearButton.addEventListener('click', () => ui().activate('timeline', {}, { reason: 'timeline-launcher' }));
    return true;
  }

  function buildSettings() {
    const panel = document.querySelector('#controlPanel');
    if (!panel) return false;
    panel.classList.add('worldline-timeline-settings');
    if (!panel.querySelector('#worldlineSettingsBody')) {
      panel.querySelector('#timelineDate')?.setAttribute('hidden', '');
      panel.querySelector('.panel-kicker')?.setAttribute('hidden', '');
      panel.querySelector('#sourceStatus')?.setAttribute('hidden', '');
      panel.querySelector('#aboutButton')?.setAttribute('hidden', '');
      panel.querySelector('.panel-header > div')?.insertAdjacentHTML('beforeend', '<h1 id="worldlineSettingsTitle">Settings</h1><p id="worldlineSettingsSubtitle" class="settings-subtitle">Earth reconstruction</p>');

      const body = document.createElement('div');
      body.id = 'worldlineSettingsBody';
      body.className = 'settings-native-body';
      body.innerHTML = `
        <section class="settings-section"><h2>Current view</h2><div class="settings-group"><div class="settings-value-row"><span>Rendering</span><strong id="settingsSurfaceValue"></strong></div></div></section>
        <section class="settings-section"><h2>Reconstruction</h2><div id="settingsEvidenceGroup" class="settings-group settings-control-group"></div></section>
        <section id="settingsHistorySection" class="settings-section"><h2>Historical layers</h2><div id="settingsHistoryGroup" class="settings-group settings-toggle-group"></div></section>
        <section class="settings-section"><h2>About</h2><div class="settings-group"><button id="settingsSourcesButton" class="settings-navigation-row" type="button"><span>Sources and limitations</span><span aria-hidden="true">›</span></button></div></section>
      `;
      panel.appendChild(body);
      const evidence = panel.querySelector('.control-block');
      if (evidence) [...evidence.children].forEach((child) => body.querySelector('#settingsEvidenceGroup').appendChild(child));
      const layers = panel.querySelector('.layer-block');
      if (layers) [...layers.querySelectorAll(':scope > label')].forEach((label) => body.querySelector('#settingsHistoryGroup').appendChild(label));
      body.querySelector('#settingsSourcesButton').addEventListener('click', () => document.querySelector('#aboutButton')?.click());
    }
    settingsSubtitle = panel.querySelector('#worldlineSettingsSubtitle');
    settingsSurface = panel.querySelector('#settingsSurfaceValue');
    settingsHistory = panel.querySelector('#settingsHistorySection');
    return true;
  }

  function registerSurface() {
    ui().register('timeline', {
      open() {
        hud.dataset.open = 'true';
        hud.setAttribute('aria-hidden', 'false');
        document.body.classList.add('timeline-active');
        render();
      },
      close() {
        hud.dataset.open = 'false';
        hud.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('timeline-active');
        render();
      },
      isOpen() { return hud.dataset.open === 'true'; }
    });
  }

  function buildRail(domain) {
    railDomain = domain;
    activeIntervalId = '';
    rail.replaceChildren();
    rail.setAttribute('aria-label', domain === 'human' ? 'Human history intervals' : 'Geological time intervals');
    const fragment = document.createDocumentFragment();
    intervalsFor(domain).forEach((interval, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'timeline-interval-bubble';
      button.dataset.intervalId = interval.id;
      button.textContent = interval.label;
      button.tabIndex = -1;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-posinset', String(index + 1));
      button.setAttribute('aria-setsize', String(intervalsFor(domain).length));
      button.setAttribute('aria-label', domain === 'human'
        ? `${interval.label}, ${model.formatTime(interval.start, { domain })} to ${model.formatTime(interval.end, { domain })}`
        : `${interval.label}, ${model.formatTime(interval.older)} to ${model.formatTime(interval.younger)}`);
      fragment.appendChild(button);
    });
    rail.appendChild(fragment);
  }

  function centerButton(button, force = false) {
    if (!button || userScrolling) return;
    if (!force && performance.now() - lastManualScroll < 650) return;
    const railRect = rail.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    if (!force && buttonRect.left >= railRect.left + 12 && buttonRect.right <= railRect.right - 12) return;
    const maximum = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const target = Math.max(0, Math.min(maximum, button.offsetLeft + button.offsetWidth / 2 - rail.clientWidth / 2));
    rail.scrollTo({ left: target, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function updateRail(context, initial = false) {
    const domainChanged = railDomain !== context.domain;
    if (domainChanged) buildRail(context.domain);
    const value = context.domain === 'human' ? context.year : context.age;
    const interval = intervalsFor(context.domain).find((candidate) => model.contains(candidate, value, context.domain)) || intervalsFor(context.domain).at(-1);
    const changed = interval.id !== activeIntervalId;
    activeIntervalId = interval.id;
    rail.querySelectorAll('[data-interval-id]').forEach((button) => {
      const selected = button.dataset.intervalId === activeIntervalId;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    const selected = rail.querySelector(`[data-interval-id="${CSS.escape(activeIntervalId)}"]`);
    if (initial || domainChanged || requestedCenterId === activeIntervalId) {
      const token = ++centerToken;
      requestAnimationFrame(() => {
        if (token === centerToken) centerButton(selected, true);
        requestedCenterId = '';
      });
    } else if (changed) {
      centerButton(selected, false);
    }
  }

  function bindRail() {
    rail.addEventListener('click', (event) => {
      const button = event.target.closest('[data-interval-id]');
      if (!button) return;
      const context = currentContext();
      const interval = intervalsFor(context.domain).find((candidate) => candidate.id === button.dataset.intervalId);
      const current = context.domain === 'human' ? context.year : context.age;
      const next = model.contains(interval, current, context.domain)
        ? current
        : context.domain === 'human' ? Math.round((interval.start + interval.end) / 2) : (interval.older + interval.younger) / 2;
      requestedCenterId = interval.id;
      if (context.domain === 'human') timeline.setHumanYear(next, { source: 'timeline-interval' });
      else timeline.setEarthAge(next, { source: 'timeline-interval' });
    });
    rail.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const buttons = [...rail.querySelectorAll('[data-interval-id]')];
      const current = Math.max(0, buttons.findIndex((button) => button.dataset.intervalId === activeIntervalId));
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)));
      event.preventDefault();
      buttons[index].click();
      buttons[index].focus({ preventScroll: true });
    });
    rail.addEventListener('pointerdown', () => { centerToken += 1; userScrolling = true; }, { passive: true });
    const finish = () => { userScrolling = false; lastManualScroll = performance.now(); };
    rail.addEventListener('pointerup', finish, { passive: true });
    rail.addEventListener('pointercancel', finish, { passive: true });
    rail.addEventListener('scroll', () => { centerToken += 1; lastManualScroll = performance.now(); }, { passive: true });
  }

  function renderBreadcrumb(context) {
    if (context.domain === 'human') {
      breadcrumb.textContent = 'Human history';
      return;
    }
    breadcrumb.replaceChildren();
    [context.eon, context.era, context.period].filter(Boolean).forEach((item, index, items) => {
      const span = document.createElement('span');
      span.textContent = item.label;
      if (index === items.length - 1) span.className = 'timeline-breadcrumb-current';
      breadcrumb.appendChild(span);
      if (index < items.length - 1) breadcrumb.append(' › ');
    });
  }

  function quantizedAge(age) {
    if (age <= 100) return Math.round(age * 2) / 2;
    if (age <= 540) return Math.round(age);
    if (age <= 1000) return Math.round(age / 5) * 5;
    return Math.round(age / 10) * 10;
  }

  function applyPreview(age, collection) {
    const source = mapInstance()?.getSource?.('paleo-coastlines');
    if (!source?.setData) return;
    source.setData(collection);
    renderStatus.dataset.busy = '';
    renderStatus.textContent = `Coastlines ready at ${model.formatTime(age)}`;
  }

  async function loadPreview(age) {
    const key = quantizedAge(age);
    if (key > 1800) {
      renderStatus.dataset.busy = '';
      renderStatus.textContent = 'Schematic geography';
      return;
    }
    if (previewCache.has(key)) return applyPreview(key, previewCache.get(key));
    previewController?.abort();
    previewController = new AbortController();
    const sequence = ++previewSequence;
    renderStatus.dataset.busy = 'true';
    renderStatus.textContent = `Reconstructing ${model.formatTime(key)}`;
    try {
      const response = await fetch(`/api/paleocoastlines?time=${encodeURIComponent(key)}`, { signal: previewController.signal, cache: 'force-cache' });
      if (!response.ok) throw new Error(`Paleocoastline preview returned ${response.status}`);
      const result = await response.json();
      if (sequence !== previewSequence) return;
      const collection = result.collection || { type: 'FeatureCollection', features: [] };
      previewCache.set(key, collection);
      while (previewCache.size > 16) previewCache.delete(previewCache.keys().next().value);
      applyPreview(Number(result.time ?? key), collection);
    } catch (error) {
      if (error.name === 'AbortError') return;
      renderStatus.dataset.busy = '';
      renderStatus.textContent = 'Globe settles after release';
    }
  }

  function schedulePreview(age) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => loadPreview(age), 70);
  }

  function bindHud() {
    hud.querySelector('#timelineHudClose').addEventListener('click', () => ui().close('timeline', { reason: 'timeline-close' }));
    hud.querySelector('#advancedControlsButton').addEventListener('click', () => ui().activate('settings', {}, { reason: 'timeline-settings' }));
    hud.querySelector('#timelineEarthMode').addEventListener('click', () => timeline.setDomain('earth', { source: 'timeline-mode' }));
    hud.querySelector('#timelineHumanMode').addEventListener('click', () => timeline.setDomain('human', { source: 'timeline-mode' }));

    slider.addEventListener('pointerdown', (event) => {
      const state = timeline.getState();
      dragStart = { domain: state.domain, value: state.domain === 'earth' ? state.earthAgeMa : state.humanYear };
      dragging = true;
      slider.setPointerCapture?.(event.pointerId);
      document.body.classList.add('timeline-scrubbing');
      timeline.beginGesture('timeline-slider');
    });
    slider.addEventListener('input', () => {
      const context = currentContext();
      const value = model.localValue(slider.value, context.leaf, context.domain);
      timeline.previewValue(context.domain, value, 'timeline-slider-preview');
      slider.style.setProperty('--timeline-progress', `${Number(slider.value) / 10}%`);
      if (context.domain === 'earth') schedulePreview(value);
    });
    const settle = () => {
      if (!dragging && timeline.getState().interaction === 'idle') return;
      const context = currentContext();
      const value = model.localValue(slider.value, context.leaf, context.domain);
      dragging = false;
      dragStart = null;
      clearTimeout(previewTimer);
      previewController?.abort();
      document.body.classList.remove('timeline-scrubbing');
      if (context.domain === 'earth') timeline.setEarthAge(value, { source: 'timeline-slider-commit' });
      else timeline.setHumanYear(value, { source: 'timeline-slider-commit' });
    };
    slider.addEventListener('pointerup', settle);
    slider.addEventListener('change', settle);
    slider.addEventListener('pointercancel', () => {
      dragging = false;
      document.body.classList.remove('timeline-scrubbing');
      if (dragStart?.domain === 'earth') timeline.setEarthAge(dragStart.value, { source: 'timeline-slider-cancel' });
      else if (dragStart?.domain === 'human') timeline.setHumanYear(dragStart.value, { source: 'timeline-slider-cancel' });
      dragStart = null;
    });
  }

  function inferSearchTarget(text) {
    const value = String(text || '').toLowerCase();
    const ce = value.match(/\b(\d{1,4})\s*(ce|ad)\b/);
    const bce = value.match(/\b(\d{1,6})\s*(bce|bc)\b/);
    const ma = value.match(/\b(\d+(?:\.\d+)?)\s*(ma|million years)\b/);
    if (ma) return { domain: 'earth', ageMa: Number(ma[1]) };
    if (bce) return { domain: 'human', year: -Number(bce[1]) };
    if (ce) return { domain: 'human', year: Number(ce[1]) };
    if (/\b(ga|billion years|pangea|permian|triassic|jurassic|cretaceous|cambrian|dinosaur|fossil|snowball earth)\b/.test(value)) return { domain: 'earth' };
    if (/\b(empire|kingdom|dynasty|civilization|medieval|renaissance|industrial|human|agriculture|writing)\b/.test(value)) return { domain: 'human' };
    return null;
  }

  function bindSearch() {
    document.addEventListener('pointerdown', (event) => {
      const suggestion = event.target.closest?.('.search-suggestion');
      if (!suggestion) return;
      const target = inferSearchTarget(`${suggestion.textContent} ${document.querySelector('#historySearch')?.value || ''}`);
      if (target) timeline.applySearchTarget(target, { source: 'search-result' });
    }, true);
    document.querySelector('#historySearch')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const target = inferSearchTarget(event.currentTarget.value);
      if (target) timeline.applySearchTarget(target, { source: 'search-enter' });
    }, true);
  }

  function syncLegacy(state) {
    const engine = earth();
    if (!engine || syncingLegacy || state.interaction !== 'idle') return;
    syncingLegacy = true;
    try {
      if (engine.getMode?.() !== state.domain) engine.setMode?.(state.domain, { source: BUILD });
      if (state.domain === 'earth') engine.setEarthAge?.(state.earthAgeMa, { source: BUILD });
      else engine.setHumanYear?.(state.humanYear, { source: BUILD });
    } finally {
      syncingLegacy = false;
    }
  }

  function render(state = timeline.getState(), initial = false) {
    if (!installed) return;
    const context = currentContext(state);
    const value = context.domain === 'earth' ? context.age : context.year;
    const range = context.leaf;
    valueLabel.textContent = model.formatTime(value, { domain: context.domain, style: 'full' });
    renderBreadcrumb(context);
    hud.querySelector('#timelineEarthMode').setAttribute('aria-pressed', String(context.domain === 'earth'));
    hud.querySelector('#timelineHumanMode').setAttribute('aria-pressed', String(context.domain === 'human'));
    if (!dragging) slider.value = String(model.localPosition(value, range, context.domain));
    slider.style.setProperty('--timeline-progress', `${Number(slider.value) / 10}%`);
    slider.setAttribute('aria-valuetext', valueLabel.textContent);
    slider.setAttribute('aria-label', `${range.label} timeline`);
    rangeStart.textContent = model.formatTime(context.domain === 'earth' ? range.older : range.start, { domain: context.domain });
    rangeEnd.textContent = model.formatTime(context.domain === 'earth' ? range.younger : range.end, { domain: context.domain });
    updateRail(context, initial);
    if (!renderStatus.dataset.busy) renderStatus.textContent = surfaceDescription(context);
    if (settingsSubtitle) settingsSubtitle.textContent = context.domain === 'earth' ? 'Earth reconstruction' : 'Human history';
    if (settingsSurface) settingsSurface.textContent = surfaceDescription(context);
    if (settingsHistory) settingsHistory.hidden = context.domain !== 'human';

    const domainLabel = context.domain === 'earth' ? 'Earth history' : 'Human history';
    const compact = model.formatTime(value, { domain: context.domain, style: 'compact' });
    const accessible = model.formatTime(value, { domain: context.domain, style: 'accessible' });
    eraLabel.textContent = domainLabel;
    yearLabel.textContent = compact;
    yearButton.setAttribute('aria-expanded', String(hud.dataset.open === 'true'));
    yearButton.setAttribute('aria-label', `Open ${domainLabel} timeline at ${accessible}`);
  }

  function install() {
    if (installed) return true;
    if (!document.body || !ui() || !earth() || !window.__WORLDLINE_APPLE_CONTROLS_BUILD__) return false;
    if (!createHud() || !ownLauncher() || !buildSettings()) return false;
    registerSurface();
    bindRail();
    bindHud();
    bindSearch();
    document.body.classList.add('worldline-timeline');
    installed = true;
    timeline.subscribe((state, previous) => {
      render(state);
      if (state.interaction === 'idle' && (previous.interaction !== 'idle' || state.domain !== previous.domain || state.earthAgeMa !== previous.earthAgeMa || state.humanYear !== previous.humanYear)) syncLegacy(state);
    });
    ui().subscribe(() => render());
    render(timeline.getState(), true);
    syncLegacy(timeline.getState());

    window.__WORLDLINE_TIMELINE_BUILD__ = BUILD;
    window.__WORLDLINE_TIMELINE_CONTROLLER_BUILD__ = BUILD;
    window.__WORLDLINE_TIMELINE_NAVIGATION_BUILD__ = BUILD;
    window.__WORLDLINE_TIMELINE_RAIL_BUILD__ = BUILD;
    window.__WORLDLINE_TIME_CONTROL_BUILD__ = BUILD;
    globalThis.WorldlineTimeline = Object.freeze({
      BUILD,
      EARTH_TREE: model.EARTH_TREE,
      EARTH_INTERVALS,
      HUMAN_INTERVALS,
      formatTime: model.formatTime,
      getContext: currentContext
    });
    globalThis.WorldlineTimelineRail = Object.freeze({ BUILD, earthIntervals: EARTH_INTERVALS, humanIntervals: HUMAN_INTERVALS, getActiveInterval: () => activeIntervalId });
    return true;
  }

  const installer = setInterval(() => {
    if (install()) clearInterval(installer);
  }, 60);
})();
