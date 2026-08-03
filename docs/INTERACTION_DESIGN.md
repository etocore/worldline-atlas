# Worldline Atlas interaction system

This document records the interaction principles behind the mobile map UI. The goal is not to imitate Apple assets or copy private implementation details. The goal is to use established platform conventions so the map feels immediately understandable on a phone.

## Product hierarchy

1. The map is the primary surface.
2. Search and time controls remain compact until requested.
3. Selecting a place opens a place card rather than a floating desktop popup.
4. The user can always return to the map with one tap or one downward gesture.
5. Historical context and reconstruction evidence remain visibly separate.

## Sheets and detents

The control panel has two states:

- `compact`: search remains available while the map dominates.
- `expanded`: timeline, evidence, layers, and reconstruction settings are visible.

Place cards have four states:

- `closed`
- `peek`
- `medium`
- `full`

The place card is nonmodal at `peek`, allowing the user to continue reading the map. Medium and full states use a subtle scrim and can be dismissed by tapping outside, pressing Escape, tapping close, or dragging downward.

The motion curve follows the spring-like timing commonly used by open-source mobile drawer systems: `cubic-bezier(.32, .72, 0, 1)`. No Vaul source code is included.

## Touch behavior

- Visible markers remain visually small.
- Invisible hit layers expand each point to roughly 44-60 CSS pixels depending on zoom.
- Coarse-pointer selection queries a nearby screen-space box rather than requiring a pixel-perfect tap.
- MapLibre's `clickTolerance` is increased to distinguish taps from small finger movement.
- Every visible button has a minimum interactive dimension near 44 CSS pixels or a larger invisible hit region.
- Controls show an immediate pressed state.

## Place cards

Desktop map popups are hidden. A selection opens the same place-card system on mobile and desktop.

A place card contains:

- name and historical classification
- date range
- evidence class and confidence
- a concise Wikipedia synopsis when available
- a reference image when available
- atlas-specific evidence notes
- a direct source action

Wikipedia context is supplemental. Dates, confidence, geometry, and reconstruction claims continue to come from the atlas record and its cited sources.

## Globe-level discoverability

Reviewed settlements remain visible at the whole-Earth camera level. Labels use collision handling and do not overlap freely. This preserves a clean globe while ensuring the historical layer does not appear empty until the user zooms in.

## Accessibility

- Place details use a labelled dialog region.
- Open panels can be dismissed with Escape.
- Dynamic status text uses live regions where appropriate.
- Reduced-motion preferences remove sheet transitions.
- Button and sheet controls use explicit accessible names.

## Reference systems

- Apple Human Interface Guidelines: Maps, Sheets, Buttons, and touch interaction
  - https://developer.apple.com/design/human-interface-guidelines/maps
  - https://developer.apple.com/design/human-interface-guidelines/sheets
  - https://developer.apple.com/design/human-interface-guidelines/buttons
- MapLibre GL JS interaction APIs
  - https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/
- Vaul open-source drawer interaction research
  - https://github.com/emilkowalski/vaul

## Validation requirements

The static UI validator checks that:

- all place-card elements expected by the runtime exist
- the interaction CSS and JavaScript are loaded
- the landmark-visibility runtime is loaded
- the Netlify synopsis route exists
- the version marker matches the current interaction build

These checks prevent an implementation file from being committed without being connected to the deployed application.
