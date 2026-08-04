# Worldline Atlas iOS Interface Standard

Status: active design and engineering contract  
Reviewed for r21: 2026-08-04

Worldline Atlas is a web-based spatial application, not an Apple Maps replica. The objective is to apply durable iOS interaction principles to the MapLibre globe while preserving Worldline's scientific identity, current project architecture, and uncertainty rules.

The interface succeeds when the Earth feels direct, calm, legible, and responsive. It does not succeed merely because it uses blur, rounded rectangles, or spring-like curves.

## Research hierarchy

Use evidence in this order:

1. **Current Apple Human Interface Guidelines** for hierarchy, maps, search, sheets, gestures, accessibility, motion, and input.
2. **Current first-party iOS system behavior**, especially `UISheetPresentationController`, native search, Maps, sliders, scroll views, VoiceOver, Reduce Motion, and Increase Contrast.
3. **Web platform standards and current Safari behavior**, including Pointer Events, safe-area environment variables, `VisualViewport`, media queries, keyboard focus, and semantic HTML.
4. **Maintained open-source references** discovered through `sindresorhus/awesome` and `vsouza/awesome-ios`.
5. **Worldline-specific evidence**, regression tests, device testing, and the established interaction architecture.

Awesome iOS is a discovery index, not the design authority. It is useful for locating implementation references in gesture handling, layout, maps, keyboard behavior, animation, scroll views, sliders, and UI testing. A listed library is not automatically current, appropriate, accessible, or necessary.

Do not add a dependency solely to imitate Apple styling. Open-source examples may inform behavior, but the production implementation must be evaluated against current Apple guidance, current browser support, maintenance status, accessibility, bundle cost, and compatibility with this repository.

## Compatibility with the existing project

The r21 work must preserve these established systems:

- `WorldlineUI` remains the one-active-surface state manager.
- `interaction-system.js` remains the one gesture owner for settings and place sheets until it is replaced atomically in a dedicated refactor.
- The authoritative r18 timeline controller remains the only timeline state source.
- Existing iPhone keyboard and `VisualViewport` protections remain intact.
- Search remains separate from advanced settings.
- The globe remains the primary surface.
- Scientific evidence, uncertainty, provenance, and reconstruction boundaries remain visible and honest.
- The surface engine's r20 package identity remains independent from later application UI release numbers.

A UI layer must adapt these systems rather than bind a second set of pointer handlers over them.

## Product hierarchy

At any moment, there is one primary surface:

- Globe
- Timeline
- Search
- Place or evidence details
- Advanced settings

Opening one primary surface closes or transforms the previous surface. Two modal surfaces must never overlap. A nonmodal place card may coexist visually with the map only when map interaction remains obvious and gesture ownership is unambiguous.

At rest, the interface should answer three questions:

1. What time am I viewing?
2. What part of Earth am I viewing?
3. What can I do next?

## Map-first rules

- Preserve direct pan, pinch, rotate, and tilt gestures across the largest possible area.
- Increase historical and geographic detail progressively with map zoom.
- Recede secondary controls when the user manipulates the globe.
- Keep a selected place, date, or evidence object visually connected to its map location.
- Do not move or resize the globe merely because the software keyboard appears.
- Do not disable map controls for a small nonmodal card. Background interaction may be suppressed only when a large or modal surface makes that expectation clear.
- Avoid decoration over interactive geography.

## Persistent chrome budget

On a compact iPhone viewport, the resting state may expose:

- One compact date or timeline affordance.
- One compact search affordance.
- One grouped map-control cluster.

Everything else is transient or progressively disclosed. The globe must remain visually dominant.

## Visual system

### Materials

Material establishes hierarchy rather than decoration.

- Compact controls may use a restrained translucent material.
- Search suggestions, the timeline, and place cards may use regular material.
- Dense settings may become nearly opaque for legibility.
- Never stack several visually equivalent glass surfaces.
- Reduced Transparency must produce an opaque, readable fallback.

### Shape and grouping

- Use consistent continuous-looking corner radii.
- Group related actions in shared containers.
- Prefer spacing and separators to nested cards and repeated borders.
- A control expanding into a sheet should be visually absorbed by that sheet rather than remaining as duplicate chrome beneath it.

