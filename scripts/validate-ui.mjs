import { readFile, access } from 'node:fs/promises';

const BUILD = '2026-08-03-globe-r14';
const requiredFiles = [
  'interaction-system.css','interaction-system.js','landmark-visibility.js','apple-controls.css','apple-controls-loader.js','apple-controls.js','ui-state.js','ui-adapters.js','search-index.js','history-catalog.js','history-engine.js','history-engine.css','history-presence-r14.js','history-presence-r14.css','r9-polish.css','earth-history.css','earth-history.js','earth-era-context.js','earth-ui-sync.css','earth-ui-sync.js','life-regions-r12.css','r12-ui.js','life-evidence.js','netlify/functions/place-summary.js','netlify/functions/paleocoastlines.js'
];
const errors = [];
for (const path of requiredFiles) { try { await access(path); } catch { errors.push(`Missing required UI file: ${path}`); } }

const [html,bootstrap,netlify,version,appleControls,appleLoader,uiState,uiAdapters,searchIndex,historyEngine,historyStyle,historyPresence,historyPresenceStyle,earthHistory,earthContext,earthSync,r12Ui,r12Style,lifeRuntime] = await Promise.all([
  readFile('index.html','utf8'),readFile('bootstrap.js','utf8'),readFile('netlify.toml','utf8'),readFile('version.json','utf8'),readFile('apple-controls.js','utf8'),readFile('apple-controls-loader.js','utf8'),readFile('ui-state.js','utf8'),readFile('ui-adapters.js','utf8'),readFile('search-index.js','utf8'),readFile('history-engine.js','utf8'),readFile('history-engine.css','utf8'),readFile('history-presence-r14.js','utf8'),readFile('history-presence-r14.css','utf8'),readFile('earth-history.js','utf8'),readFile('earth-era-context.js','utf8'),readFile('earth-ui-sync.js','utf8'),readFile('r12-ui.js','utf8'),readFile('life-regions-r12.css','utf8'),readFile('life-evidence.js','utf8')
]);

function requireText(source,text,message){ if(!source.includes(text)) errors.push(message); }
for (const id of ['sheetScrim','placeSheet','placeSheetHandle','placeClose','placeTitle','placeSubtitle','placeSummary','placeEvidence','placeSource','placeExpand','yearButton','historySearch','controlPanel']) if(!html.includes(`id="${id}"`)) errors.push(`index.html is missing #${id}`);
for (const asset of ['interaction-system.css','interaction-system.js']) if(!html.includes(asset)) errors.push(`index.html does not load ${asset}`);
for (const asset of ['landmark-visibility.js','apple-controls.css','apple-controls-loader.js','ui-state.js','ui-adapters.js','search-index.js','history-catalog.js','history-engine.js','history-engine.css','history-presence-r14.js','history-presence-r14.css','r9-polish.css','earth-history.css','earth-history.js','earth-era-context.js','earth-ui-sync.css','earth-ui-sync.js','life-regions-r12.css','r12-ui.js','life-evidence.js']) if(!bootstrap.includes(asset)) errors.push(`bootstrap.js does not load ${asset}`);
for (const dependency of ['__WORLDLINE_INTERACTION_BUILD__','__WORLDLINE_UI_ADAPTERS_BUILD__','WorldlineUI','WorldlineSearch']) if(!appleLoader.includes(dependency)) errors.push(`apple-controls-loader.js does not wait for ${dependency}`);
for (const runtimeId of ['timelineHud','timelinePrimarySlider','advancedControlsButton','searchSuggestions','searchCancel']) if(!appleControls.includes(runtimeId)) errors.push(`apple-controls.js does not create #${runtimeId}`);
for (const surface of ['timeline','search','settings','place']) if(!uiState.includes(`'${surface}'`)) errors.push(`ui-state.js does not define the ${surface} surface`);
for (const capability of ['wrapSearch','openChapter','renderBriefing','WorldlineHistory']) if(!historyEngine.includes(capability)) errors.push(`history-engine.js is missing ${capability}`);
for (const capability of ['timelineModeControl','timelineMilestones','WorldlineEarthHistory','paleo-coastlines']) if(!earthHistory.includes(capability)) errors.push(`earth-history.js is missing ${capability}`);
requireText(r12Ui,"document.body.classList.add('worldline-r12')",'The r12 visual system is not activated');
requireText(lifeRuntime,'Life in this area','The regional life detail experience is missing');
requireText(historyStyle,'.history-briefing','The researched chapter sheet is not styled');
requireText(historyPresence,"id = 'historyPresenceCard'",'The first-load history card is missing');
requireText(historyPresenceStyle,'.history-presence-card','The first-load history card is not styled');
requireText(netlify,'Cache-Control = "public, max-age=0, must-revalidate"','Static assets are not configured to revalidate');
let parsedVersion; try { parsedVersion = JSON.parse(version); } catch { errors.push('version.json is not valid JSON'); }
if(parsedVersion?.build!==BUILD) errors.push(`version.json build should be ${BUILD}, found ${parsedVersion?.build}`);
for (const source of [bootstrap,historyPresence]) if(!source.includes(BUILD)) errors.push(`An r14 runtime is missing the ${BUILD} marker`);
if(errors.length){ console.error('UI validation failed:'); errors.forEach((error)=>console.error(`- ${error}`)); process.exit(1); }
console.log('Unified UI, first-load history presence, regional life, search, timeline, and place-sheet wiring are valid.');
