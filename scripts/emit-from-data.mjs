import fs from "node:fs/promises";
import path from "node:path";

const DATA = JSON.parse(await fs.readFile(path.resolve("data","noc.2021.json"), "utf8"));

function norm(code){ return String(code ?? "").replace(/\D/g,"").padStart(5,"0"); }
function dutiesFrom(obj){
  const raw = obj?.main_duties ?? obj?.mainDuties ?? obj?.duties ?? obj?.tasks ?? [];
  if (Array.isArray(raw)) return raw.map(x => String(x).trim()).filter(Boolean);
  return String(raw).split(/\r?\n|•/g).map(s => s.trim()).filter(Boolean);
}

// Normalize data shape -> array of items with a code
let items;
if (Array.isArray(DATA)) {
  items = DATA;
} else if (Array.isArray(DATA.items)) {
  items = DATA.items;
} else {
  // assume object map keyed by code
  items = Object.entries(DATA).map(([k, v]) => ({ code: v?.code ?? k, ...v }));
}

const codesArg = (process.argv[2] || "").split(",").map(s => norm(s)).filter(Boolean);
if (!codesArg.length) {
  console.error("Usage: node scripts/emit-from-data.mjs 21231,31110,62020");
  process.exit(1);
}

await fs.mkdir(path.resolve("noc","2021"), { recursive: true });

for (const code of codesArg) {
  const item = items.find(x => norm(x.code) === code);
  if (!item) { console.warn("skip (not in data):", code); continue; }

  const out = {
    code,
    title: item.title ?? item.noc_title ?? item.name ?? undefined,
    teer: code[1],
    mainDuties: dutiesFrom(item),
  };
  const file = path.resolve("noc","2021", `${code}.json`);
  await fs.writeFile(file, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("wrote", file);
}
