// Grouping, sorting and stats for a deck view.
import type { Card, Cards, Deck, DeckEntry } from "./types";

export type GroupBy = "category" | "type" | "cmc" | "color";
export type SortBy = "cmc" | "name";

export interface Group {
  key: string;
  label: string;
  entries: DeckEntry[];
  count: number; // copies, e.g. 13x Forest counts 13
}

// A card goes in the first type it has, in this order (Artifact Creature -> Creature).
const TYPE_ORDER = ["Creature", "Planeswalker", "Battle", "Land", "Instant", "Sorcery", "Artifact", "Enchantment", "Kindred", "Tribal"];
const COLOR_NAMES: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green" };
const COLOR_ORDER = ["W", "U", "B", "R", "G", "Multicolor", "Colorless", "Land"];

/** Front face's type line: "Sorcery // Land" -> "Sorcery". */
export function frontType(card?: Card): string {
  return (card?.type_line ?? "").split(" // ")[0];
}

export function primaryType(card?: Card): string {
  const t = frontType(card);
  return TYPE_ORDER.find((k) => new RegExp(`\\b${k}\\b`).test(t)) ?? "Other";
}

export function isLand(card?: Card): boolean {
  return primaryType(card) === "Land";
}

export function colorGroup(card?: Card): string {
  if (isLand(card)) return "Land";
  const c = card?.colors ?? [];
  if (c.length === 0) return "Colorless";
  if (c.length > 1) return "Multicolor";
  return c[0];
}

export function colorLabel(key: string): string {
  return COLOR_NAMES[key] ?? key;
}

const copies = (entries: DeckEntry[]) => entries.reduce((n, e) => n + e.count, 0);

export function sortEntries(entries: DeckEntry[], cards: Cards, by: SortBy): DeckEntry[] {
  return [...entries].sort((a, b) => {
    if (by === "cmc") {
      const d = (cards[a.name]?.cmc ?? 99) - (cards[b.name]?.cmc ?? 99);
      if (d) return d;
    }
    return a.name.localeCompare(b.name);
  });
}

/** Every main-deck entry (commanders are shown separately). */
export function mainEntries(deck: Deck): DeckEntry[] {
  return deck.categories.flatMap((c) => c.cards);
}

export function groupDeck(deck: Deck, cards: Cards, by: GroupBy, sort: SortBy): Group[] {
  let groups: Group[];
  if (by === "category") {
    groups = deck.categories.map((c) => ({ key: c.name, label: c.name, entries: c.cards, count: 0 }));
  } else {
    const keyOf = (e: DeckEntry): string => {
      const card = cards[e.name];
      if (by === "type") return primaryType(card);
      if (by === "color") return colorGroup(card);
      if (isLand(card)) return "Land";
      return String(Math.min(7, Math.floor(card?.cmc ?? 0)));
    };
    const map = new Map<string, DeckEntry[]>();
    for (const e of mainEntries(deck)) map.set(keyOf(e), [...(map.get(keyOf(e)) ?? []), e]);
    const order =
      by === "type" ? [...TYPE_ORDER, "Other"]
      : by === "color" ? COLOR_ORDER
      : ["0", "1", "2", "3", "4", "5", "6", "7", "Land"];
    const label = (k: string) =>
      by === "color" ? colorLabel(k) : by === "cmc" ? (k === "Land" ? "Lands" : k === "7" ? "7+ mana" : `${k} mana`) : k;
    groups = order.filter((k) => map.has(k)).map((k) => ({ key: k, label: label(k), entries: map.get(k)!, count: 0 }));
  }
  return groups.map((g) => ({ ...g, entries: sortEntries(g.entries, cards, sort), count: copies(g.entries) }));
}

/** Nonland cards per mana value, 0 through 7+. */
export function manaCurve(deck: Deck, cards: Cards): number[] {
  const curve = Array(8).fill(0);
  for (const e of mainEntries(deck)) {
    const card = cards[e.name];
    if (!card || isLand(card)) continue;
    curve[Math.min(7, Math.floor(card.cmc ?? 0))] += e.count;
  }
  return curve;
}

export function typeCounts(deck: Deck, cards: Cards): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of mainEntries(deck)) {
    const t = primaryType(cards[e.name]);
    counts.set(t, (counts.get(t) ?? 0) + e.count);
  }
  return [...TYPE_ORDER, "Other"].filter((t) => counts.has(t)).map((t) => ({ type: t, count: counts.get(t)! }));
}

/** Colored mana symbols across all costs, e.g. { G: 41, B: 22 }. */
export function pipCounts(deck: Deck, cards: Cards): Record<string, number> {
  const pips: Record<string, number> = {};
  for (const e of mainEntries(deck)) {
    for (const sym of manaSymbols(cards[e.name]?.mana_cost ?? "")) {
      for (const c of sym.replace(/[^WUBRG]/g, "")) pips[c] = (pips[c] ?? 0) + e.count;
    }
  }
  return pips;
}

/** "{2}{G}{G}" -> ["2", "G", "G"]; "{G/U}" -> ["G/U"]. Double-faced: front face only. */
export function manaSymbols(cost: string): string[] {
  return [...cost.split(" // ")[0].matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

/** Scryfall's symbol image for "G", "2", "G/U", "T"... */
export function symbolUrl(sym: string): string {
  return `https://svgs.scryfall.io/card-symbols/${sym.replace(/\//g, "")}.svg`;
}

/** Decks that run a card (main deck or commander). */
export function decksWith(name: string, decks: Deck[]): Deck[] {
  return decks.filter((d) => d.commanders.some((c) => c.name === name) || mainEntries(d).some((e) => e.name === name));
}
