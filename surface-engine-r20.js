(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r20';
  const MANIFEST_URL = `/data/surface/worlds.json?v=${encodeURIComponent(BUILD)}`;
  const SOURCE_COLOR = 'worldline-surface-color';
  const SOURCE_DEM = 'worldline-surface-dem';
  const LAYER_COLOR = 'worldline-surface-color';
  const LAYER_HILLSHADE = 'worldline-surface-hillshade';
  const FLAT_LAND_OPACITY = 1;
  const FLAT_COASTLINE_OPACITY = 0.92;
  const FLAT_COASTLINE_WIDTH = ['interpolate', ['linear'], ['zoom'], 0, 0.65, 5, 1.7, 9, 2.4];
  const hiddenTechnicalLayers = new Map();

  let manifest = null;
  let activeWorldId = null;
  let installed = false;
  let initializingPromise = null;
  let updateTimer = 0;
  let surfaceBadge = null;
  let previousTerrain = null;
  let terrainCaptured = false;
  let previewSuspended = false;

  function atlasMap() {
    try {
      return typeof map !== 'undefined' ? map : null;
    } catch (_) {
      return null;
    }
  }

  function timelineSnapshot() {
    const state = globalThis.WorldlineTimelineState?.getState?.();
    if (state) {
      const domain = state.previewDomain || state.domain;
      return {
        mode: domain,
        value: domain === 'earth'
          ? Number(state.previewValue ?? state.earthAgeMa)
          : Number(state.previewValue ?? state.humanYear),
        interaction: state.interaction || 'idle'
      };
    }
    const engine = globalThis.WorldlineEarthHistory;
    if (!engine) return null;
    const mode = engine.getMode();
    return {
      mode,
      value: mode === 'earth' ? Number(engine.getEarthAgeMa()) : Number(engine.getHumanYear()),
      interaction: 'idle'
    };
  }

  function generatedWorlds() {
    return (manifest?.worlds || []).filter((world) => world.status === 'generated' && world.assets);
  }

  function worldContains(world, mode, value) {
    if (world.mode !== mode) return false;
    if (mode === 'earth') {
      return value <= Number(world.coverage?.olderMa) && value >= Number(world.coverage?.youngerMa);
    }
    return value >= Number(world.coverage?.startYear) && value <= Number(world.coverage?.endYear);
  }

  function nearestWorld(mode, value) {
    return generatedWorlds().find((world) => worldContains(world, mode, value)) || null;
  }

  function activeWorld() {
    return manifest?.worlds?.find((world) => world.id === activeWorldId) || null;
  }

  function cacheBusted(template, world) {
    const separator = template.includes('?') ? '&' : '?';
    return `${template}${separator}v=${encodeURIComponent(world.generatedAt || BUILD)}`;
  }

  function insertionLayer(mapInstance) {
    if (mapInstance.getLayer('paleo-coastline-line')) return 'paleo-coastline-line';
    return mapInstance.getStyle()?.layers?.find((layer) => layer.type === 'symbol')?.id;
  }

  function ensureBadge() {
    if (surfaceBadge?.isConnected) return surfaceBadge;
    const copy = document.querySelector('.timeline-era-card-copy');
    if (!copy) return null;
    surfaceBadge = document.createElement('span');
    surfaceBadge.className = 'worldline-surface-badge';
    surfaceBadge.hidden = true;
    copy.appendChild(surfaceBadge);
    return surfaceBadge;
  }

  function defaultTopBadge(snapshot = timelineSnapshot()) {
    if (!snapshot) return 'Reconstructed Earth';
    if (snapshot.mode === 'human') return 'Reconstructed landscape';
    return snapshot.value > 1800 ? 'Schematic Earth' : 'Reconstructed Earth';
  }

  function setBadge(world, loading = false, previewing = false) {
    const badge = ensureBadge();
    if (badge) {
      badge.hidden = !world;
      badge.dataset.loading = String(Boolean(loading));
      badge.textContent = previewing
        ? 'Previewing reconstructed coastlines'
        : loading
          ? 'Loading reconstructed relief'
          : 'Paleoelevation + ocean depth';
    }
    const topBadge = document.querySelector('#surfaceBadge');
    if (topBadge) {
      topBadge.textContent = previewing
        ? 'Coastline preview'
        : world
          ? 'PaleoDEM surface'
          : defaultTopBadge();
    }
  }

  function rememberAndHideTechnicalLayers(mapInstance) {
    const layers = mapInstance.getStyle()?.layers || [];
    layers.forEach((layer) => {
      if (layer.type !== 'line' || /coastline/i.test(layer.id)) return;
      if (!/(plate|tectonic|topolog|static[-_ ]?polygon|reconstruction[-_ ]?(line|boundary))/i.test(layer.id)) return;
      if (!hiddenTechnicalLayers.has(layer.id)) {
        hiddenTechnicalLayers.set(layer.id, mapInstance.getLayoutProperty(layer.id, 'visibility') || 'visible');
      }
      mapInstance.setLayoutProperty(layer.id, 'visibility', 'none');
    });
  }

  function restoreTechnicalLayers(mapInstance) {
    hiddenTechnicalLayers.forEach((visibility, id) => {
      if (mapInstance.getLayer(id)) mapInstance.setLayoutProperty(id, 'visibility', visibility);
    });
    hiddenTechnicalLayers.clear();
  }

  function captureTerrain(mapInstance) {
    if (terrainCaptured) return;
    previousTerrain = mapInstance.getTerrain?.() || null;
    terrainCaptured = true;
  }

  function disableSurfaceTerrain(mapInstance, restorePrevious = false) {
    const terrain = mapInstance.getTerrain?.();
    if (terrain?.source === SOURCE_DEM) {
      mapInstance.setTerrain?.(restorePrevious ? previousTerrain : null);
    }
    if (restorePrevious) {
      previousTerrain = null;
      terrainCaptured = false;
    }
  }

  function removeSurfaceLayers(mapInstance, restoreTerrain = false) {
    disableSurfaceTerrain(mapInstance, restoreTerrain);
    [LAYER_HILLSHADE, LAYER_COLOR].forEach((id) => {
      if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
    });
    [SOURCE_DEM, SOURCE_COLOR].forEach((id) => {
      if (mapInstance.getSource(id)) mapInstance.removeSource(id);
    });
  }

  function showVectorReconstruction(mapInstance) {
    if (mapInstance.getLayer('paleo-land-fill')) {
      mapInstance.setPaintProperty('paleo-land-fill', 'fill-opacity', FLAT_LAND_OPACITY);
    }
    if (mapInstance.getLayer('paleo-coastline-line')) {
      mapInstance.setPaintProperty('paleo-coastline-line', 'line-opacity', FLAT_COASTLINE_OPACITY);
      mapInstance.setPaintProperty('paleo-coastline-line', 'line-width', FLAT_COASTLINE_WIDTH);
    }
  }

  function hideVectorReconstruction(mapInstance) {
    if (mapInstance.getLayer('paleo-land-fill')) {
      mapInstance.setPaintProperty('paleo-land-fill', 'fill-opacity', 0);
    }
    if (mapInstance.getLayer('paleo-coastline-line')) {
      mapInstance.setPaintProperty('paleo-coastline-line', 'line-opacity', 0);
    }
  }

  function restoreFlatSurface(mapInstance) {
    removeSurfaceLayers(mapInstance, true);
    restoreTechnicalLayers(mapInstance);
    showVectorReconstruction(mapInstance);
    activeWorldId = null;
    previewSuspended = false;
    delete document.body.dataset.surfaceWorld;
    delete document.body.dataset.surfacePreview;
    setBadge(null);
  }

  function restoreInstalledWorldVisuals(mapInstance, world) {
    if (!world || !mapInstance.getLayer(LAYER_COLOR) || !mapInstance.getLayer(LAYER_HILLSHADE)) return false;
    mapInstance.setPaintProperty(LAYER_COLOR, 'raster-opacity', 0.99);
    mapInstance.setPaintProperty(LAYER_HILLSHADE, 'hillshade-exaggeration', 0.19);
    if (mapInstance.getSource(SOURCE_DEM)) {
      mapInstance.setTerrain?.({ source: SOURCE_DEM, exaggeration: 0.16 });
    }
    hideVectorReconstruction(mapInstance);
    rememberAndHideTechnicalLayers(mapInstance);
    previewSuspended = false;
    delete document.body.dataset.surfacePreview;
    setBadge(world, false);
    return true;
  }

  function suspendForPreview() {
    if (previewSuspended) return;
    const mapInstance = atlasMap();
    const world = activeWorld();
    if (!mapInstance || !world || !mapInstance.isStyleLoaded?.()) return;

    previewSuspended = true;
    document.body.dataset.surfacePreview = 'true';
    if (mapInstance.getLayer(LAYER_COLOR)) {
      mapInstance.setPaintProperty(LAYER_COLOR, 'raster-opacity', 0.16);
    }
    if (mapInstance.getLayer(LAYER_HILLSHADE)) {
      mapInstance.setPaintProperty(LAYER_HILLSHADE, 'hillshade-exaggeration', 0);
    }
    disableSurfaceTerrain(mapInstance, false);
    showVectorReconstruction(mapInstance);
    setBadge(world, false, true);
  }

  function installWorld(mapInstance, world) {
    if (activeWorldId === world.id && restoreInstalledWorldVisuals(mapInstance, world)) return;
    captureTerrain(mapInstance);
    removeSurfaceLayers(mapInstance, false);
    setBadge(world, true);

    const assets = world.assets;
    const before = insertionLayer(mapInstance);
    mapInstance.addSource(SOURCE_COLOR, {
      type: 'raster',
      tiles: [cacheBusted(assets.colorTiles, world)],
      tileSize: Number(assets.tileSize || 256),
      minzoom: Number(assets.minzoom || 0),
      maxzoom: Number(assets.maxzoom || 3),
      scheme: 'xyz',
      attribution: assets.attribution || ''
    });
    mapInstance.addLayer({
      id: LAYER_COLOR,
      type: 'raster',
      source: SOURCE_COLOR,
      paint: {
        'raster-opacity': 0.99,
        'raster-fade-duration': 220,
        'raster-resampling': 'linear',
        'raster-saturation': -0.02,
        'raster-contrast': 0.1
      }
    }, before);

    mapInstance.addSource(SOURCE_DEM, {
      type: 'raster-dem',
      tiles: [cacheBusted(assets.demTiles, world)],
      tileSize: Number(assets.tileSize || 256),
      minzoom: Number(assets.minzoom || 0),
      maxzoom: Number(assets.maxzoom || 3),
      encoding: assets.encoding || 'mapbox',
      attribution: assets.attribution || ''
    });
    mapInstance.addLayer({
      id: LAYER_HILLSHADE,
      type: 'hillshade',
      source: SOURCE_DEM,
      paint: {
        'hillshade-exaggeration': 0.19,
        'hillshade-shadow-color': '#061018',
        'hillshade-highlight-color': '#f5e9ce',
        'hillshade-accent-color': '#745c3e'
      }
    }, before);
    mapInstance.setTerrain?.({ source: SOURCE_DEM, exaggeration: 0.16 });

    // The raster package contains its own shoreline. Hiding the CAO2024 fill and
    // edge prevents two different reconstruction models from producing a double coast.
    hideVectorReconstruction(mapInstance);

    rememberAndHideTechnicalLayers(mapInstance);
    activeWorldId = world.id;
    previewSuspended = false;
    document.body.dataset.surfaceWorld = world.id;
    delete document.body.dataset.surfacePreview;
    setBadge(world, false);

    mapInstance.once('idle', () => {
      window.dispatchEvent(new CustomEvent('worldline:surface-world-ready', {
        detail: { world, build: BUILD }
      }));
    });
  }

  function applySurface() {
    if (previewSuspended) return;
    const mapInstance = atlasMap();
    const snapshot = timelineSnapshot();
    if (!mapInstance || !snapshot || !mapInstance.isStyleLoaded?.()) return;
    const world = nearestWorld(snapshot.mode, snapshot.value);
    if (!world) {
      if (activeWorldId || mapInstance.getLayer(LAYER_COLOR)) restoreFlatSurface(mapInstance);
      else setBadge(null);
      return;
    }
    installWorld(mapInstance, world);
  }

  function scheduleSurfaceUpdate(delay = 0) {
    clearTimeout(updateTimer);
    updateTimer = window.setTimeout(applySurface, delay);
  }

  function settleSurfaceAfterTimeline() {
    previewSuspended = false;
    delete document.body.dataset.surfacePreview;
    scheduleSurfaceUpdate(0);
  }

  async function loadManifest() {
    const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Surface manifest returned ${response.status}`);
    manifest = await response.json();
    window.dispatchEvent(new CustomEvent('worldline:surface-manifest', {
      detail: { manifest, build: BUILD }
    }));
  }

  async function initialize() {
    if (installed) return true;
    if (initializingPromise) return initializingPromise;
    const mapInstance = atlasMap();
    if (!mapInstance || !globalThis.WorldlineEarthHistory || !globalThis.WorldlineTimelineState) return false;

    initializingPromise = (async () => {
      try {
        await loadManifest();
        window.addEventListener('worldline:timeline-preview', suspendForPreview);
        ['worldline:timeline-commit', 'worldline:timeline-domain', 'worldline:timeline-mode'].forEach((eventName) => {
          window.addEventListener(eventName, settleSurfaceAfterTimeline);
        });
        mapInstance.on('styledata', () => scheduleSurfaceUpdate(0));
        mapInstance.on('load', () => scheduleSurfaceUpdate(0));

        installed = true;
        globalThis.WorldlineSurfaceEngine = Object.freeze({
          BUILD,
          getManifest: () => manifest,
          getActiveWorld: () => activeWorld(),
          getPreviewSuspended: () => previewSuspended,
          refresh: () => scheduleSurfaceUpdate(0)
        });
        window.__WORLDLINE_SURFACE_ENGINE_BUILD__ = BUILD;
        scheduleSurfaceUpdate(0);
        return true;
      } catch (error) {
        console.warn('Historical surface manifest unavailable:', error);
        return false;
      } finally {
        initializingPromise = null;
      }
    })();

    return initializingPromise;
  }

  const installer = window.setInterval(() => {
    initialize().then((ready) => {
      if (ready) window.clearInterval(installer);
    }).catch((error) => console.warn('Surface engine initialization failed:', error));
  }, 120);
})();