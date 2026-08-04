(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r20';
  const MANIFEST_URL = `/data/surface/worlds.json?v=${encodeURIComponent(BUILD)}`;
  const SOURCE_COLOR = 'worldline-surface-color';
  const SOURCE_DEM = 'worldline-surface-dem';
  const LAYER_COLOR = 'worldline-surface-color';
  const LAYER_HILLSHADE = 'worldline-surface-hillshade';
  const DEFAULT_FILL_OPACITY = 1;
  const hiddenTechnicalLayers = new Map();

  let manifest = null;
  let activeWorldId = null;
  let installed = false;
  let updateTimer = 0;
  let surfaceBadge = null;

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
    const candidates = generatedWorlds().filter((world) => world.mode === mode);
    const containing = candidates.find((world) => worldContains(world, mode, value));
    if (containing) return containing;
    return null;
  }

  function cacheBusted(template, world) {
    const separator = template.includes('?') ? '&' : '?';
    return `${template}${separator}v=${encodeURIComponent(world.generatedAt || BUILD)}`;
  }

  function insertionLayer(mapInstance) {
    if (mapInstance.getLayer('paleo-coastline-line')) return 'paleo-coastline-line';
    const firstSymbol = mapInstance.getStyle()?.layers?.find((layer) => layer.type === 'symbol');
    return firstSymbol?.id;
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

  function setBadge(world, loading = false) {
    const badge = ensureBadge();
    if (badge) {
      badge.hidden = !world;
      badge.dataset.loading = String(Boolean(loading));
      badge.textContent = loading
        ? 'Loading reconstructed relief'
        : 'Paleoelevation + ocean depth';
    }
    const topBadge = document.querySelector('#surfaceBadge');
    if (topBadge && world) topBadge.textContent = 'PaleoDEM surface';
  }

  function rememberAndHideTechnicalLayers(mapInstance) {
    const layers = mapInstance.getStyle()?.layers || [];
    layers.forEach((layer) => {
      if (layer.type !== 'line') return;
      if (/coastline/i.test(layer.id)) return;
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

  function removeSurfaceLayers(mapInstance) {
    [LAYER_HILLSHADE, LAYER_COLOR].forEach((id) => {
      if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
    });
    [SOURCE_DEM, SOURCE_COLOR].forEach((id) => {
      if (mapInstance.getSource(id)) mapInstance.removeSource(id);
    });
  }

  function restoreFlatSurface(mapInstance) {
    removeSurfaceLayers(mapInstance);
    restoreTechnicalLayers(mapInstance);
    if (mapInstance.getLayer('paleo-land-fill')) {
      mapInstance.setPaintProperty('paleo-land-fill', 'fill-opacity', DEFAULT_FILL_OPACITY);
    }
    if (mapInstance.getLayer('paleo-coastline-line')) {
      mapInstance.setPaintProperty('paleo-coastline-line', 'line-opacity', 0.92);
    }
    activeWorldId = null;
    delete document.body.dataset.surfaceWorld;
    setBadge(null);
  }

  function installWorld(mapInstance, world) {
    if (activeWorldId === world.id && mapInstance.getLayer(LAYER_COLOR)) return;
    removeSurfaceLayers(mapInstance);
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
        'raster-opacity': 0.98,
        'raster-fade-duration': 240,
        'raster-saturation': -0.04,
        'raster-contrast': 0.08
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
        'hillshade-exaggeration': 0.22,
        'hillshade-shadow-color': '#061018',
        'hillshade-highlight-color': '#f5e9ce',
        'hillshade-accent-color': '#745c3e'
      }
    }, before);

    if (mapInstance.getLayer('paleo-land-fill')) {
      mapInstance.setPaintProperty('paleo-land-fill', 'fill-opacity', 0.04);
    }
    if (mapInstance.getLayer('paleo-coastline-line')) {
      mapInstance.setPaintProperty('paleo-coastline-line', 'line-opacity', 0.48);
      mapInstance.setPaintProperty('paleo-coastline-line', 'line-width', [
        'interpolate', ['linear'], ['zoom'], 0, 0.35, 5, 1.05, 9, 1.5
      ]);
    }

    rememberAndHideTechnicalLayers(mapInstance);
    activeWorldId = world.id;
    document.body.dataset.surfaceWorld = world.id;
    setBadge(world, false);

    const announce = () => {
      window.dispatchEvent(new CustomEvent('worldline:surface-world-ready', {
        detail: { world, build: BUILD }
      }));
    };
    mapInstance.once('idle', announce);
  }

  function applySurface() {
    const mapInstance = atlasMap();
    const snapshot = timelineSnapshot();
    if (!mapInstance || !snapshot || !mapInstance.isStyleLoaded?.()) return;
    const world = nearestWorld(snapshot.mode, snapshot.value);
    if (!world) {
      if (activeWorldId) restoreFlatSurface(mapInstance);
      return;
    }
    installWorld(mapInstance, world);
  }

  function scheduleSurfaceUpdate(delay = 0) {
    clearTimeout(updateTimer);
    updateTimer = window.setTimeout(applySurface, delay);
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
    const mapInstance = atlasMap();
    if (!mapInstance || !globalThis.WorldlineEarthHistory || !globalThis.WorldlineTimelineState) return false;
    try {
      await loadManifest();
    } catch (error) {
      console.warn('Historical surface manifest unavailable:', error);
      return false;
    }

    ['worldline:timeline-preview', 'worldline:timeline-commit', 'worldline:timeline-domain', 'worldline:timeline-mode'].forEach((eventName) => {
      window.addEventListener(eventName, () => scheduleSurfaceUpdate(eventName.includes('preview') ? 70 : 0));
    });
    mapInstance.on('styledata', () => scheduleSurfaceUpdate(0));
    mapInstance.on('load', () => scheduleSurfaceUpdate(0));

    installed = true;
    globalThis.WorldlineSurfaceEngine = Object.freeze({
      BUILD,
      getManifest: () => manifest,
      getActiveWorld: () => manifest?.worlds?.find((world) => world.id === activeWorldId) || null,
      refresh: () => scheduleSurfaceUpdate(0)
    });
    window.__WORLDLINE_SURFACE_ENGINE_BUILD__ = BUILD;
    scheduleSurfaceUpdate(0);
    return true;
  }

  const installer = window.setInterval(() => {
    initialize().then((ready) => {
      if (ready) window.clearInterval(installer);
    }).catch((error) => console.warn('Surface engine initialization failed:', error));
  }, 120);
})();
