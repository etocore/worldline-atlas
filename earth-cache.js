(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r11';
  const MANIFEST_URL = `data/earth/cache/manifest.json?v=${BUILD}`;
  const RUNTIME_CACHE = `worldline-earth-${BUILD}`;
  const nativeFetch = window.fetch.bind(window);
  const memory = new Map();
  let manifestPromise;

  function requestUrl(input) {
    if (typeof input === 'string') return new URL(input, location.href);
    if (input instanceof URL) return input;
    if (input?.url) return new URL(input.url, location.href);
    return null;
  }

  async function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = nativeFetch(MANIFEST_URL, { cache: 'no-cache' })
        .then((response) => response.ok ? response.json() : null)
        .catch(() => null);
    }
    return manifestPromise;
  }

  function nearestEntry(entries, ageMa) {
    if (!Array.isArray(entries) || !entries.length) return null;
    return entries.reduce((best, entry) => {
      const distance = Math.abs(Number(entry.ageMa) - ageMa);
      return !best || distance < best.distance ? { entry, distance } : best;
    }, null);
  }

  function maxPreviewDistance(ageMa) {
    if (ageMa <= 1) return 0.05;
    if (ageMa <= 100) return 12;
    if (ageMa <= 540) return 30;
    if (ageMa <= 1000) return 100;
    return 180;
  }

  async function fetchStaticEntry(entry) {
    if (!entry?.path) return null;
    if (memory.has(entry.path)) return memory.get(entry.path);
    const promise = nativeFetch(`${entry.path}?v=${entry.sha256 || BUILD}`, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Static Earth snapshot returned ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        memory.delete(entry.path);
        throw error;
      });
    memory.set(entry.path, promise);
    return promise;
  }

  async function persistentResponse(url) {
    if (!('caches' in window)) return null;
    try {
      const cache = await caches.open(RUNTIME_CACHE);
      return cache.match(url.href);
    } catch {
      return null;
    }
  }

  async function rememberResponse(url, response) {
    if (!('caches' in window) || !response?.ok) return;
    try {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(url.href, response.clone());
    } catch (_) {}
  }

  function wrappedResponse(body) {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-worldline-cache': 'github-snapshot'
      }
    });
  }

  function refineInBackground(url, init) {
    nativeFetch(url.href, { ...init, signal: undefined })
      .then((response) => rememberResponse(url, response))
      .catch(() => {});
  }

  async function serveCoastline(url, init) {
    const requested = Number(url.searchParams.get('time'));
    if (!Number.isFinite(requested)) return nativeFetch(url.href, init);

    const persistent = await persistentResponse(url);
    if (persistent) return persistent;

    const manifest = await loadManifest();
    const nearest = nearestEntry(manifest?.coastlines, requested);
    if (!nearest || nearest.distance > maxPreviewDistance(requested)) {
      const live = await nativeFetch(url.href, init);
      rememberResponse(url, live);
      return live;
    }

    try {
      const collection = await fetchStaticEntry(nearest.entry);
      refineInBackground(url, init);
      return wrappedResponse({
        model: nearest.entry.model || manifest.model || 'CAO2024',
        requestedTime: requested,
        time: Number(nearest.entry.ageMa),
        temporalResolutionMa: Math.max(nearest.distance, 0),
        supported: true,
        cached: true,
        approximate: nearest.distance > 0.0001,
        source: 'github-snapshot',
        collection
      });
    } catch {
      const live = await nativeFetch(url.href, init);
      rememberResponse(url, live);
      return live;
    }
  }

  window.fetch = function worldlineCachedFetch(input, init = {}) {
    const url = requestUrl(input);
    if (url && url.origin === location.origin && url.pathname === '/api/paleocoastlines') {
      return serveCoastline(url, init);
    }
    return nativeFetch(input, init);
  };

  async function preload(ageMa = 250) {
    const manifest = await loadManifest();
    const nearest = nearestEntry(manifest?.coastlines, ageMa);
    if (nearest) fetchStaticEntry(nearest.entry).catch(() => {});
  }

  globalThis.WorldlineEarthCache = Object.freeze({
    BUILD,
    ready: loadManifest,
    manifest: loadManifest,
    nearestCoastline: async (ageMa) => nearestEntry((await loadManifest())?.coastlines, Number(ageMa)),
    nearestLife: async (ageMa) => nearestEntry((await loadManifest())?.life, Number(ageMa)),
    loadEntry: fetchStaticEntry,
    preload
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => preload(250), { once: true });
  } else {
    preload(250);
  }
})();
