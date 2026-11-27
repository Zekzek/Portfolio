import { proxyFor } from "./proxies";
import { boxLabel } from "./box";
import type { Cards, Deck, Proxies } from "./types";

/** How a deck's book looks on the shelf: the colors its box is printed in (DeckBox/decks/<deck>.json), or,
 *  for a deck without a box, a plain binding in its main color. */
export interface BookLook {
  spine: string; // binding
  label: string; // the spine's name and the cover's title
  band: string; // the border: bands on the spine, the frame round the cover
  frame: string; // the cover window's frame
  back: string; // the back cover
  backBand: string; // its border
  title: string; // the text on the spine
  printed: boolean; // drawn from a built box
}

// A binding for decks without a box, by their first color.
const PLAIN: Record<string, string> = { W: "#8a8170", U: "#24466b", B: "#2b2b30", R: "#6e2a22", G: "#2f4a2a" };

export function bookLook(deck: Deck): BookLook {
  const c = deck.box?.colors;
  const title = (boxLabel(deck.box) || deck.name).toUpperCase();
  if (c?.spine) {
    return { spine: c.spine, label: c.spine_label ?? "#f4f4f4", band: c.cover_border ?? c.spine_label ?? "#d0703a",
      frame: c.cover_frame ?? c.spine_label ?? "#f4f4f4", back: c.base ?? c.spine,
      backBand: c.base_border ?? c.cover_border ?? "#d0703a", title, printed: true };
  }
  const spine = PLAIN[(deck.colors ?? "")[0]] ?? "#4a4a4a";
  return { spine, label: "#efe6d2", band: "#b89b5e", frame: "#efe6d2", back: spine, backBand: "#b89b5e", title, printed: false };
}

/** Families: each deck without a parent (in the list), followed by its forks and theirs. */
export function families(decks: Deck[]): { root: Deck; members: Deck[]; listed: Deck[] }[] {
  const ids = new Set(decks.map((d) => d.id));
  const roots = decks.filter((d) => !d.parent || !ids.has(d.parent));
  const childrenOf = (id: string): Deck[] => decks.filter((d) => d.parent === id).flatMap((d) => [d, ...childrenOf(d.id)]);
  return roots.map((r) => {
    const members = [r, ...childrenOf(r.id)];
    return { root: r, members, listed: members.filter((m) => m.status !== "no_list") };
  });
}

/** The whole card as it sits behind the cover's window: from the deck's proxy set, else the original. */
export function cardImage(deck: Deck, name: string | null | undefined, cards: Cards, proxies: Proxies | null): string | null {
  if (!name) return null;
  const p = deck.proxySet ? proxyFor(proxies, deck.proxySet, name) : undefined;
  return p?.url ?? cards[name]?.image ?? null;
}

/** What shows in the back cover: the printed card (DeckBox/print), else the card in its hard sleeve. */
export function backCover(deck: Deck, cards: Cards, proxies: Proxies | null): { image: string; ratio: number } | null {
  const ins = deck.box?.backInsert;
  if (ins) return { image: ins.image, ratio: ins.w / ins.h };
  const img = cardImage(deck, deck.box?.backCard, cards, proxies);
  return img ? { image: img, ratio: 63 / 88 } : null;
}
