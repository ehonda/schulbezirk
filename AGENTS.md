# AGENTS.md

## Purpose

This repo contains a small static web app for checking whether an address or manually placed map pin is inside Leipzig's shared primary-school district `SO1`.

Current supported schools:

- `August-Bebel-Schule`
- `Wilhelm-Busch-Schule`

Current supported district:

- `SO1` only

This is a family-use screening tool for apartment hunting, not an official city system.

## Tech Stack

- Vite
- TypeScript
- Leaflet
- Vitest
- Static JSON / GeoJSON data files in `public/`
- GitHub Pages deployment via GitHub Actions

There is no backend.

## Core Product Behavior

- The app loads school and district data from static files at runtime.
- The district check is fully client-side.
- Address lookup uses MapTiler geocoding only when the user enters their own key in the UI.
- The MapTiler key is stored only in browser `localStorage`.
- If no key is present, the app still works in manual-pin mode.
- If geocoding returns multiple hits, the user must choose one from the inline ambiguity panel near the top of the page.
- The chosen point is checked against the district polygon with a local point-in-polygon implementation.
- Boundary points are treated as inside.

## Important Constraints

- Do not reintroduce a build-time MapTiler secret.
  The site previously used a `VITE_MAPTILER_API_KEY` build path and this was intentionally removed because any such key is exposed in a static frontend.
- GitHub Pages deployment must remain static-only.
  No server APIs are expected in this repo.
- The current `SO1` polygon is hand-traced, not an official GIS export.
  Borderline addresses should still be treated carefully.
- The first screen should stay task-focused.
  Address input, key entry, and map are intentionally prioritized visually.
- The ambiguity flow is important UX.
  If multiple geocoder hits exist, the chooser should remain obvious and close to the search form.
- Use proper German characters in UI text and user-facing data.
  Avoid ASCII approximations like `ue`, `oe`, `ae` unless required by an external API.

## Important Files

- [index.html](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/index.html)
  Main page structure.
- [src/main.ts](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/src/main.ts)
  Main app controller, DOM wiring, map setup, search flow, ambiguity handling, result rendering.
- [src/geocoder.ts](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/src/geocoder.ts)
  MapTiler geocoding and reverse geocoding, runtime-key-only behavior.
- [src/geometry.ts](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/src/geometry.ts)
  Point-in-polygon logic. Boundary is considered inside.
- [src/data.ts](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/src/data.ts)
  Loads static school and district data.
- [src/config.ts](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/src/config.ts)
  Constants like Leipzig bbox, localStorage key, and base-path helper.
- [src/style.css](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/src/style.css)
  Entire app styling and layout.
- [public/data/schools.json](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/public/data/schools.json)
  School metadata and school-to-district mapping.
- [public/data/districts/SO1.geojson](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/public/data/districts/SO1.geojson)
  Current district polygon plus source metadata.
- [src/tests/data.test.ts](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/src/tests/data.test.ts)
  Verifies metadata shape and basic district sanity.
- [src/tests/geometry.test.ts](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/src/tests/geometry.test.ts)
  Verifies geometry behavior, including boundary handling.
- [.github/workflows/deploy-pages.yml](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/.github/workflows/deploy-pages.yml)
  GitHub Pages CI/CD.
- [vite.config.ts](/c:/Users/dennis/source/repos/ehonda/Wohnungssuche/vite.config.ts)
  Vite config, including GitHub Pages project-path base handling.

## Data Model Notes

- `schools.json` contains:
  `id`, `name`, `districtId`, `address`, `latitude`, `longitude`, `sourceUrl`
- District GeoJSON properties include:
  `districtId`, `name`, `sourceUrl`, `sourceVersion`, `pdfRevision`, `traceDate`, `traceMethod`, `notes`, `schoolIds`, `schoolNames`

If you add another district:

1. Add a new GeoJSON file under `public/data/districts/`.
2. Add matching school entries or mappings in `public/data/schools.json`.
3. Keep metadata fields consistent.
4. Extend tests if the new district introduces new assumptions.

## Deployment Notes

- Remote: `origin = https://github.com/ehonda/schulbezirk.git`
- GitHub Pages deploys from the workflow in `.github/workflows/deploy-pages.yml`.
- CI runs on pushes to `main` and on manual dispatch.
- The build is static and uploads `dist/` as the Pages artifact.
- `vite.config.ts` sets the base path to `/<repo-name>/` during GitHub Actions builds.
- There is no shared geocoding key in CI or deployment anymore.

## Local Dev

Install and run:

```powershell
npm install
npm run dev
```

Useful checks:

```powershell
npm run test
npm run build
```

If Vite build/test spawning fails in a sandboxed environment, rerun with the permissions needed for `vite` / `esbuild` child processes.

## Testing Expectations

Before finishing meaningful changes, prefer to run:

```powershell
node .\node_modules\typescript\bin\tsc --noEmit
npm run test
npm run build
```

Current tests cover:

- Geometry correctness
- Boundary points counted as inside
- District file metadata sanity
- School coordinates inside the current `SO1` polygon
- A clearly eastern point outside `SO1`

## Repo Hygiene

- `private/` is gitignored and contains user research / notes; do not rely on it for shipped app behavior unless the user explicitly asks.
- `dist/`, `node_modules/`, and other generated files are ignored.
- Keep edits ASCII-only unless there is a good reason not to.
  German UI copy is one of those reasons: prefer proper umlauts and `ß`.

## Known Product Risks

- The `SO1` shape is an approximation from a published PDF, not official GIS data.
- Client-side MapTiler keys are browser-visible by nature.
- GitHub Pages is public; there is no access control in this repo.
- Address quality depends on the geocoder and the user selecting the correct hit when ambiguity exists.

## Good First Checks For A Fresh Agent

1. Read `README.md` and this file.
2. Inspect `src/main.ts`, `src/geocoder.ts`, and `src/style.css`.
3. Check whether the task touches:
   UI flow, data accuracy, geocoding behavior, or deployment.
4. Run `npm run test` and `npm run build` before wrapping up if code changed.
