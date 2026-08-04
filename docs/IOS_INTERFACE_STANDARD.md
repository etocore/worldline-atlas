# Worldline Atlas iOS Interface Standard

Status: Active design contract

Worldline Atlas is a web application, not a replica of Apple Maps. This standard adapts durable iOS interaction principles to a MapLibre globe while preserving the product's scientific identity.

The objective is not to add more glass, blur, rounded rectangles, or animation. The objective is to make the globe feel direct, calm, spatially coherent, and native on iPhone and iPad.

## Source hierarchy

Use sources in this order:

1. Current Apple Human Interface Guidelines.
2. Current behavior of first-party iOS map, search, sheet, slider, and accessibility interfaces.
3. Maintained open-source references discovered through `sindresorhus/awesome` and `vsouza/awesome-ios`.
4. Worldline-specific usability evidence and regression tests.

Open-source components are references, not automatic dependencies. Do not import a library solely to reproduce a visual effect that can be implemented clearly in the existing static application.

## Product hierarchy

The globe is the primary content surface.

At rest, the interface should expose only what is necessary to answer three questions:

1. What time am I viewing?
2. What part of Earth am I viewing?
3. What can I do next?

Controls must not compete equally. At any moment there is one primary surface:

- Globe
- Timeline
- Search
- Place or evidence card
- Advanced settings

Opening one primary surface closes or transforms the previous surface. No two modal surfaces may overlap.

## Map-first rules

- Preserve direct pan, pinch, rotate, and tilt gestures across the largest possible area.
- Avoid placing noninteractive decoration over interactive geography.
- Increase historical and geographic detail progressively with zoom.
- Recede secondary evidence when it would obscure the physical world.
- Keep the selected place, date, or evidence object visually connected to its map location.
- Never move the camera merely because the software keyboard appears.
- Restore the user's prior camera state when dismissing a temporary search preview unless they explicitly commit to the result.

## Persistent chrome budget

On a compact iPhone viewport, persistent UI may occupy no more than:

- One compact date or timeline affordance near the top.
- One compact search affordance near the bottom.
- One grouped map-control cluster.

Everything else is transient or disclosed through a sheet.

The resting state must leave at least 85 percent of the viewport visually available to the globe. Transparent overlays still count as occupied space when their edges, shadows, or text attract attention.

## Visual system

### Materials

Use material to establish hierarchy, not decoration.

- Thin material: compact controls over low-detail map regions.
- Regular material: search suggestions, timeline controls, and place cards.
- Opaque or near-opaque material: dense settings content where readability matters more than geographic context.
- Increase opacity when map luminance or texture makes text difficult to read.

Avoid stacking multiple translucent surfaces. A sheet should absorb or replace the control that opened it rather than floating above a visually identical control.

### Shape

- Use continuous-looking corner radii that harmonize with the enclosing device and neighboring controls.
- Group related buttons inside one shared capsule or rounded container.
- Do not place every row inside its own card.
- Prefer spacing and separators over nested borders.

### Typography

Use the system font stack. Do not distribute Apple font files.

- The selected date is the dominant interface value.
- Place names and period names use semantic hierarchy, not arbitrary boldness.
- Use no more than three visible text levels in a compact surface.
- Avoid uppercase except for short scientific abbreviations.
- Keep explanatory copy out of the resting map state.
- Support Dynamic Type-like scaling through `clamp()` and user text-size settings without clipping or overlap.

### Color

- Use semantic colors rather than fixed decorative colors.
- Reserve blue for actions and selection.
- Evidence confidence must not rely on color alone.
- Historical periods may use restrained accent colors only when labels and symbols remain independently understandable.
- Maintain readable contrast over both bright ice and dark ocean imagery.

## Touch and pointer behavior

- Interactive targets must be at least 44 by 44 CSS pixels, even when the visible glyph is smaller.
- Adjacent targets need enough separation to prevent accidental activation during map movement.
- A tap must not be interpreted as a drag after map movement exceeds the interaction threshold.
- Press feedback should begin immediately and remain subtle.
- Hover behavior may enhance desktop use but can never be required.
- Long press must have a discoverable alternative.

## Motion

Motion must preserve spatial context.

- A compact control expands into its detailed surface from the same visual origin.
- Dismissal returns toward that origin.
- Interactive sheets track the finger directly and may be interrupted.
- Camera movement and interface movement should not compete simultaneously unless the transition explicitly connects a result to its location.
- Prefer transform and opacity animations that remain smooth on mobile Safari.
- Avoid ornamental bounce, liquid transitions, and delayed cascades.
- Respect `prefers-reduced-motion`; reduced motion must retain state clarity rather than simply removing all feedback.

Recommended motion roles:

- Press response: 100 to 160 ms.
- Small state transition: 180 to 260 ms.
- Sheet or major spatial transition: 300 to 450 ms with an interruptible spring-like curve.

These are starting ranges, not universal constants. Perceived distance and interaction velocity determine the final duration.

## Timeline

The timeline is a navigation instrument, not a settings form.

### Compact state

Show:

- Selected time.
- Current named interval or milestone when useful.
- A clear affordance to expand.

Do not show duplicated dates, explanatory paragraphs, evidence controls, or multiple competing sliders.

### Expanded state

- Preserve the selected date's position during expansion.
- Use one authoritative timeline controller.
- Provide free scrubbing plus magnetic milestone snapping.
- Increase milestone density as temporal scale narrows, analogous to map-detail disclosure by zoom.
- Keep the thumb and labels clear of the finger where possible.
- Announce the selected time accessibly while avoiding excessive announcements during continuous dragging.
- Playback must be pausable from the same control and stop when another primary surface takes control.

### Temporal zoom

