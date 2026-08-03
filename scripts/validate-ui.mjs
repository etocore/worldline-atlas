import { readFile, access } from 'node:fs/promises';

const requiredFiles = [
  'interaction-system.css',
  'interaction-system.js',
  'landmark-visibility.js',
  'netlify/functions/place-summary.js'
];

const requiredIds = [
  'sheetScrim',
  'placeSheet',
  'placeSheetHandle',
  'placeClose',
  'placeTitle',
  'placeSubtitle',
  'placeSummary',
  'placeEvidence',
  'placeSource',
  'placeExpand'
];

const errors = [];

async function requireFile(path) {
  try {
    await access(path);
  } catch {
    errors.push(`Missing required UI file: ${path}`);
  }
}

await Promise.all(requiredFiles.map(requireFile));

const [html, bootstrap, netlify, version] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('bootstrap.js', 'utf8'),
  readFile('netlify.toml', 'utf8'),
  readFile('version.json', 'utf8')
]);

for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) errors.push(`index.html is missing #${id}`);
}

for (const asset of ['interaction-system.css', 'interaction-system.js']) {
  if (!html.includes(asset)) errors.push(`index.html does not load ${asset}`);
}

if (!bootstrap.includes('landmark-visibility.js')) {
  errors.push('bootstrap.js does not load landmark-visibility.js');
}

if (!netlify.includes('from = "/api/place-summary"')) {
  errors.push('netlify.toml does not expose /api/place-summary');
}

let parsedVersion;
try {
  parsedVersion = JSON.parse(version);
} catch {
  errors.push('version.json is not valid JSON');
}

if (parsedVersion && parsedVersion.build !== '2026-08-03-globe-r7') {
  errors.push(`version.json build should be 2026-08-03-globe-r7, found ${parsedVersion.build}`);
}

if (!html.includes('2026-08-03-globe-r7')) {
  errors.push('index.html does not expose the r7 build marker');
}

if (errors.length) {
  console.error('UI validation failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('UI interaction wiring is valid.');
