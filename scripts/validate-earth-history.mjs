import { access, readFile } from 'node:fs/promises';

const failures = [];
const requiredFiles = ['earth-history.js','earth-history.css','docs/EARTH_ENGINE.md','netlify/functions/paleocoastlines.js','atlas-timeline-state-r18.js'];
for (const file of requiredFiles) {
  try { await access(file); } catch { failures.push(`Missing Earth history file: ${file}`); }
}
let build = 'unknown';
try { build = JSON.parse(await readFile('version.json','utf8')).build; } catch { failures.push('version.json is not valid JSON'); }
const bootstrap = await readFile('bootstrap.js','utf8');
if (!bootstrap.includes(build)) failures.push(`bootstrap.js is missing the current build marker ${build}`);
const checks = [
  ['earth-history.js',"const EARTH_DEFAULT_AGE_MA = 250",'Earth History does not default to Pangea at 250 Ma'],
  ['earth-history.js',"const MAX_RECONSTRUCTION_AGE_MA = 1800",'The 1.8 Ga plate-model boundary is missing'],
  ['earth-history.js',"'earth', 'human'",'The Earth and Human timeline modes are missing'],
  ['netlify/functions/paleocoastlines.js',"const MODEL = 'CAO2024'",'The GPlates proxy does not pin CAO2024'],
  ['atlas-timeline-state-r18.js','EARTH_STOPS','r18 state does not expose Earth scale']
];
for (const [path,text,message] of checks) {
  const source = await readFile(path,'utf8');
  if (!source.includes(text)) failures.push(message);
}
if (failures.length) {
  console.error('Earth history validation failed:');
  failures.forEach((failure)=>console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Earth History foundation remains wired and scientifically bounded.');
