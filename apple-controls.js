(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r9';
  const SLIDER_MAX = 1000;
  const TIMELINE_STOPS = [-15000, -10000, -6500, -3500, -1200, 0, 500, 1100, 1500, 1750, 1900, 2026];
  const ICONS = {
    site: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"></path><circle cx="12" cy="10" r="2.2"></circle></svg>',
    year: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3"></rect><path d="M8 3.5v4M16 3.5v4M4 10h16"></path></svg>',
    package: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7.5 12 3l7.5 4.5V17L12 21l-7.5-4V7.5Z"></path><path d="m4.5 7.5 7.5 4.3 7.5-4.3M12 11.8V21"></path></svg>',
    period: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7v5l3.4 2"></path></svg>',
    topic: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M3.7 12h16.6M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5"></path></svg>'
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
  let ui;
  let searchEngine;

  function escapeMarkup(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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

    document.querySelector('#timelineHudClose').addEventListener('click', () => ui.close('timeline', { reason: 'timeline-close-button' }));
    document.querySelector('#advancedControlsButton').addEventListener('click', () => ui.activate('settings', {}, { reason: 'more-controls' }));
    timelineSlider.addEventListener('input', () => {
      setYear(positionToYear(timelineSlider.value));
      syncTimeline();
    });
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
    searchCancel.addEventListener('click', () => ui.close('search', { reason: 'search-cancel' }));

    searchInput.setAttribute('role', 'combobox');
    searchInput.setAttribute('aria-autocomplete', 'list');
    searchInput.setAttribute('aria-controls', 'searchSuggestions');
    searchInput.setAttribute('aria-expanded', 'false');
  }

  function showTimeline() {
    timelineHud.dataset.open = 'true';
    timelineHud.setAttribute('aria-hidden', 'false');
    yearButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('timeline-active');
    syncTimeline();
  }

  function hideTimeline() {
    if (!timelineHud) return;
    timelineHud.dataset.open = 'false';
    timelineHud.setAttribute('aria-hidden', 'true');
    yearButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('timeline-active');
  }

  function showSearch(payload = {}) {
    document.body.classList.add('search-active');
    updateSuggestions();
    suggestions.dataset.open = 'true';
    searchInput.setAttribute('aria-expanded', 'true');
    if (payload.focus) requestAnimationFrame(() => searchInput.focus({ preventScroll: true }));
  }

  function hideSearch(payload = {}) {
    suggestions.dataset.open = 'false';
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.removeAttribute('aria-activedescendant');
    document.body.classList.remove('search-active');
    renderedSuggestions = [];
    activeSuggestionIndex = 0;
    if (payload.clear) searchInput.value = '';
    if (payload.blur !== false && document.activeElement === searchInput) searchInput.blur();
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
    timelineSlider.value = String(position);
    timelineSlider.style.setProperty('--timeline-progress', `${(position / SLIDER_MAX) * 100}%`);
    timelineSlider.setAttribute('aria-valuetext', formatYear(selectedYear));
    timelineValue.textContent = formatYear(selectedYear);
    timelineEra.textContent = typeof currentEra === 'function' ? currentEra().label : 'Historical timeline';
  }

  function buildSuggestions() {
    return searchEngine.search(searchInput.value.trim(), { currentYear: selectedYear, limit: 8 }).results;
  }

  function iconType(result) {
    return ICONS[result.type] ? result.type : 'site';
  }

  function renderSuggestion(result, index) {
    const type = iconType(result);
    return `
      <button id="search-option-${index}" class="search-suggestion" type="button" role="option" aria-selected="${index === activeSuggestionIndex}" data-index="${index}">
        <span class="search-suggestion-icon ${type}">${ICONS[type]}</span>
        <span class="search-suggestion-copy">
          <span class="search-suggestion-title">${escapeMarkup(result.title)}</span>
          <span class="search-suggestion-subtitle">${escapeMarkup(result.subtitle)}</span>
          <span class="search-suggestion-status">${escapeMarkup(result.status || '')}</span>
        </span>
        <svg class="search-suggestion-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
      </button>
    `;
  }

  function updateSuggestions() {
    if (!suggestionList) return;
    renderedSuggestions = buildSuggestions();
    activeSuggestionIndex = Math.min(activeSuggestionIndex, Math.max(0, renderedSuggestions.length - 1));
    suggestionHeading.textContent = searchInput.value.trim() ? 'Best Matches' : `Places in ${formatYear(selectedYear)}`;

    if (!renderedSuggestions.length) {
      suggestionList.innerHTML = `
        <div class="search-empty-state">
          <span class="search-suggestion-icon site">${ICONS.site}</span>
          <div><strong>No reviewed match yet</strong><span>Try a former name, civilization, period, or explicit year.</span></div>
        </div>`;
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

  function siteRange(site) {
    const end = Number(site.end) >= CONFIG.maxYear ? 'present' : formatYear(Number(site.end));
    return `${formatYear(Number(site.start))} to ${end}`;
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

  function openSite(result) {
    const site = result.site;
    const year = result.requestedYear ?? (selectedYear >= site.start && selectedYear <= site.end ? selectedYear : site.start);
    setYear(year);
    const outsideRange = year < site.start || year > site.end;
    const model = {
      name: site.name,
      eyebrow: site.kind || 'Historical place',
      subtitle: `${siteRange(site)}${outsideRange ? ` · viewing ${formatYear(year)}` : ''}`,
      range: siteRange(site),
      confidence: `${Math.round(Number(site.confidence || 0) * 100)}% confidence`,
      evidence: site.evidence || 'reviewed record',
      note: outsideRange
        ? `The selected year falls outside this atlas record's reviewed occupation range. ${site.note || ''}`.trim()
        : site.note || 'Historical dates and settlement extent may remain approximate.',
      sourceUrl: site.source || '',
      wikiTitle: wikipediaTitleFromSource(site.source),
      wikidata: '',
      coordinates: site.coordinates
    };
    globalThis.openPlaceCard(model);
    if (mapReady) setTimeout(() => map.flyTo({
      center: site.coordinates,
      zoom: Math.max(5.8, Math.min(9, map.getZoom() + 3.2)),
      pitch: 28,
      bearing: 0,
      duration: 1500,
      essential: true
    }), 40);
  }

  function openTopic(result) {
    const year = result.requestedYear ?? result.targetYear;
    setYear(year);
    const coordinates = result.center || CONFIG.worldView.center;
    globalThis.openPlaceCard({
      name: result.title,
      eyebrow: 'Historical context view',
      subtitle: result.subtitle,
      range: `${formatYear(result.start)} to ${formatYear(result.end)}`,
      confidence: 'Context only',
      evidence: 'Reference period',
      note: `${result.description}. This search sets a time and camera context; it does not claim a precise territorial boundary or completed reconstruction.`,
      sourceUrl: '',
      wikiTitle: result.wikipediaTitle || result.title,
      wikidata: '',
      coordinates
    });
    if (mapReady && result.center) setTimeout(() => map.flyTo({
      center: result.center,
      zoom: result.zoom || 4,
      pitch: 18,
      bearing: 0,
      duration: 1600,
      essential: true
    }), 40);
  }

  function selectSuggestion(index) {
    const result = renderedSuggestions[index];
    if (!result) return;

    if (result.type === 'year') {
      setYear(result.year);
      ui.activate('timeline', {}, { reason: 'year-search' });
      return;
    }
    if (result.type === 'package') {
      ui.dismiss({ reason: 'package-search' });
      activateReconstructionPackage(result.packageDef, result.requestedYear);
      return;
    }
    if (result.type === 'site') {
      openSite(result);
      return;
    }
    if (result.type === 'topic') {
      openTopic(result);
      return;
    }
    if (result.type === 'period') {
      setYear(result.requestedYear ?? result.targetYear);
      ui.activate('timeline', {}, { reason: 'period-search' });
    }
  }

  function executeSearch() {
    if (renderedSuggestions[activeSuggestionIndex]) selectSuggestion(activeSuggestionIndex);
    else updateSuggestions();
  }

  function bindEvents() {
    document.addEventListener('focus', (event) => {
      if (event.target !== searchInput) return;
      event.stopImmediatePropagation();
      ui.activate('search', { focus: false }, { reason: 'search-focus' });
    }, true);

    searchInput.addEventListener('input', () => {
      activeSuggestionIndex = 0;
      if (!ui.isActive('search')) ui.activate('search', { focus: false }, { reason: 'search-input' });
      else updateSuggestions();
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
        ui.close('search', { reason: 'search-escape' });
      }
    }, true);

    document.addEventListener('click', (event) => {
      if (event.target.closest?.('#yearButton')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        ui.toggle('timeline', {}, { reason: 'date-button' });
      } else if (event.target.closest?.('#brandButton')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        ui.activate('settings', {}, { reason: 'brand-button' });
      } else if (event.target.closest?.('#searchSubmit')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        executeSearch();
      }
    }, true);

    document.addEventListener('pointerdown', (event) => {
      const active = ui.snapshot().active;
      if (active === 'timeline' && !event.target.closest?.('#timelineHud') && !event.target.closest?.('#yearButton')) {
        ui.close('timeline', { reason: 'timeline-outside-tap' });
      }
      if (active === 'search' && !event.target.closest?.('#searchShell')) {
        ui.close('search', { reason: 'search-outside-tap' });
      }
    }, true);
  }

  function installYearSync() {
    const baseSetYear = setYear;
    setYear = function setYearWithUnifiedControls(year, options) {
      const result = baseSetYear(year, options);
      syncTimeline();
      if (ui.isActive('search') && !searchInput.value.trim()) updateSuggestions();
      return result;
    };
  }

  function polishAdvancedPanel() {
    const kicker = document.querySelector('.panel-header .panel-kicker');
    const timelineLabel = document.querySelector('.timeline-heading label[for="timeSlider"]');
    if (kicker) kicker.textContent = 'Map Settings';
    if (timelineLabel) timelineLabel.textContent = 'Exact date and playback';
    yearButton.setAttribute('aria-haspopup', 'dialog');
    yearButton.setAttribute('aria-expanded', 'false');
    const marker = document.querySelector('.build-marker');
    if (marker) marker.textContent = `Build ${BUILD} · Unified surfaces and historical search`;
  }

  function initialize() {
    if (initialized) return true;
    if (
      !document.body
      || typeof dom === 'undefined'
      || typeof setYear !== 'function'
      || typeof data === 'undefined'
      || typeof formatYear !== 'function'
      || !globalThis.WorldlineUI
      || !globalThis.WorldlineSearch
      || !window.__WORLDLINE_UI_ADAPTERS_BUILD__
    ) return false;

    ui = globalThis.WorldlineUI;
    searchEngine = globalThis.WorldlineSearch;
    searchInput = document.querySelector('#historySearch');
    searchShell = document.querySelector('#searchShell');
    searchSubmit = document.querySelector('#searchSubmit');
    yearButton = document.querySelector('#yearButton');
    if (!searchInput || !searchShell || !searchSubmit || !yearButton) return false;

    createTimelineHud();
    createSearchSuggestions();
    ui.register('timeline', { open: showTimeline, close: hideTimeline, isOpen: () => timelineHud?.dataset.open === 'true' });
    ui.register('search', { open: showSearch, close: hideSearch, isOpen: () => suggestions?.dataset.open === 'true' });
    installYearSync();
    polishAdvancedPanel();
    bindEvents();
    syncTimeline();
    syncPlayState();
    initialized = true;
    window.__WORLDLINE_APPLE_CONTROLS_BUILD__ = BUILD;
    ui.reconcile();
    return true;
  }

  const installer = setInterval(() => {
    if (initialize()) clearInterval(installer);
  }, 60);
})();