(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r14';
  let card;
  let title;
  let summary;
  let meta;
  let lastSignature = '';

  function createCard() {
    if (card) return true;
    const stage = document.querySelector('.map-stage');
    if (!stage) return false;

    card = document.createElement('button');
    card.id = 'historyPresenceCard';
    card.className = 'history-presence-card';
    card.type = 'button';
    card.setAttribute('aria-label', 'Explore the selected era');
    card.innerHTML = `
      <span class="history-presence-copy">
        <span id="historyPresenceMeta" class="history-presence-meta">Earth History</span>
        <strong id="historyPresenceTitle">Loading era</strong>
        <span id="historyPresenceSummary">Preparing historical context…</span>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
    `;
    stage.appendChild(card);
    title = card.querySelector('#historyPresenceTitle');
    summary = card.querySelector('#historyPresenceSummary');
    meta = card.querySelector('#historyPresenceMeta');

    card.addEventListener('click', () => {
      const chapter = globalThis.WorldlineHistory?.current?.();
      if (chapter) globalThis.WorldlineHistory.open(chapter.id);
      else document.querySelector('#yearButton')?.click();
    });
    return true;
  }

  function sync() {
    if (!createCard()) return false;
    const history = globalThis.WorldlineHistory;
    const earth = globalThis.WorldlineEarthHistory;
    const chapter = history?.current?.();
    if (!history || !earth || !chapter) {
      card.hidden = true;
      return false;
    }

    const mode = earth.getMode();
    const selected = mode === 'earth' ? earth.getEarthAgeMa() : earth.getHumanYear();
    const signature = `${mode}|${selected}|${chapter.id}`;
    card.hidden = false;
    if (signature === lastSignature) return true;
    lastSignature = signature;

    meta.textContent = mode === 'earth' ? 'Earth History' : 'Human History';
    title.textContent = chapter.title;
    summary.textContent = chapter.dek;
    card.dataset.timeline = mode;
    return true;
  }

  const timer = setInterval(() => {
    sync();
    if (globalThis.WorldlineHistory && globalThis.WorldlineEarthHistory && card) {
      clearInterval(timer);
      setInterval(sync, 220);
      window.addEventListener('worldline:timeline-mode', () => setTimeout(sync, 0));
      window.__WORLDLINE_HISTORY_PRESENCE_BUILD__ = BUILD;
    }
  }, 80);
})();
