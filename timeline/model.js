(() => {
  'use strict';

  const BUILD = '2026-08-04-globe-r28';
  const SLIDER_MAX = 1000;
  const EARTH_STOPS = Object.freeze([4567.3, 4000, 2500, 1800, 1000, 538.8, 251.902, 66, 2.58, 0.3, 0.0117, 0]);
  const HUMAN_STOPS = Object.freeze([-300000, -200000, -100000, -70000, -12000, -3000, 0, 500, 1000, 1500, 1800, 1950, 2026]);

  const EARTH_TREE = Object.freeze([
    { id: 'hadean', label: 'Hadean', older: 4567.3, younger: 4000 },
    { id: 'archean', label: 'Archean', older: 4000, younger: 2500 },
    {
      id: 'proterozoic', label: 'Proterozoic', older: 2500, younger: 538.8,
      children: Object.freeze([
        { id: 'paleoproterozoic', label: 'Paleoproterozoic', older: 2500, younger: 1600 },
        { id: 'mesoproterozoic', label: 'Mesoproterozoic', older: 1600, younger: 1000 },
        { id: 'neoproterozoic', label: 'Neoproterozoic', older: 1000, younger: 538.8 }
      ])
    },
    {
      id: 'phanerozoic', label: 'Phanerozoic', older: 538.8, younger: 0,
      children: Object.freeze([
        {
          id: 'paleozoic', label: 'Paleozoic', older: 538.8, younger: 251.902,
          children: Object.freeze([
            { id: 'cambrian', label: 'Cambrian', older: 538.8, younger: 485.4 },
            { id: 'ordovician', label: 'Ordovician', older: 485.4, younger: 443.8 },
            { id: 'silurian', label: 'Silurian', older: 443.8, younger: 419.2 },
            { id: 'devonian', label: 'Devonian', older: 419.2, younger: 358.9 },
            { id: 'carboniferous', label: 'Carboniferous', older: 358.9, younger: 298.9 },
            { id: 'permian', label: 'Permian', older: 298.9, younger: 251.902 }
          ])
        },
        {
          id: 'mesozoic', label: 'Mesozoic', older: 251.902, younger: 66,
          children: Object.freeze([
            { id: 'triassic', label: 'Triassic', older: 251.902, younger: 201.4 },
            { id: 'jurassic', label: 'Jurassic', older: 201.4, younger: 145 },
            { id: 'cretaceous', label: 'Cretaceous', older: 145, younger: 66 }
          ])
        },
        {
          id: 'cenozoic', label: 'Cenozoic', older: 66, younger: 0,
          children: Object.freeze([
            { id: 'paleogene', label: 'Paleogene', older: 66, younger: 23.03 },
            { id: 'neogene', label: 'Neogene', older: 23.03, younger: 2.58 },
            { id: 'quaternary', label: 'Quaternary', older: 2.58, younger: 0 }
          ])
        }
      ])
    }
  ]);

  const EARTH_INTERVALS = Object.freeze([
    ['hadean', 'Hadean', 4567.3, 4000], ['archean', 'Archean', 4000, 2500],
    ['paleoproterozoic', 'Paleoproterozoic', 2500, 1600], ['mesoproterozoic', 'Mesoproterozoic', 1600, 1000],
    ['neoproterozoic', 'Neoproterozoic', 1000, 538.8], ['cambrian', 'Cambrian', 538.8, 485.4],
    ['ordovician', 'Ordovician', 485.4, 443.8], ['silurian', 'Silurian', 443.8, 419.2],
    ['devonian', 'Devonian', 419.2, 358.9], ['carboniferous', 'Carboniferous', 358.9, 298.9],
    ['permian', 'Permian', 298.9, 251.902], ['triassic', 'Triassic', 251.902, 201.4],
    ['jurassic', 'Jurassic', 201.4, 145], ['cretaceous', 'Cretaceous', 145, 66],
    ['paleogene', 'Paleogene', 66, 23.03], ['neogene', 'Neogene', 23.03, 2.58],
    ['quaternary', 'Quaternary', 2.58, 0]
  ].map(([id, label, older, younger]) => Object.freeze({ id, label, older, younger })));

  const HUMAN_INTERVALS = Object.freeze([
    ['origins', 'Origins', -300000, -70000], ['dispersal', 'Dispersal', -70000, -12000],
    ['settlement', 'Settlement', -12000, -3000], ['ancient', 'Ancient worlds', -3000, 500],
    ['medieval', 'Medieval worlds', 500, 1500], ['early-modern', 'Early modern', 1500, 1800],
    ['industrial', 'Industrial to present', 1800, 2026]
  ].map(([id, label, start, end]) => Object.freeze({ id, label, start, end })));

  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value)));
  const contains = (interval, value, domain) => domain === 'human'
    ? value >= interval.start && value <= interval.end
    : value <= interval.older && value >= interval.younger;

  function trim(value, digits) {
    return Number(Number(value).toFixed(digits)).toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function formatEarth(value, style = 'full') {
    const age = Number(value);
    if (!Number.isFinite(age)) return 'Earth history';
    if (age <= 0.0005) return style === 'compact' ? 'Present' : 'Present day';
    if (style === 'compact') {
      if (age >= 1000) {
        const billions = age / 1000;
        return `${Number.isInteger(billions) ? billions : trim(billions, billions < 2 ? 2 : 1)} Ga`;
      }
      if (age >= 1) return `${Number.isInteger(age) ? age : trim(age, age < 10 ? 2 : 1)} Ma`;
      const thousands = age * 1000;
      if (thousands >= 1) return `${Number.isInteger(thousands) ? thousands : trim(thousands, 1)} ka`;
      return `${Math.max(1, Math.round(age * 1_000_000)).toLocaleString()} years`;
    }
    if (age >= 1000) {
      const billions = age / 1000;
      return `${Number.isInteger(billions) ? billions : trim(billions, billions < 10 ? 2 : 1)} billion years ago`;
    }
    if (age >= 1) return `${Number.isInteger(age) ? age : trim(age, age < 10 ? 2 : 1)} million years ago`;
    const years = Math.max(1, Math.round(age * 1_000_000));
    return years >= 1000
      ? `${Math.round(years / 1000).toLocaleString()} thousand years ago`
      : `${years.toLocaleString()} years ago`;
  }

  function formatHuman(value, style = 'full') {
    const year = Math.round(Number(value));
    if (!Number.isFinite(year)) return 'Human history';
    if (year >= 2026) return style === 'compact' ? 'Present' : 'Present day';
    if (year < -10000) return `${Math.abs(year).toLocaleString()} years ago`;
    if (year < 0) return `${Math.abs(year).toLocaleString()} BCE`;
    return `${year.toLocaleString()} CE`;
  }

  function formatTime(value, { domain = 'earth', style = 'full' } = {}) {
    return domain === 'human' ? formatHuman(value, style) : formatEarth(value, style);
  }

  function positionInStops(value, stops, descending) {
    const bounded = descending ? clamp(value, stops.at(-1), stops[0]) : clamp(value, stops[0], stops.at(-1));
    const segment = SLIDER_MAX / (stops.length - 1);
    for (let index = 0; index < stops.length - 1; index += 1) {
      const start = stops[index];
      const end = stops[index + 1];
      const inside = descending ? bounded <= start && bounded >= end : bounded >= start && bounded <= end;
      if (!inside) continue;
      const ratio = descending ? (start - bounded) / (start - end || 1) : (bounded - start) / (end - start || 1);
      return Math.round((index + ratio) * segment);
    }
    return descending ? (bounded >= stops[0] ? 0 : SLIDER_MAX) : (bounded <= stops[0] ? 0 : SLIDER_MAX);
  }

  function valueFromStops(position, stops, descending) {
    const bounded = clamp(position, 0, SLIDER_MAX);
    const segment = SLIDER_MAX / (stops.length - 1);
    const scaled = bounded / segment;
    const index = Math.min(stops.length - 2, Math.max(0, Math.floor(scaled)));
    const ratio = scaled - index;
    const start = stops[index];
    const end = stops[index + 1];
    return descending ? start - ((start - end) * ratio) : start + ((end - start) * ratio);
  }

  function earthContext(ageMa) {
    const age = clamp(ageMa, 0, 4567.3);
    const eon = EARTH_TREE.find((item) => contains(item, age, 'earth')) || EARTH_TREE.at(-1);
    const era = eon.children?.find((item) => contains(item, age, 'earth')) || null;
    const period = era?.children?.find((item) => contains(item, age, 'earth')) || null;
    return { domain: 'earth', age, eon, era, period, leaf: period || era || eon };
  }

  function humanContext(year) {
    const value = Math.round(clamp(year, -300000, 2026));
    const chapter = HUMAN_INTERVALS.find((item) => contains(item, value, 'human')) || HUMAN_INTERVALS.at(-1);
    return { domain: 'human', year: value, chapter, leaf: chapter };
  }

  function context(domain, value) {
    return domain === 'human' ? humanContext(value) : earthContext(value);
  }

  function localPosition(value, interval, domain) {
    const start = domain === 'human' ? interval.start : interval.older;
    const end = domain === 'human' ? interval.end : interval.younger;
    const span = Math.abs(end - start) || 1;
    const ratio = domain === 'human' ? (value - start) / span : (start - value) / span;
    return Math.round(clamp(ratio, 0, 1) * SLIDER_MAX);
  }

  function localValue(position, interval, domain) {
    const ratio = clamp(position, 0, SLIDER_MAX) / SLIDER_MAX;
    if (domain === 'human') return Math.round(interval.start + ((interval.end - interval.start) * ratio));
    return interval.older - ((interval.older - interval.younger) * ratio);
  }

  globalThis.WorldlineTimelineModel = Object.freeze({
    BUILD, SLIDER_MAX, EARTH_STOPS, HUMAN_STOPS, EARTH_TREE, EARTH_INTERVALS, HUMAN_INTERVALS,
    clamp, contains, context, localPosition, localValue, formatTime,
    ageMaToPosition: (value) => positionInStops(value, EARTH_STOPS, true),
    positionToAgeMa: (position) => valueFromStops(position, EARTH_STOPS, true),
    yearToPosition: (value) => positionInStops(value, HUMAN_STOPS, false),
    positionToYear: (position) => Math.round(valueFromStops(position, HUMAN_STOPS, false))
  });
})();
