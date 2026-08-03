import { readFile, access } from 'node:fs/promises';

const BUILD = '2026-08-03-globe-r11';
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
  'r9-polish.css',
  'earth-history.css',
  'earth-history.js',
  'earth-era-context.js',
  'earth-ui-sync.css',
  'earth-ui-sync.js',
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

async function requireFile(path) {
  try {
    await access(path);
  } catch {
    errors.push(`Missing required UI file: ${path}`);
  }
}

await Promise.all(requiredFiles.map(requireFile));

const [html, bootstrap, netlify, version, appleControls, appleLoader, uiState, uiAdapters, searchIndex, earthHistory, earthContext, earthSync] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('bootstrap.js', 'utf8'),
  readFile('netlify.toml', 'utf8'),
  readFile('version.json', 'utf8'),
  readFile('apple-controls.js', 'utf8'),
  readFile('apple-controls-loader.js', 'utf8'),
  readFile('ui-state.js', 'utf8'),
  readFile('ui-adapters.js', 'utf8'),
  readFile('search-index.js', 'utf8'),
  readFile('earth-history.js', 'utf8'),
  readFile('earth-era-context.js', 'utf8'),
  readFile('earth-ui-sync.js', 'utf8')
]);

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
  'r9-polish.css',
  'earth-history.css',
  'earth-history.js',
  'earth-era-context.js',
  'earth-ui-sync.css',
  'earth-ui-sync.js'
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

if (!appleControls.includes("setAttribute('role', 'combobox')")) {
  errors.push('apple-controls.js does not configure the search field as a combobox');
}

for (const surface of ['timeline', 'search', 'settings', 'place']) {
  if (!uiState.includes(`'${surface}'`)) errors.push(`ui-state.js does not define the ${surface} surface`);
}

for (const adapter of ["register('settings'", "register('place'"]) {
  if (!uiAdapters.includes(adapter)) errors.push(`ui-adapters.js is missing ${adapter}`);
}

for (const capability of ['SITE_ALIASES', 'PERIODS', 'TOPICS', 'parseYear', 'search(query']) {
  if (!searchIndex.includes(capability)) errors.push(`search-index.js is missing ${capability}`);
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

if (!netlify.includes('from = "/api/place-summary"')) {
  errors.push('netlify.toml does not expose /api/place-summary');
}
if (!netlify.includes('from = "/api/paleocoastlines"')) {
  errors.push('netlify.toml does not expose /api/paleocoastlines');
}

let parsedVersion;
try {
  parsedVersion = JSON.parse(version);
} catch {
  errors.push('version.json is not valid JSON');
}

if (parsedVersion && parsedVersion.build !== BUILD) {
  errors.push(`version.json build should be ${BUILD}, found ${parsedVersion.build}`);
}

if (!bootstrap.includes(BUILD)) errors.push(`bootstrap.js is missing the ${BUILD} marker`);
if (!html.includes('2026-08-03-globe-r11') || !html.includes('20260803r11')) {
  errors.push('index.html does not expose the r11 build and cache markers');
}

if (errors.length) {
  console.error('UI validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Unified UI, historical search, and Earth History wiring are valid.');
