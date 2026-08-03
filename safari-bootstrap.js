/* Production boot guard for iPhone Safari and slow third-party historical sources. */
(() => {
  const BUILD = '2026-08-03-globe-r4';
  const state = document.querySelector('#globeLoadState');

  function setLoadState(message, kind = 'loading') {
    if (!state) return;
    state.textContent = message;
    state.classList.toggle('is-hidden', kind === 'hidden');
    state.classList.toggle('is-error', kind === 'error');
  }

  window.__WORLDLINE_BUILD__ = BUILD;
  setLoadState('Loading interactive globe…');

  if (typeof CONFIG !== 'undefined') {
    CONFIG.worldView = { center: [-82, 21], zoom: 0, bearing: 0, pitch: 0 };
  }

  if (typeof prepareStyle === 'function' && typeof fallbackStyle === 'function') {
    const originalPrepareStyle = prepareStyle;
    prepareStyle = async function guardedPrepareStyle() {
      let timeoutId;
      try {
        return await Promise.race([
          originalPrepareStyle(),
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Historical overlay timed out')), 2800);
          })
        ]);
      } catch (error) {
        console.warn('Starting globe without the optional historical tile style:', error);
        return fallbackStyle();
      } finally {
        clearTimeout(timeoutId);
      }
    };
  }

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
      try {
        if (typeof mapReady !== 'undefined' && mapReady) {
          clearInterval(readinessTimer);
          setLoadState('', 'hidden');
          requestAnimationFrame(resizeGlobe);
          return;
        }
      } catch (error) {
        console.warn('Globe readiness check deferred:', error);
      }

      if (attempts >= 48) {
        clearInterval(readinessTimer);
        setLoadState('The globe could not start on this browser session. Reload the page to retry.', 'error');
      }
    }, 250);
  });

  window.addEventListener('resize', resizeGlobe, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(resizeGlobe, 250), { passive: true });
  window.visualViewport?.addEventListener('resize', resizeGlobe, { passive: true });
})();
