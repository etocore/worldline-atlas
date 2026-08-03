(() => {
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

  const landmarkRuntime = document.createElement('script');
  landmarkRuntime.src = 'landmark-visibility.js?v=20260803r7';
  landmarkRuntime.async = true;
  document.head.appendChild(landmarkRuntime);
})();
