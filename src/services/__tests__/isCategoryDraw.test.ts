import { isCategoryDraw } from "../updates";

describe("A5 isCategoryDraw", () => {
  it("returns true for targeted categories", () => {
    expect(isCategoryDraw("STEM occupations")).toBe(true);
    expect(isCategoryDraw("French language proficiency")).toBe(true);
    expect(isCategoryDraw("Healthcare occupations")).toBe(true);
    expect(isCategoryDraw("Trades")).toBe(true);
    expect(isCategoryDraw("Transport targeted draw")).toBe(true);
    expect(isCategoryDraw("Agriculture and agri-food occupations")).toBe(true);
  });

  it("returns false for general or empty", () => {
    expect(isCategoryDraw("General")).toBe(false);
    expect(isCategoryDraw("No program specified")).toBe(false);
    expect(isCategoryDraw("None")).toBe(false);
    expect(isCategoryDraw("")).toBe(false);
    expect(isCategoryDraw(undefined)).toBe(false);
  });
});
