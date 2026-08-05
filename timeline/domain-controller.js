(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r30-domain';
  let installed = false;
  let legacyEngine = null;
  let bridgeMode = 'earth';

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

  function setLayerVisibility(ids, visible) {
    const mapInstance = atlasMap();
    if (!mapInstance?.getLayer || !mapInstance?.setLayoutProperty) return;
    [...new Set(ids)].forEach((id) => {
      if (mapInstance.getLayer(id)) {
        mapInstance.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      }
    });
  }

  function humanLayerIds() {
    return [
      ...CURATED_LAYERS,
      ...CATALOG_LAYERS,
      ...globalArray('settlementLayerIds'),
      ...globalArray('buildingLayerIds')
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
    setLayerVisibility(globalArray('settlementLayerIds'), historical);
    setLayerVisibility(globalArray('buildingLayerIds'), buildings);
  }

  function enforceDomainLayers(domain) {
    if (domain === 'earth') {
      hideHumanLayers();
      setLayerVisibility(PALEO_LAYERS, true);
    } else {
      setLayerVisibility(PALEO_LAYERS, false);
      restoreHumanLayers();
    }
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
    if (domain === 'earth') {
      legacyEngine.setEarthAge?.(state.earthAgeMa, { source });
    } else {
      legacyEngine.setHumanYear?.(state.humanYear, { source });
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
        return legacyEngine.setEarthAge?.(value, options);
      },
      setHumanYear(value, options = {}) {
        return legacyEngine.setHumanYear?.(value, options);
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

  function install() {
    if (installed) return true;
    if (!document.body || !timeline() || !window.__WORLDLINE_TIMELINE_BUILD__) return false;
    if (!installBridge() || !configureLauncher()) return false;
    installDomainButtons();
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
  setTimeout(() => clearInterval(installer), 12000);
})();
