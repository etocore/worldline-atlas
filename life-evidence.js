(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r12';
  const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };
  const MAX_AGE_DISTANCE = 15;
  const REGION_ZOOM = 3.15;
  const MAX_ITEMS_PER_SECTION = 5;

  const ICONS = {
    leaf: {
      label: 'Plant life',
      glyph: '<path d="M29 13c-8 2-14 8-15 16 7 1 15-2 19-10 2-4 2-8 1-12-1 2-3 4-5 6Z"/><path d="M14 32c4-6 9-10 16-14"/>'
    },
    fish: {
      label: 'Marine life',
      glyph: '<path d="M12 25c7-8 16-10 24-4 3 2 5 5 6 7-1 2-3 5-6 7-8 6-17 4-24-4l-6 5 1-8-1-8 6 5Z"/><circle cx="34" cy="27" r="1.8"/>'
    },
    lizard: {
      label: 'Reptiles and land animals',
      glyph: '<path d="M15 29c4-7 10-10 17-8 6 1 9 6 8 11-1 5-6 8-12 7-5-1-9-4-13-10Z"/><path d="M18 25 10 18M20 35l-8 7M35 24l7-6M35 37l7 7M40 31c5 0 8 2 10 6"/>'
    },
    paw: {
      label: 'Mammal life',
      glyph: '<ellipse cx="28" cy="33" rx="10" ry="8"/><circle cx="16" cy="22" r="4"/><circle cx="25" cy="17" r="4"/><circle cx="35" cy="18" r="4"/><circle cx="43" cy="24" r="4"/>'
    },
    shell: {
      label: 'Shell-bearing sea life',
      glyph: '<path d="M14 37c0-13 8-23 19-23 9 0 16 7 16 16 0 10-8 18-18 18-9 0-17-5-17-11Z"/><path d="M31 22c6 0 10 4 10 9 0 6-5 10-11 10-5 0-9-3-9-7 0-4 3-7 7-7 3 0 5 2 5 4 0 3-2 5-5 5"/>'
    }
  };

  let installed = false;
  let installPromise = null;
  let activePath = '';
  let activeAge = null;
  let lastRequestKey = '';
  let loadToken = 0;
  let activeCollection = EMPTY_COLLECTION;
  let activeRegions = new Map();
  let selectedRegionId = '';
  let evidenceVisible = false;
  let titleObserver = null;

  function earthRuntime() {
    return globalThis.WorldlineEarthHistory;
  }

  function isEarthMode() {
    return earthRuntime()?.getMode?.() === 'earth';
  }

  function currentAge() {
    return Number(earthRuntime()?.getEarthAgeMa?.());
  }

  function escapeMarkup(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function eraForAge(age) {
    if (age >= 298.9 && age < 358.9) return 'Carboniferous world';
    if (age >= 251.902 && age < 298.9) return 'Permian world';
    if (age >= 201.4 && age < 251.902) return 'Triassic world';
    if (age >= 145 && age < 201.4) return 'Jurassic world';
    if (age >= 66 && age < 145) return 'Cretaceous world';
    if (age >= 23.03 && age < 66) return 'Paleogene world';
    if (age >= 2.58 && age < 23.03) return 'Neogene world';
    if (age >= 0.0117 && age < 2.58) return 'Ice-age world';
    return 'Earth at this time';
  }

  function commonLifeModel(properties = {}) {
    const scientificName = String(properties.name || 'Unidentified fossil').trim();
    const category = properties.category === 'flora' ? 'flora' : 'fauna';
    const classification = [
      scientificName,
      properties.phylum,
      properties.className,
      properties.orderName,
      properties.family
    ].filter(Boolean).join(' ').toLowerCase();

    if (category === 'flora') {
      if (/glossopter/.test(classification)) return item('Seed fern forests', 'leaf', 'Widespread seed ferns formed major plant communities across southern Pangea.', scientificName, properties);
      if (/marchantia|bryophy|hepatica/.test(classification)) return item('Liverworts and moss-like plants', 'leaf', 'Small, moisture-loving plants grew close to the ground.', scientificName, properties);
      if (/nympha|lemnaceae|limnobio/.test(classification)) return item('Floating freshwater plants', 'leaf', 'Aquatic flowering plants lived in ponds, lakes, and slow-moving water.', scientificName, properties);
      if (/platan|plane tree/.test(classification)) return item('Plane-tree relatives', 'leaf', 'Early relatives of familiar broadleaf trees grew in warm terrestrial habitats.', scientificName, properties);
      if (/chlorophy|algae|broeckella/.test(classification)) return item('Green algae', 'leaf', 'Photosynthetic algae lived in marine or freshwater environments.', scientificName, properties);
      if (/conifer|gymnosperm|ginkgo|cycad/.test(classification)) return item('Conifers and seed plants', 'leaf', 'Seed-bearing plants formed forests and open woodlands.', scientificName, properties);
      if (/fern|lycopod|equiset|horsetail/.test(classification)) return item('Ferns and horsetails', 'leaf', 'Spore-producing plants occupied wetlands and forest understories.', scientificName, properties);
      if (/angiosperm|dicot|magnoli|spermatophy/.test(classification)) return item('Flowering plants', 'leaf', 'Flowering plants were part of the terrestrial vegetation recorded here.', scientificName, properties);
      return item('Ancient plant life', 'leaf', 'Plant fossils document terrestrial or freshwater ecosystems in this area.', scientificName, properties);
    }

    if (/tyrannosaur/.test(classification)) return item('Tyrannosaurs', 'lizard', 'Large predatory dinosaurs lived in this broader region.', scientificName, properties);
    if (/triceratop|ceratops/.test(classification)) return item('Horned dinosaurs', 'lizard', 'Plant-eating dinosaurs with beaks and facial horns are represented in the fossil record.', scientificName, properties);
    if (/dinosaur|saurisch|ornithisch|theropod|sauropod/.test(classification)) return item('Dinosaurs', 'lizard', 'Dinosaur fossils document terrestrial ecosystems in this region.', scientificName, properties);
    if (/mosasaur|plesiosaur|ichthyosaur/.test(classification)) return item('Marine reptiles', 'fish', 'Large reptiles lived in the seas that covered or bordered this area.', scientificName, properties);
    if (/reptil|archosaur|amphib|synapsid|therapsid|gorgonops/.test(classification)) return item('Early reptiles and their relatives', 'lizard', 'Land vertebrates adapted to the climates and habitats of this period.', scientificName, properties);
    if (/mammal|mammalia/.test(classification)) return item('Early mammals', 'paw', 'Small mammals and their relatives occupied terrestrial ecosystems.', scientificName, properties);
    if (/actinopter|chondrich|osteich|fish|shark/.test(classification)) return item('Fish and shark relatives', 'fish', 'Fish fossils document marine or freshwater habitats.', scientificName, properties);
    if (/cephalopod|nautil|ammon/.test(classification)) return item('Nautilus and ammonite relatives', 'shell', 'Shell-bearing swimmers lived in ancient seas.', scientificName, properties);
    if (/bivalv|ostrea|gastropod|mollusc/.test(classification)) return item('Shellfish and sea snails', 'shell', 'Mollusks lived on or near the seafloor.', scientificName, properties);
    if (/brachiopod/.test(classification)) return item('Lamp shells', 'shell', 'Brachiopods filtered food from ancient seawater.', scientificName, properties);
    if (/cnidaria|anthozoa|coral|scleract/.test(classification)) return item('Corals and reef life', 'shell', 'Coral relatives formed part of marine communities.', scientificName, properties);
    if (/bryozoa/.test(classification)) return item('Tiny colonial sea animals', 'shell', 'Bryozoans formed branching or sheet-like colonies on the seafloor.', scientificName, properties);
    if (/annelid|serpula/.test(classification)) return item('Marine worms', 'fish', 'Tube-building worms lived on the seafloor.', scientificName, properties);
    return item('Ancient animal life', 'lizard', 'Animal fossils document life in this area, although the record is incomplete.', scientificName, properties);
  }

  function item(commonName, icon, description, scientificName, properties) {
    return {
      commonName,
      icon,
      description,
      scientificName,
      sourceUrl: String(properties.sourceUrl || 'https://paleobiodb.org/'),
      occurrenceId: String(properties.occurrenceId || ''),
      category: properties.category === 'flora' ? 'flora' : 'fauna'
    };
  }

  function marineItem(model) {
    return ['fish', 'shell'].includes(model.icon);
  }

  function regionGrid(collection) {
    const count = collection.features?.length || 0;
    if (count > 500) return { longitude: 28, latitude: 20 };
    if (count > 150) return { longitude: 36, latitude: 24 };
    return { longitude: 48, latitude: 30 };
  }

  function buildRegions(collection, ageMa) {
    const grid = regionGrid(collection);
    const buckets = new Map();

    for (const feature of collection.features || []) {
      const coordinates = feature.geometry?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
      const longitude = Number(coordinates[0]);
      const latitude = Number(coordinates[1]);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;

      const x = Math.floor((longitude + 180) / grid.longitude);
      const y = Math.floor((latitude + 90) / grid.latitude);
      const key = `${x}:${y}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          id: `life-region-${String(ageMa).replace('.', '-')}-${x}-${y}`,
          features: [],
          longitudeTotal: 0,
          latitudeTotal: 0
        });
      }
      const bucket = buckets.get(key);
      bucket.features.push(feature);
      bucket.longitudeTotal += longitude;
      bucket.latitudeTotal += latitude;
    }

    const models = new Map();
    const regionFeatures = [];

    for (const bucket of buckets.values()) {
      const organisms = bucket.features.map((feature) => ({
        feature,
        model: commonLifeModel(feature.properties || {})
      }));
      const flora = dedupeItems(organisms.filter(({ model }) => model.category === 'flora').map(({ model }) => model));
      const fauna = dedupeItems(organisms.filter(({ model }) => model.category === 'fauna').map(({ model }) => model));
      const all = [...flora, ...fauna];
      const longitude = bucket.longitudeTotal / bucket.features.length;
      const latitude = bucket.latitudeTotal / bucket.features.length;
      const marineCount = organisms.filter(({ model }) => marineItem(model)).length;
      const terrestrialCount = organisms.length - marineCount;
      const icon = representativeIcon(flora, fauna, marineCount, terrestrialCount);
      const environment = environmentSummary(flora, fauna, marineCount, terrestrialCount);
      const hemisphere = Math.abs(latitude) < 18 ? 'Equatorial' : latitude > 0 ? 'Northern' : 'Southern';
      const areaLabel = `${hemisphere} ${environment.shortLabel}`;
      const model = {
        id: bucket.id,
        ageMa,
        coordinates: [longitude, latitude],
        flora,
        fauna,
        all,
        icon,
        environment,
        areaLabel,
        evidenceCount: bucket.features.length,
        features: bucket.features
      };
      models.set(bucket.id, model);
      regionFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: model.coordinates },
        properties: {
          regionId: bucket.id,
          icon: `life-${icon}`,
          title: areaLabel,
          accessibilityLabel: `${areaLabel}, ${flora.length ? 'plant life' : ''}${flora.length && fauna.length ? ' and ' : ''}${fauna.length ? 'animal life' : ''}`
        }
      });
    }

    return {
      models,
      collection: { type: 'FeatureCollection', features: regionFeatures }
    };
  }

  function dedupeItems(items) {
    const unique = new Map();
    for (const entry of items) {
      const key = entry.commonName.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, { ...entry, scientificNames: new Set([entry.scientificName]), sources: new Set([entry.sourceUrl]) });
      } else {
        unique.get(key).scientificNames.add(entry.scientificName);
        unique.get(key).sources.add(entry.sourceUrl);
      }
    }
    return [...unique.values()].map((entry) => ({
      ...entry,
      scientificNames: [...entry.scientificNames].filter(Boolean),
      sources: [...entry.sources].filter(Boolean)
    }));
  }

  function representativeIcon(flora, fauna, marineCount, terrestrialCount) {
    if (flora.length && !fauna.length) return 'leaf';
    if (fauna.length && !flora.length) {
      if (marineCount > terrestrialCount) return fauna.find((item) => item.icon === 'fish') ? 'fish' : 'shell';
      return fauna.find((item) => item.icon === 'paw') ? 'paw' : 'lizard';
    }
    if (flora.length && fauna.length) return marineCount > terrestrialCount ? 'fish' : 'leaf';
    return 'lizard';
  }

  function environmentSummary(flora, fauna, marineCount, terrestrialCount) {
    if (marineCount && terrestrialCount) {
      return {
        shortLabel: 'coastal ecosystems',
        title: 'Coastlines and mixed habitats',
        description: 'The fossil evidence combines marine organisms with land or freshwater life, suggesting records from a coastline or a region that includes several nearby environments.'
      };
    }
    if (marineCount) {
      return {
        shortLabel: 'ancient seas',
        title: 'Marine environment',
        description: 'The recorded organisms are predominantly marine. They represent ancient seas, seafloors, reefs, or shallow continental waters.'
      };
    }
    if (flora.length && fauna.length) {
      return {
        shortLabel: 'land ecosystems',
        title: 'Terrestrial environment',
        description: 'Plant and animal fossils document a terrestrial or freshwater ecosystem. The original habitat may have included forests, floodplains, lakes, or river systems.'
      };
    }
    if (flora.length) {
      return {
        shortLabel: 'plant habitats',
        title: 'Vegetated environment',
        description: 'Plant fossils document terrestrial or freshwater vegetation. The fossil record does not preserve every plant community that once existed.'
      };
    }
    return {
      shortLabel: 'land ecosystems',
      title: 'Terrestrial environment',
      description: 'The available animal fossils indicate a terrestrial or freshwater ecosystem, but the surviving record remains incomplete.'
    };
  }

  function svgDocument(kind) {
    const definition = ICONS[kind] || ICONS.lizard;
    const accent = kind === 'leaf' ? '#66d17a' : kind === 'fish' || kind === 'shell' ? '#67b7ff' : kind === 'paw' ? '#d3a7ff' : '#ffad66';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 56 56">
      <defs>
        <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".42"/>
        </filter>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#45454a"/>
          <stop offset="1" stop-color="#1c1c1f"/>
        </linearGradient>
      </defs>
      <g filter="url(#s)">
        <circle cx="28" cy="28" r="22" fill="url(#g)" stroke="rgba(255,255,255,.72)" stroke-width="1.1"/>
        <circle cx="28" cy="28" r="18.5" fill="${accent}" fill-opacity=".13"/>
        <g fill="none" stroke="${accent}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${definition.glyph}</g>
      </g>
    </svg>`;
  }

  function loadSvgImage(kind) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgDocument(kind))}`;
    });
  }

  async function installImages() {
    for (const kind of Object.keys(ICONS)) {
      const name = `life-${kind}`;
      if (map.hasImage(name)) continue;
      const image = await loadSvgImage(kind);
      map.addImage(name, image, { pixelRatio: 2 });
    }
  }

  async function installLayers() {
    if (installed) return true;
    if (installPromise) return installPromise;
    if (typeof map === 'undefined' || !mapReady) return false;

    installPromise = (async () => {
      await installImages();

      if (!map.getSource('life-regions')) {
        map.addSource('life-regions', { type: 'geojson', data: EMPTY_COLLECTION });
      }
      if (!map.getSource('life-region-selection')) {
        map.addSource('life-region-selection', { type: 'geojson', data: EMPTY_COLLECTION });
      }
      if (!map.getSource('life-evidence')) {
        map.addSource('life-evidence', { type: 'geojson', data: EMPTY_COLLECTION });
      }

      map.addLayer({
        id: 'life-region-selection',
        type: 'circle',
        source: 'life-region-selection',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 22, 4, 34, 8, 46],
          'circle-color': 'rgba(10,132,255,.1)',
          'circle-stroke-color': 'rgba(255,255,255,.92)',
          'circle-stroke-width': 2,
          'circle-blur': .12
        }
      });

      map.addLayer({
        id: 'life-region-halo',
        type: 'circle',
        source: 'life-regions',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 17, 4, 24, 8, 30],
          'circle-color': 'rgba(0,0,0,.2)',
          'circle-blur': .65,
          'circle-opacity': .75
        }
      });

      map.addLayer({
        id: 'life-region-icons',
        type: 'symbol',
        source: 'life-regions',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 0, .72, 4, .9, 8, 1.04],
          'icon-allow-overlap': false,
          'icon-ignore-placement': false
        }
      });

      map.addLayer({
        id: 'life-region-hit',
        type: 'circle',
        source: 'life-regions',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 27, 5, 34, 9, 42],
          'circle-color': 'rgba(255,255,255,.01)',
          'circle-stroke-opacity': 0
        }
      });

      map.addLayer({
        id: 'life-evidence-points',
        type: 'circle',
        source: 'life-evidence',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 4.5, 7, 7],
          'circle-color': [
            'match',
            ['get', 'category'],
            'flora', '#65d27a',
            '#ffad66'
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-opacity': .96
        }
      });

      map.addLayer({
        id: 'life-evidence-labels',
        type: 'symbol',
        source: 'life-evidence',
        minzoom: 5.3,
        layout: {
          visibility: 'none',
          'text-field': ['get', 'commonName'],
          'text-size': 11,
          'text-offset': [0, 1.1],
          'text-anchor': 'top',
          'text-max-width': 11,
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': 'rgba(0,0,0,.92)',
          'text-halo-width': 1.5
        }
      });

      map.on('click', 'life-region-hit', (event) => {
        const regionId = event.features?.[0]?.properties?.regionId;
        if (regionId) selectRegion(regionId);
      });

      map.on('click', 'life-evidence-points', (event) => {
        const feature = event.features?.[0];
        if (feature) openEvidenceRecord(feature);
      });

      ['life-region-icons', 'life-region-hit', 'life-evidence-points'].forEach((layerId) => {
        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
      });

      installed = true;
      return true;
    })().catch((error) => {
      installPromise = null;
      console.warn('Life-region layer installation failed:', error);
      return false;
    });

    return installPromise;
  }

  function evidenceFeatureCollection(region) {
    return {
      type: 'FeatureCollection',
      features: region.features.map((feature) => {
        const model = commonLifeModel(feature.properties || {});
        return {
          ...feature,
          properties: {
            ...(feature.properties || {}),
            commonName: model.commonName,
            commonDescription: model.description,
            icon: model.icon
          }
        };
      })
    };
  }

  function setRegionVisibility(visible) {
    ['life-region-halo', 'life-region-icons', 'life-region-hit'].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    });
  }

  function setEvidenceVisibility(visible, region = activeRegions.get(selectedRegionId)) {
    evidenceVisible = Boolean(visible && region);
    setRegionVisibility(!evidenceVisible);
    ['life-evidence-points', 'life-evidence-labels'].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', evidenceVisible ? 'visible' : 'none');
    });
    map.getSource('life-evidence')?.setData(evidenceVisible && region ? evidenceFeatureCollection(region) : EMPTY_COLLECTION);
    document.body.dataset.lifeDisplay = evidenceVisible ? 'evidence' : 'regions';
    updateEvidenceButton();
  }

  function selectRegion(regionId) {
    const region = activeRegions.get(regionId);
    if (!region) return;
    selectedRegionId = regionId;
    setEvidenceVisibility(false, region);
    map.getSource('life-region-selection')?.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: region.coordinates },
        properties: {}
      }]
    });

    const currentZoom = map.getZoom();
    const mobile = window.matchMedia('(max-width: 720px)').matches;
    map.easeTo({
      center: region.coordinates,
      zoom: Math.max(currentZoom + .8, REGION_ZOOM),
      bearing: map.getBearing() * .35,
      pitch: mobile ? 8 : 18,
      offset: [0, mobile ? -94 : -52],
      duration: 720,
      essential: true
    });

    openRegionSheet(region);
  }

  function openRegionSheet(region) {
    if (typeof globalThis.openPlaceCard !== 'function') return;
    const ageLabel = earthRuntime()?.formatEarthAge?.(region.ageMa) || `${region.ageMa} Ma`;
    const era = eraForAge(region.ageMa);
    const commonExamples = region.all.slice(0, 3).map((entry) => entry.commonName.toLowerCase());
    const summary = commonExamples.length
      ? `Fossils from this area include ${naturalList(commonExamples)}. ${region.environment.description}`
      : region.environment.description;

    globalThis.openPlaceCard({
      name: 'Life in this area',
      eyebrow: `Life at ${ageLabel}`,
      subtitle: `${era} · ${region.areaLabel}`,
      range: ageLabel,
      confidence: 'Fossil-backed summary',
      evidence: 'Regional occurrence evidence',
      note: summary,
      sourceUrl: 'https://paleobiodb.org/',
      wikiTitle: era.replace(' world', ''),
      coordinates: region.coordinates
    });

    requestAnimationFrame(() => renderRegionContent(region, summary));
  }

  function renderRegionContent(region, summary) {
    const sheet = document.querySelector('#placeSheet');
    const evidence = document.querySelector('#placeEvidence');
    const contextSource = document.querySelector('#placeContextSource');
    const hero = document.querySelector('#placeHero');
    const summaryNode = document.querySelector('#placeSummary');
    if (!sheet || !evidence) return;

    sheet.classList.add('life-region-sheet');
    if (hero) hero.hidden = true;
    if (summaryNode) {
      summaryNode.classList.remove('is-loading');
      summaryNode.textContent = summary;
    }
    if (contextSource) {
      contextSource.textContent = 'Common-language summary derived from fossil occurrence records. Scientific names and source records stay behind each item.';
    }

    evidence.innerHTML = `
      <div class="life-region-content">
        ${renderSection('Flora', region.flora, 'leaf', 'No reviewed plant records are available for this selected area.')}
        ${renderSection('Fauna', region.fauna, region.icon === 'leaf' ? 'lizard' : region.icon, 'No reviewed animal records are available for this selected area.')}
        <section class="life-environment-card">
          <span class="life-card-icon">${iconSvg(region.environment.shortLabel.includes('sea') || region.environment.shortLabel.includes('coastal') ? 'fish' : 'leaf')}</span>
          <div>
            <span class="life-card-kicker">Environment</span>
            <strong>${escapeMarkup(region.environment.title)}</strong>
            <p>${escapeMarkup(region.environment.description)}</p>
          </div>
        </section>
        <div class="life-region-actions">
          <button id="lifeEvidenceToggle" class="life-evidence-toggle" type="button">
            <span>${iconSvg('shell')}</span>
            <span><strong>View fossil evidence</strong><small>Show individual source records on the globe</small></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
          </button>
        </div>
        <p class="life-evidence-caveat">Fossil finds show where evidence has been recovered, not the complete range of a species. Empty areas can reflect preservation, exposed rock, and collection history.</p>
      </div>
    `;

    evidence.querySelector('#lifeEvidenceToggle')?.addEventListener('click', () => {
      setEvidenceVisibility(!evidenceVisible, region);
    });
    updateEvidenceButton();
    installTitleObserver();
  }

  function renderSection(title, items, fallbackIcon, emptyText) {
    const visible = items.slice(0, MAX_ITEMS_PER_SECTION);
    return `
      <section class="life-section">
        <header><h3>${escapeMarkup(title)}</h3>${items.length > visible.length ? `<span>${items.length - visible.length} more groups</span>` : ''}</header>
        <div class="life-list">
          ${visible.length ? visible.map(renderLifeItem).join('') : `
            <div class="life-empty">
              <span>${iconSvg(fallbackIcon)}</span>
              <p>${escapeMarkup(emptyText)}</p>
            </div>
          `}
        </div>
      </section>
    `;
  }

  function renderLifeItem(entry) {
    const scientific = entry.scientificNames.filter((name) => name && name.toLowerCase() !== entry.commonName.toLowerCase());
    return `
      <details class="life-item">
        <summary>
          <span class="life-item-art life-${escapeMarkup(entry.icon)}">${iconSvg(entry.icon)}</span>
          <span class="life-item-copy"><strong>${escapeMarkup(entry.commonName)}</strong><small>${escapeMarkup(entry.description)}</small></span>
          <span class="life-item-chevron" aria-hidden="true"></span>
        </summary>
        <div class="life-item-detail">
          ${scientific.length ? `<p><span>Scientific record</span>${escapeMarkup(scientific.slice(0, 3).join(', '))}</p>` : ''}
          <p><span>Why it appears here</span>One or more fossil occurrence records fall inside this paleogeographic area.</p>
          ${entry.sources[0] ? `<a href="${escapeMarkup(entry.sources[0])}" target="_blank" rel="noreferrer">Open source record</a>` : ''}
        </div>
      </details>
    `;
  }

  function updateEvidenceButton() {
    const button = document.querySelector('#lifeEvidenceToggle');
    if (!button) return;
    const strong = button.querySelector('strong');
    const small = button.querySelector('small');
    if (strong) strong.textContent = evidenceVisible ? 'Return to life overview' : 'View fossil evidence';
    if (small) small.textContent = evidenceVisible ? 'Hide individual points and show regional imagery' : 'Show individual source records on the globe';
    button.setAttribute('aria-pressed', String(evidenceVisible));
  }

  function naturalList(items) {
    if (items.length < 2) return items[0] || '';
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
  }

  function iconSvg(kind) {
    const definition = ICONS[kind] || ICONS.lizard;
    return `<svg viewBox="0 0 56 56" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${definition.glyph}</g></svg>`;
  }

  function openEvidenceRecord(feature) {
    const properties = feature.properties || {};
    const model = commonLifeModel(properties);
    const ageLabel = earthRuntime()?.formatEarthAge?.(activeAge) || `${activeAge} Ma`;
    globalThis.openPlaceCard?.({
      name: model.commonName,
      eyebrow: model.category === 'flora' ? 'Plant fossil record' : 'Animal fossil record',
      subtitle: `${ageLabel} · Source evidence`,
      range: ageLabel,
      confidence: 'Documented fossil occurrence',
      evidence: 'Individual record',
      note: `${model.description} This point is one fossil occurrence, not a complete geographic range.`,
      sourceUrl: model.sourceUrl,
      wikiTitle: model.commonName,
      coordinates: feature.geometry?.coordinates
    });
    requestAnimationFrame(() => {
      const evidence = document.querySelector('#placeEvidence');
      if (!evidence) return;
      evidence.innerHTML = `
        <div class="life-record-detail">
          <span class="life-record-art">${iconSvg(model.icon)}</span>
          <div><span>Common description</span><strong>${escapeMarkup(model.commonName)}</strong><p>${escapeMarkup(model.description)}</p></div>
          <div><span>Scientific record</span><strong>${escapeMarkup(model.scientificName)}</strong><p>Shown only here so the main map and regional lists remain understandable.</p></div>
        </div>
      `;
    });
  }

  function installTitleObserver() {
    if (titleObserver) return;
    const title = document.querySelector('#placeTitle');
    if (!title) return;
    titleObserver = new MutationObserver(() => {
      if (title.textContent.trim() !== 'Life in this area') {
        document.querySelector('#placeSheet')?.classList.remove('life-region-sheet');
      }
    });
    titleObserver.observe(title, { childList: true, characterData: true, subtree: true });
  }

  function clearLifeLayers() {
    activeRegions = new Map();
    selectedRegionId = '';
    evidenceVisible = false;
    map.getSource('life-regions')?.setData(EMPTY_COLLECTION);
    map.getSource('life-region-selection')?.setData(EMPTY_COLLECTION);
    map.getSource('life-evidence')?.setData(EMPTY_COLLECTION);
    ['life-region-halo', 'life-region-icons', 'life-region-hit', 'life-evidence-points', 'life-evidence-labels'].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
    });
    document.body.dataset.lifeDisplay = 'hidden';
  }

  async function loadForAge(ageMa) {
    const ready = await installLayers();
    if (!ready) return;

    if (!isEarthMode() || !Number.isFinite(ageMa)) {
      clearLifeLayers();
      return;
    }

    const token = ++loadToken;
    const cache = globalThis.WorldlineEarthCache;
    if (!cache) return;
    const nearest = await cache.nearestLife(ageMa);
    if (token !== loadToken) return;

    if (!nearest || nearest.distance > MAX_AGE_DISTANCE) {
      clearLifeLayers();
      return;
    }

    const entry = nearest.entry;
    try {
      if (entry.path !== activePath) {
        activeCollection = await cache.loadEntry(entry);
        activePath = entry.path;
      }
      if (token !== loadToken) return;

      activeAge = Number(entry.ageMa);
      const built = buildRegions(activeCollection || EMPTY_COLLECTION, activeAge);
      activeRegions = built.models;
      map.getSource('life-regions')?.setData(built.collection);
      map.getSource('life-region-selection')?.setData(EMPTY_COLLECTION);
      map.getSource('life-evidence')?.setData(EMPTY_COLLECTION);
      selectedRegionId = '';
      evidenceVisible = false;
      setRegionVisibility(true);
      ['life-evidence-points', 'life-evidence-labels'].forEach((id) => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
      });
      document.body.dataset.lifeDisplay = 'regions';
    } catch (error) {
      console.warn('Life-region snapshot unavailable:', error);
      clearLifeLayers();
    }
  }

  function synchronize() {
    if (!globalThis.WorldlineEarthHistory || typeof map === 'undefined' || !mapReady) return;
    const age = currentAge();
    const modeKey = isEarthMode() ? 'earth' : 'human';
    const requestKey = `${modeKey}:${Number.isFinite(age) ? age.toFixed(3) : 'none'}`;
    if (requestKey === lastRequestKey) return;
    lastRequestKey = requestKey;
    loadForAge(age);
  }

  window.addEventListener('worldline:timeline-mode', () => setTimeout(synchronize, 0));
  window.addEventListener('worldline:ui-state', (event) => {
    if (event.detail?.current?.active === 'none' && evidenceVisible) setEvidenceVisibility(false);
  });

  const observerTimer = setInterval(synchronize, 320);
  window.addEventListener('pagehide', () => clearInterval(observerTimer), { once: true });

  window.__WORLDLINE_LIFE_EVIDENCE_BUILD__ = BUILD;
  globalThis.WorldlineLifeRegions = Object.freeze({
    BUILD,
    selectRegion,
    showEvidence: () => setEvidenceVisibility(true),
    hideEvidence: () => setEvidenceVisibility(false),
    getRegionCount: () => activeRegions.size
  });
})();
