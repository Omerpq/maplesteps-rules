// scripts/publish_noc.mjs
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_IN   = path.resolve(__dirname, "..", "data", "noc.2021.json");
const OUT_DIR   = path.resolve(__dirname, "..", "noc", "2021");
const INDEX_OUT = path.resolve(OUT_DIR, "index.json");

function pretty(x) { return JSON.stringify(x, null, 2) + "\n"; }

const raw = await fs.readFile(DATA_IN, "utf8");
const data = JSON.parse(raw);

// Expect shape: { schema_version, last_checked, items: [ { code, title, teer, ... } ] }
if (!data?.items || !Array.isArray(data.items)) {
  throw new Error("Invalid data format: expected { items: [...] } in data/noc.2021.json");
}

await fs.mkdir(OUT_DIR, { recursive: true });

// Build per-code files and index map
const index = {};
for (const it of data.items) {
  const code = String(it.code || "").padStart(5, "0");
  if (!code || code === "00000") continue;

  const fileName = `${code}.json`;
  index[code] = fileName;

  // Normalize minimal payload the app expects
  const out = {
    code,
    title: it.title ?? "",
    teer: typeof it.teer === "string" ? it.teer : String(it.teer ?? ""),
    // Some upstreams won’t include duties here; keep empty array to allow app’s live fallback
    mainDuties: Array.isArray(it.mainDuties) ? it.mainDuties : []
  };

  await fs.writeFile(path.join(OUT_DIR, fileName), pretty(out), "utf8");
}

await fs.writeFile(INDEX_OUT, pretty(index), "utf8");
console.log(`[publish] Wrote ${Object.keys(index).length} files to ${OUT_DIR} and index -> ${INDEX_OUT}`);
