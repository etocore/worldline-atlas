import { access, readFile } from 'node:fs/promises';

const failures = [];
const required = [
  'timeline/model.js', 'timeline/state.js', 'timeline/view.js', 'timeline/timeline.css',
  'performance/timeline.js', 'tests/e2e/timeline-performance.spec.mjs',
  'bootstrap.js', 'earth-history.css', 'mobile/surfaces.css', 'search/search.js',
  'search/search.css', 'README.md', 'version.json'
];
for (const file of required) {
  try { await access(file); } catch { failures.push(`Missing canonical timeline file: ${file}`); }
}

const sources = Object.fromEntries(await Promise.all(required.map(async (file) => [file, await readFile(file, 'utf8')])));
const requireText = (file, token, message) => {
  if (!sources[file].includes(token)) failures.push(message);
};
let version;
try { version = JSON.parse(sources['version.json']); } catch { failures.push('version.json is not valid JSON'); }
if (version?.build !== '2026-08-04-globe-r30') failures.push('version.json is not on the measured r30 build');
if (!sources['bootstrap.js'].includes(version?.build || '')) failures.push('bootstrap.js does not use the current build as its cache key');

for (const asset of ['timeline/model.js', 'timeline/state.js', 'timeline/view.js', 'timeline/timeline.css', 'performance/timeline.js']) {
  requireText('bootstrap.js', asset, `bootstrap.js does not load ${asset}`);
}
for (const asset of ['apple-timeline-r11', 'atlas-timeline-r18', 'atlas-timeline-state-r18', 'time-control-r16', 'timeline-navigation-r23', 'timeline-rail-r24', 'time-language-r25', 'human-scrubber-r26', 'timeline-interface-r27']) {
  if (sources['bootstrap.js'].includes(asset)) failures.push(`bootstrap.js still loads retired timeline generation ${asset}`);
}
for (const token of ['EARTH_TREE', 'EARTH_INTERVALS', 'HUMAN_INTERVALS', 'formatTime', 'localPosition', 'localValue', 'ageMaToPosition', 'yearToPosition']) {
  requireText('timeline/model.js', token, `Timeline model is missing ${token}`);
}
for (const token of ['WorldlineTimelineState', 'beginGesture', 'previewFromPosition', 'commitGesture', 'cancelGesture', 'setDomain', 'setEarthAge', 'setHumanYear', 'worldline:timeline-preview', 'worldline:timeline-commit']) {
  requireText('timeline/state.js', token, `Timeline state is missing ${token}`);
}
for (const token of ["ui().register('timeline'", 'createHud', 'ownLauncher', 'buildSettings', 'buildRail', 'updateRail', 'schedulePreview', 'syncLegacy', '__WORLDLINE_TIMELINE_BUILD__']) {
  requireText('timeline/view.js', token, `Timeline view is missing ${token}`);
}
for (const token of ['.timeline-hud', '.timeline-header', '.timeline-domain', '.timeline-interval-rail', '.timeline-local-slider', 'direction: ltr', '.worldline-timeline .year-chip', 'prefers-reduced-motion', 'prefers-reduced-transparency', 'prefers-contrast']) {
  requireText('timeline/timeline.css', token, `Canonical timeline stylesheet is missing ${token}`);
}
for (const token of ['WorldlinePerformance', 'inputToRenderP95Ms', 'maxPreviewRequestsPerGesture', 'maxPostReleaseRequests', 'maxSourceRemovalsDuringGesture', 'maxCommitsPerGesture', 'worldline:timeline-performance-sample']) {
  requireText('performance/timeline.js', token, `Timeline performance contract is missing ${token}`);
}
for (const token of ['inputToRenderP95Ms', 'previewRequests', 'postReleaseRequests', 'sourceRemovals', 'commits', 'abortedRequests']) {
  requireText('tests/e2e/timeline-performance.spec.mjs', token, `Timeline performance regression is missing ${token}`);
}

if (/timeline-primary-slider|direction:\s*rtl|timeline-mode-control/.test(sources['earth-history.css'])) failures.push('earth-history.css still contains retired timeline rules');
for (const adjacent of ['mobile/surfaces.css', 'search/search.css']) {
  if (/\.timeline-hud|timeline-local-slider|timeline-interval-rail/.test(sources[adjacent])) failures.push(`${adjacent} owns canonical timeline UI`);
}
if (/createTimelineHud|timelineSlider|timelinePlay/.test(sources['search/search.js'])) failures.push('Canonical search reintroduces timeline ownership');
if (/MutationObserver[\s\S]*years ago|TreeWalker|rewriteTextNodes/.test(sources['timeline/view.js'])) failures.push('Timeline view reintroduces post-render text rewriting');

requireText('README.md', 'The canonical timeline subsystem lives in `timeline/`', 'README does not describe the canonical timeline architecture');
requireText('README.md', '`performance/timeline.js` measures the canonical timeline', 'README does not describe the performance contract');
requireText('README.md', '1.8 billion years ago', 'README does not describe the reconstruction boundary');
requireText('README.md', '300,000 years ago', 'README does not describe the Human History range');

if (failures.length) {
  console.error('Canonical timeline validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Canonical timeline ownership and r30 performance budgets remain isolated from mobile and search.');
