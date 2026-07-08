// Locale switching and DOM translation. Depends on map.js one-directionally
// (to rebuild the legend, whose labels are localized) — see state.js for
// the overall acyclic module layout.
import { state, I18N, t } from "./state.js";
import { buildLegend } from "./map.js";

export function applyTranslations() {
  document.documentElement.lang = state.lang;
  document.title = state.lang === "it" ? "Isocrone Italia: mappa di raggiungibilità locale" : "Italy Isochrone: local reachability map";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const dict = I18N[state.lang][key] ?? I18N.en[key];
    if (dict === undefined) return;
    if (key === "title") el.innerHTML = t("title_html");
    else el.textContent = dict;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  const methodList = document.getElementById("aboutMethodList");
  methodList.innerHTML = "";
  t("aboutMethodItems").forEach((html) => {
    const li = document.createElement("li");
    li.innerHTML = html;
    methodList.appendChild(li);
  });
  const docsUrl = `https://developers.google.com/maps/documentation/isochrones${state.lang === "it" ? "?hl=it" : ""}`;
  document.getElementById("aboutDocsLink").href = docsUrl;
  document.getElementById("footerData").href = docsUrl;

  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === state.lang);
  });

  buildLegend(state.currentMode);
  if (state.currentCity) {
    document.getElementById("ovrTitle").textContent = state.currentCity.name;
  }
}

document.querySelectorAll(".lang-toggle button").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.lang = btn.dataset.lang;
    localStorage.setItem("isochrone-atlas-lang", state.lang);
    applyTranslations();
  });
});

const aboutDialog = document.getElementById("aboutDialog");
document.getElementById("aboutTrigger").addEventListener("click", () => aboutDialog.showModal());
document.getElementById("aboutClose").addEventListener("click", () => aboutDialog.close());
aboutDialog.addEventListener("click", (e) => {
  if (e.target === aboutDialog) aboutDialog.close(); // click on ::backdrop area / dialog padding
});
