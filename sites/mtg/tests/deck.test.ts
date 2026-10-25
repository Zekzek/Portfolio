import { describe, expect, it } from "vitest";
import { colorGroup, groupDeck, manaCurve, manaSymbols, pipCounts, primaryType, symbolUrl, typeCounts } from "../src/lib/deck";
import { parseRoute, href } from "../src/lib/route";
import { countLabel } from "../src/lib/labels";
import type { Cards, Deck } from "../src/lib/types";

const cards: Cards = {
  "Sol Ring": { name: "Sol Ring", type_line: "Artifact", cmc: 1, mana_cost: "{1}", colors: [] },
  "Scute Mob": { name: "Scute Mob", type_line: "Creature — Insect", cmc: 1, mana_cost: "{G}", colors: ["G"] },
  "Grist, the Hunger Tide": { name: "Grist, the Hunger Tide", type_line: "Legendary Planeswalker — Grist", cmc: 3, mana_cost: "{1}{B}{G}", colors: ["B", "G"] },
  "Hornet Nest": { name: "Hornet Nest", type_line: "Creature — Insect", cmc: 3, mana_cost: "{2}{G}", colors: ["G"] },
  "Ulamog": { name: "Ulamog", type_line: "Legendary Creature — Eldrazi", cmc: 10, mana_cost: "{10}", colors: [] },
  "Forest": { name: "Forest", type_line: "Basic Land — Forest", cmc: 0, colors: [] },
  "Blightstep Pathway": { name: "Blightstep Pathway", type_line: "Land // Land", cmc: 0, colors: [] },
  "Bonecrusher Giant": { name: "Bonecrusher Giant", type_line: "Creature — Giant // Instant — Adventure", cmc: 3, mana_cost: "{2}{R} // {1}{R}", colors: ["R"] },
  "Liquimetal Torque": { name: "Liquimetal Torque", type_line: "Artifact Creature — Golem", cmc: 2, mana_cost: "{2}", colors: [] },
};

const deck: Deck = {
  id: "t", name: "Test", colors: "BG", status: "complete", note: null, parent: null, doc: null, deckgen: null,
  commanderNames: ["Zask"], commanders: [{ name: "Zask", count: 1 }], unknown: [], proxyOnly: [],
  count: 22,
  categories: [
    { name: "Ramp", cards: [{ name: "Sol Ring", count: 1 }] },
    { name: "Insects", cards: [{ name: "Hornet Nest", count: 1 }, { name: "Scute Mob", count: 1 }] },
    { name: "Misc", cards: [{ name: "Grist, the Hunger Tide", count: 1 }, { name: "Ulamog", count: 1 }, { name: "Bonecrusher Giant", count: 1 }, { name: "Liquimetal Torque", count: 1 }] },
    { name: "Lands", cards: [{ name: "Forest", count: 14 }, { name: "Blightstep Pathway", count: 1 }] },
  ],
};

describe("card classification", () => {
  it("picks one type per card, creature first", () => {
    expect(primaryType(cards["Liquimetal Torque"])).toBe("Creature");
    expect(primaryType(cards["Grist, the Hunger Tide"])).toBe("Planeswalker");
    expect(primaryType(cards["Bonecrusher Giant"])).toBe("Creature"); // front face only
    expect(primaryType(cards["Blightstep Pathway"])).toBe("Land");
    expect(primaryType(undefined)).toBe("Other");
  });
  it("groups colors, with lands on their own", () => {
    expect(colorGroup(cards["Scute Mob"])).toBe("G");
    expect(colorGroup(cards["Grist, the Hunger Tide"])).toBe("Multicolor");
    expect(colorGroup(cards["Sol Ring"])).toBe("Colorless");
    expect(colorGroup(cards["Forest"])).toBe("Land");
  });
});

describe("grouping", () => {
  it("keeps my categories and counts copies", () => {
    const g = groupDeck(deck, cards, "category", "cmc");
    expect(g.map((x) => [x.label, x.count])).toEqual([["Ramp", 1], ["Insects", 2], ["Misc", 4], ["Lands", 15]]);
    expect(g[1].entries.map((e) => e.name)).toEqual(["Scute Mob", "Hornet Nest"]); // sorted by mana value
  });
  it("by mana value: 7+ bucket and lands last", () => {
    const g = groupDeck(deck, cards, "cmc", "name");
    expect(g.map((x) => x.label)).toEqual(["1 mana", "2 mana", "3 mana", "7+ mana", "Lands"]);
  });
  it("every grouping covers every copy", () => {
    for (const by of ["category", "type", "cmc", "color"] as const) {
      expect(groupDeck(deck, cards, by, "name").reduce((n, g) => n + g.count, 0)).toBe(22);
    }
  });
});

describe("stats", () => {
  it("mana curve skips lands and caps at 7+", () => {
    expect(manaCurve(deck, cards)).toEqual([0, 2, 1, 3, 0, 0, 0, 1]);
  });
  it("type counts and pips", () => {
    expect(typeCounts(deck, cards)).toEqual([
      { type: "Creature", count: 5 }, { type: "Planeswalker", count: 1 }, { type: "Land", count: 15 }, { type: "Artifact", count: 1 },
    ]);
    expect(pipCounts(deck, cards)).toEqual({ G: 3, B: 1, R: 1 });
  });
  it("mana symbols", () => {
    expect(manaSymbols("{2}{G/U}{G}")).toEqual(["2", "G/U", "G"]);
    expect(manaSymbols("{2}{R} // {1}{R}")).toEqual(["2", "R"]);
    expect(symbolUrl("G/U")).toBe("https://svgs.scryfall.io/card-symbols/GU.svg");
  });
});

describe("routes and labels", () => {
  it("round-trips card names with commas", () => {
    const r = { view: "deck" as const, deck: "zask", card: "Zask, Skittering Swarmlord" };
    expect(parseRoute(href(r))).toEqual(r);
    expect(parseRoute("")).toEqual({ view: "decks" });
  });
  it("count labels", () => {
    expect(countLabel(deck)).toBe("22 + commander");
    expect(countLabel({ ...deck, status: "pool" })).toBe("22 candidates");
    expect(countLabel({ ...deck, commanders: [{ name: "A", count: 1 }, { name: "B", count: 1 }] })).toBe("22 + 2 commanders");
  });
});
