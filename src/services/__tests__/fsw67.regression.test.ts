import { calculateFsw67 } from "../fsw67";

const base = {
  age: 29,
  clb: 9,
  education: "bachelor" as const,
  experienceYears: 1,
  arrangedEmployment: false,
  adaptability: {},
};

test("FSW67: baseline exact total", () => {
  const out = calculateFsw67(base as any);
  expect(out.total).toBe(66);   // Age 12 + Lang 24 + Edu 21 + Exp 9 = 66
  expect(out.passMark).toBe(67);
});

test("FSW67: crosses pass mark with arranged employment", () => {
  const out = calculateFsw67({ ...base, arrangedEmployment: true } as any);
  expect(out.total).toBeGreaterThanOrEqual(out.passMark); // ≥ 67
});
