(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r10';
  const SLIDER_MAX = 1000;
  const MAX_RECONSTRUCTION_AGE_MA = 1800;
  const EARTH_DEFAULT_AGE_MA = 250;
  const HUMAN_DEFAULT_YEAR = -10000;
  const EARTH_STOPS = [4567.3, 4000, 2500, 1800, 1000, 541, 252, 66, 2.58, 0.3, 0.0117, 0];
  const HUMAN_STOPS = [-300000, -200000, -100000, -50000, -12000, -3000, 0, 1000, 1500, 1800, 1950, 2026];

  const EMPTY_COLLECTION = { type: 'FeatureCollection', features: [] };
  const WORLD_OCEAN = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[[-180, -89.9], [0, -89.9], [0, 89.9], [-180, 89.9], [-180, -89.9]]]
        }
      },
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, -89.9], [180, -89.9], [180, 89.9], [0, 89.9], [0, -89.9]]]
        }
      }
    ]
  };

  const GEOLOGIC_INTERVALS = [
    { older: 4567.3, younger: 4000, title: 'Hadean', summary: 'Earth formed, differentiated, cooled, and developed its earliest crust and oceans. Exact surface geography is not recoverable.' },
    { older: 4000, younger: 2500, title: 'Archean', summary: 'Early continental crust, oceans, microbial ecosystems, and a very different atmosphere shaped the young planet.' },
    { older: 2500, younger: 1600, title: 'Paleoproterozoic', summary: 'Atmospheric oxygen increased and continental blocks repeatedly assembled and separated.' },
    { older: 1600, younger: 1000, title: 'Mesoproterozoic', summary: 'Long-lived continental interiors, evolving eukaryotic life, and supercontinent cycles characterized this interval.' },
    { older: 1000, younger: 538.8, title: 'Neoproterozoic', summary: 'Rodinia broke apart, severe global glaciations occurred, and complex multicellular life diversified.' },
    { older: 538.8, younger: 485.4, title: 'Cambrian', summary: 'Marine animal diversity expanded dramatically while most complex ecosystems remained in the oceans.' },
    { older: 485.4, younger: 443.8, title: 'Ordovician', summary: 'Marine ecosystems diversified and the first simple land plants appeared before a major extinction.' },
    { older: 443.8, younger: 419.2, title: 'Silurian', summary: 'Vascular plants and terrestrial arthropods expanded across increasingly vegetated land surfaces.' },
    { older: 419.2, younger: 358.9, title: 'Devonian', summary: 'Forests, early tetrapods, and highly diverse fishes transformed continental and marine ecosystems.' },
    { older: 358.9, younger: 298.9, title: 'Carboniferous', summary: 'Extensive coal forests, high oxygen, and continental collision helped assemble Pangea.' },
    { older: 298.9, younger: 251.902, title: 'Permian', summary: 'Pangea dominated the planet before Earth’s most severe known mass extinction.' },
    { older: 251.902, younger: 201.4, title: 'Triassic', summary: 'Life recovered from the end-Permian extinction as the first dinosaurs and mammals appeared on Pangea.' },
    { older: 201.4, younger: 145, title: 'Jurassic', summary: 'Pangea split apart, warm climates prevailed, and dinosaurs dominated many terrestrial ecosystems.' },
    { older: 145, younger: 66, title: 'Cretaceous', summary: 'Continents continued separating, flowering plants diversified, and shallow seas covered broad regions.' },
    { older: 66, younger: 23.03, title: 'Paleogene', summary: 'Mammals and birds rapidly diversified after the end-Cretaceous extinction.' },
    { older: 23.03, younger: 2.58, title: 'Neogene', summary: 'Modern ecosystems, grasslands, mountain belts, and many familiar mammal groups expanded.' },
    { older: 2.58, younger: 0.0117, title: 'Pleistocene', summary: 'Repeated glacial cycles reshaped coastlines, habitats, and the evolution and dispersal of humans.' },
    { older: 0.0117, younger: 0, title: 'Holocene', summary: 'A relatively stable interglacial climate accompanied agriculture, cities, and accelerating human transformation.' },
    { older: 0, younger: -1, title: 'Present', summary: 'Observed Earth provides the calibration target for every reconstructed surface.' }
  ];

  const EARTH_MILESTONES = [
    { ageMa: 4567.3, title: 'Formation of Earth', short: 'The Solar System and Earth begin to form from the protoplanetary disk.', wikiTitle: 'Formation and evolution of the Solar System', sourceUrl: 'https://stratigraphy.org/chart/', confidence: 'Chronometric anchor', level: 'schematic' },
    { ageMa: 4510, title: 'Moon-forming era', short: 'A giant-impact scenario best explains the Moon’s origin, but the exact sequence remains modeled.', wikiTitle: 'Giant-impact hypothesis', sourceUrl: 'https://science.nasa.gov/moon/formation/', confidence: 'Model constrained', level: 'schematic' },
    { ageMa: 4400, title: 'Early crust and water', short: 'Ancient zircons indicate crust and liquid water may have existed surprisingly early.', wikiTitle: 'Hadean', sourceUrl: 'https://www.nature.com/articles/nature01897', confidence: 'Evidence constrained', level: 'schematic' },
    { ageMa: 3500, title: 'Early evidence of life', short: 'Microbial ecosystems were established by the Archean, although the earliest claims remain debated.', wikiTitle: 'Earliest known life forms', sourceUrl: 'https://astrobiology.nasa.gov/news/looking-for-luca-the-last-universal-common-ancestor/', confidence: 'Evidence constrained', level: 'schematic' },
    { ageMa: 2400, title: 'Great Oxidation Event', short: 'Atmospheric oxygen rose dramatically, transforming surface chemistry and biological possibilities.', wikiTitle: 'Great Oxidation Event', sourceUrl: 'https://astrobiology.nasa.gov/news/the-great-oxidation-event/', confidence: 'Evidence constrained', level: 'schematic' },
    { ageMa: 1800, title: 'Plate model confidence boundary', short: 'CAO2024 provides a global working plate reconstruction to this age. Older geography becomes explicitly schematic.', wikiTitle: 'Plate reconstruction', sourceUrl: 'https://gwsdoc.gplates.org/models/', confidence: 'Working hypothesis', level: 'model' },
    { ageMa: 1000, title: 'Rodinia', short: 'Continental blocks assembled into the supercontinent Rodinia, though longitude is increasingly uncertain this far back.', wikiTitle: 'Rodinia', sourceUrl: 'https://doi.org/10.1016/j.earscirev.2020.103477', confidence: 'Working hypothesis', level: 'model' },
    { ageMa: 720, title: 'Cryogenian glaciations', short: 'Severe glaciations may have covered much of the planet with ice during episodes often called Snowball Earth.', wikiTitle: 'Snowball Earth', sourceUrl: 'https://stratigraphy.org/chart/', confidence: 'Evidence constrained', level: 'model' },
    { ageMa: 538.8, title: 'Cambrian begins', short: 'The fossil record shows a major expansion in marine animal diversity and ecological complexity.', wikiTitle: 'Cambrian explosion', sourceUrl: 'https://stratigraphy.org/chart/', confidence: 'High temporal confidence', level: 'model' },
    { ageMa: 470, title: 'Plants colonize land', short: 'Early land plants began changing soils, weathering, and the carbon cycle.', wikiTitle: 'Evolutionary history of plants', sourceUrl: 'https://www.nhm.ac.uk/discover/news/2018/february/first-land-plants-arose-earlier-than-thought.html', confidence: 'Evidence constrained', level: 'model' },
    { ageMa: 335, title: 'Pangea assembles', short: 'Long-running continental collisions assembled most major landmasses into Pangea.', wikiTitle: 'Pangaea', sourceUrl: 'https://gwsdoc.gplates.org/models/', confidence: 'Model constrained', level: 'model' },
    { ageMa: 251.9, title: 'End-Permian extinction', short: 'Earth’s most severe known mass extinction reorganized life while Pangea remained assembled.', wikiTitle: 'Permian–Triassic extinction event', sourceUrl: 'https://stratigraphy.org/chart/', confidence: 'High temporal confidence', level: 'model' },
    { ageMa: 233, title: 'First dinosaurs', short: 'The earliest dinosaurs appear in the Late Triassic fossil record as ecosystems recovered and diversified.', wikiTitle: 'Evolution of dinosaurs', sourceUrl: 'https://paleobiodb.org/data1.2/', confidence: 'Fossil record', level: 'model' },
    { ageMa: 200, title: 'Pangea breaks apart', short: 'Rifting opened new ocean basins and began separating the continents toward their modern arrangement.', wikiTitle: 'Pangaea', sourceUrl: 'https://gwsdoc.gplates.org/models/', confidence: 'Model constrained', level: 'model' },
    { ageMa: 66, title: 'End-Cretaceous extinction', short: 'An asteroid impact and associated environmental disruption ended the age of non-avian dinosaurs.', wikiTitle: 'Cretaceous–Paleogene extinction event', sourceUrl: 'https://stratigraphy.org/chart/', confidence: 'High temporal confidence', level: 'model' },
    { ageMa: 2.58, title: 'Quaternary glaciations', short: 'Repeated ice ages drove large changes in sea level, climate, and habitat connectivity.', wikiTitle: 'Quaternary glaciation', sourceUrl: 'https://quaternary.stratigraphy.org/charts', confidence: 'High confidence', level: 'model' },
    { ageMa: 0.3, title: 'Homo sapiens', short: 'Our species appears in the African fossil record around 300,000 years ago.', wikiTitle: 'Homo sapiens', sourceUrl: 'https://humanorigins.si.edu/education/introduction-human-evolution', confidence: 'Fossil and genetic evidence', level: 'observed' },
    { ageMa: 0.021, title: 'Last Glacial Maximum', short: 'Large ice sheets lowered sea level and exposed broad continental shelves.', wikiTitle: 'Last Glacial Maximum', sourceUrl: 'https://pmip.lsce.ipsl.fr/', confidence: 'Model ensemble', level: 'observed' },
    { ageMa: 0.0117, title: 'Holocene begins', short: 'The current interglacial began as climate warmed and ice sheets retreated.', wikiTitle: 'Holocene', sourceUrl: 'https://stratigraphy.org/chart/', confidence: 'High temporal confidence', level: 'observed' },
    { ageMa: 0, title: 'Observed Earth', short: 'Modern measurements and remote sensing anchor the reconstruction system at the present.', wikiTitle: 'Earth', sourceUrl: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/', confidence: 'Observed', level: 'observed' }
  ];

  const HUMAN_MILESTONES = [
    { year: -300000, title: 'Early Homo sapiens', short: 'Fossils attributed to early Homo sapiens appear in Africa.', wikiTitle: 'Homo sapiens', sourceUrl: 'https://humanorigins.si.edu/education/introduction-human-evolution', confidence: 'Fossil evidence' },
    { year: -70000, title: 'Major human dispersals', short: 'Populations of modern humans expanded across and beyond Africa in multiple movements.', wikiTitle: 'Recent African origin of modern humans', sourceUrl: 'https://humanorigins.si.edu/evidence/human-evolution-interactive-timeline', confidence: 'Fossil and genetic evidence' },
    { year: -45000, title: 'Symbolic worlds expand', short: 'Art, personal ornament, complex tools, and regional traditions become increasingly visible archaeologically.', wikiTitle: 'Behavioral modernity', sourceUrl: 'https://humanorigins.si.edu/education/introduction-human-evolution', confidence: 'Archaeological evidence' },
    { year: -19000, title: 'Last Glacial Maximum', short: 'Ice sheets, lower sea level, and colder climates transformed migration routes and ecosystems.', wikiTitle: 'Last Glacial Maximum', sourceUrl: 'https://pmip.lsce.ipsl.fr/', confidence: 'Model ensemble' },
    { year: -10000, title: 'Agriculture and settlement', short: 'Independent experiments with cultivation and herding began reshaping landscapes and settlement patterns.', wikiTitle: 'Neolithic Revolution', sourceUrl: 'https://humanorigins.si.edu/human-characteristics/humans-change-world', confidence: 'Archaeological evidence' },
    { year: -3200, title: 'Cities and writing', short: 'Urban institutions and writing systems emerged in several regions over the following millennia.', wikiTitle: 'History of writing', sourceUrl: 'https://www.britishmuseum.org/collection/galleries/mesopotamia-6000-1500-bc', confidence: 'Archaeological and textual evidence' },
    { year: 117, title: 'Roman imperial maximum', short: 'The Roman Empire reached its greatest territorial extent under Trajan.', wikiTitle: 'Roman Empire', sourceUrl: 'https://en.wikipedia.org/wiki/Roman_Empire', confidence: 'Historical evidence' },
    { year: 1000, title: 'Connected medieval worlds', short: 'Trade, pilgrimage, scholarship, migration, and conquest connected dense regional networks across the globe.', wikiTitle: 'Middle Ages', sourceUrl: 'https://en.wikipedia.org/wiki/Middle_Ages', confidence: 'Historical evidence' },
    { year: 1492, title: 'Columbian Exchange', short: 'Sustained Atlantic contact triggered biological exchange, conquest, demographic collapse, and global integration.', wikiTitle: 'Columbian exchange', sourceUrl: 'https://en.wikipedia.org/wiki/Columbian_exchange', confidence: 'Historical evidence' },
    { year: 1760, title: 'Industrial acceleration', short: 'Fossil energy and mechanization began transforming production, cities, transport, and atmospheric chemistry.', wikiTitle: 'Industrial Revolution', sourceUrl: 'https://en.wikipedia.org/wiki/Industrial_Revolution', confidence: 'Historical evidence' },
    { year: 1969, title: 'Humans reach the Moon', short: 'Apollo 11 placed humans on another world and returned new observations of Earth from space.', wikiTitle: 'Apollo 11', sourceUrl: 'https://www.nasa.gov/mission/apollo-11/', confidence: 'Observed' },
    { year: 2026, title: 'Present day', short: 'Observed geography, climate, land use, and infrastructure provide the modern reference state.', wikiTitle: 'Earth', sourceUrl: 'https://science.nasa.gov/earth/', confidence: 'Observed' }
  ];

  const palette = {
    observed: { ocean: '#0b3a5a', land: '#6e8b52', edge: '#d8edc4', glow: '#64d2ff' },
    model: { ocean: '#102f46', land: '#9a8150', edge: '#f0d8a6', glow: '#ffb35c' },
    schematic: { ocean: '#281d2a', land: '#a35c3d', edge: '#ffc18b', glow: '#ff7b54' }
  };

  let mode = 'earth';
  let earthAgeMa = EARTH_DEFAULT_AGE_MA;
  let humanYear = HUMAN_DEFAULT_YEAR;
  let initialized = false;
  let timelineHud;
  let timelineSlider;
  let timelinePlay;
  let modeControl;
  let milestoneRail;
  let eraCard;
  let eraCardTitle;
  let eraCardSummary;
  let eraCardMeta;
  let eraExplore;
  let scaleStart;
  let scaleEnd;
  let fetchTimer = null;
  let fetchController = null;
  let tourTimer = null;
  let tourIndex = 0;
  const coastlineCache = new Map();

  function formatEarthAge(ageMa) {
    const age = Math.max(0, Number(ageMa));
    if (age === 0) return 'Present';
    if (age < 0.001) return `${Math.round(age * 1e6).toLocaleString()} years ago`;
    if (age < 1) return `${Number((age * 1000).toFixed(age < 0.1 ? 1 : 0)).toLocaleString()} ka`;
    if (age >= 1000) return `${Number((age / 1000).toFixed(age % 1000 === 0 ? 1 : 2))} Ga`;
    return `${Number(age.toFixed(age < 10 ? 2 : age < 100 ? 1 : 0))} Ma`;
  }

  function formatHumanYear(year) {
    if (Math.abs(year) > 100000) return `${Math.abs(year).toLocaleString()} years ago`;
    return formatYear(year);
  }

  function piecewiseToPosition(value, stops, descending = false) {
    const ordered = descending ? stops : [...stops].reverse();
    const clamped = Math.max(Math.min(value, Math.max(...stops)), Math.min(...stops));
    const segment = SLIDER_MAX / (ordered.length - 1);
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const start = ordered[index];
      const end = ordered[index + 1];
      const inside = start >= end
        ? clamped <= start && clamped >= end
        : clamped >= start && clamped <= end;
      if (!inside) continue;
      const ratio = (clamped - start) / (end - start || 1);
      return Math.round((index + ratio) * segment);
    }
    return clamped === ordered[0] ? 0 : SLIDER_MAX;
  }

  function positionToPiecewise(position, stops, descending = false) {
    const ordered = descending ? stops : [...stops].reverse();
    const bounded = Math.max(0, Math.min(SLIDER_MAX, Number(position)));
    const segment = SLIDER_MAX / (ordered.length - 1);
    const scaled = bounded / segment;
    const index = Math.min(ordered.length - 2, Math.floor(scaled));
    const ratio = scaled - index;
    return ordered[index] + ((ordered[index + 1] - ordered[index]) * ratio);
  }

  function earthAgeToPosition(ageMa) {
    return piecewiseToPosition(ageMa, EARTH_STOPS, true);
  }

  function positionToEarthAge(position) {
    return Math.max(0, positionToPiecewise(position, EARTH_STOPS, true));
  }

  function humanYearToPosition(year) {
    return piecewiseToPosition(year, HUMAN_STOPS, false);
  }

  function positionToHumanYear(position) {
    return Math.round(positionToPiecewise(position, HUMAN_STOPS, false));
  }

  function intervalForAge(ageMa) {
    return GEOLOGIC_INTERVALS.find((interval) => ageMa <= interval.older && ageMa > interval.younger)
      || GEOLOGIC_INTERVALS.at(-1);
  }

  function confidenceForAge(ageMa) {
    if (ageMa === 0) return { label: 'Observed', level: 'observed', resolution: 'Modern observations' };
    if (ageMa <= 410) return { label: 'Model constrained', level: 'model', resolution: ageMa <= 100 ? '0.5 Ma model step' : '1 Ma model step' };
    if (ageMa <= 1000) return { label: 'Working hypothesis', level: 'model', resolution: '5 Ma model step' };
    if (ageMa <= MAX_RECONSTRUCTION_AGE_MA) return { label: 'Deep-time hypothesis', level: 'model', resolution: '10 Ma model step' };
    return { label: 'Schematic', level: 'schematic', resolution: 'No defensible global coastline geometry' };
  }

  function nearestMilestone(items, value, accessor) {
    return items.reduce((best, item) => {
      const distance = Math.abs(accessor(item) - value);
      return !best || distance < best.distance ? { item, distance } : best;
    }, null)?.item;
  }

  function currentMilestone() {
    return mode === 'earth'
      ? nearestMilestone(EARTH_MILESTONES, earthAgeMa, (item) => item.ageMa)
      : nearestMilestone(HUMAN_MILESTONES, humanYear, (item) => item.year);
  }

  function createControls() {
    timelineHud = document.querySelector('#timelineHud');
    if (!timelineHud || document.querySelector('#timelineModeControl')) return false;

    const oldSlider = document.querySelector('#timelinePrimarySlider');
    const oldPlay = document.querySelector('#timelineHudPlay');
    if (!oldSlider || !oldPlay) return false;

    timelineSlider = oldSlider.cloneNode(true);
    oldSlider.replaceWith(timelineSlider);
    timelinePlay = oldPlay.cloneNode(true);
    oldPlay.replaceWith(timelinePlay);

    timelineHud.querySelector('.timeline-hud-header').insertAdjacentHTML('afterend', `
      <div id="timelineModeControl" class="timeline-mode-control" role="tablist" aria-label="Timeline scope">
        <button id="earthHistoryMode" type="button" role="tab" aria-selected="true">Earth History</button>
        <button id="humanHistoryMode" type="button" role="tab" aria-selected="false">Human History</button>
      </div>
    `);

    timelineHud.querySelector('.timeline-slider-wrap').insertAdjacentHTML('beforeend', '<div id="timelineMilestones" class="timeline-milestones" aria-label="Major timeline events"></div>');
    timelineHud.querySelector('.timeline-scale').insertAdjacentHTML('beforebegin', `
      <article id="timelineEraCard" class="timeline-era-card">
        <div class="timeline-era-card-copy">
          <p id="timelineEraMeta" class="timeline-era-meta"></p>
          <strong id="timelineEraTitle"></strong>
          <span id="timelineEraSummary"></span>
        </div>
        <button id="timelineEraExplore" type="button">Explore</button>
      </article>
    `);

    modeControl = document.querySelector('#timelineModeControl');
    milestoneRail = document.querySelector('#timelineMilestones');
    eraCard = document.querySelector('#timelineEraCard');
    eraCardTitle = document.querySelector('#timelineEraTitle');
    eraCardSummary = document.querySelector('#timelineEraSummary');
    eraCardMeta = document.querySelector('#timelineEraMeta');
    eraExplore = document.querySelector('#timelineEraExplore');
    scaleStart = timelineHud.querySelector('.timeline-scale span:first-child');
    scaleEnd = timelineHud.querySelector('.timeline-scale span:last-child');

    document.querySelector('#earthHistoryMode').addEventListener('click', () => setMode('earth', { source: 'segment' }));
    document.querySelector('#humanHistoryMode').addEventListener('click', () => setMode('human', { source: 'segment' }));
    timelineSlider.addEventListener('input', handleSliderInput);
    timelineSlider.addEventListener('change', handleSliderChange);
    timelinePlay.addEventListener('click', toggleTour);
    eraExplore.addEventListener('click', openCurrentMilestone);

    return true;
  }

  function renderMilestones() {
    const items = mode === 'earth' ? EARTH_MILESTONES : HUMAN_MILESTONES;
    milestoneRail.innerHTML = '';
    items.forEach((item, index) => {
      const value = mode === 'earth' ? item.ageMa : item.year;
      const position = mode === 'earth' ? earthAgeToPosition(value) : humanYearToPosition(value);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'timeline-milestone';
      button.style.left = `${(position / SLIDER_MAX) * 100}%`;
      button.setAttribute('aria-label', `${item.title}, ${mode === 'earth' ? formatEarthAge(value) : formatHumanYear(value)}`);
      button.dataset.index = String(index);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (mode === 'earth') setEarthAge(item.ageMa, { immediate: true, snap: false });
        else setHumanYear(item.year);
        openMilestone(item);
      });
      milestoneRail.appendChild(button);
    });
  }

  function handleSliderInput() {
    stopTour();
    if (mode === 'earth') {
      earthAgeMa = positionToEarthAge(timelineSlider.value);
      syncUi();
      scheduleCoastlineLoad();
    } else {
      setHumanYear(positionToHumanYear(timelineSlider.value), { fromSlider: true });
    }
  }

  function handleSliderChange() {
    if (mode !== 'earth') return;
    const currentPosition = earthAgeToPosition(earthAgeMa);
    const closest = EARTH_MILESTONES
      .map((item) => ({ item, distance: Math.abs(earthAgeToPosition(item.ageMa) - currentPosition) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (closest && closest.distance <= 14) setEarthAge(closest.item.ageMa, { immediate: true, snap: false });
  }

  function setMode(nextMode, { source = 'runtime' } = {}) {
    if (!['earth', 'human'].includes(nextMode)) return;
    if (mode === 'human') humanYear = selectedYear;
    mode = nextMode;
    localStorage.setItem('worldline:timeline-mode', mode);
    document.body.dataset.timelineMode = mode;

    document.querySelector('#earthHistoryMode')?.setAttribute('aria-selected', String(mode === 'earth'));
    document.querySelector('#humanHistoryMode')?.setAttribute('aria-selected', String(mode === 'human'));

    stopTour();
    renderMilestones();
    if (mode === 'earth') {
      hideHumanLayers();
      applyEarthSurface();
      scheduleCoastlineLoad(0);
    } else {
      hidePaleoLayers();
      restoreHumanLayers();
      setHumanYear(humanYear, { fromModeSwitch: true });
    }
    syncUi();

    window.dispatchEvent(new CustomEvent('worldline:timeline-mode', { detail: { mode, source } }));
  }

  function setHumanYear(year, options = {}) {
    humanYear = Math.max(-300000, Math.min(2026, Math.trunc(Number(year))));
    if (!Number.isFinite(humanYear)) return;
    setYear(humanYear, { fromSlider: Boolean(options.fromSlider) });
    if (mode === 'human') syncUi();
  }

  function setEarthAge(ageMa, { immediate = false, snap = true } = {}) {
    let next = Math.max(0, Math.min(4567.3, Number(ageMa)));
    if (!Number.isFinite(next)) return;
    if (snap) {
      const closest = nearestMilestone(EARTH_MILESTONES, next, (item) => item.ageMa);
      const positionDistance = Math.abs(earthAgeToPosition(closest.ageMa) - earthAgeToPosition(next));
      if (positionDistance <= 12) next = closest.ageMa;
    }
    earthAgeMa = next;
    syncUi();
    if (immediate) loadCoastlines();
    else scheduleCoastlineLoad();
  }

  function syncUi() {
    if (!timelineSlider) return;
    const isEarth = mode === 'earth';
    const position = isEarth ? earthAgeToPosition(earthAgeMa) : humanYearToPosition(humanYear);
    const interval = isEarth ? intervalForAge(earthAgeMa) : currentEra();
    const milestone = currentMilestone();
    const confidence = isEarth ? confidenceForAge(earthAgeMa) : { label: milestone?.confidence || 'Historical evidence', resolution: 'Variable by source' };
    const displayDate = isEarth ? formatEarthAge(earthAgeMa) : formatHumanYear(humanYear);

    timelineSlider.value = String(position);
    timelineSlider.style.setProperty('--timeline-progress', `${(position / SLIDER_MAX) * 100}%`);
    timelineSlider.setAttribute('aria-valuetext', displayDate);
    document.querySelector('#timelineHudValue').textContent = displayDate;
    document.querySelector('#timelineHudEra').textContent = interval.title || interval.label;
    dom.yearLabel.textContent = displayDate;
    dom.eraLabel.textContent = interval.title || interval.label;

    scaleStart.textContent = isEarth ? '4.567 Ga' : '300,000 years ago';
    scaleEnd.textContent = 'Present';
    eraCardMeta.textContent = `${confidence.label} · ${confidence.resolution}`;
    eraCardTitle.textContent = milestone?.title || interval.title || interval.label;
    eraCardSummary.textContent = milestone?.short || interval.summary;
    eraCard.dataset.confidence = isEarth ? confidence.level : 'human';
    dom.surfaceBadge.textContent = isEarth ? (earthAgeMa > MAX_RECONSTRUCTION_AGE_MA ? 'Schematic Earth' : 'Reconstructed Earth') : 'Reconstructed landscape';
    document.body.dataset.earthConfidence = isEarth ? confidence.level : 'human';
  }

  function openCurrentMilestone() {
    const milestone = currentMilestone();
    if (milestone) openMilestone(milestone);
  }

  function openMilestone(milestone) {
    if (typeof globalThis.openPlaceCard !== 'function') return;
    const date = mode === 'earth' ? formatEarthAge(milestone.ageMa) : formatHumanYear(milestone.year);
    const confidence = milestone.confidence || confidenceForAge(milestone.ageMa || 0).label;
    globalThis.openPlaceCard({
      name: milestone.title,
      eyebrow: mode === 'earth' ? 'Earth history milestone' : 'Human history milestone',
      subtitle: date,
      range: date,
      confidence,
      evidence: mode === 'earth' && (milestone.ageMa || 0) > MAX_RECONSTRUCTION_AGE_MA ? 'Curated schematic' : 'Reviewed scientific context',
      note: milestone.short,
      sourceUrl: milestone.sourceUrl,
      wikiTitle: milestone.wikiTitle,
      wikidata: '',
      coordinates: null
    });
  }

  function toggleTour() {
    if (tourTimer) {
      stopTour();
      return;
    }
    const items = mode === 'earth' ? EARTH_MILESTONES : HUMAN_MILESTONES;
    const current = mode === 'earth' ? earthAgeMa : humanYear;
    const accessor = mode === 'earth' ? (item) => item.ageMa : (item) => item.year;
    tourIndex = Math.max(0, items.findIndex((item) => Math.abs(accessor(item) - current) < 0.0001));
    timelinePlay.dataset.playing = 'true';
    timelinePlay.setAttribute('aria-label', 'Pause guided timeline');
    timelinePlay.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z"></path></svg>';

    const advance = () => {
      tourIndex = (tourIndex + 1) % items.length;
      const item = items[tourIndex];
      if (mode === 'earth') setEarthAge(item.ageMa, { immediate: true, snap: false });
      else setHumanYear(item.year);
    };
    advance();
    tourTimer = setInterval(advance, 3300);
  }

  function stopTour() {
    if (tourTimer) clearInterval(tourTimer);
    tourTimer = null;
    if (!timelinePlay) return;
    timelinePlay.dataset.playing = 'false';
    timelinePlay.setAttribute('aria-label', 'Play guided timeline');
    timelinePlay.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5 18 12 8 18.5V5.5Z"></path></svg>';
  }

  function installPaleoLayers() {
    if (!mapReady || map.getSource('paleo-coastlines')) return Boolean(map.getSource('paleo-coastlines'));
    map.addSource('paleo-ocean', { type: 'geojson', data: WORLD_OCEAN });
    map.addSource('paleo-coastlines', { type: 'geojson', data: EMPTY_COLLECTION });

    map.addLayer({
      id: 'paleo-ocean-fill',
      type: 'fill',
      source: 'paleo-ocean',
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#102f46', 'fill-opacity': 1 }
    });
    map.addLayer({
      id: 'paleo-land-shadow',
      type: 'line',
      source: 'paleo-coastlines',
      layout: { visibility: 'none' },
      paint: {
        'line-color': 'rgba(0,0,0,.55)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, 2.4, 5, 5.5],
        'line-blur': 2.5
      }
    });
    map.addLayer({
      id: 'paleo-land-fill',
      type: 'fill',
      source: 'paleo-coastlines',
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#9a8150', 'fill-opacity': 1 }
    });
    map.addLayer({
      id: 'paleo-coastline-line',
      type: 'line',
      source: 'paleo-coastlines',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#f0d8a6',
        'line-opacity': .92,
        'line-width': ['interpolate', ['linear'], ['zoom'], 0, .65, 5, 1.7, 9, 2.4]
      }
    });
    return true;
  }

  function setPaleoVisibility(visible) {
    ['paleo-ocean-fill', 'paleo-land-shadow', 'paleo-land-fill', 'paleo-coastline-line'].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    });
  }

  function hidePaleoLayers() {
    if (!mapReady) return;
    setPaleoVisibility(false);
    applySurfaceMode();
  }

  function humanLayerIds() {
    return [
      'curated-settlement-halo', 'curated-settlement-label', 'curated-settlement-hit',
      'wikidata-clusters', 'wikidata-cluster-count', 'wikidata-points', 'wikidata-labels', 'wikidata-hit',
      ...settlementLayerIds, ...buildingLayerIds
    ];
  }

  function hideHumanLayers() {
    if (!mapReady) return;
    setLayerGroupVisibility([...new Set(humanLayerIds())], false);
  }

  function restoreHumanLayers() {
    if (!mapReady) return;
    setLayerGroupVisibility(['curated-settlement-halo', 'curated-settlement-label', 'curated-settlement-hit'], dom.curatedToggle.checked);
    setLayerGroupVisibility(['wikidata-clusters', 'wikidata-cluster-count', 'wikidata-points', 'wikidata-labels', 'wikidata-hit'], dom.wikidataToggle.checked);
    setLayerGroupVisibility(settlementLayerIds, dom.ohmToggle.checked);
    setLayerGroupVisibility(buildingLayerIds, dom.buildingToggle.checked);
  }

  function paletteForAge(ageMa) {
    return palette[confidenceForAge(ageMa).level] || palette.model;
  }

  function applyEarthSurface() {
    if (!mapReady || !installPaleoLayers()) return;
    setPaleoVisibility(true);
    const colors = paletteForAge(earthAgeMa);
    map.setPaintProperty('paleo-ocean-fill', 'fill-color', colors.ocean);
    map.setPaintProperty('paleo-land-fill', 'fill-color', colors.land);
    map.setPaintProperty('paleo-coastline-line', 'line-color', colors.edge);
    map.setPaintProperty('background', 'background-color', '#000000');
    if (map.getLayer('satellite-imagery')) map.setPaintProperty('satellite-imagery', 'raster-opacity', 0);
    document.documentElement.style.setProperty('--earth-era-glow', colors.glow);
  }

  function scheduleCoastlineLoad(delay = 170) {
    clearTimeout(fetchTimer);
    fetchTimer = setTimeout(loadCoastlines, delay);
  }

  async function loadCoastlines() {
    if (mode !== 'earth' || !mapReady || !installPaleoLayers()) return;
    applyEarthSurface();
    const source = map.getSource('paleo-coastlines');
    if (!source) return;

    if (earthAgeMa > MAX_RECONSTRUCTION_AGE_MA) {
      source.setData(EMPTY_COLLECTION);
      setStatus('Schematic early Earth', 'warn');
      return;
    }

    const requested = Number(earthAgeMa.toFixed(3));
    const cacheKey = requested <= 100 ? (Math.round(requested * 2) / 2) : requested <= 540 ? Math.round(requested) : requested <= 1000 ? Math.round(requested / 5) * 5 : Math.round(requested / 10) * 10;
    if (coastlineCache.has(cacheKey)) {
      source.setData(coastlineCache.get(cacheKey));
      setStatus(`CAO2024 · ${formatEarthAge(cacheKey)}`, 'ready');
      return;
    }

    if (fetchController) fetchController.abort();
    fetchController = new AbortController();
    setStatus(`Reconstructing ${formatEarthAge(requested)}`);

    try {
      const response = await fetch(`/api/paleocoastlines?time=${encodeURIComponent(requested)}`, { signal: fetchController.signal });
      if (!response.ok) throw new Error(`Paleocoastline request returned ${response.status}`);
      const result = await response.json();
      const collection = result.collection || EMPTY_COLLECTION;
      coastlineCache.set(result.time ?? cacheKey, collection);
      source.setData(collection);
      setStatus(`${result.model || 'CAO2024'} · ${formatEarthAge(result.time ?? requested)}`, 'ready');
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.warn('Earth reconstruction unavailable:', error);
      source.setData(EMPTY_COLLECTION);
      setStatus('Plate model unavailable', 'warn');
    }
  }

  function extendHumanRange() {
    CONFIG.minYear = -300000;
    dom.timeSlider.min = '-300000';
    dom.yearInput.min = '-300000';
    if (!data.eras.some((era) => era.min === -300000)) {
      data.eras.unshift(
        { min: -300000, max: -100001, label: 'Early Homo sapiens', summary: 'The earliest part of this timeline follows fossil, genetic, environmental, and archaeological evidence rather than cities.' },
        { min: -100000, max: -15001, label: 'Human dispersal and cultural change', summary: 'Modern humans expanded across diverse environments while technologies, symbolic practices, and social networks changed.' }
      );
    }
  }

  function installSearchModeBridge() {
    document.addEventListener('click', (event) => {
      if (!event.target.closest?.('.search-suggestion')) return;
      const status = event.target.closest('.search-suggestion')?.querySelector('.search-suggestion-status')?.textContent || '';
      if (/settlement|historical|civilization|reconstruction/i.test(status)) setTimeout(() => setMode('human', { source: 'search' }), 0);
    }, true);
  }

  function initialize() {
    if (initialized) return true;
    if (!document.body || !globalThis.WorldlineUI || !window.__WORLDLINE_APPLE_CONTROLS_BUILD__) return false;
    if (!createControls()) return false;

    extendHumanRange();
    installSearchModeBridge();
    mode = localStorage.getItem('worldline:timeline-mode') === 'human' ? 'human' : 'earth';
    document.body.dataset.timelineMode = mode;
    renderMilestones();
    setMode(mode, { source: 'initial' });
    initialized = true;
    window.__WORLDLINE_EARTH_HISTORY_BUILD__ = BUILD;

    const mapTimer = setInterval(() => {
      if (!mapReady || !installPaleoLayers()) return;
      clearInterval(mapTimer);
      setSurfaceMode('reconstructed');
      setMode(mode, { source: 'map-ready' });
      if (mode === 'earth') map.flyTo({ center: [8, 8], zoom: 0.3, bearing: 0, pitch: 0, duration: 900, essential: true });
    }, 100);

    return true;
  }

  globalThis.WorldlineEarthHistory = Object.freeze({
    BUILD,
    getMode: () => mode,
    getEarthAgeMa: () => earthAgeMa,
    getHumanYear: () => humanYear,
    setMode,
    setEarthAge,
    setHumanYear,
    formatEarthAge,
    earthMilestones: Object.freeze(EARTH_MILESTONES.map((item) => ({ ...item }))),
    humanMilestones: Object.freeze(HUMAN_MILESTONES.map((item) => ({ ...item })))
  });

  const installer = setInterval(() => {
    if (initialize()) clearInterval(installer);
  }, 80);
})();
