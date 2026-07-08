// Entry point. Import order matters here: actions.js must be evaluated
// (via the `selectCity` import below) before main() runs, since it assigns
// itself into state.selectCity as a side effect of being loaded — every
// static import in this file is fully evaluated before this module's own
// body runs, so that assignment is guaranteed to have happened by then.
import { state } from "./state.js";
import { applyTranslations } from "./i18n.js";
import { renderMarkers } from "./map.js";
import { nearestCity, getUserLocation } from "./geo.js";
import { selectCity } from "./actions.js";
import "./combobox.js"; // side-effect only: wires up the search input

async function main() {
  applyTranslations();

  state.cities = await fetch("data/cities.json").then((r) => r.json());
  state.cities.sort((a, b) => a.name.localeCompare(b.name, "it"));

  renderMarkers();

  const fallbackCity = state.cities.find((c) => c.id === "roma") || state.cities[0];
  selectCity(fallbackCity); // show something immediately, don't block on geolocation

  const position = await getUserLocation();
  if (position && state.currentCity === fallbackCity) {
    const nearest = nearestCity(position.lat, position.lon);
    if (nearest && nearest.id !== fallbackCity.id) selectCity(nearest);
  }
}

main();
