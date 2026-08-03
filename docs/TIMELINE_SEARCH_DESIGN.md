# Compact timeline and predictive search

This document records the design decisions behind Worldline Atlas build `2026-08-03-globe-r8`.

The goal is not to reproduce Apple source code or proprietary assets. The goal is to use familiar iPhone interaction conventions so a first-time user can understand the app without instruction.

## Primary hierarchy

1. The globe remains the product.
2. The date button opens only the timeline.
3. The bottom search field performs only search.
4. Advanced settings appear only after an explicit request.
5. Place information continues to use the separate place-card system.

No primary control should unexpectedly reveal a different tool.

## Compact timeline

Tapping the date chip opens a small material panel near the top of the map. It contains:

- the exact selected year
- the current historical era
- one continuous slider
- timeline playback
- one `More Controls` action

The slider uses a piecewise historical scale instead of allocating equal screen space to every calendar year. This gives early history and recent history usable touch resolution while preserving chronological direction.

The compact timeline does not contain layer switches, source metrics, reconstruction tolerance, or other setup controls. Those belong to advanced settings.

## Advanced settings

The existing bottom sheet is retained as the advanced settings surface. It is restyled as grouped settings and opens from:

- `More Controls` in the compact timeline
- the Worldline brand control

When the settings sheet is open, the search row is hidden. Search and settings never share an active state.

## Search behavior

The search field remains at the bottom of the screen and follows a transient map-search pattern:

- focusing it does not open settings
- suggestions appear above the field
- results update while the user types
- keyboard arrow navigation and Enter are supported
- Escape, Cancel, or tapping the map dismisses search
- selecting a place moves the map and opens its place card
- selecting a year updates the timeline and opens the compact timeline
- reviewed reconstruction packages appear as a distinct suggestion type

When the field is empty, the suggestion list shows reviewed places compatible with the current year rather than exposing private search history.

## Accessibility

- Search uses the combobox, listbox, and option roles.
- The active suggestion is exposed through `aria-activedescendant`.
- The timeline slider supplies an exact spoken year with `aria-valuetext`.
- The date button exposes expanded state.
- The top timeline can be closed without opening another panel.
- Reduced-motion preferences remove timeline and suggestion animations.

## Visual system

The new surfaces use:

- restrained translucent materials
- thin separators
- continuous rounded corners
- white slider thumbs and system-blue progress
- approximately 44-point interaction targets where practical
- immediate pressed states
- progressive disclosure instead of dense persistent controls

## Reference guidance

Apple Human Interface Guidelines:

- Search fields: https://developer.apple.com/design/human-interface-guidelines/search-fields
- Searching: https://developer.apple.com/design/human-interface-guidelines/searching
- Sliders: https://developer.apple.com/design/human-interface-guidelines/sliders
- Sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- Designing for iOS: https://developer.apple.com/design/human-interface-guidelines/designing-for-ios

Open-source interaction references:

- Vaul drawer and detent research: https://github.com/emilkowalski/vaul
- cmdk search and keyboard interaction research: https://github.com/pacocoursey/cmdk
- MapLibre GL JS: https://github.com/maplibre/maplibre-gl-js

No code from Vaul or cmdk is copied into this zero-build application. Their public interaction models were used as research references.
