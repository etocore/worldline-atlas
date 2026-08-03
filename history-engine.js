(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r13';
  const catalog = globalThis.WORLDLINE_HISTORY_CATALOG;
  if (!catalog) return;

  const chapterById = new Map(catalog.chapters.map((chapter) => [chapter.id, chapter]));
  const chapterByTitle = new Map();
  let activeChapterId = '';
  let baseSearch = null;
  let searchWrapped = false;
  let initialized = false;
  let lastTimelineSignature = '';

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeMarkup(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function sourceFor(id) {
    return catalog.sources[id] || null;
  }

  function formatEarthAge(ageMa) {
    const engine = globalThis.WorldlineEarthHistory;
    if (engine?.formatEarthAge) return engine.formatEarthAge(ageMa);
    if (ageMa >= 1000) return `${(ageMa / 1000).toFixed(ageMa % 1000 ? 2 : 0)} Ga`;
    if (ageMa >= 1) return `${Number(ageMa.toFixed(ageMa < 10 ? 2 : 1))} Ma`;
    return `${Math.round(ageMa * 1000).toLocaleString()} ka`;
  }

  function formatHumanYear(year) {
    if (typeof formatYear === 'function') return formatYear(year);
    if (year < 0) return `${Math.abs(year).toLocaleString()} BCE`;
    if (year === 0) return '1 BCE / 1 CE';
    return `${year.toLocaleString()} CE`;
  }

  function chapterRange(chapter) {
    if (chapter.timeline === 'earth') {
      return `${formatEarthAge(chapter.olderMa)} to ${chapter.youngerMa === 0 ? 'present' : formatEarthAge(chapter.youngerMa)}`;
    }
    return `${formatHumanYear(chapter.startYear)} to ${formatHumanYear(chapter.endYear)}`;
  }

  function momentDate(chapter, moment) {
    return chapter.timeline === 'earth' ? formatEarthAge(moment.timeMa) : formatHumanYear(moment.year);
  }

  function currentChapter() {
    const engine = globalThis.WorldlineEarthHistory;
    if (!engine) return null;
    if (engine.getMode() === 'earth') {
      const age = Number(engine.getEarthAgeMa());
      return catalog.chapters.find((chapter) => chapter.timeline === 'earth' && age <= chapter.olderMa && age > chapter.youngerMa)
        || catalog.chapters.find((chapter) => chapter.timeline === 'earth' && chapter.youngerMa === 0);
    }
    const year = Number(engine.getHumanYear());
    return catalog.chapters.find((chapter) => chapter.timeline === 'human' && year >= chapter.startYear && year <= chapter.endYear)
      || catalog.chapters.find((chapter) => chapter.timeline === 'human' && year < chapter.startYear)
      || catalog.chapters.filter((chapter) => chapter.timeline === 'human').at(-1);
  }

  function selectChapterTime(chapter) {
    const engine = globalThis.WorldlineEarthHistory;
    if (!engine) return;
    if (chapter.timeline === 'earth') {
      engine.setMode('earth', { source: 'history-chapter' });
      engine.setEarthAge(chapter.anchorMa, { source: 'history-chapter' });
    } else {
      engine.setMode('human', { source: 'history-chapter' });
      engine.setHumanYear(chapter.anchorYear, { source: 'history-chapter' });
    }
  }

  function selectMoment(chapter, moment) {
    const engine = globalThis.WorldlineEarthHistory;
    if (!engine) return;
    if (chapter.timeline === 'earth') {
      engine.setMode('earth', { source: 'history-moment' });
      engine.setEarthAge(moment.timeMa, { source: 'history-moment' });
    } else {
      engine.setMode('human', { source: 'history-moment' });
      engine.setHumanYear(moment.year, { source: 'history-moment' });
    }
    syncTimelineCard(true);
  }

  function flyToRegion(region) {
    if (!region?.center || typeof map === 'undefined' || !mapReady) return;
    globalThis.WorldlineUI?.close('place', { reason: 'history-region-map' });
    setTimeout(() => map.flyTo({
      center: region.center,
      zoom: region.zoom || 3,
      pitch: 24,
      bearing: 0,
      duration: 1500,
      essential: true
    }), 40);
  }

  function renderChanges(chapter) {
    return `
      <section class="history-section history-change-section" aria-labelledby="historyChangesTitle">
        <h3 id="historyChangesTitle">What changed</h3>
        <div class="history-inset-list">
          ${chapter.changes.map((change, index) => `
            <div class="history-change-row">
              <span class="history-row-number" aria-hidden="true">${index + 1}</span>
              <p>${escapeMarkup(change)}</p>
            </div>`).join('')}
        </div>
      </section>`;
  }

  function renderMoments(chapter) {
    return `
      <section class="history-section" aria-labelledby="historyMomentsTitle">
        <h3 id="historyMomentsTitle">Key moments</h3>
        <div class="history-inset-list history-moment-list">
          ${chapter.moments.map((moment, index) => `
            <button class="history-moment-row" type="button" data-history-moment="${index}">
              <span class="history-moment-date">${escapeMarkup(momentDate(chapter, moment))}</span>
              <span class="history-moment-copy">
                <strong>${escapeMarkup(moment.title)}</strong>
                <span>${escapeMarkup(moment.summary)}</span>
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
            </button>`).join('')}
        </div>
      </section>`;
  }

  function renderRegions(chapter) {
    if (!chapter.regions?.length) {
      return `
        <section class="history-section history-notice-section" aria-labelledby="historyMapTitle">
          <h3 id="historyMapTitle">How to read the globe</h3>
          <div class="history-notice-card">
            <span class="history-notice-icon" aria-hidden="true">◎</span>
            <p>Deep-time geography is model based. Coastlines can be explored globally, but modern place coordinates are not projected backward as if they were fixed.</p>
          </div>
        </section>`;
    }
    return `
      <section class="history-section" aria-labelledby="historyRegionsTitle">
        <h3 id="historyRegionsTitle">Where to explore</h3>
        <div class="history-region-grid">
          ${chapter.regions.map((region, index) => `
            <button class="history-region-card" type="button" data-history-region="${index}">
              <span class="history-region-map" aria-hidden="true"><i></i></span>
              <span><strong>${escapeMarkup(region.name)}</strong><small>${escapeMarkup(region.note)}</small></span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
            </button>`).join('')}
        </div>
      </section>`;
  }

  function renderSources(chapter) {
    const sourceRows = chapter.sourceIds.map(sourceFor).filter(Boolean);
    return `
      <section class="history-section history-source-section">
        <details class="history-source-disclosure">
          <summary>
            <span><strong>Sources and uncertainty</strong><small>${escapeMarkup(chapter.confidence)}</small></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
          </summary>
          <div class="history-source-body">
            <p>${escapeMarkup(catalog.editorialNote)}</p>
            ${sourceRows.map((source) => `
              <a href="${escapeMarkup(source.url)}" target="_blank" rel="noreferrer">
                <span><strong>${escapeMarkup(source.label)}</strong><small>${escapeMarkup(source.role)}</small></span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
              </a>`).join('')}
          </div>
        </details>
      </section>`;
  }

  function renderBriefing(chapter) {
    const sheet = document.querySelector('#placeSheet');
    const evidence = document.querySelector('#placeEvidence');
    if (!sheet || !evidence || activeChapterId !== chapter.id) return;

    sheet.dataset.contentType = 'history';
    document.querySelector('#historyBriefing')?.remove();
    const briefing = document.createElement('div');
    briefing.id = 'historyBriefing';
    briefing.className = 'history-briefing';
    briefing.innerHTML = `
      <section class="history-overview" aria-label="Chapter overview">
        <p>${escapeMarkup(chapter.overview)}</p>
        <div class="history-theme-row" aria-label="Themes">
          ${chapter.themes.slice(0, 6).map((theme) => `<span>${escapeMarkup(theme)}</span>`).join('')}
        </div>
      </section>
      ${renderChanges(chapter)}
      ${renderMoments(chapter)}
      ${renderRegions(chapter)}
      ${renderSources(chapter)}
    `;
    evidence.insertAdjacentElement('afterend', briefing);

    briefing.querySelectorAll('[data-history-moment]').forEach((button) => {
      button.addEventListener('click', () => selectMoment(chapter, chapter.moments[Number(button.dataset.historyMoment)]));
    });
    briefing.querySelectorAll('[data-history-region]').forEach((button) => {
      button.addEventListener('click', () => flyToRegion(chapter.regions[Number(button.dataset.historyRegion)]));
    });

    const expand = document.querySelector('#placeExpand');
    if (document.querySelector('#placeSheet')?.dataset.detent === 'peek') setTimeout(() => expand?.click(), 50);
  }

  function openChapter(chapter, { setTime = true } = {}) {
    if (!chapter || typeof globalThis.openPlaceCard !== 'function') return;
    if (setTime) selectChapterTime(chapter);
    activeChapterId = chapter.id;
    globalThis.WorldlineUI?.dismiss({ reason: 'history-chapter' });
    const primarySource = sourceFor(chapter.sourceIds[0]);
    setTimeout(() => {
      globalThis.openPlaceCard({
        name: chapter.title,
        eyebrow: chapter.timeline === 'earth' ? 'Earth History chapter' : 'Human History chapter',
        subtitle: chapterRange(chapter),
        range: chapterRange(chapter),
        confidence: chapter.confidence,
        evidence: `${chapter.moments.length} reviewed turning points`,
        note: chapter.dek,
        sourceUrl: primarySource?.url || '',
        wikiTitle: chapter.aliases?.[0] || chapter.title,
        wikidata: '',
        coordinates: null
      });
      renderBriefing(chapter);
      setTimeout(() => renderBriefing(chapter), 450);
      setTimeout(() => renderBriefing(chapter), 1200);
    }, 30);
  }

  function scoreChapter(chapter, term) {
    if (!term) return 0;
    const candidates = [chapter.title, ...(chapter.aliases || []), ...(chapter.themes || []), ...chapter.moments.map((moment) => moment.title)]
      .map(normalize)
      .filter(Boolean);
    let score = 0;
    for (const candidate of candidates) {
      if (candidate === term) score = Math.max(score, 220);
      else if (candidate.startsWith(term)) score = Math.max(score, 175);
      else if (candidate.includes(term)) score = Math.max(score, 135);
      else if (term.includes(candidate) && candidate.length > 4) score = Math.max(score, 105);
      else {
        const tokens = term.split(' ');
        const hits = tokens.filter((token) => token.length > 2 && candidate.includes(token)).length;
        if (hits) score = Math.max(score, 55 + (hits * 18));
      }
    }
    return score;
  }

  function historySearch(query, limit = 8) {
    const term = normalize(query);
    if (!term) {
      const active = currentChapter();
      return active ? [{ chapter: active, score: 250 }] : [];
    }
    return catalog.chapters
      .map((chapter) => ({ chapter, score: scoreChapter(chapter, term) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }

  function searchResult(entry) {
    const chapter = entry.chapter;
    const firstRegion = chapter.regions?.[0];
    return {
      id: `history:${chapter.id}`,
      type: 'topic',
      historyId: chapter.id,
      title: chapter.title,
      subtitle: chapterRange(chapter),
      status: chapter.timeline === 'earth' ? 'Researched Earth History chapter' : 'Researched Human History chapter',
      targetYear: chapter.timeline === 'human' ? chapter.anchorYear : 0,
      start: chapter.timeline === 'human' ? chapter.startYear : 0,
      end: chapter.timeline === 'human' ? chapter.endYear : 0,
      center: firstRegion?.center || null,
      zoom: firstRegion?.zoom || 2.5,
      wikipediaTitle: chapter.aliases?.[0] || chapter.title,
      description: chapter.dek
    };
  }

  function wrapSearch() {
    if (searchWrapped || !globalThis.WorldlineSearch?.search) return false;
    baseSearch = globalThis.WorldlineSearch;
    globalThis.WorldlineSearch = Object.freeze({
      ...baseSearch,
      BUILD,
      search(query, options = {}) {
        const limit = Number(options.limit || 8);
        const historyResults = historySearch(query, limit).map(searchResult);
        const baseResult = baseSearch.search(query, { ...options, limit });
        const seen = new Set(historyResults.map((result) => normalize(result.title)));
        const combined = [
          ...historyResults,
          ...(baseResult.results || []).filter((result) => !seen.has(normalize(result.title)))
        ].slice(0, limit);
        return { ...baseResult, results: combined, historyCount: historyResults.length };
      },
      history: Object.freeze(catalog.chapters.map((chapter) => ({ ...chapter })))
    });
    searchWrapped = true;
    return true;
  }

  function chapterFromSuggestion(target) {
    const title = target?.closest?.('.search-suggestion')?.querySelector('.search-suggestion-title')?.textContent?.trim();
    return title ? chapterByTitle.get(normalize(title)) : null;
  }

  function interceptSearchClick(event) {
    const suggestion = event.target.closest?.('.search-suggestion');
    if (!suggestion) return;
    const chapter = chapterFromSuggestion(suggestion);
    if (!chapter) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openChapter(chapter);
  }

  function interceptSearchKeyboard(event) {
    if (event.key !== 'Enter' || event.target?.id !== 'historySearch') return;
    const activeId = event.target.getAttribute('aria-activedescendant');
    const option = activeId ? document.getElementById(activeId) : null;
    const chapter = chapterFromSuggestion(option);
    if (!chapter) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openChapter(chapter);
  }

  function interceptTimelineExplore(event) {
    if (!event.target.closest?.('#timelineEraExplore') && !event.target.closest?.('#timelineEraCard')) return;
    const chapter = currentChapter();
    if (!chapter) return;
    if (event.target.closest?.('#timelineEraCard') && event.target.closest?.('button') && !event.target.closest?.('#timelineEraExplore')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openChapter(chapter, { setTime: false });
  }

  function syncTimelineCard(force = false) {
    const chapter = currentChapter();
    if (!chapter) return false;
    const engine = globalThis.WorldlineEarthHistory;
    const selected = engine.getMode() === 'earth' ? engine.getEarthAgeMa() : engine.getHumanYear();
    const signature = `${chapter.id}|${selected}`;
    if (!force && signature === lastTimelineSignature) return true;
    lastTimelineSignature = signature;

    const title = document.querySelector('#timelineEraTitle');
    const summary = document.querySelector('#timelineEraSummary');
    const meta = document.querySelector('#timelineEraMeta');
    if (title) title.textContent = chapter.title;
    if (summary) summary.textContent = chapter.dek;
    if (meta) meta.textContent = `${chapter.moments.length} key moments · ${chapter.timeline === 'earth' ? 'Earth History' : 'Human History'}`;
    document.querySelector('#timelineEraCard')?.setAttribute('data-history-chapter', chapter.id);
    return true;
  }

  function indexTitles() {
    for (const chapter of catalog.chapters) {
      chapterByTitle.set(normalize(chapter.title), chapter);
      (chapter.aliases || []).forEach((alias) => chapterByTitle.set(normalize(alias), chapter));
      chapter.moments.forEach((moment) => chapterByTitle.set(normalize(moment.title), chapter));
    }
  }

  function installEvents() {
    document.addEventListener('click', interceptSearchClick, true);
    document.addEventListener('click', interceptTimelineExplore, true);
    document.addEventListener('keydown', interceptSearchKeyboard, true);
    window.addEventListener('worldline:timeline-mode', () => setTimeout(() => syncTimelineCard(true), 0));
  }

  function initialize() {
    if (initialized) return true;
    if (!document.body || !wrapSearch()) return false;
    indexTitles();
    installEvents();
    const syncTimer = setInterval(() => {
      if (!globalThis.WorldlineEarthHistory || !document.querySelector('#timelineEraCard')) return;
      syncTimelineCard();
    }, 180);
    window.addEventListener('pagehide', () => clearInterval(syncTimer), { once: true });
    initialized = true;
    window.__WORLDLINE_HISTORY_ENGINE_BUILD__ = BUILD;
    globalThis.WorldlineHistory = Object.freeze({
      BUILD,
      catalog,
      current: currentChapter,
      open: (id) => openChapter(chapterById.get(id)),
      search: historySearch,
      selectMoment
    });
    return true;
  }

  const installer = setInterval(() => {
    if (initialize()) clearInterval(installer);
  }, 50);
})();
