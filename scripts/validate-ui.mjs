import { access, readFile } from 'node:fs/promises';

const failures = [];
const requiredFiles = [
  'mobile/base.css', 'mobile/sheets.css', 'mobile/quality.css', 'mobile/surfaces.css',
  'mobile/runtime.js', 'mobile/sheets.js', 'mobile/quality.js',
  'search/search.css', 'search/search.js', 'search/viewport.js',
  'landmark-visibility.js', 'ui-state.js', 'ui-adapters.js', 'search-index.js',
  'history-catalog.js', 'history-engine.js', 'history-engine.css', 'history-presence-r14.js',
  'history-presence-r14.css', 'research-foundation-r17.js', 'research-foundation-r17.css',
  'timeline/model.js', 'timeline/state.js', 'timeline/view.js', 'timeline/domain-controller.js',
  'timeline/history-sheet.js', 'timeline/timeline.css', 'timeline/launcher.css',
  'timeline/chapter.css', 'timeline/history-sheet.css',
  'earth-history.css', 'earth-history.js', 'life-regions-r12.css',
  'r12-ui.js', 'life-evidence.js'
];

for (const file of requiredFiles) {
  try { await access(file); } catch { failures.push(`Missing UI file: ${file}`); }
}
for (const file of ['earth-era-context.js', 'earth-ui-sync.css', 'earth-ui-sync.js']) {
  try {
    await access(file);
    failures.push(`Retired UI file remains present: ${file}`);
  } catch {}
}

let build = 'unknown';
try {
  const version = JSON.parse(await readFile('version.json', 'utf8'));
  build = version.build;
} catch {
  failures.push('version.json is not valid JSON');
}

const [bootstrap, index] = await Promise.all([
  readFile('bootstrap.js', 'utf8'),
  readFile('index.html', 'utf8')
]);
if (!bootstrap.includes(build)) failures.push(`bootstrap.js is missing the current build marker ${build}`);

const checks = [
  ['index.html', 'id="yearButton"', 'index.html is missing the time button'],
  ['index.html', 'id="historySearch"', 'index.html is missing search'],
  ['index.html', 'id="placeSheet"', 'index.html is missing the place and history detail sheet'],
  ['index.html', 'mobile/runtime.js', 'index.html does not load the canonical mobile runtime'],
  ['index.html', 'mobile/sheets.js', 'index.html does not load the canonical sheet controller'],
  ['bootstrap.js', "loadScript('timeline/model.js')", 'bootstrap.js does not load the canonical timeline model'],
  ['bootstrap.js', "loadScript('timeline/state.js')", 'bootstrap.js does not load canonical timeline state'],
  ['bootstrap.js', "loadScript('timeline/view.js')", 'bootstrap.js does not load the canonical timeline view'],
  ['bootstrap.js', "loadScript('timeline/domain-controller.js')", 'bootstrap.js does not load canonical timeline domain handling'],
  ['bootstrap.js', "loadScript('timeline/history-sheet.js')", 'bootstrap.js does not load canonical researched-history sheet handling'],
  ['bootstrap.js', "loadStyle('timeline/timeline.css')", 'bootstrap.js does not load canonical timeline styles'],
  ['bootstrap.js', "loadStyle('timeline/launcher.css')", 'bootstrap.js does not load the compact timeline launcher styles'],
  ['bootstrap.js', "loadStyle('timeline/chapter.css')", 'bootstrap.js does not load the compact chapter styles'],
  ['bootstrap.js', "loadStyle('timeline/history-sheet.css')", 'bootstrap.js does not load the researched-history disclosure styles'],
  ['bootstrap.js', "loadScript('mobile/quality.js')", 'bootstrap.js does not load canonical mobile quality'],
  ['bootstrap.js', "loadStyle('mobile/quality.css')", 'bootstrap.js does not load canonical mobile quality styles'],
  ['bootstrap.js', "loadScript('search/search.js')", 'bootstrap.js does not load canonical search'],
  ['bootstrap.js', "loadScript('search/viewport.js')", 'bootstrap.js does not load keyboard-safe search viewport handling'],
  ['bootstrap.js', "loadStyle('search/search.css')", 'bootstrap.js does not load canonical search styles'],
  ['ui-state.js', "'timeline'", 'ui-state.js does not define timeline surface'],
  ['timeline/state.js', 'WorldlineTimelineState', 'canonical timeline state API is missing'],
  ['timeline/view.js', "ui().register('timeline'", 'canonical timeline view does not register its UI surface'],
  ['timeline/domain-controller.js', 'timeline-domain-controller-ready', 'canonical domain controller readiness marker is missing'],
  ['timeline/history-sheet.js', 'WorldlineHistorySheet', 'canonical researched-history sheet API is missing'],
  ['search/search.js', "ui().register('search'", 'canonical search does not register its UI surface'],
  ['mobile/sheets.js', '__WORLDLINE_INTERACTION_BUILD__', 'canonical sheet controller readiness marker is missing'],
  ['mobile/quality.js', 'WorldlineIOSInterface', 'canonical mobile quality API is missing'],
  ['history-engine.js', 'WorldlineHistory', 'history engine API is missing'],
  ['research-foundation-r17.js', 'GLOBAL_LENSES', 'research runtime does not expose global lenses']
];

for (const [path, text, message] of checks) {
  const source = path === 'bootstrap.js' ? bootstrap : path === 'index.html' ? index : await readFile(path, 'utf8');
  if (!source.includes(text)) failures.push(message);
}

const retired = [
  'interaction-system', 'mobile-polish', 'mobile-search-snap-r15',
  'ios-interface-r21', 'interface-reduction-r22', 'apple-controls',
  'earth-era-context.js', 'earth-ui-sync.js', 'earth-ui-sync.css'
];
for (const token of retired) {
  if (bootstrap.includes(token) || index.includes(token)) failures.push(`Production still references retired UI asset ${token}`);
}

if (failures.length) {
  console.error('UI validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Canonical timeline, disclosures, mobile shell, search, settings, and place wiring are valid.');
