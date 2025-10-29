// scripts/update-rounds.mjs — MapleSteps rules feed updater (12 latest rounds)
// Source of truth: IRCC rounds JSON (ee_rounds_###_en.json) linked from the IRCC rounds page.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RULES_PATH = resolve(__dirname, "../data/rounds.remote.json");
const IRCC_ROUNDS_PAGE =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html";

// ---------- helpers ----------
function iso(dateLike) {
  const d = new Date(dateLike ?? "");
  if (Number.isNaN(d.getTime())) throw new Error(`Unparsable draw date: ${JSON.stringify(dateLike)}`);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10); // YYYY-MM-DD
}
function num(x) {
  if (x == null) return null;
  const n = Number(String(x).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function pickCategory(t = "", name = "") {
  const s = `${t} ${name}`.toLowerCase();
  if (s.includes("provincial nominee")) return "Provincial Nominee Program (PNP)";
  if (s.includes("french")) return "French language proficiency (Version 1)";
  if (s.includes("healthcare")) return "Healthcare and social services occupations";
  if (s.includes("trade")) return "Trade occupations";
  if (s.includes("transport")) return "Transport occupations";
  if (s.includes("stem")) return "STEM occupations";
  if (s.includes("agriculture")) return "Agriculture and agri-food occupations";
  if (s.includes("category")) return "Category-based (unspecified)";
  return "General (no program specified)";
}
async function fetchText(url) {
  const r = await fetch(url, { headers: { "user-agent": "MapleSteps-RulesBot/1.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.text();
}
async function fetchJson(url) {
  const r = await fetch(url, { headers: { "user-agent": "MapleSteps-RulesBot/1.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.json();
}
function byDateDesc(a, b) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

// ---------- core ----------
async function getLatestJsonUrl() {
  const html = await fetchText(IRCC_ROUNDS_PAGE);
  const re = /ee_rounds_(\d+)_en\.json/gi;
  let m, max = -1;
  while ((m = re.exec(html)) !== null) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  if (max < 0) throw new Error("No ee_rounds_###_en.json links found on IRCC page.");
  return `https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_${max}_en.json`;
}

function normalizeIRCC(ircc) {
  // IRCC shapes seen: { rounds:[...] } OR { classes:[{ rounds:[...] }, ...] }
  const arr = Array.isArray(ircc.rounds)
    ? ircc.rounds
    : (Array.isArray(ircc.classes) && Array.isArray(ircc.classes[0]?.rounds) ? ircc.classes[0].rounds : []);
  if (!arr.length) throw new Error("IRCC JSON has no rounds array.");

  // Map IRCC fields → our schema (with backward-compatible aliases)
  const mapped = arr.map((r) => {
    const drawDate = r.drawDate || r.date || r.roundDate || r.publicationDate || r["Draw Date"] || r["Date"];
    const name = r.drawName || r.drawCategory || r.program || r.name || "";
    const type = r.drawType || r.category || r.roundCategory || r.type || "";
    const size = r.drawSize || r.numberInvited || r.invitations || r.ita || r.numberOfInvitationsIssued || null;
    const crs = r.drawCRS || r.crsCutoff || r.cutoff_score || r.crs || r.crs_cutoff || null;
    const drawNo = r.drawNumber || r.roundNumber || r.number || null;

    const entry = {
      date: iso(drawDate),
      category: pickCategory(String(type || name), String(name || type)),
      // canonical keys:
      invitations: num(size),
      crs_cutoff: num(crs),
      draw_number: num(drawNo),
      // backward-compatible aliases used by some app screens:
      invited: num(size),
      cutoff: num(crs),
      // provenance:
      source_urls: [IRCC_ROUNDS_PAGE],
    };
    return entry;
  });

  // sort newest → oldest and take the most recent 12
  return mapped.sort(byDateDesc).slice(0, 12);
}

function readExisting(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { entries: [] };
  }
}

function equalEntries(a = [], b = []) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main() {
  const jsonUrl = await getLatestJsonUrl();
  const ircc = await fetchJson(jsonUrl);
  const nextEntries = normalizeIRCC(ircc).map(e => ({
    ...e,
    source_urls: [IRCC_ROUNDS_PAGE, jsonUrl], // include the exact JSON URL we used
  }));

  const prev = readExisting(RULES_PATH);
  const out = {
    version: new Date().toISOString().slice(0, 10),
    last_checked: new Date().toISOString(),
    source_urls: [IRCC_ROUNDS_PAGE, jsonUrl],
    entries: nextEntries,
  };

  if (equalEntries(prev.entries, out.entries)) {
    console.log("[NOCHANGE] rounds.remote.json already up-to-date with", nextEntries.length, "entries");
    return;
  }

  writeFileSync(RULES_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`[UPDATED] Wrote ${RULES_PATH} with ${nextEntries.length} entries`);
}

main().catch((e) => {
  console.error("[ERROR]", e?.stack || e?.message || e);
  process.exit(1);
});
