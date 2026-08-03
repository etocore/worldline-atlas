(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r11';
  const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };
  const MAX_AGE_DISTANCE = 15;
  let installed = false;
  let activePath = '';
  let activeAge = null;
  let lastRequestedAge = null;
  let loadToken = 0;
  let badge;

  function earthRuntime() {
    return globalThis.WorldlineEarthHistory;
  }

  function isEarthMode() {
    return earthRuntime()?.getMode?.() === 'earth';
  }

  function currentAge() {
    return Number(earthRuntime()?.getEarthAgeMa?.());
  }

  function setVisibility(visible) {
    if (typeof map === 'undefined' || !mapReady) return;
    ['life-evidence-clusters', 'life-evidence-cluster-count', 'life-evidence-points', 'life-evidence-labels'].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    });
  }

  function setBadge(text = '', visible = false) {
    if (!badge) return;
    badge.textContent = text;
    badge.hidden = !visible;
  }

  function installBadge() {
    if (badge || !document.querySelector('#timelineEraCard')) return;
    badge = document.createElement('span');
    badge.id = 'lifeEvidenceBadge';
    badge.className = 'life-evidence-badge';
    badge.hidden = true;
    document.querySelector('#timelineEraMeta')?.insertAdjacentElement('afterend', badge);
  }

  function installLayers() {
    if (installed || typeof map === 'undefined' || !mapReady) return installed;
    if (!map.getSource('life-evidence')) {
      map.addSource('life-evidence', {
        type: 'geojson',
        data: EMPTY_COLLECTION,
        cluster: true,
        clusterRadius: 34,
        clusterMaxZoom: 5
      });
    }

    map.addLayer({
      id: 'life-evidence-clusters',
      type: 'circle',
      source: 'life-evidence',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': 'rgba(36, 36, 38, .92)',
        'circle-radius': ['step', ['get', 'point_count'], 13, 20, 17, 75, 22],
        'circle-stroke-color': 'rgba(255, 255, 255, .82)',
        'circle-stroke-width': 1.4,
        'circle-opacity': .94
      }
    });

    map.addLayer({
      id: 'life-evidence-cluster-count',
      type: 'symbol',
      source: 'life-evidence',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 10.5,
        'text-font': ['Open Sans Semibold']
      },
      paint: { 'text-color': '#ffffff' }
    });

    map.addLayer({
      id: 'life-evidence-points',
      type: 'circle',
      source: 'life-evidence',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 4, 6, 8, 8],
        'circle-color': ['match', ['get', 'category'], 'flora', '#65c466', '#ff9f45'],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.45,
        'circle-opacity': .94,
        'circle-blur': .02
      }
    });

    map.addLayer({
      id: 'life-evidence-labels',
      type: 'symbol',
      source: 'life-evidence',
      minzoom: 4.5,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        'text-offset': [0, 1.15],
        'text-anchor': 'top',
        'text-max-width': 12,
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(4, 7, 10, .96)',
        'text-halo-width': 1.5
      }
    });

    map.on('click', 'life-evidence-clusters', async (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const source = map.getSource('life-evidence');
      const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);
      map.easeTo({ center: feature.geometry.coordinates, zoom, duration: 600, essential: true });
    });

    map.on('click', 'life-evidence-points', (event) => {
      const feature = event.features?.[0];
      if (!feature || typeof globalThis.openPlaceCard !== 'function') return;
      const props = feature.properties || {};
      const early = Number(props.earlyAge);
      const late = Number(props.lateAge);
      const range = Number.isFinite(early) && Number.isFinite(late)
        ? `${late.toFixed(late < 10 ? 2 : 1)}-${early.toFixed(early < 10 ? 2 : 1)} Ma`
        : earthRuntime()?.formatEarthAge?.(activeAge) || 'Geological age';
      const group = [props.phylum, props.className, props.orderName, props.family].filter(Boolean).join(' · ');
      globalThis.openPlaceCard({
        name: props.name || 'Fossil occurrence',
        eyebrow: props.category === 'flora' ? 'Fossil flora evidence' : 'Fossil fauna evidence',
        subtitle: `${range}${group ? ` · ${group}` : ''}`,
        range,
        confidence: 'Documented fossil occurrence',
        evidence: 'Occurrence point, not a complete species range',
        note: `This marker represents a Paleobiology Database fossil record. Its present-day discovery coordinate was reconstructed to this paleoposition with CAO2024. It does not claim the organism lived only at this point.`,
        sourceUrl: props.sourceUrl || 'https://paleobiodb.org/',
        wikiTitle: props.name || '',
        coordinates: feature.geometry.coordinates
      });
    });

    ['life-evidence-clusters', 'life-evidence-points'].forEach((id) => {
      map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
    });

    installed = true;
    return true;
  }

  async function loadForAge(ageMa) {
    if (!installLayers()) return;
    if (!isEarthMode() || !Number.isFinite(ageMa)) {
      setVisibility(false);
      setBadge('', false);
      return;
    }

    const token = ++loadToken;
    const cache = globalThis.WorldlineEarthCache;
    if (!cache) return;
    const nearest = await cache.nearestLife(ageMa);
    if (token !== loadToken) return;

    if (!nearest || nearest.distance > MAX_AGE_DISTANCE) {
      map.getSource('life-evidence')?.setData(EMPTY_COLLECTION);
      setVisibility(false);
      setBadge('Life evidence appears at reviewed fossil ages', true);
      activePath = '';
      activeAge = null;
      return;
    }

    const entry = nearest.entry;
    if (entry.path === activePath) {
      setVisibility(true);
      return;
    }

    try {
      const collection = await cache.loadEntry(entry);
      if (token !== loadToken) return;
      map.getSource('life-evidence')?.setData(collection || EMPTY_COLLECTION);
      activePath = entry.path;
      activeAge = Number(entry.ageMa);
      setVisibility(true);
      const total = Number(entry.featureCount || collection?.features?.length || 0);
      const flora = Number(entry.floraCount || 0);
      const fauna = Number(entry.faunaCount || 0);
      const breakdown = flora || fauna ? ` · ${flora} flora · ${fauna} fauna` : '';
      setBadge(`${total.toLocaleString()} fossil occurrences${breakdown}`, true);
    } catch (error) {
      console.warn('Fossil evidence snapshot unavailable:', error);
      map.getSource('life-evidence')?.setData(EMPTY_COLLECTION);
      setVisibility(false);
      setBadge('Fossil evidence unavailable', true);
    }
  }

  function synchronize() {
    installBadge();
    if (!installLayers()) return;
    const age = currentAge();
    const modeKey = isEarthMode() ? 'earth' : 'human';
    const requestKey = `${modeKey}:${Number.isFinite(age) ? age.toFixed(3) : 'none'}`;
    if (requestKey === lastRequestedAge) return;
    lastRequestedAge = requestKey;
    loadForAge(age);
  }

  window.addEventListener('worldline:timeline-mode', () => setTimeout(synchronize, 0));
  const observerTimer = setInterval(() => {
    if (!globalThis.WorldlineEarthHistory || typeof map === 'undefined' || !mapReady) return;
    synchronize();
  }, 350);

  window.addEventListener('pagehide', () => clearInterval(observerTimer), { once: true });
  window.__WORLDLINE_LIFE_EVIDENCE_BUILD__ = BUILD;
})();
