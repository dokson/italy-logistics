// User-triggered state transitions (select a city, switch travel mode).
// Depends on map.js one-directionally; wires itself into state.selectCity
// so map.js/geo.js/combobox.js can trigger a selection without importing
// this module back (see state.js for why that would be a cycle).
import { state } from "./state.js";
import { map, renderMarkers, renderIsochrones, buildLegend } from "./map.js";

export function selectCity(city) {
  state.currentCity = city;
  document.getElementById("citySearch").value = city.name;
  document.getElementById("ovrTitle").textContent = city.name;
  document.getElementById("ovrCoords").textContent = `${city.lat.toFixed(4)}°N ${city.lon.toFixed(4)}°E`;
  renderMarkers();
  renderIsochrones();
  map.setView([city.lat, city.lon], 11);
}

export function selectMode(mode) {
  state.currentMode = mode;
  state.timeFilter = null; // band values differ per mode, so any prior selection is meaningless
  document.querySelectorAll(".modes button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  buildLegend(mode);
  renderIsochrones();
}

document.querySelectorAll(".modes button").forEach((btn) => {
  btn.addEventListener("click", () => selectMode(btn.dataset.mode));
});

state.selectCity = selectCity;
