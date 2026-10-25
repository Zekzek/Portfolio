// Comparing two or more decks: which cards they share and which are unique.
import { isLand, mainEntries } from "./deck";
import type { Cards, Deck } from "./types";

export interface Row {
  name: string;
  counts: number[]; // copies per deck, in the order of the decks passed in; 0 = not in that deck
  decksIn: number;
}

export interface Comparison {
  decks: Deck[];
  rows: Row[]; // every card in any of the decks
  inAll: Row[];
  only: Row[][]; // only[i] = cards only deck i has
  some: Row[]; // in more than one deck but not all (3+ decks only)
}

/** Lands last, then by mana value, then by name. */
export function compareSort(cards: Cards) {
  return (a: Row, b: Row) => {
    const la = isLand(cards[a.name]) ? 1 : 0;
    const lb = isLand(cards[b.name]) ? 1 : 0;
    if (la !== lb) return la - lb;
    const d = (cards[a.name]?.cmc ?? 99) - (cards[b.name]?.cmc ?? 99);
    return d || a.name.localeCompare(b.name);
  };
}

export function compareDecks(decks: Deck[], cards: Cards): Comparison {
  const counts = new Map<string, number[]>();
  decks.forEach((d, i) => {
    for (const e of [...d.commanders, ...mainEntries(d)]) {
      const row = counts.get(e.name) ?? decks.map(() => 0);
      row[i] += e.count;
      counts.set(e.name, row);
    }
  });
  const rows = [...counts].map(([name, c]) => ({ name, counts: c, decksIn: c.filter((n) => n > 0).length }));
  rows.sort(compareSort(cards));
  const n = decks.length;
  return {
    decks,
    rows,
    inAll: rows.filter((r) => r.decksIn === n),
    only: decks.map((_, i) => rows.filter((r) => r.decksIn === 1 && r.counts[i] > 0)),
    some: n > 2 ? rows.filter((r) => r.decksIn > 1 && r.decksIn < n) : [],
  };
}

/** True when a card is in every deck but not with the same number of copies (e.g. 13 vs 11 Forests). */
export function countsDiffer(row: Row): boolean {
  const present = row.counts.filter((c) => c > 0);
  return present.some((c) => c !== present[0]);
}

/** Short tags for decks in a comparison: A, B, C... */
export const deckLetter = (i: number) => String.fromCharCode(65 + i);
