const CONFIG = {
  ohmStyleUrl: 'https://unpkg.com/@openhistoricalmap/map-styles@0.9.17/dist/historical/historical.json',
  satelliteTiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg'],
  minYear: -15000,
  maxYear: 2026,
  wikidataMinZoom: 3,
  wikidataMaxWidth: 85,
  wikidataMaxHeight: 60,
  worldView: { center: [-82, 21], zoom: 0.15, bearing: 0, pitch: 0 }
};

const data = window.WORLDLINE_DATA;
const dom = {
  map: document.querySelector('#map'),
  searchShell: document.querySelector('#searchShell'),
  sheetHandle: document.querySelector('#sheetHandle'),
  sheetClose: document.querySelector('#sheetClose'),
  historySearch: document.querySelector('#historySearch'),
  searchSubmit: document.querySelector('#searchSubmit'),
  searchFeedback: document.querySelector('#searchFeedback'),
  searchContextButton: document.querySelector('#searchContextButton'),
  searchContextYear: document.querySelector('#searchContextYear'),
  brandButton: document.querySelector('#brandButton'),
  yearButton: document.querySelector('#yearButton'),
  globeButton: document.querySelector('#globeButton'),
  northButton: document.querySelector('#northButton'),
  sourceStatus: document.querySelector('#sourceStatus'),
  yearLabel: document.querySelector('#yearLabel'),
  timelineDate: document.querySelector('#timelineDate'),
  eraLabel: document.querySelector('#eraLabel'),
  eraSummary: document.querySelector('#eraSummary'),
  visibleCount: document.querySelector('#visibleCount'),
  catalogCount: document.querySelector('#catalogCount'),
  evidenceLabel: document.querySelector('#evidenceLabel'),
  coverageMessage: document.querySelector('#coverageMessage'),
  timeSlider: document.querySelector('#timeSlider'),
  yearInput: document.querySelector('#yearInput'),
  evidenceSlider: document.querySelector('#evidenceSlider'),
  evidenceValue: document.querySelector('#evidenceValue'),
  playButton: document.querySelector('#playButton'),
  ohmToggle: document.querySelector('#ohmToggle'),
  curatedToggle: document.querySelector('#curatedToggle'),
  wikidataToggle: document.querySelector('#wikidataToggle'),
  buildingToggle: document.querySelector('#buildingToggle'),
  aboutDialog: document.querySelector('#aboutDialog')
};

const evidenceModes = [
  { key: 'strict', label: 'Strict', threshold: 0.84 },
  { key: 'balanced', label: 'Balanced', threshold: 0.64 },
  { key: 'broad', label: 'Broad', threshold: 0.38 }
];

let selectedYear = 117;
let map;
let mapReady = false;
let ohmAvailable = false;
let settlementLayerIds = [];
let buildingLayerIds = [];
let originalFilters = new Map();
let playbackTimer = null;
let wikidataAbortController = null;
let wikidataDebounce = null;
let renderedOhmCount = 0;
let curatedCount = 0;
let catalogCount = 0;

function formatYear(year) {
  const value = Math.trunc(Number(year));
  if (value < 0) return `${Math.abs(value).toLocaleString()} BCE`;
  if (value === 0) return '1 BCE / 1 CE';
  return `${value.toLocaleString()} CE`;
}

function currentMode() {
  return evidenceModes[Number(dom.evidenceSlider.value)] || evidenceModes[1];
}

