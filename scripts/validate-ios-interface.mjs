import { access, readFile } from 'node:fs/promises';

const failures = [];
const requiredFiles = [
  'ios-interface-r21.js',
  'ios-interface-r21.css',
  'docs/IOS_INTERFACE_STANDARD.md',
  'interaction-system.js',
  'interaction-system.css',
  'bootstrap.js',
  'version.json'
];

for (const file of requiredFiles) {
  try { await access(file); } catch { failures.push(`Missing iOS interface file: ${file}`); }
}

const [runtime, style, standard, interaction, interactionStyle, bootstrap, versionSource] = await Promise.all([
  readFile('ios-interface-r21.js', 'utf8'),
  readFile('ios-interface-r21.css', 'utf8'),
  readFile('docs/IOS_INTERFACE_STANDARD.md', 'utf8'),
  readFile('interaction-system.js', 'utf8'),
  readFile('interaction-system.css', 'utf8'),
  readFile('bootstrap.js', 'utf8'),
  readFile('version.json', 'utf8')
]);

let version;
try { version = JSON.parse(versionSource); } catch { failures.push('version.json is not valid JSON'); }

function requireText(source, token, message) {
  if (!source.includes(token)) failures.push(message);
}

function prohibitText(source, token, message) {
  if (source.includes(token)) failures.push(message);
}

if (version?.build !== '2026-08-04-globe-r21') failures.push('The iOS interface branch must publish the r21 app build');
requireText(bootstrap, "loadStyle('ios-interface-r21.css')", 'Bootstrap does not load the r21 interface styles');
requireText(bootstrap, "loadScript('ios-interface-r21.js')", 'Bootstrap does not load the r21 interface runtime');
requireText(bootstrap, "const BUILD = '2026-08-04-globe-r21'", 'Bootstrap is missing the r21 app build');

// The established interaction system remains the only owner of sheet drag
// capture until a dedicated consolidation refactor replaces it atomically.
requireText(interaction, 'function bindPlaceDrag()', 'The authoritative place-sheet drag controller is missing');
requireText(interaction, 'function bindControlHandleDrag()', 'The authoritative settings-sheet drag controller is missing');
requireText(interactionStyle, '.place-sheet-handle', 'The real place-sheet handle style is missing');
requireText(interactionStyle, '.place-sheet-scroll', 'The real place-sheet scroll container style is missing');
for (const forbidden of ['installDragController', 'setPointerCapture', "addEventListener('pointermove'", '--worldline-sheet-drag-y', "addEventListener('dblclick'"]) {
  prohibitText(runtime, forbidden, `r21 must not install a competing sheet gesture path: ${forbidden}`);
}

requireText(runtime, "full: 'large'", 'The project full detent is not mapped to the semantic large detent');
requireText(runtime, '.place-sheet-handle', 'r21 does not target the actual place-sheet handle');
requireText(runtime, 'RESTORE_FOCUS_REASONS', 'Focus restoration is not gated by dismissal reason');
requireText(runtime, "surface === 'search'", 'Search dismissal is not protected from keyboard-reopening focus restoration');
requireText(runtime, "event.detail !== 0", 'The keyboard alternative is not isolated from pointer activation');
requireText(runtime, "window.__WORLDLINE_INTERACTION_BUILD__", 'r21 does not wait for the authoritative interaction system');

requireText(style, '--worldline-min-hit: 44px', 'The 44px interaction target token is missing');
requireText(style, '.worldline-hit-square', 'Scoped square hit targets are missing');
requireText(style, '.worldline-hit-height', 'Scoped minimum-height targets are missing');
requireText(style, '#placeSheet .place-sheet-scroll', 'The quality layer does not preserve the actual place-sheet scroll container');
requireText(style, ':focus-visible', 'Visible keyboard focus styling is missing');
requireText(style, 'prefers-reduced-motion: reduce', 'Reduced Motion adaptation is missing');
requireText(style, 'prefers-reduced-transparency: reduce', 'Reduced Transparency progressive enhancement is missing');
requireText(style, 'prefers-contrast: more', 'Increased Contrast adaptation is missing');
requireText(style, 'forced-colors: active', 'Forced-colors adaptation is missing');
prohibitText(style, '#placeSheet[data-detent="large"]', 'r21 must not introduce a competing DOM detent name');
prohibitText(style, '--worldline-sheet-drag-y', 'r21 must not override established sheet transforms');
prohibitText(style, 'transition: none', 'Reduced Motion must preserve state feedback with near-zero duration rather than removing transitions');

for (const token of [
  'Apple Human Interface Guidelines',
  'Awesome iOS is a discovery index',
  'one gesture owner',
  'reason-aware focus restoration',
  'full` maps to the semantic `large',
  'current project architecture'
]) {
  requireText(standard, token, `The iOS interface standard is missing: ${token}`);
}

if (failures.length) {
  console.error('iOS interface validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('iOS source hierarchy, gesture ownership, detent semantics, focus behavior, touch targets, and accessibility safeguards are valid.');
