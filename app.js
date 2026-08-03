const eras = window.WORLDLINE_DATA.eras;
const timeSlider = document.querySelector('#timeSlider');
const evidenceSlider = document.querySelector('#evidenceSlider');
const yearLabel = document.querySelector('#yearLabel');
const timelineDate = document.querySelector('#timelineDate');
const eraLabel = document.querySelector('#eraLabel');
const eraSummary = document.querySelector('#eraSummary');
const evidenceValue = document.querySelector('#evidenceValue');
const confidenceLabel = document.querySelector('#confidenceLabel');
const confidenceFill = document.querySelector('#confidenceFill');
const playButton = document.querySelector('#playButton');
const aboutDialog = document.querySelector('#aboutDialog');

let currentEraIndex = Number(timeSlider.value);
let playTimer = null;
let mapReady = false;

const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/dark',
  center: eras[currentEraIndex].camera.center,
  zoom: eras[currentEraIndex].camera.zoom,
  attributionControl: true
});

map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

function formatYear(year) {
  if (year < 0) return `${Math.abs(year).toLocaleString()} BCE`;
  if (year === 0) return '1 BCE / 1 CE';
  return `${year.toLocaleString()} CE`;
}

function evidenceThreshold() {
  return Number(evidenceSlider.value) / 100;
}

function confidenceCopy(value) {
  if (value < 0.3) return 'Documented only';
  if (value < 0.65) return 'Balanced';
  return 'Reconstructed';
}

function visibleByEvidence(feature) {
  if (feature.evidence === 'attested') return true;
  if (feature.evidence === 'reconstruction') return evidenceThreshold() >= 0.28;
  return evidenceThreshold() >= 0.72;
}

function toCollection(type) {
  const era = eras[currentEraIndex];
  return {
    type: 'FeatureCollection',
    features: era.features
      .filter((feature) => feature.type === type && visibleByEvidence(feature))
      .map((feature, index) => ({
        type: 'Feature',
        id: `${currentEraIndex}-${type}-${index}`,
        properties: {
          name: feature.name,
          evidence: feature.evidence,
          confidence: feature.confidence
        },
        geometry: feature.geometry
      }))
  };
}

function sourceId(type) {
  return `historical-${type}`;
}

function setSource(type) {
  const source = map.getSource(sourceId(type));
  if (source) source.setData(toCollection(type));
}

function addHistoricalLayers() {
  ['region', 'route', 'city'].forEach((type) => {
    map.addSource(sourceId(type), { type: 'geojson', data: toCollection(type) });
  });

  map.addLayer({
    id: 'historical-regions-fill',
    type: 'fill',
    source: sourceId('region'),
    paint: {
      'fill-color': [
        'match', ['get', 'evidence'],
        'attested', '#d8ff61',
        'reconstruction', '#d5a86e',
        '#e8e8e8'
      ],
      'fill-opacity': [
        'match', ['get', 'evidence'],
        'attested', 0.27,
        'reconstruction', 0.2,
        0.1
      ]
    }
  });

  map.addLayer({
    id: 'historical-regions-line',
    type: 'line',
    source: sourceId('region'),
    paint: {
      'line-color': [
        'match', ['get', 'evidence'],
        'attested', '#d8ff61',
        'reconstruction', '#d5a86e',
        '#eeeeee'
      ],
      'line-width': 1.5,
      'line-dasharray': [2, 1]
    }
  });

  map.addLayer({
    id: 'historical-routes',
    type: 'line',
    source: sourceId('route'),
    paint: {
      'line-color': '#d8ff61',
      'line-width': 2.2,
      'line-opacity': 0.8,
      'line-dasharray': [1.5, 1.2]
    }
  });

  map.addLayer({
    id: 'historical-cities',
    type: 'circle',
    source: sourceId('city'),
    paint: {
      'circle-radius': 6,
      'circle-color': '#f3efe4',
      'circle-stroke-color': '#0b0d0d',
      'circle-stroke-width': 2
    }
  });

  map.addLayer({
    id: 'historical-city-labels',
    type: 'symbol',
    source: sourceId('city'),
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 12,
      'text-offset': [0, 1.3],
      'text-anchor': 'top'
    },
    paint: {
      'text-color': '#f3efe4',
      'text-halo-color': '#0b0d0d',
      'text-halo-width': 1.2
    }
  });

  ['historical-regions-fill', 'historical-routes', 'historical-cities'].forEach((layerId) => {
    map.on('click', layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const coordinates = event.lngLat;
      const confidence = Math.round(Number(feature.properties.confidence) * 100);
      new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
        .setLngLat(coordinates)
        .setHTML(`<strong>${feature.properties.name}</strong><br><span>${feature.properties.evidence} · ${confidence}% confidence</span>`)
        .addTo(map);
    });
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  });
}

function updateMapData() {
  if (!mapReady) return;
  setSource('region');
  setSource('route');
  setSource('city');
}

function updateEra({ animate = true } = {}) {
  currentEraIndex = Number(timeSlider.value);
  const era = eras[currentEraIndex];
  const date = formatYear(era.year);
  yearLabel.textContent = date;
  timelineDate.textContent = date;
  eraLabel.textContent = era.label;
  eraSummary.textContent = era.summary;
  updateMapData();

  if (mapReady) {
    map[animate ? 'easeTo' : 'jumpTo']({
      center: era.camera.center,
      zoom: era.camera.zoom,
      duration: animate ? 950 : 0
    });
  }
}

function updateEvidence() {
  const value = evidenceThreshold();
  const label = confidenceCopy(value);
  evidenceValue.textContent = label;
  confidenceLabel.textContent = label;
  confidenceFill.style.width = `${Math.round(value * 100)}%`;
  updateMapData();
}

function stopPlayback() {
  if (!playTimer) return;
  clearInterval(playTimer);
  playTimer = null;
  playButton.textContent = '▶';
  playButton.setAttribute('aria-label', 'Play timeline');
}

function togglePlayback() {
  if (playTimer) {
    stopPlayback();
    return;
  }
  playButton.textContent = 'Ⅱ';
  playButton.setAttribute('aria-label', 'Pause timeline');
  playTimer = setInterval(() => {
    const next = (Number(timeSlider.value) + 1) % eras.length;
    timeSlider.value = String(next);
    updateEra();
  }, 2200);
}

function setLayerVisibility(group, visible) {
  const groups = {
    regions: ['historical-regions-fill', 'historical-regions-line'],
    cities: ['historical-cities', 'historical-city-labels'],
    routes: ['historical-routes']
  };
  (groups[group] || []).forEach((layerId) => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  });
}

map.on('load', () => {
  mapReady = true;
  addHistoricalLayers();
  updateEra({ animate: false });
  updateEvidence();
});

timeSlider.addEventListener('input', () => {
  stopPlayback();
  updateEra();
});
evidenceSlider.addEventListener('input', updateEvidence);
playButton.addEventListener('click', togglePlayback);

document.querySelectorAll('[data-layer]').forEach((checkbox) => {
  checkbox.addEventListener('change', () => setLayerVisibility(checkbox.dataset.layer, checkbox.checked));
});

document.querySelector('#aboutButton').addEventListener('click', () => aboutDialog.showModal());
document.querySelector('#closeDialog').addEventListener('click', () => aboutDialog.close());
aboutDialog.addEventListener('click', (event) => {
  if (event.target === aboutDialog) aboutDialog.close();
});
