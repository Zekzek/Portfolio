// Search across every deck, with a small Scryfall-like syntax:
//   insect              name, type line, rules text or keyword contains "insect"
//   t:insect            type line contains "insect"
//   o:landfall          rules text contains "landfall"
//   n:sliver            name contains "sliver"
//   "enters the battlefield"   quoted phrases stay together
//   -t:land             a leading minus excludes
// All terms must match.
import { mainEntries } from "./deck";
import type { Card, Cards, Deck } from "./types";

type Field = "any" | "t" | "o" | "n";
export interface Term { field: Field; text: string; negate: boolean }

export function parseQuery(q: string): Term[] {
  const terms: Term[] = [];
  for (const m of q.matchAll(/(-?)(?:([tno]):)?(?:"([^"]*)"|(\S+))/gi)) {
    const text = (m[3] ?? m[4] ?? "").toLowerCase().trim();
    if (!text) continue;
    terms.push({ field: (m[2]?.toLowerCase() as Field) ?? "any", text, negate: m[1] === "-" });
  }
  return terms;
}

function haystack(card: Card | undefined, name: string, field: Field): string {
  const n = name.toLowerCase();
  if (!card) return field === "n" || field === "any" ? n : "";
  const t = (card.type_line ?? "").toLowerCase();
  const o = (card.oracle_text ?? "").toLowerCase();
  if (field === "n") return n;
  if (field === "t") return t;
  if (field === "o") return `${o}\n${(card.keywords ?? []).join(" ").toLowerCase()}`;
  return `${n}\n${t}\n${o}\n${(card.keywords ?? []).join(" ").toLowerCase()}`;
}

export function matches(name: string, card: Card | undefined, terms: Term[]): boolean {
  return terms.every((t) => haystack(card, name, t.field).includes(t.text) !== t.negate);
}

export interface Hit {
  name: string;
  decks: string[]; // deck ids that run it
}

/** Every listed card (commanders included) matching the query, with the decks that run it. */
export function searchDecks(q: string, decks: Deck[], cards: Cards): Hit[] {
  const terms = parseQuery(q);
  if (!terms.length) return [];
  const where = new Map<string, string[]>();
  for (const d of decks) {
    for (const e of [...d.commanders, ...mainEntries(d)]) {
      const list = where.get(e.name) ?? [];
      if (!list.includes(d.id)) list.push(d.id);
      where.set(e.name, list);
    }
  }
  return [...where]
    .filter(([name]) => matches(name, cards[name], terms))
    .map(([name, ids]) => ({ name, decks: ids }))
    .sort((a, b) => (cards[a.name]?.cmc ?? 99) - (cards[b.name]?.cmc ?? 99) || a.name.localeCompare(b.name));
}
