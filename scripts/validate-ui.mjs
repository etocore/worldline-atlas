import { readFile, access } from 'node:fs/promises';

const BUILD = '2026-08-03-globe-r13';
const requiredFiles = [
  'interaction-system.css',
  'interaction-system.js',
  'landmark-visibility.js',
  'apple-controls.css',
  'apple-controls-loader.js',
  'apple-controls.js',
  'ui-state.js',
  'ui-adapters.js',
  'search-index.js',
  'history-catalog.js',
  'history-engine.js',
  'history-engine.css',
  'r9-polish.css',
  'earth-history.css',
  'earth-history.js',
  'earth-era-context.js',
  'earth-ui-sync.css',
  'earth-ui-sync.js',
  'life-regions-r12.css',
  'r12-ui.js',
  'life-evidence.js',
  'netlify/functions/place-summary.js',
  'netlify/functions/paleocoastlines.js'
];

const requiredIds = [
  'sheetScrim',
  'placeSheet',
  'placeSheetHandle',
  'placeClose',
  'placeTitle',
  'placeSubtitle',
  'placeSummary',
  'placeEvidence',
  'placeSource',
  'placeExpand',
  'yearButton',
  'historySearch',
  'controlPanel'
];

const errors = [];

for (const path of requiredFiles) {
  try {
    await access(path);
  } catch {
    errors.push(`Missing required UI file: ${path}`);
  }
}

const [
  html,
  bootstrap,
  netlify,
  version,
  appleControls,
  appleLoader,
  uiState,
  uiAdapters,
  searchIndex,
  historyEngine,
  historyStyle,
  earthHistory,
  earthContext,
  earthSync,
  r12Ui,
  r12Style,
  lifeRuntime
] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('bootstrap.js', 'utf8'),
  readFile('netlify.toml', 'utf8'),
  readFile('version.json', 'utf8'),
  readFile('apple-controls.js', 'utf8'),
  readFile('apple-controls-loader.js', 'utf8'),
  readFile('ui-state.js', 'utf8'),
  readFile('ui-adapters.js', 'utf8'),
  readFile('search-index.js', 'utf8'),
  readFile('history-engine.js', 'utf8'),
  readFile('history-engine.css', 'utf8'),
  readFile('earth-history.js', 'utf8'),
  readFile('earth-era-context.js', 'utf8'),
  readFile('earth-ui-sync.js', 'utf8'),
  readFile('r12-ui.js', 'utf8'),
  readFile('life-regions-r12.css', 'utf8'),
  readFile('life-evidence.js', 'utf8')
]);

function requireText(source, text, message) {
  if (!source.includes(text)) errors.push(message);
}

for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) errors.push(`index.html is missing #${id}`);
}

for (const asset of ['interaction-system.css', 'interaction-system.js']) {
  if (!html.includes(asset)) errors.push(`index.html does not load ${asset}`);
}

for (const asset of [
  'landmark-visibility.js',
  'apple-controls.css',
  'apple-controls-loader.js',
  'ui-state.js',
  'ui-adapters.js',
  'search-index.js',
  'history-catalog.js',
  'history-engine.js',
  'history-engine.css',
  'r9-polish.css',
  'earth-history.css',
  'earth-history.js',
  'earth-era-context.js',
  'earth-ui-sync.css',
  'earth-ui-sync.js',
  'life-regions-r12.css',
  'r12-ui.js',
  'life-evidence.js'
]) {
  if (!bootstrap.includes(asset)) errors.push(`bootstrap.js does not load ${asset}`);
}

for (const dependency of ['__WORLDLINE_INTERACTION_BUILD__', '__WORLDLINE_UI_ADAPTERS_BUILD__', 'WorldlineUI', 'WorldlineSearch']) {
  if (!appleLoader.includes(dependency)) errors.push(`apple-controls-loader.js does not wait for ${dependency}`);
}
if (!appleLoader.includes('apple-controls.js')) errors.push('apple-controls-loader.js does not load apple-controls.js');

