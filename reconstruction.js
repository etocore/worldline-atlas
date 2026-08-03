const surfaceModes = {
  modern: {
    key: 'modern',
    shortLabel: 'Modern surface',
    label: 'Modern satellite',
    detail: 'Current Sentinel-2 imagery with historical settlement evidence placed above it.'
  },
  reconstructed: {
    key: 'reconstructed',
    shortLabel: 'Vector reconstruction',
    label: 'Reconstructed surface',
    detail: 'Modern detail fades with zoom while dated building footprints and estimated 3D massing replace available structures.'
  }
};

let surfaceMode = 'modern';

function currentSurface() {
  return surfaceModes[surfaceMode];
}

function updateSurfaceUi() {
  const surface = currentSurface();
  const reconstructed = surfaceMode === 'reconstructed';

  dom.surfaceBadge.textContent = surface.shortLabel;
  dom.surfaceBadge.classList.toggle('reconstructed', reconstructed);
  dom.surfaceModeLabel.textContent = surface.label;
  dom.surfaceDetailLabel.textContent = surface.label;
  dom.surfaceExplanation.textContent = surface.detail;
  dom.modernSurfaceButton.classList.toggle('active', !reconstructed);
  dom.reconstructedSurfaceButton.classList.toggle('active', reconstructed);
  dom.modernSurfaceButton.setAttribute('aria-pressed', String(!reconstructed));
  dom.reconstructedSurfaceButton.setAttribute('aria-pressed', String(reconstructed));
  document.body.dataset.surfaceMode = surfaceMode;
}

function setHistoricalBuildingVisibility(visible) {
  dom.buildingToggle.checked = visible;
  if (mapReady) setLayerGroupVisibility(buildingLayerIds, visible);
}

function modernSatellitePaint() {
  return {
    opacity: 1,
    saturation: -0.04,
    contrast: 0.1,
    brightnessMin: 0.02,
    brightnessMax: 0.98,
    background: '#000000'
  };
}

function reconstructedSatellitePaint() {
  return {
    opacity: [
      'interpolate', ['linear'], ['zoom'],
      0, 0.96,
      3, 0.82,
      6, 0.58,
      9, 0.26,
      12, 0.09,
      16, 0.035
    ],
    saturation: -0.72,
    contrast: -0.08,
    brightnessMin: 0.04,
    brightnessMax: 0.72,
    background: '#2c261e'
  };
}

function applySurfaceMode() {
  updateSurfaceUi();
  if (!mapReady || !map.getLayer('satellite-imagery')) return;

  const paint = surfaceMode === 'reconstructed'
    ? reconstructedSatellitePaint()
    : modernSatellitePaint();

  map.setPaintProperty('background', 'background-color', paint.background);
  map.setPaintProperty('satellite-imagery', 'raster-opacity', paint.opacity);
  map.setPaintProperty('satellite-imagery', 'raster-saturation', paint.saturation);
  map.setPaintProperty('satellite-imagery', 'raster-contrast', paint.contrast);
  map.setPaintProperty('satellite-imagery', 'raster-brightness-min', paint.brightnessMin);
  map.setPaintProperty('satellite-imagery', 'raster-brightness-max', paint.brightnessMax);

  const showBuildings = surfaceMode === 'reconstructed' || dom.buildingToggle.checked;
  setLayerGroupVisibility(buildingLayerIds, showBuildings);
}

function setSurfaceMode(mode) {
  if (!surfaceModes[mode]) return;
  const changed = surfaceMode !== mode;
  surfaceMode = mode;

  if (changed && mode === 'reconstructed') {
    setHistoricalBuildingVisibility(true);
    showSearchFeedback('Reconstructed mode uses dated vector footprints and estimated 3D massing. Reviewed historical raster surfaces are the next pipeline layer.');
  }
  if (changed && mode === 'modern') {
    setHistoricalBuildingVisibility(false);
    showSearchFeedback('Modern Sentinel-2 surface restored. Historical settlements remain date-filtered above it.');
  }

  applySurfaceMode();
}

dom.modernSurfaceButton.addEventListener('click', () => setSurfaceMode('modern'));
dom.reconstructedSurfaceButton.addEventListener('click', () => setSurfaceMode('reconstructed'));

updateSurfaceUi();
