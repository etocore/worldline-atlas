(() => {
  'use strict';

  let installed = false;

  function installGlobeLandmarkVisibility() {
    if (installed || typeof mapReady === 'undefined' || !mapReady || !map) return false;
    if (!map.getLayer('curated-settlement-halo') || !map.getLayer('curated-settlement-label')) return false;

    try {
      map.setLayerZoomRange('curated-settlement-halo', 0, 24);
      map.setLayerZoomRange('curated-settlement-label', 0.2, 24);

      map.setPaintProperty('curated-settlement-halo', 'circle-radius', [
        'interpolate', ['linear'], ['zoom'],
        0, 4.8,
        0.45, 5.6,
        1.5, 6.4,
        5, 8,
        10, 11
      ]);
      map.setPaintProperty('curated-settlement-halo', 'circle-opacity', [
        'interpolate', ['linear'], ['zoom'],
        0, 0.84,
        1, 0.92,
        6, 0.96
      ]);
      map.setPaintProperty('curated-settlement-halo', 'circle-stroke-width', [
        'interpolate', ['linear'], ['zoom'],
        0, 1.45,
        2, 1.9,
        7, 2.25
      ]);

      map.setLayoutProperty('curated-settlement-label', 'text-size', [
        'interpolate', ['linear'], ['zoom'],
        0.2, 9.5,
        1.2, 10.5,
        5, 12.5,
        10, 14
      ]);
      map.setLayoutProperty('curated-settlement-label', 'text-padding', 4);
      map.setLayoutProperty('curated-settlement-label', 'text-max-width', 10);
      map.setLayoutProperty('curated-settlement-label', 'text-optional', true);
      map.setPaintProperty('curated-settlement-label', 'text-opacity', [
        'interpolate', ['linear'], ['zoom'],
        0.2, 0.76,
        0.75, 0.9,
        2, 1
      ]);

      installed = true;
      return true;
    } catch (error) {
      console.warn('Globe landmark visibility could not be applied:', error);
      return false;
    }
  }

  const installer = setInterval(() => {
    if (installGlobeLandmarkVisibility()) clearInterval(installer);
  }, 120);

  window.__WORLDLINE_LANDMARK_VISIBILITY__ = '2026-08-03-r7';
})();
