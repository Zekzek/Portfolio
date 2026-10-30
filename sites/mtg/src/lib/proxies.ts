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

export interface CardVersion {
  key: string; // unique within the list
  kind: "deck" | "official" | "other";
  label: string; // "Ink v7", "Original card", "Neon v1"
  url: string;
  inUse: boolean; // the image this deck shows for the card
}

/** The set a deck's card dialog treats as active: the one being shown, else the deck's default. */
export function activeSet(currentSet: string, deckSet?: string | null): string | null {
  return currentSet && currentSet !== "original" ? currentSet : deckSet || null;
}

/** Every picture of a card, in the dialog's order: each version in the deck's set (newest first, the
 *  first one in use), then the official card, then the newest version from each other set. */
export function cardVersions(proxies: Proxies | null, name: string, set: string | null, official: string | null): CardVersion[] {
  const out: CardVersion[] = [];
  const hist = proxyHistory(proxies, name);
  const own = hist.find((h) => h.set.id === set);
  own?.versions.forEach((v, i) => out.push({ key: `${own.set.id}:${v.v}`, kind: "deck", label: `${own.set.name} ${v.v}`, url: v.url, inUse: i === 0 }));
  if (official) out.push({ key: "official", kind: "official", label: "Original card", url: official, inUse: !own });
  for (const h of hist) {
    if (h.set.id === set) continue;
    const v = h.versions[0];
    out.push({ key: `${h.set.id}:${v.v}`, kind: "other", label: `${h.set.name} ${v.v}`, url: v.url, inUse: false });
  }
  return out;
}
