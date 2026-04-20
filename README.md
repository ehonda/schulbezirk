# Leipzig Schulbezirk Checker

Small static app to check whether an address or dropped map pin falls inside Leipzig's shared primary-school district `SO1` for:

- August-Bebel-Schule
- Wilhelm-Busch-Schule

## What this app does

- Loads a versioned GeoJSON polygon for `SO1`
- Geocodes an address in the browser with MapTiler when a key is available
- Falls back to a manual map pin when geocoding is unavailable or ambiguous
- Runs the district check fully client-side
- Builds cleanly for GitHub Pages project hosting

## Accuracy note

The `SO1` polygon in `public/data/districts/SO1.geojson` is a hand-traced first version based on the official Leipzig PDF map, not an official machine-readable polygon dataset.

Use it as a strong screening aid for apartment hunting, but validate borderline addresses against the official source:

- SO1 source PDF: https://geodaten.leipzig.de/public/projekte/schulweg/pdf/gemeinsamerSchulbezirk_SO1.pdf

If you want to improve the boundary later, edit the GeoJSON directly and keep the metadata up to date.

## Local development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run test
npm run build
npm run preview
```

## MapTiler key options

You have two ways to enable address search:

1. Build-time key:

```bash
VITE_MAPTILER_API_KEY=your_key_here npm run dev
```

2. Runtime key:

- Open the app
- Expand the "MapTiler-Schlussel fur Adresssuche" section
- Paste the key and save it to the browser

Because the app is static, any client-side key is ultimately browser-visible. For GitHub Pages, restrict the key to your Pages domain in MapTiler.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys the app to GitHub Pages.

Optional repo secret:

- `VITE_MAPTILER_API_KEY`

Even without a key, the hosted app still works in manual-pin mode.

## Data files

- `public/data/schools.json`
- `public/data/districts/SO1.geojson`

The frontend fetches these files at runtime, so the app can stay static and easy to host.
