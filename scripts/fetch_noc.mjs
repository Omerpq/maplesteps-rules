// scripts/fetch_noc.mjs
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE = path.resolve(__dirname, "..", "data", "noc.2021.json");
const today = new Date().toISOString().slice(0, 10);

async function main() {
  let obj;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    obj = JSON.parse(raw);
    obj.schema_version = String(obj.schema_version ?? "1");
    obj.last_checked = today;
    obj.source_url = obj.source_url ?? "https://www.jobbank.gc.ca/noc";
    if (!Array.isArray(obj.items)) {
      obj.items = [
        { code: "21231", title: "Software engineers and designers" },
        { code: "62020", title: "Food service supervisors" },
      ];
    }
  } catch {
    obj = {
      schema_version: "1",
      last_checked: today,
      source_url: "https://www.jobbank.gc.ca/noc",
      items: [
        { code: "21231", title: "Software engineers and designers" },
        { code: "62020", title: "Food service supervisors" },
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