A future temporal zoom model should reveal more detail without switching mental models:

- Deep time: eons, eras, major tectonic and biological events.
- Recent Earth history: glacial cycles and environmental transitions.
- Human history: periods, cultures, settlements, political events, and exact years.

The interface must distinguish evidence resolution from timeline input resolution.

## Search

Search is a temporary mode, not a route into settings.

### Resting state

- Use a compact field or button with a clear historical-search prompt.
- Do not continuously display suggestions.

### Focused state

- Anchor the search surface to the iOS visual viewport.
- Keep it directly above the software keyboard.
- Keep the globe stationary.
- Hide or recede unrelated map controls.
- Limit the visible result set and allow independent scrolling.
- Keep Cancel available and predictable.

### Results

Each result should communicate:

- Primary name.
- Result type.
- Relevant date or coverage.
- Reconstruction or evidence availability when applicable.

Do not use unexplained decorative icons or colors as the only result classification.

Selecting a result should preview or commit through an explicit, consistent rule. Search must never fabricate a place, date, boundary, or reconstruction.

## Sheets and cards

Use a small number of meaningful detents rather than arbitrary heights.

Recommended roles:

- Peek: identity, selected date, confidence summary, and one primary action.
- Medium: synopsis, layer availability, and key evidence.
- Large: full evidence, sources, settings, or editorial details.

Rules:

- The map remains interactive only when that behavior is obvious and does not conflict with sheet gestures.
- The grabber is shown only when dragging is supported.
- Content must not jump between detents.
- Scroll begins only after the sheet reaches its appropriate expanded detent.
- Dismissal restores focus to the invoking control or selected map feature.
- Advanced settings and place information are distinct surfaces, even if they share the same sheet engine.

## Accessibility

Accessibility is part of the interaction architecture.

- Every icon-only control needs an accessible name and state.
- Focus order must match visual and task hierarchy.
- Opening a modal surface moves focus into it; closing it restores focus.
- Search suggestions use correct combobox and listbox semantics.
- Slider values expose human-readable dates rather than internal normalized values.
- Evidence confidence and uncertainty are stated in text.
- Map points require accessible alternatives through search, lists, or selected-feature cards.
- Support keyboard navigation and Escape dismissal.
- Preserve usability at 200 percent browser zoom.
- Test VoiceOver behavior on iPhone Safari before release.
- Do not disable pinch zoom at the page level.

## Safe areas and responsive behavior

- Use all four safe-area insets.
- Treat the software keyboard through `VisualViewport`, not guessed device heights.
- Test compact and large iPhones in portrait and landscape.
- On iPad, avoid stretching an iPhone sheet across the full width; use an appropriate centered or edge-attached presentation.
- Pointer and keyboard affordances should appear on iPad without changing the touch-first hierarchy.
- Do not hard-code behavior to a particular notch, Dynamic Island, or device model.

## Performance standard

The interface must remain responsive while the globe renders and data loads.

- Press feedback must not wait for a network request.
- Avoid layout thrashing during timeline scrubbing and keyboard changes.
- Keep expensive blur areas small.
- Prefer one composited material surface over several overlapping filters.
- Defer nonessential content until a sheet reaches the detent where it becomes visible.
- Maintain stable DOM identity for controls that morph between compact and expanded states.

## Prohibited patterns

Worldline Atlas should not:

- Add blur merely to appear native.
- Stack a popup over a sheet over the map.
- Duplicate the selected date in several nearby controls.
- Use tiny visible buttons with tiny hit areas.
- force the globe to resize when the keyboard opens.
- Trigger settings from search focus.
- Hide critical actions behind undiscoverable gestures.
- Animate every child element separately.
- use color as the sole evidence or confidence signal.
- Present modern satellite imagery as a historical reconstruction.
- Copy Apple branding, proprietary assets, or private APIs.

## Initial implementation sequence

1. Consolidate design tokens for material, shape, typography, spacing, touch size, and motion.
2. Refactor timeline, search, and sheets to use one shared primary-surface and transition contract.
3. Replace arbitrary panel sizing with named sheet detents.
4. Add zoom-dependent map and timeline detail policies.
5. Add focus restoration, VoiceOver labels, slider value text, keyboard navigation, and 200 percent zoom checks.
6. Add visual and interaction regression tests for current compact and large iPhone sizes plus iPad.
7. Conduct a reduction pass that removes any control, label, border, or animation that does not support the current task.

## Pull request acceptance checklist

A UI pull request is not complete until it answers yes to all applicable questions:

- Is the globe still the dominant surface at rest?
- Is there exactly one primary interface surface open?
- Can every action be completed with touch, keyboard, and assistive technology where applicable?
- Are all touch targets at least 44 by 44 CSS pixels?
- Does opening the keyboard leave the globe camera stable?
- Does motion preserve origin, destination, and state?
- Is reduced-motion behavior understandable?
- Does content remain readable over bright and dark map regions?
- Does the layout survive safe areas, landscape, 200 percent zoom, and larger text?
- Are date, evidence, uncertainty, and reconstruction claims explicit?
- Was unnecessary chrome removed before new chrome was added?

## Immediate audit target

The existing `apple-controls.css` already establishes system fonts, semantic color variables, materials, compact search, timeline motion, and reduced-motion handling. The first engineering pass should therefore focus on structural gaps:

- Replace separate overlay behavior with a shared morphing surface model.
- Define named sheet detents and gesture ownership.
- Enforce 44-pixel hit targets throughout.
- Add contrast adaptation for changing globe imagery.
- Add accessible slider text and focus restoration.
- Reduce nested cards and duplicated borders inside advanced settings.
- Connect map zoom and temporal scale to progressive information disclosure.
