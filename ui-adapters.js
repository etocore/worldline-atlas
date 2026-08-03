(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r9';
  let attempts = 0;

  const timer = setInterval(() => {
    attempts += 1;
    const ui = globalThis.WorldlineUI;
    const rawOpenPlace = globalThis.openPlaceCard;
    const rawClosePlace = globalThis.closePlaceCard;
    const rawSetSheet = typeof setSheetOpen === 'function' ? setSheetOpen : null;

    if (!ui || !rawOpenPlace || !rawClosePlace || !rawSetSheet || !window.__WORLDLINE_INTERACTION_BUILD__) {
      if (attempts >= 240) {
        clearInterval(timer);
        console.warn('Worldline UI adapters did not initialize.');
      }
      return;
    }

    clearInterval(timer);

    ui.register('settings', {
      open(payload = {}) {
        rawSetSheet(true, payload.options || payload);
      },
      close() {
        rawSetSheet(false);
      },
      isOpen() {
        return document.querySelector('#searchShell')?.classList.contains('is-open') === true;
      }
    });

    ui.register('place', {
      open(payload = {}) {
        const model = payload.model || payload;
        if (model?.name) rawOpenPlace(model);
      },
      close(meta = {}) {
        rawClosePlace({ clearSelection: meta.clearSelection !== false });
      },
      isOpen() {
        const detent = document.querySelector('#placeSheet')?.dataset.detent;
        return Boolean(detent && detent !== 'closed');
      }
    });

    const statefulSetSheetOpen = function statefulSetSheetOpen(open, options = {}) {
      const activeElementId = document.activeElement?.id;
      const searchTriggered = Boolean(open) && (activeElementId === 'historySearch' || activeElementId === 'searchSubmit');
      if (searchTriggered) {
        rawSetSheet(false);
        if (ui.isOpen('search') || globalThis.__WORLDLINE_APPLE_CONTROLS_BUILD__) {
          return ui.activate('search', { focus: false }, { reason: 'legacy-search-guard' });
        }
        return false;
      }
      if (open) return ui.activate('settings', { options }, { reason: 'settings-request' });
      return ui.close('settings', { reason: 'settings-close' });
    };

    const statefulOpenPlaceCard = function statefulOpenPlaceCard(model) {
      return ui.activate('place', { model }, { reason: 'place-selection' });
    };

    const statefulClosePlaceCard = function statefulClosePlaceCard(options = {}) {
      return ui.close('place', { ...options, reason: 'place-close' });
    };

    try { setSheetOpen = statefulSetSheetOpen; } catch (_) {}
    globalThis.setSheetOpen = statefulSetSheetOpen;
    globalThis.openPlaceCard = statefulOpenPlaceCard;
    globalThis.closePlaceCard = statefulClosePlaceCard;

    document.addEventListener('click', (event) => {
      if (event.target.closest?.('#sheetClose')) ui.close('settings', { reason: 'settings-close-button' });
      if (event.target.closest?.('#placeClose')) ui.close('place', { reason: 'place-close-button' });
      if (event.target.closest?.('#sheetScrim')) ui.dismiss({ reason: 'scrim' });
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && ui.snapshot().active !== 'none') ui.dismiss({ reason: 'escape' });
    }, true);

    window.__WORLDLINE_UI_ADAPTERS_BUILD__ = BUILD;
    ui.reconcile();
  }, 50);
})();