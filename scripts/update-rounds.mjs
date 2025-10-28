// scripts/update-rounds.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RULES_PATH = resolve(__dirname, "../data/rounds.remote.json");
const IRCC_ROUNDS_PAGE =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html";

function iso(dateLike) {
  const d = new Date(dateLike ?? "");
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Unparsable draw date from IRCC JSON: ${JSON.stringify(dateLike)}`);
  }
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10); // YYYY-MM-DD
}

function num(x){ if(x==null) return null; const n=Number(String(x).replace(/[^\d.-]/g,"")); return Number.isFinite(n)?n:null; }
function pickCategory(t=""){ t=t.toLowerCase();
  if(t.includes("provincial nominee")) return "Provincial Nominee Program (PNP)";
  if(t.includes("french")) return "French language proficiency (Version 1)";
  if(t.includes("healthcare")) return "Healthcare and social services occupations";
  if(t.includes("trade")) return "Trade occupations";
  if(t.includes("transport")) return "Transport occupations";
  if(t.includes("stem")) return "STEM occupations";
  if(t.includes("agriculture")) return "Agriculture and agri-food occupations";
  if(t.includes("category")) return "Category-based (unspecified)";
  return "General (no program specified)";
}
async function fetchText(url){ const r=await fetch(url,{headers:{"user-agent":"MapleSteps-RulesBot/1.0"}}); if(!r.ok) throw new Error(`HTTP ${r.status} ${url}`); return r.text(); }
async function fetchJson(url){ const r=await fetch(url,{headers:{"user-agent":"MapleSteps-RulesBot/1.0"}}); if(!r.ok) throw new Error(`HTTP ${r.status} ${url}`); return r.json(); }

async function getLatestRoundFromIRCC(){
  const html = await fetchText(IRCC_ROUNDS_PAGE);
  const re = /ee_rounds_(\d+)_en\.json/gi;
  let m, max=-1; while((m=re.exec(html))!==null){ const n=Number(m[1]); if(Number.isFinite(n)&&n>max) max=n; }
  if(max<0) throw new Error("No ee_rounds_###_en.json links found.");
  const jsonUrl = `https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_${max}_en.json`;
  const j = await fetchJson(jsonUrl);
console.log("[DEBUG] url", jsonUrl);
console.log("[DEBUG] keys", Object.keys(j));
console.log("[DEBUG] sample", {
  drawDate: j.drawDate, date: j.date, DrawDate: j.DrawDate, Draw_Date: j["Draw Date"],
  publicationDate: j.publicationDate, roundDate: j.roundDate
});

  const drawDate =
  j.drawDate ||
  j.date ||
  j.DrawDate ||
  j["Draw Date"] ||
  j["draw_date"] ||
  j["draw_date_en"] ||
  j["date_en"] ||
  j["Date"] ||
  j["Date en"] ||
  j["en_draw_date"] ||
  j["enDate"];

  const name = j.drawName || j.drawCategory || j.program || "";
  const type = j.drawType || j.category || j.roundCategory || "";
  const size = j.drawSize || j.numberInvited || j.invitations || j.ita || null;
  const crs  = j.drawCRS  || j.crsCutoff     || j.cutoff_score || j.crs || null;

  const entry = {
    date: iso(drawDate),
    category: pickCategory(String(type || name)),
    crs_cutoff: num(crs),
    invitations: num(size),
    draw_number: max,
    source_urls: [IRCC_ROUNDS_PAGE, jsonUrl],
    last_checked: new Date().toISOString(),
  };
  if(!entry.date) throw new Error("Latest round has no parsable date.");
  return entry;
}
function newer(a,b){ return new Date(a).getTime() > new Date(b).getTime(); }

async function main(){
  const data = JSON.parse(readFileSync(RULES_PATH, "utf8"));
  const entries = Array.isArray(data.entries)?data.entries:[];
  const currentTop = entries.length ? entries[0].date : "1900-01-01";

  const latest = await getLatestRoundFromIRCC();

  if(newer(latest.date, currentTop)){
    const next = { ...data, entries: [latest, ...entries] };
    writeFileSync(RULES_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
    console.log(`[UPDATED] Prepended round ${latest.draw_number} (${latest.date})`);
  } else {
    console.log(`[NOCHANGE] Existing top ${currentTop} >= fetched ${latest.date}`);
  }
}
main().catch(e=>{ console.error("[ERROR]", e.message); process.exit(1); });
