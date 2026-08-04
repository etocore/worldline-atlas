(() => {
  const BUILD = '2026-08-04-globe-r29';
  const loadState = document.querySelector('#globeLoadState');

  function setViewportHeight() {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--worldline-vh', `${height * 0.01}px`);
  }

  function supportsWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch (_) {
      return false;
    }
  }

  function markFailed(message) {
    document.body.classList.add('globe-failed');
    if (loadState) loadState.textContent = `${message} Build ${BUILD}.`;
  }

  function polishMap() {
    if (typeof map === 'undefined' || !map || typeof map.resize !== 'function') return false;

    map.resize();
    try { map.setProjection({ type: 'globe' }); } catch (_) {}

    const isPhone = window.matchMedia('(max-width: 720px)').matches;
    if (isPhone && map.getZoom() < 0.65) {
      map.jumpTo({ center: [8, 8], zoom: 0.42, bearing: 0, pitch: 0 });
    }

    document.body.classList.add('globe-ready');
    document.body.classList.remove('globe-failed');
    if (loadState) loadState.textContent = `Interactive globe ready. Build ${BUILD}.`;
    return true;
  }

  setViewportHeight();
  window.visualViewport?.addEventListener('resize', () => {
    setViewportHeight();
    requestAnimationFrame(() => {
      if (typeof map !== 'undefined' && map) map.resize();
    });
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      setViewportHeight();
      if (typeof map !== 'undefined' && map) map.resize();
    }, 220);
  });

  if (!supportsWebGL()) {
    markFailed('This browser cannot create the WebGL globe');
    return;
  }

  let attempts = 0;
  const watcher = setInterval(() => {
    attempts += 1;
    if (polishMap()) {
      clearInterval(watcher);
      return;
    }
    if (attempts >= 90) {
      clearInterval(watcher);
      markFailed('The globe did not finish loading');
    }
  }, 100);
})();
