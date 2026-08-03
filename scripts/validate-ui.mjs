import { readFile, access } from 'node:fs/promises';

const BUILD = '2026-08-03-globe-r9';
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
  'netlify/functions/place-summary.js'
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

const [html, bootstrap, netlify, version, appleControls, appleLoader, uiState, uiAdapters, searchIndex] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('bootstrap.js', 'utf8'),
  readFile('netlify.toml', 'utf8'),
  readFile('version.json', 'utf8'),
  readFile('apple-controls.js', 'utf8'),
  readFile('apple-controls-loader.js', 'utf8'),
  readFile('ui-state.js', 'utf8'),
  readFile('ui-adapters.js', 'utf8'),
  readFile('search-index.js', 'utf8')
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
  'r9-polish.css'
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

if (!netlify.includes('from = "/api/place-summary"')) {
  errors.push('netlify.toml does not expose /api/place-summary');
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

for (const source of [bootstrap, appleControls, appleLoader, uiState, uiAdapters, searchIndex]) {
  if (!source.includes(BUILD)) errors.push(`A runtime file does not contain the ${BUILD} marker`);
}

if (errors.length) {
  console.error('UI validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Unified UI and historical search wiring are valid.');
