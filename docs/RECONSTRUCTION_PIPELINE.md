# Historical surface reconstruction pipeline

Worldline Atlas should not present AI-generated imagery as observation. A historical surface is a reconstruction assembled from independently reviewable layers.

## Rendering levels

### 1. Global surface

Use time-indexed scientific rasters for coastlines, ice, vegetation, cropland, pasture, population density, and built-up area. These become low- and medium-zoom raster tiles or PMTiles archives.

Candidate inputs:

- HYDE historical population, built-up area, cropland, and grazing estimates
- PaleoClim and related paleoclimate products
- published paleocoastline and ice-sheet reconstructions
- regional archaeological land-use datasets

Each generated surface must publish its input versions, date interpolation method, spatial resolution, and uncertainty.

### 2. Settlement geometry

Use dated vector records before generated imagery:

- OpenHistoricalMap building and street footprints
- World Historical Gazetteer and Wikidata place records
- Pleiades and regional archaeological gazetteers
- cadastral, excavation, and historical-map datasets

Footprints may be extruded when height or level information exists. Missing heights must be marked as estimated and generated from a documented regional rule, not silently guessed.

### 3. Reviewed local reconstruction

For important places and periods, create a reviewed reconstruction package containing:

- geographic extent and valid date range
- cited footprints and street plans
- building type, material, height, roof, and condition evidence
- vegetation and land-use assumptions
- one or more competing interpretations
- confidence values for each component

Open Heritage 3D and similar archives can provide source geometry for some heritage sites, subject to each dataset's license.

### 4. Generated orthophoto tiles

Only after the structured scene is approved should the system render a satellite-like orthophoto. The preferred pipeline is deterministic 3D rendering from reviewed geometry and materials. Generative image models may add texture variation, weathering, vegetation, or missing low-confidence context, but generated pixels must inherit the source package's uncertainty and remain visually distinguishable from directly evidenced geometry.

Generated tiles should be precomputed, seam-tested, versioned, and cached. On-demand tile generation is too inconsistent and expensive for the primary map.

## Client contract

The browser selects the best available surface for a year and viewport:

1. reviewed local orthophoto tiles
2. scientific historical land-cover tiles
3. dated vector reconstruction over muted modern terrain
4. modern satellite fallback

The interface must always state which level is being shown.

## Initial implementation

The current reconstruction mode is level 3:

- modern satellite detail fades as the user zooms toward the ground
- dated OpenHistoricalMap building footprints are shown automatically
- polygon footprints are extruded when possible
- heights use documented height or level properties first, then an explicitly estimated fallback
- the interface labels this as a vector reconstruction rather than historical imagery
