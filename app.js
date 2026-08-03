function updateEraUi() {
  const era = currentEra();
  const date = formatYear(selectedYear);
  dom.yearLabel.textContent = date;
  dom.timelineDate.textContent = date;
  dom.eraLabel.textContent = era.label;
  dom.eraSummary.textContent = era.summary;
  dom.evidenceLabel.textContent = currentMode().label;
  dom.evidenceValue.textContent = currentMode().label;
  document.querySelectorAll('[data-year]').forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.year) === selectedYear);
  });
}

function setYear(year, { fromSlider = false } = {}) {
  const parsed = Math.max(CONFIG.minYear, Math.min(CONFIG.maxYear, Math.trunc(Number(year))));
  if (!Number.isFinite(parsed)) return;
  selectedYear = parsed;
  if (!fromSlider) dom.timeSlider.value = String(parsed);
  dom.yearInput.value = String(parsed);
  updateEraUi();
  applyHistoricalDateFilter();
  updateCuratedLayer();
  scheduleWikidataLoad();
  requestAnimationFrame(updateRenderedOhmCount);
}

function playbackStep(year) {
  if (year < -8000) return 250;
  if (year < -3000) return 100;
  if (year < 0) return 50;
  if (year < 1500) return 25;
  if (year < 1850) return 10;
  if (year < 1950) return 5;
  return 1;
}

function stopPlayback() {
  if (!playbackTimer) return;
  clearInterval(playbackTimer);
  playbackTimer = null;
  dom.playButton.textContent = '▶';
  dom.playButton.setAttribute('aria-label', 'Play timeline');
}

function togglePlayback() {
  if (playbackTimer) {
    stopPlayback();
    return;
  }
  dom.playButton.textContent = 'Ⅱ';
  dom.playButton.setAttribute('aria-label', 'Pause timeline');
  playbackTimer = setInterval(() => {
    const next = selectedYear + playbackStep(selectedYear);
    setYear(next > CONFIG.maxYear ? CONFIG.minYear : next);
  }, 720);
}

function popupForCustomFeature(feature, coordinates) {
  const props = feature.properties || {};
  const range = props.start !== undefined
    ? `${formatYear(Number(props.start))} to ${Number(props.end) >= CONFIG.maxYear ? 'present' : formatYear(Number(props.end))}`
    : `${props.startLabel || 'Unknown start'} to ${props.endLabel || 'unknown end'}`;
  const confidence = props.confidence ? `${Math.round(Number(props.confidence) * 100)}% confidence` : 'Catalogued record';
  const sourceUrl = props.source || props.item;
  const sourceLink = sourceUrl ? `<a class="popup-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">Open source record</a>` : '';
  new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
    .setLngLat(coordinates)
    .setHTML(`
      <strong class="popup-title">${escapeHtml(props.name || 'Settlement')}</strong>
      <div class="popup-meta">${escapeHtml(props.kind || props.classLabel || 'Human settlement')}<br>${escapeHtml(range)}<br>${escapeHtml(confidence)}${props.note ? `<br>${escapeHtml(props.note)}` : ''}</div>
      ${sourceLink}
    `)
    .addTo(map);
}

function popupForOhmFeature(feature, coordinates) {
  const props = feature.properties || {};
  const name = props.name || props.name_en || props.wikidata || 'Historical settlement';
  const start = props.start_date || props.start_decdate;
  const end = props.end_date || props.end_decdate;
  const range = `${start ?? 'unknown start'} to ${end ?? 'present or unknown end'}`;
  const source = props['source:url'] || props.source_url || (props.wikidata ? `https://www.wikidata.org/wiki/${props.wikidata}` : 'https://www.openhistoricalmap.org');
  new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
    .setLngLat(coordinates)
    .setHTML(`
      <strong class="popup-title">${escapeHtml(name)}</strong>
      <div class="popup-meta">OpenHistoricalMap dated feature<br>${escapeHtml(range)}</div>
      <a class="popup-link" href="${escapeHtml(source)}" target="_blank" rel="noreferrer">Open source record</a>
    `)
    .addTo(map);
}

