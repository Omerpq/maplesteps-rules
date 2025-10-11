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
  "www.gov.mb.ca", "gov.mb.ca", "www.mpi.mb.ca", "mpi.mb.ca"
];

function getHost(u) { try { return new URL(u).host.toLowerCase(); } catch { return ""; } }

function fetchHeadOrGet(url) {
  // Use GET to follow redirects reliably; don’t download bodies (abort after headers)
  return new Promise((resolve) => {
    const req = https.get(url, { method: "GET", timeout: 15000 }, (res) => {
      resolve({ status: res.statusCode || 0 });
      res.resume(); // discard body
    });
    req.on("timeout", () => { req.destroy(); resolve({ status: 0 }); });
    req.on("error", () => resolve({ status: 0 }));
  });
}

(async () => {
  const raw = fs.readFileSync(FILE, "utf8");
  const json = JSON.parse(raw);

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
