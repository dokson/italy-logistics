const I18N = {
  en: {
    title_html: "Italy <em>Isochrone</em>",
    kicker: "Local reachability map",
    subtitle: "Local reachability map for 111 Italian provincial capitals, computed with the Google Isochrones API: drive, walk &amp; bike.",
    cityLabel: "City",
    citySearchPlaceholder: "Search 111 cities…",
    modeLabel: "Mode",
    modeDrive: "Drive",
    modeWalk: "Walk",
    modeBike: "Bike",
    travelTimeLabel: "Travel time",
    infoHowLabel: "How it works:",
    infoHowText: "pick a city and a mode; the colored bands show how far you can get in that time from the center. Polygons are precomputed offline, so the published site never calls the API.",
    footerData: '<span class="dot">◈</span> Data: Google Isochrones API',
    footerScope: "PoC: local reachability, not intercity",
    madeBy: "Made by",
    selectCity: "Select a city",
    isochronesFrom: "Isochrones from selected origin",
    bannerMissing: "Isochrone data not found for this city. Run the generation/simplification scripts first.",
    loading: "Loading…",
    noData: "No data available for this city",
    noIsochrones: "No isochrones available for this combination",
    aboutTrigger: "About this data",
    aboutTitle: "About this data",
    aboutWhatTitle: "What's an isochrone?",
    aboutWhatText: "An isochrone (\"equal time\") is a polygon covering everywhere reachable within a fixed time from a point, shaped by real streets, one-ways and turns, not a compass-drawn circle. A 15-minute drive rarely looks round.",
    aboutMethodTitle: "How it's built",
    aboutMethodItems: [
      "Every polygon is fetched once from <b>Google's Isochrones API</b> (currently in Preview) and cached as static GeoJSON. The published site never calls Google at runtime, and never ships an API key.",
      "Coverage is capped by the API itself: up to <b>60 min</b> for driving, up to <b>120 min</b> for walking and cycling. There's no transit mode, which is why this is deliberately a <b>local/urban</b> reachability tool, not an intercity one.",
      "Routing preference is <b>TRAFFIC_UNAWARE</b>: polygons reflect road network structure and speed limits, not live congestion.",
      "Raw API polygons (up to ~3,000 vertices) are simplified with Douglas-Peucker to keep the site light without losing visible shape.",
    ],
    aboutDocsLink: "Google Isochrones API: official documentation ↗",
  },
  it: {
    title_html: "Isocrone <em>Italia</em>",
    kicker: "Mappa di raggiungibilità locale",
    subtitle: "Mappa di raggiungibilità locale per 111 capoluoghi di provincia italiani, calcolata con la Google Isochrones API: auto, a piedi e bici.",
    cityLabel: "Città",
    citySearchPlaceholder: "Cerca tra 111 città…",
    modeLabel: "Modalità",
    modeDrive: "Auto",
    modeWalk: "A piedi",
    modeBike: "Bici",
    travelTimeLabel: "Tempo di percorrenza",
    infoHowLabel: "Come funziona:",
    infoHowText: "scegli una città e una modalità: le fasce colorate mostrano fino a dove puoi arrivare in quel tempo dal centro. Poligoni precalcolati offline, quindi il sito pubblicato non chiama mai l'API.",
    footerData: '<span class="dot">◈</span> Dati: Google Isochrones API',
    footerScope: "PoC: raggiungibilità locale, non intercity",
    madeBy: "Creato da",
    selectCity: "Seleziona una città",
    isochronesFrom: "Isocrone dal centro selezionato",
    bannerMissing: "Dati isocrone non trovati per questa città. Esegui prima gli script di generazione/semplificazione.",
    loading: "Caricamento…",
    noData: "Dati non disponibili per questa città",
    noIsochrones: "Nessuna isocrona disponibile per questa combinazione",
    aboutTrigger: "Informazioni sui dati",
    aboutTitle: "Informazioni sui dati",
    aboutWhatTitle: "Cos'è un'isocrona?",
    aboutWhatText: "Un'isocrona (\"tempo uguale\") è un poligono che copre tutto ciò che è raggiungibile in un tempo fisso da un punto, determinato da strade reali, sensi unici e svolte, non da un cerchio disegnato col compasso. Un tragitto di 15 minuti in auto raramente è rotondo.",
    aboutMethodTitle: "Come è costruito",
    aboutMethodItems: [
      "Ogni poligono viene richiesto una sola volta alla <b>Isochrones API di Google</b> (attualmente in Preview) e salvato come GeoJSON statico. Il sito pubblicato non chiama mai Google in runtime, e non contiene mai una API key.",
      "La copertura è limitata dall'API stessa: fino a <b>60 min</b> in auto, fino a <b>120 min</b> a piedi e in bici. Non esiste una modalità treno/trasporto pubblico, per questo lo strumento è pensato deliberatamente per la raggiungibilità <b>locale/urbana</b>, non per confronti intercity.",
      "La preferenza di routing è <b>TRAFFIC_UNAWARE</b>: i poligoni riflettono la struttura della rete stradale e i limiti di velocità, non il traffico in tempo reale.",
      "I poligoni grezzi dell'API (fino a ~3.000 vertici) vengono semplificati con l'algoritmo Douglas-Peucker per mantenere il sito leggero senza perdere la forma visibile.",
    ],
    aboutDocsLink: "Google Isochrones API: documentazione ufficiale ↗",
  },
};

