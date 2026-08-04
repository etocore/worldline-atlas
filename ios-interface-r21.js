(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r21';
  const VALID_DETENTS = new Set(['peek', 'medium', 'large']);
  const launchers = new Map();
  let pendingLauncher = null;
  let initialized = false;

  const surfaceSelectors = [
    ['timeline', '#yearButton, [data-worldline-surface="timeline"]'],
    ['search', '#historySearch, #searchSubmit, [data-worldline-surface="search"]'],
    ['settings', '#advancedControlsButton, #worldlineBrand, [data-worldline-surface="settings"]'],
    ['place', '[data-worldline-surface="place"]']
  ];

  function isFocusable(element) {
    if (!(element instanceof HTMLElement) || !element.isConnected) return false;
    if (element.matches('[disabled], [aria-hidden="true"], [inert]')) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function surfaceForTarget(target) {
    if (!(target instanceof Element)) return null;
    for (const [surface, selector] of surfaceSelectors) {
      const launcher = target.closest(selector);
      if (launcher) return { surface, launcher };
    }
    return null;
  }

  function rememberLauncher(event) {
    const match = surfaceForTarget(event.target);
    if (!match) return;
    pendingLauncher = match;
    launchers.set(match.surface, match.launcher);
  }

  function restoreFocus(surface) {
    const launcher = launchers.get(surface);
    if (!isFocusable(launcher)) return;
    requestAnimationFrame(() => {
      if (document.activeElement === document.body || !document.activeElement || document.activeElement.closest?.('[aria-hidden="true"]')) {
        launcher.focus({ preventScroll: true });
      }
    });
  }

  function settingsSheet() {
    return document.querySelector('#searchShell');
  }

  function setSettingsDetent(detent = 'medium') {
    const sheet = settingsSheet();
    if (!sheet || !VALID_DETENTS.has(detent)) return false;
    sheet.dataset.detent = detent;
    return true;
  }

  function syncSurfaceState(current, previous) {
    document.body.dataset.uiBlocking = ['settings', 'place'].includes(current.active) ? 'true' : 'false';

    const sheet = settingsSheet();
    if (sheet) {
      if (current.active === 'settings') {
        const requested = current.payload?.detent;
        setSettingsDetent(VALID_DETENTS.has(requested) ? requested : (sheet.dataset.detent || 'medium'));
      } else if (!sheet.classList.contains('is-open')) {
        sheet.dataset.detent = 'closed';
      }
    }

    if (current.active !== 'none') {
      const active = document.activeElement;
      if (pendingLauncher?.surface === current.active && isFocusable(pendingLauncher.launcher)) {
        launchers.set(current.active, pendingLauncher.launcher);
      } else if (isFocusable(active) && !active.closest?.(`#${current.active}`)) {
        launchers.set(current.active, active);
      }
    }

    if (previous.active !== 'none' && current.active === 'none') restoreFocus(previous.active);
    pendingLauncher = null;
  }

  function normalizeTouchTargets(root = document) {
    root.querySelectorAll('button, [role="button"], input[type="range"], input[type="search"]').forEach((control) => {
      if (!control.closest('.map-stage')) return;
      control.classList.add('worldline-touch-target');
    });
  }

  function initialize() {
    if (initialized || !globalThis.WorldlineUI || !document.body) return false;
    initialized = true;

    document.addEventListener('pointerdown', rememberLauncher, true);
    document.addEventListener('focusin', rememberLauncher, true);
    globalThis.WorldlineUI.subscribe(syncSurfaceState);

    normalizeTouchTargets();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) normalizeTouchTargets(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const initial = globalThis.WorldlineUI.snapshot();
    syncSurfaceState(initial, { active: 'none' });

    globalThis.WorldlineIOSInterface = Object.freeze({
      BUILD,
      detents: Object.freeze([...VALID_DETENTS]),
      setSettingsDetent,
      restoreFocus,
      normalizeTouchTargets
    });
    window.__WORLDLINE_IOS_INTERFACE_BUILD__ = BUILD;
    return true;
  }

  if (!initialize()) {
    const timer = setInterval(() => {
      if (initialize()) clearInterval(timer);
    }, 40);
    setTimeout(() => clearInterval(timer), 12000);
  }
})();