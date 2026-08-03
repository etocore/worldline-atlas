(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r12';
  let installed = false;

  function install() {
    if (installed || !document.body) return false;

    const timelineMore = document.querySelector('#advancedControlsButton');
    const searchInput = document.querySelector('#historySearch');
    const yearButton = document.querySelector('#yearButton');
    const yearLabel = document.querySelector('#yearLabel');
    const eraLabel = document.querySelector('#eraLabel');
    const searchContext = document.querySelector('#searchContextButton');
    const controlPanel = document.querySelector('#controlPanel');

    if (!timelineMore || !searchInput || !yearButton || !yearLabel || !eraLabel || !controlPanel) return false;

    document.body.classList.add('worldline-r12');

    timelineMore.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="5" cy="12" r="1.7"></circle>
        <circle cx="12" cy="12" r="1.7"></circle>
        <circle cx="19" cy="12" r="1.7"></circle>
      </svg>
    `;
    timelineMore.setAttribute('aria-label', 'Open advanced timeline controls');
    timelineMore.title = 'Advanced controls';

    searchInput.placeholder = 'Search places, eras, or life';
    searchInput.setAttribute('autocapitalize', 'words');
    searchInput.setAttribute('spellcheck', 'false');

    function syncDateLabels() {
      const era = eraLabel.textContent.trim();
      const time = yearLabel.textContent.trim();
      yearButton.setAttribute('aria-label', `Open timeline. ${era}, ${time}`);
      searchContext?.setAttribute('aria-label', `Open timeline at ${time}`);
    }

    const dateObserver = new MutationObserver(syncDateLabels);
    dateObserver.observe(yearLabel, { childList: true, characterData: true, subtree: true });
    dateObserver.observe(eraLabel, { childList: true, characterData: true, subtree: true });
    syncDateLabels();

    function syncViewport() {
      const viewport = window.visualViewport;
      if (!viewport) return;
      document.documentElement.style.setProperty('--worldline-visual-height', `${viewport.height}px`);
      document.documentElement.style.setProperty('--worldline-keyboard-offset', `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
    }

    window.visualViewport?.addEventListener('resize', syncViewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', syncViewport, { passive: true });
    syncViewport();

    const searchShell = document.querySelector('#searchShell');
    searchInput.addEventListener('focus', () => {
      searchShell?.classList.add('is-searching');
    });
    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== searchInput) searchShell?.classList.remove('is-searching');
      }, 120);
    });

    installed = true;
    window.__WORLDLINE_R12_UI_BUILD__ = BUILD;
    return true;
  }

  const timer = setInterval(() => {
    if (install()) clearInterval(timer);
  }, 70);
})();
