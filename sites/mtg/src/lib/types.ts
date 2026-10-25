// Shapes of the JSON files built by MTG/DeckSite/build_data.py.

export interface DeckEntry {
  name: string;
  count: number;
  set?: string;
}

export interface Category {
  name: string;
  cards: DeckEntry[];
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
