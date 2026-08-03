(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r10';
  const SLIDER_MAX = 1000;
  const EARTH_STOPS = [4567.3, 4000, 2500, 1800, 1000, 541, 252, 66, 2.58, 0.3, 0.0117, 0];
  const HUMAN_STOPS = [-300000, -200000, -100000, -50000, -12000, -3000, 0, 1000, 1500, 1800, 1950, 2026];
  const ICS = 'https://stratigraphy.org/chart/';

  const INTERVALS = [
    { older: 4567.3, younger: 4000, title: 'Hadean', wikiTitle: 'Hadean', summary: 'Earth formed, differentiated, cooled, and developed early crust and oceans. Surface geography in this interval is schematic rather than mapped.' },
    { older: 4000, younger: 2500, title: 'Archean', wikiTitle: 'Archean', summary: 'Early continental crust, oceans, microbial ecosystems, and an oxygen-poor atmosphere shaped the young planet.' },
    { older: 2500, younger: 1600, title: 'Paleoproterozoic', wikiTitle: 'Paleoproterozoic', summary: 'Atmospheric oxygen increased while continental blocks repeatedly assembled, collided, and separated.' },
    { older: 1600, younger: 1000, title: 'Mesoproterozoic', wikiTitle: 'Mesoproterozoic', summary: 'Long-lived continental interiors and evolving eukaryotic ecosystems characterized much of this interval.' },
    { older: 1000, younger: 538.8, title: 'Neoproterozoic', wikiTitle: 'Neoproterozoic', summary: 'Rodinia broke apart, severe glaciations occurred, and complex multicellular life diversified.' },
    { older: 538.8, younger: 485.4, title: 'Cambrian', wikiTitle: 'Cambrian', summary: 'Marine animal diversity and ecological complexity expanded dramatically while life remained concentrated in the oceans.' },
    { older: 485.4, younger: 443.8, title: 'Ordovician', wikiTitle: 'Ordovician', summary: 'Marine ecosystems diversified and simple land plants appeared before a major extinction ended the period.' },
    { older: 443.8, younger: 419.2, title: 'Silurian', wikiTitle: 'Silurian', summary: 'Vascular plants and terrestrial arthropods expanded across increasingly inhabited land surfaces.' },
    { older: 419.2, younger: 358.9, title: 'Devonian', wikiTitle: 'Devonian', summary: 'Forests, early tetrapods, and highly diverse fishes transformed continental and marine ecosystems.' },
    { older: 358.9, younger: 298.9, title: 'Carboniferous', wikiTitle: 'Carboniferous', summary: 'Coal forests, high atmospheric oxygen, and continental collision accompanied the assembly of Pangea.' },
    { older: 298.9, younger: 251.902, title: 'Permian', wikiTitle: 'Permian', summary: 'Pangea dominated the planet before the most severe known mass extinction closed the period.' },
    { older: 251.902, younger: 201.4, title: 'Triassic', wikiTitle: 'Triassic', summary: 'Life recovered on Pangea as the first dinosaurs and mammals appeared and new ecosystems developed.' },
    { older: 201.4, younger: 145, title: 'Jurassic', wikiTitle: 'Jurassic', summary: 'Pangea separated into northern and southern landmasses while dinosaurs dominated many terrestrial ecosystems.' },
    { older: 145, younger: 66, title: 'Cretaceous', wikiTitle: 'Cretaceous', summary: 'Continents continued separating, flowering plants diversified, and shallow seas covered broad regions.' },
    { older: 66, younger: 23.03, title: 'Paleogene', wikiTitle: 'Paleogene', summary: 'Mammals and birds rapidly diversified after the end-Cretaceous extinction.' },
    { older: 23.03, younger: 2.58, title: 'Neogene', wikiTitle: 'Neogene', summary: 'Modern ecosystems, grasslands, mountain belts, and many familiar mammal groups expanded.' },
    { older: 2.58, younger: 0.0117, title: 'Pleistocene', wikiTitle: 'Pleistocene', summary: 'Repeated glacial cycles reshaped coastlines, habitats, and the evolution and dispersal of humans.' },
    { older: 0.0117, younger: 0, title: 'Holocene', wikiTitle: 'Holocene', summary: 'A relatively stable interglacial accompanied agriculture, cities, and accelerating human transformation.' },
    { older: 0, younger: -1, title: 'Present', wikiTitle: 'Earth', summary: 'Modern observation provides the calibration state for reconstructed Earth.' }
  ];

  const PANGEA_CONTEXT = {
    ageMa: 250,
    title: 'Pangea',
    wikiTitle: 'Pangaea',
    sourceUrl: 'https://gwsdoc.gplates.org/models/',
    confidence: 'Model constrained',
    short: 'Most major landmasses remained assembled in Pangea while Early Triassic ecosystems recovered from the end-Permian extinction.'
  };

  let lastSignature = '';
  let captureInstalled = false;
  let activeContext = null;

  function position(value, stops, descending) {
    const ordered = descending ? stops : [...stops].reverse();
    const segment = SLIDER_MAX / (ordered.length - 1);
    const bounded = Math.max(Math.min(value, Math.max(...stops)), Math.min(...stops));
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const start = ordered[index];
      const end = ordered[index + 1];
      const inside = start >= end
        ? bounded <= start && bounded >= end
        : bounded >= start && bounded <= end;
      if (!inside) continue;
      return (index + ((bounded - start) / (end - start || 1))) * segment;
    }
    return bounded === ordered[0] ? 0 : SLIDER_MAX;
  }

  function earthInterval(ageMa) {
    return INTERVALS.find((interval) => ageMa <= interval.older && ageMa > interval.younger) || INTERVALS.at(-1);
  }

  function nearMilestone(items, value, accessor, stops, descending) {
    const selectedPosition = position(value, stops, descending);
    const nearest = items
      .map((item) => ({ item, distance: Math.abs(position(accessor(item), stops, descending) - selectedPosition) }))
      .sort((left, right) => left.distance - right.distance)[0];
    return nearest?.distance <= 12 ? nearest.item : null;
  }

  function earthContext(engine) {
    const age = engine.getEarthAgeMa();
    if (Math.abs(age - 250) <= 0.6) return { ...PANGEA_CONTEXT, type: 'milestone' };
    const milestone = nearMilestone(engine.earthMilestones, age, (item) => item.ageMa, EARTH_STOPS, true);
    if (milestone) return { ...milestone, type: 'milestone' };
    const interval = earthInterval(age);
    return {
      type: 'interval',
      ageMa: age,
      title: interval.title,
      wikiTitle: interval.wikiTitle,
      sourceUrl: ICS,
      confidence: age > 1800 ? 'Schematic' : age > 1000 ? 'Deep-time hypothesis' : age > 410 ? 'Working hypothesis' : age === 0 ? 'Observed' : 'Model constrained',
      short: interval.summary
    };
  }

  function humanContext(engine) {
    const year = engine.getHumanYear();
    const milestone = nearMilestone(engine.humanMilestones, year, (item) => item.year, HUMAN_STOPS, false);
    if (milestone) return { ...milestone, type: 'milestone' };
    const era = typeof currentEra === 'function' ? currentEra() : { label: 'Human history', summary: 'Human history at the selected time.' };
    return {
      type: 'interval',
      year,
      title: era.label,
      wikiTitle: '',
      sourceUrl: 'https://humanorigins.si.edu/evidence/human-evolution-interactive-timeline',
      confidence: 'Variable by source',
      short: era.summary
    };
  }

  function formatContextDate(engine, context) {
    return engine.getMode() === 'earth'
      ? engine.formatEarthAge(context.ageMa ?? engine.getEarthAgeMa())
      : formatYear(context.year ?? engine.getHumanYear());
  }

  function updateCard() {
    const engine = globalThis.WorldlineEarthHistory;
    if (!engine) return false;
    activeContext = engine.getMode() === 'earth' ? earthContext(engine) : humanContext(engine);
    const date = formatContextDate(engine, activeContext);
    const signature = `${engine.getMode()}|${date}|${activeContext.title}`;
    if (signature === lastSignature) return true;
    lastSignature = signature;

    const title = document.querySelector('#timelineEraTitle');
    const summary = document.querySelector('#timelineEraSummary');
    if (title) title.textContent = activeContext.title;
    if (summary) summary.textContent = activeContext.short;
    return true;
  }

  function openActiveContext(event) {
    const engine = globalThis.WorldlineEarthHistory;
    if (!engine || !activeContext || typeof globalThis.openPlaceCard !== 'function') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const date = formatContextDate(engine, activeContext);
    globalThis.openPlaceCard({
      name: activeContext.title,
      eyebrow: activeContext.type === 'interval'
        ? (engine.getMode() === 'earth' ? 'Geological interval' : 'Human history interval')
        : (engine.getMode() === 'earth' ? 'Earth history milestone' : 'Human history milestone'),
      subtitle: date,
      range: date,
      confidence: activeContext.confidence || 'Reviewed context',
      evidence: activeContext.type === 'interval' ? 'Chronological context' : 'Reviewed scientific context',
      note: activeContext.short,
      sourceUrl: activeContext.sourceUrl || ICS,
      wikiTitle: activeContext.wikiTitle || '',
      wikidata: '',
      coordinates: null
    });
  }

  function install() {
    if (!updateCard()) return false;
    if (!captureInstalled) {
      const explore = document.querySelector('#timelineEraExplore');
      if (!explore) return false;
      explore.addEventListener('click', openActiveContext, true);
      captureInstalled = true;
    }
    return true;
  }

  const installer = setInterval(() => {
    if (!install()) return;
    clearInterval(installer);
    const observer = new MutationObserver(updateCard);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      childList: true,
      characterData: true,
      attributeFilter: ['data-timeline-mode']
    });
    window.addEventListener('worldline:timeline-mode', updateCard);
    window.__WORLDLINE_EARTH_CONTEXT_BUILD__ = BUILD;
  }, 80);
})();
