import { access, readFile } from 'node:fs/promises';

const failures = [];
const required = [
  'mobile/runtime.js', 'mobile/sheets.js', 'mobile/quality.js',
  'mobile/base.css', 'mobile/sheets.css', 'mobile/quality.css', 'mobile/surfaces.css',
  'search/search.js', 'search/viewport.js', 'search/search.css',
  'timeline/model.js', 'timeline/state.js', 'timeline/view.js', 'timeline/timeline.css',
  'docs/IOS_INTERFACE_STANDARD.md', 'bootstrap.js', 'index.html', 'version.json'
];
for (const file of required) {
  try { await access(file); } catch { failures.push(`Missing canonical interface file: ${file}`); }
}

const sources = Object.fromEntries(await Promise.all(required.map(async (file) => [file, await readFile(file, 'utf8')])));
let version;
try { version = JSON.parse(sources['version.json']); } catch { failures.push('version.json is not valid JSON'); }

const requireText = (file, token, message) => {
  if (!sources[file].includes(token)) failures.push(message);
};
const prohibitText = (file, token, message) => {
  if (sources[file].includes(token)) failures.push(message);
};

const build = version?.build || '';
if (build !== '2026-08-04-globe-r29') failures.push('The canonical mobile architecture must use the r29 build');
if (!sources['bootstrap.js'].includes(build)) failures.push('Bootstrap and version.json builds do not match');

for (const [file, token] of [
  ['index.html', 'mobile/runtime.js'], ['index.html', 'mobile/sheets.js'],
  ['index.html', 'mobile/base.css'], ['index.html', 'mobile/sheets.css'],
  ['bootstrap.js', "loadScript('mobile/quality.js')"], ['bootstrap.js', "loadStyle('mobile/quality.css')"],
  ['bootstrap.js', "loadStyle('mobile/surfaces.css')"], ['bootstrap.js', "loadScript('search/search.js')"],
  ['bootstrap.js', "loadScript('search/viewport.js')"], ['bootstrap.js', "loadStyle('search/search.css')"],
  ['bootstrap.js', "loadScript('timeline/view.js')"], ['bootstrap.js', "loadStyle('timeline/timeline.css')"]
]) requireText(file, token, `${file} does not load ${token}`);

for (const token of ['function bindPlaceDrag()', 'function bindControlHandleDrag()', '__WORLDLINE_INTERACTION_BUILD__']) {
  requireText('mobile/sheets.js', token, `The canonical sheet controller is missing ${token}`);
}
for (const token of ['.place-sheet-handle', '.place-sheet-scroll', '--sheet-ease']) {
  requireText('mobile/sheets.css', token, `The canonical sheet stylesheet is missing ${token}`);
}
for (const token of ["full: 'large'", 'RESTORE_FOCUS_REASONS', "surface === 'search'", "event.detail !== 0", 'WorldlineIOSInterface']) {
  requireText('mobile/quality.js', token, `The canonical quality controller is missing ${token}`);
}
for (const token of ['--worldline-min-hit: 44px', '.worldline-hit-square', '.worldline-hit-height', ':focus-visible', 'prefers-reduced-motion: reduce', 'prefers-reduced-transparency: reduce', 'prefers-contrast: more', 'forced-colors: active']) {
  requireText('mobile/quality.css', token, `The canonical quality stylesheet is missing ${token}`);
}
for (const token of ['.search-shell.is-open .metric-grid', '.place-facts', '.place-evidence', 'border-radius: 0 !important']) {
  requireText('mobile/surfaces.css', token, `The canonical surface stylesheet is missing ${token}`);
}
for (const token of ["ui().register('search'", 'WorldlineTimelineState', 'WorldlineSearchController']) {
  requireText('search/search.js', token, `The canonical search controller is missing ${token}`);
}
for (const token of ['visualViewport', 'worldline-search-locked', 'WorldlineSearchViewport']) {
  requireText('search/viewport.js', token, `The keyboard-safe viewport controller is missing ${token}`);
}
for (const token of ['.search-suggestions', '.search-cancel', 'worldline-search-locked', 'prefers-reduced-motion: reduce']) {
  requireText('search/search.css', token, `The canonical search stylesheet is missing ${token}`);
}

for (const token of ['timelinePrimarySlider', 'timeline-hud', 'milestonePosition', 'snapTimeline']) {
  prohibitText('search/viewport.js', token, `Search viewport must not own timeline behavior: ${token}`);
}
for (const token of ['createTimelineHud', 'timelineSlider', 'timelinePlay']) {
  prohibitText('search/search.js', token, `Search must not create or control timeline UI: ${token}`);
}
for (const token of ['.timeline-hud', '.timeline-local-slider', '.timeline-interval-rail']) {
  prohibitText('mobile/surfaces.css', token, `Mobile surfaces must not own timeline styles: ${token}`);
  prohibitText('search/search.css', token, `Search styles must not own timeline styles: ${token}`);
}

const production = `${sources['bootstrap.js']}\n${sources['index.html']}`;
for (const token of ['interaction-system', 'mobile-polish', 'mobile-search-snap-r15', 'ios-interface-r21', 'interface-reduction-r22', 'apple-controls']) {
  if (production.includes(token)) failures.push(`Production still references retired mobile generation ${token}`);
}

for (const token of ['Apple Human Interface Guidelines', 'one gesture owner', 'reason-aware focus restoration', 'current project architecture']) {
  requireText('docs/IOS_INTERFACE_STANDARD.md', token, `The iOS interface standard is missing ${token}`);
}

if (failures.length) {
  console.error('Canonical mobile interface validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Canonical mobile shell, quality layer, search, and timeline ownership are valid.');
