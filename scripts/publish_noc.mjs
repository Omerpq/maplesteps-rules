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

// Expect shape: { schema_version, last_checked, items: [ { code, title, teer, mainDuties? } ] }
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
  const filePath = path.join(OUT_DIR, fileName);
  index[code] = fileName;

  // Read existing (if any) to preserve manually-filled duties
  let existing = null;
  try {
    const rawOld = await fs.readFile(filePath, "utf8");
    existing = JSON.parse(rawOld);
  } catch {} // ok if file doesn't exist yet

  const manualDuties =
    Array.isArray(existing?.mainDuties) && existing.mainDuties.length > 0
      ? existing.mainDuties
      : null;

  // Normalize minimal payload the app expects
  const out = {
    code,
    title: it.title ?? (existing?.title ?? ""),
    teer:
      typeof it.teer === "string"
        ? it.teer
        : String(it.teer ?? (existing?.teer ?? "")),
    // Prefer synced duties if present, else keep manual, else empty
    mainDuties:
      (Array.isArray(it.mainDuties) && it.mainDuties.length > 0
        ? it.mainDuties
        : manualDuties) ?? []
  };

  await fs.writeFile(filePath, pretty(out), "utf8");
}

await fs.writeFile(INDEX_OUT, pretty(index), "utf8");
console.log(`[publish] Wrote ${Object.keys(index).length} files to ${OUT_DIR} and index -> ${INDEX_OUT}`);
