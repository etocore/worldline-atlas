(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r11';
  let installed = false;

  function initialize() {
    if (installed) return true;
    const hud = document.querySelector('#timelineHud');
    const slider = document.querySelector('#timelinePrimarySlider');
    const wrap = hud?.querySelector('.timeline-slider-wrap');
    const value = document.querySelector('#timelineHudValue');
    const card = document.querySelector('#timelineEraCard');
    const explore = document.querySelector('#timelineEraExplore');
    const more = document.querySelector('#advancedControlsButton');
    if (!hud || !slider || !wrap || !value || !card || !explore || !more || !globalThis.WorldlineEarthHistory) return false;

    const bubble = document.createElement('span');
    bubble.id = 'timelineThumbBubble';
    bubble.className = 'timeline-thumb-bubble';
    bubble.setAttribute('aria-hidden', 'true');
    wrap.appendChild(bubble);

    more.textContent = 'Controls';
    more.setAttribute('aria-label', 'Open advanced timeline controls');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'Open information about the selected era or milestone');
    explore.setAttribute('aria-label', 'Explore selected era');

    function sync() {
      const min = Number(slider.min || 0);
      const max = Number(slider.max || 1000);
      const numeric = Number(slider.value);
      const percent = ((numeric - min) / Math.max(1, max - min)) * 100;
      slider.style.setProperty('--timeline-progress', `${percent}%`);
      wrap.style.setProperty('--timeline-progress', `${Math.max(3, Math.min(97, percent))}%`);
      bubble.textContent = value.textContent.trim();
      card.dataset.mode = globalThis.WorldlineEarthHistory.getMode();
    }

    function beginDrag() {
      wrap.dataset.dragging = 'true';
      sync();
    }

    function endDrag() {
      wrap.dataset.dragging = 'false';
      sync();
    }

    slider.addEventListener('pointerdown', beginDrag, { passive: true });
    slider.addEventListener('touchstart', beginDrag, { passive: true });
    slider.addEventListener('input', sync, { passive: true });
    slider.addEventListener('change', endDrag, { passive: true });
    window.addEventListener('pointerup', endDrag, { passive: true });
    window.addEventListener('touchend', endDrag, { passive: true });

    card.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      explore.click();
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        explore.click();
      }
    });

    const observer = new MutationObserver(sync);
    observer.observe(value, { childList: true, characterData: true, subtree: true });
    window.addEventListener('worldline:timeline-mode', sync);
    requestAnimationFrame(sync);

    installed = true;
    window.__WORLDLINE_TIMELINE_R11_BUILD__ = BUILD;
    return true;
  }

  const timer = setInterval(() => {
    if (initialize()) clearInterval(timer);
  }, 60);
})();
