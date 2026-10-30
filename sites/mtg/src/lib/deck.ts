// Grouping, sorting and stats for a deck view.
import type { Card, Cards, Deck, DeckEntry } from "./types";

export type GroupBy = "category" | "type" | "cmc" | "color" | "keyword";
export type SortBy = "cmc" | "name" | "score" | "power" | "toughness";

/** Label for cards with no keyword when grouping by keyword. */
export const NO_KEYWORD = "No keywords";

/** Each deck's pile of cards set aside (DeckSite deckstore.SIDEBOARD): not counted, not exported. */
export const SIDEBOARD = "Sideboard";
export const isSideboard = (c: { name: string; excluded?: boolean }) => c.name === SIDEBOARD && !!c.excluded;

export interface Group {
  key: string;
  label: string;
  entries: DeckEntry[];
  count: number; // copies, e.g. 13x Forest counts 13
  excluded?: boolean;
  sideboard?: boolean;
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

/** "3" -> 3, "1+*" -> 1, "*" -> 0; null when the card has none (not a creature). */
export function statValue(v?: string | null): number | null {
  if (v == null || v === "") return null;
  const m = /-?\d+(\.\d+)?/.exec(v);
  return m ? Number(m[0]) : 0;
}

function stat(card: Card | undefined, key: "power" | "toughness"): number | null {
  return statValue(card?.[key]);
}

/** Sort a group. Score, power and toughness go highest first; cards without one go last.
 *  Ties fall back to mana value, then name. */
export function sortEntries(entries: DeckEntry[], cards: Cards, by: SortBy, scores: Record<string, number> = {}): DeckEntry[] {
  const high = (v: number | null | undefined) => (v == null ? -Infinity : v);
  const value = (n: string): number | null | undefined =>
    by === "score" ? scores[n] : by === "power" ? stat(cards[n], "power") : by === "toughness" ? stat(cards[n], "toughness") : undefined;
  return [...entries].sort((a, b) => {
    if (by === "score" || by === "power" || by === "toughness") {
      const d = high(value(b.name)) - high(value(a.name));
      if (d) return d;
    }
    if (by !== "name") {
      const d = (cards[a.name]?.cmc ?? 99) - (cards[b.name]?.cmc ?? 99);
      if (d) return d;
    }
    return a.name.localeCompare(b.name);
  });
}

/** Every main-deck entry (commanders are shown separately; reference-only sections are left out). */
export function mainEntries(deck: Deck): DeckEntry[] {
  return deck.categories.filter((c) => !c.excluded).flatMap((c) => c.cards);
}

export function groupDeck(deck: Deck, cards: Cards, by: GroupBy, sort: SortBy): Group[] {
  let groups: Group[];
  if (by === "keyword") {
    // A card shows under each of its keywords (a Flying, Haste card is in both groups).
    const map = new Map<string, DeckEntry[]>();
    for (const e of mainEntries(deck)) {
      const kws = cards[e.name]?.keywords?.length ? cards[e.name]!.keywords! : [NO_KEYWORD];
      for (const k of new Set(kws)) map.set(k, [...(map.get(k) ?? []), e]);
    }
    const keys = [...map.keys()].filter((k) => k !== NO_KEYWORD)
      .sort((a, b) => map.get(b)!.length - map.get(a)!.length || a.localeCompare(b));
    if (map.has(NO_KEYWORD)) keys.push(NO_KEYWORD);
    groups = keys.map((k) => ({ key: k, label: k, entries: map.get(k)!, count: 0 }));
    const side = deck.categories.find(isSideboard);
    if (side?.cards.length) groups.push({ key: SIDEBOARD, label: `${SIDEBOARD} · set aside, not counted`, entries: side.cards, count: 0, excluded: true, sideboard: true });
  } else if (by === "category") {
    groups = deck.categories.map((c) => ({
      key: c.name, entries: c.cards, count: 0, excluded: !!c.excluded, sideboard: isSideboard(c),
      label: isSideboard(c) ? `${c.name} · set aside, not counted` : c.excluded ? `${c.name} · reference only` : c.name,
    }));
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
    // The sideboard shows in every grouping, at the end.
    const side = deck.categories.find(isSideboard);
    if (side?.cards.length) groups.push({ key: SIDEBOARD, label: `${SIDEBOARD} · set aside, not counted`, entries: side.cards, count: 0, excluded: true, sideboard: true });
  }
  return groups.map((g) => ({ ...g, entries: sortEntries(g.entries, cards, sort, deck.scores), count: copies(g.entries) }));
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
