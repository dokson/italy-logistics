# Italy Isochrone

**[Live demo →](https://dokson.github.io/italy-logistics/)**

A local/urban reachability map for all 119 Italian provincial capitals (comuni that are the seat of a province): pick a city and a travel mode (drive, walk, bike), and see real isochrone polygons instead of decorative radius circles.

Built to show off the [Google Isochrones API](https://developers.google.com/maps/documentation/isochrones) — routing-based reachability shaped by real streets, one-ways and turns, not a compass-drawn circle.

## How it works

- Isochrones are precomputed **once, offline**, per city × mode × time band (drive: 15/30/45/60 min; walk/bike: 15/30/60/120 min — the API's own caps)
- Results are saved as static per-city GeoJSON and committed to the repo
- The published site **never calls the Google API and never ships an API key** — it only fetches static files
- Polygons are simplified (Douglas-Peucker) before shipping, cutting ~70% of vertices with no visible loss of shape

This is a PoC for local/urban reachability, not an intercity comparison tool — the API doesn't support a transit mode, so anything beyond a metro area isn't meaningfully covered.

## Stack

`index.html` + `styles.css` + native ES modules under `js/`, no framework, no build step, no bundler. [Leaflet.js](https://leafletjs.com/) for the map, CARTO dark basemap, vanilla JS for everything else (a from-scratch searchable city combobox, point-in-polygon reachability math, and a tiny client-side EN/IT i18n layer).

The module graph is a deliberate DAG (`state.js` at the root, `geo.js` → `map.js` → `{i18n.js, actions.js}` → `main.js`, `combobox.js` standalone) — see the comments at the top of each file in `js/` for the reasoning, in particular how `state.selectCity` is used as a mediator slot to avoid an otherwise-unavoidable import cycle between `map.js`/`geo.js`/`combobox.js` and `actions.js`.

## Regenerating the data

Requires a Google Cloud project with the Isochrones API enabled and billing configured (free during the current Preview).

```bash
echo "ISOCHRONE_API_KEY=your_key_here" > .env

node scripts/generate-isochrones.mjs           # all cities
node scripts/generate-isochrones.mjs roma      # just one (e.g. to retry a failure)

node scripts/simplify-isochrones.mjs           # produces the files the site actually serves
```

`data/isochrones-raw/` holds the untouched API output; `data/isochrones/` holds the simplified, published version.

## Adding cities, or porting this to another country

1. **Edit `data/cities.json`** — an array of `{ id, name, lat, lon }`. `id` is a lowercase, ASCII, hyphenated slug (e.g. `"reggio-emilia"`); it's used as the GeoJSON filename and must be unique. Verify coordinates against an authoritative source (Wikipedia's infobox, or a geocoder) — they're used directly as routing origins, so a wrong pin produces a wrong isochrone silently.
2. **Generate the data**: `node scripts/generate-isochrones.mjs` (or pass specific ids to add/retry a subset without re-fetching everything — see above). This calls the live Isochrones API, so it needs `ISOCHRONE_API_KEY` set and costs quota (free in the current Preview).
3. **Simplify**: `node scripts/simplify-isochrones.mjs`. Re-run this after *any* change to `data/isochrones-raw/`, even for a single city — it processes every raw file into `data/isochrones/`.
4. **Update the UI copy**: the hardcoded city count ("119") appears in a few places — `index.html`'s `subtitle`/`citySearchPlaceholder`, and the matching `I18N.en`/`I18N.it` entries in `js/state.js`. `scripts/check.mjs` won't catch a stale count (it's just a number in a string), so update it by hand.
5. **Run `node scripts/check.mjs`** before pushing — it verifies data completeness (every city in `cities.json` has a matching generated file) among other things.

Porting to a different country is the same process, since nothing in the pipeline is Italy-specific except the content of `cities.json` and the copy in `index.html`/`js/state.js`. Two things to double-check if you do:
- **Travel mode caps are hardcoded** in `BANDS` (`scripts/generate-isochrones.mjs` and `js/state.js`, kept in sync manually) — drive maxes at 60 min, walk/bike at 120 min, per the API's own limits. These are API-wide constants, not Italy-specific, so they carry over unchanged.
- **The "Reachable cities" list** (`computeReachableCities` in `js/geo.js`) point-tests every *other* city in `cities.json` against each isochrone polygon — this is O(cities × bands) per city selected, which is fine at a few hundred cities but would need a spatial index (e.g. a grid or k-d tree prefilter) at a much larger scale (thousands of cities).

## Pre-push checks

```bash
git config core.hooksPath hooks   # one-time, per clone
```

Runs `scripts/check.mjs` before every push: verifies every `getElementById()` target exists, every `data-i18n` key resolves in both locales, and every city has a matching generated isochrone file.

## License

MIT — see [LICENSE](LICENSE).
