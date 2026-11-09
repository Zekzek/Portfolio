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
  viewers?: "hidden" | null; // "hidden": not uploaded for view-only sign-ins; empty = shown
  updated: string;
  unknown: string[];
  proxyOnly: string[]; // in the DeckGen manifest but not in this list (tokens and back faces excluded)
  backs?: Record<string, string>; // card -> its back face drawn in the DeckGen manifest (`back_of:`)
  tokens?: DeckEntry[]; // tokens drawn in the DeckGen manifest, with how many to print
  box?: DeckBox | null; // 3D-printable deck box (MTG/DeckBox, deckbox.py build)
  drift: { onlyInDoc: string[]; onlyInList: string[] } | null; // .md Deck List vs .txt; null = nothing to compare
  scores?: Record<string, number>; // card -> Total from the doc's "Card Scores" tables
}

export interface Face {
  name: string;
  image: string | null;
  art_crop: string | null;
}

/** A card's other face as a tile shows it: a double-faced card's back, or one drawn in a proxy set. */
export interface BackFace { name: string; image: string | null; proxy?: boolean; original?: boolean }

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
  toned?: string | null; // the picked art as it prints (the style's art_tone), without the frame
}

export interface DeckArt {
  manifest: string;
  deckgenName: string;
  activeStyle: string;
  styles: { id: string; frame: string; prompt: string; printPdf: string | null; printStale?: boolean }[];
  counts?: Record<string, number>; // copies on the print sheets, per art ("Name", "Name #2" ...)
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
  | { op: "set_deck"; field: "status" | "note" | "name" | "proxySet" | "viewers"; value: string };

export interface ProxySet {
  id: string;
  name: string;
  description: string;
  versions: string[]; // newest first
}

/** One image of a card in a proxy set. variant: 1 = Forest.png, 2 = Forest_2.png ... (missing = 1). */
export interface ProxyImage { v: string; url: string; variant?: number }

/** MTG/Proxies: per set, per card key (see proxyKey), its images: variant 1 first, each variant's
 *  versions newest first (the first of each variant wins). */
export interface Proxies {
  sets: ProxySet[];
  cards: Record<string, Record<string, ProxyImage[]>>;
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

/** A deck's 3D-printable box: STL parts plus the sizes they were built for. */
/** A book-shaped box: its parts are named by print (base, base_pages, ..., cover, cover_*, spine, spine_label, cardtray, gem). */
export interface DeckBox {
  parts: Record<string, string>; // part -> STL url, named by print: base*, cover*, spine*, cardtray, gem
  cards: number; // sleeved cards this deck needs room for
  capacity?: number | null; // what the box holds (the same for every deck)
  counted: { deck: number; commander?: number; back?: number; tokens: number; extra: number };
  backCard?: string | null; // the card in the back cover's hard sleeve
  colors?: Record<string, string> | null; // part -> the filament color planned for it ("base_pages": the tray above its back cover)
  outside: [number, number, number]; // mm: width x height x thickness, closed
  label?: string | null;
  magnet: [number, number]; // diameter x height, mm
  lid?: string; // "book"
  geometry?: BoxGeometry | null;
}

/** deckbox.scad's numbers (mm, its axes: X across the cover, Y up the book, Z through it). */
export interface BoxGeometry {
  width: number; height: number; thick: number; capacity: number;
  x0: number; y0: number; // the covers' corner on the spine side
  axis_x: number; axis_back: number; axis_front: number; // hinge axes run along Y at (axis_x, z)
  spine_s: number; // the spine's outside face is at x = -spine_s
  window_x: number; window_y: number; card_z: number; // where the commander shows through the cover
  back_display?: number; back_z?: number; // a second hard sleeve in the back cover, at the same x, y
  well_x: number; well_y1: number; well_y2: number; well_w: number; well_h: number; floor_z: number;
  card_t: number; magnets: number;
  // lift-out card trays (one per well): where they sit, at the base's floor
  panel_t?: number; pages_z?: number; inlay_d?: number; gems?: number; gem_x0?: number; gem_x1?: number; gem_y0?: number; gem_y1?: number;
  cardtrays?: number; cardtray_x?: number; cardtray_y1?: number; cardtray_y2?: number; cardtray_z?: number; cardtray_h?: number;
}
