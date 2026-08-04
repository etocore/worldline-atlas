(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r23';
  const LOCAL_MAX = 1000;
  const INSTALL_RETRY_MS = 80;
  const PREVIEW_DELAY_MS = 90;
  const MAX_PREVIEW_CACHE = 12;

  const EARTH_TREE = Object.freeze([
    { id: 'hadean', label: 'Hadean', kind: 'eon', older: 4567.3, younger: 4000 },
    { id: 'archean', label: 'Archean', kind: 'eon', older: 4000, younger: 2500 },
    {
      id: 'proterozoic', label: 'Proterozoic', kind: 'eon', older: 2500, younger: 538.8,
      children: [
        { id: 'paleoproterozoic', label: 'Paleoproterozoic', kind: 'era', older: 2500, younger: 1600 },
        { id: 'mesoproterozoic', label: 'Mesoproterozoic', kind: 'era', older: 1600, younger: 1000 },
        { id: 'neoproterozoic', label: 'Neoproterozoic', kind: 'era', older: 1000, younger: 538.8 }
      ]
    },
    {
      id: 'phanerozoic', label: 'Phanerozoic', kind: 'eon', older: 538.8, younger: 0,
      children: [
        {
          id: 'paleozoic', label: 'Paleozoic', kind: 'era', older: 538.8, younger: 251.902,
          children: [
            { id: 'cambrian', label: 'Cambrian', kind: 'period', older: 538.8, younger: 485.4 },
            { id: 'ordovician', label: 'Ordovician', kind: 'period', older: 485.4, younger: 443.8 },
            { id: 'silurian', label: 'Silurian', kind: 'period', older: 443.8, younger: 419.2 },
            { id: 'devonian', label: 'Devonian', kind: 'period', older: 419.2, younger: 358.9 },
            { id: 'carboniferous', label: 'Carboniferous', kind: 'period', older: 358.9, younger: 298.9 },
            { id: 'permian', label: 'Permian', kind: 'period', older: 298.9, younger: 251.902 }
          ]
        },
        {
          id: 'mesozoic', label: 'Mesozoic', kind: 'era', older: 251.902, younger: 66,
          children: [
            { id: 'triassic', label: 'Triassic', kind: 'period', older: 251.902, younger: 201.4 },
            { id: 'jurassic', label: 'Jurassic', kind: 'period', older: 201.4, younger: 145 },
            { id: 'cretaceous', label: 'Cretaceous', kind: 'period', older: 145, younger: 66 }
          ]
        },
        {
          id: 'cenozoic', label: 'Cenozoic', kind: 'era', older: 66, younger: 0,
          children: [
            { id: 'paleogene', label: 'Paleogene', kind: 'period', older: 66, younger: 23.03 },
            { id: 'neogene', label: 'Neogene', kind: 'period', older: 23.03, younger: 2.58 },
            { id: 'quaternary', label: 'Quaternary', kind: 'period', older: 2.58, younger: 0 }
          ]
        }
      ]
    }
  ]);

  const HUMAN_CHAPTERS = Object.freeze([
    { id: 'origins', label: 'Origins', kind: 'chapter', start: -300000, end: -70000 },
    { id: 'dispersal', label: 'Dispersal', kind: 'chapter', start: -70000, end: -12000 },
    { id: 'settlement', label: 'Settlement', kind: 'chapter', start: -12000, end: -3000 },
    { id: 'ancient', label: 'Ancient worlds', kind: 'chapter', start: -3000, end: 500 },
    { id: 'medieval', label: 'Medieval worlds', kind: 'chapter', start: 500, end: 1500 },
    { id: 'early-modern', label: 'Early modern', kind: 'chapter', start: 1500, end: 1800 },
    { id: 'industrial', label: 'Industrial to present', kind: 'chapter', start: 1800, end: 2026 }
  ]);

  let installed = false;
  let timelineHud;
  let slider;
  let valueLabel;
  let intervalLabel;
  let breadcrumb;
  let intervalRail;
  let rangeStart;
  let rangeEnd;
  let renderStatus;
  let settingsSubtitle;
  let settingsSurfaceValue;
  let settingsHistorySection;
  let navLevel = null;
  let activeRangeId = '';
  let dragging = false;
  let dragStart = null;
  let previewTimer = 0;
  let previewController = null;
  let previewSequence = 0;
  let lastPreviewKey = null;
  const previewCache = new Map();

  function timelineApi() {
    return globalThis.WorldlineTimelineState;
  }

  function earthApi() {
    return globalThis.WorldlineEarthHistory;
  }

  function uiApi() {
    return globalThis.WorldlineUI;
  }

  function atlasMap() {
    try {
      return typeof map !== 'undefined' ? map : null;
    } catch (_) {
      return null;
    }
  }

  function escapeMarkup(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function containsEarth(interval, ageMa) {
    const value = Number(ageMa);
    return value <= Number(interval.older) && value >= Number(interval.younger);
  }

  function containsHuman(interval, year) {
    const value = Number(year);
    return value >= Number(interval.start) && value <= Number(interval.end);
  }

  function earthContext(ageMa) {
    const age = Math.max(0, Math.min(4567.3, Number(ageMa)));
    const eon = EARTH_TREE.find((item) => containsEarth(item, age)) || EARTH_TREE.at(-1);
    const era = eon.children?.find((item) => containsEarth(item, age)) || null;
    const period = era?.children?.find((item) => containsEarth(item, age)) || null;
    return { domain: 'earth', age, eon, era, period, leaf: period || era || eon };
  }

  function humanContext(year) {
    const value = Math.max(-300000, Math.min(2026, Math.round(Number(year))));
    const chapter = HUMAN_CHAPTERS.find((item) => containsHuman(item, value)) || HUMAN_CHAPTERS.at(-1);
    return { domain: 'human', year: value, chapter, leaf: chapter };
  }

  function currentSnapshot(state = timelineApi().getState()) {
    const domain = state.previewDomain || state.domain;
    const value = state.interaction === 'idle'
      ? (domain === 'earth' ? Number(state.earthAgeMa) : Number(state.humanYear))
      : Number(state.previewValue);
    return domain === 'earth' ? earthContext(value) : humanContext(value);
  }

  function compactEarthAge(ageMa) {
    const value = Number(ageMa);
    if (value <= 0.0005) return 'Present';
    if (value >= 1000) {
      const ga = value / 1000;
      return `${Number.isInteger(ga) ? ga : ga.toFixed(ga < 2 ? 2 : 1)} Ga`;
    }
    if (value >= 1) return `${Number.isInteger(value) ? value : value.toFixed(value < 10 ? 2 : 1)} Ma`;
    const ka = value * 1000;
    return ka >= 1 ? `${Math.round(ka).toLocaleString()} ka` : `${Math.max(1, Math.round(value * 1000000)).toLocaleString()} years`;
  }

  function compactHumanYear(year) {
    const value = Math.round(Number(year));
    if (value >= 2026) return 'Present';
    if (value < -10000) return `${Math.abs(value).toLocaleString()} years ago`;
    if (value < 0) return `${Math.abs(value).toLocaleString()} BCE`;
    return `${value.toLocaleString()} CE`;
  }

  function earthPosition(age, interval) {
    const span = Number(interval.older) - Number(interval.younger);
    if (!span) return 0;
    return Math.round(((Number(interval.older) - Number(age)) / span) * LOCAL_MAX);
  }

  function earthValue(position, interval) {
    const ratio = Math.max(0, Math.min(1, Number(position) / LOCAL_MAX));
    return Number(interval.older) - ((Number(interval.older) - Number(interval.younger)) * ratio);
  }

  function humanPosition(year, interval) {
    const span = Number(interval.end) - Number(interval.start);
    if (!span) return 0;
    return Math.round(((Number(year) - Number(interval.start)) / span) * LOCAL_MAX);
  }

  function humanValue(position, interval) {
    const ratio = Math.max(0, Math.min(1, Number(position) / LOCAL_MAX));
    return Math.round(Number(interval.start) + ((Number(interval.end) - Number(interval.start)) * ratio));
  }

  function defaultNavigationLevel(context) {
    if (context.domain === 'human') return 'chapter';
    if (context.period) return 'period';
    if (context.era) return 'era';
    return 'eon';
  }

  function intervalsForLevel(context) {
    if (context.domain === 'human') return HUMAN_CHAPTERS;
    if (navLevel === 'eon') return EARTH_TREE;
    if (navLevel === 'era') return context.eon.children || EARTH_TREE;
    if (navLevel === 'period') return context.era?.children || context.eon.children || EARTH_TREE;
    return [context.leaf];
  }

  function intervalIsActive(context, interval) {
    if (context.domain === 'human') return context.chapter.id === interval.id;
    return context.eon.id === interval.id || context.era?.id === interval.id || context.period?.id === interval.id;
  }

  function contextRange(context) {
    return context.leaf;
  }

  function rangeMidpoint(interval, domain) {
    return domain === 'earth'
      ? (Number(interval.older) + Number(interval.younger)) / 2
      : Math.round((Number(interval.start) + Number(interval.end)) / 2);
  }

  function renderBreadcrumb(context) {
    if (context.domain === 'human') {
      breadcrumb.innerHTML = '<span class="timeline-breadcrumb-current">Human history</span>';
      return;
    }
    const pieces = [
      `<button type="button" data-nav-level="eon">${escapeMarkup(context.eon.label)}</button>`
    ];
    if (context.era) pieces.push('<span aria-hidden="true">›</span>', `<button type="button" data-nav-level="era">${escapeMarkup(context.era.label)}</button>`);
    if (context.period) pieces.push('<span aria-hidden="true">›</span>', `<span class="timeline-breadcrumb-current">${escapeMarkup(context.period.label)}</span>`);
    breadcrumb.innerHTML = pieces.join('');
    breadcrumb.querySelectorAll('[data-nav-level]').forEach((button) => {
      button.addEventListener('click', () => {
        navLevel = button.dataset.navLevel;
        renderIntervalRail(context);
      });
    });
  }

  function centerActiveInterval() {
    const active = intervalRail?.querySelector('[aria-pressed="true"]');
    if (!active) return;
    const maximum = Math.max(0, intervalRail.scrollWidth - intervalRail.clientWidth);
    const target = active.offsetLeft - ((intervalRail.clientWidth - active.offsetWidth) / 2);
    intervalRail.scrollTo({
      left: Math.max(0, Math.min(maximum, target)),
      behavior: 'auto'
    });
  }

  function renderIntervalRail(context) {
    const intervals = intervalsForLevel(context);
    intervalRail.innerHTML = intervals.map((interval) => {
      const active = intervalIsActive(context, interval);
      return `<button type="button" data-interval-id="${escapeMarkup(interval.id)}" aria-pressed="${active}">${escapeMarkup(interval.label)}</button>`;
    }).join('');
    intervalRail.querySelectorAll('[data-interval-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const interval = intervals.find((item) => item.id === button.dataset.intervalId);
        if (!interval) return;
        const current = currentSnapshot();
        const currentValue = current.domain === 'earth' ? current.age : current.year;
        const inside = current.domain === 'earth' ? containsEarth(interval, currentValue) : containsHuman(interval, currentValue);
        navLevel = null;
        commitValue(inside ? currentValue : rangeMidpoint(interval, current.domain), current.domain, 'interval-select');
      });
    });
    requestAnimationFrame(centerActiveInterval);
  }

  function surfaceDescription(context) {
    if (context.domain === 'human') return 'Historical records update after release';
    if (context.age > 1800) return 'Schematic geography';
    if (context.age >= 245 && context.age <= 255) return 'PaleoDEM relief available';
    return 'Coastlines preview while dragging';
  }

  function renderSettingsContext(context) {
    if (settingsSubtitle) settingsSubtitle.textContent = context.domain === 'earth' ? 'Earth reconstruction' : 'Human history';
    if (settingsSurfaceValue) settingsSurfaceValue.textContent = surfaceDescription(context);
    if (settingsHistorySection) settingsHistorySection.hidden = context.domain !== 'human';
  }

  function render(state = timelineApi().getState()) {
    const context = currentSnapshot(state);
    if (!navLevel) navLevel = defaultNavigationLevel(context);
    const range = contextRange(context);
    const rangeChanged = activeRangeId !== range.id;
    activeRangeId = range.id;

    valueLabel.textContent = context.domain === 'earth' ? compactEarthAge(context.age) : compactHumanYear(context.year);
    intervalLabel.textContent = context.leaf.label;
    document.querySelector('#timelineEarthMode')?.setAttribute('aria-pressed', String(context.domain === 'earth'));
    document.querySelector('#timelineHumanMode')?.setAttribute('aria-pressed', String(context.domain === 'human'));

    if (rangeChanged || !dragging) {
      slider.value = String(context.domain === 'earth'
        ? earthPosition(context.age, range)
        : humanPosition(context.year, range));
    }
    const progress = `${(Number(slider.value) / LOCAL_MAX) * 100}%`;
    slider.style.setProperty('--timeline-progress', progress);
    slider.setAttribute('aria-valuetext', valueLabel.textContent);
    slider.setAttribute('aria-label', `${context.leaf.label} timeline`);

    rangeStart.textContent = context.domain === 'earth' ? compactEarthAge(range.older) : compactHumanYear(range.start);
    rangeEnd.textContent = context.domain === 'earth' ? compactEarthAge(range.younger) : compactHumanYear(range.end);
    renderBreadcrumb(context);
    renderIntervalRail(context);
    if (!renderStatus.dataset.busy) renderStatus.textContent = surfaceDescription(context);
    renderSettingsContext(context);
  }

  function quantizedPreviewAge(ageMa) {
    const age = Number(ageMa);
    if (age <= 100) return Math.round(age * 2) / 2;
    if (age <= 540) return Math.round(age);
    if (age <= 1000) return Math.round(age / 5) * 5;
    return Math.round(age / 10) * 10;
  }

  function rememberPreview(key, collection) {
    previewCache.delete(key);
    previewCache.set(key, collection);
    while (previewCache.size > MAX_PREVIEW_CACHE) previewCache.delete(previewCache.keys().next().value);
  }

  function applyPreviewCollection(key, collection) {
    const mapInstance = atlasMap();
    const source = mapInstance?.getSource?.('paleo-coastlines');
    if (!source?.setData) return false;
    source.setData(collection);
    renderStatus.dataset.busy = '';
    renderStatus.textContent = `Coastlines ready at ${compactEarthAge(key)}`;
    return true;
  }

  async function loadCoastlinePreview(ageMa) {
    const key = quantizedPreviewAge(ageMa);
    if (key > 1800) {
      renderStatus.dataset.busy = '';
      renderStatus.textContent = 'Schematic geography';
      return;
    }
    if (previewCache.has(key)) {
      applyPreviewCollection(key, previewCache.get(key));
      return;
    }
    if (lastPreviewKey === key && previewController) return;
    lastPreviewKey = key;
    previewController?.abort();
    previewController = new AbortController();
    const sequence = ++previewSequence;
    renderStatus.dataset.busy = 'true';
    renderStatus.textContent = `Reconstructing ${compactEarthAge(key)}`;
    try {
      const response = await fetch(`/api/paleocoastlines?time=${encodeURIComponent(key)}`, {
        signal: previewController.signal,
        cache: 'force-cache'
      });
      if (!response.ok) throw new Error(`Paleocoastline preview returned ${response.status}`);
      const result = await response.json();
      if (sequence !== previewSequence) return;
      const collection = result.collection || { type: 'FeatureCollection', features: [] };
      rememberPreview(Number(result.time ?? key), collection);
      applyPreviewCollection(Number(result.time ?? key), collection);
    } catch (error) {
      if (error.name === 'AbortError') return;
      renderStatus.dataset.busy = '';
      renderStatus.textContent = 'Globe settles after release';
    }
  }

  function scheduleCoastlinePreview(ageMa) {
    clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => loadCoastlinePreview(ageMa), PREVIEW_DELAY_MS);
  }

  function previewValue(value, domain) {
    const api = timelineApi();
    if (domain === 'earth') {
      api.setEarthAge(value, { preview: true, source: 'timeline-r23-preview' });
      scheduleCoastlinePreview(value);
    } else {
      api.setHumanYear(value, { preview: true, source: 'timeline-r23-preview' });
    }
  }

  function commitValue(value, domain, source = 'timeline-r23-commit') {
    clearTimeout(previewTimer);
    previewController?.abort();
    previewController = null;
    renderStatus.dataset.busy = '';
    if (domain === 'earth') timelineApi().setEarthAge(value, { source });
    else timelineApi().setHumanYear(value, { source });
  }

  function valueFromLocalSlider() {
    const context = currentSnapshot();
    const range = contextRange(context);
    return {
      domain: context.domain,
      value: context.domain === 'earth'
        ? earthValue(slider.value, range)
        : humanValue(slider.value, range)
    };
  }

  function bindTimeline() {
    document.querySelector('#timelineHudClose').addEventListener('click', () => uiApi().close('timeline', { reason: 'timeline-close-button' }));
    document.querySelector('#advancedControlsButton').addEventListener('click', () => uiApi().activate('settings', {}, { reason: 'timeline-settings' }));
    document.querySelector('#timelineEarthMode').addEventListener('click', (event) => {
      event.stopImmediatePropagation();
      timelineApi().setDomain('earth', { source: 'timeline-r23-mode' });
      navLevel = null;
    });
    document.querySelector('#timelineHumanMode').addEventListener('click', (event) => {
      event.stopImmediatePropagation();
      timelineApi().setDomain('human', { source: 'timeline-r23-mode' });
      navLevel = null;
    });

    slider.addEventListener('pointerdown', (event) => {
      const state = timelineApi().getState();
      dragStart = {
        domain: state.domain,
        value: state.domain === 'earth' ? Number(state.earthAgeMa) : Number(state.humanYear)
      };
      dragging = true;
      slider.setPointerCapture?.(event.pointerId);
      document.body.classList.add('timeline-scrubbing');
    });
    slider.addEventListener('input', () => {
      const next = valueFromLocalSlider();
      previewValue(next.value, next.domain);
      slider.style.setProperty('--timeline-progress', `${(Number(slider.value) / LOCAL_MAX) * 100}%`);
    });
    const settle = () => {
      if (!dragging && timelineApi().getState().interaction === 'idle') return;
      const next = valueFromLocalSlider();
      dragging = false;
      dragStart = null;
      document.body.classList.remove('timeline-scrubbing');
      commitValue(next.value, next.domain);
    };
    slider.addEventListener('pointerup', settle);
    slider.addEventListener('pointercancel', () => {
      clearTimeout(previewTimer);
      previewController?.abort();
      previewController = null;
      dragging = false;
      document.body.classList.remove('timeline-scrubbing');
      if (dragStart?.domain === 'earth') timelineApi().setEarthAge(dragStart.value, { source: 'timeline-r23-cancel' });
      else if (dragStart?.domain === 'human') timelineApi().setHumanYear(dragStart.value, { source: 'timeline-r23-cancel' });
      dragStart = null;
      render();
    });
    slider.addEventListener('change', settle);
  }

  function replaceTimeline() {
    timelineHud = document.querySelector('#timelineHud');
    if (!timelineHud || timelineHud.dataset.timelineOwner === BUILD) return Boolean(timelineHud);
    timelineHud.dataset.timelineOwner = BUILD;
    timelineHud.innerHTML = `
      <header class="timeline-hud-header timeline-r23-header">
        <div class="timeline-r23-heading">
          <nav id="timelineBreadcrumb" class="timeline-breadcrumb" aria-label="Geological hierarchy"></nav>
          <div class="timeline-r23-title-row">
            <h2 id="timelineHudValue" class="timeline-hud-value">250 Ma</h2>
            <span id="timelineHudEra" class="timeline-current-interval">Permian</span>
          </div>
        </div>
        <button id="timelineHudClose" class="timeline-hud-close" type="button" aria-label="Close timeline">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
        </button>
      </header>
      <div class="timeline-domain-control" role="group" aria-label="Timeline domain">
        <button id="timelineEarthMode" type="button" aria-pressed="true">Earth</button>
        <button id="timelineHumanMode" type="button" aria-pressed="false">Human</button>
      </div>
      <div id="timelineIntervalRail" class="timeline-interval-rail" aria-label="Time intervals"></div>
      <div class="timeline-local-control">
        <input id="timelinePrimarySlider" class="timeline-primary-slider timeline-local-slider" type="range" min="0" max="${LOCAL_MAX}" step="1" value="500" />
        <div class="timeline-local-scale" aria-hidden="true">
          <span id="timelineRangeStart">Older</span>
          <span id="timelineRangeEnd">Younger</span>
        </div>
      </div>
      <footer class="timeline-r23-footer">
        <span id="timelineRenderStatus" class="timeline-render-status">Coastlines preview while dragging</span>
        <button id="advancedControlsButton" class="timeline-settings-button" type="button">Settings</button>
      </footer>
    `;

    valueLabel = document.querySelector('#timelineHudValue');
    intervalLabel = document.querySelector('#timelineHudEra');
    breadcrumb = document.querySelector('#timelineBreadcrumb');
    intervalRail = document.querySelector('#timelineIntervalRail');
    slider = document.querySelector('#timelinePrimarySlider');
    rangeStart = document.querySelector('#timelineRangeStart');
    rangeEnd = document.querySelector('#timelineRangeEnd');
    renderStatus = document.querySelector('#timelineRenderStatus');
    bindTimeline();
    return true;
  }

  function buildSettings() {
    const panel = document.querySelector('#controlPanel');
    if (!panel || panel.querySelector('#worldlineSettingsBody')) return Boolean(panel);
    panel.classList.add('worldline-r23-settings');

    const header = panel.querySelector('.panel-header');
    const oldTitle = panel.querySelector('#timelineDate');
    if (oldTitle) oldTitle.hidden = true;
    header?.querySelector('.panel-kicker')?.setAttribute('hidden', '');
    panel.querySelector('#sourceStatus')?.setAttribute('hidden', '');
    panel.querySelector('#aboutButton')?.setAttribute('hidden', '');

    const titleWrap = header?.querySelector('div');
    if (titleWrap) {
      titleWrap.insertAdjacentHTML('beforeend', '<h1 id="worldlineSettingsTitle">Settings</h1><p id="worldlineSettingsSubtitle" class="settings-subtitle">Earth reconstruction</p>');
    }

    const evidenceBlock = panel.querySelector('.control-block');
    const layerBlock = panel.querySelector('.layer-block');
    const body = document.createElement('div');
    body.id = 'worldlineSettingsBody';
    body.className = 'settings-native-body';
    body.innerHTML = `
      <section class="settings-section" aria-labelledby="settingsSurfaceHeading">
        <h2 id="settingsSurfaceHeading">Current view</h2>
        <div class="settings-group">
          <div class="settings-value-row"><span>Rendering</span><strong id="settingsSurfaceValue">Reconstructed coastlines</strong></div>
        </div>
      </section>
      <section id="settingsEvidenceSection" class="settings-section" aria-labelledby="settingsEvidenceHeading">
        <h2 id="settingsEvidenceHeading">Reconstruction</h2>
        <div id="settingsEvidenceGroup" class="settings-group settings-control-group"></div>
      </section>
      <section id="settingsHistorySection" class="settings-section" aria-labelledby="settingsHistoryHeading">
        <h2 id="settingsHistoryHeading">Historical layers</h2>
        <div id="settingsHistoryGroup" class="settings-group settings-toggle-group"></div>
      </section>
      <section class="settings-section" aria-labelledby="settingsAboutHeading">
        <h2 id="settingsAboutHeading">About</h2>
        <div class="settings-group">
          <button id="settingsSourcesButton" class="settings-navigation-row" type="button"><span>Sources and limitations</span><span aria-hidden="true">›</span></button>
        </div>
      </section>
    `;
    panel.appendChild(body);

    const evidenceGroup = body.querySelector('#settingsEvidenceGroup');
    if (evidenceBlock && evidenceGroup) {
      [...evidenceBlock.children].forEach((child) => evidenceGroup.appendChild(child));
    }
    const historyGroup = body.querySelector('#settingsHistoryGroup');
    if (layerBlock && historyGroup) {
      [...layerBlock.querySelectorAll(':scope > label')].forEach((label) => historyGroup.appendChild(label));
    }

    body.querySelector('#settingsSourcesButton').addEventListener('click', () => document.querySelector('#aboutButton')?.click());
    settingsSubtitle = body.closest('.control-panel')?.querySelector('#worldlineSettingsSubtitle');
    settingsSurfaceValue = body.querySelector('#settingsSurfaceValue');
    settingsHistorySection = body.querySelector('#settingsHistorySection');
    return true;
  }

  function install() {
    if (installed) return true;
    if (!timelineApi() || !earthApi() || !uiApi() || !window.__WORLDLINE_TIMELINE_CONTROLLER_BUILD__) return false;
    if (!replaceTimeline() || !buildSettings()) return false;
    document.body.classList.add('worldline-r23-navigation');
    timelineApi().subscribe((state) => render(state));
    window.addEventListener('worldline:surface-world-ready', () => render());
    render();
    window.__WORLDLINE_TIMELINE_NAVIGATION_BUILD__ = BUILD;
    installed = true;
    return true;
  }

  const installer = window.setInterval(() => {
    if (install()) window.clearInterval(installer);
  }, INSTALL_RETRY_MS);
})();
