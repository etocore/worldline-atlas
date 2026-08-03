function updateEraUi() {
  const era = currentEra();
  const date = formatYear(selectedYear);
  dom.yearLabel.textContent = date;
  dom.timelineDate.textContent = date;
  dom.searchContextYear.textContent = date;
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

function setSheetOpen(open, { focus = false } = {}) {
  dom.searchShell.classList.toggle('is-open', open);
  dom.sheetHandle.setAttribute('aria-expanded', String(open));
  dom.sheetHandle.setAttribute('aria-label', open ? 'Collapse map controls' : 'Expand map controls');
  if (focus) requestAnimationFrame(() => dom.historySearch.focus());
}

function showSearchFeedback(message) {
  dom.searchFeedback.textContent = message;
  dom.searchFeedback.classList.toggle('has-message', Boolean(message));
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

function extractYearFromQuery(query) {
  const eraMatch = query.match(/(-?\d{1,5})\s*(BCE|BC|CE|AD)\b/i);
  if (eraMatch) {
    const magnitude = Math.abs(Number(eraMatch[1]));
    return /BCE|BC/i.test(eraMatch[2]) ? -magnitude : magnitude;
  }
  const signedMatch = query.match(/(?:^|\s)(-\d{1,5})(?:\s|$)/);
  return signedMatch ? Number(signedMatch[1]) : null;
}

function placeTermFromQuery(query) {
  return query
    .replace(/-?\d{1,5}\s*(BCE|BC|CE|AD)\b/ig, ' ')
    .replace(/(?:^|\s)-\d{1,5}(?:\s|$)/g, ' ')
    .replace(/\b(show|take|bring|find|search|tell|what|was|were|did|does|look|like|me|to|in|during|around|at|the|a|an|map|year|history|historical|of)\b/ig, ' ')
    .replace(/[^\p{L}\p{N}\s.'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findReviewedSettlement(term) {
  if (!term) return null;
  const candidates = data.settlements.map((site) => ({ site, name: site.name.toLowerCase() }));
  return candidates.find(({ name }) => name === term)?.site
    || candidates.find(({ name }) => name.startsWith(term) || term.startsWith(name))?.site
    || candidates.find(({ name }) => name.includes(term) || term.includes(name))?.site
    || null;
}

function runHistorySearch() {
  const query = dom.historySearch.value.trim();
  setSheetOpen(true);
  if (!query) {
    showSearchFeedback('Try “Rome 117 CE”, “Çatalhöyük 7000 BCE”, or enter a year.');
    return;
  }

  const requestedYear = extractYearFromQuery(query);
  const placeTerm = placeTermFromQuery(query);
  const site = findReviewedSettlement(placeTerm);

  if (requestedYear !== null) setYear(requestedYear);

  if (site) {
    if (requestedYear === null && (selectedYear < site.start || selectedYear > site.end)) {
      const representativeYear = Math.max(CONFIG.minYear, Math.min(CONFIG.maxYear, site.start));
      setYear(representativeYear);
    }
    if (mapReady) {
      map.flyTo({
        center: site.coordinates,
        zoom: Math.max(5.6, Math.min(8, map.getZoom() + 3.5)),
        bearing: 0,
        pitch: 28,
        duration: 1700,
        essential: true
      });
    }
    showSearchFeedback(`Showing ${site.name} in ${formatYear(selectedYear)}. This search currently matches reviewed atlas records.`);
    return;
  }

  if (requestedYear !== null) {
    showSearchFeedback(`Timeline set to ${formatYear(selectedYear)}. Place and natural-language research search is the next system layer.`);
    return;
  }

  showSearchFeedback('No reviewed place matched yet. In the next phase, unmatched prompts will become research requests instead of dead ends.');
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
  setStatus('Loading sources');
  const style = await prepareStyle();
  map = new maplibregl.Map({
    container: 'map',
    style,
    center: CONFIG.worldView.center,
    zoom: CONFIG.worldView.zoom,
    bearing: CONFIG.worldView.bearing,
    pitch: CONFIG.worldView.pitch,
    minZoom: 0,
    maxZoom: 16,
    maxPitch: 70,
    attributionControl: false,
    renderWorldCopies: false,
    canvasContextAttributes: { antialias: true, alpha: true }
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

  map.on('style.load', () => {
    try { map.setProjection({ type: 'globe' }); } catch (error) { console.warn('Globe projection unavailable:', error); }
  });

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
      setStatus('Historical tiles connected', 'ready');
    } else {
      setStatus('Fallback sources active', 'warn');
      dom.coverageMessage.textContent = 'OpenHistoricalMap could not load. Reviewed and Wikidata records remain available.';
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

dom.sheetHandle.addEventListener('click', () => setSheetOpen(!dom.searchShell.classList.contains('is-open')));
dom.sheetClose.addEventListener('click', () => setSheetOpen(false));
dom.brandButton.addEventListener('click', () => setSheetOpen(true));
dom.yearButton.addEventListener('click', () => {
  setSheetOpen(true);
  requestAnimationFrame(() => document.querySelector('#timelineControls')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
});
dom.searchContextButton.addEventListener('click', () => {
  setSheetOpen(true);
  requestAnimationFrame(() => document.querySelector('#timelineControls')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
});
dom.historySearch.addEventListener('focus', () => setSheetOpen(true));
dom.historySearch.addEventListener('input', () => showSearchFeedback(''));
dom.historySearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    runHistorySearch();
  }
});
dom.searchSubmit.addEventListener('click', runHistorySearch);

dom.globeButton.addEventListener('click', () => {
  if (!mapReady) return;
  setSheetOpen(false);
  map.easeTo({ ...CONFIG.worldView, duration: 1200, essential: true });
});
dom.northButton.addEventListener('click', () => {
  if (!mapReady) return;
  map.easeTo({ bearing: 0, pitch: 0, duration: 700, essential: true });
});

document.querySelector('#aboutButton').addEventListener('click', () => dom.aboutDialog.showModal());
document.querySelector('#closeDialog').addEventListener('click', () => dom.aboutDialog.close());
dom.aboutDialog.addEventListener('click', (event) => {
  if (event.target === dom.aboutDialog) dom.aboutDialog.close();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !dom.aboutDialog.open) setSheetOpen(false);
});

updateEraUi();
boot();
