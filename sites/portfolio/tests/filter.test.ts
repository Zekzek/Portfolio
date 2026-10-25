// The new filter must open exactly what the old jQuery site opened (tests/baseline.json).
import { describe, expect, it } from "vitest";
import baseline from "./baseline.json";
import { allKeys, filterOpen, setAll, type OpenState } from "../src/lib/filter";
import { DEFAULT_FILTERS } from "../src/data/skills";
import { loadSections } from "./content";

const sections = loadSections();
const openList = (s: OpenState) => allKeys(sections).filter((k) => s[k]).join(",");

describe("content", () => {
  it("has the same sections, in the same order, as the old site", () => {
    expect(allKeys(sections)).toEqual(baseline.ids);
  });
});

describe("filter", () => {
  it("opens the default view on load (Games + Tools)", () => {
    expect(openList(filterOpen(sections, DEFAULT_FILTERS))).toBe(baseline.initial);
  });

  for (const [combo, expected] of Object.entries(baseline.combos)) {
    it(`matches the old site for ${combo}`, () => {
      const active = combo === "(none)" ? [] : combo.split("+");
      expect(openList(filterOpen(sections, active))).toBe(expected);
    });
  }

  it("Show All and Collapse All", () => {
    expect(openList(setAll(sections, true))).toBe(baseline.showAll);
    expect(openList(setAll(sections, false))).toBe(baseline.collapseAll);
  });

  it("a header click toggles only that section", () => {
    // Same sequence the page runs: filter, then manual toggles on top of that state.
    const state = filterOpen(sections, ["defense"]);
    state.azra = !state.azra;
    expect(openList(state)).toBe(baseline.sequences.defenseThenClickAzra);
    state.ea_precommit = !state.ea_precommit;
    expect(openList(state)).toBe(baseline.sequences.thenClickEaPrecommit);
  });
});
