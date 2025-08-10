import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// URLs for IRCC data pages
const DRAWS_URL =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html";
const FEES_URL =
  "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/fees.html";

// Output JSON paths
const dataDir = path.resolve("./data");
const drawsFile = path.join(dataDir, "rounds.remote.json");
const feesFile = path.join(dataDir, "fees.remote.json");

async function fetchDraws() {
  console.log("Fetching draws...");
  const html = await (await fetch(DRAWS_URL)).text();
  // TODO: Add HTML parsing logic here to extract latest draw info
  // For now, just store raw HTML as proof
  fs.writeFileSync(drawsFile, JSON.stringify({ raw: html.slice(0, 500) }, null, 2));
  console.log("✅ Draws fetched and saved.");
}

async function fetchFees() {
  console.log("Fetching fees...");
  const html = await (await fetch(FEES_URL)).text();
  // TODO: Add HTML parsing logic here to extract fee table
  // For now, just store raw HTML as proof
  fs.writeFileSync(feesFile, JSON.stringify({ raw: html.slice(0, 500) }, null, 2));
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

