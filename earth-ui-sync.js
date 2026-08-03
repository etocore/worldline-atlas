(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r10';
  let lastSignature = '';

  function modelDetails(ageMa) {
    if (ageMa === 0) {
      return {
        geometry: 'Observed coastlines',
        confidence: 'Observed',
        step: 'Present-day reference',
        coverage: 'Modern geometry calibration'
      };
    }
    if (ageMa <= 100) {
      return { geometry: 'CAO2024', confidence: 'Model constrained', step: '0.5 Ma request step', coverage: 'Reconstructed coastline polygons' };
    }
    if (ageMa <= 540) {
      return { geometry: 'CAO2024', confidence: 'Model constrained', step: '1 Ma request step', coverage: 'Reconstructed coastline polygons' };
    }
    if (ageMa <= 1000) {
      return { geometry: 'CAO2024', confidence: 'Working hypothesis', step: '5 Ma request step', coverage: 'Reconstructed coastline polygons' };
    }
    if (ageMa <= 1800) {
      return { geometry: 'CAO2024', confidence: 'Deep-time hypothesis', step: '10 Ma request step', coverage: 'Reconstructed coastline polygons' };
    }
    return { geometry: 'Curated schematic', confidence: 'Schematic', step: 'Named interval', coverage: 'No precise continental geometry claimed' };
  }

  function ensurePanel() {
    if (document.querySelector('#earthModelPanel')) return document.querySelector('#earthModelPanel');
    const eraSummary = document.querySelector('#eraSummary');
    if (!eraSummary) return null;
    eraSummary.insertAdjacentHTML('afterend', `
      <section id="earthModelPanel" class="earth-model-panel" aria-label="Earth reconstruction details">
        <div class="earth-model-heading">
          <div>
            <span>Earth reconstruction</span>
            <strong id="earthModelAge">250 Ma</strong>
          </div>
          <button id="earthModelInfo" type="button" aria-label="Open scientific sources">Sources</button>
        </div>
        <dl>
          <div><dt>Geometry</dt><dd id="earthModelGeometry">CAO2024</dd></div>
          <div><dt>Confidence</dt><dd id="earthModelConfidence">Model constrained</dd></div>
          <div><dt>Time step</dt><dd id="earthModelStep">1 Ma request step</dd></div>
          <div><dt>Visible layer</dt><dd id="earthModelCoverage">Reconstructed coastline polygons</dd></div>
        </dl>
        <p>Terrain, bathymetry, climate, vegetation, ice, and life are separate evidence layers and are not implied by the coastline model.</p>
      </section>
    `);
    document.querySelector('#earthModelInfo')?.addEventListener('click', () => document.querySelector('#aboutButton')?.click());
    return document.querySelector('#earthModelPanel');
  }

  function labelForAge(ageMa) {
    return globalThis.WorldlineEarthHistory?.formatEarthAge?.(ageMa) || `${ageMa} Ma`;
  }

  function updateEarthMode(ageMa) {
    const details = modelDetails(ageMa);
    const label = labelForAge(ageMa);
    ensurePanel();

    const timelineValue = document.querySelector('#timelineHudValue')?.textContent || label;
    const eraSummaryText = document.querySelector('#timelineEraSummary')?.textContent || 'Earth reconstruction at the selected time.';

    if (dom.timelineDate) dom.timelineDate.textContent = timelineValue;
    if (dom.searchContextYear) dom.searchContextYear.textContent = timelineValue;
    if (dom.eraSummary) dom.eraSummary.textContent = eraSummaryText;
    if (dom.surfaceModeLabel) dom.surfaceModeLabel.textContent = details.geometry;
    if (dom.evidenceLabel) dom.evidenceLabel.textContent = details.confidence;
    if (dom.catalogCount) dom.catalogCount.textContent = details.step;
    if (dom.visibleCount) dom.visibleCount.textContent = details.coverage;
    if (dom.coverageMessage) {
      dom.coverageMessage.textContent = ageMa > 1800
        ? 'This early-Earth scene is schematic. No precise continental positions are claimed.'
        : 'Continental geometry is reconstructed with the pinned CAO2024 plate model.';
    }

    const metricCards = document.querySelectorAll('.metric-grid > div');
    const labels = ['Visible layer', 'Confidence', 'Time step', 'Geometry'];
    metricCards.forEach((card, index) => {
      const span = card.querySelector('span');
      if (span && labels[index]) span.textContent = labels[index];
    });

    document.querySelector('#earthModelAge').textContent = label;
    document.querySelector('#earthModelGeometry').textContent = details.geometry;
    document.querySelector('#earthModelConfidence').textContent = details.confidence;
    document.querySelector('#earthModelStep').textContent = details.step;
    document.querySelector('#earthModelCoverage').textContent = details.coverage;
  }

  function updateHumanMode() {
    const metricCards = document.querySelectorAll('.metric-grid > div');
    const labels = ['Visible records', 'Evidence mode', 'Live catalog', 'Surface'];
    metricCards.forEach((card, index) => {
      const span = card.querySelector('span');
      if (span && labels[index]) span.textContent = labels[index];
    });
    if (typeof updateEraUi === 'function') updateEraUi();
    if (typeof updateMetrics === 'function') updateMetrics();
  }

  function synchronize() {
    const engine = globalThis.WorldlineEarthHistory;
    if (!engine || typeof dom === 'undefined') return false;
    ensurePanel();
    const mode = engine.getMode();
    const age = engine.getEarthAgeMa();
    const visibleTime = document.querySelector('#timelineHudValue')?.textContent || '';
    const signature = `${mode}|${age}|${visibleTime}`;
    if (signature === lastSignature) return true;
    lastSignature = signature;

    if (mode === 'earth') updateEarthMode(age);
    else updateHumanMode();
    return true;
  }

  const installer = setInterval(() => {
    if (!synchronize()) return;
    clearInterval(installer);
    const observer = new MutationObserver(synchronize);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      childList: true,
      characterData: true,
      attributeFilter: ['data-timeline-mode']
    });
    window.addEventListener('worldline:timeline-mode', synchronize);
    window.__WORLDLINE_EARTH_UI_BUILD__ = BUILD;
  }, 80);
})();
