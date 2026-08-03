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
      new maplibregl.Popup({ closeButton: true, maxWidth: '330px' })
        .setLngLat(event.lngLat)
        .setHTML(`
          <strong class="popup-title">${escapeHtml(packageDef.title)}</strong>
          <div class="popup-meta">
            Foundation reconstruction package<br>
            ${escapeHtml(properties.note || 'Research extent only.')}<br>
            No historical boundary is claimed by this polygon.
          </div>
          <a class="popup-link" href="${escapeHtml(packageDef.manifestPath)}" target="_blank" rel="noreferrer">Open package manifest</a>
        `)
        .addTo(map);
    });

    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  });
}