let lang = localStorage.getItem("isochrone-atlas-lang") || "en";

function t(key) {
  return I18N[lang][key] ?? I18N.en[key] ?? key;
}

function applyTranslations() {
  document.documentElement.lang = lang;
  document.title = lang === "it" ? "Isocrone Italia: mappa di raggiungibilità locale" : "Italy Isochrone: local reachability map";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const dict = I18N[lang][key] ?? I18N.en[key];
    if (dict === undefined) return;
    if (key === "title" ) el.innerHTML = t("title_html");
    else el.textContent = dict;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.getElementById("footerData").innerHTML = t("footerData");

  const methodList = document.getElementById("aboutMethodList");
  methodList.innerHTML = "";
  t("aboutMethodItems").forEach((html) => {
    const li = document.createElement("li");
    li.innerHTML = html;
    methodList.appendChild(li);
  });
  const docsUrl = `https://developers.google.com/maps/documentation/isochrones${lang === "it" ? "?hl=it" : ""}`;
  document.getElementById("aboutDocsLink").href = docsUrl;
  document.getElementById("footerData").href = docsUrl;

  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  buildLegend(currentMode);
  if (currentCity) {
    document.getElementById("ovrTitle").textContent = currentCity.name;
  }
}

document.querySelectorAll(".lang-toggle button").forEach((btn) => {
  btn.addEventListener("click", () => {
    lang = btn.dataset.lang;
    localStorage.setItem("isochrone-atlas-lang", lang);
    applyTranslations();
  });
});

const aboutDialog = document.getElementById("aboutDialog");
document.getElementById("aboutTrigger").addEventListener("click", () => aboutDialog.showModal());
document.getElementById("aboutClose").addEventListener("click", () => aboutDialog.close());
aboutDialog.addEventListener("click", (e) => {
  if (e.target === aboutDialog) aboutDialog.close(); // click on ::backdrop area / dialog padding
});

const BANDS = {
  DRIVE: [15, 30, 45, 60],
  WALK: [15, 30, 60, 120],
  BICYCLE: [15, 30, 60, 120],
};
// Purple → magenta-pink, matching coalesce.coach's brand gradient across bands
const COLORS = ["hsl(240 100% 68%)", "hsl(264 89% 65%)", "hsl(300 85% 62%)", "hsl(335 82% 60%)"];

let cities = [];
let cityFeatureCache = new Map(); // city.id -> features[] | null (null = fetch failed)
let currentCity = null;
let currentMode = "DRIVE";

const map = L.map("map", { zoomControl: true, attributionControl: false }).setView([42.5, 12.5], 6);
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

let isoLayer = L.layerGroup().addTo(map);
let markerLayer = L.layerGroup().addTo(map);

