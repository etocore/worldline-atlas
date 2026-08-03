const surfaceModes = {
  modern: {
    key: 'modern',
    shortLabel: 'Observed reference',
    label: 'Observed reference',
    detail: 'Present-day Sentinel-2 imagery is retained only as a reference input.'
  },
  reconstructed: {
    key: 'reconstructed',
    shortLabel: 'Reconstructed Earth',
    label: 'Reconstructed Earth',
    detail: 'The selected time determines the reconstructed surface and compatible evidence layers.'
  }
};

let surfaceMode = 'reconstructed';

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
      0, 0.94,
      3, 0.78,
      6, 0.52,
      9, 0.22,
      12, 0.07,
      16, 0.025
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

  if (changed && mode === 'reconstructed') setHistoricalBuildingVisibility(true);
  if (changed && mode === 'modern') setHistoricalBuildingVisibility(false);
  applySurfaceMode();
}

dom.modernSurfaceButton.addEventListener('click', () => setSurfaceMode('modern'));
dom.reconstructedSurfaceButton.addEventListener('click', () => setSurfaceMode('reconstructed'));

const reconstructionBootTimer = setInterval(() => {
  if (!mapReady) return;
  clearInterval(reconstructionBootTimer);
  applySurfaceMode();
}, 80);

updateSurfaceUi();

/* Mobile Safari and slow-source boot guard. */
(() => {
  const BUILD = '2026-08-03-globe-r10';
  const state = document.querySelector('#globeLoadState');
  window.__WORLDLINE_BUILD__ = BUILD;

  function setLoadState(message, kind = 'loading') {
    if (!state) return;
    state.textContent = message;
    state.classList.toggle('is-hidden', kind === 'hidden');
    state.classList.toggle('is-error', kind === 'error');
  }

  setLoadState('Loading reconstructed Earth…');
  CONFIG.worldView = { center: [8, 8], zoom: 0, bearing: 0, pitch: 0 };

  const originalPrepareStyle = prepareStyle;
  prepareStyle = async function guardedPrepareStyle() {
    let timeoutId;
    try {
      return await Promise.race([
        originalPrepareStyle(),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Historical overlay timed out')), 2400);
        })
      ]);
    } catch (error) {
      console.warn('Starting globe without the optional historical tile style:', error);
      return fallbackStyle();
    } finally {
      clearTimeout(timeoutId);
    }
  };

  function resizeGlobe() {
    try {
      if (typeof map !== 'undefined' && map) map.resize();
    } catch (error) {
      console.warn('Map resize deferred:', error);
    }
  }

  window.addEventListener('load', () => {
    if (!window.maplibregl) {
      setLoadState('The globe library did not load. Refresh once or disable content blocking for this site.', 'error');
      return;
    }

    let attempts = 0;
    const readinessTimer = setInterval(() => {
      attempts += 1;
      resizeGlobe();
      if (mapReady) {
        clearInterval(readinessTimer);
        setLoadState('', 'hidden');
        requestAnimationFrame(resizeGlobe);
      } else if (attempts >= 48) {
        clearInterval(readinessTimer);
        setLoadState('The globe could not start on this browser session. Reload the page to retry.', 'error');
      }
    }, 250);
  });

  window.addEventListener('resize', resizeGlobe, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(resizeGlobe, 250), { passive: true });
  window.visualViewport?.addEventListener('resize', resizeGlobe, { passive: true });
})();
