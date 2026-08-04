import { access, readFile } from 'node:fs/promises';

const failures = [];
const required = [
  'timeline/model.js',
  'timeline/state.js',
  'timeline/view.js',
  'timeline/timeline.css',
  'bootstrap.js',
  'earth-history.css',
  'interface-reduction-r22.css',
  'README.md',
  'version.json'
];

for (const file of required) {
  try { await access(file); } catch { failures.push(`Missing canonical timeline file: ${file}`); }
}

const [model, state, view, style, bootstrap, earthStyle, reductionStyle, readme, versionSource] = await Promise.all(
  required.map((file) => readFile(file, 'utf8'))
);

function requireText(source, text, message) {
  if (!source.includes(text)) failures.push(message);
}

let version;
try { version = JSON.parse(versionSource); } catch { failures.push('version.json is not valid JSON'); }
const currentBuild = version?.build;
if (currentBuild !== '2026-08-04-globe-r28') failures.push('version.json is not on the canonical r28 timeline build');
if (!bootstrap.includes(currentBuild)) failures.push('bootstrap.js does not use the r28 build as its cache key');

for (const asset of ['timeline/model.js', 'timeline/state.js', 'timeline/view.js', 'timeline/timeline.css']) {
  requireText(bootstrap, asset, `bootstrap.js does not load ${asset}`);
}

const retired = [
  'apple-timeline-r11',
  'atlas-timeline-r18',
  'atlas-timeline-state-r18',
  'time-control-r16',
  'timeline-navigation-r23',
  'timeline-rail-r24',
  'time-language-r25',
  'human-scrubber-r26',
  'timeline-interface-r27'
];
for (const asset of retired) {
  if (bootstrap.includes(asset)) failures.push(`bootstrap.js still loads retired timeline generation ${asset}`);
}

for (const token of [
  'EARTH_TREE', 'EARTH_INTERVALS', 'HUMAN_INTERVALS', 'formatTime',
  'localPosition', 'localValue', 'ageMaToPosition', 'yearToPosition'
]) requireText(model, token, `Timeline model is missing ${token}`);

for (const token of [
  'WorldlineTimelineState', 'beginGesture', 'previewFromPosition', 'commitGesture',
  'cancelGesture', 'setDomain', 'setEarthAge', 'setHumanYear',
  'worldline:timeline-preview', 'worldline:timeline-commit', 'requestAnimationFrame'
]) requireText(state, token, `Timeline state is missing ${token}`);

for (const token of [
  'ui().register(\'timeline\'', 'createHud', 'ownLauncher', 'buildSettings',
  'buildRail', 'updateRail', 'timeline-interval-bubble', 'schedulePreview',
  'syncLegacy', '__WORLDLINE_TIMELINE_BUILD__'
]) requireText(view, token, `Timeline view is missing ${token}`);

for (const token of [
  '.timeline-hud', '.timeline-header', '.timeline-domain', '.timeline-interval-rail',
  '.timeline-local-slider', 'direction: ltr', '.worldline-timeline .year-chip',
  'prefers-reduced-motion', 'prefers-reduced-transparency', 'prefers-contrast'
]) requireText(style, token, `Canonical timeline stylesheet is missing ${token}`);

if (/timeline-primary-slider|direction:\s*rtl|timeline-mode-control/.test(earthStyle)) {
  failures.push('earth-history.css still contains retired timeline control rules');
}
if (/\.timeline-hud|timeline-local-slider|timeline-interval-rail/.test(reductionStyle)) {
  failures.push('interface-reduction-r22.css still owns timeline UI');
}
if (/MutationObserver[\s\S]*years ago/.test(view) || /TreeWalker|rewriteTextNodes/.test(view)) {
  failures.push('Timeline view reintroduces post-render text rewriting');
}

requireText(readme, 'The canonical timeline subsystem lives in `timeline/`', 'README does not describe the canonical timeline architecture');
requireText(readme, '1.8 billion years ago', 'README does not describe the reconstruction boundary');
requireText(readme, '300,000 years ago', 'README does not describe the Human History range');

if (failures.length) {
  console.error('Canonical timeline validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Canonical timeline model, state, view, formatting, and stylesheet ownership are valid.');
