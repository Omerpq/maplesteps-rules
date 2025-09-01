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
function isISODatetime(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}T/.test(s);
}
function isStringArray(arr) {
  return Array.isArray(arr) && arr.every((x) => typeof x === "string");
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function validateNoc2021(json) {
  assert(json.schema_version === 1, "noc.2021.json schema_version must be number 1");
  assert(isISODate(json.last_checked), "noc.2021.json last_checked must be YYYY-MM-DD");
  assert(Array.isArray(json.items), "noc.2021.json items must be an array");
  assert(json.items.length > 0, "noc.2021.json items must not be empty");

  for (const it of json.items) {
    assert(typeof it?.code === "string", "noc.2021.json: item.code must be string");
    assert(/^\d{5}$/.test(it.code), "noc.2021.json: item.code must be 5 digits");
    assert(typeof it?.title === "string" && it.title.trim().length > 0, "noc.2021.json: item.title must be non-empty string");
    assert(Number.isInteger(it?.teer) && it.teer >= 0 && it.teer <= 5, "noc.2021.json: item.teer must be integer 0–5");
    assert(isStringArray(it?.keywords), "noc.2021.json: item.keywords must be string[]");
  }

  assert(json.source && typeof json.source === "object", "noc.2021.json: source object required");
  assert(typeof json.source.name === "string" && json.source.name.length > 0, "noc.2021.json: source.name required");
  assert(isISODatetime(json.source.retrieved_at), "noc.2021.json: source.retrieved_at must be ISO-8601 datetime");
}

async function validateCategories(json) {
  assert(json.schema_version === 1, "noc.categories.json schema_version must be number 1");
  assert(isISODate(json.last_checked), "noc.categories.json last_checked must be YYYY-MM-DD");

  // groups is an object map: { [groupName]: string[] of NOC codes }
  assert(json.groups && typeof json.groups === "object" && !Array.isArray(json.groups),
    "noc.categories.json must contain a 'groups' object");

  for (const [groupName, codes] of Object.entries(json.groups)) {
    assert(typeof groupName === "string" && groupName.length > 0,
      "noc.categories.json: group name must be a non-empty string");
    assert(isStringArray(codes), `noc.categories.json: groups['${groupName}'] must be string[]`);
    // Optional: ensure they look like NOC codes if provided
    for (const code of codes) {
      assert(/^\d{5}$/.test(code), `noc.categories.json: '${groupName}' contains invalid NOC code '${code}' (must be 5 digits)`);
    }
  }

  assert(json.source && typeof json.source === "object", "noc.categories.json: source object required");
  assert(typeof json.source.name === "string" && json.source.name.length > 0, "noc.categories.json: source.name required");
  assert(isISODatetime(json.source.retrieved_at), "noc.categories.json: source.retrieved_at must be ISO-8601 datetime");
}

async function main() {
  for (const f of files) {
    const raw = await fs.readFile(f, "utf8");
    let json;
    try { json = JSON.parse(raw); }
    catch (e) { throw new Error(`❌ ${path.basename(f)} is not valid JSON: ${e.message}`); }

    if (f.endsWith("noc.2021.json")) {
      await validateNoc2021(json);
    } else {
      await validateCategories(json);
    }

    console.log(`✅ ${path.basename(f)} ok`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
