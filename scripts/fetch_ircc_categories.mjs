// scripts/fetch_ircc_categories.mjs
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE = path.resolve(__dirname, "..", "data", "noc.categories.json");
const today = new Date().toISOString().slice(0, 10);

// Allow override in CI if IRCC moves the page
const IRCC_URL =
  process.env.IRCC_CATEGORIES_URL ||
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations/category-based-selection.html";

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function slugifyCategory(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\s+occupations?\s*$/i, "") // trim trailing "occupations"
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function uniqueSorted(arr) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

function extractCodesFromTable($, $table) {
  const codes = [];
  $table.find("td, th").each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, " ").trim();
    const matches = txt.match(/\b\d{5}\b/g);
    if (matches) codes.push(...matches);
  });
  return uniqueSorted(codes.filter((c) => /^\d{5}$/.test(c)));
}

function normalizeHeadingText(s) {
  return s.replace(/\s+/g, " ").trim();
}

function findFollowingTable($, el) {
  // Walk forward siblings until we hit the first <table>, or stop at next heading
  let $n = $(el).next();
  while ($n && $n.length) {
    if ($n.is("table")) return $n;
    if ($n.is("h2, h3, h4")) break;
    $n = $n.next();
  }
  return null;
}

function stableGroupsObject(groups) {
  const out = {};
  for (const key of Object.keys(groups).sort()) {
    out[key] = uniqueSorted(groups[key]);
  }
  return out;
}

async function fetchIRCCGroups() {
  const res = await fetch(IRCC_URL, {
    headers: {
      "User-Agent": "MapleStepsRulesBot/1.0 (+https://github.com/maplesteps/)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch IRCC page: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const groups = {};
  $("h3").each((_, h) => {
    const heading = normalizeHeadingText($(h).text());
    // Match "Who’s" or "Who's"
    const m = heading.match(/who.?s eligible for (?:the )?(.+?) category/i);
    if (!m) return;
    const rawName = m[1]; // e.g., "healthcare and social services occupations"
    const cleanName = rawName.replace(/^\s*the\s+/i, "").trim();
    const slug = slugifyCategory(cleanName);

    const $table = findFollowingTable($, h);
    const codes = $table && $table.length ? extractCodesFromTable($, $table) : [];
    groups[slug] = codes;
  });

  if (Object.keys(groups).length === 0) {
    throw new Error("No categories parsed from IRCC page; structure may have changed.");
  }
  return stableGroupsObject(groups);
}

async function main() {
  // Load existing (for CI no-churn check)
  const existing = await (async () => {
    try { return JSON.parse(await fs.readFile(FILE, "utf8")); }
    catch { return null; }
  })();

  // Build object (preserve your shape)
  let obj;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    obj = JSON.parse(raw);
  } catch {
    obj = {};
  }

  // Update fixed fields
  obj.schema_version = 1;
  obj.last_checked = today;

  // Remove legacy fields if present
  if ("source_url" in obj) delete obj.source_url;
  if ("categories" in obj) delete obj.categories;

  // Live scrape
  const liveGroups = await fetchIRCCGroups();

  // CI no-churn: skip write entirely if only groups are unchanged
  if (process.env.CI && existing && deepEqual(existing.groups, liveGroups)) {
    console.log("[categories] CI: groups unchanged → skipping write");
    return;
  }

  // Write new payload
  obj.groups = liveGroups;
  obj.source = {
    name: "IRCC: Category-based selection (Express Entry)",
    url: IRCC_URL,
    retrieved_at: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(obj, null, 2) + "\n", "utf8");
  console.log(`Wrote ${FILE} with ${Object.keys(liveGroups).length} categories`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
