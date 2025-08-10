import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const DRAWS_URL =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html";
const FEES_URL =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/fees.html";

const dataDir = path.resolve("./data");
const drawsFile = path.join(dataDir, "rounds.remote.json");
const feesFile = path.join(dataDir, "fees.remote.json");

// Fetch latest Express Entry draw info
async function fetchDraws() {
  console.log("Fetching draws...");
  const html = await (await fetch(DRAWS_URL)).text();
  const $ = cheerio.load(html);

  // Find the first table row in the draws table
  const firstRow = $("table tbody tr").first();
  const cells = firstRow.find("td").map((i, el) => $(el).text().trim()).get();

  const drawData = {
    date: cells[0] || null,
    category: cells[1] || null,
    crs_cutoff: cells[2] || null,
    invitations: cells[3] || null,
    source: "remote"
  };

  fs.writeFileSync(drawsFile, JSON.stringify(drawData, null, 2));
  console.log("✅ Draws fetched and saved.");
}

// Fetch key immigration fees
async function fetchFees() {
  console.log("Fetching fees...");
  const html = await (await fetch(FEES_URL)).text();
  const $ = cheerio.load(html);

  const keyFees = {};
  $("table").first().find("tr").each((i, row) => {
    const cols = $(row).find("td").map((i, el) => $(el).text().trim()).get();
    if (cols.length >= 2) {
      keyFees[cols[0]] = cols[1];
    }
  });

  const feeData = {
    version: "live",
    last_checked: new Date().toISOString(),
    key_fees: keyFees,
    source: "remote"
  };

  fs.writeFileSync(feesFile, JSON.stringify(feeData, null, 2));
  console.log("✅ Fees fetched and saved.");
}

async function main() {
  await fetchDraws();
  await fetchFees();
}

main().catch(err => {
  console.error("❌ Error fetching IRCC data", err);
  process.exit(1);
});