for (const runtimeId of ['timelineHud', 'timelinePrimarySlider', 'advancedControlsButton', 'searchSuggestions', 'searchCancel']) {
  if (!appleControls.includes(runtimeId)) errors.push(`apple-controls.js does not create #${runtimeId}`);
}
requireText(appleControls, "setAttribute('role', 'combobox')", 'Search is not configured as a combobox');

for (const surface of ['timeline', 'search', 'settings', 'place']) {
  if (!uiState.includes(`'${surface}'`)) errors.push(`ui-state.js does not define the ${surface} surface`);
}
for (const adapter of ["register('settings'", "register('place'"]) {
  if (!uiAdapters.includes(adapter)) errors.push(`ui-adapters.js is missing ${adapter}`);
}
for (const capability of ['SITE_ALIASES', 'PERIODS', 'TOPICS', 'parseYear', 'search(query']) {
  if (!searchIndex.includes(capability)) errors.push(`search-index.js is missing ${capability}`);
}
for (const capability of ['wrapSearch', 'openChapter', 'renderBriefing', 'WorldlineHistory']) {
  if (!historyEngine.includes(capability)) errors.push(`history-engine.js is missing ${capability}`);
}
for (const capability of ['timelineModeControl', 'timelineMilestones', 'WorldlineEarthHistory', 'paleo-coastlines']) {
  if (!earthHistory.includes(capability)) errors.push(`earth-history.js is missing ${capability}`);
}
for (const capability of ['PANGEA_CONTEXT', 'earthInterval', 'nearMilestone', 'openActiveContext']) {
  if (!earthContext.includes(capability)) errors.push(`earth-era-context.js is missing ${capability}`);
}
for (const capability of ['earthModelPanel', 'earthModelGeometry', 'earthModelConfidence', 'earthModelStep']) {
  if (!earthSync.includes(capability)) errors.push(`earth-ui-sync.js is missing ${capability}`);
}

requireText(r12Ui, "document.body.classList.add('worldline-r12')", 'The r12 visual system is not activated');
requireText(r12Ui, 'Search places, eras, or life', 'Search does not use the simplified r12 prompt');
requireText(r12Ui, 'Open advanced timeline controls', 'Advanced timeline controls are not progressively disclosed');
requireText(r12Style, '--wl-material', 'The unified r12 material tokens are missing');
requireText(r12Style, '.search-shell[data-detent="compact"] .sheet-handle', 'Compact search still exposes the settings handle');
requireText(r12Style, '.life-region-content', 'The regional life sheet is not styled');
requireText(lifeRuntime, 'Life in this area', 'The regional life detail experience is missing');
requireText(lifeRuntime, 'View fossil evidence', 'Raw fossil evidence is not progressively disclosed');
requireText(historyStyle, '.history-briefing', 'The researched chapter sheet is not styled');
requireText(historyStyle, '.history-source-disclosure', 'History sources are not progressively disclosed');

requireText(netlify, 'from = "/api/place-summary"', 'Netlify does not expose /api/place-summary');
requireText(netlify, 'from = "/api/paleocoastlines"', 'Netlify does not expose /api/paleocoastlines');
requireText(netlify, 'Cache-Control = "public, max-age=0, must-revalidate"', 'Static assets are not configured to revalidate when the shell keeps an older query marker');

let parsedVersion;
try {
  parsedVersion = JSON.parse(version);
} catch {
  errors.push('version.json is not valid JSON');
}
if (parsedVersion?.build !== BUILD) errors.push(`version.json build should be ${BUILD}, found ${parsedVersion?.build}`);
for (const source of [bootstrap, historyEngine]) {
  if (!source.includes(BUILD)) errors.push(`An r13 runtime is missing the ${BUILD} marker`);
}

if (errors.length) {
  console.error('UI validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Unified UI, regional life, researched history, search, timeline, and place-sheet wiring are valid.');
