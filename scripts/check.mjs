// Static pre-push sanity check. Zero dependencies, no browser — catches the
// class of bug we hit twice already (JS referencing a DOM id that doesn't
// exist in index.html, e.g. getElementById("cityOptions") after the markup
// was renamed to "cityDropdown"), plus basic data-integrity issues.
//
// Run manually with: node scripts/check.mjs
// Wired up as a git pre-push hook (see .git/hooks/pre-push).

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const errors = [];
const warn = (msg) => errors.push(msg);

async function readAllJs() {
  const dir = path.join(root, "js");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".js"));
  const contents = await Promise.all(files.map((f) => readFile(path.join(dir, f), "utf8")));
  return contents.join("\n");
}

async function checkIdsMatch() {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const js = await readAllJs();

  const definedIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  const referencedIds = new Set(
    [...js.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1])
  );

  for (const id of referencedIds) {
    if (!definedIds.has(id)) {
      warn(`A js/*.js file calls getElementById("${id}") but no element with id="${id}" exists in index.html`);
    }
  }

  // Also flag ids defined in HTML but never referenced anywhere (dead markup) —
  // informational only, not a hard failure, since some ids are only used from CSS.
  return { definedIds, referencedIds };
}

async function checkI18nKeys() {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const js = await readFile(path.join(root, "js", "state.js"), "utf8");

  const usedKeys = new Set([
    ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/data-i18n-placeholder="([^"]+)"/g)].map((m) => m[1]),
  ]);

  // Crude but dependency-free: extract the "en:" and "it:" object literals'
  // top-level keys from the I18N const via the same key-name pattern used
  // throughout js/state.js (`keyName: "..."` or `keyName: [...]`).
  const i18nBlockMatch = js.match(/export const I18N = \{([\s\S]*?)\n\};/);
  if (!i18nBlockMatch) {
    warn("Could not locate `export const I18N = {...}` block in js/state.js — skipping i18n key check.");
    return;
  }
  const blockText = i18nBlockMatch[1];
  const enMatch = blockText.match(/en:\s*\{([\s\S]*?)\n  \},/);
  const itMatch = blockText.match(/it:\s*\{([\s\S]*?)\n  \},/);
  if (!enMatch || !itMatch) {
    warn("Could not isolate en/it blocks inside I18N — skipping i18n key check.");
    return;
  }

  // Keys rendered via el.innerHTML in applyTranslations() (see app.js) are
  // allowed to contain HTML entities/tags; everything else goes through
  // el.textContent, which does NOT decode entities — "&amp;" would render
  // as the literal text "&amp;" instead of "&". Bit us twice already.
  const innerHtmlKeys = new Set(["title_html"]);

  for (const [lang, text] of [["en", enMatch[1]], ["it", itMatch[1]]]) {
    const keys = new Set([...text.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
    for (const key of usedKeys) {
      // special case: the <h1 data-i18n="title"> element is rendered via
      // t("title_html") in applyTranslations(), not a literal "title" key.
      const lookupKey = key === "title" ? "title_html" : key;
      if (!keys.has(lookupKey)) {
        warn(`data-i18n="${key}" used in index.html but missing from I18N.${lang}`);
      }
    }

    const stringLiterals = [...text.matchAll(/^\s*(\w+):\s*"((?:[^"\\]|\\.)*)"/gm)];
    for (const [, key, value] of stringLiterals) {
      if (innerHtmlKeys.has(key)) continue;
      if (/&\w+;/.test(value)) {
        warn(`I18N.${lang}.${key} contains an HTML entity (e.g. "&amp;") but is rendered via textContent, which won't decode it — use the literal character instead`);
      }
    }
  }
}

async function checkCityData() {
  const citiesRaw = await readFile(path.join(root, "data", "cities.json"), "utf8");
  let cities;
  try {
    cities = JSON.parse(citiesRaw);
  } catch (err) {
    warn(`data/cities.json is not valid JSON: ${err.message}`);
    return;
  }

  const ids = cities.map((c) => c.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) warn(`Duplicate city ids in cities.json: ${[...new Set(dupes)].join(", ")}`);

  for (const city of cities) {
    if (typeof city.lat !== "number" || typeof city.lon !== "number") {
      warn(`City "${city.id}" has a non-numeric lat/lon`);
    }
    if (Math.abs(city.lat) > 90 || Math.abs(city.lon) > 180) {
      warn(`City "${city.id}" has an out-of-range lat/lon (${city.lat}, ${city.lon})`);
    }
  }

  const isochronesDir = path.join(root, "data", "isochrones");
  let files;
  try {
    files = new Set(await readdir(isochronesDir));
  } catch {
    warn(`data/isochrones/ directory is missing — run scripts/generate-isochrones.mjs and scripts/simplify-isochrones.mjs.`);
    return;
  }

  for (const city of cities) {
    const filename = `${city.id}.geojson`;
    if (!files.has(filename)) {
      warn(`Missing data/isochrones/${filename} for city "${city.name}" (in cities.json but never generated)`);
      continue;
    }
    try {
      const collection = JSON.parse(await readFile(path.join(isochronesDir, filename), "utf8"));
      if (!Array.isArray(collection.features) || collection.features.length === 0) {
        warn(`data/isochrones/${filename} has no features`);
      }
    } catch (err) {
      warn(`data/isochrones/${filename} is not valid JSON: ${err.message}`);
    }
  }
}

async function main() {
  await checkIdsMatch();
  await checkI18nKeys();
  await checkCityData();

  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} check(s) failed:\n`);
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error("");
    process.exit(1);
  }

  console.log("✓ All static checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
