(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r30';
  const BUDGETS = Object.freeze({
    release: Object.freeze({
      inputToRenderP95Ms: 50,
      maxPreviewRequestsPerGesture: 4,
      maxPostReleaseRequests: 1,
      maxSourceRemovalsDuringGesture: 0,
      maxCommitsPerGesture: 1
    }),
    experience: Object.freeze({
      inputToPaintP95Ms: 100,
      maxFrameGapMs: 100
    })
  });
  const HISTORY_LIMIT = 24;
  const SAMPLE_LIMIT = 120;
  const PALEOCOASTLINE_PATH = '/api/paleocoastlines';

  let sequence = 0;
  let activeGesture = null;
  let finalizeTimer = 0;
  let frameHandle = 0;
  let lastFrameAt = 0;
  const history = [];
  const patchedMaps = new WeakSet();

  function now() {
    return performance.now();
  }

  function boundedPush(list, value) {
    if (!Number.isFinite(value)) return;
    list.push(Math.max(0, value));
    if (list.length > SAMPLE_LIMIT) list.shift();
  }

  function percentile(values, fraction) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
    return sorted[index];
  }

  function createGesture(source = 'pointer') {
    return {
      id: ++sequence,
      source,
      startedAt: now(),
      releasedAt: null,
      finalizedAt: null,
      cancelled: false,
      inputCount: 0,
      inputToRenderMs: [],
      inputToPaintMs: [],
      frameGapsMs: [],
      previewRequests: 0,
      postReleaseRequests: 0,
      abortedRequests: 0,
      completedRequests: 0,
      sourceRemovals: 0,
      commits: 0
    };
  }

  function beginGesture(source = 'pointer') {
    clearTimeout(finalizeTimer);
    if (activeGesture && !activeGesture.finalizedAt) finalizeGesture('replaced');
    activeGesture = createGesture(source);
    lastFrameAt = 0;
    cancelAnimationFrame(frameHandle);
    frameHandle = requestAnimationFrame(trackFrame);
    return activeGesture;
  }

  function trackFrame(timestamp) {
    if (!activeGesture || activeGesture.finalizedAt || activeGesture.releasedAt !== null) return;
    if (lastFrameAt) boundedPush(activeGesture.frameGapsMs, timestamp - lastFrameAt);
    lastFrameAt = timestamp;
    frameHandle = requestAnimationFrame(trackFrame);
  }

  function finalizeGesture(reason = 'settled') {
    if (!activeGesture || activeGesture.finalizedAt) return activeGesture;
    clearTimeout(finalizeTimer);
    cancelAnimationFrame(frameHandle);
    activeGesture.finalizedAt = now();
    activeGesture.finalizeReason = reason;
    const completed = activeGesture;
    history.push(completed);
    if (history.length > HISTORY_LIMIT) history.shift();
    activeGesture = null;
    lastFrameAt = 0;
    window.dispatchEvent(new CustomEvent('worldline:timeline-performance-sample', { detail: summarize(completed) }));
    return completed;
  }

  function releaseGesture(cancelled = false) {
    if (!activeGesture) return;
    activeGesture.releasedAt = now();
    activeGesture.cancelled = cancelled;
    cancelAnimationFrame(frameHandle);
    lastFrameAt = 0;
    clearTimeout(finalizeTimer);
    finalizeTimer = setTimeout(() => finalizeGesture(cancelled ? 'cancelled' : 'settled'), 360);
  }

  function summarize(gesture) {
    if (!gesture) return null;
    return Object.freeze({
      id: gesture.id,
      source: gesture.source,
      cancelled: gesture.cancelled,
      durationMs: Math.max(0, (gesture.finalizedAt || now()) - gesture.startedAt),
      inputCount: gesture.inputCount,
      inputToRenderP95Ms: percentile(gesture.inputToRenderMs, 0.95),
      inputToPaintP95Ms: percentile(gesture.inputToPaintMs, 0.95),
      maxFrameGapMs: gesture.frameGapsMs.length ? Math.max(...gesture.frameGapsMs) : 0,
      previewRequests: gesture.previewRequests,
      postReleaseRequests: gesture.postReleaseRequests,
      abortedRequests: gesture.abortedRequests,
      completedRequests: gesture.completedRequests,
      sourceRemovals: gesture.sourceRemovals,
      commits: gesture.commits
    });
  }

  function latestGesture() {
    return activeGesture || history.at(-1) || null;
  }

  function evaluate(gesture = latestGesture()) {
    const metrics = summarize(gesture);
    const violations = [];
    const advisories = [];
    if (!metrics) violations.push('No timeline gesture has been measured.');
    if (metrics) {
      const release = BUDGETS.release;
      const experience = BUDGETS.experience;
      if (metrics.inputToRenderP95Ms > release.inputToRenderP95Ms) violations.push(`Input-to-render p95 ${metrics.inputToRenderP95Ms.toFixed(1)}ms exceeds ${release.inputToRenderP95Ms}ms.`);
      if (metrics.previewRequests > release.maxPreviewRequestsPerGesture) violations.push(`${metrics.previewRequests} preview requests exceed the per-gesture budget of ${release.maxPreviewRequestsPerGesture}.`);
      if (metrics.postReleaseRequests > release.maxPostReleaseRequests) violations.push(`${metrics.postReleaseRequests} post-release requests exceed the settle budget of ${release.maxPostReleaseRequests}.`);
      if (metrics.sourceRemovals > release.maxSourceRemovalsDuringGesture) violations.push(`${metrics.sourceRemovals} map sources or layers were removed during the gesture.`);
      if (metrics.commits > release.maxCommitsPerGesture) violations.push(`${metrics.commits} commits occurred during one gesture.`);
      if (metrics.inputToPaintP95Ms > experience.inputToPaintP95Ms) advisories.push(`Input-to-paint p95 ${metrics.inputToPaintP95Ms.toFixed(1)}ms exceeds the foreground Safari target of ${experience.inputToPaintP95Ms}ms.`);
      if (metrics.maxFrameGapMs > experience.maxFrameGapMs) advisories.push(`Maximum frame gap ${metrics.maxFrameGapMs.toFixed(1)}ms exceeds the foreground Safari target of ${experience.maxFrameGapMs}ms.`);
    }
    return Object.freeze({
      pass: violations.length === 0,
      experiencePass: advisories.length === 0,
      budgets: BUDGETS,
      metrics,
      violations,
      advisories
    });
  }

  function reset() {
    clearTimeout(finalizeTimer);
    cancelAnimationFrame(frameHandle);
    activeGesture = null;
    history.length = 0;
    lastFrameAt = 0;
  }

  function isTimelineSlider(element) {
    return element instanceof HTMLInputElement && element.id === 'timelinePrimarySlider';
  }

  document.addEventListener('pointerdown', (event) => {
    if (!isTimelineSlider(event.target)) return;
    beginGesture('timeline-slider');
  }, true);

  document.addEventListener('input', (event) => {
    if (!isTimelineSlider(event.target)) return;
    const gesture = activeGesture || beginGesture('implicit-input');
    const startedAt = now();
    gesture.inputCount += 1;
    queueMicrotask(() => boundedPush(gesture.inputToRenderMs, now() - startedAt));
    requestAnimationFrame(() => boundedPush(gesture.inputToPaintMs, now() - startedAt));
  }, true);

  document.addEventListener('pointerup', (event) => {
    if (isTimelineSlider(event.target)) releaseGesture(false);
  }, true);

  document.addEventListener('pointercancel', (event) => {
    if (isTimelineSlider(event.target)) releaseGesture(true);
  }, true);

  window.addEventListener('worldline:timeline-commit', () => {
    if (activeGesture) activeGesture.commits += 1;
  });

  function requestUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return input?.url || '';
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function measuredFetch(input, init = {}) {
    const url = requestUrl(input);
    if (!url.includes(PALEOCOASTLINE_PATH)) return nativeFetch(input, init);

    const gesture = activeGesture;
    if (gesture) {
      if (gesture.releasedAt === null) gesture.previewRequests += 1;
      else gesture.postReleaseRequests += 1;
    }

    let aborted = false;
    const signal = init?.signal || (typeof Request !== 'undefined' && input instanceof Request ? input.signal : null);
    const markAborted = () => {
      if (aborted) return;
      aborted = true;
      if (gesture) gesture.abortedRequests += 1;
    };
    if (signal?.aborted) markAborted();
    else signal?.addEventListener?.('abort', markAborted, { once: true });

    return nativeFetch(input, init).then((response) => {
      if (gesture) gesture.completedRequests += 1;
      return response;
    }, (error) => {
      if (error?.name === 'AbortError') markAborted();
      throw error;
    });
  };

  function currentMap() {
    try {
      return typeof map !== 'undefined' ? map : globalThis.map;
    } catch (_) {
      return globalThis.map;
    }
  }

  function patchMap(candidate) {
    if (!candidate || patchedMaps.has(candidate)) return false;
    patchedMaps.add(candidate);
    for (const methodName of ['removeSource', 'removeLayer']) {
      const original = candidate[methodName];
      if (typeof original !== 'function') continue;
      try {
        candidate[methodName] = function measuredRemoval(...args) {
          if (activeGesture) activeGesture.sourceRemovals += 1;
          return original.apply(this, args);
        };
      } catch (_) {}
    }
    return true;
  }

  patchMap(currentMap());
  const mapTimer = setInterval(() => patchMap(currentMap()), 120);
  setTimeout(() => clearInterval(mapTimer), 12000);

  globalThis.WorldlinePerformance = Object.freeze({
    BUILD,
    BUDGETS,
    reset,
    snapshot: () => summarize(latestGesture()),
    history: () => history.map(summarize),
    evaluate,
    finalize: () => summarize(finalizeGesture('manual'))
  });
  window.__WORLDLINE_PERFORMANCE_BUILD__ = BUILD;
  window.dispatchEvent(new CustomEvent('worldline:performance-ready', { detail: { build: BUILD, budgets: BUDGETS } }));
})();
