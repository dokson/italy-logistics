// One-time post-processing step. Run after generate-isochrones.mjs:
//   node scripts/simplify-isochrones.mjs
//
// Reads every raw per-city file from data/isochrones-raw/<id>.geojson and
// writes the simplified version to data/isochrones/<id>.geojson — the
// directory the published site actually fetches from (one small request
// per selected city instead of one huge combined file).
//
// The Isochrones API returns very high-resolution polygons (thousands of
// vertices per ring). For a local reachability map that's wasted precision
// far below street-level accuracy, so we apply Douglas-Peucker line
// simplification to each ring, then round coordinates, before committing
// the GeoJSON.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ~100m at Italian latitudes — well below what's visible on a city/metro-area
// scale map, but cuts vertex count drastically vs. the raw API output.
// Override with SIMPLIFY_TOLERANCE_DEG for experimentation.
const TOLERANCE_DEG = Number(process.env.SIMPLIFY_TOLERANCE_DEG ?? 0.0005);

// 5 decimal places is ~1.1m at the equator — far tighter than the
// simplification tolerance above, so it loses no visible precision while
// roughly halving the JSON text size (raw API output ships 15 digits).
const COORD_DECIMALS = 5;

function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(x - projX, y - projY);
}

// Iterative Douglas-Peucker (explicit stack) — the recursive formulation can
// blow the call stack on pathological rings (near-collinear points produce
// deep, unbalanced splits), and the API returns rings with 1000s of points.
function douglasPeucker(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [startIdx, endIdx] = stack.pop();
    if (endIdx - startIdx < 2) continue;

    const first = points[startIdx];
    const last = points[endIdx];
    let maxDist = 0;
    let maxIndex = startIdx;
    for (let i = startIdx + 1; i < endIdx; i++) {
      const dist = perpendicularDistance(points[i], first, last);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    if (maxDist > tolerance) {
      keep[maxIndex] = 1;
      stack.push([startIdx, maxIndex], [maxIndex, endIdx]);
    }
  }

  const result = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) result.push(points[i]);
  }
  return result;
}

function roundCoord(point) {
  return [
    Number(point[0].toFixed(COORD_DECIMALS)),
    Number(point[1].toFixed(COORD_DECIMALS)),
  ];
}

// GeoJSON polygons require each ring to be closed and have >= 4 positions
// (3 distinct vertices + the repeated closing one). Aggressive tolerance on
// small/near-circular rings can simplify below that floor; fall back to a
// coarse triangle from the original ring rather than emit an invalid ring.
function simplifyRing(ring, tolerance) {
  if (ring.length <= 4) return ring.map(roundCoord);

  const openRing = ring.slice(0, -1); // drop the duplicated closing point
  let simplified = douglasPeucker(openRing, tolerance);

  if (simplified.length < 3) {
    const mid = openRing[Math.floor(openRing.length / 2)];
    simplified = [openRing[0], mid, openRing[openRing.length - 1]];
  }

  const rounded = simplified.map(roundCoord);
  rounded.push(rounded[0]); // re-close the ring
  return rounded;
}

function simplifyGeometry(geometry, tolerance) {
  if (geometry.type === "Polygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring, tolerance)),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((poly) =>
        poly.map((ring) => simplifyRing(ring, tolerance))
      ),
    };
  }
  return geometry;
}

function countVertices(geometry) {
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
  return rings.reduce((sum, r) => sum + r.length, 0);
}

async function main() {
  const rawDir = path.join(__dirname, "..", "data", "isochrones-raw");
  const outDir = path.join(__dirname, "..", "data", "isochrones");
  await mkdir(outDir, { recursive: true });

  const files = (await readdir(rawDir)).filter((f) => f.endsWith(".geojson"));

  let totalBefore = 0;
  let totalAfter = 0;
  let totalBytes = 0;

  for (const file of files) {
    const collection = JSON.parse(await readFile(path.join(rawDir, file), "utf8"));

    for (const feature of collection.features) {
      totalBefore += countVertices(feature.geometry);
      feature.geometry = simplifyGeometry(feature.geometry, TOLERANCE_DEG);
      totalAfter += countVertices(feature.geometry);
    }

    const json = JSON.stringify(collection);
    await writeFile(path.join(outDir, file), json);
    totalBytes += Buffer.byteLength(json);
  }

  const reduction = ((1 - totalAfter / totalBefore) * 100).toFixed(1);
  const sizeMB = (totalBytes / (1024 * 1024)).toFixed(2);
  console.log(`Processed ${files.length} cities`);
  console.log(`Vertices: ${totalBefore} -> ${totalAfter} (${reduction}% reduction)`);
  console.log(`Total output size: ${sizeMB} MB (tolerance=${TOLERANCE_DEG}deg)`);
}

main();
