function curatedFeatureCollection() {
  const mode = currentMode();
  const features = data.settlements
    .filter((site) => site.confidence >= mode.threshold)
    .filter((site) => selectedYear >= site.start && selectedYear <= site.end)
    .map((site, index) => ({
      type: 'Feature',
      id: `curated-${index}`,
      geometry: { type: 'Point', coordinates: site.coordinates },
      properties: {
        name: site.name,
        start: site.start,
        end: site.end,
        confidence: site.confidence,
        evidence: site.evidence,
        kind: site.kind,
        note: site.note,
        source: site.source
      }
    }));
  curatedCount = features.length;
  return { type: 'FeatureCollection', features };
}

function addCustomSourcesAndLayers() {
  map.addSource('curated-settlements', { type: 'geojson', data: curatedFeatureCollection() });
  map.addLayer({
    id: 'curated-settlement-halo',
    type: 'circle',
    source: 'curated-settlements',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3, 8, 8, 13, 11],
      'circle-color': ['match', ['get', 'evidence'], 'attested', '#ffb96b', '#ffd8a7'],
      'circle-opacity': ['interpolate', ['linear'], ['get', 'confidence'], 0.35, 0.48, 1, 0.95],
      'circle-stroke-color': '#071014',
      'circle-stroke-width': 2
    }
  });
  map.addLayer({
    id: 'curated-settlement-label',
    type: 'symbol',
    source: 'curated-settlements',
    minzoom: 3.2,
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 12,
      'text-offset': [0, 1.15],
      'text-anchor': 'top',
      'text-allow-overlap': false
    },
    paint: {
      'text-color': '#fff4df',
      'text-halo-color': 'rgba(4, 11, 14, 0.96)',
      'text-halo-width': 1.5
    }
  });

  map.addSource('wikidata-settlements', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 9,
    clusterRadius: 46
  });
  map.addLayer({
    id: 'wikidata-clusters',
    type: 'circle',
    source: 'wikidata-settlements',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#75dfff',
      'circle-opacity': 0.78,
      'circle-radius': ['step', ['get', 'point_count'], 15, 20, 20, 80, 27],
      'circle-stroke-color': '#071014',
      'circle-stroke-width': 2
    }
  });
  map.addLayer({
    id: 'wikidata-cluster-count',
    type: 'symbol',
    source: 'wikidata-settlements',
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 11 },
    paint: { 'text-color': '#071014' }
  });
  map.addLayer({
    id: 'wikidata-points',
    type: 'circle',
    source: 'wikidata-settlements',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#75dfff',
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3.5, 10, 7],
      'circle-opacity': ['interpolate', ['linear'], ['get', 'confidence'], 0.4, 0.45, 1, 0.9],
      'circle-stroke-color': '#071014',
      'circle-stroke-width': 1.5
    }
  });
  map.addLayer({
    id: 'wikidata-labels',
    type: 'symbol',
    source: 'wikidata-settlements',
    minzoom: 6,
    filter: ['!', ['has', 'point_count']],
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 11,
      'text-offset': [0, 1.1],
      'text-anchor': 'top'
    },
    paint: {
      'text-color': '#dff8ff',
      'text-halo-color': 'rgba(4, 11, 14, 0.96)',
      'text-halo-width': 1.4
    }
  });
}

function updateCuratedLayer() {
  if (!mapReady) return;
  const source = map.getSource('curated-settlements');
  const collection = curatedFeatureCollection();
  if (!dom.curatedToggle.checked) curatedCount = 0;
  if (source) source.setData(collection);
  updateMetrics();
}

function setLayerGroupVisibility(layerIds, visible) {
  if (!mapReady) return;
  layerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  });
}

function isEarthHistoryActive() {
  return globalThis.WorldlineEarthHistory?.getMode?.() === 'earth';
}

function updateMetrics() {
  if (isEarthHistoryActive()) return;
  const total = renderedOhmCount + curatedCount + catalogCount;
  dom.visibleCount.textContent = total.toLocaleString();
  dom.catalogCount.textContent = catalogCount.toLocaleString();
}

function updateRenderedOhmCount() {
  if (isEarthHistoryActive()) return;
  if (!mapReady || !ohmAvailable || !dom.ohmToggle.checked) {
    renderedOhmCount = 0;
    updateMetrics();
    return;
  }
  const usableLayers = settlementLayerIds.filter((layerId) => map.getLayer(layerId));
  if (!usableLayers.length) return;
  const features = map.queryRenderedFeatures({ layers: usableLayers });
  const unique = new Set(features.map((feature) => feature.id ?? `${feature.sourceLayer}-${feature.properties?.name || ''}-${JSON.stringify(feature.geometry)}`));
  renderedOhmCount = unique.size;
  updateMetrics();
}

function boundsForQuery() {
  const bounds = map.getBounds();
  const west = Math.max(-180, bounds.getWest());
  const east = Math.min(180, bounds.getEast());
  const south = Math.max(-85, bounds.getSouth());
  const north = Math.min(85, bounds.getNorth());
  return { west, east, south, north, width: east - west, height: north - south };
}

function clearWikidata(message) {
  catalogCount = 0;
  const source = mapReady && map.getSource('wikidata-settlements');
  if (source) source.setData({ type: 'FeatureCollection', features: [] });
  dom.coverageMessage.textContent = message;
  updateMetrics();
}

async function loadWikidataSettlements() {
  if (isEarthHistoryActive()) {
    clearWikidata('Human settlement catalogs pause while Earth History is active.');
    return;
  }
  if (!mapReady || !dom.wikidataToggle.checked) {
    clearWikidata('Live catalog layer is turned off.');
    return;
  }
  if (map.getZoom() < CONFIG.wikidataMinZoom) {
    clearWikidata('Zoom into a region to load additional catalogued settlements.');
    return;
  }

  const bounds = boundsForQuery();
  if (bounds.width <= 0 || bounds.width > CONFIG.wikidataMaxWidth || bounds.height > CONFIG.wikidataMaxHeight) {
    clearWikidata('The visible area is too large for a responsible live query. Zoom in further.');
    return;
  }

  if (wikidataAbortController) wikidataAbortController.abort();
  wikidataAbortController = new AbortController();
  dom.coverageMessage.textContent = 'Querying Wikidata for dated settlements in the visible area...';

  const params = new URLSearchParams({
    west: bounds.west.toFixed(5),
    east: bounds.east.toFixed(5),
    south: bounds.south.toFixed(5),
    north: bounds.north.toFixed(5),
    year: String(selectedYear),
    mode: currentMode().key
  });

  try {
    const response = await fetch(`/api/settlements?${params}`, { signal: wikidataAbortController.signal });
    if (!response.ok) throw new Error(`Catalog request returned ${response.status}`);
    const result = await response.json();
    const collection = result.collection || { type: 'FeatureCollection', features: [] };
    catalogCount = collection.features.length;
    map.getSource('wikidata-settlements').setData(collection);
    dom.coverageMessage.textContent = catalogCount
      ? `${catalogCount.toLocaleString()} dated Wikidata records loaded for this view.`
      : 'No compatible dated Wikidata settlements were returned for this view and year.';
    updateMetrics();
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.warn('Wikidata settlement query failed:', error);
    clearWikidata('The live catalog could not be reached. OpenHistoricalMap and curated sites remain available.');
  }
}

function scheduleWikidataLoad(delay = 420) {
  clearTimeout(wikidataDebounce);
  wikidataDebounce = setTimeout(loadWikidataSettlements, delay);
}
