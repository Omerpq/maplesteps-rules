// Build noc/2021/index.json from the JSON files in the same folder.
// Node 18+ (Actions runner) supports ESM and top-level await.

import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const root = path.resolve(process.cwd(), "noc", "2021");
  await fs.mkdir(root, { recursive: true });

  const entries = await fs.readdir(root, { withFileTypes: true });

  // Collect { code5: filename }
  const map = {};
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const name = ent.name;
    if (!name.endsWith(".json")) continue;
    if (name === "index.json") continue;

    const filePath = path.join(root, name);
    try {
      const txt = await fs.readFile(filePath, "utf8");
      const j = JSON.parse(txt);

      // prefer code from JSON, else from filename
      const fromJson = String(j.code ?? j.noc ?? "").replace(/\D/g, "");
      const fromName = name.replace(/\D/g, "");
      const code = (fromJson || fromName).padStart(5, "0");

      if (/^\d{5}$/.test(code)) {
        map[code] = name;
      } else {
        console.warn(`[skip] could not infer 5-digit code for ${name}`);
      }
    } catch (e) {
      console.warn(`[skip] bad JSON ${name}:`, e?.message || e);
    }
  }

  // Sort by code for determinism
  const sorted = Object.fromEntries(
    Object.keys(map).sort().map((k) => [k, map[k]])
  );

  // Write/overwrite index.json
  const indexPath = path.join(root, "index.json");
  await fs.writeFile(indexPath, JSON.stringify(sorted, null, 2) + "\n", "utf8");

  console.log(`[ok] wrote ${indexPath} with ${Object.keys(sorted).length} codes`);
}

try {
  await main();
} catch (e) {
  console.error("[error] sync-noc failed:", e);
  process.exitCode = 1;
}
