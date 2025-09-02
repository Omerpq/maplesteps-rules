// scripts/fetch_noc.mjs
// If NOC_SOURCE_URL is set (CSV or JSON), fetch + normalize.
// Otherwise, keep your current items but ensure contract shape.

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseCsv } from "csv-parse/sync";
import {
  deriveTeerFromCode,
  normalizeTitle,
  generateKeywords,
  stableSortByCode
} from "./lib/normalizers.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT = path.resolve(__dirname, "..", "data", "noc.2021.json");
const today = new Date().toISOString().slice(0, 10);

const NOC_SOURCE_URL = process.env.NOC_SOURCE_URL || "";           // plug later
const NOC_SOURCE_FORMAT = (process.env.NOC_SOURCE_FORMAT || "auto").toLowerCase(); // csv|json|auto

function pretty(obj) { return JSON.stringify(obj, null, 2) + "\n"; }

async function fetchBuffer(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "";
  return { buf, ct, retrievedAt: new Date().toISOString() };
}

function pickByRegex(row, regexes) {
  const keys = Object.keys(row);
  for (const rx of regexes) {
    const k = keys.find((h) => rx.test(h));
    if (k) return row[k];
  }
  return null;
}

function pickCode(row) {
  // Matches: "Code", "NOC code", "Unit group code", "noc_2021", etc. (EN/FR tolerant)
  return pickByRegex(row, [
    /^code$/i,
    /\bNOC.?code\b/i,
    /\bunit\s*group\s*code\b/i,
    /\bnoc[_\s-]?2021\b/i,
    /\bcode\s*(noc)?\b/i,
    /\bcode.*(groupe|profession)\b/i,            // FR fallbacks
  ]);
}

function pickTitle(row) {
  // Prefer explicit English titles if present, else any "title"-ish header.
  const englishFirst = pickByRegex(row, [
    /\btitle\s*\(english\)|\benglish.*title\b/i,
    /\btitre\s*\(anglais\)|\banglais.*titre\b/i, // FR "Title (English)"
  ]);
  if (englishFirst) return englishFirst;

  return pickByRegex(row, [
    /\btitle\b/i,
    /\bgroup\s*title\b/i,
    /\boccupation.*(name|title)\b/i,
    /\bunit\s*group\s*title\b/i,
    /\btitre\b/i,                                // FR fallback
  ]);
}



function toItems(records) {
  const seen = new Map();
  for (const r of records) {
    const c = String(pickCode(r) ?? "").padStart(5, "0");
    const t = normalizeTitle(pickTitle(r) ?? "");
    if (!/^\d{5}$/.test(c) || !t) continue;
    let teer;
    try { teer = deriveTeerFromCode(c); } catch { continue; }
    const keywords = generateKeywords(t);
    if (!seen.has(c)) seen.set(c, { code: c, title: t, teer, keywords });
  }
  return stableSortByCode([...seen.values()]);
}

function parseCSV(buf) {
  const text = buf.toString("utf8");
  const rows = parseCsv(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true
  });

  // DEBUG: print headers once to help catch future StatCan header changes
  // (gate it so it won’t spam CI)
  if (rows.length && process.env.DEBUG_NOC_HEADERS === "1") {
    console.log("[noc] Detected headers:", Object.keys(rows[0]).join(" | "));
  }

  return rows;
}


async function parseAuto(buf, ct) {
  if (NOC_SOURCE_FORMAT === "json" || (NOC_SOURCE_FORMAT === "auto" && ct.includes("json"))) {
    const text = buf.toString("utf8");
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : data.data || data.records || [];
  }
  return parseCSV(buf);
}

async function readExisting() {
  try { return JSON.parse(await fs.readFile(OUT, "utf8")); }
  catch { return null; }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}


async function main() {
  const existing = await readExisting();
  let items = null;
  let retrieved_at = null;

  if (NOC_SOURCE_URL.startsWith("http")) {
    try {
      const { buf, ct, retrievedAt } = await fetchBuffer(NOC_SOURCE_URL);
      retrieved_at = retrievedAt;
      const records = await parseAuto(buf, ct);
      items = toItems(records);
    } catch (e) {
      console.warn(`[noc] WARNING: live fetch failed: ${e.message}`);
    }
  }

  // Fallback: keep existing items or seed minimal examples
  if (!items || items.length === 0) {
    const base = existing?.items && Array.isArray(existing.items) ? existing.items : [
      { code: "21231", title: "Software engineers and designers" },
      { code: "62020", title: "Food service supervisors" }
    ];
    items = base.map((it) => {
      const code = String(it.code || "").padStart(5, "0");
      const title = normalizeTitle(it.title || "");
      let teer;
      try { teer = typeof it.teer === "number" ? it.teer : deriveTeerFromCode(code); } catch { teer = undefined; }
      const keywords = Array.isArray(it.keywords) && it.keywords.length ? it.keywords : generateKeywords(title);
      return { code, title, teer, keywords };
    });
  }

  const next = {
    schema_version: 1,
    last_checked: today,
    items,
      source: {
    name: "NOC 2021 (ESDC/StatCan)",
    url: NOC_SOURCE_URL || existing?.source?.url || undefined,

    retrieved_at: retrieved_at || new Date().toISOString()
  }
  };

// CI no-churn: if only dates changed and items are identical, skip writing to avoid noisy commits
if (process.env.CI && existing && deepEqual(existing.items, items)) {
  console.log("[noc] CI: items unchanged → skipping write");
  return;
}




  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, pretty(next), "utf8");
  console.log(`[noc] Wrote ${OUT} with ${items.length} items`);
}

main().catch((e) => { console.error("[noc] Fatal:", e); process.exit(1); });
