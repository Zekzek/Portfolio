import { describe, expect, it } from "vitest";
import { backCover, bookLook, cardImage, families } from "../src/lib/shelf";
import type { Cards, Deck, Proxies } from "../src/lib/types";

const deck = (o: Partial<Deck>) => ({ id: "a", name: "Amalia", colors: "WB", commanderNames: [], status: "complete", ...o }) as Deck;

describe("book look", () => {
  it("uses the printed box's colors", () => {
    const d = deck({ box: { label: "Amalia B.", colors: { spine: "#3b2a5c", spine_label: "#e8c06a", cover_border: "#e8c06a", cover_frame: "#e8c06a", base: "#3b2a5c" } } as never });
    expect(bookLook(d)).toMatchObject({ spine: "#3b2a5c", label: "#e8c06a", band: "#e8c06a", title: "AMALIA B.", printed: true });
  });
  it("gives a deck without a box a plain binding in its first color", () => {
    expect(bookLook(deck({ colors: "UR" }))).toMatchObject({ spine: "#24466b", title: "AMALIA", printed: false });
    expect(bookLook(deck({ colors: null })).spine).toBe("#4a4a4a");
  });
});

describe("families", () => {
  it("puts forks (and their forks) after their parent", () => {
    const ds = [deck({ id: "z" }), deck({ id: "x", parent: "z", status: "no_list" }), deck({ id: "a" }), deck({ id: "y", parent: "x" })];
    expect(families(ds).map((f) => [f.root.id, f.members.map((m) => m.id), f.listed.map((m) => m.id)])).toEqual([
      ["z", ["z", "x", "y"], ["z", "y"]], ["a", ["a"], ["a"]],
    ]);
  });
});

describe("cover images", () => {
  const cards = { Anger: { name: "Anger", image: "/anger" }, Tribble: { name: "Tribble", image: "/tribble" } } as Cards;
  const proxies: Proxies = { sets: [{ id: "ink", name: "Ink", description: "", versions: ["v1"] }], cards: { ink: { anger: [{ v: "v1", url: "/ink-anger" }] } } };
  it("shows the deck's proxy of the commander, else the original card", () => {
    expect(cardImage(deck({ proxySet: "ink" }), "Anger", cards, proxies)).toBe("/ink-anger");
    expect(cardImage(deck({ proxySet: null }), "Anger", cards, proxies)).toBe("/anger");
    expect(cardImage(deck({}), null, cards, proxies)).toBe(null);
  });
  it("back cover: the printed card first, then the hard-sleeved card", () => {
    expect(backCover(deck({ box: { backInsert: { image: "/back.png", w: 69, h: 92 }, backCard: "Tribble" } as never }), cards, null))
      .toEqual({ image: "/back.png", ratio: 0.75 });
    expect(backCover(deck({ box: { backCard: "Tribble" } as never }), cards, null)?.image).toBe("/tribble");
    expect(backCover(deck({}), cards, null)).toBe(null);
  });
});