function bindMapInteractions() {
  map.on('click', 'curated-settlement-halo', (event) => {
    const feature = event.features?.[0];
    if (feature) popupForCustomFeature(feature, feature.geometry.coordinates.slice());
  });
  map.on('click', 'wikidata-points', (event) => {
    const feature = event.features?.[0];
    if (feature) popupForCustomFeature(feature, feature.geometry.coordinates.slice());
  });
  map.on('click', 'wikidata-clusters', async (event) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const clusterId = feature.properties.cluster_id;
    const source = map.getSource('wikidata-settlements');
    const zoom = await source.getClusterExpansionZoom(clusterId);
    map.easeTo({ center: feature.geometry.coordinates, zoom });
  });

  ['curated-settlement-halo', 'wikidata-points', 'wikidata-clusters'].forEach((layerId) => {
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  });

  map.on('click', (event) => {
    if (!ohmAvailable || !dom.ohmToggle.checked) return;
    const layers = settlementLayerIds.filter((layerId) => map.getLayer(layerId));
    const features = map.queryRenderedFeatures(event.point, { layers });
    if (features.length) popupForOhmFeature(features[0], event.lngLat);
  });

  map.on('moveend', () => {
    scheduleWikidataLoad(250);
    updateRenderedOhmCount();
  });
  map.on('idle', updateRenderedOhmCount);
}

async function boot() {
  setStatus('Loading historical sources');
  const style = await prepareStyle();
  map = new maplibregl.Map({
    container: 'map',
    style,
    center: [16, 24],
    zoom: 1.65,
    minZoom: 1,
    maxZoom: 16,
    attributionControl: true,
    renderWorldCopies: false
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

  map.on('load', () => {
    mapReady = true;
    addCustomSourcesAndLayers();
    applyHistoricalDateFilter();
    bindMapInteractions();
    updateCuratedLayer();
    updateEraUi();
    scheduleWikidataLoad(250);
    dom.map.classList.add('ready');
    dom.ohmToggle.disabled = !ohmAvailable;
    if (ohmAvailable) {
      setStatus('Live historical tiles connected', 'ready');
    } else {
      setStatus('Historical tiles unavailable - fallback active', 'warn');
      dom.coverageMessage.textContent = 'OpenHistoricalMap could not load. Curated and Wikidata records remain available.';
    }
  });

  map.on('error', (event) => {
    console.warn('Map resource error:', event.error || event);
  });
}

dom.timeSlider.addEventListener('input', () => {
  stopPlayback();
  setYear(dom.timeSlider.value, { fromSlider: true });
});
dom.yearInput.addEventListener('change', () => {
  stopPlayback();
  setYear(dom.yearInput.value);
});
dom.yearInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    dom.yearInput.blur();
    setYear(dom.yearInput.value);
  }
});
dom.evidenceSlider.addEventListener('input', () => {
  updateEraUi();
  updateCuratedLayer();
  scheduleWikidataLoad();
});
dom.playButton.addEventListener('click', togglePlayback);

document.querySelectorAll('[data-year]').forEach((button) => {
  button.addEventListener('click', () => {
    stopPlayback();
    setYear(button.dataset.year);
  });
});

dom.ohmToggle.addEventListener('change', () => {
  setLayerGroupVisibility(settlementLayerIds, dom.ohmToggle.checked);
  updateRenderedOhmCount();
});
dom.buildingToggle.addEventListener('change', () => {
  setLayerGroupVisibility(buildingLayerIds, dom.buildingToggle.checked);
});
dom.curatedToggle.addEventListener('change', () => {
  setLayerGroupVisibility(['curated-settlement-halo', 'curated-settlement-label'], dom.curatedToggle.checked);
  curatedCount = dom.curatedToggle.checked ? curatedFeatureCollection().features.length : 0;
  updateMetrics();
});
dom.wikidataToggle.addEventListener('change', () => {
  setLayerGroupVisibility(['wikidata-clusters', 'wikidata-cluster-count', 'wikidata-points', 'wikidata-labels'], dom.wikidataToggle.checked);
  scheduleWikidataLoad(0);
});

document.querySelector('#aboutButton').addEventListener('click', () => dom.aboutDialog.showModal());
document.querySelector('#closeDialog').addEventListener('click', () => dom.aboutDialog.close());
dom.aboutDialog.addEventListener('click', (event) => {
  if (event.target === dom.aboutDialog) dom.aboutDialog.close();
});

boot();
