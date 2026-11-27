import type { BoxStyle, DeckBox } from "./types";

/** The spine's name as one line (box.json may give it as a list of lines). */
export function boxLabel(box: DeckBox | null | undefined): string | null {
  const l = box?.label;
  if (Array.isArray(l)) return l.join(" ").trim() || null;
  return l || null;
}

export const BOX_STYLE_NAMES: Record<BoxStyle, string> = { book: "Book", beetle: "Beetle (experiment)" };

/** The box styles built for a deck, the book first. */
export function boxStyles(box: DeckBox | null | undefined): BoxStyle[] {
  if (!box) return [];
  return box.beetle ? ["book", "beetle"] : ["book"];
}

/** The style to show: the one picked (if it was built), else the deck's default, else the first. */
export function shownBoxStyle(box: DeckBox | null | undefined, picked: string | null, deckDefault: string | null | undefined): BoxStyle | null {
  const styles = boxStyles(box);
  for (const s of [picked, deckDefault]) if (s && (styles as string[]).includes(s)) return s as BoxStyle;
  return styles[0] ?? null;
}
