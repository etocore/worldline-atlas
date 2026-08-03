(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r17';
  const GLOBAL_LENSES = Object.freeze({
    'human-origins': [
      ['African population networks', [20, 4], 2.6, 'Fossil, genetic, and environmental evidence points to connected African populations rather than one simple origin point.'],
      ['Stone-tool landscapes', [30, 0], 2.7, 'Tool traditions and resource strategies varied across Africa long before cities or states.'],
      ['Climate corridors', [35, 15], 2.8, 'Shifting wet and dry phases affected movement through northeast Africa and southwest Asia.']
    ],
    'human-dispersal-symbols': [
      ['Sahul crossings', [132, -18], 3.0, 'People reached Ice Age Australia and New Guinea across maritime barriers.'],
      ['Eurasian contact zones', [55, 35], 2.5, 'Homo sapiens, Neanderthals, Denisovans, and other groups overlapped and interbred.'],
      ['Symbolic landscapes', [15, 42], 3.0, 'Art, ornaments, and specialized tools appear unevenly because preservation and research coverage differ.']
    ],
    'human-ice-farming': [
      ['Beringia and the Americas', [-135, 48], 2.3, 'Lower sea level and ice margins shaped possible routes into the Americas.'],
      ['Independent farming zones', [75, 22], 2.3, 'Cultivation and herding developed independently in multiple regions rather than spreading from one origin.'],
      ['River and wetland foodways', [105, 25], 3.0, 'Rice, millet, fishing, and wetland management followed different regional pathways.']
    ],
    'human-cities-bronze': [
      ['Nile and Red Sea worlds', [34, 24], 3.2, 'Riverine states, desert routes, and Red Sea exchange linked northeast Africa and southwest Asia.'],
      ['Indus urban system', [70, 27], 3.5, 'Large planned settlements developed without a deciphered political narrative.'],
      ['Andean urban traditions', [-77, -10], 3.0, 'Early Andean complexity developed outside Old World bronze networks.']
    ],
    'human-iron-classical': [
      ['Afro-Eurasian imperial systems', [55, 33], 2.2, 'Roads, sea routes, and frontier zones connected empires without making them culturally uniform.'],
      ['Mesoamerican urban societies', [-98, 18], 3.2, 'Large cities and regional systems developed independently in the Americas.'],
      ['Sub-Saharan networks', [20, 5], 2.7, 'Ironworking, settlement, and exchange histories vary widely by region and evidence.']
    ],
    'human-postclassical-medieval': [
      ['Indian Ocean exchange', [72, 1], 2.5, 'Monsoon routes connected East Africa, Arabia, India, Southeast Asia, and China.'],
      ['West African worlds', [-4, 15], 3.0, 'Gold, scholarship, Islam, and regional states linked Saharan and Sahelian networks.'],
      ['Pacific navigation', [170, -15], 2.2, 'Oceanic settlement histories require navigational and environmental evidence, not continental assumptions.']
    ],
    'human-mongol-oceanic': [
      ['Eurasian plague and empire', [70, 45], 2.3, 'Mongol routes and pandemic histories crossed political and ecological boundaries.'],
      ['Atlantic violence and exchange', [-35, 12], 2.4, 'Conquest, disease, crops, coerced labor, and Indigenous survival remade Atlantic worlds.'],
      ['Pacific silver route', [140, 14], 3.0, 'Manila linked American silver, Asian goods, and global commerce.']
    ],
    'human-industrial-imperial': [
      ['Plantation and slavery systems', [-45, 5], 2.5, 'Forced migration and extraction transformed Africa, the Americas, and Europe.'],
      ['Industrial energy regions', [5, 50], 2.8, 'Coal, factories, railways, and urbanization expanded unevenly.'],
      ['Colonial extraction zones', [80, 20], 2.5, 'Imperial power reorganized labor, environments, and political borders.']
    ],
    'human-modern': [
      ['Decolonization worlds', [45, 5], 2.0, 'New states, liberation movements, and inherited borders changed global politics.'],
      ['Cold War and non-alignment', [70, 25], 2.0, 'The Cold War was global, not just a North Atlantic rivalry.'],
      ['Planetary systems', [0, 10], 1.2, 'Climate, trade, migration, disease, and digital networks cross political borders.']
    ]
  });

  const SOURCE_BADGES = Object.freeze({
    earth: 'Model + evidence',
    human: 'Regional history'
  });

  function escapeMarkup(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function currentChapter() {
    return globalThis.WorldlineHistory?.current?.() || null;
  }

  function flyToLens(center, zoom) {
    if (!Array.isArray(center) || typeof map === 'undefined' || !globalThis.mapReady) return;
    globalThis.WorldlineUI?.close?.('place', { reason: 'research-lens-map' });
    setTimeout(() => map.flyTo({ center, zoom: zoom || 2.4, pitch: 18, bearing: 0, duration: 1250, essential: true }), 40);
  }

  function lensRows(chapter) {
    const authored = Array.isArray(chapter?.regions) ? chapter.regions.map((region) => [region.name, region.center, region.zoom, region.note]) : [];
    const added = GLOBAL_LENSES[chapter?.id] || [];
    const seen = new Set();
    return [...authored, ...added].filter((row) => {
      const key = String(row[0]).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  }

  function enhanceBriefing() {
    const briefing = document.querySelector('#historyBriefing');
    if (!briefing || briefing.dataset.foundationEnhanced === BUILD) return;
    const chapter = currentChapter();
    if (!chapter) return;
    briefing.dataset.foundationEnhanced = BUILD;

    const rows = lensRows(chapter);
    const section = document.createElement('section');
    section.className = 'history-section research-foundation-section';
    section.innerHTML = `
      <div class="research-foundation-header">
        <span>${escapeMarkup(chapter.timeline === 'earth' ? SOURCE_BADGES.earth : SOURCE_BADGES.human)}</span>
        <strong>Explore this globally</strong>
      </div>
      <p class="research-foundation-copy">These lenses keep the atlas from collapsing the selected time into a single region or civilization. They are navigation prompts, not complete coverage.</p>
      <div class="research-lens-list">
        ${rows.map((row, index) => `
          <button class="research-lens-card" type="button" data-research-lens="${index}">
            <span><strong>${escapeMarkup(row[0])}</strong><small>${escapeMarkup(row[3] || '')}</small></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"></path></svg>
          </button>
        `).join('')}
      </div>
    `;
    briefing.insertBefore(section, briefing.querySelector('.history-source-section') || null);
    section.querySelectorAll('[data-research-lens]').forEach((button) => {
      button.addEventListener('click', () => {
        const row = rows[Number(button.dataset.researchLens)];
        flyToLens(row?.[1], row?.[2]);
      });
    });
  }

  function syncPresenceCard() {
    const card = document.querySelector('#historyPresenceCard');
    const chapter = currentChapter();
    if (!card || !chapter) return;
    card.dataset.foundation = chapter.timeline;
    if (!card.querySelector('.research-presence-source')) {
      const badge = document.createElement('span');
      badge.className = 'research-presence-source';
      badge.textContent = chapter.timeline === 'earth' ? SOURCE_BADGES.earth : SOURCE_BADGES.human;
      card.querySelector('.history-presence-copy')?.appendChild(badge);
    } else {
      card.querySelector('.research-presence-source').textContent = chapter.timeline === 'earth' ? SOURCE_BADGES.earth : SOURCE_BADGES.human;
    }
  }

  function installGlobeGuards() {
    document.body.classList.add('worldline-r17');
    const hideDebug = () => {
      if (typeof map === 'undefined' || !globalThis.mapReady) return;
      ['plate-boundary-debug', 'tectonic-vector-debug', 'raw-fossil-points', 'numbered-life-clusters'].forEach((id) => {
        if (map.getLayer?.(id)) map.setLayoutProperty(id, 'visibility', 'none');
      });
    };
    setInterval(hideDebug, 500);
  }

  const timer = setInterval(() => {
    installGlobeGuards();
    syncPresenceCard();
    enhanceBriefing();
    if (globalThis.WorldlineHistory && globalThis.WorldlineEarthHistory) window.__WORLDLINE_RESEARCH_FOUNDATION_BUILD__ = BUILD;
  }, 220);

  window.addEventListener('worldline:timeline-mode', () => setTimeout(syncPresenceCard, 0));
})();
