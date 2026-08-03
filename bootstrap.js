(() => {
  const BUILD = '2026-08-03-globe-r10';
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isOptionalHistoricalStyle = url.includes('@openhistoricalmap/map-styles');
    if (!isOptionalHistoricalStyle || init.signal) return nativeFetch(input, init);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2400);
    return nativeFetch(input, { ...init, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  };

  const NativeMap = window.maplibregl?.Map;
  if (NativeMap) {
    window.maplibregl.Map = class WorldlineMap extends NativeMap {
      constructor(options = {}) {
        super({
          ...options,
          clickTolerance: options.clickTolerance ?? 12
        });
      }
    };
  }

  function loadScript(path) {
    const script = document.createElement('script');
    script.src = `${path}?v=${BUILD}`;
    script.async = true;
    document.head.appendChild(script);
  }

  function loadStyle(path) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = `${path}?v=${BUILD}`;
    document.head.appendChild(style);
  }

  loadScript('ui-state.js');
  loadScript('search-index.js');
  loadScript('landmark-visibility.js');
  loadStyle('apple-controls.css');
  loadStyle('r9-polish.css');
  loadStyle('earth-history.css');
  loadStyle('earth-ui-sync.css');
  loadScript('ui-adapters.js');
  loadScript('apple-controls-loader.js');
  loadScript('earth-history.js');
  loadScript('earth-era-context.js');
  loadScript('earth-ui-sync.js');
})();
