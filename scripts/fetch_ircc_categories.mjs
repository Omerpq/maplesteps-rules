// scripts/fetch_ircc_categories.mjs
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE = path.resolve(__dirname, "..", "data", "noc.categories.json");
const today = new Date().toISOString().slice(0, 10);

async function main() {
  let obj;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    obj = JSON.parse(raw);
    obj.schema_version = String(obj.schema_version ?? "1");
    obj.last_checked = today;
    obj.source_url = obj.source_url ?? "https://www.canada.ca/";
    if (!Array.isArray(obj.categories)) {
      obj.categories = [
        { key: "stem", title: "STEM (example)", codes: ["21231"] },
        { key: "trades", title: "Skilled trades (example)", codes: ["62020"] },
      ];
    }
  } catch {
    obj = {
      schema_version: "1",
      last_checked: today,
      source_url: "https://www.canada.ca/",
      categories: [
        { key: "stem", title: "STEM (example)", codes: ["21231"] },
        { key: "trades", title: "Skilled trades (example)", codes: ["62020"] },
      ],
    };
  }

  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(obj, null, 2) + "\n", "utf8");
  console.log(`Wrote ${FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
