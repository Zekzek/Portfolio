import { describe, expect, it } from "vitest";
import { coverage, deckArt, proxyFor, proxyHistory, proxyKey } from "../src/lib/proxies";
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
    expect(deckArt(deck("Fabricate", "ink"), cards, proxies)).toEqual({ url: "/f7", proxy: true });
  });
  it("falls back to the original art when the set lacks the commander or the deck has no set", () => {
    expect(deckArt(deck("Anger", "neon"), cards, proxies)).toEqual({ url: "/crop-a", proxy: false });
    expect(deckArt(deck("Anger", null), cards, proxies)).toEqual({ url: "/crop-a", proxy: false });
    expect(deckArt(deck("Anger", "ink"), cards, null)).toEqual({ url: "/crop-a", proxy: false });
  });
});
