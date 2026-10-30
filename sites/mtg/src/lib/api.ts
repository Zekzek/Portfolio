// Loading data and calling this PC's server (MTG/DeckSite/server.py).
// Three sources (see connection.svelte.ts):
//   local     the page is served by this PC's server: relative URLs
//   live      the hosted page calls this PC's server directly (http://127.0.0.1:8765) with the sign-in token
//   snapshot  the hosted page reads the last upload from the private bucket (read-only)
import { LOCAL_SERVER, authHeaders, conn } from "./connection.svelte";
import type { ArtPosition, Focus } from "./artpos";
import { getJson as bucketJson, signAll } from "./hosted";
import type { Art, Cards, Deck, EditOp, GenJob, GenPlan, GenRequest, GenThemes, HistoryEntry, Proxies } from "./types";

/** "/art/...", "/img?u=..." from this PC's server, made absolute when the hosted page is talking to it. */
const SERVER_LINK = /^\/(img\?|art\/|art-trim\/|proxy\/|print\/|proxies\/|deckgen-img\/)/;
function absolutize<T>(data: T): T {
  if (conn.mode !== "live") return data;
  return JSON.parse(JSON.stringify(data), (_k, v) => (typeof v === "string" && SERVER_LINK.test(v) ? LOCAL_SERVER + v : v));
}

async function serverJson<T>(path: string): Promise<T> {
  const base = conn.mode === "live" ? LOCAL_SERVER : "";
  const r = await fetch(base + path, { cache: "no-store", headers: await authHeaders() });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return absolutize(await r.json());
}

/** "/data/decks.json" from this PC's server, or "data/decks.json" from the bucket in snapshot mode. */
const getJson = <T>(path: string): Promise<T> =>
  conn.mode === "snapshot" ? bucketJson<T>(path.slice(1)) : serverJson<T>(path);

export const loadDecks = () => getJson<Deck[]>("/data/decks.json");
export const loadCards = () => getJson<Cards>("/data/cards.json");
/** Snapshot art links point into the private bucket ("s3:..."), so they're signed after loading. */
export const loadArt = async () =>
  conn.mode === "snapshot" ? signAll(await getJson<Art>("/data/art.json")) : getJson<Art>("/data/art.json");
/** Proxy sets; snapshot links point into the private bucket and are signed after loading. */
export const loadProxies = async () =>
  conn.mode === "snapshot" ? signAll(await getJson<Proxies>("/data/proxies.json")) : getJson<Proxies>("/data/proxies.json");
export const loadVersions = () => getJson<Record<string, number>>("/data/versions.json");
export const loadHistory = (deck: string) => getJson<HistoryEntry[]>(`/data/history/${encodeURIComponent(deck)}.json`);
/** When the snapshot was uploaded (snapshot mode only). */
export const loadSnapshotMeta = () => bucketJson<{ exportedAt: string }>("data/meta.json");

/** Failed request; `status` 409 means the deck changed since the page loaded it. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly data: Record<string, unknown>) {
    super(message);
  }
}

async function post<T = { message?: string }>(action: string, body: Record<string, unknown>): Promise<T> {
  if (conn.mode === "snapshot") throw new ApiError("Connect to your PC to make changes", 0, {});
  const base = conn.mode === "live" ? LOCAL_SERVER : "";
  const r = await fetch(`${base}/api/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
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

// Generating proxies (this PC only). Only startGeneration spends anything, and only with a plan's token.
export const loadGenThemes = (deck: string) => serverJson<GenThemes>(`/api/deckgen/themes?deck=${encodeURIComponent(deck)}`);
export const planGeneration = (req: GenRequest) => post<GenPlan>("deckgen/plan", { ...req });
export const startGeneration = (req: GenRequest, token: string) => post<GenJob>("deckgen/generate", { ...req, confirm: token });
export const loadGenJob = () => serverJson<GenJob>("/api/deckgen/job");

// Art position in the frame (DeckSite/artpos.py): no generation, only a re-render.
export const loadArtPosition = (t: ArtTarget) =>
  serverJson<ArtPosition>(`/api/deckgen/position?deck=${encodeURIComponent(t.deck)}&style=${encodeURIComponent(t.style)}&card=${encodeURIComponent(t.card)}`);
export const previewArtPosition = (t: ArtTarget, focus: Focus) => post<{ image: string }>("deckgen/preview", { ...t, focus }).then((d) => d.image);
export const saveArtPosition = (t: ArtTarget, focus: Focus | null) => post("deckgen/position", { ...t, focus }).then((d) => d.message ?? "");

export const revertDeck = (deck: string, version: number, to: number, why = "") =>
  post<EditResult>("deck/revert", { deck, version, to, why });

/** Card names Scryfall knows, for the "add card" box. */
export async function suggestNames(q: string): Promise<string[]> {
  if (q.trim().length < 2) return [];
  const r = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(q)}`);
  if (!r.ok) return [];
  return ((await r.json()).data ?? []) as string[];
}
