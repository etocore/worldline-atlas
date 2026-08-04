import { access, readFile } from 'node:fs/promises';

const failures = [];
const BUILD = '2026-08-04-globe-r19';
const required = [
  'atlas-timeline-state-r18.js',
  'atlas-timeline-r18.js',
  'atlas-timeline-r18.css',
  'mobile-search-snap-r15.js',
  'mobile-search-snap-r15.css',
  'time-control-r16.js',
  'bootstrap.js',
  'version.json'
];

for (const file of required) {
  try { await access(file); } catch { failures.push(`Missing timeline controller file: ${file}`); }
}

const [
  stateRuntime,
  controllerRuntime,
  timelineStyle,
  mobileRuntime,
  mobileStyle,
  timeRuntime,
  bootstrap,
  versionSource
] = await Promise.all([
  readFile('atlas-timeline-state-r18.js', 'utf8'),
  readFile('atlas-timeline-r18.js', 'utf8'),
  readFile('atlas-timeline-r18.css', 'utf8'),
  readFile('mobile-search-snap-r15.js', 'utf8'),
  readFile('mobile-search-snap-r15.css', 'utf8'),
  readFile('time-control-r16.js', 'utf8'),
  readFile('bootstrap.js', 'utf8'),
  readFile('version.json', 'utf8')
]);

function requireText(source, text, message) {
  if (!source.includes(text)) failures.push(message);
}

let version;
try { version = JSON.parse(versionSource); } catch { failures.push('version.json is not valid JSON'); }

if (version?.build !== BUILD) failures.push(`version.json should be ${BUILD}`);
if (!bootstrap.includes(BUILD)) failures.push(`bootstrap.js should use ${BUILD} as its cache key`);
for (const asset of ['atlas-timeline-state-r18.js', 'atlas-timeline-r18.js', 'atlas-timeline-r18.css']) {
  requireText(bootstrap, asset, `bootstrap.js does not load ${asset}`);
}
if (bootstrap.indexOf("loadScript('atlas-timeline-state-r18.js')") > bootstrap.indexOf("loadScript('earth-history.js')")) {
  failures.push('Timeline state must load before legacy Earth History runtime');
}
if (bootstrap.indexOf("loadScript('atlas-timeline-r18.js')") < bootstrap.indexOf("loadScript('earth-history.js')")) {
  failures.push('Timeline bridge must load after legacy Earth History creates its controls');
}

for (const token of [
  'WorldlineTimelineState',
  'EARTH_STOPS',
  'HUMAN_STOPS',
  '-300000',
  'beginGesture',
  'previewFromPosition',
  'commitGesture',
  'oneCommitPerTransaction',
  'activeTransactionId',
  'commitCounter',
  'WorldlineDiagnostics',
  'worldline:timeline-preview',
  'worldline:timeline-commit',
  'requestAnimationFrame'
]) {
  requireText(stateRuntime, token, `Timeline state runtime is missing ${token}`);
}

for (const token of [
  'cloneNode(true)',
  'legacyListenersRemoved',
  'stopImmediatePropagation',
  'applyToLegacyEngine',
  'setHumanYear',
  'setEarthAge',
  'pointerdown',
  'pointerup',
  'touchend',
  'keydown',
  'applySearchTarget',
  '__WORLDLINE_TIMELINE_CONTROLLER_BUILD__'
]) {
  requireText(controllerRuntime, token, `Timeline controller is missing ${token}`);
}

requireText(mobileRuntime, '__WORLDLINE_R15_SNAP_DELEGATED_TO_R18__', 'r15 snap listeners are not delegated to r18 when present');
requireText(mobileRuntime, "const BUILD = '2026-08-04-globe-r19'", 'Mobile viewport runtime is not on r19');
requireText(mobileRuntime, 'window.visualViewport', 'Mobile search does not bind to the visual viewport');
requireText(mobileRuntime, 'setTimeout(positionSearch, 240)', 'Mobile search does not follow the iOS keyboard animation');
requireText(timeRuntime, 'WorldlineTimelineState', 'time-control search bridge does not use r18 state');
requireText(timelineStyle, 'touch-action: pan-x', 'Timeline slider does not constrain touch handling');
requireText(timelineStyle, 'prefers-reduced-motion', 'Timeline controller lacks reduced-motion styling');
requireText(timelineStyle, 'left: 50% !important', 'Mobile timeline does not enforce a centered anchor');
requireText(timelineStyle, 'transform: translate(-50%, 0) scale(1)', 'Open mobile timeline does not preserve centering');
requireText(timelineStyle, 'body.timeline-active #yearButton', 'Open timeline does not suppress the duplicate date chip');
if (timelineStyle.includes('transform: translateZ(0);')) failures.push('Timeline CSS reintroduces the transform that pushed the panel offscreen');
requireText(mobileStyle, 'body.search-active .map-identity', 'Focused mobile search does not hide duplicate map chrome');
requireText(mobileStyle, 'max-height: min(220px, var(--wl-search-results-height))', 'Focused search results are not compactly capped');

if (failures.length) {
  console.error('Timeline controller validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Authoritative timeline state, iPhone centering, keyboard viewport, and legacy isolation are valid.');