# Worldline Atlas

A satellite-first, uncertainty-aware globe of known human settlements through time.

## Current version

Worldline Atlas uses MapLibre's globe projection to present historical settlement evidence on a modern Sentinel-2 satellite surface. The selected year changes the historical evidence layer, not the imagery itself.

The interface is intentionally map-first:

- Full-screen interactive Earth
- Black space and atmospheric globe rendering
- Minimal floating map controls
- A compact bottom search bar
- Historical controls hidden inside an expandable bottom sheet
- Mobile safe-area support

The interface is inspired by the clarity and restraint of modern native map apps, but it does not use or redistribute Apple Maps imagery, tiles, branding, or private APIs.

### Data and services

- **Map rendering and globe projection:** MapLibre GL JS
- **Satellite surface:** EOX Sentinel-2 cloudless WMTS
- **Historical map records:** OpenHistoricalMap vector tiles and published MapLibre style
- **Supplementary catalog:** Wikidata Query Service through a cached Netlify Function
- **Early archaeological sites:** A small reviewed GeoJSON-style seed set in `data.js`
- **Hosting:** Netlify
- **Source control:** GitHub

The app has no paid dependency and does not require API keys. Review each upstream service's current license and usage limits before a commercial launch.

## Search behavior

The bottom search bar is the future natural-language entry point. The current interface already supports:

- Reviewed settlement names contained in `data.js`
- Explicit dates such as `117 CE` and `7000 BCE`
- Combined searches such as `Rome 117 CE`
- Camera movement to matched reviewed sites
- Clear handling of unmatched prompts

The next search phase will connect unmatched prompts to a research and review queue rather than silently fabricating a reconstruction.

## Historical controls

- Continuous year control from 15,000 BCE to 2026 CE
- Exact numeric year entry and quick period jumps
- Timeline playback with period-sensitive increments
- Dated settlement labels from OpenHistoricalMap
- Live viewport queries for Wikidata settlements and archaeological sites
- Optional historical building footprints where OpenHistoricalMap contains them
- Strict, balanced, and broad evidence thresholds
- Clickable source records and confidence notes
- Clustered live catalog points

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

1. Add a reviewed natural-language request queue and editorial workflow.
2. Add World Historical Gazetteer, Pleiades, and regional archaeological datasets through normalized adapters.
3. Store source disagreements and occupation phases as first-class records.
4. Add paleocoastline, river, climate, and vegetation reconstructions with explicit uncertainty.
5. Add population ranges and settlement footprint estimates where defensible.
6. Replace the curated seed file with versioned, cited datasets maintained through pull requests.
