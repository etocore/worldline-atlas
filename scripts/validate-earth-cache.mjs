import { access, readFile } from 'node:fs/promises';

const BUILD = '2026-08-03-globe-r11';
const requiredFiles = [
  'earth-cache.js',
  'life-evidence.js',
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
    failures.push(`Missing cached Earth file: ${file}`);
  }
}

const [
  bootstrap,
  cacheRuntime,
  lifeRuntime,
  timelineStyle,
  timelineRuntime,
  builder,
  workflow,
  manifestSource,
  versionSource,
  html
] = await Promise.all([
  readFile('bootstrap.js', 'utf8'),
  readFile('earth-cache.js', 'utf8'),
  readFile('life-evidence.js', 'utf8'),
  readFile('apple-timeline-r11.css', 'utf8'),
  readFile('apple-timeline-r11.js', 'utf8'),
  readFile('scripts/cache-earth-data.mjs', 'utf8'),
  readFile('.github/workflows/cache-earth-data.yml', 'utf8'),
  readFile('data/earth/cache/manifest.json', 'utf8'),
  readFile('version.json', 'utf8'),
  readFile('index.html', 'utf8')
]);

function requireText(source, text, message) {
  if (!source.includes(text)) failures.push(message);
}

requireText(bootstrap, "loadScript('earth-cache.js')", 'The Earth cache runtime is not loaded');
requireText(bootstrap, 'script.async = false', 'Runtime scripts are not loaded in deterministic order');
if (bootstrap.indexOf("loadScript('earth-cache.js')") > bootstrap.indexOf("loadScript('earth-history.js')")) {
  failures.push('The Earth cache loads after the Earth history runtime');
}
requireText(bootstrap, "loadStyle('apple-timeline-r11.css')", 'The r11 timeline styling is not loaded');
requireText(bootstrap, "loadScript('life-evidence.js')", 'The fossil evidence runtime is not loaded');

requireText(cacheRuntime, "url.pathname === '/api/paleocoastlines'", 'The cache does not intercept paleocoastline requests');
requireText(cacheRuntime, "caches.open(RUNTIME_CACHE)", 'The browser Cache API fallback is missing');
requireText(cacheRuntime, 'github-snapshot', 'The static snapshot response is not identified');
requireText(cacheRuntime, 'refineInBackground', 'Background live-model refinement is missing');
requireText(cacheRuntime, 'nearestLife', 'The cache does not expose life snapshots');

requireText(lifeRuntime, "id: 'life-evidence-points'", 'The flora and fauna point layer is missing');
requireText(lifeRuntime, "'flora', '#65c466'", 'Flora and fauna do not have distinct visual treatment');
requireText(lifeRuntime, 'Occurrence point, not a complete species range', 'The fossil range caveat is missing');
requireText(lifeRuntime, 'Paleobiology Database fossil record', 'The fossil evidence provenance is missing');

requireText(timelineStyle, '.timeline-hud', 'The r11 timeline material is missing');
requireText(timelineStyle, 'backdrop-filter: blur(34px)', 'The timeline material blur is missing');
requireText(timelineStyle, '.timeline-thumb-bubble', 'The timeline value bubble is missing');
requireText(timelineStyle, 'width: 26px', 'The larger tactile slider thumb is missing');
requireText(timelineRuntime, '--timeline-thumb-position', 'The value bubble does not follow the visual thumb');

requireText(builder, "const MODEL = 'CAO2024'", 'The snapshot builder does not pin CAO2024');
requireText(builder, 'compactCollection', 'The builder does not simplify coastlines');
requireText(builder, 'coordinatesFromPointPayload', 'The fossil paleoposition parser is missing');
requireText(builder, "base_name', 'Animalia'", 'The builder does not request fauna evidence');
requireText(builder, "base_name', 'Plantae'", 'The builder does not request flora evidence');
requireText(workflow, 'contents: write', 'The cache workflow cannot commit generated files');
requireText(workflow, 'node scripts/cache-earth-data.mjs', 'The cache workflow does not run the builder');

let manifest;
try {
  manifest = JSON.parse(manifestSource);
} catch {
  failures.push('Earth cache manifest is not valid JSON');
}
if (manifest) {
  if (manifest.model !== 'CAO2024') failures.push('Earth cache manifest does not identify CAO2024');
  if (!Array.isArray(manifest.life) || manifest.life.length < 3) failures.push('The reviewed fossil seed manifest is incomplete');
  for (const age of [66, 100, 250]) {
    if (!manifest.life.some((entry) => Number(entry.ageMa) === age)) failures.push(`Missing fossil seed for ${age} Ma`);
  }
}

let version;
try {
  version = JSON.parse(versionSource);
} catch {
  failures.push('version.json is not valid JSON');
}
if (version?.build !== BUILD) failures.push(`version.json should be ${BUILD}`);
requireText(html, '20260803r11', 'index.html does not request r11 assets');
requireText(html, 'Paleobiology Database', 'The deployed source disclosure omits fossil evidence');

for (const runtime of [bootstrap, cacheRuntime, lifeRuntime, timelineRuntime]) {
  if (!runtime.includes(BUILD)) failures.push(`A runtime file is missing the ${BUILD} marker`);
}

if (failures.length) {
  console.error('Cached Earth validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('GitHub-cached Earth, fossil evidence, and r11 timeline wiring are valid.');
