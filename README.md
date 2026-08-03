# Worldline Atlas

An interactive, uncertainty-aware map of the world through time.

## MVP

The first release demonstrates the core product idea:

- A global MapLibre map
- A timeline from 10,000 BCE to 2026 CE
- Era-specific regions, settlements, and routes
- An Evidence to Reconstruction slider
- Confidence labels and evidence classifications
- Responsive desktop and mobile layouts
- Zero-build Netlify deployment

## Important data note

The geometries included in `data.js` are deliberately simplified product-demo shapes. They prove the interface and data model, but they are not publication-grade historical borders.

Every future feature should include:

```js
{
  name: "Feature name",
  type: "region | city | route",
  evidence: "attested | reconstruction | speculative",
  confidence: 0.0,
  geometry: {},
  sources: [],
  notes: ""
}
```

## Run locally

Because this is a static app, use any local web server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to Netlify

1. Sign in to Netlify.
2. Select **Add new project** and **Import an existing project**.
3. Choose GitHub and select `etocore/worldline-atlas`.
4. Leave the build command empty.
5. Set the publish directory to `.` if Netlify does not read `netlify.toml` automatically.
6. Deploy.

Every push to `main` will then trigger a new deployment.

## Free infrastructure

- Map rendering: MapLibre GL JS
- Basemap: OpenFreeMap
- Hosting: Netlify
- Source control and data review: GitHub
- Optional future database: Supabase

## Next milestones

1. Replace demo polygons with sourced historical datasets.
2. Add per-feature citations and disagreement notes.
3. Add date ranges rather than fixed snapshots.
4. Add smooth interpolation where evidence supports it.
5. Add search, bookmarks, and shareable coordinates.
6. Add a contributor review workflow through pull requests.
7. Add paleoclimate, sea-level, language, migration, and ecology layers.
