(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r29';
  const timer = setInterval(() => {
    if (!window.__WORLDLINE_SEARCH_BUILD__ || !window.__WORLDLINE_INTERACTION_BUILD__ || !window.__WORLDLINE_IOS_INTERFACE_BUILD__) return;
    clearInterval(timer);
    window.__WORLDLINE_INTERFACE_BUILD__ = BUILD;
    window.__WORLDLINE_APPLE_CONTROLS_BUILD__ = BUILD;
  }, 20);
  setTimeout(() => clearInterval(timer), 12000);
})();
