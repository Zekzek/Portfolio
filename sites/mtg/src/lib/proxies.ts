// Proxy sets (MTG/Proxies/<set>/v<N>): each card shows its newest version in the chosen set.
import type { Cards, Deck, Proxies } from "./types";

/** Same as DeckSite/proxies.py key(): front face, letters and digits only, lowercase. */
export function proxyKey(name: string): string {
  return name.split("//")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** The winning image of a card in a set, if the set has one. */
export function proxyFor(proxies: Proxies | null, set: string, name: string) {
  return proxies?.cards[set]?.[proxyKey(name)]?.[0];
}

/** Every version of a card in every set: [{ set, versions: [{v, url}] }]. */
export function proxyHistory(proxies: Proxies | null, name: string) {
  if (!proxies) return [];
  const k = proxyKey(name);
  return proxies.sets
    .map((s) => ({ set: s, versions: proxies.cards[s.id]?.[k] ?? [] }))
    .filter((x) => x.versions.length);
}

/** How many of these card names a set covers. */
export function coverage(proxies: Proxies | null, set: string, names: string[]): number {
  const cards = proxies?.cards[set] ?? {};
  return names.filter((n) => cards[proxyKey(n)]).length;
}

export interface CardArt { name: string; url: string; proxy: boolean }

/** A card's picture: from the deck's proxy set when it has one, or the original card's art. */
function cardArt(name: string, deck: Deck, cards: Cards, proxies: Proxies | null): CardArt | null {
  const p = deck.proxySet ? proxyFor(proxies, deck.proxySet, name) : undefined;
  if (p) return { name, url: p.url, proxy: true };
  const crop = cards[name]?.art_crop;
  return crop ? { name, url: crop, proxy: false } : null;
}

/** A deck's picture: its first commander. */
export function deckArt(deck: Deck, cards: Cards, proxies: Proxies | null): CardArt | null {
  const name = deck.commanderNames[0];
  return name ? cardArt(name, deck, cards, proxies) : null;
}

/** Pictures of all of a deck's commanders that have one (partners side by side). */
export function commanderArts(deck: Deck, cards: Cards, proxies: Proxies | null): CardArt[] {
  return deck.commanderNames.map((n) => cardArt(n, deck, cards, proxies)).filter((a): a is CardArt => !!a);
}
