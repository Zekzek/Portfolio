// Shapes of the JSON files built by MTG/DeckSite/build_data.py.

export interface DeckEntry {
  name: string;
  count: number;
  set?: string;
  note?: string;
}

export interface Category {
  name: string;
  cards: DeckEntry[];
  excluded?: boolean; // reference only: not counted, not exported
  refs?: DeckEntry[]; // cards that live in another category, listed here too
}

export type DeckStatus = "complete" | "in_progress" | "pool" | "no_list";

export interface Deck {
  id: string;
  name: string;
  colors: string | null; // "BG", "WUBRG"...
  status: DeckStatus;
  note: string | null;
  parent: string | null;
  doc: string | null;
  list?: string;
  deckgen: string | null;
  commanderNames: string[];
  commanders: DeckEntry[];
  categories: Category[];
  count: number; // cards without commanders
  target: number; // 100 minus commanders
  version: number; // bumps on every change (page or deck.py)
  proxySet?: string | null; // default proxy set (MTG/Proxies/<set>); empty = original cards
  updated: string;
  unknown: string[];
  proxyOnly: string[]; // in the DeckGen manifest but not in this list
  drift: { onlyInDoc: string[]; onlyInList: string[] } | null; // .md Deck List vs .txt; null = nothing to compare
}

export interface Face {
  name: string;
  image: string | null;
  art_crop: string | null;
}

export interface Card {
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  colors?: string[];
  color_identity?: string[];
  keywords?: string[];
  rarity?: string;
  set?: string;
  set_name?: string;
  image?: string | null;
  art_crop?: string | null;
  faces?: Face[];
  scryfall_uri?: string;
}

export interface Attempt {
  n: number;
  url: string;
  note: string;
  imported: boolean;
}

export interface StyleArt {
  attempts: Attempt[];
  picked: number | null;
  queued: string | null; // null = not queued; "" = queued with no note
  composed: string | null;
}

export interface DeckArt {
  manifest: string;
  deckgenName: string;
  activeStyle: string;
  styles: { id: string; frame: string; prompt: string; printPdf: string | null }[];
  cards: Record<string, Record<string, StyleArt>>;
  nightlyCap: number | null;
}

export type Cards = Record<string, Card>;
export type Art = Record<string, DeckArt>;

export interface HistoryEntry {
  version: number;
  at: string;
  by: string; // "page", "claude", ...
  why: string;
  summary: string[];
}

export type EditOp =
  | { op: "add"; card: string; category: string; count?: number; note?: string }
  | { op: "remove"; card: string }
  | { op: "set_count"; card: string; count: number }
  | { op: "move"; card: string; category: string }
  | { op: "sideboard"; card: string } // set aside in the deck's Sideboard
  | { op: "set_note"; card: string; note: string }
  | { op: "set_deck"; field: "status" | "note" | "name" | "proxySet"; value: string };

export interface ProxySet {
  id: string;
  name: string;
  description: string;
  versions: string[]; // newest first
}

/** MTG/Proxies: per set, per card key (see proxyKey), its versions newest first; the first one wins. */
export interface Proxies {
  sets: ProxySet[];
  cards: Record<string, Record<string, { v: string; url: string }[]>>;
}

// ---- Generating proxies from the page (DeckSite/proxygen.py) ----
export interface GenRef { path: string; url: string | null; name?: string }
export interface GenTheme {
  key: string; // "<manifest>:<style>"
  manifest: string;
  style: string;
  deck: string;
  inThisDeck: boolean;
  proxySet: string | null;
  frame: string;
  prompt: string;
  references: GenRef[];
}
export interface GenCost {
  backend: string; model: string; perImage: number | null; unit: string | null; cap: number; ready: boolean; problem: string;
}
export interface GenThemes {
  deck: string;
  manifest: string | null;
  themes: GenTheme[];
  frames: { id: string; name: string; preview: string | null }[];
  references: GenRef[];
  cards: string[];
  cost: GenCost;
  art: Record<string, string>; // art ideas already in the manifest
}
export interface GenRequest {
  deck: string;
  theme: { key: string } | { new: { name: string; frame: string; prompt: string; references: string[] } };
  cards: string[];
  newAttempt: boolean;
  art: Record<string, string>;
}
export interface GenPlan {
  deck: string; manifest: string; style: string; proxySet: string | null;
  newSet: { id: string; name: string } | null;
  run: { name: string; why: string }[];
  later: { name: string; why: string }[];
  skipped: { name: string; why: string }[];
  images: number; credits: number | null; cost: GenCost; writes: string[]; token: string;
}
export interface GenJob {
  state: "idle" | "running" | "done" | "done_with_errors" | "failed";
  deck?: string; style?: string; proxySet?: string; step?: string;
  total?: number; done?: number; failed?: number; current?: string | null;
  log?: string[]; started?: string; finished?: string | null; error?: string | null; logFile?: string;
}
