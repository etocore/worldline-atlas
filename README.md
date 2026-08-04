# Worldline Atlas

Worldline Atlas is an evidence-aware interactive globe for exploring Earth history and human history through time.

The selected time changes the world being presented. Geological views use plate-model coastlines, reviewed surface packages where available, and clearly labeled schematic geography where precise reconstruction is not scientifically defensible. Human History adds archaeological sites, historical settlements, dated map records, and contextual evidence without implying complete coverage.

## Current product

Worldline opens in **Earth History** and supports time from Earth’s formation to the present.

- From the present to about **1.8 billion years ago**, coastlines use the pinned CAO2024 GPlates reconstruction model.
- Before about **1.8 billion years ago**, the atlas switches to explicitly schematic geography rather than inventing precise continental positions.
- A reviewed PaleoDEM surface package currently provides paleoelevation and ocean-depth relief around **250 million years ago**.
- At other modeled ages, lightweight vector coastlines update while the user scrubs and the final reconstruction settles after release.
- Geological dates are organized by eon, era, and period, with a local scrubber inside the selected interval.

**Human History** is a separate, denser timeline from 300,000 years ago to the present. It can display reviewed sites, dated OpenHistoricalMap records, Wikidata catalog results, and optional historical building data where the sources support them.

## Interface

The interface is map-first and optimized for phones and tablets:

- Full-screen MapLibre globe
- Compact Earth/Human timeline launcher
- Persistent scrollable geological and historical interval rail
- Local interval-scale time scrubber
- Bottom search surface
- Contextual settings sheet
- Place and evidence detail sheet
- Safe-area, dynamic viewport, Reduced Motion, Reduced Transparency, and Increased Contrast support

The visual language is inspired by the clarity and restraint of modern native map applications. Worldline does not use or redistribute Apple Maps imagery, tiles, branding, or private APIs.

## Timeline architecture

The canonical timeline subsystem lives in `timeline/`:

- `model.js` owns interval definitions, hierarchy, scale conversions, and date formatting.
- `state.js` owns Earth/Human state, preview transactions, commits, persistence, and timeline events.
- `view.js` owns the launcher, timeline surface, interval rail, local scrubber, contextual settings, and lightweight coastline previews.
- `timeline.css` is the only production stylesheet owner for timeline UI.

Every visible timeline surface should have one JavaScript owner and one primary stylesheet owner. CI rejects retired timeline generations if they are added back to the production bootstrap.

## Evidence and uncertainty

A visible record means at least one source has a location and date range compatible with the selected time. It does not prove continuous occupation, exact population, exact borders, political control, or complete regional coverage.

A blank region does not mean a place was uninhabited or that life was absent. It means the current reviewed and connected sources did not return compatible evidence at the selected map scale and time.

Fossil markers from the Paleobiology Database represent published occurrence evidence at reported or model-reconstructed paleocoordinates. They are not complete organism ranges.

## Data and services

- **Globe rendering:** MapLibre GL JS
- **Plate reconstruction:** GPlates Web Service with cached CAO2024-derived keyframes
- **Generated surface packages:** reviewed PaleoDEM-derived raster color and terrain assets
- **Fossil evidence:** Paleobiology Database
- **Historical map records:** OpenHistoricalMap
- **Supplementary catalog:** Wikidata Query Service through a cached Netlify Function
- **Observed reference imagery:** EOX Sentinel-2 cloudless
- **Hosting:** Netlify
- **Source control and review:** GitHub

Upstream libraries, datasets, models, and remote services retain their own terms and attribution requirements.

## Search behavior

Search currently supports:

- Reviewed place and site names
- Geological periods and topics
- Explicit geological ages such as `120 million years ago`
- Explicit human dates such as `117 CE` and `7000 BCE`
- Combined place-and-date searches where reviewed evidence exists
- Camera movement to matched records
- Clear handling of unmatched prompts

Search results may switch the active timeline domain when their meaning is clearly geological or historical.

## Local development

Serve the static application with any local web server:

```bash
python3 -m http.server 8000
```

The Wikidata and paleocoastline endpoints are Netlify Functions, so live connected behavior requires Netlify Dev or a deployed site:

```bash
npx netlify dev
```

Run the validation suite with:

```bash
npm install
npm run test:mobile
```

## Netlify deployment

The repository includes `netlify.toml`.

- Branch: `main`
- Base directory: empty
- Build command: empty
- Publish directory: `.`
- Functions directory: `netlify/functions`

Every merge to `main` triggers a production redeploy.

## Near-term milestones

1. Consolidate the remaining overlapping mobile shell generations.
2. Add complete-page performance budgets for timeline interaction and source settling.
3. Generate and review additional historical surface worlds, beginning with 120 million years ago, 66 million years ago, and the Last Glacial Maximum.
4. Expand normalized archaeological, historical, and environmental evidence adapters.
5. Add a reviewed natural-language research queue without fabricating unsupported reconstructions.
