import { readFile, access } from 'node:fs/promises';

const CURRENT_BUILD = '2026-08-03-globe-r12';
const requiredFiles = [
  'earth-history.js',
  'earth-history.css',
  'docs/EARTH_ENGINE.md',
  'netlify/functions/paleocoastlines.js'
];
const failures = [];

for (const path of requiredFiles) {
  try {
    await access(path);
  } catch {
    failures.push(`Missing Earth history file: ${path}`);
  }
}

const [runtime, style, proxy, netlify, bootstrap, html, version, documentation] = await Promise.all([
  readFile('earth-history.js', 'utf8'),
  readFile('earth-history.css', 'utf8'),
  readFile('netlify/functions/paleocoastlines.js', 'utf8'),
  readFile('netlify.toml', 'utf8'),
  readFile('bootstrap.js', 'utf8'),
  readFile('index.html', 'utf8'),
  readFile('version.json', 'utf8'),
  readFile('docs/EARTH_ENGINE.md', 'utf8')
]);

function requireText(source, text, message) {
  if (!source.includes(text)) failures.push(message);
}

requireText(runtime, "const EARTH_DEFAULT_AGE_MA = 250", 'Earth History does not default to Pangea at 250 Ma');
requireText(runtime, "const MAX_RECONSTRUCTION_AGE_MA = 1800", 'The 1.8 Ga plate-model boundary is missing');
requireText(runtime, "const HUMAN_DEFAULT_YEAR = -10000", 'The human timeline default is missing');
requireText(runtime, "'earth', 'human'", 'The Earth and Human timeline modes are missing');
requireText(runtime, 'Formation of Earth', 'The Earth formation milestone is missing');
requireText(runtime, 'Homo sapiens', 'The 300,000-year human-history milestone is missing');
requireText(runtime, 'timeline-mode-control', 'The timeline scope control is not created');
requireText(runtime, 'timeline-milestone', 'Timeline milestone controls are not created');
requireText(runtime, 'paleo-coastlines', 'The reconstructed coastline source is not installed');
requireText(runtime, 'Schematic early Earth', 'The early-Earth schematic fallback is missing');

requireText(proxy, "const MODEL = 'CAO2024'", 'The GPlates proxy does not pin CAO2024');
requireText(proxy, 'MAX_MODEL_AGE_MA = 1800', 'The GPlates proxy does not enforce the 1.8 Ga boundary');
requireText(proxy, 'gws.gplates.org/reconstruct/coastlines', 'The GPlates coastline endpoint is missing');
requireText(proxy, 's-maxage=2592000', 'The GPlates proxy does not cache model output');

requireText(netlify, 'from = "/api/paleocoastlines"', 'Netlify does not expose /api/paleocoastlines');
requireText(netlify, 'Cache-Control = "public, max-age=0, must-revalidate"', 'Static assets do not revalidate across releases');
requireText(bootstrap, 'earth-history.css', 'bootstrap.js does not load earth-history.css');
requireText(bootstrap, 'earth-history.js', 'bootstrap.js does not load earth-history.js');
requireText(style, '.timeline-mode-control', 'The timeline scope control is not styled');
requireText(style, '.timeline-era-card', 'The compact era card is not styled');
requireText(style, '.surface-control { display: none', 'The legacy reconstruction switch remains visible');
requireText(html, '250 Ma', 'The initial HTML does not present Earth History first');
requireText(html, 'Reconstructed Earth', 'The initial HTML does not present reconstruction as the default');
requireText(documentation, 'AI is a deterministic visual synthesizer', 'The AI accuracy policy is not documented');

let parsedVersion;
try {
  parsedVersion = JSON.parse(version);
} catch {
  failures.push('version.json is not valid JSON');
}
if (parsedVersion?.build !== CURRENT_BUILD) failures.push(`version.json should be ${CURRENT_BUILD}`);
if (!bootstrap.includes(CURRENT_BUILD)) failures.push(`bootstrap.js is missing the ${CURRENT_BUILD} marker`);

if (failures.length) {
  console.error('Earth history validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Earth History foundation remains wired and scientifically bounded in r12.');
