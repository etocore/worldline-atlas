import { access, readFile } from 'node:fs/promises';

const failures = [];
const requiredFiles = ['history-catalog.js','history-engine.js','history-engine.css','history-presence-r14.js','history-presence-r14.css','docs/HISTORY_RESEARCH_FRAMEWORK.md'];
for (const file of requiredFiles) {
  try { await access(file); } catch { failures.push(`Missing history-engine file: ${file}`); }
}
let build = 'unknown';
try { build = JSON.parse(await readFile('version.json','utf8')).build; } catch { failures.push('version.json is not valid JSON'); }
const bootstrap = await readFile('bootstrap.js','utf8');
if (!bootstrap.includes(build)) failures.push(`bootstrap.js is missing the current build marker ${build}`);
const checks = [
  ['history-catalog.js','International Commission on Stratigraphy','ICS is missing from the source registry'],
  ['history-catalog.js','Smithsonian Human Origins Program','Smithsonian Human Origins is missing from the source registry'],
  ['history-engine.js','openChapter','History chapter opening is missing'],
  ['history-engine.js','WorldlineHistory','History runtime API is missing'],
  ['history-presence-r14.js',"id = 'historyPresenceCard'",'The persistent first-load era card is missing'],
  ['docs/HISTORY_RESEARCH_FRAMEWORK.md','Avoid presenting European labels','The global-history periodization rule is missing']
];
for (const [path,text,message] of checks) {
  const source = await readFile(path,'utf8');
  if (!source.includes(text)) failures.push(message);
}
if (failures.length) {
  console.error('History-engine validation failed:');
  failures.forEach((failure)=>console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Researched chronology and first-load history presence are valid.');
