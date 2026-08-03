# Worldline r11 reconstructed surface engine

Build target: `2026-08-03-globe-r11`

## Product decision

Worldline will not try to imitate proprietary flyover imagery with a weaker satellite layer. It will build a coherent reconstructed-Earth renderer that works across every supported age.

The selected time determines:

- continental position
- coastlines and inland seas
- elevation and bathymetry
- ice and sea level
- climate and biome
- human land use when applicable
- visible life evidence and representative illustrations
- uncertainty language

Reconstruction remains the default. Present-day imagery is a calibration and comparison source, not a competing mode.

## Visual hierarchy

The globe remains the primary surface.

The compact timeline shows only:

1. Earth History or Human History
2. selected time
3. current interval or milestone
4. one sentence of context
5. confidence and temporal resolution
6. Explore

Explore opens the existing bottom card. Scientific layers, model identifiers, alternative interpretations, source links, and rendering details remain inside that card or the advanced settings sheet.

No new persistent toolbar should be introduced for terrain, climate, life, or imagery. These belong to progressive disclosure.

## Rendering regimes

### Present day

Use NASA Blue Marble: Next Generation with topography and bathymetry as the global visual calibration target. It provides monthly global composites at up to 500 metres per pixel and already expresses terrain and ocean relief more clearly than the current Sentinel-2 mosaic.

Primary source:

- https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/

Delivery options:

- NASA GIBS WMTS for globe-scale tiles
- preprocessed and versioned local raster tiles if GIBS availability or styling becomes inconsistent

At closer zoom, use a terrain DEM and open vector data rather than stretching the global raster indefinitely.

### 0 to 540 Ma

Use:

- pinned GPlates coastlines and continental polygons
- PaleoDEM elevation and bathymetry keyframes
- climate fields where a defensible model or ensemble exists
- deterministic biome synthesis from those fields

PaleoDEM provides global one-degree reconstructions and higher-resolution downloadable products for the Phanerozoic. It is appropriate for global shape and relief, not street-level terrain.

Source:

- https://www.earthbyte.org/paleodem-resource-scotese-and-wright-2018/

Between scientific keyframes:

- plate geometry moves continuously
- raster relief crossfades or interpolates conservatively
- the interface reports the actual keyframe spacing

### 540 to 1800 Ma

Use the pinned full-plate reconstruction for continental configuration.

Rendering becomes deliberately lower frequency:

- broad continental relief
- broad shallow-ocean and deep-ocean classes
- large climate zones only when supported
- no invented detailed rivers or mountain chains

The surface may remain visually rich through deterministic texture, but the texture cannot imply unsupported local geography.

### 1800 to 4567.3 Ma

Use curated schematic states.

The app may show evidence-supported properties such as:

- magma-ocean or cooling phase
- broad crust and ocean state
- atmospheric class
- glaciation state
- named supercontinent hypotheses where academically defensible

It must not show exact coastlines.

## Modern visual quality without commercial flyover

Worldline should not compete with Apple, Google, or Cesium photogrammetry city by city. Their flyover products rely on proprietary aerial capture, photogrammetric processing, and licensing that cannot be reproduced globally or historically.

Instead, Worldline should own a different visual category:

- globe-scale atmospheric beauty
- readable topographic relief
- coherent ocean depth
- era-specific color and light
- historical and geological motion
- reviewed local 3D reconstructions where available

For present-day close views:

- MapLibre terrain from a licensed raster DEM
- hillshade and color relief
- OSM or Overture building footprints
- reviewed local 3D heritage models

For past close views:

- reconstructed terrain tiles
- land-cover textures constrained by climate and elevation
- dated building and road data
- confidence-aware procedural detail

## Life layer

The Paleobiology Database should supply fossil occurrence evidence.

Worldline must distinguish four concepts:

1. fossil occurrence
2. evidence density
3. inferred habitat or range
4. representative illustration

A dinosaur illustration is not a map point unless a fossil occurrence supports that location and interval. Broad range shading must be labeled as inferred.

The fun visual treatment should be:

- sparse illustrated life markers at meaningful zoom levels
- clustered evidence at globe scale
- a bottom card explaining what is known
- playful, era-appropriate illustration rather than fake photorealism

For example, a Jurassic view may show representative sauropods and conifers, but the card must state whether the marker represents a fossil occurrence, a regional inference, or a general era illustration.

## Deterministic visual synthesis

AI and procedural systems may generate texture and illustration only after scientific fields are fixed.

Every generated tile or scene must be reproducible from:

`model bundle + selected time + tile coordinate + renderer version + deterministic seed`

Allowed:

- forest, scrub, desert, wetland, snow, and ocean texture inside sourced classes
- seamless transitions between resolutions
- stylized flora and fauna illustrations
- labeled gap filling

Not allowed:

- invented coastlines
- unsupported rivers
- unsupported mountain chains
- invented cities
- converting sparse fossils into definitive species ranges

## r11 anchor worlds

The first surface-engine release should perfect four worlds:

### Present

- NASA Blue Marble visual calibration
- terrain and hillshade
- modern coastlines
- reconstructed surface converges toward observation

### Last Glacial Maximum, approximately 21 ka

- lower sea level
- exposed continental shelves
- major ice sheets
- cold-steppe and tundra treatment
- human evidence remains separate

### 66 Ma

- end-Cretaceous continental configuration
- PaleoDEM relief
- broad climate and vegetation treatment
- representative flora and fauna layer
- milestone context for the end-Cretaceous transition

### 250 Ma

- Pangea
- PaleoDEM relief and inland seas
- arid continental interior treatment
- end-Permian or early Triassic context depending on exact selected age

These anchor worlds become visual test fixtures. Later ages inherit the same pipeline.

## Interaction behavior

Earth History remains the first-time mode.

The user should not configure layers before seeing the planet.

- timeline movement updates the planet immediately
- milestone dots remain tappable
- Explore opens context
- advanced settings can expose `Surface`, `Life`, `Evidence`, and `Models` groups
- default settings choose the clearest responsible presentation

The app should never open advanced settings automatically from search or timeline interaction.

## Acceptance criteria

r11 is successful when:

- present-day Earth is visibly more attractive than the current Sentinel-2 layer
- Pangea has meaningful relief and ocean depth rather than flat polygons
- the 66 Ma and 21 ka worlds are visibly distinct
- life illustrations are engaging but evidence-labeled
- switching timeline modes preserves all existing interaction rules
- the globe remains usable on mobile Safari
- no new surface is presented without a model, source, confidence class, and temporal resolution

## Implementation order

1. Replace the present-day reference surface with NASA Blue Marble through a versioned source adapter.
2. Add terrain and hillshade support with graceful mobile fallback.
3. Define a versioned surface manifest format.
4. Add the four anchor-world manifests.
5. Integrate preprocessed PaleoDEM keyframes.
6. Add ice and sea-level masks for the Last Glacial Maximum.
7. Add the Paleobiology Database evidence adapter.
8. Add deterministic illustrated life markers.
9. Add regression screenshots or visual fixtures for the four anchor worlds.
