(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r27';
  const CLOCK_ICON = '<span class="time-chip-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.2v5.1l3.5 2.1"></path></svg></span>';
  let yearButton;
  let eraLabel;
  let yearLabel;
  let lastSignature = '';

  function trimDecimal(value, digits) {
    return Number(value.toFixed(digits)).toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function compactEarthLabel(ageMa) {
    const value = Number(ageMa);
    if (!Number.isFinite(value)) return 'Earth history';
    if (value <= 0.0005) return 'Present';
    if (value >= 1000) {
      const billions = value / 1000;
      return `${Number.isInteger(billions) ? billions.toLocaleString() : trimDecimal(billions, billions < 2 ? 2 : 1)} Ga`;
    }
    if (value >= 1) {
      const digits = value < 10 ? 2 : value < 100 ? 1 : 1;
      return `${Number.isInteger(value) ? value.toLocaleString() : trimDecimal(value, digits)} Ma`;
    }
    const thousands = value * 1000;
    if (thousands >= 1) return `${Number.isInteger(thousands) ? thousands.toLocaleString() : trimDecimal(thousands, 1)} ka`;
    return `${Math.max(1, Math.round(value * 1_000_000)).toLocaleString()} years ago`;
  }

  function humanEarthLabel(ageMa) {
    const timeline = globalThis.WorldlineTimelineState;
    if (timeline?.formatEarthAge) return timeline.formatEarthAge(ageMa);
    const value = Number(ageMa);
    if (!Number.isFinite(value)) return 'Earth history';
    if (value >= 1000) {
      const billions = value / 1000;
      return `${Number.isInteger(billions) ? billions : billions.toFixed(billions < 10 ? 2 : 1)} billion years ago`;
    }
    if (value >= 1) return `${Number.isInteger(value) ? value : value.toFixed(value < 10 ? 2 : 1)} million years ago`;
    const years = Math.round(value * 1_000_000);
    if (years >= 1000) return `${Math.round(years / 1000).toLocaleString()} thousand years ago`;
    return years > 0 ? `${years.toLocaleString()} years ago` : 'Present day';
  }

  function humanYearLabel(year) {
    const timeline = globalThis.WorldlineTimelineState;
    if (timeline?.formatHumanYear) return timeline.formatHumanYear(year);
    const value = Number(year);
    if (!Number.isFinite(value)) return 'Human history';
    if (value === 2026) return 'Present day';
    if (value < -10000) return `${Math.abs(value).toLocaleString()} years ago`;
    if (value < 0) return `${Math.abs(value).toLocaleString()} BCE`;
    return `${value.toLocaleString()} CE`;
  }

  function installControl() {
    yearButton = document.querySelector('#yearButton');
    eraLabel = document.querySelector('#eraLabel');
    yearLabel = document.querySelector('#yearLabel');
    if (!yearButton || !eraLabel || !yearLabel) return false;
    if (!yearButton.querySelector('.time-chip-icon')) yearButton.insertAdjacentHTML('afterbegin', CLOCK_ICON);
    yearButton.setAttribute('aria-haspopup', 'dialog');
    yearButton.setAttribute('aria-controls', 'timelineHud');
    document.body.classList.add('worldline-r27-interface');
    return true;
  }

  function currentTimelineState() {
    const timeline = globalThis.WorldlineTimelineState;
    if (timeline?.getState) {
      const snapshot = timeline.getState();
      return {
        mode: snapshot.domain,
        selected: snapshot.domain === 'earth' ? snapshot.earthAgeMa : snapshot.humanYear
      };
    }
    const earth = globalThis.WorldlineEarthHistory;
    if (!earth) return null;
    const mode = earth.getMode();
    return {
      mode,
      selected: mode === 'earth' ? earth.getEarthAgeMa() : earth.getHumanYear()
    };
  }

  function syncControl() {
    if (!yearButton && !installControl()) return false;
    const current = currentTimelineState();
    if (!current) return false;
    const expanded = document.body.classList.contains('timeline-active');
    const signature = `${current.mode}|${current.selected}|${expanded}`;
    if (signature === lastSignature) return true;
    lastSignature = signature;

    const domainLabel = current.mode === 'earth' ? 'Earth history' : 'Human history';
    const visibleDate = current.mode === 'earth' ? compactEarthLabel(current.selected) : humanYearLabel(current.selected);
    const accessibleDate = current.mode === 'earth' ? humanEarthLabel(current.selected) : humanYearLabel(current.selected);

    eraLabel.textContent = domainLabel;
    yearLabel.textContent = visibleDate;
    yearButton.dataset.timelineDomain = current.mode;
    yearButton.setAttribute('aria-expanded', String(expanded));
    yearButton.setAttribute('aria-label', `Open ${domainLabel} timeline at ${accessibleDate}`);
    yearButton.title = yearButton.getAttribute('aria-label');
    return true;
  }

  function classifySearch(text) {
    const value = String(text || '').toLowerCase();
    if (!value.trim()) return null;
    if (/\b(ma|ga|million years|billion years|geologic|geological|pangea|pangaea|permian|triassic|jurassic|cretaceous|cambrian|devonian|carboniferous|ordovician|silurian|paleogene|neogene|hadean|archean|proterozoic|dinosaur|fossil|ammonite|trilobite|mass extinction|snowball earth)\b/.test(value)) return 'earth';
    if (/\b(bce|bc|ce|ad|century|empire|kingdom|dynasty|civilization|city|settlement|war|revolution|rome|egypt|mesopotamia|medieval|renaissance|industrial|human|homo sapiens|agriculture|writing|plague)\b/.test(value)) return 'human';
    return null;
  }

  function applySearchMode(target) {
    if (!target) return;
    const timeline = globalThis.WorldlineTimelineState;
    if (timeline?.setDomain) {
      timeline.setDomain(target, { source: 'search-result' });
      return;
    }
    const earth = globalThis.WorldlineEarthHistory;
    if (!earth || earth.getMode() === target) return;
    earth.setMode(target, { source: 'search-result' });
  }

  function installSearchBridge() {
    document.addEventListener('pointerdown', (event) => {
      const suggestion = event.target.closest?.('.search-suggestion');
      if (!suggestion) return;
      const text = [
        suggestion.querySelector('.search-suggestion-title')?.textContent,
        suggestion.querySelector('.search-suggestion-subtitle')?.textContent,
        suggestion.querySelector('.search-suggestion-status')?.textContent,
        document.querySelector('#historySearch')?.value
      ].filter(Boolean).join(' ');
      applySearchMode(classifySearch(text));
    }, true);

    document.querySelector('#historySearch')?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      applySearchMode(classifySearch(event.currentTarget.value));
    }, true);

    document.querySelector('#searchSubmit')?.addEventListener('pointerdown', () => {
      applySearchMode(classifySearch(document.querySelector('#historySearch')?.value));
    }, true);
  }

  const installer = setInterval(() => {
    if (!installControl() || (!globalThis.WorldlineEarthHistory && !globalThis.WorldlineTimelineState)) return;
    clearInterval(installer);
    installSearchBridge();
    syncControl();
    setInterval(syncControl, 180);
    window.addEventListener('worldline:timeline-mode', () => setTimeout(syncControl, 0));
    window.addEventListener('worldline:timeline-state', () => setTimeout(syncControl, 0));
    window.__WORLDLINE_TIME_CONTROL_BUILD__ = BUILD;
  }, 80);
})();
