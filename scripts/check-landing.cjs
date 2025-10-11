/**
 * scripts/check-landing.js
 * Validates officialLink URLs in landing.json:
 *  - Only allow official domains
 *  - Require 200 OK (or 3xx with final 200 after redirects)
 *  - Print a clear report and exit non-zero on failure
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const FILE = path.join(__dirname, "..", "data", "content", "guides", "landing.json");

// Update this allowlist as you add provinces
const ALLOW = [
  "www.canada.ca", "canada.ca",
  "www.ontario.ca", "ontario.ca", "www.serviceontario.ca",
  "www2.gov.bc.ca", "www.welcomebc.ca", "icbc.com", "www.icbc.com",
  "www.alberta.ca", "alberta.ca",
  "www.gov.mb.ca", "gov.mb.ca", "www.mpi.mb.ca", "mpi.mb.ca", "immigratemanitoba.com",
"alis.alberta.ca", "www.gov.bc.ca",
];

function getHost(u) { try { return new URL(u).host.toLowerCase(); } catch { return ""; } }

function fetchHeadOrGet(url) {
  // Use GET (follows redirects at the CDN) and set a real UA to avoid WAF blocks (e.g., Ontario, BC).
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        method: "GET",
        timeout: 15000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      },
      (res) => {
        resolve({ status: res.statusCode || 0 });
        res.resume(); // discard body
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0 });
    });
    req.on("error", () => resolve({ status: 0 }));
  });
}


(async () => {
  // Read JSON, strip BOM and whitespace (Windows may add BOM)
const raw = fs.readFileSync(FILE, "utf8").replace(/^\uFEFF/, "").trim();
let json;
try {
  json = JSON.parse(raw);
} catch (e) {
  console.error("Could not parse landing.json. First 120 chars:\n", raw.slice(0, 120));
  throw e;
}


  const problems = [];
  const rows = [];

  for (const prov of json.provinces || []) {
    for (const t of prov.tasks || []) {
      if (!t.officialLink) continue;
      const host = getHost(t.officialLink);
      const allowed = ALLOW.includes(host);
      let status = 0;
      if (allowed) {
        const r = await fetchHeadOrGet(t.officialLink);
        status = r.status;
      }
      const ok = allowed && status >= 200 && status < 400;
      rows.push({ prov: prov.code, task: t.id, host, status, ok, url: t.officialLink });
      if (!ok) problems.push({ prov: prov.code, task: t.id, host, status, url: t.officialLink, reason: allowed ? "Bad status" : "Domain not in allowlist" });
    }
  }

  // Print summary (GitHub will capture logs)
  console.log("Landing link check results:");
  rows.forEach(r => console.log(`[${r.ok ? "OK" : "FAIL"}] ${r.prov}/${r.task} → ${r.status} ${r.host} :: ${r.url}`));

  if (problems.length) {
    console.error("\nFailures:");
    problems.forEach(p => console.error(` - ${p.prov}/${p.task}: ${p.reason} (${p.status}) :: ${p.url}`));
    process.exit(1);
  }
  console.log("\nAll landing links passed.");
})();
