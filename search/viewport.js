(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r29';
  let searchInput;
  let searchShell;
  let lastScrollY = 0;
  let viewportFrame = 0;
  let installed = false;

  function viewportMetrics() {
    const viewport = window.visualViewport;
    return {
      top: Math.max(0, viewport?.offsetTop || 0),
      height: Math.max(240, viewport?.height || window.innerHeight)
    };
  }

  function positionNow() {
    if (!document.body.classList.contains('search-active') || !searchShell) return;
    const { top, height } = viewportMetrics();
    const row = searchShell.querySelector('.search-row');
    const shellHeight = Math.max(54, Math.ceil(row?.getBoundingClientRect().height || 54));
    const searchTop = Math.round(Math.max(top + 10, top + height - shellHeight - 10));
    const availableAbove = Math.max(108, searchTop - top - 18);
    const root = document.documentElement;
    root.style.setProperty('--wl-vv-top', `${Math.round(top)}px`);
    root.style.setProperty('--wl-vv-height', `${Math.round(height)}px`);
    root.style.setProperty('--wl-search-top', `${searchTop}px`);
    root.style.setProperty('--wl-search-results-height', `${Math.round(Math.min(220, availableAbove))}px`);
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  }

  function position() {
    cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(positionNow);
  }

  function lock() {
    lastScrollY = window.scrollY;
    document.documentElement.classList.add('worldline-search-locked');
    position();
    requestAnimationFrame(position);
    setTimeout(position, 80);
    setTimeout(position, 240);
  }

  function unlock() {
    cancelAnimationFrame(viewportFrame);
    document.documentElement.classList.remove('worldline-search-locked');
    for (const property of ['--wl-search-top', '--wl-search-results-height', '--wl-vv-top', '--wl-vv-height']) {
      document.documentElement.style.removeProperty(property);
    }
    if (lastScrollY) window.scrollTo(0, lastScrollY);
    lastScrollY = 0;
  }

  function sync() {
    if (document.body.classList.contains('search-active')) lock();
    else unlock();
  }

  function install() {
    if (installed) return true;
    searchInput = document.querySelector('#historySearch');
    searchShell = document.querySelector('#searchShell');
    if (!searchInput || !searchShell || !document.body) return false;

    searchInput.addEventListener('focus', lock);
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    window.addEventListener('orientationchange', () => setTimeout(position, 120));
    window.addEventListener('pageshow', position);

    installed = true;
    window.__WORLDLINE_SEARCH_VIEWPORT_BUILD__ = BUILD;
    globalThis.WorldlineSearchViewport = Object.freeze({ BUILD, lock, unlock, refresh: position });
    return true;
  }

  const timer = setInterval(() => {
    if (install()) clearInterval(timer);
  }, 50);
  setTimeout(() => clearInterval(timer), 12000);
})();
