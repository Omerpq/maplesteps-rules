// scripts/lib/normalizers.mjs

export function deriveTeerFromCode(code) {
  const s = String(code || "").trim();
  if (!/^\d{5}$/.test(s)) throw new Error(`Invalid NOC code: "${code}"`);
  const teer = Number(s[1]); // NOC 2021: 2nd digit encodes TEER (0–5)
  if (!Number.isInteger(teer) || teer < 0 || teer > 5) {
    throw new Error(`Could not derive TEER from code: "${code}"`);
  }
  return teer;
}

export function normalizeTitle(title) {
  return String(title || "")
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}

export function generateKeywords(title) {
  const t = normalizeTitle(title).toLowerCase();
  const tokens = t
    .replace(/[()&/,]/g, " ")
    .replace(/[-–—]/g, " ")
    .split(/\s+/)
    .filter(w => w && w.length >= 3);

  const uniq = new Set(tokens);
  for (let i = 0; i < tokens.length - 1; i++) uniq.add(tokens[i] + " " + tokens[i + 1]);

  const stem = w => w.replace(/ers$|ies$|s$/g, m => (m === "ies" ? "y" : ""));
  const extras = Array.from(uniq).map(stem);

  return Array.from(new Set([...uniq, ...extras])).slice(0, 24);
}

export function stableSortByCode(items) {
  return [...items].sort((a, b) => String(a.code).localeCompare(String(b.code)));
}
