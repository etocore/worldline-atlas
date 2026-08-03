(() => {
  const BUILD = '2026-08-03-globe-r9';
  let attempts = 0;

  const timer = setInterval(() => {
    attempts += 1;
    const ready = Boolean(
      window.__WORLDLINE_INTERACTION_BUILD__
      && window.__WORLDLINE_UI_ADAPTERS_BUILD__
      && globalThis.WorldlineUI
      && globalThis.WorldlineSearch
    );

    if (ready) {
      clearInterval(timer);
      const runtime = document.createElement('script');
      runtime.src = `apple-controls.js?v=${BUILD}`;
      runtime.async = true;
      document.head.appendChild(runtime);
      return;
    }

    if (attempts >= 240) {
      clearInterval(timer);
      console.warn('Worldline compact controls did not start because the unified UI services were unavailable.');
    }
  }, 50);
})();