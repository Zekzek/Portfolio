import { describe, expect, it } from "vitest";
import { boxStyles, shownBoxStyle } from "../src/lib/box";
import type { DeckBox } from "../src/lib/types";

const book = { parts: {} } as DeckBox;
const both = { parts: {}, beetle: { parts: {} } } as unknown as DeckBox;

describe("deck box styles", () => {
  it("lists the styles built for the deck", () => {
    expect(boxStyles(null)).toEqual([]);
    expect(boxStyles(book)).toEqual(["book"]);
    expect(boxStyles(both)).toEqual(["book", "beetle"]);
  });
  it("shows the picked style, else the deck's default, else the book", () => {
    expect(shownBoxStyle(both, "beetle", null)).toBe("beetle");
    expect(shownBoxStyle(both, null, "beetle")).toBe("beetle");
    expect(shownBoxStyle(both, "book", "beetle")).toBe("book");
    // The hosted snapshot has no beetle: a beetle default falls back to the book.
    expect(shownBoxStyle(book, "beetle", "beetle")).toBe("book");
    expect(shownBoxStyle(null, null, null)).toBe(null);
  });
});
