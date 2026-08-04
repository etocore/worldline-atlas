import { access, readFile } from 'node:fs/promises';

const failures = [];
const requiredFiles = [
  'interaction-system.css','interaction-system.js','landmark-visibility.js','apple-controls.css','apple-controls-loader.js','apple-controls.js',
  'ui-state.js','ui-adapters.js','search-index.js','history-catalog.js','history-engine.js','history-engine.css','history-presence-r14.js',
  'history-presence-r14.css','mobile-search-snap-r15.js','mobile-search-snap-r15.css','time-control-r16.js','time-control-r16.css',
  'research-foundation-r17.js','research-foundation-r17.css','atlas-timeline-state-r18.js','atlas-timeline-r18.js','atlas-timeline-r18.css',
  'earth-history.css','earth-history.js','earth-era-context.js','earth-ui-sync.css','earth-ui-sync.js','life-regions-r12.css','r12-ui.js','life-evidence.js'
];

for (const file of requiredFiles) {
  try { await access(file); } catch { failures.push(`Missing UI file: ${file}`); }
}

let build = 'unknown';
try {
  const version = JSON.parse(await readFile('version.json', 'utf8'));
  build = version.build;
} catch {
  failures.push('version.json is not valid JSON');
}

const bootstrap = await readFile('bootstrap.js', 'utf8');
if (!bootstrap.includes(build)) failures.push(`bootstrap.js is missing the current build marker ${build}`);

const checks = [
  ['index.html','id="yearButton"','index.html is missing the time button'],
  ['index.html','id="historySearch"','index.html is missing search'],
  ['bootstrap.js',"loadScript('atlas-timeline-state-r18.js')",'bootstrap.js does not load r18 timeline state'],
  ['bootstrap.js',"loadScript('atlas-timeline-r18.js')",'bootstrap.js does not load r18 timeline controller'],
  ['bootstrap.js',"loadStyle('atlas-timeline-r18.css')",'bootstrap.js does not load r18 timeline styles'],
  ['ui-state.js',"'timeline'",'ui-state.js does not define timeline surface'],
  ['history-engine.js','WorldlineHistory','history engine API is missing'],
  ['research-foundation-r17.js','GLOBAL_LENSES','research runtime does not expose global lenses'],
  ['time-control-r16.js','WorldlineTimelineState','time control does not read r18 state']
];

for (const [path, text, message] of checks) {
  const source = await readFile(path, 'utf8');
  if (!source.includes(text)) failures.push(message);
}

if (failures.length) {
  console.error('UI validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Unified UI wiring is valid.');
