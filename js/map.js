// Leaflet map setup, markers, legend/time-filter, and isochrone rendering.
// Depends on geo.js (one-directional: map -> geo) for the reachable-cities
// list; never imports actions.js or i18n.js — see state.js for why.
import { state, BANDS, COLORS, t } from "./state.js";
import { renderReachableList } from "./geo.js";

export const map = L.map("map", { zoomControl: true, attributionControl: false }).setView([42.5, 12.5], 6);
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

const isoLayer = L.layerGroup().addTo(map);
const markerLayer = L.layerGroup().addTo(map);

export function renderMarkers() {
  markerLayer.clearLayers();
  state.cities.forEach((city) => {
    const isOrigin = state.currentCity && city.id === state.currentCity.id;
    const icon = L.divIcon({
      className: "",
      html: `<div class="city-marker${isOrigin ? " origin" : ""}"></div>`,
      iconSize: isOrigin ? [20, 20] : [12, 12],
    });
    const marker = L.marker([city.lat, city.lon], { icon }).addTo(markerLayer);
    marker.bindTooltip(city.name, { className: "city-label", permanent: true, direction: "right", offset: [4, 0] });
    marker.on("click", () => state.selectCity(city));
  });
}

export function buildLegend(mode) {
  const legend = document.getElementById("legend");
  legend.innerHTML = "";
  const bands = BANDS[mode];

  const allRow = document.createElement("button");
  allRow.type = "button";
  allRow.className = "row" + (state.timeFilter === null ? " active" : "");
  allRow.innerHTML = `<span>${t("timeFilterAll")}</span>`;
  allRow.addEventListener("click", () => setTimeFilter(null));
  legend.appendChild(allRow);

  bands.forEach((minutes, i) => {
    const prev = i === 0 ? 0 : bands[i - 1];
    const row = document.createElement("button");
    row.type = "button";
    row.className = "row" + (state.timeFilter === minutes ? " active" : "");
    row.innerHTML = `<div class="swatch" style="background:${COLORS[i]}"></div><span>${prev}–${minutes} min</span>`;
    row.addEventListener("click", () => setTimeFilter(minutes));
    legend.appendChild(row);
  });
}

// The legend doubles as a single-select time filter: clicking a band shows
// only that ring (isochrone polygons are already cumulative — the 30-min
// polygon fully covers the 0-30 range — so one ring is sufficient) and
// narrows the reachable-cities list to that same cutoff.
export function setTimeFilter(minutes) {
  state.timeFilter = minutes;
  buildLegend(state.currentMode);
  renderIsochrones();
}

export async function loadCityFeatures(cityId) {
  if (state.cityFeatureCache.has(cityId)) return state.cityFeatureCache.get(cityId);
  try {
    const collection = await fetch(`data/isochrones/${cityId}.geojson`).then((r) => {
      if (!r.ok) throw new Error("missing");
      return r.json();
    });
    state.cityFeatureCache.set(cityId, collection.features);
    return collection.features;
  } catch (err) {
    state.cityFeatureCache.set(cityId, null);
    return null;
  }
}

export async function renderIsochrones() {
  isoLayer.clearLayers();
  if (!state.currentCity) return;

  const requestedCity = state.currentCity;
  document.getElementById("ovrSub").textContent = t("loading");
  const allFeatures = await loadCityFeatures(requestedCity.id);
  if (state.currentCity !== requestedCity) return; // user switched city while loading

  if (allFeatures === null) {
    document.getElementById("banner").style.display = "block";
    document.getElementById("ovrSub").textContent = t("noData");
    document.getElementById("reachableList").innerHTML = "";
    return;
  }
  document.getElementById("banner").style.display = "none";

  const bands = BANDS[state.currentMode];
  const features = allFeatures
    .filter((f) => f.properties.mode === state.currentMode && (state.timeFilter === null || f.properties.minutes === state.timeFilter))
    .sort((a, b) => b.properties.minutes - a.properties.minutes); // largest first, so smallest draws on top

  if (features.length === 0) {
    document.getElementById("ovrSub").textContent = t("noIsochrones");
    document.getElementById("reachableList").innerHTML = "";
    return;
  }

  features.forEach((f) => {
    const idx = bands.indexOf(f.properties.minutes);
    const color = COLORS[idx] ?? COLORS[COLORS.length - 1];
    const layer = L.geoJSON(f, {
      style: {
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.22,
      },
    });
    layer.bindPopup(`<b>${state.currentCity.name}</b><br/>${t("mode" + f.properties.mode[0] + f.properties.mode.slice(1).toLowerCase()) || state.currentMode} · ≤ ${f.properties.minutes} min`);
    layer.addTo(isoLayer);
  });

  document.getElementById("ovrSub").textContent = state.timeFilter === null ? `${bands.join("/")} min` : `≤ ${state.timeFilter} min`;
  renderReachableList(allFeatures, state.currentMode);
}