### Typography

- Use the system font stack without distributing Apple font files.
- The selected date is the dominant interface value.
- Place names, periods, evidence labels, and body copy must use semantic hierarchy.
- Keep compact surfaces to no more than three visible text levels.
- Support larger text and 200 percent browser zoom without clipping.
- Avoid uppercase except for short scientific abbreviations.

### Color and contrast

- Reserve blue for action and selection.
- Evidence confidence must never rely on color alone.
- Maintain legibility over bright ice, pale terrain, satellite texture, and dark ocean.
- Support Increased Contrast and forced-colors environments.

## Touch, pointer, and keyboard behavior

- Touch targets must provide at least a 44 by 44 CSS-pixel activation region.
- Do not force every text button or field to be 44 pixels wide. Use scoped minimum height, square sizing for icon buttons, or invisible hit slop.
- A visible grabber may be smaller than 44 pixels only when its activation region is at least 44 pixels.
- Press feedback begins immediately and remains subtle.
- Hover may enhance pointer use but cannot be required.
- Long press and drag-only actions need discoverable alternatives.
- Every pointer sequence has one gesture owner.
- Pointer capture, cancellation, and lost capture must be handled by that owner.
- Horizontal timeline input must not initiate vertical sheet movement.
- Keyboard focus must remain visible.

## Gesture ownership

There must be one gesture owner for each draggable surface.

For r21:

- `interaction-system.js` owns the settings handle drag.
- `interaction-system.js` owns the place-sheet drag.
- `ios-interface-r21.js` may observe and describe state, add accessibility metadata, and add nonconflicting keyboard alternatives.
- `ios-interface-r21.js` must not install `pointermove`, pointer capture, release projection, transform, or detent-sizing logic.

A future shared sheet engine must replace the old handlers in the same change that installs the new controller. It may not coexist with them.

## Sheets and semantic detents

Use a small number of meaningful states:

- **Peek**: identity, date or range, confidence summary, and one primary action.
- **Medium**: synopsis, layer availability, and key evidence.
- **Large**: full evidence, sources, settings, or editorial detail.

The current place-card DOM uses `full`; for r21, `full` maps to the semantic `large` detent. Do not add a competing `large` DOM selector until the authoritative interaction system is migrated atomically.

Rules:

- Content must not jump between detents.
- Sheet movement follows the finger directly.
- Scroll and sheet expansion must not fight for the same gesture.
- Internal scrolling begins only at an appropriate expanded state.
- The grabber is exposed only when dragging works.
- A button or another visible control must provide an alternative to dragging.
- Settings and place information remain distinct surfaces even if they eventually share an engine.
- Swipe-down dismissal from peek must be explicit, tested, and coordinated with map interaction before release.

## Focus and dismissal

Use reason-aware focus restoration.

- Keyboard and assistive dismissals such as Escape or an explicit close button may restore focus to the launcher.
- Pointer dismissals such as map taps, scrim taps, or committed navigation should not unexpectedly move focus.
- Closing search must not refocus the search input and reopen the software keyboard.
- Moving directly from one primary surface to another must not briefly restore focus to the old launcher.
- A map-selected place may have no DOM launcher; do not invent a misleading fallback focus target.

## Motion

Motion preserves spatial context.

- A surface should expand from a recognizable origin when practical.
- Interactive movement must be interruptible.
- Prefer transforms and opacity over layout-heavy animation.
- Avoid ornamental bounce, liquid effects, and delayed child cascades.
- Use the project's established spring-like easing only where it communicates movement between states.
- Reduced Motion must preserve state feedback. Use near-zero durations rather than removing transitions in ways that can break Safari state completion.

Typical starting ranges:

- Press response: 100 to 160 ms.
- Small state transition: 180 to 260 ms.
- Major sheet transition: 300 to 450 ms.

These are tuning ranges, not fixed requirements.

## Timeline

The timeline is a navigation instrument, not a settings form.

