import { access, readFile } from 'node:fs/promises';

const BUILD = '2026-08-03-globe-r12';
const requiredFiles = [
  'earth-cache.js',
  'life-evidence.js',
  'life-regions-r12.css',
  'r12-ui.js',
  'apple-timeline-r11.css',
  'apple-timeline-r11.js',
  'scripts/cache-earth-data.mjs',
  '.github/workflows/cache-earth-data.yml',
  'data/earth/cache/manifest.json',
  'data/earth/cache/life-66.json',
  'data/earth/cache/life-100.json',
  'data/earth/cache/life-250.json'
];
const failures = [];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    failures.push(`Missing cached Earth or life file: ${file}`);
  }
}

const [
  bootstrap,
  cacheRuntime,
  lifeRuntime,
  lifeStyle,
  r12Ui,
  timelineStyle,
  timelineRuntime,
  builder,
  workflow,
  manifestSource,
  versionSource,
  netlify
] = await Promise.all([
  readFile('bootstrap.js', 'utf8'),
  readFile('earth-cache.js', 'utf8'),
  readFile('life-evidence.js', 'utf8'),
  readFile('life-regions-r12.css', 'utf8'),
  readFile('r12-ui.js', 'utf8'),
  readFile('apple-timeline-r11.css', 'utf8'),
  readFile('apple-timeline-r11.js', 'utf8'),
  readFile('scripts/cache-earth-data.mjs', 'utf8'),
  readFile('.github/workflows/cache-earth-data.yml', 'utf8'),
  readFile('data/earth/cache/manifest.json', 'utf8'),
  readFile('version.json', 'utf8'),
  readFile('netlify.toml', 'utf8')
]);

function requireText(source, text, message) {
  if (!source.includes(text)) failures.push(message);
}

requireText(bootstrap, "loadScript('earth-cache.js')", 'The Earth cache runtime is not loaded');
requireText(bootstrap, 'script.async = false', 'Runtime scripts are not loaded in deterministic order');
if (bootstrap.indexOf("loadScript('earth-cache.js')") > bootstrap.indexOf("loadScript('earth-history.js')")) {
  failures.push('The Earth cache loads after the Earth history runtime');
}
requireText(bootstrap, "loadStyle('life-regions-r12.css')", 'The r12 life-region styling is not loaded');
requireText(bootstrap, "loadScript('r12-ui.js')", 'The r12 UI runtime is not loaded');
requireText(bootstrap, "loadScript('life-evidence.js')", 'The life-region runtime is not loaded');

requireText(cacheRuntime, "url.pathname === '/api/paleocoastlines'", 'The cache does not intercept paleocoastline requests');
requireText(cacheRuntime, 'caches.open(RUNTIME_CACHE)', 'The browser Cache API fallback is missing');
requireText(cacheRuntime, 'github-snapshot', 'The static snapshot response is not identified');
requireText(cacheRuntime, 'refineInBackground', 'Background live-model refinement is missing');
requireText(cacheRuntime, 'nearestLife', 'The cache does not expose life snapshots');

for (const icon of ['leaf', 'fish', 'lizard', 'paw', 'shell']) {
  requireText(lifeRuntime, `${icon}: {`, `The ${icon} life image is missing`);
}
requireText(lifeRuntime, "id: 'life-region-icons'", 'Illustrated life-region symbols are missing');
requireText(lifeRuntime, "id: 'life-region-hit'", 'Life regions do not have forgiving touch targets');
requireText(lifeRuntime, 'buildRegions', 'Fossil records are not grouped into readable regions');
requireText(lifeRuntime, 'commonLifeModel', 'Common-language organism labels are missing');
requireText(lifeRuntime, 'Life in this area', 'The regional life sheet is missing');
requireText(lifeRuntime, 'View fossil evidence', 'Evidence is not hidden behind a deliberate action');
requireText(lifeRuntime, 'Fossil finds show where evidence has been recovered, not the complete range', 'The fossil range caveat is missing');
requireText(lifeRuntime, "layout: { visibility: 'none' }", 'Raw evidence points are not hidden by default');
if (lifeRuntime.includes('life-evidence-cluster-count') || lifeRuntime.includes('point_count_abbreviated')) {
  failures.push('Numbered fossil cluster bubbles remain in the default experience');
}
requireText(lifeStyle, '.life-item-art.life-leaf', 'Flora image cards are not styled');
requireText(lifeStyle, '.life-item-art.life-fish', 'Marine-life image cards are not styled');
requireText(lifeStyle, '.life-item-art.life-lizard', 'Land-fauna image cards are not styled');
requireText(r12Ui, 'illustrated life regions', 'The about experience does not describe the new life presentation');

requireText(timelineStyle, '.timeline-hud', 'The timeline material is missing');
requireText(timelineStyle, 'backdrop-filter: blur(34px)', 'The timeline material blur is missing');
requireText(timelineStyle, '.timeline-thumb-bubble', 'The timeline value bubble is missing');
requireText(timelineRuntime, '--timeline-thumb-position', 'The value bubble does not follow the visual thumb');

requireText(builder, "const MODEL = 'CAO2024'", 'The snapshot builder does not pin CAO2024');
requireText(builder, 'compactCollection', 'The builder does not simplify coastlines');
requireText(builder, 'coordinatesFromPointPayload', 'The fossil paleoposition parser is missing');
requireText(builder, "fetchOccurrences(ageMa, 'Animalia'", 'The builder does not request fauna evidence');
requireText(builder, "fetchOccurrences(ageMa, 'Plantae'", 'The builder does not request flora evidence');
requireText(workflow, 'contents: write', 'The cache workflow cannot commit generated files');
requireText(workflow, 'node scripts/cache-earth-data.mjs', 'The cache workflow does not run the builder');
requireText(netlify, 'Cache-Control = "public, max-age=0, must-revalidate"', 'Static Earth assets do not revalidate');

let manifest;
try {
  manifest = JSON.parse(manifestSource);
} catch {
  failures.push('Earth cache manifest is not valid JSON');
}
if (manifest) {
  if (manifest.model !== 'CAO2024') failures.push('Earth cache manifest does not identify CAO2024');
  if (!Array.isArray(manifest.life) || manifest.life.length < 3) failures.push('The fossil manifest is incomplete');
  for (const age of [66, 100, 250]) {
    if (!manifest.life.some((entry) => Number(entry.ageMa) === age)) failures.push(`Missing fossil data for ${age} Ma`);
  }
}

let version;
try {
  version = JSON.parse(versionSource);
} catch {
  failures.push('version.json is not valid JSON');
}
if (version?.build !== BUILD) failures.push(`version.json should be ${BUILD}`);
for (const runtime of [bootstrap, lifeRuntime, r12Ui]) {
  if (!runtime.includes(BUILD)) failures.push(`An r12 runtime is missing the ${BUILD} marker`);
}

if (failures.length) {
  console.error('Cached Earth and life-region validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('GitHub-cached Earth, illustrated life regions, evidence disclosure, and r12 UI are valid.');
