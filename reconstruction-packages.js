const reconstructionPackageRegistry = [
  {
    id: 'rome-117',
    title: 'Rome in 117 CE',
    aliases: ['rome', 'roma', 'ancient rome', 'imperial rome'],
    targetYear: 117,
    validWindow: { start: 117, end: 117 },
    status: 'foundation',
    camera: {
      center: [12.4923, 41.8902],
      zoom: 11.8,
      pitch: 52,
      bearing: -18
    },
    manifestPath: 'reconstructions/rome-117/manifest.json',
    studyAreaPath: 'reconstructions/rome-117/study-area.geojson'
  }
];

let activeReconstructionPackage = null;

function normalizeReconstructionTerm(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function findReconstructionPackage(placeTerm, requestedYear = null) {
  const normalized = normalizeReconstructionTerm(placeTerm);
  if (!normalized) return null;

  return reconstructionPackageRegistry.find((packageDef) => {
    const nameMatch = packageDef.aliases.some((alias) => {
      const normalizedAlias = normalizeReconstructionTerm(alias);
      return normalized === normalizedAlias
        || normalized.includes(normalizedAlias)
        || normalizedAlias.includes(normalized);
    });
    const yearMatch = requestedYear === null
      || (requestedYear >= packageDef.validWindow.start && requestedYear <= packageDef.validWindow.end);
    return nameMatch && yearMatch;
  }) || null;
}

function addReconstructionPackageLayers() {
  reconstructionPackageRegistry.forEach((packageDef) => {
    const sourceId = `${packageDef.id}-study-area`;
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: packageDef.studyAreaPath
      });
    }

    map.addLayer({
      id: `${packageDef.id}-study-fill`,
      type: 'fill',
      source: sourceId,
      minzoom: 7,
      layout: { visibility: 'none' },
      paint: {
        'fill-color': '#ffb35c',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.035, 12, 0.085, 16, 0.12]
      }
    });

    map.addLayer({
      id: `${packageDef.id}-study-line`,
      type: 'line',
      source: sourceId,
      minzoom: 7,
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#ffd29d',
        'line-opacity': 0.9,
        'line-width': ['interpolate', ['linear'], ['zoom'], 7, 1, 13, 2.25],
        'line-dasharray': [2, 2]
      }
    });

    map.addLayer({
      id: `${packageDef.id}-study-label`,
      type: 'symbol',
      source: sourceId,
      minzoom: 8.5,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-letter-spacing': 0.04,
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#ffe1bd',
        'text-halo-color': 'rgba(15, 10, 5, 0.92)',
        'text-halo-width': 1.5
      }
    });
  });
}

function reconstructionLayerIds(packageDef) {
  return [
    `${packageDef.id}-study-fill`,
    `${packageDef.id}-study-line`,
    `${packageDef.id}-study-label`
  ];
}

function updateReconstructionPackageVisibility() {
  if (!mapReady) return;

  reconstructionPackageRegistry.forEach((packageDef) => {
    const isActive = activeReconstructionPackage?.id === packageDef.id;
    const inWindow = selectedYear >= packageDef.validWindow.start
      && selectedYear <= packageDef.validWindow.end;
    const visible = isActive && inWindow;
    setLayerGroupVisibility(reconstructionLayerIds(packageDef), visible);
  });
}

function activateReconstructionPackage(packageDef, requestedYear = null) {
  if (!packageDef) return false;
  activeReconstructionPackage = packageDef;

  const year = requestedYear === null ? packageDef.targetYear : requestedYear;
  setYear(year);
  if (typeof setSurfaceMode === 'function') setSurfaceMode('reconstructed');
  updateReconstructionPackageVisibility();

  if (mapReady) {
    map.flyTo({
      ...packageDef.camera,
      duration: 2100,
      essential: true
    });
  }
  return true;
}

function bindReconstructionPackageInteractions() {
  reconstructionPackageRegistry.forEach((packageDef) => {
    const layerId = `${packageDef.id}-study-fill`;
    map.on('click', layerId, (event) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const properties = feature.properties || {};
      const coordinates = [event.lngLat.lng, event.lngLat.lat];

      if (typeof globalThis.openPlaceCard === 'function') {
        globalThis.openPlaceCard({
          name: packageDef.title,
          eyebrow: 'Foundation reconstruction package',
          subtitle: `Target year ${formatYear(packageDef.targetYear)}`,
          range: formatYear(packageDef.targetYear),
          confidence: 'Research extent only',
          evidence: 'Placeholder geometry',
          note: `${properties.note || 'Research extent only.'} No historical boundary, wall, or urban footprint is claimed by this polygon.`,
          sourceUrl: packageDef.manifestPath,
          wikiTitle: 'Ancient Rome',
          wikidata: 'Q220',
          coordinates
        });
      }
    });

    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  });
}

let reconstructionLayersInstalled = false;
let reconstructionYearHookInstalled = false;

function installReconstructionRuntime() {
  if (!reconstructionYearHookInstalled && typeof setYear === 'function') {
    const baseSetYear = setYear;
    setYear = function setYearWithReconstructionVisibility(year, options) {
      const result = baseSetYear(year, options);
      updateReconstructionPackageVisibility();
      return result;
    };
    reconstructionYearHookInstalled = true;
  }

  if (
    !reconstructionLayersInstalled
    && typeof mapReady !== 'undefined'
    && mapReady
    && typeof setLayerGroupVisibility === 'function'
    && typeof escapeHtml === 'function'
  ) {
    addReconstructionPackageLayers();
    bindReconstructionPackageInteractions();
    updateReconstructionPackageVisibility();
    reconstructionLayersInstalled = true;
  }

  return reconstructionLayersInstalled && reconstructionYearHookInstalled;
}

function reconstructionPackageFromSearchInput() {
  if (
    typeof extractYearFromQuery !== 'function'
    || typeof placeTermFromQuery !== 'function'
  ) return null;

  const input = document.querySelector('#historySearch');
  const query = input?.value.trim() || '';
  if (!query) return null;

  const requestedYear = extractYearFromQuery(query);
  const placeTerm = placeTermFromQuery(query);
  const packageDef = findReconstructionPackage(placeTerm, requestedYear);
  return packageDef ? { packageDef, requestedYear } : null;
}

function interceptReconstructionSearch(event) {
  const isSubmitClick = event.type === 'click' && event.target.closest?.('#searchSubmit');
  const isSearchEnter = event.type === 'keydown'
    && event.key === 'Enter'
    && event.target.matches?.('#historySearch');
  if (!isSubmitClick && !isSearchEnter) return;

  const match = reconstructionPackageFromSearchInput();
  if (!match) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  installReconstructionRuntime();
  activateReconstructionPackage(match.packageDef, match.requestedYear);
  if (typeof setSheetOpen === 'function') setSheetOpen(true);
  if (typeof showSearchFeedback === 'function') {
    showSearchFeedback(
      `Opened ${match.packageDef.title}. The outlined rectangle is only a research extent. Streets, buildings, terrain, and vegetation remain empty until reviewed evidence is added.`
    );
  }
}

document.addEventListener('click', interceptReconstructionSearch, true);
document.addEventListener('keydown', interceptReconstructionSearch, true);

const reconstructionInstallTimer = setInterval(() => {
  if (installReconstructionRuntime()) clearInterval(reconstructionInstallTimer);
}, 100);
