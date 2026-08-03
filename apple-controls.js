(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r8';
  const SLIDER_MAX = 1000;
  const TIMELINE_STOPS = [-15000, -10000, -6500, -3500, -1200, 0, 500, 1100, 1500, 1750, 1900, 2026];
  const ICONS = {
    place: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"></path><circle cx="12" cy="10" r="2.2"></circle></svg>',
    year: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3"></rect><path d="M8 3.5v4M16 3.5v4M4 10h16"></path></svg>',
    package: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7.5 12 3l7.5 4.5V17L12 21l-7.5-4V7.5Z"></path><path d="m4.5 7.5 7.5 4.3 7.5-4.3M12 11.8V21"></path></svg>'
  };

  let initialized = false;
  let activeSuggestionIndex = 0;
  let renderedSuggestions = [];
  let timelineHud;
  let timelineSlider;
  let timelineValue;
  let timelineEra;
  let timelinePlay;
  let suggestions;
  let suggestionHeading;
  let suggestionList;
  let searchCancel;
  let searchInput;
  let searchShell;
  let searchSubmit;
  let yearButton;
  let advancedButton;
  let originalSetSheetOpen;

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

  function readYear(query) {
    const era = String(query).match(/(-?\d{1,5})\s*(BCE|BC|CE|AD)\b/i);
    if (era) {
      const magnitude = Math.abs(Number(era[1]));
      return /BCE|BC/i.test(era[2]) ? -magnitude : magnitude;
    }
    const signed = String(query).match(/(?:^|\s)(-\d{1,5})(?:\s|$)/);
    return signed ? Number(signed[1]) : null;
  }

  function readPlaceTerm(query) {
    return normalize(String(query)
      .replace(/-?\d{1,5}\s*(BCE|BC|CE|AD)\b/ig, ' ')
      .replace(/(?:^|\s)-\d{1,5}(?:\s|$)/g, ' ')
      .replace(/\b(show|take|bring|find|search|tell|what|was|were|did|does|look|like|me|to|in|during|around|at|the|a|an|map|year|history|historical|of)\b/ig, ' '));
  }

  function yearToPosition(year) {
    const value = Math.max(TIMELINE_STOPS[0], Math.min(TIMELINE_STOPS.at(-1), Number(year)));
    const segmentWidth = SLIDER_MAX / (TIMELINE_STOPS.length - 1);
    for (let index = 0; index < TIMELINE_STOPS.length - 1; index += 1) {
      const start = TIMELINE_STOPS[index];
      const end = TIMELINE_STOPS[index + 1];
      if (value >= start && value <= end) {
        const ratio = (value - start) / (end - start || 1);
        return Math.round((index + ratio) * segmentWidth);
      }
    }
    return value <= TIMELINE_STOPS[0] ? 0 : SLIDER_MAX;
  }

  function positionToYear(position) {
    const bounded = Math.max(0, Math.min(SLIDER_MAX, Number(position)));
    const scaled = bounded / (SLIDER_MAX / (TIMELINE_STOPS.length - 1));
    const index = Math.min(TIMELINE_STOPS.length - 2, Math.floor(scaled));
    const ratio = scaled - index;
    const start = TIMELINE_STOPS[index];
    const end = TIMELINE_STOPS[index + 1];
    return Math.round(start + ((end - start) * ratio));
  }

  function createTimelineHud() {
    const stage = document.querySelector('.map-stage');
    if (!stage || document.querySelector('#timelineHud')) return;
    stage.insertAdjacentHTML('beforeend', `
      <section id="timelineHud" class="timeline-hud" data-open="false" aria-hidden="true" aria-label="Historical timeline">
        <header class="timeline-hud-header">
          <div>
            <p class="timeline-hud-kicker">Historical time</p>
            <h2 id="timelineHudValue" class="timeline-hud-value">117 CE</h2>
          </div>
          <button id="timelineHudClose" class="timeline-hud-close" type="button" aria-label="Close timeline">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
          </button>
        </header>
        <div class="timeline-slider-row">
          <button id="timelineHudPlay" class="timeline-play" type="button" aria-label="Play timeline">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5 18 12 8 18.5V5.5Z"></path></svg>
          </button>
          <div class="timeline-slider-wrap">
            <input id="timelinePrimarySlider" class="timeline-primary-slider" type="range" min="0" max="${SLIDER_MAX}" step="1" value="0" aria-label="Historical year" />
          </div>
        </div>
        <div class="timeline-scale" aria-hidden="true"><span>15,000 BCE</span><span>Present</span></div>
        <footer class="timeline-hud-footer">
          <p id="timelineHudEra" class="timeline-hud-era">Classical urban systems</p>
          <button id="advancedControlsButton" class="timeline-more-button" type="button">More Controls</button>
        </footer>
      </section>
    `);

    timelineHud = document.querySelector('#timelineHud');
    timelineSlider = document.querySelector('#timelinePrimarySlider');
    timelineValue = document.querySelector('#timelineHudValue');
    timelineEra = document.querySelector('#timelineHudEra');
    timelinePlay = document.querySelector('#timelineHudPlay');
    advancedButton = document.querySelector('#advancedControlsButton');

    document.querySelector('#timelineHudClose').addEventListener('click', closeTimeline);
    advancedButton.addEventListener('click', openAdvancedControls);
    timelineSlider.addEventListener('input', () => {
      const year = positionToYear(timelineSlider.value);
      setYear(year);
      syncTimeline();
    });
    timelineSlider.addEventListener('change', syncTimeline);
    timelinePlay.addEventListener('click', () => {
      dom.playButton.click();
      syncPlayState();
    });

    const observer = new MutationObserver(syncPlayState);
    observer.observe(dom.playButton, { childList: true, characterData: true, subtree: true });
  }

  function createSearchSuggestions() {
    if (document.querySelector('#searchSuggestions')) return;
    suggestions = document.createElement('section');
    suggestions.id = 'searchSuggestions';
    suggestions.className = 'search-suggestions';
    suggestions.dataset.open = 'false';
    suggestions.setAttribute('role', 'listbox');
    suggestions.setAttribute('aria-label', 'Search suggestions');
    suggestions.innerHTML = '<div id="searchSuggestionHeading" class="search-suggestion-heading">Suggestions</div><div id="searchSuggestionList"></div>';
    searchShell.insertBefore(suggestions, searchShell.querySelector('.search-feedback'));
    suggestionHeading = document.querySelector('#searchSuggestionHeading');
    suggestionList = document.querySelector('#searchSuggestionList');

    searchCancel = document.createElement('button');
    searchCancel.id = 'searchCancel';
    searchCancel.className = 'search-cancel';
    searchCancel.type = 'button';
    searchCancel.textContent = 'Cancel';
    searchCancel.setAttribute('aria-label', 'Cancel search');
    searchShell.querySelector('.search-row').appendChild(searchCancel);
    searchCancel.addEventListener('click', () => closeSearchSurface({ blur: true, clear: false }));

    searchInput.setAttribute('role', 'combobox');
    searchInput.setAttribute('aria-autocomplete', 'list');
    searchInput.setAttribute('aria-controls', 'searchSuggestions');
    searchInput.setAttribute('aria-expanded', 'false');
  }

  function openTimeline() {
    if (!timelineHud) return;
    closeSearchSurface({ blur: true, clear: false });
    if (typeof globalThis.closePlaceCard === 'function') globalThis.closePlaceCard();
    setAdvancedControls(false);
    timelineHud.dataset.open = 'true';
    timelineHud.setAttribute('aria-hidden', 'false');
    yearButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('timeline-active');
    syncTimeline();
  }

  function closeTimeline() {
    if (!timelineHud) return;
    timelineHud.dataset.open = 'false';
    timelineHud.setAttribute('aria-hidden', 'true');
    yearButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('timeline-active');
  }

  function toggleTimeline() {
    if (timelineHud?.dataset.open === 'true') closeTimeline();
    else openTimeline();
  }

  function syncPlayState() {
    if (!timelinePlay) return;
    const playing = dom.playButton.textContent.trim() !== '▶';
    timelinePlay.setAttribute('aria-label', playing ? 'Pause timeline' : 'Play timeline');
    timelinePlay.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z"></path></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5 18 12 8 18.5V5.5Z"></path></svg>';
  }

  function syncTimeline() {
    if (!timelineSlider || typeof selectedYear === 'undefined') return;
    const position = yearToPosition(selectedYear);
    const progress = `${(position / SLIDER_MAX) * 100}%`;
    timelineSlider.value = String(position);
    timelineSlider.style.setProperty('--timeline-progress', progress);
    timelineSlider.setAttribute('aria-valuetext', formatYear(selectedYear));
    timelineValue.textContent = formatYear(selectedYear);
    timelineEra.textContent = typeof currentEra === 'function' ? currentEra().label : 'Historical timeline';
  }

  function setAdvancedControls(open) {
    globalThis.__WORLDLINE_OPENING_ADVANCED__ = Boolean(open);
    try {
      originalSetSheetOpen(Boolean(open));
    } finally {
      globalThis.__WORLDLINE_OPENING_ADVANCED__ = false;
    }
  }

  function openAdvancedControls() {
    closeTimeline();
    closeSearchSurface({ blur: true, clear: false });
    if (typeof globalThis.closePlaceCard === 'function') globalThis.closePlaceCard();
    setAdvancedControls(true);
  }

  function closeSearchSurface({ blur = false, clear = false } = {}) {
    if (!suggestions) return;
    suggestions.dataset.open = 'false';
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.removeAttribute('aria-activedescendant');
    document.body.classList.remove('search-active');
    renderedSuggestions = [];
    activeSuggestionIndex = 0;
    if (clear) searchInput.value = '';
    if (blur) searchInput.blur();
  }
  globalThis.closeSearchSurface = closeSearchSurface;

  function showSearchSurface() {
    closeTimeline();
    if (typeof globalThis.closePlaceCard === 'function') globalThis.closePlaceCard();
    setAdvancedControls(false);
    document.body.classList.add('search-active');
    updateSuggestions();
    suggestions.dataset.open = 'true';
    searchInput.setAttribute('aria-expanded', 'true');
  }

  function scoreSite(site, term, requestedYear) {
    const name = normalize(site.name);
    const kind = normalize(site.kind);
    let score = 0;
    if (!term) score = Number(site.confidence || 0) * 20;
    else if (name === term) score = 100;
    else if (name.startsWith(term)) score = 82;
    else if (name.includes(term)) score = 65;
    else if (term.includes(name)) score = 55;
    else if (kind.includes(term)) score = 34;
    else return -1;

    const year = requestedYear ?? selectedYear;
    if (year >= site.start && year <= site.end) score += 16;
    score += Number(site.confidence || 0) * 8;
    return score;
  }

  function siteRange(site) {
    const end = Number(site.end) >= CONFIG.maxYear ? 'present' : formatYear(Number(site.end));
    return `${formatYear(Number(site.start))} to ${end}`;
  }

  function buildSuggestions(query) {
    const requestedYear = readYear(query);
    const term = readPlaceTerm(query);
    const results = [];

    if (requestedYear !== null && requestedYear >= CONFIG.minYear && requestedYear <= CONFIG.maxYear) {
      results.push({
        type: 'year',
        year: requestedYear,
        title: formatYear(requestedYear),
        subtitle: 'Jump to this point in the timeline',
        score: 130
      });
    }

    if (term && typeof reconstructionPackageRegistry !== 'undefined') {
      reconstructionPackageRegistry.forEach((packageDef) => {
        const aliasMatch = packageDef.aliases.some((alias) => normalize(alias).includes(term) || term.includes(normalize(alias)));
        const yearMatch = requestedYear === null || (requestedYear >= packageDef.validWindow.start && requestedYear <= packageDef.validWindow.end);
        if (aliasMatch && yearMatch) {
          results.push({
            type: 'package',
            packageDef,
            requestedYear,
            title: packageDef.title,
            subtitle: 'Reviewed reconstruction package',
            score: 150
          });
        }
      });
    }

    data.settlements
      .map((site) => ({ site, score: scoreSite(site, term, requestedYear) }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, term ? 7 : 5)
      .forEach(({ site, score }) => {
        const duplicatePackage = results.some((result) => result.type === 'package' && normalize(result.packageDef.title).includes(normalize(site.name)));
        if (duplicatePackage) return;
        results.push({
          type: 'site',
          site,
          requestedYear,
          title: site.name,
          subtitle: `${site.kind} · ${siteRange(site)}`,
          score
        });
      });

    return results.sort((a, b) => b.score - a.score).slice(0, 7);
  }

  function renderSuggestion(result, index) {
    const iconType = result.type === 'year' ? 'year' : result.type === 'package' ? 'package' : 'place';
    return `
      <button id="search-option-${index}" class="search-suggestion" type="button" role="option" aria-selected="${index === activeSuggestionIndex}" data-index="${index}">
        <span class="search-suggestion-icon ${iconType}">${ICONS[iconType]}</span>
        <span class="search-suggestion-copy">
          <span class="search-suggestion-title">${escapeMarkup(result.title)}</span>
          <span class="search-suggestion-subtitle">${escapeMarkup(result.subtitle)}</span>
        </span>
        <svg class="search-suggestion-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
      </button>
    `;
  }

  function updateSuggestions() {
    if (!suggestionList) return;
    renderedSuggestions = buildSuggestions(searchInput.value.trim());
    activeSuggestionIndex = Math.min(activeSuggestionIndex, Math.max(0, renderedSuggestions.length - 1));
    suggestionHeading.textContent = searchInput.value.trim()
      ? 'Suggestions'
      : `Places in ${formatYear(selectedYear)}`;

    if (!renderedSuggestions.length) {
      suggestionList.innerHTML = `
        <button class="search-suggestion" type="button" disabled>
          <span class="search-suggestion-icon">${ICONS.place}</span>
          <span class="search-suggestion-copy"><span class="search-suggestion-title">No reviewed match yet</span><span class="search-suggestion-subtitle">Try a city name, a settlement, or a year</span></span>
          <span></span>
        </button>`;
      searchInput.removeAttribute('aria-activedescendant');
      return;
    }

    suggestionList.innerHTML = renderedSuggestions.map(renderSuggestion).join('');
    searchInput.setAttribute('aria-activedescendant', `search-option-${activeSuggestionIndex}`);
    suggestionList.querySelectorAll('.search-suggestion[data-index]').forEach((button) => {
      button.addEventListener('pointerdown', (event) => event.preventDefault());
      button.addEventListener('click', () => selectSuggestion(Number(button.dataset.index)));
    });
  }

  function updateActiveSuggestion(nextIndex) {
    if (!renderedSuggestions.length) return;
    activeSuggestionIndex = (nextIndex + renderedSuggestions.length) % renderedSuggestions.length;
    suggestionList.querySelectorAll('.search-suggestion[data-index]').forEach((button) => {
      const selected = Number(button.dataset.index) === activeSuggestionIndex;
      button.setAttribute('aria-selected', String(selected));
      if (selected) button.scrollIntoView({ block: 'nearest' });
    });
    searchInput.setAttribute('aria-activedescendant', `search-option-${activeSuggestionIndex}`);
  }

  function wikipediaTitleFromSource(source) {
    try {
      const url = new URL(source);
      const marker = '/wiki/';
      const index = url.pathname.indexOf(marker);
      if (!url.hostname.endsWith('wikipedia.org') || index < 0) return '';
      return decodeURIComponent(url.pathname.slice(index + marker.length)).replaceAll('_', ' ');
    } catch (_) {
      return '';
    }
  }

  function openSite(site, requestedYear = null) {
    const year = requestedYear !== null
      ? requestedYear
      : (selectedYear >= site.start && selectedYear <= site.end ? selectedYear : site.start);
    setYear(year);
    closeSearchSurface({ blur: true, clear: false });

    const model = {
      name: site.name,
      eyebrow: site.kind || 'Historical place',
      subtitle: siteRange(site),
      range: siteRange(site),
      confidence: `${Math.round(Number(site.confidence || 0) * 100)}% confidence`,
      evidence: site.evidence || 'reviewed record',
      note: site.note || 'Historical dates and settlement extent may remain approximate.',
      sourceUrl: site.source || '',
      wikiTitle: wikipediaTitleFromSource(site.source),
      wikidata: '',
      coordinates: site.coordinates
    };

    if (typeof globalThis.openPlaceCard === 'function') globalThis.openPlaceCard(model);
    if (mapReady) {
      setTimeout(() => map.flyTo({
        center: site.coordinates,
        zoom: Math.max(5.8, Math.min(9, map.getZoom() + 3.2)),
        pitch: 28,
        bearing: 0,
        duration: 1500,
        essential: true
      }), 40);
    }
  }

  function selectSuggestion(index) {
    const result = renderedSuggestions[index];
    if (!result) return;
    if (result.type === 'year') {
      setYear(result.year);
      closeSearchSurface({ blur: true, clear: false });
      openTimeline();
      return;
    }
    if (result.type === 'package') {
      closeSearchSurface({ blur: true, clear: false });
      activateReconstructionPackage(result.packageDef, result.requestedYear);
      return;
    }
    openSite(result.site, result.requestedYear);
  }

  function executeSearch() {
    if (renderedSuggestions[activeSuggestionIndex]) {
      selectSuggestion(activeSuggestionIndex);
      return;
    }
    const year = readYear(searchInput.value);
    if (year !== null && year >= CONFIG.minYear && year <= CONFIG.maxYear) {
      setYear(year);
      closeSearchSurface({ blur: true, clear: false });
      openTimeline();
    }
  }

  function bindEvents() {
    document.addEventListener('focus', (event) => {
      if (event.target !== searchInput) return;
      event.stopImmediatePropagation();
      showSearchSurface();
    }, true);

    searchInput.addEventListener('input', () => {
      activeSuggestionIndex = 0;
      document.body.classList.add('search-active');
      suggestions.dataset.open = 'true';
      searchInput.setAttribute('aria-expanded', 'true');
      updateSuggestions();
    });
    searchInput.addEventListener('search', updateSuggestions);

    document.addEventListener('keydown', (event) => {
      if (event.target !== searchInput) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopImmediatePropagation();
        updateActiveSuggestion(activeSuggestionIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopImmediatePropagation();
        updateActiveSuggestion(activeSuggestionIndex - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        executeSearch();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSearchSurface({ blur: true, clear: false });
      }
    }, true);

    document.addEventListener('click', (event) => {
      if (event.target.closest?.('#yearButton')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleTimeline();
        return;
      }
      if (event.target.closest?.('#brandButton')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openAdvancedControls();
        return;
      }
      if (event.target.closest?.('#searchSubmit')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        executeSearch();
      }
    }, true);

    document.addEventListener('pointerdown', (event) => {
      const inTimeline = event.target.closest?.('#timelineHud') || event.target.closest?.('#yearButton');
      if (!inTimeline && timelineHud?.dataset.open === 'true') closeTimeline();

      const inSearch = event.target.closest?.('#searchShell');
      if (!inSearch && suggestions?.dataset.open === 'true') closeSearchSurface({ blur: true, clear: false });
    }, true);
  }

  function installWrappers() {
    originalSetSheetOpen = setSheetOpen;
    setSheetOpen = function guardedSettingsSheet(open, options = {}) {
      const activeId = document.activeElement?.id;
      const searchTriggered = Boolean(open)
        && !globalThis.__WORLDLINE_OPENING_ADVANCED__
        && (activeId === 'historySearch' || activeId === 'searchSubmit');
      if (searchTriggered) return originalSetSheetOpen(false, options);
      if (open) {
        closeTimeline();
        closeSearchSurface({ blur: true, clear: false });
      }
      return originalSetSheetOpen(open, options);
    };

    const baseSetYear = setYear;
    setYear = function setYearWithCompactTimeline(year, options) {
      const result = baseSetYear(year, options);
      syncTimeline();
      if (suggestions?.dataset.open === 'true' && !searchInput.value.trim()) updateSuggestions();
      return result;
    };

    if (typeof activateReconstructionPackage === 'function') {
      const baseActivatePackage = activateReconstructionPackage;
      activateReconstructionPackage = function activatePackageWithoutSettings(packageDef, requestedYear) {
        closeSearchSurface({ blur: true, clear: false });
        closeTimeline();
        setAdvancedControls(false);
        return baseActivatePackage(packageDef, requestedYear);
      };
    }
  }

  function polishAdvancedPanel() {
    const kicker = document.querySelector('.panel-header .panel-kicker');
    const timelineLabel = document.querySelector('.timeline-heading label[for="timeSlider"]');
    if (kicker) kicker.textContent = 'Map Settings';
    if (timelineLabel) timelineLabel.textContent = 'Exact date and playback';
    yearButton.setAttribute('aria-haspopup', 'dialog');
    yearButton.setAttribute('aria-expanded', 'false');
    const marker = document.querySelector('.build-marker');
    if (marker) marker.textContent = `Build ${BUILD} · Compact timeline and predictive search`;
  }

  function initialize() {
    if (initialized) return true;
    if (
      !document.body
      || typeof dom === 'undefined'
      || typeof setYear !== 'function'
      || typeof setSheetOpen !== 'function'
      || typeof data === 'undefined'
      || typeof formatYear !== 'function'
    ) return false;

    searchInput = document.querySelector('#historySearch');
    searchShell = document.querySelector('#searchShell');
    searchSubmit = document.querySelector('#searchSubmit');
    yearButton = document.querySelector('#yearButton');
    if (!searchInput || !searchShell || !searchSubmit || !yearButton) return false;

    createTimelineHud();
    createSearchSuggestions();
    installWrappers();
    polishAdvancedPanel();
    bindEvents();
    syncTimeline();
    syncPlayState();
    initialized = true;
    window.__WORLDLINE_APPLE_CONTROLS_BUILD__ = BUILD;
    return true;
  }

  const installer = setInterval(() => {
    if (initialize()) clearInterval(installer);
  }, 60);
})();
