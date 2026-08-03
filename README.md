# Worldline Atlas

A satellite-first, uncertainty-aware map of known human settlements through time.

## Current version

The atlas overlays historical settlement evidence on a modern Sentinel-2 satellite surface. The selected year changes the settlement layer, not the imagery itself.

### Data and services

- **Map rendering:** MapLibre GL JS
- **Satellite surface:** EOX Sentinel-2 cloudless 2024 WMTS
- **Historical map records:** OpenHistoricalMap vector tiles and published MapLibre style
- **Supplementary catalog:** Wikidata Query Service through a cached Netlify Function
- **Early archaeological sites:** A small reviewed GeoJSON-style seed set in `data.js`
- **Hosting:** Netlify
- **Source control:** GitHub

The app has no paid dependency and does not require API keys. EOX imagery is free for non-commercial use with attribution. Review its current license before any commercial launch.

## What the interface does

- Continuous year control from 15,000 BCE to 2026 CE
- Exact numeric year entry and quick period jumps
- Modern cloudless satellite imagery at up to 10-meter source resolution
- Dated settlement labels from OpenHistoricalMap
- Live viewport queries for Wikidata cities, towns, villages, human settlements, ancient cities, and archaeological sites
- Optional historical building footprints where OpenHistoricalMap contains them
- Strict, balanced, and broad evidence thresholds
- Clickable source records and confidence notes
- Mobile-first controls and clustered live catalog points

## Accuracy model

A visible point means that at least one source has a location and a date range compatible with the selected year. It does not prove continuous occupation, exact population, exact boundaries, political control, or a modern-style city.

A blank region does not mean it was uninhabited. It means the current sources did not return a compatible record at the current map scale and date.

The modern satellite layer should not be read as a reconstruction of historical coastlines, vegetation, rivers, roads, or buildings.

## Local development

The static interface can be served with any local web server:

```bash
python3 -m http.server 8000
```

The Wikidata endpoint is a Netlify Function, so live catalog queries require either Netlify Dev or a deployed Netlify site:

```bash
npx netlify dev
```

## Netlify deployment

The repository includes `netlify.toml`. Import the repository into Netlify and use:

- Branch: `main`
- Base directory: empty
- Build command: empty
- Publish directory: `.`
- Functions directory: `netlify/functions`

Every merge to `main` triggers a redeploy.

## Next milestones

1. Add World Historical Gazetteer, Pleiades, and regional archaeological datasets through normalized adapters.
2. Store source disagreements and occupation phases as first-class records.
3. Add paleocoastline, river, climate, and vegetation reconstructions with explicit uncertainty.
4. Build a review queue for proposed settlement records and inferred locations.
5. Add population ranges and settlement footprint estimates where defensible.
6. Replace the curated seed file with versioned, cited datasets maintained through pull requests.
