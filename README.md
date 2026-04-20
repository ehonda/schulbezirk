# Leipzig Schulbezirk Checker

Small static app to check whether an address or dropped map pin falls inside Leipzig's shared primary-school district `SO1` for:

- August-Bebel-Schule
- Wilhelm-Busch-Schule

## What this app does

- Loads a versioned GeoJSON polygon for `SO1`
- Geocodes an address in the browser with MapTiler when a runtime key is available
- Falls back to a manual map pin when geocoding is unavailable or ambiguous
- Runs the district check fully client-side
- Builds cleanly for GitHub Pages project hosting

## Accuracy note

The `SO1` polygon in `public/data/districts/SO1.geojson` now uses the boundary detail extracted from the official Leipzig PDF map, but it is still georeferenced into this app manually and is not an official machine-readable polygon dataset.

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

## MapTiler key entry

Address search is intentionally runtime-only now:

- Open the app
- Paste a MapTiler key into the visible key field
- Click `Speichern`

The key is stored only in local browser storage.

Because the app is static, any key used in the browser is still browser-visible. For GitHub Pages, restrict the key to your Pages domain in MapTiler.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy-pages.yml` builds and deploys the app to GitHub Pages.

The deployment no longer injects any shared MapTiler key at build time.

Hosted behavior:

- Everyone can open the site
- Visitors can always use manual-pin mode
- Address lookup only works after a visitor enters their own MapTiler key locally

## Data files

- `public/data/schools.json`
- `public/data/districts/SO1.geojson`

The frontend fetches these files at runtime, so the app can stay static and easy to host.
