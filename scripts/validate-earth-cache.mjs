import { access, readFile } from 'node:fs/promises';

const failures = [];
const requiredFiles = [
  'earth-cache.js', 'life-evidence.js', 'life-regions-r12.css', 'r12-ui.js',
  'data/earth/cache/manifest.json', 'timeline/view.js', 'search/viewport.js'
];
for (const file of requiredFiles) {
  try { await access(file); } catch { failures.push(`Missing cached Earth or life file: ${file}`); }
}

let build = 'unknown';
try { build = JSON.parse(await readFile('version.json', 'utf8')).build; } catch { failures.push('version.json is not valid JSON'); }
const bootstrap = await readFile('bootstrap.js', 'utf8');
if (!bootstrap.includes(build)) failures.push(`bootstrap.js is missing the current build marker ${build}`);

const checks = [
  ['bootstrap.js', "loadScript('earth-cache.js')", 'The Earth cache runtime is not loaded'],
  ['earth-cache.js', "url.pathname === '/api/paleocoastlines'", 'The cache does not intercept paleocoastline requests'],
  ['life-evidence.js', "id: 'life-region-icons'", 'Illustrated life-region symbols are missing'],
  ['life-evidence.js', 'Life in this area', 'The regional life sheet is missing'],
  ['life-evidence.js', 'View fossil evidence', 'Evidence is not hidden behind a deliberate action'],
  ['timeline/view.js', 'schedulePreview', 'The canonical timeline does not schedule lightweight coastline previews'],
  ['timeline/view.js', '/api/paleocoastlines?time=', 'The canonical timeline does not request paleocoastline previews']
];
for (const [path, text, message] of checks) {
  const source = await readFile(path, 'utf8');
  if (!source.includes(text)) failures.push(message);
}

const viewport = await readFile('search/viewport.js', 'utf8');
if (/timelinePrimarySlider|snapTimeline|timeline-hud/.test(viewport)) {
  failures.push('The search viewport controller still owns retired timeline snapping behavior');
}

if (failures.length) {
  console.error('Cached Earth and life-region validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('GitHub-cached Earth, canonical coastline preview, and regional life evidence are valid.');
