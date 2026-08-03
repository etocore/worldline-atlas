# Worldline reconstructed Earth engine

Build `2026-08-03-globe-r10` begins the transition from a historical settlement overlay to a time-selected Earth reconstruction.

## Product hierarchy

The selected time determines the planet. Reconstruction is no longer an optional visual layer.

The first-time experience opens in **Earth History** at approximately 250 Ma, when Pangea makes continental movement immediately legible. A segmented control switches between:

- **Earth History** - present to 4.5673 Ga
- **Human History** - 300,000 years ago to the present

The last selected mode may be remembered locally, but a new visitor begins in Earth History.

## Apple-style disclosure

The compact timeline keeps four things visible:

1. timeline scope
2. selected time
3. current interval or milestone
4. a compact confidence and resolution statement

A single **Explore** action opens the existing bottom card with a synopsis, evidence notes, confidence, image when available, and a direct source. Model names, caveats, alternative interpretations, and detailed scientific context stay one level deeper because they are important but not required to move through the timeline.

The surface itself remains primary. The app should never make a visitor configure scientific layers before seeing the Earth change.

## Continental reconstruction

### 0 to 1.8 Ga

The first implementation pins the `CAO2024` model and requests reconstructed coastlines through a cached Netlify proxy.

- GPlates model catalogue: https://gwsdoc.gplates.org/models/
- Coastline endpoint: https://gwsdoc.gplates.org/reconstruction/reconstruct-coastlines/
- CAO2024 reference: https://doi.org/10.1016/j.gsf.2024.101922

The model name is always explicit. Worldline does not use the GPlates Web Service default because that default can change.

Temporal requests are snapped for responsible caching:

- 0-100 Ma: 0.5 Ma
- 100-540 Ma: 1 Ma
- 540-1000 Ma: 5 Ma
- 1000-1800 Ma: 10 Ma

These are product rendering steps, not claims that every scientific input has equal resolution.

### Older than 1.8 Ga

No exact global coastline geometry is presented. The globe switches to a curated schematic state and states that continental positions are not defensible at the same level.

Future schematic scenes may represent evidence-supported properties such as:

- likely magma-ocean and cooling states
- early crust and ocean evidence
- atmospheric composition classes
- broad supercontinent hypotheses
- oxygenation and glaciation states

They must not present invented coastlines as observations.

## Surface rendering roadmap

Moving coastlines are only the first layer.

### Global geometry

- GPlates / pyGPlates / GPlately plate reconstruction
- pinned model bundles
- versioned reconstructed coastlines, continental polygons, and plate boundaries

Official documentation:

- https://www.gplates.org/
- https://www.gplates.org/docs/
- https://www.gplates.org/docs/pygplates/

### Elevation and oceans

For the Phanerozoic, PaleoDEM and PALEOMAP provide global paleoelevation and bathymetry keyframes. These should be preprocessed into versioned tiles rather than fetched as an opaque visual product.

- https://www.earthbyte.org/paleodem-resource-scotese-and-wright-2018/
- https://www.earthbyte.org/webdav/ftp/Data_Collections/Scotese_Wright_2018_PaleoDEM/

Modern calibration can use NASA Blue Marble at global scale and Copernicus DEM for terrain, subject to attribution and dataset terms.

- https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/
- https://registry.opendata.aws/copernicus-dem/

Worldline should not compete with commercial flyover imagery. It should create a coherent, Earth-scale visual system where every era can be rendered by the same deterministic pipeline.

### Climate, ice, and vegetation

PMIP coordinates model experiments and evaluation data for key paleoclimate intervals, including the Last Glacial Maximum, mid-Holocene, deglaciation, and older warm periods.

- https://pmip.lsce.ipsl.fr/about_us/overview
- https://pmip.lsce.ipsl.fr/index.php/protocols_and_data/experimental_design

Climate outputs should drive biome and ice probabilities. AI must not decide where deserts or forests belong without these fields.

### Life

The Paleobiology Database provides temporally and geographically explicit fossil occurrence records through an API. Occurrence points should be shown as known evidence, not complete species ranges.

- https://paleobiodb.org/data1.2/
- https://www.paleodata.org/data1.2/general_doc.html

Stylized animal and plant layers can make the map fun, but they must distinguish:

- fossil occurrence
- inferred range
- representative illustration
- speculative reconstruction

### Human modification

Human History begins 300,000 years ago. Resolution becomes much denser after 12,000 BCE, when agriculture, settlements, and land-use change become increasingly relevant.

Smithsonian Human Origins material provides a reviewed starting framework for evolutionary and behavioral milestones:

- https://humanorigins.si.edu/education/introduction-human-evolution
- https://humanorigins.si.edu/evidence/human-evolution-interactive-timeline
- https://humanorigins.si.edu/human-characteristics/humans-change-world

HYDE and archaeological or historical datasets will later drive land-use and built-environment reconstruction.

## AI policy

AI is a deterministic visual synthesizer, not the geometric authority.

Allowed roles:

- texture synthesis within sourced land-cover classes
- seamless transitions between raster resolutions
- representative vegetation and surface variation
- stylized educational illustrations
- gap filling that is visibly labelled and reproducible

Disallowed roles:

- inventing coastlines
- placing mountain chains without a model
- fabricating rivers or cities
- converting fossil occurrences into unsupported global ranges
- presenting one generated image as historical observation

Every generated tile should be reproducible from:

`model bundle + time + tile coordinate + renderer version + deterministic seed`

## Confidence language

Worldline uses a compact vocabulary:

- **Observed**
- **Model constrained**
- **Working hypothesis**
- **Deep-time hypothesis**
- **Schematic**

The visual treatment can remain beautiful and engaging. The labels prevent polish from being mistaken for certainty.

## First anchor worlds

The implementation order is:

1. Present
2. 10,000 BCE
3. Last Glacial Maximum, approximately 21 ka
4. 66 Ma
5. 250 Ma, Pangea
6. 538.8 Ma, beginning of the Cambrian
7. 1.0 Ga, Rodinia interval
8. 1.8 Ga model boundary
9. selected schematic scenes from 1.8-4.5673 Ga

The first release proves moving continental geometry and the dual timeline. Terrain, climate, life, and deterministic surface rendering follow as separate reviewable layers.
