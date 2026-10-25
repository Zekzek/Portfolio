// Time totals, skill order and job lengths must match the old site on the day it was recorded.
import { describe, expect, it } from "vitest";
import baseline from "./baseline.json";
import { humanizeMonths, humanizeMonthsShort, roleMonths, skillTotals, sortSkills, totalMonths } from "../src/lib/durations";
import { EXCLUDED_FROM_TOTALS, SKILL_GROUPS, SKILL_KEYS } from "../src/data/skills";
import { loadTimings } from "./content";

const now = new Date(2026, 9, 25); // the day baseline.json was recorded
const roles = loadTimings();

describe("durations", () => {
  it("job lengths in the headers", () => {
    const got = Object.fromEntries(
      roles.filter((r) => !EXCLUDED_FROM_TOTALS.includes(r.key)).map((r) => [r.key, humanizeMonths(roleMonths(r, now))]),
    );
    expect(got).toEqual(baseline.headerDurations);
  });

  it("years of experience in the summary", () => {
    expect(Math.floor(totalMonths(roles, EXCLUDED_FROM_TOTALS, now) / 12)).toBe(baseline.summaryYears);
  });

  it("skill groups: order, time totals and ratings", () => {
    const totals = skillTotals(roles, SKILL_KEYS, EXCLUDED_FROM_TOTALS, now);
    const got = SKILL_GROUPS.map((g) => [
      g.label,
      sortSkills(g.skills, totals).map((s) => [s.key, s.label, humanizeMonthsShort(totals[s.key]), s.rating ?? 0]),
    ]);
    expect(got).toEqual(baseline.sidebar);
  });
});
