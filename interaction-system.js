(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r7';
  const placeSheet = document.querySelector('#placeSheet');
  const placeHandle = document.querySelector('#placeSheetHandle');
  const placeClose = document.querySelector('#placeClose');
  const placeExpand = document.querySelector('#placeExpand');
  const sheetScrim = document.querySelector('#sheetScrim');
  const placeTitle = document.querySelector('#placeTitle');
  const placeEyebrow = document.querySelector('#placeEyebrow');
  const placeSubtitle = document.querySelector('#placeSubtitle');
  const placeSummary = document.querySelector('#placeSummary');
  const placeEvidence = document.querySelector('#placeEvidence');
  const placeContextSource = document.querySelector('#placeContextSource');
  const placeSource = document.querySelector('#placeSource');
  const placeHero = document.querySelector('#placeHero');
  const placeImage = document.querySelector('#placeImage');
  const factRange = document.querySelector('#placeFactRange');
  const factEvidence = document.querySelector('#placeFactEvidence');
  const factConfidence = document.querySelector('#placeFactConfidence');

  const summaryCache = new Map();
  let summaryController = null;
  let touchLayersInstalled = false;
  let mapInteractionsInstalled = false;
  let lastSelectionAt = 0;
  let selectedCoordinates = null;

  function isPlaceOpen() {
    return placeSheet?.dataset.detent && placeSheet.dataset.detent !== 'closed';
  }

  function isControlsOpen() {
    return Boolean(dom.searchShell?.classList.contains('is-open'));
  }

  function updateScrim() {
    const placeDetent = placeSheet?.dataset.detent || 'closed';
    const active = isControlsOpen() || placeDetent === 'medium' || placeDetent === 'full';
    document.body.classList.toggle('sheet-scrim-active', active);
    if (sheetScrim) sheetScrim.tabIndex = active ? 0 : -1;
  }

  function polishedSetSheetOpen(open, { focus = false } = {}) {
    const shouldOpen = Boolean(open);
    if (shouldOpen && isPlaceOpen()) closePlaceCard({ clearSelection: false });
    dom.searchShell.classList.toggle('is-open', shouldOpen);
    dom.searchShell.dataset.detent = shouldOpen ? 'expanded' : 'compact';
    dom.sheetHandle.setAttribute('aria-expanded', String(shouldOpen));
    dom.sheetHandle.setAttribute('aria-label', shouldOpen ? 'Minimize map controls' : 'Expand map controls');
    document.body.classList.toggle('control-sheet-expanded', shouldOpen);
    updateScrim();
    if (focus) requestAnimationFrame(() => dom.historySearch.focus());
  }

  if (typeof setSheetOpen === 'function') setSheetOpen = polishedSetSheetOpen;
  dom.searchShell.dataset.detent = dom.searchShell.classList.contains('is-open') ? 'expanded' : 'compact';

  function setPlaceDetent(detent) {
    if (!placeSheet) return;
    const allowed = ['closed', 'peek', 'medium', 'full'];
    const next = allowed.includes(detent) ? detent : 'closed';
    placeSheet.dataset.detent = next;
    placeSheet.setAttribute('aria-hidden', String(next === 'closed'));
    document.body.classList.toggle('place-card-open', next !== 'closed');
    document.body.classList.toggle('place-detent-peek', next === 'peek');
    document.body.classList.toggle('place-detent-medium', next === 'medium');
    document.body.classList.toggle('place-detent-full', next === 'full');
    if (placeExpand) {
      placeExpand.textContent = next === 'peek' ? 'More details' : next === 'medium' ? 'Expand' : 'Minimize';
    }
    updateScrim();
  }

  function clearSelectionMarker() {
    selectedCoordinates = null;
    if (!mapReady) return;
    const source = map.getSource('worldline-selection');
    if (source) source.setData({ type: 'FeatureCollection', features: [] });
  }

  function updateSelectionMarker(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) return;
    selectedCoordinates = [Number(coordinates[0]), Number(coordinates[1])];
    if (!mapReady) return;
    const source = map.getSource('worldline-selection');
    if (!source) return;
    source.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: selectedCoordinates },
        properties: {}
      }]
    });
  }

  function closePlaceCard({ clearSelection = true } = {}) {
    if (summaryController) summaryController.abort();
    summaryController = null;
    setPlaceDetent('closed');
    if (clearSelection) clearSelectionMarker();
    if (placeHero) {
      placeHero.hidden = true;
      placeHero.classList.remove('is-ready');
    }
  }

  function titleFromWikipediaUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.href);
      if (!/wikipedia\.org$/i.test(url.hostname)) return '';
      const marker = '/wiki/';
      const index = url.pathname.indexOf(marker);
      if (index < 0) return '';
      return decodeURIComponent(url.pathname.slice(index + marker.length)).replaceAll('_', ' ');
    } catch (_) {
      return '';
    }
  }

  function wikidataIdFromValue(value) {
    const match = String(value || '').match(/\bQ\d+\b/i);
    return match ? match[0].toUpperCase() : '';
  }

  function rangeFromProperties(props) {
    if (props.start !== undefined) {
      const start = Number(props.start);
      const end = Number(props.end);
      return `${formatYear(start)} to ${end >= CONFIG.maxYear ? 'present' : formatYear(end)}`;
    }
    const start = props.start_date || props.start_decdate || props.startLabel || 'Unknown start';
    const end = props.end_date || props.end_decdate || props.endLabel || 'present or unknown end';
    return `${start} to ${end}`;
  }

  function confidenceLabel(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0
      ? `${Math.round(number * 100)}% confidence`
      : 'Catalogued record';
  }

  function normalizeCustomFeature(feature, coordinates) {
    const props = feature?.properties || {};
    const sourceUrl = props.source || props.item || '';
    return {
      name: props.name || 'Historical settlement',
      eyebrow: props.kind || props.classLabel || 'Historical place',
      subtitle: rangeFromProperties(props),
      range: rangeFromProperties(props),
      confidence: confidenceLabel(props.confidence),
      evidence: props.evidence || 'catalogued',
      note: props.note || 'Dates and settlement extent may remain approximate.',
      sourceUrl,
      wikiTitle: titleFromWikipediaUrl(sourceUrl),
      wikidata: wikidataIdFromValue(props.wikidata || props.item),
      coordinates
    };
  }

  function normalizeOhmFeature(feature, coordinates) {
    const props = feature?.properties || {};
    const name = props.name || props.name_en || props.wikidata || 'Historical settlement';
    const sourceUrl = props['source:url'] || props.source_url || (props.wikidata
      ? `https://www.wikidata.org/wiki/${props.wikidata}`
      : 'https://www.openhistoricalmap.org');
    return {
      name,
      eyebrow: 'OpenHistoricalMap feature',
      subtitle: rangeFromProperties(props),
      range: rangeFromProperties(props),
      confidence: 'Source-dated feature',
      evidence: 'mapped record',
      note: props.note || 'Feature dates and geometry provenance should be checked in the source record.',
      sourceUrl,
      wikiTitle: titleFromWikipediaUrl(sourceUrl),
      wikidata: wikidataIdFromValue(props.wikidata),
      coordinates
    };
  }

  function populatePlaceCard(model) {
    placeTitle.textContent = model.name;
    placeEyebrow.textContent = model.eyebrow || 'Historical place';
    placeSubtitle.textContent = model.subtitle || formatYear(selectedYear);
    factRange.textContent = model.range || formatYear(selectedYear);
    factEvidence.textContent = model.evidence || 'Historical record';
    factConfidence.textContent = model.confidence || 'Confidence not scored';
    placeEvidence.textContent = model.note || 'Historical evidence is incomplete and may support multiple interpretations.';
    placeContextSource.textContent = 'Loading a concise historical synopsis...';
    placeSummary.textContent = 'Loading historical context';
    placeSummary.classList.add('is-loading');

    if (model.sourceUrl) {
      placeSource.href = model.sourceUrl;
      placeSource.hidden = false;
    } else {
      placeSource.removeAttribute('href');
      placeSource.hidden = true;
    }

    placeHero.hidden = true;
    placeHero.classList.remove('is-ready');
    placeImage.removeAttribute('src');
    placeImage.alt = '';
  }

  async function fetchPlaceSummary(model) {
    const key = `${model.wikidata || ''}|${model.wikiTitle || ''}|${model.name}`;
    if (summaryCache.has(key)) return summaryCache.get(key);

    const params = new URLSearchParams({ name: model.name });
    if (model.wikiTitle) params.set('title', model.wikiTitle);
    if (model.wikidata) params.set('wikidata', model.wikidata);

    summaryController = new AbortController();
    const response = await fetch(`/api/place-summary?${params}`, { signal: summaryController.signal });
    if (!response.ok) throw new Error(`Summary request returned ${response.status}`);
    const result = await response.json();
    summaryCache.set(key, result);
    return result;
  }

  async function loadPlaceSummary(model) {
    try {
      const result = await fetchPlaceSummary(model);
      if (!isPlaceOpen() || placeTitle.textContent !== model.name) return;
      placeSummary.classList.remove('is-loading');
      placeSummary.textContent = result.extract || model.note || 'A concise historical synopsis is not available for this record yet.';
      placeContextSource.textContent = result.pageUrl
        ? 'Historical synopsis from English Wikipedia. Atlas dates and evidence remain independently sourced.'
        : 'Atlas record summary. Additional historical context is still being reviewed.';

      if (!model.sourceUrl && result.pageUrl) {
        placeSource.href = result.pageUrl;
        placeSource.hidden = false;
      }

      if (result.thumbnail) {
        placeHero.hidden = false;
        placeImage.onload = () => placeHero.classList.add('is-ready');
        placeImage.src = result.thumbnail;
        placeImage.alt = result.title ? `${result.title} reference image` : `${model.name} reference image`;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.warn('Historical synopsis unavailable:', error);
      placeSummary.classList.remove('is-loading');
      placeSummary.textContent = model.note || 'A concise historical synopsis is not available for this record yet.';
      placeContextSource.textContent = 'Synopsis service unavailable. The mapped evidence remains accessible through the source record.';
    }
  }

  function openPlaceCard(model) {
    if (!model?.name) return;
    lastSelectionAt = performance.now();
    polishedSetSheetOpen(false);
    populatePlaceCard(model);
    updateSelectionMarker(model.coordinates);
    setPlaceDetent('peek');
    loadPlaceSummary(model);

    if (mapReady && Array.isArray(model.coordinates)) {
      const zoom = map.getZoom();
      const offsetY = window.matchMedia('(max-width: 720px)').matches ? -85 : 0;
      map.easeTo({
        center: model.coordinates,
        zoom: Math.max(zoom, 1.25),
        offset: [0, offsetY],
        duration: 520,
        essential: true
      });
    }
  }

  globalThis.openPlaceCard = openPlaceCard;
  globalThis.closePlaceCard = closePlaceCard;

  if (typeof popupForCustomFeature === 'function') {
    popupForCustomFeature = function polishedCustomFeature(feature, coordinates) {
      openPlaceCard(normalizeCustomFeature(feature, coordinates));
    };
  }

  if (typeof popupForOhmFeature === 'function') {
    popupForOhmFeature = function polishedOhmFeature(feature, coordinates) {
      const lngLat = Array.isArray(coordinates)
        ? coordinates
        : [coordinates.lng, coordinates.lat];
      openPlaceCard(normalizeOhmFeature(feature, lngLat));
    };
  }

  function installTouchLayers() {
    if (!mapReady || touchLayersInstalled) return false;
    const curatedSource = map.getSource('curated-settlements');
    if (!curatedSource) return false;

    if (map.getLayer('curated-settlement-halo')) {
      map.setPaintProperty('curated-settlement-halo', 'circle-radius', [
        'interpolate', ['linear'], ['zoom'],
        0, 5.2,
        1.5, 6,
        5, 7.5,
        10, 10.5
      ]);
      map.setPaintProperty('curated-settlement-halo', 'circle-stroke-width', [
        'interpolate', ['linear'], ['zoom'], 0, 1.6, 6, 2.2
      ]);
    }

    if (map.getLayer('curated-settlement-label')) {
      try { map.setLayerZoomRange('curated-settlement-label', 1.15, 24); } catch (_) {}
      map.setLayoutProperty('curated-settlement-label', 'text-size', [
        'interpolate', ['linear'], ['zoom'], 1.15, 10.5, 5, 12.5, 10, 14
      ]);
    }

    if (!map.getLayer('curated-settlement-hit')) {
      map.addLayer({
        id: 'curated-settlement-hit',
        type: 'circle',
        source: 'curated-settlements',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 22, 6, 26, 12, 30],
          'circle-color': 'rgba(255,255,255,0.01)',
          'circle-stroke-opacity': 0
        }
      });
    }

    if (map.getSource('wikidata-settlements') && !map.getLayer('wikidata-hit')) {
      map.addLayer({
        id: 'wikidata-hit',
        type: 'circle',
        source: 'wikidata-settlements',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 20, 9, 25, 14, 29],
          'circle-color': 'rgba(255,255,255,0.01)',
          'circle-stroke-opacity': 0
        }
      });
    }

    if (!map.getSource('worldline-selection')) {
      map.addSource('worldline-selection', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    if (!map.getLayer('worldline-selection-ring')) {
      map.addLayer({
        id: 'worldline-selection-ring',
        type: 'circle',
        source: 'worldline-selection',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 9, 8, 15, 14, 22],
          'circle-color': 'rgba(10,132,255,.12)',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.4,
          'circle-stroke-opacity': .96
        }
      });
    }

    if (!map.getLayer('worldline-selection-core')) {
      map.addLayer({
        id: 'worldline-selection-core',
        type: 'circle',
        source: 'worldline-selection',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 8, 6.5, 14, 9],
          'circle-color': '#0a84ff',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.4
        }
      });
    }

    touchLayersInstalled = true;
    return true;
  }

  function selectableLayers() {
    const ids = [
      'curated-settlement-hit',
      'curated-settlement-halo',
      'wikidata-hit',
      'wikidata-points'
    ];
    if (Array.isArray(settlementLayerIds)) ids.push(...settlementLayerIds);
    return ids.filter((id) => map.getLayer(id));
  }

  function bestFeatureNear(point) {
    const radius = window.matchMedia('(pointer: coarse)').matches ? 25 : 12;
    const box = [
      [point.x - radius, point.y - radius],
      [point.x + radius, point.y + radius]
    ];
    const layers = selectableLayers();
    if (!layers.length) return null;
    const features = map.queryRenderedFeatures(box, { layers });
    if (!features.length) return null;

    return features.find((feature) => feature.source === 'curated-settlements')
      || features.find((feature) => feature.source === 'wikidata-settlements')
      || features[0];
  }

  function openQueriedFeature(feature) {
    if (!feature) return false;
    const coordinates = feature.geometry?.type === 'Point'
      ? feature.geometry.coordinates.slice()
      : null;
    if (!coordinates) return false;

    if (feature.source === 'curated-settlements' || feature.source === 'wikidata-settlements') {
      openPlaceCard(normalizeCustomFeature(feature, coordinates));
    } else {
      openPlaceCard(normalizeOhmFeature(feature, coordinates));
    }
    return true;
  }

  function bindPolishedMapInteractions() {
    if (!mapReady || mapInteractionsInstalled) return false;
    installTouchLayers();

    map.on('click', (event) => {
      if (performance.now() - lastSelectionAt < 120) return;
      const feature = bestFeatureNear(event.point);
      if (openQueriedFeature(feature)) return;
      if (isPlaceOpen()) closePlaceCard();
      if (isControlsOpen()) polishedSetSheetOpen(false);
    });

    mapInteractionsInstalled = true;
    return true;
  }

  function cyclePlaceDetent() {
    const detent = placeSheet.dataset.detent;
    if (detent === 'peek') setPlaceDetent('medium');
    else if (detent === 'medium') setPlaceDetent('full');
    else if (detent === 'full') setPlaceDetent('peek');
  }

  function shiftPlaceDetent(direction) {
    const order = ['closed', 'peek', 'medium', 'full'];
    const current = order.indexOf(placeSheet.dataset.detent || 'closed');
    const next = Math.max(0, Math.min(order.length - 1, current + direction));
    if (next === 0) closePlaceCard();
    else setPlaceDetent(order[next]);
  }

  function bindPlaceDrag() {
    if (!placeHandle || !placeSheet) return;
    let startY = 0;
    let startTime = 0;
    let moved = false;

    placeHandle.addEventListener('pointerdown', (event) => {
      startY = event.clientY;
      startTime = performance.now();
      moved = false;
      placeSheet.classList.add('is-dragging');
      placeHandle.setPointerCapture?.(event.pointerId);
    });

    placeHandle.addEventListener('pointermove', (event) => {
      if (!placeSheet.classList.contains('is-dragging')) return;
      const delta = event.clientY - startY;
      if (Math.abs(delta) > 5) moved = true;
      placeSheet.style.setProperty('--sheet-drag-y', `${Math.max(-90, delta)}px`);
      event.preventDefault();
    });

    function release(event) {
      if (!placeSheet.classList.contains('is-dragging')) return;
      const delta = event.clientY - startY;
      const elapsed = Math.max(1, performance.now() - startTime);
      const velocity = delta / elapsed;
      placeSheet.classList.remove('is-dragging');
      placeSheet.style.setProperty('--sheet-drag-y', '0px');

      if (!moved) {
        cyclePlaceDetent();
      } else if (delta > 42 || velocity > .45) {
        shiftPlaceDetent(-1);
      } else if (delta < -42 || velocity < -.45) {
        shiftPlaceDetent(1);
      }
    }

    placeHandle.addEventListener('pointerup', release);
    placeHandle.addEventListener('pointercancel', release);
  }

  function bindControlHandleDrag() {
    const handle = dom.sheetHandle;
    if (!handle) return;
    let startY = 0;
    let dragged = false;

    handle.addEventListener('pointerdown', (event) => {
      startY = event.clientY;
      dragged = false;
      handle.setPointerCapture?.(event.pointerId);
    });

    handle.addEventListener('pointermove', (event) => {
      const delta = event.clientY - startY;
      if (Math.abs(delta) < 18) return;
      dragged = true;
      if (delta > 0) polishedSetSheetOpen(false);
      else polishedSetSheetOpen(true);
    });

    handle.addEventListener('click', (event) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dragged = false;
    }, true);
  }

  sheetScrim?.addEventListener('click', () => {
    if (isControlsOpen()) polishedSetSheetOpen(false);
    else if (isPlaceOpen()) closePlaceCard();
  });

  placeClose?.addEventListener('click', () => closePlaceCard());
  placeExpand?.addEventListener('click', () => cyclePlaceDetent());

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (isPlaceOpen()) closePlaceCard();
    else if (isControlsOpen()) polishedSetSheetOpen(false);
  });

  bindPlaceDrag();
  bindControlHandleDrag();

  const installer = setInterval(() => {
    const layersReady = installTouchLayers();
    const interactionsReady = bindPolishedMapInteractions();
    if (layersReady && interactionsReady) {
      clearInterval(installer);
      if (selectedCoordinates) updateSelectionMarker(selectedCoordinates);
    }
  }, 100);

  window.__WORLDLINE_INTERACTION_BUILD__ = BUILD;
})();
