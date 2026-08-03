import { access, readFile } from 'node:fs/promises';
import vm from 'node:vm';

const BUILD = '2026-08-03-globe-r16';
const PRESENCE_BUILD = '2026-08-03-globe-r14';
const requiredFiles = ['history-catalog.js','history-engine.js','history-engine.css','history-presence-r14.js','history-presence-r14.css','docs/HISTORY_RESEARCH_FRAMEWORK.md'];
const failures = [];
for (const file of requiredFiles) { try { await access(file); } catch { failures.push(`Missing history-engine file: ${file}`); } }
const [catalogSource,engine,style,presence,presenceStyle,bootstrap,versionSource,framework] = await Promise.all([
  readFile('history-catalog.js','utf8'),readFile('history-engine.js','utf8'),readFile('history-engine.css','utf8'),readFile('history-presence-r14.js','utf8'),readFile('history-presence-r14.css','utf8'),readFile('bootstrap.js','utf8'),readFile('version.json','utf8'),readFile('docs/HISTORY_RESEARCH_FRAMEWORK.md','utf8')
]);
const context={globalThis:{}};
try{vm.runInNewContext(catalogSource,context,{filename:'history-catalog.js'});}catch(error){failures.push(`History catalog does not execute: ${error.message}`);}
const catalog=context.globalThis.WORLDLINE_HISTORY_CATALOG;
if(!catalog) failures.push('History catalog did not expose WORLDLINE_HISTORY_CATALOG');
function requireText(source,text,message){if(!source.includes(text)) failures.push(message);}
if(catalog){
  const chapters=Array.from(catalog.chapters||[]); const earth=chapters.filter((chapter)=>chapter.timeline==='earth'); const human=chapters.filter((chapter)=>chapter.timeline==='human'); const moments=chapters.flatMap((chapter)=>chapter.moments||[]); const sourceIds=new Set(Object.keys(catalog.sources||{}));
  if(chapters.length<19) failures.push(`History catalog needs at least 19 researched chapters, found ${chapters.length}`);
  if(earth.length<10) failures.push(`Earth History needs at least 10 chapters, found ${earth.length}`);
  if(human.length<9) failures.push(`Human History needs at least 9 chapters, found ${human.length}`);
  if(moments.length<60) failures.push(`History catalog needs at least 60 turning points, found ${moments.length}`);
  if(!earth.some((chapter)=>Number(chapter.olderMa)>=4500)) failures.push('Earth History does not reach planetary formation');
  if(!human.some((chapter)=>Number(chapter.startYear)<=-300000)) failures.push('Human History does not begin at 300,000 years ago');
  for(const chapter of chapters){
    if(!chapter.id||!chapter.title||!chapter.dek||!chapter.overview) failures.push(`Incomplete chapter: ${chapter.id||chapter.title||'unknown'}`);
    if(!Array.isArray(chapter.changes)||chapter.changes.length<3) failures.push(`${chapter.id} needs at least three defining changes`);
    if(!Array.isArray(chapter.moments)||chapter.moments.length<3) failures.push(`${chapter.id} needs at least three key moments`);
    for(const sourceId of chapter.sourceIds||[]) if(!sourceIds.has(sourceId)) failures.push(`${chapter.id} references missing source ${sourceId}`);
  }
}
requireText(catalogSource,'International Commission on Stratigraphy','ICS is missing from the source registry');
requireText(catalogSource,'Smithsonian Human Origins Program','Smithsonian Human Origins is missing from the source registry');
requireText(engine,'openChapter','History chapter opening is missing');
requireText(engine,'WorldlineHistory','History runtime API is missing');
requireText(style,'.history-briefing','History briefing style is missing');
requireText(presence,"id = 'historyPresenceCard'",'The persistent first-load era card is missing');
requireText(presence,'WorldlineHistory?.current','The persistent card is not connected to the selected chapter');
requireText(presence,'WorldlineHistory.open','The persistent card cannot open the researched chapter');
requireText(presence,'worldline:timeline-mode','The persistent card does not update when timeline mode changes');
requireText(presenceStyle,'.history-presence-card','The first-load era card is not styled');
requireText(presenceStyle,'backdrop-filter','The first-load era card lacks the shared material treatment');
requireText(bootstrap,"loadScript('history-catalog.js')",'Bootstrap does not load the history catalog');
requireText(bootstrap,"loadScript('history-engine.js')",'Bootstrap does not load the history engine');
requireText(bootstrap,"loadStyle('history-presence-r14.css')",'Bootstrap does not load the persistent history styling');
requireText(bootstrap,"loadScript('history-presence-r14.js')",'Bootstrap does not load the persistent history runtime');
requireText(framework,'Avoid presenting European labels','The global-history periodization rule is missing');
let version; try{version=JSON.parse(versionSource);}catch{failures.push('version.json is not valid JSON');}
if(version?.build!==BUILD) failures.push(`version.json should be ${BUILD}`);
if(!bootstrap.includes(BUILD)) failures.push(`The r16 production shell is missing ${BUILD}`);
if(!presence.includes(PRESENCE_BUILD)) failures.push(`The first-load history runtime is missing ${PRESENCE_BUILD}`);
if(failures.length){console.error('History-engine validation failed:');failures.forEach((failure)=>console.error(`- ${failure}`));process.exit(1);}
console.log('Researched chronology and first-load history presence are valid in r16.');
