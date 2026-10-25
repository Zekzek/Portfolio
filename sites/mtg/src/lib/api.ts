// Loading data and calling the local DeckGen actions (MTG/DeckSite/server.py).
import type { Art, Cards, Deck } from "./types";

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

export const loadDecks = () => getJson<Deck[]>("/data/decks.json");
export const loadCards = () => getJson<Cards>("/data/cards.json");
export const loadArt = () => getJson<Art>("/data/art.json");

async function post(action: string, body: Record<string, unknown>): Promise<string> {
  const r = await fetch(`/api/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({ error: `${r.status} ${r.statusText}` }));
  if (!r.ok || data.error) throw new Error(data.error ?? `Request failed (${r.status})`);
  return data.message ?? "";
}

export interface ArtTarget {
  deck: string;
  style: string;
  card: string;
}

export const pickAttempt = (t: ArtTarget, n: number) => post("pick", { ...t, n });
export const queueReroll = (t: ArtTarget, note: string) => post("reroll", { ...t, note });
export const unqueueReroll = (t: ArtTarget) => post("unqueue", t);
export const startManifest = (deck: string) => post("deckgen/new", { deck });
