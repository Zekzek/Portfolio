// Loading data and calling the local server's actions (MTG/DeckSite/server.py).
import type { Art, Cards, Deck, EditOp, HistoryEntry } from "./types";

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

export const loadDecks = () => getJson<Deck[]>("/data/decks.json");
export const loadCards = () => getJson<Cards>("/data/cards.json");
export const loadArt = () => getJson<Art>("/data/art.json");
export const loadVersions = () => getJson<Record<string, number>>("/data/versions.json");
export const loadHistory = (deck: string) => getJson<HistoryEntry[]>(`/data/history/${encodeURIComponent(deck)}.json`);

/** Failed request; `status` 409 means the deck changed since the page loaded it. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly data: Record<string, unknown>) {
    super(message);
  }
}

async function post<T = { message?: string }>(action: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`/api/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({ error: `${r.status} ${r.statusText}` }));
  if (!r.ok || data.error) throw new ApiError(data.error ?? `Request failed (${r.status})`, r.status, data);
  return data;
}

export interface ArtTarget {
  deck: string;
  style: string;
  card: string;
}

export const pickAttempt = (t: ArtTarget, n: number) => post("pick", { ...t, n }).then((d) => d.message ?? "");
export const queueReroll = (t: ArtTarget, note: string) => post("reroll", { ...t, note }).then((d) => d.message ?? "");
export const unqueueReroll = (t: ArtTarget) => post("unqueue", t).then((d) => d.message ?? "");
export const startManifest = (deck: string) => post("deckgen/new", { deck }).then((d) => d.message ?? "");

export interface EditResult { version: number; done: string[]; newCards: boolean }

/** Change a deck list. `version` is the one the page shows; the server refuses if it's out of date. */
export const editDeck = (deck: string, version: number, ops: EditOp[], why = "") =>
  post<EditResult>("deck/edit", { deck, version, ops, why });

export const revertDeck = (deck: string, version: number, to: number, why = "") =>
  post<EditResult>("deck/revert", { deck, version, to, why });

/** Card names Scryfall knows, for the "add card" box. */
export async function suggestNames(q: string): Promise<string[]> {
  if (q.trim().length < 2) return [];
  const r = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`);
  if (!r.ok) return [];
  return ((await r.json()).data ?? []) as string[];
}
