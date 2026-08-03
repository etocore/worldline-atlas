(() => {
  'use strict';

  const BUILD = '2026-08-03-globe-r9';
  const SITE_ALIASES = {
    'Ain Ghazal': ["'Ain Ghazal", 'Ayn Ghazal'],
    Aksum: ['Axum', 'Kingdom of Aksum', 'Aksumite Empire'],
    Alexandria: ['Alexandria Egypt', 'Alexandria ad Aegyptum'],
    'Anyang - Yinxu': ['Anyang', 'Yinxu', 'Yin ruins', 'Shang capital'],
    Angkor: ['Angkor Thom', 'Khmer capital'],
    Bagan: ['Pagan', 'Pagan Kingdom'],
    Baghdad: ['Madinat al-Salam', 'Round City of Baghdad', 'Abbasid Baghdad'],
    Cahokia: ['Cahokia Mounds', 'Mississippian city'],
    Caral: ['Caral-Supe', 'Norte Chico'],
    'Chaco Canyon': ['Chaco Culture', 'Pueblo Bonito'],
    Constantinople: ['Byzantium', 'Istanbul', 'Nova Roma', 'New Rome', 'Byzantine Constantinople'],
    Cusco: ['Cuzco', 'Qosqo', 'Inca capital'],
    'Çatalhöyük': ['Catalhoyuk', 'Catal Huyuk', 'Chatal Huyuk'],
    Dholavira: ['Kotada timba', 'Indus Valley city'],
    'Göbekli Tepe': ['Gobekli Tepe', 'Potbelly Hill'],
    'Great Zimbabwe': ['Zimbabwe ruins', 'Kingdom of Zimbabwe'],
    Jericho: ['Tell es-Sultan', 'Ariha'],
    'Jenne-jeno': ['Djenne-Djenno', 'Djenné-Djenno', 'Jenne Jeno'],
    Kyoto: ['Heian-kyo', 'Heian-kyo', 'Heian capital'],
    'Lepenski Vir': ['Lepenski Vir culture'],
    "L'Anse aux Meadows": ['Lanse aux Meadows', 'Vinland settlement', 'Norse America'],
    'Machu Picchu': ['Machu Pikchu', 'Inca estate'],
    Mehrgarh: ['Mehr Garh'],
    'Mohenjo-daro': ['Mohenjo Daro', 'Mound of the Dead', 'Indus city'],
    'Monte Verde': ['Monte Verde Chile'],
    'Nabta Playa': ['Nabta'],
    'Nan Madol': ['Venice of the Pacific', 'Saudeleur capital'],
    Rome: ['Roma', 'Ancient Rome', 'Imperial Rome', 'Roman Rome', 'Urbs Roma'],
    'Sannai-Maruyama': ['Sannai Maruyama', 'Sannai-Maruyama Site'],
    'Skara Brae': ['Skerrabra'],
    Tenochtitlan: ['Mexico-Tenochtitlan', 'Mexico City', 'Aztec capital'],
    Teotihuacan: ['Teotihuacán', 'City of the Gods'],
    Timbuktu: ['Tombouctou', 'Timbuctoo'],
    Tiwanaku: ['Tiahuanaco', 'Tiahuanacu'],
    Uruk: ['Warka', 'Erech', 'Unug'],
    'Kilwa Kisiwani': ['Kilwa', 'Quiloa']
  };

  const PERIODS = [
    { title: 'Late Ice Age', aliases: ['Upper Paleolithic', 'Late Pleistocene'], targetYear: -12000, start: -15000, end: -10000, description: 'Late Ice Age occupation and mobility' },
    { title: 'Neolithic', aliases: ['New Stone Age', 'early farming'], targetYear: -7000, start: -10000, end: -3000, description: 'Early farming, sedentism, and village growth' },
    { title: 'Bronze Age', aliases: ['early Bronze Age', 'late Bronze Age'], targetYear: -2000, start: -3300, end: -1200, description: 'Bronze Age cities and states' },
    { title: 'Iron Age', aliases: ['early Iron Age'], targetYear: -700, start: -1200, end: -500, description: 'Iron Age settlements and regional states' },
    { title: 'Classical Antiquity', aliases: ['classical era', 'Greco-Roman world', 'ancient classical world'], targetYear: 200, start: -800, end: 500, description: 'Classical Mediterranean and connected urban systems' },
    { title: 'Late Antiquity', aliases: ['late Roman period'], targetYear: 500, start: 250, end: 750, description: 'Transformation of Roman, Persian, African, and Asian states' },
    { title: 'Early Middle Ages', aliases: ['early medieval', 'Dark Ages'], targetYear: 800, start: 500, end: 1000, description: 'Post-classical regional settlement networks' },
    { title: 'High Middle Ages', aliases: ['high medieval'], targetYear: 1200, start: 1000, end: 1300, description: 'Growing medieval cities and long-distance networks' },
    { title: 'Renaissance', aliases: ['European Renaissance'], targetYear: 1500, start: 1350, end: 1600, description: 'Late medieval and early modern urban change' },
    { title: 'Early Modern Period', aliases: ['early modern', 'age of exploration'], targetYear: 1650, start: 1500, end: 1750, description: 'Oceanic exchange, conquest, and expanding states' },
    { title: 'Industrial Revolution', aliases: ['industrial age', 'industrialization'], targetYear: 1800, start: 1750, end: 1900, description: 'Industrial urban acceleration' },
    { title: 'World War I', aliases: ['WWI', 'First World War', 'Great War'], targetYear: 1914, start: 1914, end: 1918, description: 'Global conflict from 1914 to 1918' },
    { title: 'World War II', aliases: ['WWII', 'Second World War'], targetYear: 1942, start: 1939, end: 1945, description: 'Global conflict from 1939 to 1945' },
    { title: 'Present Day', aliases: ['present', 'today', 'modern world', 'now'], targetYear: 2026, start: 2000, end: 2026, description: 'Current observed urban world' }
  ];

  const TOPICS = [
    { title: 'Roman Empire', aliases: ['Roman world', 'Imperial Roman Empire'], targetYear: 117, start: -27, end: 476, center: [15, 38], zoom: 3.25, wikipediaTitle: 'Roman Empire', description: 'Context view centered on the Roman world at its greatest territorial extent' },
    { title: 'Byzantine Empire', aliases: ['Eastern Roman Empire', 'Byzantium'], targetYear: 1000, start: 330, end: 1453, center: [29, 41], zoom: 3.7, wikipediaTitle: 'Byzantine Empire', description: 'Context view centered on Constantinople and the eastern Mediterranean' },
    { title: 'Ancient Egypt', aliases: ['Egyptian civilization', 'Pharaonic Egypt'], targetYear: -1300, start: -3100, end: -30, center: [31, 27], zoom: 4.1, wikipediaTitle: 'Ancient Egypt', description: 'Context view centered on the Nile Valley' },
    { title: 'Indus Valley Civilization', aliases: ['Harappan civilization', 'Indus civilization'], targetYear: -2500, start: -3300, end: -1300, center: [70, 27], zoom: 4.1, wikipediaTitle: 'Indus Valley Civilisation', description: 'Context view centered on major Indus settlements' },
    { title: 'Aztec Empire', aliases: ['Triple Alliance', 'Mexica Empire'], targetYear: 1500, start: 1428, end: 1521, center: [-99.13, 19.43], zoom: 6.2, wikipediaTitle: 'Aztec Empire', description: 'Context view centered on Tenochtitlan' },
    { title: 'Inca Empire', aliases: ['Tawantinsuyu', 'Inka Empire'], targetYear: 1500, start: 1438, end: 1533, center: [-71.97, -13.52], zoom: 5.3, wikipediaTitle: 'Inca Empire', description: 'Context view centered on Cusco and the central Andes' },
    { title: 'Abbasid Caliphate', aliases: ['Abbasid Empire'], targetYear: 800, start: 750, end: 1258, center: [44.36, 33.31], zoom: 4.1, wikipediaTitle: 'Abbasid Caliphate', description: 'Context view centered on Abbasid Baghdad' },
    { title: 'Khmer Empire', aliases: ['Angkor Empire'], targetYear: 1100, start: 802, end: 1431, center: [103.87, 13.41], zoom: 5.5, wikipediaTitle: 'Khmer Empire', description: 'Context view centered on Angkor' },
    { title: 'Mississippian Culture', aliases: ['Mississippian civilization'], targetYear: 1100, start: 800, end: 1600, center: [-90.06, 38.66], zoom: 5.1, wikipediaTitle: 'Mississippian culture', description: 'Context view centered on Cahokia and the central Mississippi Valley' },
    { title: 'Shang Dynasty', aliases: ['Shang China', 'Yin dynasty'], targetYear: -1200, start: -1600, end: -1046, center: [114.33, 36.13], zoom: 4.7, wikipediaTitle: 'Shang dynasty', description: 'Context view centered on the late Shang capital at Yinxu' }
  ];

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseYear(query) {
    const value = String(query || '').trim();
    const era = value.match(/(-?\d{1,5})\s*(BCE|BC|CE|AD)\b/i);
    if (era) {
      const magnitude = Math.abs(Number(era[1]));
      return /BCE|BC/i.test(era[2]) ? -magnitude : magnitude;
    }

    const century = value.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+century(?:\s+(BCE|BC|CE|AD))?\b/i);
    if (century) {
      const number = Number(century[1]);
      const midpoint = ((number - 1) * 100) + 50;
      return /BCE|BC/i.test(century[2] || '') ? -midpoint : midpoint;
    }

    const decade = value.match(/\b(\d{3,4})s\b/i);
    if (decade) return Number(decade[1]) + 5;

    if (/\b(present|today|now|modern day|present day)\b/i.test(value)) return 2026;

    const signed = value.match(/(?:^|\s)(-\d{1,5})(?:\s|$)/);
    if (signed) return Number(signed[1]);

    const bare = value.match(/^\s*(\d{1,4})\s*$/)
      || value.match(/\b(?:around|circa|about|in|during)\s+(\d{1,4})\b/i);
    return bare ? Number(bare[1]) : null;
  }

  function stripTemporalLanguage(query) {
    return normalize(String(query || '')
      .replace(/-?\d{1,5}\s*(BCE|BC|CE|AD)\b/ig, ' ')
      .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+century(?:\s+(BCE|BC|CE|AD))?\b/ig, ' ')
      .replace(/\b\d{3,4}s\b/ig, ' ')
      .replace(/(?:^|\s)-\d{1,5}(?:\s|$)/g, ' ')
      .replace(/\b(show|take|bring|find|search|tell|what|was|were|did|does|look|like|me|to|in|during|around|circa|about|at|the|a|an|map|year|history|historical|of|please)\b/ig, ' '));
  }

  function trigrams(value) {
    const padded = `  ${normalize(value)}  `;
    const grams = new Set();
    for (let index = 0; index < padded.length - 2; index += 1) grams.add(padded.slice(index, index + 3));
    return grams;
  }

  function similarity(left, right) {
    if (!left || !right) return 0;
    const a = trigrams(left);
    const b = trigrams(right);
    let overlap = 0;
    a.forEach((gram) => { if (b.has(gram)) overlap += 1; });
    const union = a.size + b.size - overlap;
    return union ? overlap / union : 0;
  }

  function textScore(term, title, aliases = [], keywords = []) {
    if (!term) return 0;
    const candidates = [title, ...aliases, ...keywords].map(normalize).filter(Boolean);
    let best = -1;
    candidates.forEach((candidate, index) => {
      let score = -1;
      if (candidate === term) score = index === 0 ? 180 : 168;
      else if (candidate.startsWith(term)) score = index === 0 ? 146 : 136;
      else if (candidate.split(' ').some((token) => token.startsWith(term))) score = 118;
      else if (candidate.includes(term)) score = 100;
      else if (term.includes(candidate) && candidate.length > 3) score = 88;
      else {
        const fuzzy = similarity(term, candidate);
        if (fuzzy >= 0.34) score = 45 + (fuzzy * 70);
      }
      best = Math.max(best, score);
    });
    return best;
  }

  function yearCompatibility(start, end, year) {
    if (year === null || year === undefined) return 0;
    if (year >= start && year <= end) return 28;
    const distance = Math.min(Math.abs(year - start), Math.abs(year - end));
    if (distance <= 25) return 10;
    if (distance <= 100) return 4;
    return -18;
  }

  function siteEntries() {
    return (globalThis.WORLDLINE_DATA?.settlements || []).map((site) => ({
      id: `site:${normalize(site.name).replace(/\s+/g, '-')}`,
      type: 'site',
      title: site.name,
      aliases: SITE_ALIASES[site.name] || [],
      keywords: [site.kind, site.evidence],
      start: Number(site.start),
      end: Number(site.end),
      coordinates: site.coordinates,
      source: site.source,
      site
    }));
  }

  function packageEntries() {
    if (typeof reconstructionPackageRegistry === 'undefined') return [];
    return reconstructionPackageRegistry.map((packageDef) => ({
      id: `package:${packageDef.id}`,
      type: 'package',
      title: packageDef.title,
      aliases: packageDef.aliases || [],
      keywords: ['reconstruction', 'reviewed package'],
      start: packageDef.validWindow.start,
      end: packageDef.validWindow.end,
      coordinates: packageDef.camera?.center,
      packageDef
    }));
  }

  function staticEntries() {
    return [
      ...PERIODS.map((period) => ({ id: `period:${normalize(period.title).replace(/\s+/g, '-')}`, type: 'period', ...period, keywords: ['period', 'era'] })),
      ...TOPICS.map((topic) => ({ id: `topic:${normalize(topic.title).replace(/\s+/g, '-')}`, type: 'topic', ...topic, keywords: ['civilization', 'empire', 'historical context'] }))
    ];
  }

  function reconstructionForSite(site, year) {
    if (typeof reconstructionPackageRegistry === 'undefined') return null;
    const siteTerms = [site.name, ...(SITE_ALIASES[site.name] || [])].map(normalize);
    return reconstructionPackageRegistry.find((packageDef) => {
      const aliasMatch = packageDef.aliases.some((alias) => siteTerms.includes(normalize(alias)) || siteTerms.some((term) => term.includes(normalize(alias))));
      const yearMatch = year === null || year === undefined || (year >= packageDef.validWindow.start && year <= packageDef.validWindow.end);
      return aliasMatch && yearMatch;
    }) || null;
  }

  function decorate(entry, requestedYear, score) {
    if (entry.type === 'site') {
      const reconstruction = reconstructionForSite(entry.site, requestedYear);
      return {
        ...entry,
        requestedYear,
        score,
        status: reconstruction ? 'Reconstruction available' : 'Reviewed place',
        reconstruction,
        subtitle: `${entry.site.kind} · ${formatRange(entry.start, entry.end)}`
      };
    }
    if (entry.type === 'package') return { ...entry, requestedYear, score, status: 'Reviewed reconstruction', subtitle: 'Reviewed reconstruction package' };
    if (entry.type === 'topic') return { ...entry, requestedYear, score, status: 'Context view', subtitle: `${entry.description} · ${formatRange(entry.start, entry.end)}` };
    return { ...entry, requestedYear, score, status: 'Historical period', subtitle: `${entry.description} · ${formatRange(entry.start, entry.end)}` };
  }

  function formatYearSimple(year) {
    if (typeof formatYear === 'function') return formatYear(year);
    if (year < 0) return `${Math.abs(year).toLocaleString()} BCE`;
    return `${year.toLocaleString()} CE`;
  }

  function formatRange(start, end) {
    const endLabel = end >= 2026 ? 'present' : formatYearSimple(end);
    return `${formatYearSimple(start)} to ${endLabel}`;
  }

  function search(query, { currentYear = 117, limit = 8 } = {}) {
    const requestedYear = parseYear(query);
    const term = stripTemporalLanguage(query);
    const entries = [...packageEntries(), ...siteEntries(), ...staticEntries()];
    const results = [];

    if (requestedYear !== null && requestedYear >= -15000 && requestedYear <= 2026) {
      results.push({
        id: `year:${requestedYear}`,
        type: 'year',
        title: formatYearSimple(requestedYear),
        subtitle: 'Jump to this point in the timeline',
        status: 'Exact date',
        year: requestedYear,
        requestedYear,
        score: term ? 135 : 220
      });
    }

    entries.forEach((entry) => {
      let score;
      if (!term) {
        if (entry.type !== 'site') return;
        score = yearCompatibility(entry.start, entry.end, requestedYear ?? currentYear) + (Number(entry.site.confidence || 0) * 40);
      } else {
        score = textScore(term, entry.title, entry.aliases, entry.keywords);
        if (score < 0) return;
        score += yearCompatibility(entry.start, entry.end, requestedYear);
        if (entry.type === 'package') score += 32;
        if (entry.type === 'site') score += Number(entry.site.confidence || 0) * 10;
      }
      results.push(decorate(entry, requestedYear, score));
    });

    const deduped = [];
    const seen = new Set();
    results
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .forEach((result) => {
        const key = result.type === 'package'
          ? `package:${result.packageDef.id}`
          : result.type === 'site' && result.reconstruction
            ? `package:${result.reconstruction.id}`
            : result.id;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(result);
      });

    return {
      query: String(query || ''),
      term,
      requestedYear,
      results: deduped.slice(0, Math.max(1, limit))
    };
  }

  globalThis.WorldlineSearch = Object.freeze({
    BUILD,
    normalize,
    parseYear,
    stripTemporalLanguage,
    search,
    aliases: Object.freeze({ ...SITE_ALIASES }),
    periods: Object.freeze(PERIODS.map((item) => ({ ...item }))),
    topics: Object.freeze(TOPICS.map((item) => ({ ...item })))
  });
})();