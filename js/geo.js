// Point-in-polygon reachability math and browser geolocation. No DOM/map
// dependency beyond the reachable-cities list markup, and no dependency on
// map.js/actions.js — see state.js for why (keeps the module graph acyclic).
import { state, BANDS, t } from "./state.js";

// Ray-casting point-in-ring test. `point` and `ring` are [lon, lat] pairs
// (GeoJSON coordinate order).
function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

// A GeoJSON Polygon's first ring is the outer boundary; any further rings
// are holes. A point counts as "inside" only if it's in the outer ring and
// NOT in any hole — the isochrone API returns plenty of holes (unreachable
// pockets), see the "About this data" panel.
function pointInPolygon(point, polygonRings) {
  if (!pointInRing(point, polygonRings[0])) return false;
  for (let i = 1; i < polygonRings.length; i++) {
    if (pointInRing(point, polygonRings[i])) return false;
  }
  return true;
}

function pointInMultiPolygon(point, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((poly) => pointInPolygon(point, poly));
}

// For the current city+mode, find every other known city that falls
// inside an isochrone band, and the fastest band that reaches it.
export function computeReachableCities(features, mode) {
  const bands = [...BANDS[mode]].sort((a, b) => a - b).filter((m) => state.timeFilter === null || m <= state.timeFilter);
  const found = new Map(); // city.id -> minutes

  for (const minutes of bands) {
    const feature = features.find((f) => f.properties.mode === mode && f.properties.minutes === minutes);
    if (!feature) continue;
    for (const city of state.cities) {
      if (city.id === state.currentCity.id || found.has(city.id)) continue;
      const point = [city.lon, city.lat];
      if (pointInMultiPolygon(point, feature.geometry)) found.set(city.id, minutes);
    }
  }

  return [...found.entries()]
    .map(([id, minutes]) => ({ city: state.cities.find((c) => c.id === id), minutes }))
    .sort((a, b) => a.minutes - b.minutes);
}

export function renderReachableList(features, mode) {
  const list = document.getElementById("reachableList");
  list.innerHTML = "";

  const reachable = computeReachableCities(features, mode);
  if (reachable.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t("reachableEmpty");
    list.appendChild(empty);
    return;
  }

  reachable.forEach(({ city, minutes }) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span>${city.name}</span><span class="t">≤ ${minutes} min</span>`;
    row.addEventListener("click", () => state.selectCity(city));
    list.appendChild(row);
  });
}

// Haversine great-circle distance in km — good enough for "nearest city"
// among ~100 points; no need for anything more precise than that.
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestCity(lat, lon) {
  return state.cities.reduce((best, c) => {
    const d = distanceKm(lat, lon, c.lat, c.lon);
    return d < best.d ? { city: c, d } : best;
  }, { city: null, d: Infinity }).city;
}

// Resolves to {lat, lon} or null — never rejects, so it never blocks startup.
// Short timeout: a slow/absent geolocation prompt shouldn't delay first paint.
export function getUserLocation() {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000, maximumAge: 300000 }
    );
  });
}
