# Static Earth cache and life evidence

Build `2026-08-03-globe-r11` removes the live plate service from the critical rendering path for common geological ages.

## Why GitHub is sufficient for this stage

The atlas is a static application. Simplified GeoJSON keyframes can be committed beside the application and served by Netlify like any other asset. No database, user account, or persistent server process is required.

The repository stores:

- a versioned manifest
- simplified CAO2024 coastline snapshots
- time-indexed fossil occurrence snapshots
- source, age, model, feature count, file size, and content hash metadata

The snapshot builder runs in GitHub Actions and commits changed files back to the repository. The files must remain small and reviewable. Large global raster or high-resolution terrain products belong in PMTiles or object storage later, not ordinary Git history.

## Runtime loading order

1. `earth-cache.js` loads before the Earth History runtime.
2. A request for `/api/paleocoastlines?time=...` first checks the browser Cache API.
3. If no exact browser entry exists, the nearest compatible GitHub snapshot is returned immediately.
4. The live Netlify/GPlates request runs quietly in the background.
5. A successful exact response is stored in the browser Cache API for subsequent visits.
6. If no reasonable keyframe exists, the live API remains the fallback.

A GitHub keyframe is a responsive preview of a pinned scientific model, not a claim that the selected age exactly equals the stored keyframe. The response identifies the requested time, rendered keyframe time, model, and whether the result is approximate.

## Snapshot generation

`.github/workflows/cache-earth-data.yml` runs the builder:

```text
scripts/cache-earth-data.mjs
```

The workflow can be started manually, runs monthly, and reruns when its own configuration changes on `main`.

The builder:

- requests coastlines from the GPlates Web Service
- pins `CAO2024`
- simplifies coordinates for globe-scale rendering
- downloads animal and plant fossil occurrences from the Paleobiology Database
- reconstructs discovery coordinates to the selected paleotime
- deterministically samples dense results
- writes minified GeoJSON and an auditable manifest
- preserves the previous valid entry when an external source fails or returns no usable data

## Flora and fauna semantics

The life layer intentionally maps evidence rather than pretending to know complete biological ranges.

Each marker represents one of the following:

- a PBDB fossil occurrence generated through the automated cache
- a reviewed PBDB collection seed with a published paleocoordinate

The interface must say that:

- a point is not a full species range
- collection and sampling bias are substantial
- empty regions do not imply biological absence
- reconstructed coordinates depend on the selected plate model
- illustrated organisms added later are representative, not sightings

Flora is green and fauna is orange. Labels appear only after zooming in. Dense records cluster at global scale.

## Reviewed seed data

The repository includes a small initial set so the life layer is not blank before the first cache workflow completes:

- Alamosaurus evidence near the end of the Cretaceous
- Huincul Formation sauropod evidence at approximately 100 Ma
- Winton Formation angiosperm flora at approximately 100 Ma
- latest-Permian brachiopod evidence
- earliest-Triassic vertebrate evidence

These seeds use PBDB collection pages and published paleocoordinates. The cache workflow can replace them with larger occurrence-level snapshots.

## Timeline design

The r11 timeline keeps the existing Earth/Human scope decision while rebuilding the compact control around familiar iOS interaction principles:

- one centered selected value
- an equal-width two-item segmented control
- a continuous track with a large white thumb
- the selected value directly above the thumb while dragging
- subtle milestone marks rather than labelled clutter
- a single tappable synopsis row
- secondary controls behind one explicit `Controls` action

The map remains visible and interactive. Search remains separate. Opening the timeline does not open advanced settings.

## Release constraints

A release fails validation if:

- the cache loads after Earth History
- the browser cache fallback disappears
- the static manifest is invalid
- reviewed fossil seeds are missing
- flora and fauna are not visually distinct
- the occurrence-versus-range caveat is removed
- r11 timeline assets are not wired into the production shell
