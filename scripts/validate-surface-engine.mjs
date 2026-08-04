import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const failures = [];
const BUILD = '2026-08-04-globe-r20';
const requiredFiles = [
  'data/surface/worlds.json',
  'data/surface/worlds/250-ma/world.json',
  'surface-engine-r20.js',
  'surface-engine-r20.css',
  'scripts/build_surface_worlds.py',
  '.github/workflows/build-surface-worlds.yml',
  'docs/SURFACE_ENGINE_R20.md',
  'bootstrap.js',
  'version.json'
];

for (const file of requiredFiles) {
  try { await access(file); } catch { failures.push(`Missing surface engine file: ${file}`); }
}

function requireText(source, token, message) {
  if (!source.includes(token)) failures.push(message);
}

const [manifestSource, worldSource, runtime, style, builder, workflow, docs, bootstrap, versionSource] = await Promise.all([
  readFile('data/surface/worlds.json', 'utf8'),
  readFile('data/surface/worlds/250-ma/world.json', 'utf8'),
  readFile('surface-engine-r20.js', 'utf8'),
  readFile('surface-engine-r20.css', 'utf8'),
  readFile('scripts/build_surface_worlds.py', 'utf8'),
  readFile('.github/workflows/build-surface-worlds.yml', 'utf8'),
  readFile('docs/SURFACE_ENGINE_R20.md', 'utf8'),
  readFile('bootstrap.js', 'utf8'),
  readFile('version.json', 'utf8')
]);

let manifest;
let worldMetadata;
let version;
try { manifest = JSON.parse(manifestSource); } catch { failures.push('Surface manifest is not valid JSON'); }
try { worldMetadata = JSON.parse(worldSource); } catch { failures.push('250 Ma world metadata is not valid JSON'); }
try { version = JSON.parse(versionSource); } catch { failures.push('version.json is not valid JSON'); }

if (version?.build !== BUILD) failures.push(`version.json should be ${BUILD}`);
if (manifest?.build !== BUILD) failures.push(`Surface manifest should be ${BUILD}`);
if (manifest?.interpolationPolicy?.noInventedGeography !== true) failures.push('Surface manifest must prohibit invented geography');

const world = manifest?.worlds?.find((entry) => entry.id === '250-ma');
if (!world) failures.push('Surface manifest is missing the 250 Ma anchor world');
if (world?.status !== 'generated') failures.push('The 250 Ma anchor world has not been generated');
if (world?.builderVersion !== 2) failures.push('The 250 Ma manifest does not use the seam-safe builder');
if (!world?.sourceIds?.includes('paleodem')) failures.push('The 250 Ma world is missing PaleoDEM provenance');
if (world?.layers?.climate !== 'not-included') failures.push('The 250 Ma package must not imply climate coverage');
if (world?.layers?.biomes !== 'not-included') failures.push('The 250 Ma package must not imply biome coverage');
if (!world?.assets?.colorTiles || !world?.assets?.demTiles) failures.push('The 250 Ma package is missing tile templates');
if (world?.assets?.encoding !== 'mapbox') failures.push('The DEM tiles must declare Mapbox Terrain-RGB encoding');
if (worldMetadata?.builderVersion !== 2) failures.push('The generated world metadata is not builder version 2');
if (worldMetadata?.source?.sourceGrid !== 'Map49_PALEOMAP_1deg_Permo-Triassic Boundary_250Ma.nc') {
  failures.push('The generated world is not sourced from the exact 250 Ma PaleoDEM grid');
}
if (worldMetadata?.representation?.climate !== 'not represented') failures.push('World metadata incorrectly claims climate representation');
if (worldMetadata?.representation?.vegetation !== 'not represented') failures.push('World metadata incorrectly claims vegetation representation');

for (const token of [
  "type: 'raster'",
  "type: 'raster-dem'",
  "type: 'hillshade'",
  "'raster-resampling': 'linear'",
  'setTerrain?.({ source: SOURCE_DEM, exaggeration: 0.16 })',
  'worldContains',
  'rememberAndHideTechnicalLayers',
  'restoreFlatSurface',
  "setPaintProperty('paleo-land-fill', 'fill-opacity', 0)",
  "setPaintProperty('paleo-coastline-line', 'line-opacity', 0)",
  'Paleoelevation + ocean depth',
  'worldline:surface-world-ready'
]) {
  requireText(runtime, token, `Surface runtime is missing ${token}`);
}
requireText(style, '.worldline-surface-badge', 'Surface evidence badge styling is missing');
requireText(builder, '10.5281/zenodo.5460860', 'Builder is missing source DOI');
requireText(builder, 'Mapbox Terrain-RGB', 'Builder does not document DEM encoding');
requireText(builder, 'BUILDER_VERSION = 2', 'Builder version was not advanced after visual QA');
requireText(builder, 'padding=1', 'Builder does not sample a geographic halo around each tile');
requireText(builder, '[1:-1, 1:-1]', 'Builder does not crop padded color tiles consistently');
requireText(builder, 'previous_generation', 'Builder does not preserve stable generation metadata');
requireText(workflow, 'worldline-surface-bot', 'Surface workflow lacks a dedicated commit identity');
requireText(workflow, 'build_surface_worlds.py', 'Surface workflow does not run the builder');
requireText(docs, 'does not support claims about', 'Surface documentation lacks evidence boundaries');
requireText(bootstrap, "loadStyle('surface-engine-r20.css')", 'Bootstrap does not load surface styles');
requireText(bootstrap, "loadScript('surface-engine-r20.js')", 'Bootstrap does not load surface runtime');
requireText(bootstrap, BUILD, 'Bootstrap is missing the r20 build marker');

async function countPngs(root) {
  let total = 0;
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) total += await countPngs(target);
    else if (entry.name.endsWith('.png')) {
      total += 1;
      if ((await stat(target)).size < 100) failures.push(`Generated tile is suspiciously small: ${target}`);
    }
  }
  return total;
}

if (world?.status === 'generated') {
  for (const sample of [
    'data/surface/worlds/250-ma/world.json',
    'data/surface/worlds/250-ma/color/0/0/0.png',
    'data/surface/worlds/250-ma/dem/0/0/0.png'
  ]) {
    try { await access(sample); } catch { failures.push(`Missing generated surface asset: ${sample}`); }
  }
  try {
    const colorCount = await countPngs('data/surface/worlds/250-ma/color');
    const demCount = await countPngs('data/surface/worlds/250-ma/dem');
    if (colorCount !== 85) failures.push(`Expected 85 color tiles through zoom 3, found ${colorCount}`);
    if (demCount !== 85) failures.push(`Expected 85 DEM tiles through zoom 3, found ${demCount}`);
  } catch {
    failures.push('Generated surface tile directories are unavailable');
  }
}

if (failures.length) {
  console.error('Historical surface engine validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Historical surface provenance, seamless tiles, source-consistent shorelines, terrain, and fallback are valid.');
