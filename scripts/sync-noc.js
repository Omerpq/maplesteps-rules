// node >=18 (has global fetch)
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const BASE = "noc/2021";
const INDEX = resolve(BASE, "index.json");

const codes = (process.env.CODES || "").split(",").map(s => s.trim()).filter(Boolean);
// e.g. CODES="31110,21231"

function normCode(x) { const s = String(x||"").replace(/\D/g,""); return s ? s.padStart(5,"0") : ""; }

function cleanLine(s) { return s.replace(/\u00A0/g," ").trim(); }

function firstBulletBlockAfter(lines, startIdx) {
  const out = []; let started = false;
  for (let i = startIdx+1; i < Math.min(lines.length, startIdx+300); i++) {
    const l = cleanLine(lines[i]);
    const isBullet = /^[•\-\*\u2022\u2013\u2217]\s+/.test(l);
    if (!started) { if (isBullet) { started = true; out.push(l); } continue; }
    if (!isBullet) break;
    out.push(l);
  }
  return out;
}

function bulletsFromSection(sectionLines) {
  const out = [];
  for (const raw of sectionLines) {
    const m = cleanLine(raw).match(/^[•\-\*\u2022\u2013\u2217]\s*(.+)$/);
    if (m) out.push(m[1].trim());
  }
  return [...new Set(out)].filter(s => s.length > 6 && /[a-z]/i.test(s)).slice(0, 80);
}

async function fetchViaProxy(url) {
  const clean = url.replace(/^https?:\/\//, "");
  for (const u of [`https://r.jina.ai/https://${clean}`, `https://r.jina.ai/http://${clean}`]) {
    try {
      const r = await fetch(u); const t = await r.text();
      if (r.ok && t && t.length > 50) return t;
    } catch {}
  }
  return null;
}

async function fetchFromEsdc(code5) {
  const url = `https://noc.esdc.gc.ca/Structure/NOCProfile?GocTemplateCulture=en-CA&code=${code5}&version=2021.0`;
  const txt = await fetchViaProxy(url);
  if (!txt) throw new Error("ESDC fetch failed");
  const lines = txt.split(/\r?\n/).map(cleanLine).filter(Boolean);

  const startIdx = lines.findIndex(l => /(Main duties)\s*:?\s*$/i.test(l));
  const sec = startIdx >= 0 ? firstBulletBlockAfter(lines, startIdx) : [];
  let duties = bulletsFromSection(sec);

  const guessTitle = lines.find(l => /^[0-9]{5}\s*[-–]\s*/.test(l)) || lines.find(l => /^[A-Z].{4,}$/.test(l));
  const title = guessTitle ? guessTitle.replace(/^[0-9]{4,5}\s*[-–]\s*/, "").trim() : undefined;

  return { code: code5, title, duties, source: url };
}

async function ensureDir(p) {
  const d = dirname(p); if (existsSync(d)) return; await writeFile(resolve(d, ".keep"), "");
}

async function readJson(path, fallback=null) {
  try { return JSON.parse(await readFile(path, "utf8")); } catch { return fallback; }
}

(async () => {
  if (!codes.length) throw new Error("Set CODES=comma,separated,codes");
  const idx = await readJson(INDEX, {});
  for (const c0 of codes) {
    const code5 = normCode(c0);
    const { title, duties, source } = await fetchFromEsdc(code5);
    const file = `${code5}.json`;
    idx[code5] = file;

    const out = {
      code: code5,
      title: title || "",
      teer: String(code5[1]),
      main_duties: duties,
      source,
      last_checked: new Date().toISOString().slice(0,10)
    };

    const path = resolve(BASE, file);
    await ensureDir(path);
    await writeFile(path, JSON.stringify(out, null, 2) + "\n", "utf8");
    console.log("Wrote", path, duties.length, "duties");
  }
  await writeFile(INDEX, JSON.stringify(idx, null, 2) + "\n", "utf8");
  console.log("Updated index:", INDEX);
})().catch(e => { console.error(e); process.exit(1); });
