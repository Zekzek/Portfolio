import { describe, expect, it } from "vitest";
import { cardsFor, costLabel, genRequest } from "../src/lib/gen";
import type { Deck, GenTheme, Proxies } from "../src/lib/types";

const deck = {
  id: "t", categories: [
    { name: "Ramp", cards: [{ name: "Sol Ring", count: 1 }] },
    { name: "Creatures", cards: [{ name: "Anger", count: 1 }, { name: "Scute Mob", count: 1 }] },
  ],
} as unknown as Deck;
const cards = ["Zask", "Sol Ring", "Anger", "Scute Mob"];
const proxies: Proxies = {
  sets: [{ id: "ink", name: "Ink", description: "", versions: ["v1"] }],
  cards: { ink: { anger: [{ v: "v1", url: "/a" }], zask: [{ v: "v1", url: "/z" }] } },
};

describe("which cards", () => {
  it("missing: only cards with no proxy in the theme's set; everything for a new set", () => {
    expect(cardsFor("missing", cards, deck, "ink", proxies, new Set())).toEqual(["Sol Ring", "Scute Mob"]);
    expect(cardsFor("missing", cards, deck, null, proxies, new Set())).toEqual(cards);
  });
  it("whole deck, a category, hand-picked (in deck order)", () => {
    expect(cardsFor("all", cards, deck, "ink", proxies, new Set())).toEqual(cards);
    expect(cardsFor("category:Creatures", cards, deck, "ink", proxies, new Set())).toEqual(["Anger", "Scute Mob"]);
    expect(cardsFor("pick", cards, deck, "ink", proxies, new Set(["Scute Mob", "Zask"]))).toEqual(["Zask", "Scute Mob"]);
  });
});

describe("request and cost", () => {
  it("sends an existing theme by key, trims a new one, keeps only ideas for chosen cards", () => {
    const t = { key: "alora.yaml:ink_v1" } as GenTheme;
    expect(genRequest("t", t, ["Anger"], false, { Anger: " fire ", Zask: "bug" })).toEqual(
      { deck: "t", theme: { key: "alora.yaml:ink_v1" }, cards: ["Anger"], newAttempt: false, art: { Anger: "fire" } });
    const r = genRequest("t", { name: " Moss ", frame: "parchment", prompt: " green ", references: [] }, ["Anger"], true, { Anger: "  " });
    expect(r.theme).toEqual({ new: { name: "Moss", frame: "parchment", prompt: "green", references: [] } });
    expect(r.art).toEqual({});
  });
  it("labels the cost", () => {
    expect(costLabel(12, 40, "credits")).toBe("12 images · about 480 credits");
    expect(costLabel(1, null, null)).toBe("1 image");
  });
});
