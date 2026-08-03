import { access, readFile } from 'node:fs/promises';

const BUILD = '2026-08-03-globe-r17';
const requiredFiles = [
  'data/sources/registry.json',
  'data/manifests/release-manifest.json',
  'docs/RESEARCH_FOUNDATION_R17.md',
  'research-foundation-r17.js',
  'research-foundation-r17.css'
];
const failures = [];

for (const file of requiredFiles) {
  try { await access(file); } catch { failures.push(`Missing research foundation file: ${file}`); }
}

const [registryText, manifestText, docs, runtime, style, bootstrap, versionText] = await Promise.all([
  readFile('data/sources/registry.json', 'utf8'),
  readFile('data/manifests/release-manifest.json', 'utf8'),
  readFile('docs/RESEARCH_FOUNDATION_R17.md', 'utf8'),
  readFile('research-foundation-r17.js', 'utf8'),
  readFile('research-foundation-r17.css', 'utf8'),
  readFile('bootstrap.js', 'utf8'),
  readFile('version.json', 'utf8')
]);

function parseJson(text, label) {
  try { return JSON.parse(text); }
  catch (error) { failures.push(`${label} is not valid JSON: ${error.message}`); return null; }
}

function requireText(source, text, message) {
  if (!source.includes(text)) failures.push(message);
}

const registry = parseJson(registryText, 'source registry');
const manifest = parseJson(manifestText, 'release manifest');
const version = parseJson(versionText, 'version.json');

if (registry) {
  if (!registry.editorial_policy?.includes('Wikipedia')) failures.push('Source registry must explicitly limit Wikipedia to context/discovery');
  if (!registry.tiers?.A || !registry.tiers?.D) failures.push('Source tiers A-D are incomplete');
  const sources = registry.sources || [];
  const ids = new Set(sources.map((source) => source.id));
  for (const id of ['ics', 'gplates-cao2024', 'pbdb', 'smithsonian-human-origins', 'periodo', 'pleiades', 'whg', 'wikipedia']) {
    if (!ids.has(id)) failures.push(`Source registry is missing ${id}`);
  }
  const wikipedia = sources.find((source) => source.id === 'wikipedia');
  if (!wikipedia || wikipedia.tier !== 'D' || wikipedia.claim_authority?.length) failures.push('Wikipedia must remain Tier D with no claim authority');
  for (const source of sources) {
    for (const key of ['id', 'name', 'tier', 'domain', 'url', 'use', 'license_status', 'review_status']) {
      if (!source[key]) failures.push(`Source ${source.id || source.name || 'unknown'} is missing ${key}`);
    }
  }
}

if (manifest) {
  if (manifest.version !== BUILD) failures.push(`Release manifest should be ${BUILD}`);
  if (manifest.default_timeline !== 'earth') failures.push('Earth History must remain the default timeline');
  if (manifest.human_history_foundation?.starts_year !== -300000) failures.push('Human History must start at 300,000 years ago');
  const anchors = new Set((manifest.anchor_worlds || []).map((world) => world.id));
  for (const id of ['present-day', 'last-glacial-maximum', 'end-cretaceous', 'pangea-250ma']) {
    if (!anchors.has(id)) failures.push(`Release manifest is missing anchor world ${id}`);
  }
  for (const hidden of ['plate-boundary-debug', 'raw-fossil-points', 'numbered-life-clusters', 'unreviewed-historical-boundaries']) {
    if (!manifest.default_hidden_layers?.includes(hidden)) failures.push(`Default hidden layer ${hidden} is not protected`);
  }
  const lenses = manifest.human_history_foundation?.required_lenses || [];
  for (const lens of ['Africa', 'Americas', 'Oceania', 'East Asia', 'South Asia', 'Southeast Asia', 'Central Asia', 'Middle East', 'Europe', 'Arctic']) {
    if (!lenses.includes(lens)) failures.push(`Human history lens missing: ${lens}`);
  }
}

requireText(docs, 'Wikipedia belongs here and may not author atlas dates', 'Documentation does not define Wikipedia limits');
requireText(docs, 'Every major date should expose simultaneous regional lenses', 'Documentation does not define global lens rule');
requireText(docs, 'Generated imagery may decorate fixed scientific masks', 'Documentation does not define AI evidence boundary');
requireText(runtime, 'GLOBAL_LENSES', 'Runtime does not add global lenses');
requireText(runtime, 'plate-boundary-debug', 'Runtime does not hide debug geology layers');
requireText(runtime, 'worldline-r17', 'Runtime does not activate r17 visual state');
requireText(style, '.research-lens-card', 'Research lens cards are not styled');
requireText(style, '.research-presence-source', 'Presence source badge is not styled');
requireText(bootstrap, "loadStyle('research-foundation-r17.css')", 'Bootstrap does not load research foundation CSS');
requireText(bootstrap, "loadScript('research-foundation-r17.js')", 'Bootstrap does not load research foundation runtime');
if (version?.build !== BUILD) failures.push(`version.json should be ${BUILD}`);
if (!bootstrap.includes(BUILD) || !runtime.includes(BUILD)) failures.push(`The r17 runtime is missing ${BUILD}`);

if (failures.length) {
  console.error('Research foundation validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Research foundation source registry, manifest, global lenses, and UI safeguards are valid.');
