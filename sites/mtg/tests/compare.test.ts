import { describe, expect, it } from "vitest";
import { compareDecks, countsDiffer, deckLetter } from "../src/lib/compare";
import { parseRoute, href } from "../src/lib/route";
import type { Cards, Deck } from "../src/lib/types";

const cards: Cards = {
  Zask: { name: "Zask", type_line: "Legendary Creature — Insect", cmc: 5 },
  "Sol Ring": { name: "Sol Ring", type_line: "Artifact", cmc: 1 },
  "Scute Mob": { name: "Scute Mob", type_line: "Creature — Insect", cmc: 1 },
  Bloodghast: { name: "Bloodghast", type_line: "Creature — Vampire Spirit", cmc: 2 },
  Molderhulk: { name: "Molderhulk", type_line: "Creature — Fungus Troll", cmc: 8 },
  Forest: { name: "Forest", type_line: "Basic Land — Forest", cmc: 0 },
  Harrow: { name: "Harrow", type_line: "Instant", cmc: 3 },
};

const deck = (id: string, list: [string, number][]): Deck => ({
  id, name: id, colors: "BG", status: "complete", note: null, parent: null, doc: null, deckgen: null,
  commanderNames: ["Zask"], commanders: [{ name: "Zask", count: 1 }], unknown: [], proxyOnly: [], drift: null, target: 99, version: 1, updated: "2026-01-01T00:00:00",
  count: list.reduce((n, [, c]) => n + c, 0),
  categories: [{ name: "All", cards: list.map(([name, count]) => ({ name, count })) }],
});

const a = deck("a", [["Sol Ring", 1], ["Scute Mob", 1], ["Forest", 13]]);
const b = deck("b", [["Scute Mob", 1], ["Bloodghast", 1], ["Forest", 11]]);
const c = deck("c", [["Scute Mob", 1], ["Bloodghast", 1], ["Molderhulk", 1], ["Forest", 14], ["Harrow", 1]]);

describe("two decks", () => {
  const r = compareDecks([a, b], cards);
  it("shared cards include the commander and basics, lands last", () => {
    expect(r.inAll.map((x) => x.name)).toEqual(["Scute Mob", "Zask", "Forest"]);
  });
  it("unique cards per deck", () => {
    expect(r.only[0].map((x) => x.name)).toEqual(["Sol Ring"]);
    expect(r.only[1].map((x) => x.name)).toEqual(["Bloodghast"]);
  });
  it("no 'some' section with only two decks", () => {
    expect(r.some).toEqual([]);
  });
  it("notices different copy counts", () => {
    const forest = r.inAll.find((x) => x.name === "Forest")!;
    expect(forest.counts).toEqual([13, 11]);
    expect(countsDiffer(forest)).toBe(true);
    expect(countsDiffer(r.inAll.find((x) => x.name === "Zask")!)).toBe(false);
  });
});

describe("three decks", () => {
  const r = compareDecks([a, b, c], cards);
  it("splits into all / some / only", () => {
    expect(r.inAll.map((x) => x.name)).toEqual(["Scute Mob", "Zask", "Forest"]);
    expect(r.some.map((x) => [x.name, x.counts])).toEqual([["Bloodghast", [0, 1, 1]]]);
    expect(r.only.map((o) => o.map((x) => x.name))).toEqual([["Sol Ring"], [], ["Harrow", "Molderhulk"]]);
  });
  it("every card lands in exactly one section", () => {
    const placed = r.inAll.length + r.some.length + r.only.flat().length;
    expect(placed).toBe(r.rows.length);
  });
});

describe("compare routes", () => {
  it("round-trips deck lists and an open card", () => {
    const route = { view: "compare" as const, decks: ["zask", "forest_zask"], card: "Zask, Skittering Swarmlord" };
    expect(parseRoute(href(route))).toEqual(route);
    expect(parseRoute("#/compare/a,b")).toEqual({ view: "compare", decks: ["a", "b"] });
  });
  it("letters", () => {
    expect([0, 1, 2].map(deckLetter)).toEqual(["A", "B", "C"]);
  });
});
