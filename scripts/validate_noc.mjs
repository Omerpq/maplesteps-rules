// scripts/validate_noc.mjs
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  path.resolve(__dirname, "..", "data", "noc.2021.json"),
  path.resolve(__dirname, "..", "data", "noc.categories.json"),
];

function isISODate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function main() {
  for (const f of files) {
    const raw = await fs.readFile(f, "utf8");
    let json;
    try { json = JSON.parse(raw); } catch (e) {
      throw new Error(`❌ ${path.basename(f)} is not valid JSON: ${e.message}`);
    }

    // shared meta
    if (json.schema_version !== "1") throw new Error(`❌ ${path.basename(f)} schema_version must be "1"`);
    if (!isISODate(json.last_checked)) throw new Error(`❌ ${path.basename(f)} last_checked must be YYYY-MM-DD`);

    if (f.endsWith("noc.2021.json")) {
      if (!Array.isArray(json.items)) throw new Error("❌ noc.2021.json items must be an array");
      if (json.items.length < 1) throw new Error("❌ noc.2021.json items must not be empty");
      for (const it of json.items) {
        if (typeof it?.code !== "string" || !it.code) throw new Error("❌ noc.2021.json: each item needs string code");
        if (typeof it?.title !== "string") throw new Error("❌ noc.2021.json: each item needs string title");
      }
    } else {
      if (!Array.isArray(json.categories)) throw new Error("❌ noc.categories.json categories must be an array");
      if (json.categories.length < 1) throw new Error("❌ noc.categories.json categories must not be empty");
      for (const c of json.categories) {
        if (typeof c?.key !== "string" || !c.key) throw new Error("❌ noc.categories.json: each category needs string key");
        const codes = Array.isArray(c?.codes) ? c.codes : Array.isArray(c?.noc_codes) ? c.noc_codes : [];
        if (!Array.isArray(codes)) throw new Error("❌ noc.categories.json: codes/noc_codes must be an array");
        if (!codes.every(x => typeof x === "string")) throw new Error("❌ noc.categories.json: codes must be strings");
      }
    }

    console.log(`✅ ${path.basename(f)} ok`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
