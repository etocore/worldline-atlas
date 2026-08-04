(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r21';
  const RESTORE_FOCUS_REASONS = new Set([
    'escape',
    'timeline-close-button',
    'settings-close-button',
    'place-close-button'
  ]);
  const PLACE_DETENT_NAMES = Object.freeze({
    closed: 'closed',
    peek: 'peek',
    medium: 'medium',
    full: 'large'
  });
  const launchers = new Map();
  let initialized = false;
  let syncQueued = false;

  const launcherMappings = [
    ['timeline', '#yearButton, [data-worldline-surface="timeline"]'],
    ['search', '#historySearch, #searchSubmit, [data-worldline-surface="search"]'],
    ['settings', '#advancedControlsButton, #brandButton, [data-worldline-surface="settings"]'],
    ['place', '[data-worldline-surface="place"]']
  ];

  const targetGroups = Object.freeze({
    square: [
      '.map-tool',
      '.brand-orb',
      '.timeline-hud-close',
      '.timeline-play',
      '.round-button',
      '.place-close',
      '.search-submit',
      '.play-button',
      '.search-context',
      '.search-cancel',
      '.maplibregl-ctrl button'
    ].join(','),
    height: [
      '.year-chip',
      '.timeline-more-button',
      '.place-action',
      '.quick-years button',
      '.surface-segment button',
      '.search-suggestion',
      '.sheet-handle',
      '.place-sheet-handle',
      'input[type="search"]',
      'input[type="number"]'
    ].join(','),
    slider: 'input[type="range"]'
  });

  function isFocusable(element) {
    if (!(element instanceof HTMLElement) || !element.isConnected) return false;
    if (element.matches('[disabled], [aria-hidden="true"], [inert]')) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function setAttribute(element, name, value) {
    if (!element) return;
    const next = String(value);
    if (element.getAttribute(name) !== next) element.setAttribute(name, next);
  }

  function rememberLauncher(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    for (const [surface, selector] of launcherMappings) {
      const launcher = target.closest(selector);
      if (!launcher) continue;
      launchers.set(surface, launcher);
      return;
    }
  }

  function restoreFocus(surface, reason) {
    if (!RESTORE_FOCUS_REASONS.has(reason) || surface === 'search') return;
    const launcher = launchers.get(surface);
    if (!isFocusable(launcher)) return;
    requestAnimationFrame(() => {
      if (isFocusable(launcher)) launcher.focus({ preventScroll: true });
    });
  }

  function semanticPlaceDetent() {
    const value = document.querySelector('#placeSheet')?.dataset.detent || 'closed';
    return PLACE_DETENT_NAMES[value] || 'closed';
  }

  function semanticSettingsDetent() {
    return document.querySelector('#searchShell')?.classList.contains('is-open') ? 'large' : 'closed';
  }

  function syncHandleAccessibility() {
    const settingsHandle = document.querySelector('#sheetHandle');
    const settingsOpen = semanticSettingsDetent() !== 'closed';
    setAttribute(settingsHandle, 'aria-expanded', settingsOpen);
    setAttribute(settingsHandle, 'aria-label', settingsOpen ? 'Collapse map controls' : 'Expand map controls');

    const placeHandle = document.querySelector('#placeSheetHandle');
    const placeDetent = semanticPlaceDetent();
    setAttribute(placeHandle, 'aria-expanded', placeDetent === 'medium' || placeDetent === 'large');
    const placeLabels = {
      closed: 'Resize place details',
      peek: 'Expand place details',
      medium: 'Expand place details to full height',
      large: 'Collapse place details'
    };
    setAttribute(placeHandle, 'aria-label', placeLabels[placeDetent] || placeLabels.closed);
  }

  function syncInteractionHierarchy() {
    const settingsDetent = semanticSettingsDetent();
    const placeDetent = semanticPlaceDetent();
    document.body.dataset.worldlineSettingsDetent = settingsDetent;
    document.body.dataset.worldlinePlaceDetent = placeDetent;

    // Preserve map interaction for the nonmodal place-card detents. Only the
    // full settings surface and large place sheet suppress background controls.
    const blocking = settingsDetent === 'large' || placeDetent === 'large';
    document.body.dataset.uiBlocking = String(blocking);
    syncHandleAccessibility();
  }

  function elementsWithin(root, selector) {
    const matches = [];
    if (root instanceof Element && root.matches(selector)) matches.push(root);
    if (root?.querySelectorAll) matches.push(...root.querySelectorAll(selector));
    return matches;
  }

  function normalizeTouchTargets(root = document) {
    elementsWithin(root, targetGroups.square).forEach((element) => element.classList.add('worldline-hit-square'));
    elementsWithin(root, targetGroups.height).forEach((element) => element.classList.add('worldline-hit-height'));
    elementsWithin(root, targetGroups.slider).forEach((element) => element.classList.add('worldline-slider-hit'));
  }

  function installKeyboardAlternatives() {
    const placeHandle = document.querySelector('#placeSheetHandle');
    if (!placeHandle || placeHandle.dataset.worldlineKeyboard === 'true') return;
    placeHandle.dataset.worldlineKeyboard = 'true';

    // The existing interaction system remains the sole drag owner. A
    // keyboard-generated click delegates to its visible More details action.
    placeHandle.addEventListener('click', (event) => {
      if (event.detail !== 0) return;
      document.querySelector('#placeExpand')?.click();
    });
  }

  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      syncInteractionHierarchy();
      installKeyboardAlternatives();
    });
  }

  function syncSurfaceState(current, previous) {
    if (previous.active !== 'none' && current.active === 'none') {
      restoreFocus(previous.active, current.reason);
    }
    scheduleSync();
  }

  function initialize() {
    if (initialized || !globalThis.WorldlineUI || !window.__WORLDLINE_INTERACTION_BUILD__ || !document.body) return false;
    initialized = true;

    document.addEventListener('pointerdown', rememberLauncher, true);
    document.addEventListener('focusin', rememberLauncher, true);
    globalThis.WorldlineUI.subscribe(syncSurfaceState);

    normalizeTouchTargets();
    installKeyboardAlternatives();
    syncInteractionHierarchy();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) normalizeTouchTargets(node);
        });
      }
      scheduleSync();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'data-detent', 'aria-hidden']
    });

    globalThis.WorldlineIOSInterface = Object.freeze({
      BUILD,
      semanticDetent(surface) {
        if (surface === 'settings') return semanticSettingsDetent();
        if (surface === 'place') return semanticPlaceDetent();
        return 'closed';
      },
      normalizeTouchTargets,
      refresh: scheduleSync
    });
    window.__WORLDLINE_IOS_INTERFACE_BUILD__ = BUILD;
    return true;
  }

  if (!initialize()) {
    const timer = setInterval(() => initialize() && clearInterval(timer), 40);
    setTimeout(() => clearInterval(timer), 12000);
  }
})();
