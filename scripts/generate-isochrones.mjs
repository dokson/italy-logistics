// One-time precompute script. Run locally with your own API key, either via
// a .env file in the repo root (ISOCHRONE_API_KEY=xxxxx, gitignored) or:
//   ISOCHRONE_API_KEY=xxxxx node scripts/generate-isochrones.mjs
//
// Optionally restrict to specific cities (e.g. to retry a transient failure):
//   node scripts/generate-isochrones.mjs roma torino
//
// Calls the Google Isochrones API once per city x mode x time band and
// writes one raw GeoJSON file per city to data/isochrones-raw/<id>.geojson.
// Run scripts/simplify-isochrones.mjs afterwards to produce the lighter
// per-city files under data/isochrones/ that the published site actually
// fetches. The published site never calls the API itself and never ships
// the key.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadDotEnv() {
  try {
    const text = await readFile(path.join(__dirname, "..", ".env"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // no .env file, rely on the shell environment
  }
}

await loadDotEnv();

const API_KEY = process.env.ISOCHRONE_API_KEY;
if (!API_KEY) {
  console.error("Missing ISOCHRONE_API_KEY (set it in .env or as an environment variable).");
  process.exit(1);
}

const ENDPOINT = "https://isochrones.googleapis.com/v1/isochrones:generate";

// DRIVE caps at 3600s (1h) per the API; WALK/BICYCLE cap at 7200s (2h).
const BANDS = {
  DRIVE: [15, 30, 45, 60],
  WALK: [15, 30, 60, 120],
  BICYCLE: [15, 30, 60, 120],
};

async function fetchIsochrone(city, mode, minutes) {
  const body = {
    location: { latitude: city.lat, longitude: city.lon },
    travelDuration: `${minutes * 60}s`,
    travelMode: mode,
    travelDirection: "FROM",
    routingPreference: "TRAFFIC_UNAWARE",
    enableSmoothing: true,
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${city.name} ${mode} ${minutes}min -> HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.isochrone?.geoJson ?? null;
}

async function main() {
  const allCities = JSON.parse(
    await readFile(path.join(__dirname, "..", "data", "cities.json"), "utf8")
  );

  const filterIds = process.argv.slice(2).map((s) => s.toLowerCase());
  const cities = filterIds.length
    ? allCities.filter((c) => filterIds.includes(c.id))
    : allCities;

  if (filterIds.length && cities.length !== filterIds.length) {
    const found = new Set(cities.map((c) => c.id));
    const missing = filterIds.filter((id) => !found.has(id));
    console.error(`Unknown city id(s): ${missing.join(", ")}`);
    process.exit(1);
  }

  const outDir = path.join(__dirname, "..", "data", "isochrones-raw");
  await mkdir(outDir, { recursive: true });

  let totalFeatures = 0;
  let totalFailed = 0;

  for (const city of cities) {
    const features = [];
    for (const [mode, bands] of Object.entries(BANDS)) {
      for (const minutes of bands) {
        process.stdout.write(`${city.name} ${mode} ${minutes}min... `);
        try {
          const geoJson = await fetchIsochrone(city, mode, minutes);
          if (!geoJson) {
            console.log("no geometry returned, skipped");
            continue;
          }
          features.push({
            type: "Feature",
            properties: { city: city.id, mode, minutes },
            geometry: geoJson.type === "Feature" ? geoJson.geometry : geoJson,
          });
          console.log("ok");
        } catch (err) {
          console.log(`FAILED (${err.message})`);
          totalFailed++;
        }
        // Stay well under the 600 requests/minute quota.
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    const collection = { type: "FeatureCollection", features };
    const outPath = path.join(outDir, `${city.id}.geojson`);
    await writeFile(outPath, JSON.stringify(collection));
    totalFeatures += features.length;
  }

  console.log(`\nWrote ${totalFeatures} features across ${cities.length} cities to ${outDir}`);
  if (totalFailed > 0) {
    console.log(`${totalFailed} request(s) failed — re-run with the affected city id(s) as arguments to retry.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
