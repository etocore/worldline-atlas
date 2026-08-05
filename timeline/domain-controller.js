(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r30-domain';
  let installed = false;
  let legacyEngine = null;
  let bridgeMode = 'earth';
  const guardedMaps = new WeakSet();

  const PALEO_LAYERS = Object.freeze([
    'paleo-ocean-fill',
    'paleo-land-shadow',
    'paleo-land-fill',
    'paleo-coastline-line'
  ]);
  const CURATED_LAYERS = Object.freeze([
    'curated-settlement-halo',
    'curated-settlement-label',
    'curated-settlement-hit'
  ]);
  const CATALOG_LAYERS = Object.freeze([
    'wikidata-clusters',
    'wikidata-cluster-count',
    'wikidata-points',
    'wikidata-labels',
    'wikidata-hit'
  ]);

  function timeline() {
    return globalThis.WorldlineTimelineState;
  }

  function atlasMap() {
    try {
      return typeof map !== 'undefined' ? map : globalThis.map;
    } catch (_) {
      return globalThis.map;
    }
  }

  function globalArray(name) {
    try {
      const value = globalThis[name];
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function styleLayers() {
    try {
      return atlasMap()?.getStyle?.()?.layers || [];
    } catch (_) {
      return [];
    }
  }

  function discoveredHumanLayers(kind) {
    return styleLayers()
      .filter((layer) => {
        const metadataKind = String(layer.metadata?.worldlineKind || '').toLowerCase();
        if (metadataKind === kind) return true;
        const signature = `${layer.id || ''} ${layer['source-layer'] || ''}`.toLowerCase();
        if (/(paleo|coastline|tectonic|plate|boundary)/.test(signature)) return false;
        if (kind === 'building') return /building/.test(signature);
        return /(settlement|place|city|town|village|hamlet|locality|suburb|neighbourhood|borough|quarter)/.test(signature)
          && !/(road|route|rail|station|airport|water|peak|mountain|park|amenity|building|address)/.test(signature);
      })
      .map((layer) => layer.id)
      .filter(Boolean);
  }

  function settlementLayers() {
    return [...new Set([
      ...globalArray('settlementLayerIds'),
      ...discoveredHumanLayers('settlement')
    ])];
  }

  function buildingLayers() {
    return [...new Set([
      ...globalArray('buildingLayerIds'),
      ...discoveredHumanLayers('building')
    ])];
  }

  function setLayerVisibility(ids, visible) {
    const mapInstance = atlasMap();
    if (!mapInstance?.getLayer || !mapInstance?.setLayoutProperty) return;
    [...new Set(ids)].forEach((id) => {
      try {
        if (mapInstance.getLayer(id)) {
          mapInstance.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
      } catch (_) {}
    });
  }

  function humanLayerIds() {
    return [
      ...CURATED_LAYERS,
      ...CATALOG_LAYERS,
      ...settlementLayers(),
      ...buildingLayers()
    ];
  }

  function hideHumanLayers() {
    setLayerVisibility(humanLayerIds(), false);
  }

  function restoreHumanLayers() {
    const curated = document.querySelector('#curatedToggle')?.checked !== false;
    const catalog = document.querySelector('#wikidataToggle')?.checked !== false;
    const historical = document.querySelector('#ohmToggle')?.checked !== false;
    const buildings = document.querySelector('#buildingToggle')?.checked === true;
    setLayerVisibility(CURATED_LAYERS, curated);
    setLayerVisibility(CATALOG_LAYERS, catalog);
    setLayerVisibility(settlementLayers(), historical);
    setLayerVisibility(buildingLayers(), buildings);
  }

  function enforceDomainLayers(domain = bridgeMode) {
    if (domain === 'earth') {
      hideHumanLayers();
      setLayerVisibility(PALEO_LAYERS, true);
    } else {
      setLayerVisibility(PALEO_LAYERS, false);
      restoreHumanLayers();
    }
  }

  function guardMapLifecycle() {
    const mapInstance = atlasMap();
    if (!mapInstance) return false;
    if (guardedMaps.has(mapInstance)) return true;
    guardedMaps.add(mapInstance);
    for (const eventName of ['load', 'styledata']) {
      try { mapInstance.on?.(eventName, () => enforceDomainLayers()); } catch (_) {}
    }
    enforceDomainLayers();
    return true;
  }

  function reportRecoveredSwitch(domain, error) {
    window.dispatchEvent(new CustomEvent('worldline:timeline-domain-recovered', {
      detail: {
        domain,
        build: BUILD,
        message: String(error?.message || error || 'Legacy renderer mode transition failed')
      }
    }));
  }

  function applyCurrentValue(domain, source) {
    const state = timeline()?.getState?.();
    if (!state || !legacyEngine) return;
    try {
      if (domain === 'earth') {
        legacyEngine.setEarthAge?.(state.earthAgeMa, { source });
      } else {
        legacyEngine.setHumanYear?.(state.humanYear, { source });
      }
    } catch (error) {
      reportRecoveredSwitch(domain, error);
      if (domain === 'human') {
        try { globalThis.setYear?.(state.humanYear); } catch (_) {}
      }
    }
  }

  function setMode(domain, options = {}) {
    if (!['earth', 'human'].includes(domain) || !legacyEngine) return;
    const previous = bridgeMode;
    let recovered = false;

    try {
      legacyEngine.setMode?.(domain, options);
    } catch (error) {
      recovered = true;
      reportRecoveredSwitch(domain, error);
    }

    bridgeMode = domain;
    document.body.dataset.timelineMode = domain;
    enforceDomainLayers(domain);

    if (recovered) {
      applyCurrentValue(domain, options.source || BUILD);
      window.dispatchEvent(new CustomEvent('worldline:timeline-mode', {
        detail: { mode: domain, source: options.source || BUILD, recovered: true }
      }));
    } else if (previous !== domain) {
      window.dispatchEvent(new CustomEvent('worldline:timeline-domain-settled', {
        detail: { domain, source: options.source || BUILD }
      }));
    }
  }

  function installBridge() {
    const engine = globalThis.WorldlineEarthHistory;
    const state = timeline()?.getState?.();
    if (!engine || !state || engine.__domainBridgeBuild === BUILD) return Boolean(engine?.__domainBridgeBuild === BUILD);

    legacyEngine = engine;
    bridgeMode = state.domain || engine.getMode?.() || 'earth';

    globalThis.WorldlineEarthHistory = Object.freeze({
      ...engine,
      BUILD,
      __domainBridgeBuild: BUILD,
      getMode: () => bridgeMode,
      setMode,
      setEarthAge(value, options = {}) {
        try { return legacyEngine.setEarthAge?.(value, options); }
        catch (error) { reportRecoveredSwitch('earth', error); return undefined; }
      },
      setHumanYear(value, options = {}) {
        try { return legacyEngine.setHumanYear?.(value, options); }
        catch (error) { reportRecoveredSwitch('human', error); return undefined; }
      }
    });

    document.body.dataset.timelineMode = bridgeMode;
    enforceDomainLayers(bridgeMode);
    return true;
  }

  function cancelActiveGesture() {
    const state = timeline()?.getState?.();
    const slider = document.querySelector('#timelinePrimarySlider');
    if (state?.interaction !== 'idle' || document.body.classList.contains('timeline-scrubbing')) {
      slider?.dispatchEvent(new Event('pointercancel', { bubbles: true }));
      timeline()?.cancelGesture?.('domain-switch');
    }
    document.body.classList.remove('timeline-scrubbing');
  }

  function installDomainButtons() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest?.('#timelineEarthMode, #timelineHumanMode');
      if (!button) return;
      const domain = button.id === 'timelineHumanMode' ? 'human' : 'earth';
      event.preventDefault();
      event.stopImmediatePropagation();
      cancelActiveGesture();
      timeline()?.setDomain?.(domain, { source: 'timeline-domain-controller' });
      requestAnimationFrame(() => button.focus({ preventScroll: true }));
    }, true);
  }

  function configureLauncher() {
    const button = document.querySelector('#yearButton');
    const label = button?.querySelector('#eraLabel');
    const value = button?.querySelector('#yearLabel');
    if (!button || !label || !value) return false;

    button.classList.add('timeline-disclosure-launcher');
    button.querySelector('.time-chip-icon')?.remove();
    value.hidden = true;
    value.setAttribute('aria-hidden', 'true');

    const render = (state = timeline().getState()) => {
      const domainLabel = state.domain === 'human' ? 'Human History' : 'Earth History';
      const currentValue = state.domain === 'human' ? state.humanYear : state.earthAgeMa;
      const accessible = globalThis.WorldlineTimelineModel?.formatTime?.(currentValue, {
        domain: state.domain,
        style: 'accessible'
      }) || '';
      label.textContent = domainLabel;
      button.dataset.domain = state.domain;
      button.setAttribute('aria-label', `Open ${domainLabel} timeline${accessible ? ` at ${accessible}` : ''}`);
    };

    timeline().subscribe((state) => render(state));
    render();
    return true;
  }

  function configureChapterDisclosure() {
    const card = document.querySelector('#timelineEraCard');
    if (!card) return false;
    if (card.dataset.disclosureOwner === BUILD) return true;

    const title = card.querySelector('#timelineEraTitle');
    const meta = card.querySelector('#timelineEraMeta');
    const summary = card.querySelector('#timelineEraSummary');
    const explore = card.querySelector('#timelineEraExplore');
    const oldCopy = card.querySelector('.timeline-era-card-copy');
    if (!title || !meta || !summary) return false;

    const toggle = document.createElement('button');
    toggle.id = 'timelineChapterDisclosure';
    toggle.className = 'timeline-chapter-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'timelineChapterDetails');

    const toggleCopy = document.createElement('span');
    toggleCopy.className = 'timeline-chapter-toggle-copy';
    const domain = document.createElement('span');
    domain.className = 'timeline-chapter-domain';
    domain.textContent = timeline().getState().domain === 'human' ? 'Human History' : 'Earth History';
    const chevron = document.createElement('span');
    chevron.className = 'timeline-chapter-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    toggleCopy.append(domain, title);
    toggle.append(toggleCopy, chevron);

    const details = document.createElement('div');
    details.id = 'timelineChapterDetails';
    details.className = 'timeline-chapter-details timeline-era-card-copy';
    details.hidden = true;
    details.append(meta, summary);
    oldCopy?.querySelectorAll('.worldline-surface-badge').forEach((badge) => details.appendChild(badge));
    if (explore) details.appendChild(explore);

    card.replaceChildren(toggle, details);
    card.classList.add('timeline-chapter-disclosure');
    card.dataset.disclosureOwner = BUILD;
    card.dataset.expanded = 'false';
    card.removeAttribute('role');
    card.removeAttribute('tabindex');
    card.removeAttribute('aria-label');

    const setExpanded = (expanded) => {
      toggle.setAttribute('aria-expanded', String(expanded));
      details.hidden = !expanded;
      card.dataset.expanded = String(expanded);
    };
    toggle.addEventListener('click', () => setExpanded(toggle.getAttribute('aria-expanded') !== 'true'));

    let lastDomain = timeline().getState().domain;
    timeline().subscribe((state) => {
      domain.textContent = state.domain === 'human' ? 'Human History' : 'Earth History';
      if (state.domain !== lastDomain) setExpanded(false);
      lastDomain = state.domain;
    });
    return true;
  }

  function install() {
    if (installed) return true;
    if (!document.body || !timeline() || !window.__WORLDLINE_TIMELINE_BUILD__) return false;
    if (!installBridge() || !configureLauncher()) return false;
    installDomainButtons();
    configureChapterDisclosure();
    installed = true;
    window.__WORLDLINE_TIMELINE_DOMAIN_CONTROLLER_BUILD__ = BUILD;
    window.dispatchEvent(new CustomEvent('worldline:timeline-domain-controller-ready', {
      detail: { build: BUILD }
    }));
    return true;
  }

  const installer = setInterval(() => {
    if (install()) clearInterval(installer);
  }, 30);
  const mapInstaller = setInterval(() => {
    if (guardMapLifecycle()) clearInterval(mapInstaller);
  }, 90);
  const chapterInstaller = setInterval(() => {
    if (configureChapterDisclosure()) clearInterval(chapterInstaller);
  }, 90);
  setTimeout(() => {
    clearInterval(installer);
    clearInterval(mapInstaller);
    clearInterval(chapterInstaller);
  }, 12000);
})();