- Keep one authoritative timeline controller.
- Show one selected date and one useful period or milestone label in compact state.
- Preserve the selected date during expansion.
- Support free scrubbing and magnetic milestone snapping.
- Increase milestone density as temporal scale narrows.
- Expose human-readable dates to assistive technology.
- Stop playback when another primary surface takes control.
- Never reintroduce duplicate date chrome or parallel timeline state.

## Search

Search is a temporary mode, not a route into settings.

- The prompt should describe searchable content. The current era/place/event/time wording is appropriate.
- Keep the globe stationary when the keyboard appears.
- Anchor the focused search surface to the visual viewport above the keyboard.
- Show the strongest matches first and update predictively.
- Limit visible suggestions and make the list independently scrollable.
- Keep Cancel predictable.
- State result type, relevant time, and evidence or reconstruction availability in text.
- Never fabricate a place, date, boundary, or reconstruction.

## Accessibility

- Every icon-only control has an accessible name and state.
- Search retains combobox and listbox semantics.
- Sliders expose human-readable values.
- Evidence uncertainty is stated in text.
- Map features have alternatives through search and place cards.
- Escape dismisses the current primary surface.
- Focus order follows task hierarchy.
- VoiceOver, keyboard, larger text, 200 percent zoom, Reduce Motion, Reduce Transparency, Increase Contrast, and forced colors are release criteria.
- Do not disable browser pinch zoom.

## Safe areas and responsive behavior

- Use all safe-area insets.
- Use `VisualViewport` for the software keyboard rather than guessed device heights.
- Test compact and large iPhones in portrait and landscape.
- On iPad and desktop, preserve the existing edge-attached place-card behavior rather than forcing every surface into an iPhone bottom sheet.
- Do not hard-code behavior for a specific notch or Dynamic Island.

## Performance

- Input feedback cannot wait for data or network requests.
- Avoid layout reads and writes inside unthrottled pointer movement.
- Keep blur regions small.
- Preserve stable DOM identity for persistent controls.
- Defer content that is not visible at the current detent.
- Avoid MutationObserver loops that repeatedly rewrite unchanged attributes.

## Prohibited patterns

Worldline Atlas must not:

- Add blur merely to appear native.
- Install duplicate pointer handlers on one sheet.
- Introduce a second detent vocabulary without a migration plan.
- Reopen the iOS keyboard through careless focus restoration.
- Stack a popup over a sheet over the map.
- Duplicate the selected date in nearby controls.
- Hide critical actions behind an undiscoverable gesture.
- Disable the map for a small nonmodal place card.
- Remove all motion feedback under Reduce Motion.
- Present modern satellite imagery as historical reconstruction.
- Copy Apple branding, proprietary assets, or private APIs.

## Release gates

A UI pull request is incomplete until all applicable answers are yes:

- Is the globe dominant at rest?
- Is exactly one primary surface active?
- Is there exactly one gesture owner per draggable surface?
- Are semantic detents mapped to the existing implementation without conflict?
- Can each gesture-only action also be completed visibly or with a keyboard?
- Are touch activation regions at least 44 by 44 CSS pixels?
- Does search remain stable above the iOS keyboard?
- Does search dismissal avoid reopening the keyboard?
- Does focus restoration depend on dismissal reason?
- Do map and sheet gestures remain independent?
- Is Reduced Motion understandable and reliable?
- Are Reduced Transparency, Increased Contrast, and forced colors readable?
- Does the layout survive safe areas, landscape, larger text, and 200 percent zoom?
- Are evidence, uncertainty, provenance, and reconstruction boundaries preserved?
- Do all repository validators pass?
- Was unnecessary chrome removed before new chrome was added?

## r21 scope

The reviewed r21 layer is deliberately narrow:

1. Preserve the existing interaction engine as the only drag owner.
2. Add semantic detent descriptions without changing DOM detent names.
3. Add scoped 44-pixel activation targets.
4. Add visible keyboard focus and accessibility state.
5. Add reason-aware focus restoration.
6. Keep search dismissal from reopening the keyboard.
7. Suppress background map controls only for truly large or blocking surfaces.
8. Add validation that prevents future duplicate gesture controllers.

The actual consolidation of settings and place sheets into one new engine belongs in a later atomic refactor after device testing, not as an overlapping compatibility layer.
