// Searchable city dropdown: filtering, keyboard nav, outside-click close.
// Only depends on state.js (see state.js for why this keeps the module
// graph acyclic — selecting a city goes through state.selectCity).
import { state, MAX_DROPDOWN_RESULTS } from "./state.js";

const citySearch = document.getElementById("citySearch");
const cityDropdown = document.getElementById("cityDropdown");
let dropdownMatches = [];
let dropdownActiveIndex = -1;

function normalize(str) {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function renderDropdown(query) {
  const q = normalize(query.trim());
  dropdownMatches = (q ? state.cities.filter((c) => normalize(c.name).includes(q)) : state.cities).slice(0, MAX_DROPDOWN_RESULTS);
  dropdownActiveIndex = dropdownMatches.length ? 0 : -1;

  cityDropdown.innerHTML = "";
  dropdownMatches.forEach((city, i) => {
    const li = document.createElement("li");
    li.textContent = city.name;
    li.dataset.index = i;
    li.className = i === dropdownActiveIndex ? "active" : "";
    li.addEventListener("mousedown", (e) => {
      e.preventDefault(); // keep focus/avoid input blur before click registers
      state.selectCity(city);
      closeDropdown();
    });
    cityDropdown.appendChild(li);
  });

  cityDropdown.hidden = dropdownMatches.length === 0;
}

function closeDropdown() {
  cityDropdown.hidden = true;
  dropdownMatches = [];
  dropdownActiveIndex = -1;
}

function highlightActive() {
  [...cityDropdown.children].forEach((li, i) => li.classList.toggle("active", i === dropdownActiveIndex));
  cityDropdown.children[dropdownActiveIndex]?.scrollIntoView({ block: "nearest" });
}

citySearch.addEventListener("focus", () => renderDropdown(""));
citySearch.addEventListener("input", () => renderDropdown(citySearch.value));

citySearch.addEventListener("keydown", (e) => {
  if (cityDropdown.hidden && e.key !== "ArrowDown") return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (cityDropdown.hidden) return renderDropdown(citySearch.value);
    dropdownActiveIndex = Math.min(dropdownActiveIndex + 1, dropdownMatches.length - 1);
    highlightActive();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    dropdownActiveIndex = Math.max(dropdownActiveIndex - 1, 0);
    highlightActive();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const city = dropdownMatches[dropdownActiveIndex];
    if (city) state.selectCity(city);
    closeDropdown();
    citySearch.blur();
  } else if (e.key === "Escape") {
    closeDropdown();
    citySearch.blur();
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".city-combobox")) closeDropdown();
});