function currentEra() {
  return data.eras.find((era) => selectedYear >= era.min && selectedYear <= era.max) || data.eras[data.eras.length - 1];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setStatus(text, state = '') {
  dom.sourceStatus.textContent = text;
  dom.sourceStatus.className = `status-pill ${state}`.trim();
}

function isSettlementLayer(layer) {
  const text = `${layer.id} ${layer['source-layer'] || ''}`.toLowerCase();
  const includesSettlement = /(settlement|place|city|town|village|hamlet|locality|suburb|neighbourhood|borough|quarter)/.test(text);
  const excludesOtherFeatures = /(boundary|road|route|rail|station|airport|water|peak|mountain|park|amenity|building|address)/.test(text);
  return includesSettlement && !excludesOtherFeatures && ['symbol', 'circle'].includes(layer.type);
}

function isBuildingLayer(layer) {
  const text = `${layer.id} ${layer['source-layer'] || ''}`.toLowerCase();
  return /building/.test(text) && ['fill', 'line'].includes(layer.type);
}

function styleSettlementLayer(layer) {
  const clone = structuredClone(layer);
  clone.metadata = { ...(clone.metadata || {}), worldlineKind: 'settlement' };
  if (clone.type === 'symbol') {
    clone.paint = {
      ...(clone.paint || {}),
      'text-color': '#f7f7fa',
      'text-halo-color': 'rgba(3, 6, 8, 0.94)',
      'text-halo-width': 1.65,
      'text-halo-blur': 0.45
    };
  }
  if (clone.type === 'circle') {
    clone.paint = {
      ...(clone.paint || {}),
      'circle-color': '#a8e95d',
      'circle-stroke-color': '#05080a',
      'circle-stroke-width': 1.4
    };
  }
  return clone;
}

function styleBuildingLayer(layer) {
  const clone = structuredClone(layer);
  clone.layout = { ...(clone.layout || {}), visibility: 'none' };
  clone.metadata = { ...(clone.metadata || {}), worldlineKind: 'building' };
  if (clone.type === 'fill') {
    clone.paint = {
      ...(clone.paint || {}),
      'fill-color': '#ffb35c',
      'fill-opacity': 0.24,
      'fill-outline-color': '#ffe0b5'
    };
  } else {
    clone.paint = {
      ...(clone.paint || {}),
      'line-color': '#ffcf91',
      'line-opacity': 0.55,
      'line-width': 1
    };
  }
  return clone;
}

function globeStyleShell() {
  return {
    projection: { type: 'globe' },
    sky: {
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0]
    },
    light: {
      anchor: 'map',
      position: [1.5, 90, 80]
    }
  };
}

function satelliteSource() {
  return {
    type: 'raster',
    tiles: CONFIG.satelliteTiles,
    tileSize: 256,
    maxzoom: 16,
    attribution: 'Sentinel-2 cloudless by EOX IT Services GmbH - Contains modified Copernicus Sentinel data'
  };
}

function baseLayers() {
  return [
    { id: 'background', type: 'background', paint: { 'background-color': '#000000' } },
    {
      id: 'satellite-imagery',
      type: 'raster',
      source: 'satellite',
      paint: {
        'raster-opacity': 1,
        'raster-saturation': -0.04,
        'raster-contrast': 0.1,
        'raster-brightness-min': 0.02,
        'raster-brightness-max': 0.98
      }
    }
  ];
}

function fallbackStyle() {
  return {
    version: 8,
    ...globeStyleShell(),
    sources: { satellite: satelliteSource() },
    layers: baseLayers()
  };
}

async function prepareStyle() {
  try {
    const response = await fetch(CONFIG.ohmStyleUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`Historical style returned ${response.status}`);
    const ohmStyle = await response.json();
    const settlements = ohmStyle.layers.filter(isSettlementLayer).map(styleSettlementLayer);
    const buildings = ohmStyle.layers.filter(isBuildingLayer).map(styleBuildingLayer);
    const selectedLayers = [...buildings, ...settlements];
    const usedSources = new Set(selectedLayers.map((layer) => layer.source).filter(Boolean));
    const selectedSources = {};
    usedSources.forEach((sourceName) => {
      if (ohmStyle.sources[sourceName]) selectedSources[sourceName] = ohmStyle.sources[sourceName];
    });

    settlementLayerIds = settlements.map((layer) => layer.id);
    buildingLayerIds = buildings.map((layer) => layer.id);
    selectedLayers.forEach((layer) => originalFilters.set(layer.id, layer.filter || null));
    ohmAvailable = settlements.length > 0;

    return {
      version: 8,
      name: 'Worldline satellite settlement globe',
      ...globeStyleShell(),
      glyphs: ohmStyle.glyphs,
      sprite: ohmStyle.sprite,
      sources: { satellite: satelliteSource(), ...selectedSources },
      layers: [...baseLayers(), ...buildings, ...settlements]
    };
  } catch (error) {
    console.warn('OpenHistoricalMap style unavailable:', error);
    ohmAvailable = false;
    settlementLayerIds = [];
    buildingLayerIds = [];
    return fallbackStyle();
  }
}

function dateFilterFor(layerId) {
  const baseFilter = originalFilters.get(layerId);
  const dateClauses = [
    ['has', 'start_decdate'],
    ['<=', ['to-number', ['get', 'start_decdate']], selectedYear + 0.999],
    ['>=', ['coalesce', ['to-number', ['get', 'end_decdate']], 999999], selectedYear]
  ];
  return baseFilter ? ['all', baseFilter, ...dateClauses] : ['all', ...dateClauses];
}

function applyHistoricalDateFilter() {
  if (!mapReady || !ohmAvailable) return;
  [...settlementLayerIds, ...buildingLayerIds].forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    try {
      map.setFilter(layerId, dateFilterFor(layerId));
    } catch (error) {
      console.warn(`Could not date-filter layer ${layerId}`, error);
    }
  });
}