function buildLegend(mode) {
  const legend = document.getElementById("legend");
  legend.innerHTML = "";
  const bands = BANDS[mode];
  bands.forEach((minutes, i) => {
    const prev = i === 0 ? 0 : bands[i - 1];
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<div class="swatch" style="background:${COLORS[i]}"></div>${prev}–${minutes} min`;
    legend.appendChild(row);
  });
}

function renderMarkers() {
  markerLayer.clearLayers();
  cities.forEach((city) => {
    const isOrigin = currentCity && city.id === currentCity.id;
    const icon = L.divIcon({
      className: "",
      html: `<div class="city-marker${isOrigin ? " origin" : ""}"></div>`,
      iconSize: isOrigin ? [20, 20] : [12, 12],
    });
    const marker = L.marker([city.lat, city.lon], { icon }).addTo(markerLayer);
    marker.bindTooltip(city.name, { className: "city-label", permanent: true, direction: "right", offset: [4, 0] });
    marker.on("click", () => selectCity(city));
  });
}

async function loadCityFeatures(cityId) {
  if (cityFeatureCache.has(cityId)) return cityFeatureCache.get(cityId);
  try {
    const collection = await fetch(`data/isochrones/${cityId}.geojson`).then((r) => {
      if (!r.ok) throw new Error("missing");
      return r.json();
    });
    cityFeatureCache.set(cityId, collection.features);
    return collection.features;
  } catch (err) {
    cityFeatureCache.set(cityId, null);
    return null;
  }
}

async function renderIsochrones() {
  isoLayer.clearLayers();
  if (!currentCity) return;

  const requestedCity = currentCity;
  document.getElementById("ovrSub").textContent = t("loading");
  const allFeatures = await loadCityFeatures(requestedCity.id);
  if (currentCity !== requestedCity) return; // user switched city while loading

  if (allFeatures === null) {
    document.getElementById("banner").style.display = "block";
    document.getElementById("ovrSub").textContent = t("noData");
    return;
  }
  document.getElementById("banner").style.display = "none";

  const bands = BANDS[currentMode];
  const features = allFeatures
    .filter((f) => f.properties.mode === currentMode)
    .sort((a, b) => b.properties.minutes - a.properties.minutes); // largest first, so smallest draws on top

  if (features.length === 0) {
    document.getElementById("ovrSub").textContent = t("noIsochrones");
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
    layer.bindPopup(`<b>${currentCity.name}</b><br/>${t("mode" + f.properties.mode[0] + f.properties.mode.slice(1).toLowerCase()) || currentMode} · ≤ ${f.properties.minutes} min`);
    layer.addTo(isoLayer);
  });

  document.getElementById("ovrSub").textContent = `${bands.join("/")} min`;
}

function selectCity(city) {
  currentCity = city;
  document.getElementById("citySearch").value = city.name;
  document.getElementById("ovrTitle").textContent = city.name;
  document.getElementById("ovrCoords").textContent = `${city.lat.toFixed(4)}°N ${city.lon.toFixed(4)}°E`;
  renderMarkers();
  renderIsochrones();
  map.setView([city.lat, city.lon], 11);
}

function selectMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".modes button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  buildLegend(mode);
  renderIsochrones();
}

document.querySelectorAll(".modes button").forEach((btn) => {
  btn.addEventListener("click", () => selectMode(btn.dataset.mode));
});

const citySearch = document.getElementById("citySearch");
citySearch.addEventListener("change", (e) => {
  const city = cities.find((c) => c.name === e.target.value);
  if (city) selectCity(city);
  else e.target.value = currentCity ? currentCity.name : "";
});

async function main() {
  applyTranslations();

  cities = await fetch("data/cities.json").then((r) => r.json());
  cities.sort((a, b) => a.name.localeCompare(b.name, "it"));

  const datalist = document.getElementById("cityOptions");
  cities.forEach((city) => {
    const opt = document.createElement("option");
    opt.value = city.name;
    datalist.appendChild(opt);
  });
  renderMarkers();

  const defaultCity = cities.find((c) => c.id === "roma") || cities[0];
  selectCity(defaultCity);
}

main();
