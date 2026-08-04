(() => {
  'use strict';
  const timer = setInterval(() => {
    if (!window.__WORLDLINE_SEARCH_BUILD__) return;
    clearInterval(timer);
    window.__WORLDLINE_APPLE_CONTROLS_BUILD__ = window.__WORLDLINE_SEARCH_BUILD__;
  }, 20);
  setTimeout(() => clearInterval(timer), 12000);
})();
