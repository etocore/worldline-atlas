(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r29';
  const ICONS = Object.freeze({
    site: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"></path><circle cx="12" cy="10" r="2.2"></circle></svg>',
    year: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3"></rect><path d="M8 3.5v4M16 3.5v4M4 10h16"></path></svg>',
    package: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7.5 12 3l7.5 4.5V17L12 21l-7.5-4V7.5Z"></path><path d="m4.5 7.5 7.5 4.3 7.5-4.3M12 11.8V21"></path></svg>',
    period: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7v5l3.4 2"></path></svg>',
    topic: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M3.7 12h16.6M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5"></path></svg>'
  });

  let installed = false;
  let input;
  let shell;
  let submit;
  let suggestions;
  let heading;
  let list;
  let cancel;
  let results = [];
  let activeIndex = 0;

  const ui = () => globalThis.WorldlineUI;
  const search = () => globalThis.WorldlineSearch;
  const timeline = () => globalThis.WorldlineTimelineState;

  function escapeMarkup(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function currentHumanYear() {
    const state = timeline()?.getState?.();
    return Number(state?.humanYear ?? 2026);
  }

  function formatHuman(value) {
    return timeline()?.formatTime?.(value, { domain: 'human', style: 'full' })
      || (Number(value) < 0 ? `${Math.abs(Number(value)).toLocaleString()} BCE` : `${Number(value).toLocaleString()} CE`);
  }

  function createSurface() {
    document.querySelector('#searchSuggestions')?.remove();
    suggestions = document.createElement('section');
    suggestions.id = 'searchSuggestions';
    suggestions.className = 'search-suggestions';
    suggestions.dataset.open = 'false';
    suggestions.setAttribute('role', 'listbox');
    suggestions.setAttribute('aria-label', 'Search suggestions');
    suggestions.innerHTML = '<div id="searchSuggestionHeading" class="search-suggestion-heading">Suggestions</div><div id="searchSuggestionList"></div>';
    shell.insertBefore(suggestions, shell.querySelector('.search-feedback'));
    heading = suggestions.querySelector('#searchSuggestionHeading');
    list = suggestions.querySelector('#searchSuggestionList');

    document.querySelector('#searchCancel')?.remove();
    cancel = document.createElement('button');
    cancel.id = 'searchCancel';
    cancel.className = 'search-cancel';
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.setAttribute('aria-label', 'Cancel search');
    shell.querySelector('.search-row').appendChild(cancel);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'searchSuggestions');
    input.setAttribute('aria-expanded', 'false');
  }

  function show(payload = {}) {
    document.body.classList.add('search-active');
    update();
    suggestions.dataset.open = 'true';
    input.setAttribute('aria-expanded', 'true');
    if (payload.focus !== false) requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  function hide(payload = {}) {
    suggestions.dataset.open = 'false';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    document.body.classList.remove('search-active');
    results = [];
    activeIndex = 0;
    if (payload.clear) input.value = '';
    if (payload.blur !== false && document.activeElement === input) input.blur();
  }

  function iconType(result) {
    return ICONS[result?.type] ? result.type : 'site';
  }

  function renderResult(result, index) {
    const type = iconType(result);
    return `
      <button id="search-option-${index}" class="search-suggestion" type="button" role="option" aria-selected="${index === activeIndex}" data-index="${index}">
        <span class="search-suggestion-icon ${type}">${ICONS[type]}</span>
        <span class="search-suggestion-copy">
          <span class="search-suggestion-title">${escapeMarkup(result.title)}</span>
          <span class="search-suggestion-subtitle">${escapeMarkup(result.subtitle || result.description || '')}</span>
          ${result.status ? `<span class="search-suggestion-status">${escapeMarkup(result.status)}</span>` : ''}
        </span>
        <svg class="search-suggestion-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
      </button>`;
  }

  function update() {
    if (!list) return;
    const response = search().search(input.value.trim(), { currentYear: currentHumanYear(), limit: 8 });
    results = response?.results || [];
    activeIndex = Math.min(activeIndex, Math.max(0, results.length - 1));
    heading.textContent = input.value.trim() ? 'Best Matches' : `Places in ${formatHuman(currentHumanYear())}`;

    if (!results.length) {
      list.innerHTML = `<div class="search-empty-state"><span class="search-suggestion-icon site">${ICONS.site}</span><div><strong>No reviewed match yet</strong><span>Try a former name, civilization, period, or explicit date.</span></div></div>`;
      input.removeAttribute('aria-activedescendant');
      return;
    }

    list.innerHTML = results.map(renderResult).join('');
    input.setAttribute('aria-activedescendant', `search-option-${activeIndex}`);
    list.querySelectorAll('[data-index]').forEach((button) => {
      button.addEventListener('pointerdown', (event) => event.preventDefault());
      button.addEventListener('click', () => select(Number(button.dataset.index)));
    });
  }

  function setActive(index) {
    if (!results.length) return;
    activeIndex = (index + results.length) % results.length;
    list.querySelectorAll('[data-index]').forEach((button) => {
      const selected = Number(button.dataset.index) === activeIndex;
      button.setAttribute('aria-selected', String(selected));
      if (selected) button.scrollIntoView({ block: 'nearest' });
    });
    input.setAttribute('aria-activedescendant', `search-option-${activeIndex}`);
  }

  function siteRange(site) {
    const end = Number(site.end) >= 2026 ? 'present' : formatHuman(Number(site.end));
    return `${formatHuman(Number(site.start))} to ${end}`;
  }

  function wikipediaTitle(source) {
    try {
      const url = new URL(source);
      const marker = '/wiki/';
      const index = url.pathname.indexOf(marker);
      if (!url.hostname.endsWith('wikipedia.org') || index < 0) return '';
      return decodeURIComponent(url.pathname.slice(index + marker.length)).replaceAll('_', ' ');
    } catch (_) { return ''; }
  }

  function fly(center, zoom = 4) {
    try {
      if (typeof mapReady !== 'undefined' && mapReady && Array.isArray(center)) {
        map.flyTo({ center, zoom: Math.max(1, Number(zoom) || 4), bearing: 0, duration: 1200, essential: true });
      }
    } catch (_) {}
  }

  function selectSite(result) {
    const site = result.site;
    if (!site) return;
    const year = Number(result.requestedYear ?? (currentHumanYear() >= site.start && currentHumanYear() <= site.end ? currentHumanYear() : site.start));
    timeline().setHumanYear(year, { source: 'search-site' });
    const outside = year < Number(site.start) || year > Number(site.end);
    const model = {
      name: site.name,
      eyebrow: site.kind || 'Historical place',
      subtitle: `${siteRange(site)}${outside ? ` · viewing ${formatHuman(year)}` : ''}`,
      range: siteRange(site),
      confidence: `${Math.round(Number(site.confidence || 0) * 100)}% confidence`,
      evidence: site.evidence || 'reviewed record',
      note: outside
        ? `The selected year falls outside this record's reviewed occupation range. ${site.note || ''}`.trim()
        : site.note || 'Historical dates and settlement extent may remain approximate.',
      sourceUrl: site.source || '',
      wikiTitle: wikipediaTitle(site.source),
      wikidata: '',
      coordinates: site.coordinates
    };
    if (globalThis.WorldlineUI) ui().activate('place', { model }, { reason: 'search-site' });
    else globalThis.openPlaceCard?.(model);
    fly(site.coordinates, 6.5);
  }

  function selectTopic(result) {
    const year = Number(result.targetYear ?? result.requestedYear ?? currentHumanYear());
    timeline().setHumanYear(year, { source: 'search-topic' });
    fly(result.center, result.zoom);
  }

  function selectPackage(result) {
    const definition = result.packageDef || result.package || {};
    const windowDef = definition.validWindow || {};
    const age = Number(result.ageMa ?? definition.ageMa ?? definition.targetAgeMa ?? ((Number(windowDef.start) + Number(windowDef.end)) / 2));
    if (Number.isFinite(age)) timeline().setEarthAge(age, { source: 'search-package' });
    fly(definition.camera?.center || result.center, definition.camera?.zoom || result.zoom);
  }

  function select(index = activeIndex) {
    const result = results[index];
    if (!result) return;

    if (result.type === 'site') selectSite(result);
    else if (result.type === 'package') selectPackage(result);
    else if (result.type === 'topic') selectTopic(result);
    else if (result.type === 'period') timeline().setHumanYear(Number(result.targetYear), { source: 'search-period' });
    else if (result.type === 'year') timeline().setHumanYear(Number(result.year), { source: 'search-year' });
    else if (Number.isFinite(Number(result.ageMa))) timeline().setEarthAge(Number(result.ageMa), { source: 'search-earth' });
    else if (Number.isFinite(Number(result.targetYear))) timeline().setHumanYear(Number(result.targetYear), { source: 'search-human' });

    input.value = result.title || input.value;
    ui().close('search', { reason: 'search-selection', clear: false });
  }

  function bind() {
    cancel.addEventListener('click', () => ui().close('search', { reason: 'search-cancel', clear: false }));
    input.addEventListener('focus', () => {
      if (!ui().isOpen('settings')) ui().activate('search', { focus: false }, { reason: 'search-focus' });
    });
    input.addEventListener('input', () => {
      activeIndex = 0;
      if (!ui().isOpen('search')) ui().activate('search', { focus: false }, { reason: 'search-input' });
      update();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setActive(activeIndex + 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(activeIndex - 1); }
      else if (event.key === 'Enter') { event.preventDefault(); select(); }
      else if (event.key === 'Escape') { event.preventDefault(); ui().close('search', { reason: 'escape' }); }
    });
    submit.addEventListener('click', () => {
      if (!ui().isOpen('search')) ui().activate('search', { focus: true }, { reason: 'search-button' });
      else select();
    });
    document.addEventListener('pointerdown', (event) => {
      if (ui().isOpen('search') && !event.target.closest?.('#searchShell')) ui().close('search', { reason: 'outside-pointer' });
    }, true);
  }

  function install() {
    if (installed) return true;
    input = document.querySelector('#historySearch');
    shell = document.querySelector('#searchShell');
    submit = document.querySelector('#searchSubmit');
    if (!input || !shell || !submit || !ui() || !search() || !timeline()) return false;

    createSurface();
    ui().register('search', { open: show, close: hide, isOpen: () => suggestions?.dataset.open === 'true' });
    bind();
    installed = true;
    window.__WORLDLINE_SEARCH_BUILD__ = BUILD;
    globalThis.WorldlineSearchController = Object.freeze({ BUILD, refresh: update, select });
    ui().reconcile?.();
    return true;
  }

  const timer = setInterval(() => {
    if (install()) clearInterval(timer);
  }, 50);
  setTimeout(() => clearInterval(timer), 15000);
})();
