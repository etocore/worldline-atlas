(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r30-history-sheet';
  const sheet = document.querySelector('#placeSheet');
  const header = sheet?.querySelector('.place-header');
  const headerCopy = header?.querySelector(':scope > div:first-child');
  const title = sheet?.querySelector('#placeTitle');
  const expandButton = sheet?.querySelector('#placeExpand');
  const scrim = document.querySelector('#sheetScrim');
  if (!sheet || !header || !headerCopy || !title) return;

  let installed = false;
  let syncing = false;
  let lastHistoryTitle = '';

  function isHistory() {
    return sheet.dataset.contentType === 'history';
  }

  function isOpen() {
    return sheet.dataset.detent && sheet.dataset.detent !== 'closed';
  }

  function setBodyDetent(detent) {
    document.body.classList.toggle('place-card-open', detent !== 'closed');
    document.body.classList.toggle('place-detent-peek', detent === 'peek');
    document.body.classList.toggle('place-detent-medium', detent === 'medium');
    document.body.classList.toggle('place-detent-full', detent === 'full');
    const controlsOpen = document.querySelector('#searchShell')?.classList.contains('is-open');
    const scrimActive = Boolean(controlsOpen || detent === 'medium' || detent === 'full');
    document.body.classList.toggle('sheet-scrim-active', scrimActive);
    if (scrim) scrim.tabIndex = scrimActive ? 0 : -1;
  }

  function setDetent(detent) {
    syncing = true;
    sheet.dataset.detent = detent;
    sheet.setAttribute('aria-hidden', String(detent === 'closed'));
    setBodyDetent(detent);
    if (expandButton) {
      expandButton.textContent = detent === 'peek' ? 'More details' : detent === 'medium' ? 'Expand' : 'Minimize';
    }
    requestAnimationFrame(() => { syncing = false; });
  }

  function setExpanded(expanded, { focus = false, announce = true } = {}) {
    if (!isHistory() || !isOpen()) return;
    const next = Boolean(expanded);
    sheet.dataset.historyExpanded = String(next);
    headerCopy.setAttribute('aria-expanded', String(next));
    setDetent(next ? 'medium' : 'peek');
    if (focus) headerCopy.focus({ preventScroll: true });
    if (announce) {
      window.dispatchEvent(new CustomEvent('worldline:history-sheet-disclosure', {
        detail: { expanded: next, build: BUILD }
      }));
    }
  }

  function configureHistorySheet({ reset = false } = {}) {
    if (!isHistory()) return false;
    headerCopy.classList.add('history-sheet-toggle');
    headerCopy.setAttribute('role', 'button');
    headerCopy.tabIndex = 0;
    headerCopy.setAttribute('aria-controls', 'historyBriefing');

    const currentTitle = title.textContent.trim();
    const newChapter = currentTitle && currentTitle !== lastHistoryTitle;
    if (currentTitle) lastHistoryTitle = currentTitle;

    if (reset || newChapter || !('historyExpanded' in sheet.dataset)) {
      sheet.dataset.historyExpanded = 'false';
      headerCopy.setAttribute('aria-expanded', 'false');
      if (isOpen()) setDetent('peek');
    } else {
      const expanded = sheet.dataset.detent === 'medium' || sheet.dataset.detent === 'full';
      sheet.dataset.historyExpanded = String(expanded);
      headerCopy.setAttribute('aria-expanded', String(expanded));
    }
    return true;
  }

  function clearHistoryConfiguration() {
    headerCopy.classList.remove('history-sheet-toggle');
    headerCopy.removeAttribute('role');
    headerCopy.removeAttribute('tabindex');
    headerCopy.removeAttribute('aria-controls');
    headerCopy.removeAttribute('aria-expanded');
    delete sheet.dataset.historyExpanded;
    lastHistoryTitle = '';
  }

  function toggleHistorySheet() {
    if (!isHistory() || !isOpen()) return;
    setExpanded(sheet.dataset.historyExpanded !== 'true', { focus: true });
  }

  headerCopy.addEventListener('click', (event) => {
    if (!isHistory()) return;
    event.preventDefault();
    toggleHistorySheet();
  });

  headerCopy.addEventListener('keydown', (event) => {
    if (!isHistory() || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    toggleHistorySheet();
  });

  document.addEventListener('click', (event) => {
    if (!isHistory() || event.target !== expandButton) return;
    if (!event.isTrusted) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    setExpanded(sheet.dataset.historyExpanded !== 'true', { focus: false });
  }, true);

  const observer = new MutationObserver((records) => {
    if (syncing) return;
    const contentChanged = records.some((record) => record.type === 'attributes' && record.attributeName === 'data-content-type');
    const detentChanged = records.some((record) => record.type === 'attributes' && record.attributeName === 'data-detent');
    const titleChanged = records.some((record) => record.type === 'childList' || record.type === 'characterData');

    if (!isHistory()) {
      if (contentChanged) clearHistoryConfiguration();
      return;
    }

    if (contentChanged || titleChanged) {
      configureHistorySheet({ reset: contentChanged });
      return;
    }

    if (detentChanged && isOpen()) {
      const expanded = sheet.dataset.detent === 'medium' || sheet.dataset.detent === 'full';
      sheet.dataset.historyExpanded = String(expanded);
      headerCopy.setAttribute('aria-expanded', String(expanded));
    }
  });

  observer.observe(sheet, {
    attributes: true,
    attributeFilter: ['data-content-type', 'data-detent'],
    subtree: true,
    childList: true,
    characterData: true
  });

  configureHistorySheet();
  installed = true;
  window.__WORLDLINE_HISTORY_SHEET_BUILD__ = BUILD;
  globalThis.WorldlineHistorySheet = Object.freeze({
    BUILD,
    expand: () => setExpanded(true),
    collapse: () => setExpanded(false),
    toggle: toggleHistorySheet,
    isExpanded: () => isHistory() && sheet.dataset.historyExpanded === 'true'
  });
  window.dispatchEvent(new CustomEvent('worldline:history-sheet-ready', { detail: { build: BUILD, installed } }));
})();
