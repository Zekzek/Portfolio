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

/** A deck's picture: its first commander from the deck's proxy set, or the original card's art. */
export function deckArt(deck: Deck, cards: Cards, proxies: Proxies | null): { url: string; proxy: boolean } | null {
  const name = deck.commanderNames[0];
  if (!name) return null;
  const p = deck.proxySet ? proxyFor(proxies, deck.proxySet, name) : undefined;
  if (p) return { url: p.url, proxy: true };
  const crop = cards[name]?.art_crop;
  return crop ? { url: crop, proxy: false } : null;
}
