(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r30';
  let installed = false;

  function install() {
    if (installed) return true;
    const timeline = globalThis.WorldlineTimelineState;
    const legacy = globalThis.WorldlineEarthHistory;
    if (!timeline || !legacy || legacy.__canonicalDomainBridge) return false;

    let transitionToken = 0;
    let queuedValue = null;
    let valueFrame = 0;
    let domainEpoch = 0;

    function scheduleValue(domain, value, options = {}) {
      queuedValue = { domain, value, options };
      cancelAnimationFrame(valueFrame);
      valueFrame = requestAnimationFrame(() => {
        const next = queuedValue;
        queuedValue = null;
        valueFrame = 0;
        if (!next || legacy.getMode?.() !== next.domain) return;
        if (next.domain === 'earth') legacy.setEarthAge?.(next.value, next.options);
        else legacy.setHumanYear?.(next.value, next.options);
      });
    }

    const bridge = Object.freeze({
      ...legacy,
      __canonicalDomainBridge: true,
      setMode(domain, options = {}) {
        if (!['earth', 'human'].includes(domain)) return;
        if (legacy.getMode?.() === domain) return;
        transitionToken += 1;
        const token = transitionToken;
        legacy.setMode?.(domain, { ...options, source: options.source || BUILD });
        queueMicrotask(() => {
          if (token === transitionToken) transitionToken = 0;
        });
      },
      setEarthAge(value, options = {}) {
        if (legacy.getMode?.() !== 'earth') {
          bridge.setMode('earth', options);
          scheduleValue('earth', Number(value), options);
          return;
        }
        if (transitionToken) {
          scheduleValue('earth', Number(value), options);
          return;
        }
        legacy.setEarthAge?.(value, options);
      },
      setHumanYear(value, options = {}) {
        if (legacy.getMode?.() !== 'human') {
          bridge.setMode('human', options);
          scheduleValue('human', Number(value), options);
          return;
        }
        if (transitionToken) {
          scheduleValue('human', Number(value), options);
          return;
        }
        legacy.setHumanYear?.(value, options);
      }
    });

    globalThis.WorldlineEarthHistory = bridge;

    const nativeFetch = window.fetch.bind(window);
    window.fetch = function domainSafeFetch(input, init = {}) {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (!url.includes('/api/paleocoastlines')) return nativeFetch(input, init);
      const requestEpoch = domainEpoch;
      return nativeFetch(input, init).then((response) => {
        if (requestEpoch !== domainEpoch) throw new DOMException('Stale timeline domain request', 'AbortError');
        return response;
      });
    };

    document.addEventListener('click', (event) => {
      const modeButton = event.target.closest?.('#timelineEarthMode, #timelineHumanMode');
      if (!modeButton) return;
      if (timeline.getState().interaction !== 'idle') timeline.cancelGesture('timeline-domain-switch');
      document.body.classList.remove('timeline-scrubbing');
    }, true);

    window.addEventListener('worldline:timeline-domain', () => {
      domainEpoch += 1;
      cancelAnimationFrame(valueFrame);
      valueFrame = 0;
      queuedValue = null;
      const status = document.querySelector('#timelineRenderStatus');
      status?.removeAttribute('data-busy');
      document.body.classList.remove('timeline-scrubbing');
    });

    installed = true;
    window.__WORLDLINE_DOMAIN_BRIDGE_BUILD__ = BUILD;
    return true;
  }

  const timer = setInterval(() => {
    if (install()) clearInterval(timer);
  }, 30);
  setTimeout(() => clearInterval(timer), 12000);
})();
