(() => {
  const BUILD = '2026-08-04-globe-r29';
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isOptionalHistoricalStyle = url.includes('@openhistoricalmap/map-styles');
    if (!isOptionalHistoricalStyle || init.signal) return nativeFetch(input, init);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2400);
    return nativeFetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  const NativeMap = window.maplibregl?.Map;
  if (NativeMap) {
    window.maplibregl.Map = class WorldlineMap extends NativeMap {
      constructor(options = {}) { super({ ...options, clickTolerance: options.clickTolerance ?? 12 }); }
    };
  }

  function loadScript(path) {
    const script = document.createElement('script');
    script.async = false;
    script.src = `${path}?v=${BUILD}`;
    document.head.appendChild(script);
  }

  function loadStyle(path) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = `${path}?v=${BUILD}`;
    document.head.appendChild(style);
  }

  loadScript('earth-cache.js');
  loadScript('ui-state.js');
  loadScript('search-index.js');
  loadScript('history-catalog.js');
  loadScript('history-engine.js');
  loadScript('timeline/model.js');
  loadScript('timeline/state.js');
  loadScript('landmark-visibility.js');

  loadStyle('r9-polish.css');
  loadStyle('earth-history.css');
  loadStyle('earth-ui-sync.css');
  loadStyle('life-regions-r12.css');
  loadStyle('history-engine.css');
  loadStyle('history-presence-r14.css');
  loadStyle('research-foundation-r17.css');
  loadStyle('surface-engine-r20.css');
  loadStyle('mobile/quality.css');
  loadStyle('mobile/surfaces.css');
  loadStyle('search/search.css');
  loadStyle('timeline/timeline.css');

  loadScript('ui-adapters.js');
  loadScript('earth-history.js');
  loadScript('earth-era-context.js');
  loadScript('earth-ui-sync.js');
  loadScript('r12-ui.js');
  loadScript('life-evidence.js');
  loadScript('history-presence-r14.js');
  loadScript('research-foundation-r17.js');
  loadScript('surface-engine-r20.js');
  loadScript('mobile/quality.js');
  loadScript('search/search.js');
  loadScript('search/viewport.js');
  loadScript('timeline/view.js');
})();
