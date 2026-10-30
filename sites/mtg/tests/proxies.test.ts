import { describe, expect, it } from "vitest";
import { activeSet, artCount, cardVersions, variantsOf, commanderArts, coverage, deckArt, proxyFor, proxyHistory, proxyKey } from "../src/lib/proxies";
import type { Cards, Deck, Proxies } from "../src/lib/types";

// Must match DeckSite/proxies.py key(): the Python side writes the keys, the page looks them up.
describe("proxy keys", () => {
  it("ignore case, spaces and punctuation, and use the front face", () => {
    expect(proxyKey("Alora, Merry Thief")).toBe("alorameerrythief".replace("ee", "e"));
    expect(proxyKey("An Offer You Can't Refuse")).toBe(proxyKey("AnOfferYouCanTRefuse"));
    expect(proxyKey("Brazen Borrower // Petty Theft")).toBe("brazenborrower");
    expect(proxyKey("Summon: Titan")).toBe("summontitan");
  });
});

const proxies: Proxies = {
  sets: [
    { id: "ink", name: "Ink", description: "", versions: ["v7", "v6", "v5"] },
    { id: "neon", name: "Neon", description: "", versions: ["v1"] },
  ],
  cards: {
    ink: { fabricate: [{ v: "v7", url: "/f7" }, { v: "v6", url: "/f6" }], anger: [{ v: "v5", url: "/a5" }] },
    neon: { fabricate: [{ v: "v1", url: "/nf1" }] },
  },
};

describe("proxy lookup", () => {
  it("newest version wins; missing cards fall back", () => {
    expect(proxyFor(proxies, "ink", "Fabricate")?.url).toBe("/f7");
    expect(proxyFor(proxies, "ink", "Sol Ring")).toBeUndefined();
    expect(proxyFor(null, "ink", "Fabricate")).toBeUndefined();
  });
  it("history across sets and coverage", () => {
    expect(proxyHistory(proxies, "Fabricate").map((h) => [h.set.id, h.versions.map((v) => v.v)])).toEqual([
      ["ink", ["v7", "v6"]], ["neon", ["v1"]],
    ]);
    expect(coverage(proxies, "ink", ["Fabricate", "Anger", "Sol Ring"])).toBe(2);
  });
});

describe("deck art", () => {
  const cards = { Fabricate: { name: "Fabricate", art_crop: "/crop-f" }, Anger: { name: "Anger", art_crop: "/crop-a" } } as Cards;
  const deck = (commander: string, proxySet: string | null) => ({ commanderNames: [commander], proxySet }) as Deck;
  it("uses the commander from the deck's proxy set", () => {
    expect(deckArt(deck("Fabricate", "ink"), cards, proxies)).toEqual({ name: "Fabricate", url: "/f7", proxy: true });
  });
  it("falls back to the original art when the set lacks the commander or the deck has no set", () => {
    expect(deckArt(deck("Anger", "neon"), cards, proxies)).toEqual({ name: "Anger", url: "/crop-a", proxy: false });
    expect(deckArt(deck("Anger", null), cards, proxies)).toEqual({ name: "Anger", url: "/crop-a", proxy: false });
    expect(deckArt(deck("Anger", "ink"), cards, null)).toEqual({ name: "Anger", url: "/crop-a", proxy: false });
  });
});

describe("commander arts", () => {
  it("returns every commander, each from the proxy set or its original art", () => {
    const cards = { Fabricate: { name: "Fabricate", art_crop: "/crop-f" }, Anger: { name: "Anger", art_crop: "/crop-a" }, Nope: { name: "Nope" } } as Cards;
    const deck = { commanderNames: ["Fabricate", "Nope", "Anger"], proxySet: "neon" } as Deck;
    expect(commanderArts(deck, cards, proxies).map((a) => a.url)).toEqual(["/nf1", "/crop-a"]);
  });
});

describe("card dialog versions", () => {
  const ps: Proxies = {
    sets: [
      { id: "ink", name: "Ink", description: "", versions: ["v7", "v6"] },
      { id: "neon", name: "Neon", description: "", versions: ["v2", "v1"] },
      { id: "glass", name: "Glass", description: "", versions: ["v1"] },
    ],
    cards: {
      ink: { anger: [{ v: "v7", url: "/i7" }, { v: "v6", url: "/i6" }] },
      neon: { anger: [{ v: "v2", url: "/n2" }, { v: "v1", url: "/n1" }] },
      glass: {},
    },
  };
  it("lists this deck's set (all versions), then the official card, then one per other set", () => {
    expect(cardVersions(ps, "Anger", "ink", "/scry").map((v) => [v.label, v.kind, v.inUse])).toEqual([
      ["Ink · v7", "deck", true], ["Ink · v6", "deck", false], ["Original card", "official", false], ["Neon · v2", "other", false],
    ]);
  });
  it("uses the official card when the deck's set has no version", () => {
    expect(cardVersions(ps, "Anger", "glass", "/scry").map((v) => [v.label, v.inUse])).toEqual([
      ["Original card", true], ["Ink · v7", false], ["Neon · v2", false],
    ]);
    expect(cardVersions(ps, "Sol Ring", null, null)).toEqual([]);
  });
  it("active set: the one shown, else the deck's default", () => {
    expect(activeSet("neon", "ink")).toBe("neon");
    expect(activeSet("original", "ink")).toBe("ink");
    expect(activeSet("", null)).toBe(null);
  });
});

describe("variants (Forest.png, Forest_2.png ...)", () => {
  const ps: Proxies = {
    sets: [{ id: "maya", name: "Maya", description: "", versions: ["v2", "v1"] }, { id: "ink", name: "Ink", description: "", versions: ["v1"] }],
    cards: {
      maya: { forest: [{ v: "v1", url: "/f1", variant: 1 }, { v: "v2", url: "/f2b", variant: 2 }, { v: "v1", url: "/f2a", variant: 2 }] },
      ink: { forest: [{ v: "v1", url: "/i1" }] },
    },
  };
  it("groups a card's images by variant, each newest first", () => {
    expect(variantsOf(ps.cards.maya.forest).map((x) => [x.variant, x.versions.map((v) => v.url)])).toEqual([[1, ["/f1"]], [2, ["/f2b", "/f2a"]]]);
    expect(artCount(ps, "maya", "Forest")).toBe(2);
    expect(artCount(ps, "ink", "Forest")).toBe(1);
    expect(artCount(ps, "ink", "Swamp")).toBe(0);
  });
  it("lists every variant in the deck's set, each variant's newest in use", () => {
    expect(cardVersions(ps, "Forest", "maya", "/scry").map((v) => [v.label, v.inUse])).toEqual([
      ["Maya · art 1 · v1", true], ["Maya · art 2 · v2", true], ["Maya · art 2 · v1", false], ["Original card", false], ["Ink · v1", false],
    ]);
  });
});
