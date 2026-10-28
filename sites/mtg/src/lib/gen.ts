// Generating proxies: which cards a choice in the form means, and what to send.
import { proxyFor } from "./proxies";
import type { Deck, GenRequest, GenTheme, Proxies } from "./types";

/** "missing" (no proxy in the theme's set yet), "all", "category:<name>" or "pick". */
export type CardMode = string;

export function cardsFor(mode: CardMode, cards: string[], deck: Deck, set: string | null, proxies: Proxies | null,
                         picked: Set<string>): string[] {
  if (mode === "all") return cards;
  if (mode === "pick") return cards.filter((n) => picked.has(n));
  if (mode === "missing") return cards.filter((n) => !set || !proxyFor(proxies, set, n));
  if (mode.startsWith("category:")) {
    const cat = deck.categories.find((c) => c.name === mode.slice("category:".length));
    const inCat = new Set(cat?.cards.map((e) => e.name) ?? []);
    return cards.filter((n) => inCat.has(n));
  }
  return [];
}

export interface NewTheme { name: string; frame: string; prompt: string; references: string[] }

export function genRequest(deck: string, theme: GenTheme | NewTheme, cards: string[], newAttempt: boolean,
                           art: Record<string, string>): GenRequest {
  const chosen = new Set(cards);
  const ideas = Object.fromEntries(Object.entries(art).filter(([n, t]) => chosen.has(n) && t.trim()).map(([n, t]) => [n, t.trim()]));
  return {
    deck,
    theme: "key" in theme ? { key: theme.key } : { new: { ...theme, name: theme.name.trim(), prompt: theme.prompt.trim() } },
    cards,
    newAttempt,
    art: ideas,
  };
}

/** "about 480 credits" / "12 images" */
export function costLabel(images: number, perImage: number | null, unit: string | null): string {
  const imgs = `${images} image${images === 1 ? "" : "s"}`;
  return perImage ? `${imgs} · about ${images * perImage} ${unit ?? "credits"}` : imgs;
}
