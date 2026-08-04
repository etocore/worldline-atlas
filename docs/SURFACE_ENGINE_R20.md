# Worldline Surface Engine r20

## Purpose

Worldline should not display a flat colored polygon when a reviewed physical reconstruction exists. The surface engine converts published paleoelevation and paleobathymetry into static map tiles that can be rendered immediately by MapLibre.

The first anchor world is 250 Ma. It proves the package format and rendering pipeline before the atlas expands to additional geological and human-history worlds.

## Scientific boundary

The 250 Ma package uses the PALEOMAP PaleoDEM dataset by Christopher R. Scotese and Nicky M. Wright (2018), DOI `10.5281/zenodo.5460860`.

The source grid supports claims about:

- broad paleoelevation
- broad paleobathymetry
- continental shelves
- deep ocean basins
- major highlands and lowlands

It does not support claims about:

- climate
- vegetation
- rivers
- exact coastlines at local scale
- species ranges
- human settlement

Surface color is a deterministic elevation-derived visualization. It is not a biome map.

## Runtime behavior

At a generated anchor world:

1. The nearest static raster package loads beneath the reviewed coastline.
2. A Terrain-RGB package supplies hillshade.
3. Technical plate-boundary geometry is hidden from the default presentation.
4. The reviewed coastline remains visible as a restrained edge.
5. The timeline card discloses that paleoelevation and ocean depth are active.

Outside a reviewed coverage window, Worldline returns to the existing flat reconstruction rather than stretching one surface across unsupported time.

## Package contract

Each world package contains:

```text
data/surface/worlds/<world-id>/
  world.json
  color/{z}/{x}/{y}.png
  dem/{z}/{x}/{y}.png
```

`world.json` records:

- target and actual source age
- generation time
- data source and DOI
- represented and unrepresented layers
- tile resolution

The global registry is `data/surface/worlds.json`.

## Build process

`scripts/build_surface_worlds.py`:

1. Downloads the published 1-degree PaleoDEM archive from Zenodo.
2. Finds the grid closest to 250 Ma.
3. Normalizes latitude and longitude orientation.
4. Generates Web Mercator raster tiles through zoom 3.
5. Generates Mapbox Terrain-RGB tiles from the same source grid.
6. Updates the world manifest with provenance and coverage.

`.github/workflows/build-surface-worlds.yml` runs this reproducibly and commits generated assets with a dedicated bot identity.

## Expansion plan

### Phase 1 - Physical anchor worlds

- 250 Ma
- 66 Ma
- 21 ka
- present

Each must have elevation, bathymetry, source provenance, and visual QA.

### Phase 2 - Climate and environmental surfaces

- CHELSA-TraCE21k for 21 ka to present
- reviewed deep-time climate grids where licensing permits
- temperature
- precipitation
- ice
- broad environmental classification

Climate-derived color must remain a separate layer from elevation-derived color.

### Phase 3 - Human land use

- settlement points and extents
- agriculture and irrigation
- transport and trade routes
- ports and river systems
- population-density estimates with uncertainty

No modern building footprint may be projected backward without historical evidence.

### Phase 4 - City reconstruction

City views use four evidence classes:

1. excavated or surveyed geometry
2. historical map geometry
3. source-constrained inferred extent
4. procedural illustrative fabric

Procedural structures must be visually and textually distinguishable from attested structures.

### Phase 5 - Landmark models

Individual 3D buildings are reserved for sites with strong archaeological, architectural, or cartographic evidence.

## Release gates

A surface release must fail when:

- generated assets have no provenance
- color tiles are presented as climate or vegetation evidence
- the runtime stretches a package beyond its coverage window
- the source DOI disappears
- technical plate geometry returns to the default view
- the flat fallback is removed
- the timeline no longer discloses the active surface evidence
