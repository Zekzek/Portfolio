import { describe, expect, it } from "vitest";
import { parseQuery, searchDecks } from "../src/lib/search";
import { href, parseRoute } from "../src/lib/route";
import type { Cards, Deck } from "../src/lib/types";

const cards: Cards = {
  "Scute Swarm": { name: "Scute Swarm", type_line: "Creature — Insect", cmc: 3, oracle_text: "Landfall — Whenever a land you control enters, create a 1/1 green Insect creature token.", keywords: ["Landfall"] },
  "Nameless Inversion": { name: "Nameless Inversion", type_line: "Kindred Instant — Shapeshifter", cmc: 2, oracle_text: "Changeling\nTarget creature gets +3/-3 and loses all creature types until end of turn." },
  "Evolving Wilds": { name: "Evolving Wilds", type_line: "Land", cmc: 0, oracle_text: "{T}, Sacrifice Evolving Wilds: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle." },
  "Muscle Sliver": { name: "Muscle Sliver", type_line: "Creature — Sliver", cmc: 2, oracle_text: "All Sliver creatures get +1/+1." },
  "Zask": { name: "Zask", type_line: "Legendary Creature — Insect", cmc: 5, oracle_text: "You may play lands and cast Insect spells from your graveyard." },
};

const deck = (id: string, names: string[], cmdr = "Zask"): Deck => ({
  id, name: id, colors: null, status: "complete", note: null, parent: null, doc: null, deckgen: null,
  commanderNames: [cmdr], commanders: [{ name: cmdr, count: 1 }], unknown: [], proxyOnly: [], drift: null, count: names.length,
  categories: [{ name: "All", cards: names.map((name) => ({ name, count: 1 })) }],
});
const decks = [deck("zask", ["Scute Swarm", "Nameless Inversion", "Evolving Wilds"]), deck("forest", ["Scute Swarm"]), deck("sliver", ["Muscle Sliver"], "Muscle Sliver")];
const names = (q: string) => searchDecks(q, decks, cards).map((h) => h.name);

describe("query parsing", () => {
  it("fields, quotes and negation", () => {
    expect(parseQuery('t:insect -o:"green insect" sliver')).toEqual([
      { field: "t", text: "insect", negate: false },
      { field: "o", text: "green insect", negate: true },
      { field: "any", text: "sliver", negate: false },
    ]);
  });
});

describe("search", () => {
  it("plain words look at name, type, text and keywords", () => {
    expect(names("insect")).toEqual(["Scute Swarm", "Zask"]);
    expect(names("landfall")).toEqual(["Scute Swarm"]);
  });
  it("t: only looks at the type line", () => {
    expect(names("t:insect")).toEqual(["Scute Swarm", "Zask"]);
    expect(names("t:shapeshifter")).toEqual(["Nameless Inversion"]);
  });
  it("o:, n:, quotes and minus", () => {
    expect(names('o:"basic land"')).toEqual(["Evolving Wilds"]);
    expect(names("n:sliver")).toEqual(["Muscle Sliver"]);
    expect(names("t:creature -t:insect")).toEqual(["Muscle Sliver"]);
  });
  it("reports every deck that runs a card, commanders included", () => {
    const hits = searchDecks("t:insect", decks, cards);
    expect(hits.find((h) => h.name === "Scute Swarm")!.decks).toEqual(["zask", "forest"]);
    expect(hits.find((h) => h.name === "Zask")!.decks).toEqual(["zask", "forest"]);
  });
  it("empty query finds nothing", () => {
    expect(names("   ")).toEqual([]);
  });
  it("search routes round-trip", () => {
    const r = { view: "search" as const, q: 't:insect o:"enters the battlefield"', card: "Scute Swarm" };
    expect(parseRoute(href(r))).toEqual(r);
  });
});
