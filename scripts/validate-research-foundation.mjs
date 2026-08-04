import { access, readFile } from 'node:fs/promises';

const failures = [];
const requiredFiles = [
  'data/sources/registry.json',
  'data/manifests/release-manifest.json',
  'docs/RESEARCH_FOUNDATION_R17.md',
  'research-foundation-r17.js',
  'research-foundation-r17.css'
];
for (const file of requiredFiles) {
  try { await access(file); } catch { failures.push(`Missing research foundation file: ${file}`); }
}
let build = 'unknown';
try { build = JSON.parse(await readFile('version.json','utf8')).build; } catch { failures.push('version.json is not valid JSON'); }
const bootstrap = await readFile('bootstrap.js','utf8');
if (!bootstrap.includes(build)) failures.push(`bootstrap.js is missing the current build marker ${build}`);
const checks = [
  ['data/sources/registry.json','claim_authority','Source registry lacks claim-authority fields'],
  ['data/sources/registry.json','not_authority_for','Source registry lacks claim-boundary exclusions'],
  ['data/manifests/release-manifest.json','anchor_worlds','Release manifest lacks anchor worlds'],
  ['docs/RESEARCH_FOUNDATION_R17.md','source registry','Research foundation doc does not explain source registry'],
  ['research-foundation-r17.js','GLOBAL_LENSES','Research runtime does not expose global lenses'],
  ['research-foundation-r17.js','plate-boundary-debug','Research runtime does not hide debug geology'],
  ['research-foundation-r17.css','.research-lens-card','Research lenses are not styled']
];
for (const [path,text,message] of checks) {
  const source = await readFile(path,'utf8');
  if (!source.includes(text)) failures.push(message);
}
if (failures.length) {
  console.error('Research foundation validation failed:');
  failures.forEach((failure)=>console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Research foundation registry, manifest, and UI safeguards are valid.');
