# Unified UI state and historical search

Worldline Atlas build `2026-08-03-globe-r9` replaces independent overlay behavior with one shared interaction state.

## One active surface

The application recognizes four temporary surfaces:

- `timeline`
- `search`
- `settings`
- `place`

Only one may be active at a time. Opening a new surface closes the previous one before the new surface appears. The map remains the persistent background and is not itself a surface.

`ui-state.js` owns the active state, emits `worldline:ui-state` events, and writes the current surface to `body[data-ui-surface]`. It also watches the DOM for older interaction paths that directly open a sheet. If two panels become visible, it keeps the most recently opened panel and closes the others.

`ui-adapters.js` connects the preexisting settings sheet and place card to the state manager. The compact timeline and search surface register their own adapters when `apple-controls.js` starts.

## Transition rules

- Tapping the date chip activates `timeline`.
- Focusing the search field activates `search` without opening settings.
- Tapping the Worldline button or `More Controls` activates `settings`.
- Selecting a map feature or search result activates `place`.
- Escape, a close control, or a relevant outside tap returns the application to `none`.
- Tapping search while the timeline is open replaces the timeline directly.
- Legacy handlers are observed and reconciled instead of being allowed to create overlapping panels.

## Historical search index

`search-index.js` builds a local, zero-key search index from:

- reviewed settlements in `data.js`
- reconstruction packages
- historical aliases and former names
- named periods
- selected civilizations, empires, and cultural contexts
- explicit years, centuries, and decades

Examples:

- `Istanbul in 1000` resolves to Constantinople.
- `Warka 2500 BCE` resolves to Uruk.
- `Heian-kyo` resolves to Kyoto.
- `Mexico City 1500` resolves to Tenochtitlan.
- `5th century BCE` resolves to the midpoint of that century.
- `Roman Empire` opens a dated context view without claiming a precise reconstructed boundary.
- `Rome 117 CE` prioritizes the reviewed Rome reconstruction package.

Historical aliases are search aids, not claims that names were interchangeable in every period. Search results continue to expose the reviewed date range and evidence status.

## Result types

- **Exact date** changes the timeline.
- **Reviewed place** moves to a settlement and opens its place card.
- **Reviewed reconstruction** activates a reconstruction package.
- **Historical period** changes the timeline to a representative year.
- **Context view** sets a representative time and camera for a civilization or state, then explicitly states that no precise boundary is being claimed.

## Reliability checks

GitHub Actions now checks:

- JavaScript syntax for every interaction and search runtime
- reconstruction package integrity
- required UI files and build markers
- runtime loading order
- the four registered UI surfaces
- historical alias and time parsing regressions

The search regression suite includes Istanbul, Warka, Heian-kyo, the Roman Empire, fifth-century BCE parsing, Rome 117 CE, and Mexico City before the Spanish conquest.
