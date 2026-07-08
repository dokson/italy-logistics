// Shared data and mutable app state — the only module every other module
// may depend on, so it must never import from any of them (keeps the
// dependency graph acyclic: state -> geo -> map -> {i18n, actions} -> main).
export const I18N = {
  en: {
    title_html: "Italy <em>Isochrone</em>",
    kicker: "Local reachability map",
    subtitle: "Local reachability map for 119 Italian provincial capitals, computed with the Google Isochrones API: drive, walk & bike.",
    cityLabel: "City",
    citySearchPlaceholder: "Search 119 cities…",
    modeLabel: "Mode",
    modeDrive: "Drive",
    modeWalk: "Walk",
    modeBike: "Bike",
    travelTimeLabel: "Travel time",
    timeFilterAll: "All",
    reachableLabel: "Reachable cities",
    reachableEmpty: "No other cities in our database fall within range",
    infoHowLabel: "How it works:",
    infoHowText: "pick a city and a mode; the colored bands show how far you can get in that time from the center. Polygons are precomputed offline, so the published site never calls the API.",
    footerScope: "PoC: local reachability, not intercity",
    dataByLabel: "Data by",
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
    subtitle: "Mappa di raggiungibilità locale per 119 capoluoghi di provincia italiani, calcolata con la Google Isochrones API: auto, a piedi e bici.",
    cityLabel: "Città",
    citySearchPlaceholder: "Cerca tra 119 città…",
    modeLabel: "Modalità",
    modeDrive: "Auto",
    modeWalk: "A piedi",
    modeBike: "Bici",
    travelTimeLabel: "Tempo di percorrenza",
    timeFilterAll: "Tutte",
    reachableLabel: "Città raggiungibili",
    reachableEmpty: "Nessun'altra città del nostro database rientra nel raggio",
    infoHowLabel: "Come funziona:",
    infoHowText: "scegli una città e una modalità: le fasce colorate mostrano fino a dove puoi arrivare in quel tempo dal centro. Poligoni precalcolati offline, quindi il sito pubblicato non chiama mai l'API.",
    footerScope: "PoC: raggiungibilità locale, non intercity",
    dataByLabel: "Dati di",
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

export const BANDS = {
  DRIVE: [15, 30, 45, 60],
  WALK: [15, 30, 60, 120],
  BICYCLE: [15, 30, 60, 120],
};

// Purple → magenta-pink, matching coalesce.coach's brand gradient across bands
export const COLORS = ["hsl(240 100% 68%)", "hsl(264 89% 65%)", "hsl(300 85% 62%)", "hsl(335 82% 60%)"];

export const MAX_DROPDOWN_RESULTS = 8;

export const state = {
  cities: [],
  cityFeatureCache: new Map(), // city.id -> features[] | null (null = fetch failed)
  currentCity: null,
  currentMode: "DRIVE",
  // The legend doubles as a single-select time filter — null means "show all bands".
  timeFilter: null,
  lang: localStorage.getItem("isochrone-atlas-lang") || "en",
  // Assigned once by actions.js at load time. map.js/geo.js/combobox.js need
  // to trigger a city selection (marker click, list-row click, dropdown
  // pick) but can't import actions.js directly — actions.js already imports
  // map.js, and a two-way import would be a cycle. Routing the call through
  // this shared slot keeps the module graph a DAG.
  selectCity: null,
};

export function t(key) {
  return I18N[state.lang][key] ?? I18N.en[key] ?? key;
}
