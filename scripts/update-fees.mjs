// scripts/update-fees.mjs
// Refresh data/fees.remote.json by scraping IRCC fees page.
// Node 18+, no external deps.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RULES_PATH = resolve("data/fees.remote.json");
const IRCC_FEES_URL = "https://ircc.canada.ca/english/information/fees/fees.asp";

const fetchText = async (url) => {
  const r = await fetch(url, { headers: { "user-agent": "MapleSteps-RulesBot/1.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.text();
};

// pull first $### after a phrase (case-insensitive), returns number or null
const findAmountAfter = (html, phrase) => {
  const re = new RegExp(`${phrase}[^$]{0,120}?\\$(\\d{2,4})`, "i");
  const m = re.exec(html);
  return m ? Number(m[1]) : null;
};

const isoNow = () => new Date().toISOString();

(async () => {
  const html = await fetchText(IRCC_FEES_URL);

  // Try multiple phrasings that IRCC uses from time to time
  const processing =
    findAmountAfter(html, "Processing fee\\s*\\(Express Entry\\)") ??
    findAmountAfter(html, "Your application\\s*Processing fee") ??
    findAmountAfter(html, "Permanent residence application\\s*processing fee") ??
    null;

  const rprf =
    findAmountAfter(html, "right of permanent residence fee") ??
    findAmountAfter(html, "RPRF") ??
    null;

  const child =
    findAmountAfter(html, "dependent child") ??
    findAmountAfter(html, "Include a dependent child") ??
    null;

  if (processing == null || rprf == null || child == null) {
    throw new Error(
      `Could not parse one or more fees (processing=${processing}, rprf=${rprf}, child=${child})`
    );
  }

  const bundle = processing + rprf;

  // Load existing JSON to keep shape identical
  const prev = JSON.parse(readFileSync(RULES_PATH, "utf8"));

  const next = {
    schema_version: "1.0",
    last_checked: isoNow(),
    source_urls: [IRCC_FEES_URL],
    section_heading: "Economic immigration (including Express Entry)",
    fees: [
      {
        code: "PR_APPL_BUNDLE",
        label: `Your application Processing fee ($${processing}) and right of permanent residence fee ($${rprf})`,
        amount_cad: bundle,
      },
      {
        code: "PR_APPL",
        label: "Your application (without right of permanent residence fee)",
        amount_cad: processing,
      },
      {
        code: "PR_SPOUSE_BUNDLE",
        label: `Include your spouse or partner Processing fee ($${processing}) and right of permanent residence fee ($${rprf})`,
        amount_cad: bundle,
      },
      {
        code: "PR_SPOUSE",
        label: "Include your spouse or partner (without right of permanent residence fee)",
        amount_cad: processing,
      },
      {
        code: "PR_CHILD",
        label: "Include a dependent child",
        amount_cad: child,
      },
    ],
  };

  // Only write if values changed (avoid noisy commits)
  const changed =
    JSON.stringify(prev.fees?.map(f => f.amount_cad)) !==
      JSON.stringify(next.fees.map(f => f.amount_cad)) ||
    prev.section_heading !== next.section_heading;

  if (changed) {
    writeFileSync(RULES_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
    console.log(`[UPDATED] fees: processing=${processing}, rprf=${rprf}, child=${child}`);
  } else {
    // still update last_checked to reflect a successful verification
    prev.last_checked = next.last_checked;
    writeFileSync(RULES_PATH, JSON.stringify(prev, null, 2) + "\n", "utf8");
    console.log("[NOCHANGE] fees unchanged; bumped last_checked");
  }
})().catch((e) => {
  console.error("[ERROR]", e.message);
  process.exit(1);
});
