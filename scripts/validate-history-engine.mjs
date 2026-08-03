import { access, readFile } from 'node:fs/promises';
import vm from 'node:vm';

const BUILD = '2026-08-03-globe-r13';
const requiredFiles = [
  'history-catalog.js',
  'history-engine.js',
  'history-engine.css',
  'docs/HISTORY_RESEARCH_FRAMEWORK.md'
];
const failures = [];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    failures.push(`Missing history-engine file: ${file}`);
  }
}

const [catalogSource, engine, style, bootstrap, versionSource, framework] = await Promise.all([
  readFile('history-catalog.js', 'utf8'),
  readFile('history-engine.js', 'utf8'),
  readFile('history-engine.css', 'utf8'),
  readFile('bootstrap.js', 'utf8'),
  readFile('version.json', 'utf8'),
  readFile('docs/HISTORY_RESEARCH_FRAMEWORK.md', 'utf8')
]);

const context = { globalThis: {} };
try {
  vm.runInNewContext(catalogSource, context, { filename: 'history-catalog.js' });
} catch (error) {
  failures.push(`History catalog does not execute: ${error.message}`);
}

const catalog = context.globalThis.WORLDLINE_HISTORY_CATALOG;
if (!catalog) failures.push('History catalog did not expose WORLDLINE_HISTORY_CATALOG');

function requireText(source, text, message) {
  if (!source.includes(text)) failures.push(message);
}

if (catalog) {
  const chapters = Array.from(catalog.chapters || []);
  const earth = chapters.filter((chapter) => chapter.timeline === 'earth');
  const human = chapters.filter((chapter) => chapter.timeline === 'human');
  const moments = chapters.flatMap((chapter) => chapter.moments || []);
  const sourceIds = new Set(Object.keys(catalog.sources || {}));

  if (chapters.length < 19) failures.push(`History catalog needs at least 19 researched chapters, found ${chapters.length}`);
  if (earth.length < 10) failures.push(`Earth History needs at least 10 chapters, found ${earth.length}`);
  if (human.length < 9) failures.push(`Human History needs at least 9 chapters, found ${human.length}`);
  if (moments.length < 60) failures.push(`History catalog needs at least 60 turning points, found ${moments.length}`);
  if (!earth.some((chapter) => Number(chapter.olderMa) >= 4500)) failures.push('Earth History does not reach planetary formation');
  if (!earth.some((chapter) => Number(chapter.youngerMa) === 0)) failures.push('Earth History does not reach the present');
  if (!human.some((chapter) => Number(chapter.startYear) <= -300000)) failures.push('Human History does not begin at 300,000 years ago');
  if (!human.some((chapter) => Number(chapter.endYear) >= 2026)) failures.push('Human History does not reach the present');

  for (const chapter of chapters) {
    if (!chapter.id || !chapter.title || !chapter.dek || !chapter.overview) failures.push(`Incomplete chapter: ${chapter.id || chapter.title || 'unknown'}`);
    if (!Array.isArray(chapter.changes) || chapter.changes.length < 3) failures.push(`${chapter.id} needs at least three defining changes`);
    if (!Array.isArray(chapter.moments) || chapter.moments.length < 3) failures.push(`${chapter.id} needs at least three key moments`);
    if (!Array.isArray(chapter.sourceIds) || chapter.sourceIds.length < 1) failures.push(`${chapter.id} has no source provenance`);
    for (const sourceId of chapter.sourceIds || []) {
      if (!sourceIds.has(sourceId)) failures.push(`${chapter.id} references missing source ${sourceId}`);
    }
    if (chapter.timeline === 'human' && (!Array.isArray(chapter.regions) || chapter.regions.length < 1)) {
      failures.push(`${chapter.id} needs at least one geographic lens`);
    }
  }

  for (const [id, source] of Object.entries(catalog.sources || {})) {
    if (!source.label || !source.url || !source.role) failures.push(`Source ${id} is incomplete`);
    if (/wikipedia\.org/i.test(source.url)) failures.push(`Wikipedia cannot be a catalog authority source: ${id}`);
  }
}

requireText(catalogSource, "BUILD = '2026-08-03-globe-r13'", 'History catalog build marker is missing');
requireText(catalogSource, 'International Commission on Stratigraphy', 'ICS is missing from the source registry');
requireText(catalogSource, 'Smithsonian Human Origins Program', 'Smithsonian Human Origins is missing from the source registry');
requireText(catalogSource, 'PeriodO', 'PeriodO is missing from the source registry');
requireText(catalogSource, 'Pleiades', 'Pleiades is missing from the source registry');
requireText(catalogSource, 'UNESCO Silk Roads Programme', 'UNESCO Silk Roads is missing from the source registry');

requireText(engine, 'wrapSearch', 'History search integration is missing');
requireText(engine, 'openChapter', 'History chapter opening is missing');
requireText(engine, 'renderChanges', 'What changed section is missing');
requireText(engine, 'renderMoments', 'Key moments section is missing');
requireText(engine, 'renderRegions', 'Geographic lenses are missing');
requireText(engine, 'renderSources', 'Source disclosure is missing');
requireText(engine, 'interceptTimelineExplore', 'Timeline chapter interception is missing');
requireText(engine, 'Researched Earth History chapter', 'Earth History search status is missing');
requireText(engine, 'Researched Human History chapter', 'Human History search status is missing');
requireText(engine, 'WorldlineHistory', 'History runtime API is missing');

requireText(style, '.history-briefing', 'History briefing style is missing');
requireText(style, '.history-inset-list', 'Grouped inset-list styling is missing');
requireText(style, '.history-moment-row', 'Key moment row styling is missing');
requireText(style, '.history-region-card', 'Geographic lens styling is missing');
requireText(style, '.history-source-disclosure', 'Progressive source disclosure styling is missing');
requireText(style, 'cubic-bezier(.32,.72,0,1)', 'The shared sheet motion curve is missing');

requireText(bootstrap, "loadScript('history-catalog.js')", 'Bootstrap does not load the history catalog');
requireText(bootstrap, "loadScript('history-engine.js')", 'Bootstrap does not load the history engine');
requireText(bootstrap, "loadStyle('history-engine.css')", 'Bootstrap does not load history styles');
if (bootstrap.indexOf("loadScript('history-engine.js')") > bootstrap.indexOf("loadScript('apple-controls-loader.js')")) {
  failures.push('History search must initialize before Apple controls');
}

requireText(framework, 'Avoid presenting European labels', 'The global-history periodization rule is missing');
requireText(framework, 'Wikipedia may supply a readable introductory synopsis', 'The Wikipedia evidence boundary is missing');
requireText(framework, 'Versioning', 'History catalog versioning policy is missing');

let version;
try {
  version = JSON.parse(versionSource);
} catch {
  failures.push('version.json is not valid JSON');
}
if (version?.build !== BUILD) failures.push(`version.json should be ${BUILD}`);

for (const runtime of [catalogSource, engine, bootstrap]) {
  if (!runtime.includes(BUILD)) failures.push(`A history production runtime is missing ${BUILD}`);
}

if (failures.length) {
  console.error('History-engine validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Researched Earth and human chronology, source provenance, search, and chapter UI are valid.');
