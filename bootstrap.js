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
})();
