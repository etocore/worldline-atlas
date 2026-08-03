(() => {
  const BUILD = '2026-08-03-globe-r8';
  let attempts = 0;

  const timer = setInterval(() => {
    attempts += 1;
    if (window.__WORLDLINE_INTERACTION_BUILD__) {
      clearInterval(timer);
      const runtime = document.createElement('script');
      runtime.src = `apple-controls.js?v=${BUILD}`;
      runtime.async = true;
      document.head.appendChild(runtime);
      return;
    }

    if (attempts >= 200) {
      clearInterval(timer);
      console.warn('Worldline compact controls did not start because the core interaction runtime was unavailable.');
    }
  }, 50);
})();
