(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r21';
  const DETENTS = ['peek', 'medium', 'large'];
  const launchers = new Map();
  let initialized = false;

  const sheets = [
    { surface: 'settings', selector: '#searchShell', scrollSelector: '.control-panel' },
    { surface: 'place', selector: '#placeSheet', scrollSelector: '.place-sheet-content, .place-content, [data-sheet-scroll]' }
  ];

  function focusable(element) {
    if (!(element instanceof HTMLElement) || !element.isConnected) return false;
    if (element.matches('[disabled], [aria-hidden="true"], [inert]')) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  function rememberLauncher(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const mappings = [
      ['timeline', '#yearButton, [data-worldline-surface="timeline"]'],
      ['search', '#historySearch, #searchSubmit, [data-worldline-surface="search"]'],
      ['settings', '#advancedControlsButton, #worldlineBrand, [data-worldline-surface="settings"]'],
      ['place', '[data-worldline-surface="place"]']
    ];
    for (const [surface, selector] of mappings) {
      const launcher = target.closest(selector);
      if (launcher) {
        launchers.set(surface, launcher);
        return;
      }
    }
  }

  function restoreFocus(surface) {
    const launcher = launchers.get(surface);
    if (!focusable(launcher)) return;
    requestAnimationFrame(() => launcher.focus({ preventScroll: true }));
  }

  function setDetent(sheet, detent, animate = true) {
    if (!sheet || !DETENTS.includes(detent)) return;
    sheet.dataset.detent = detent;
    sheet.classList.toggle('worldline-sheet-dragging', !animate);
    sheet.style.removeProperty('--worldline-sheet-drag-y');
    requestAnimationFrame(() => sheet.classList.remove('worldline-sheet-dragging'));
  }

  function detentIndex(sheet) {
    const current = sheet.dataset.detent;
    return Math.max(0, DETENTS.indexOf(current));
  }

  function installDragController(config) {
    const sheet = document.querySelector(config.selector);
    if (!sheet || sheet.dataset.worldlineDetents === 'true') return;
    sheet.dataset.worldlineDetents = 'true';
    if (!DETENTS.includes(sheet.dataset.detent)) sheet.dataset.detent = 'medium';

    const handle = sheet.querySelector('.sheet-handle, [data-sheet-handle]') || sheet;
    let drag = null;

    handle.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const scroll = sheet.querySelector(config.scrollSelector);
      if (scroll && scroll.scrollTop > 0 && event.target !== handle) return;
      drag = {
        pointerId: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
        lastTime: performance.now(),
        velocity: 0,
        startIndex: detentIndex(sheet)
      };
      handle.setPointerCapture?.(event.pointerId);
      sheet.classList.add('worldline-sheet-dragging');
      document.body.classList.add('worldline-sheet-gesture');
    });

    handle.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const now = performance.now();
      const dy = event.clientY - drag.startY;
      const dt = Math.max(1, now - drag.lastTime);
      drag.velocity = (event.clientY - drag.lastY) / dt;
      drag.lastY = event.clientY;
      drag.lastTime = now;
      sheet.style.setProperty('--worldline-sheet-drag-y', `${Math.max(-90, dy)}px`);
      event.preventDefault();
    });

    function finish(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dy = event.clientY - drag.startY;
      const projected = dy + (drag.velocity * 170);
      let next = drag.startIndex;
      if (projected < -56) next += 1;
      if (projected > 56) next -= 1;
      next = Math.max(0, Math.min(DETENTS.length - 1, next));
      setDetent(sheet, DETENTS[next]);
      drag = null;
      document.body.classList.remove('worldline-sheet-gesture');
    }

    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);

    handle.addEventListener('dblclick', () => {
      const next = (detentIndex(sheet) + 1) % DETENTS.length;
      setDetent(sheet, DETENTS[next]);
    });
  }

  function normalizeTouchTargets(root = document) {
    root.querySelectorAll('button, [role="button"], input[type="range"], input[type="search"]').forEach((control) => {
      if (control.closest('.map-stage')) control.classList.add('worldline-touch-target');
    });
  }

  function syncSurfaceState(current, previous) {
    document.body.dataset.uiBlocking = ['settings', 'place'].includes(current.active) ? 'true' : 'false';
    if (previous.active !== 'none' && current.active === 'none') restoreFocus(previous.active);
    if (current.active === 'settings') setDetent(document.querySelector('#searchShell'), current.payload?.detent || 'medium');
    if (current.active === 'place') setDetent(document.querySelector('#placeSheet'), current.payload?.detent || 'peek');
  }

  function initialize() {
    if (initialized || !globalThis.WorldlineUI || !document.body) return false;
    initialized = true;
    document.addEventListener('pointerdown', rememberLauncher, true);
    document.addEventListener('focusin', rememberLauncher, true);
    globalThis.WorldlineUI.subscribe(syncSurfaceState);
    normalizeTouchTargets();
    sheets.forEach(installDragController);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        normalizeTouchTargets(node);
        sheets.forEach(installDragController);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });

    globalThis.WorldlineIOSInterface = Object.freeze({
      BUILD,
      detents: Object.freeze([...DETENTS]),
      setDetent: (surface, detent) => {
        const config = sheets.find((entry) => entry.surface === surface);
        setDetent(config ? document.querySelector(config.selector) : null, detent);
      }
    });
    window.__WORLDLINE_IOS_INTERFACE_BUILD__ = BUILD;
    return true;
  }

  if (!initialize()) {
    const timer = setInterval(() => initialize() && clearInterval(timer), 40);
    setTimeout(() => clearInterval(timer), 12000);
  }
})();