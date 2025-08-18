import { __test__ } from "../updates";

const { normRounds } = __test__;

describe("normRounds", () => {
  test("parses draw_number, numbers, and prefers human IRCC page link", () => {
    const json = {
      last_checked: "2025-08-10T22:05:00Z",
      // root fallback links (json) — should be used only if entry-specific page link is missing
      source_urls: ["https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json"],
      rounds: [
        {
          // Newest by date
          drawNumber: "360",
          drawNumberURL:
            "<a href='/content/canadasite/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds/invitations.html?q=360'>360</a>",
          drawDate: "2025-08-08",
          drawName: "French language proficiency (Version 1)",
          drawSize: "2,500",
          drawCRS: "481"
        },
        {
          drawNumber: "359",
          // No drawNumberURL => should synthesize HTML page from number
          drawDate: "2025-08-07",
          drawName: "Canadian Experience Class",
          drawSize: "1,000",
          drawCRS: "534",
          // per-entry fallback URL (json) — should NOT be used if we can synthesize page
          source_url: "https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_122_en.json"
        },
        {
          // Older; messy fields
          draw_number: "Draw #358",
          Date: "2025-08-06",
          program: "Provincial Nominee Program",
          invitations_issued: "225",
          crs_cutoff: 739,
          // No links anywhere; will synthesize from number
        }
      ]
    };

    const list = normRounds(json);

    // Sorted newest first by date
expect(list.map((r: any) => r.draw_number)).toEqual([360, 359, 358]);

    // Numeric parsing
    expect(list[0].cutoff).toBe(481);
    expect(list[0].invitations).toBe(2500);
    expect(list[1].cutoff).toBe(534);
    expect(list[1].invitations).toBe(1000);
    expect(list[2].cutoff).toBe(739);
    expect(list[2].invitations).toBe(225);

    // Prefer human page from anchor (entry 0)
    expect(list[0].source_url).toBe(
      "https://www.canada.ca/content/canadasite/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds/invitations.html?q=360"
    );

    // Synthesize human page from number when anchor missing (entry 1 & 2)
    expect(list[1].source_url).toBe(
      "https://www.canada.ca/content/canadasite/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds/invitations.html?q=359"
    );
    expect(list[2].source_url).toBe(
      "https://www.canada.ca/content/canadasite/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds/invitations.html?q=358"
    );
  });

  test("falls back to json link only when page cannot be built", () => {
    const json = {
      source_urls: ["https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_999_en.json"],
      entries: [
        {
          // No number, no anchor; only json links present
          drawDate: "2025-08-05",
          drawName: "Test Draw",
          drawSize: "100",
          drawCRS: "500",
        }
      ]
    };
    const list = normRounds(json);
    expect(list[0].source_url).toBe(
      "https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_999_en.json"
    );
  });

  test("hides draw_number when unparsable", () => {
    const json = {
      rounds: [
        { drawNumber: "NaN", drawDate: "2025-08-01" },
      ]
    };
    const [r] = normRounds(json);
    expect(r.draw_number).toBeUndefined();
  });
  test("sorts newest date first, with fallback to draw_number", () => {
  const json = {
    rounds: [
      // Same date, different draw numbers → higher draw_number first
      { drawDate: "2025-08-08", drawNumber: "358" },
      { drawDate: "2025-08-08", drawNumber: "360" },
      { drawDate: "2025-08-08", drawNumber: "359" },

      // Valid later date should come before earlier date regardless of draw_number
      { drawDate: "2025-08-09", drawNumber: "100" },

      // Unparseable date falls back behind parseable dates; then by draw_number
      { date: "not-a-date", drawNumber: "999" },
    ],
  };

  const list = (__test__.normRounds as any)(json);

  // Expect order: newest date (Aug 9) first, then Aug 8 by draw_number (360, 359, 358), then invalid date last
  expect(list.map((r: any) => [r.date, r.draw_number])).toEqual([
    ["2025-08-09", 100],
    ["2025-08-08", 360],
    ["2025-08-08", 359],
    ["2025-08-08", 358],
    ["not-a-date", 999],
  ]);
});

});
