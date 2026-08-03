# Research Foundation R17

Worldline Atlas is moving from an experimental globe toward a reviewed historical and planetary reconstruction system. This release does not attempt to solve every missing dataset. It establishes the review machinery that keeps future additions from becoming an untraceable pile of facts.

## Product rule

The globe stays first. Context appears progressively through the era card, search, the timeline, and bottom sheets. Scientific debug geometry, raw fossil points, numbered clusters, and unreviewed boundaries remain hidden until explicitly requested.

## Source authority

`data/sources/registry.json` defines source tiers.

- Tier A sources can author dates, formal period labels, model geometry, or evidence locations when their domain applies.
- Tier B sources can support curated context, museum or university synthesis, and place interpretation.
- Tier C sources can contribute inspectable open records, but claims remain caveated until reviewed.
- Tier D sources are discovery or readable context only. Wikipedia belongs here and may not author atlas dates, geometry, boundaries, confidence, or reconstruction claims.

## Static-first release model

`data/manifests/release-manifest.json` defines the current static release contract. The first visible globe must come from versioned static assets or a clearly labeled schematic fallback. Live services can refine after interaction, but they cannot be required for first contact.

## Anchor worlds

The first real surface engine should be judged against four anchor worlds:

1. Present day - observed reference and visual calibration.
2. Last Glacial Maximum - ice, lower sea level, exposed shelves, and migration context.
3. End-Cretaceous - separated continents, high seas, flowering plants, fossil evidence, and extinction context.
4. Pangea at roughly 250 Ma - default visual QA world until the globe feels finished.

## Human history coverage rule

Human History begins 300,000 years ago and becomes denser after 12,000 BCE. Every major date should expose simultaneous regional lenses rather than a single-civilization story. Required coverage lenses include Africa, the Americas, Oceania, East Asia, South Asia, Southeast Asia, Central Asia, the Middle East, Europe, and the Arctic.

## AI and generated visuals

Generated imagery may decorate fixed scientific masks and reviewed regions. It may not determine coastlines, mountain locations, ice sheets, fossil distributions, historical boundaries, settlement geometry, or confidence. Every generated tile must be reproducible by model bundle, tile coordinate, time, renderer version, seed, and source manifest.

## Next implementation targets

- Replace flat land color with static relief and ocean-depth treatment for Pangea.
- Add reviewed regional packages for 117 CE, 1000 CE, 1492 CE, and 1850 CE.
- Add authority-specific historical names through Pleiades, WHG, PeriodO, and curated local datasets.
- Add visual regression screenshots for iPhone portrait, timeline open, search open, era sheet, and life-region sheet.
