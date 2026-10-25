// Sample hands: shuffle the library (commanders stay in the command zone) and deal.
import { mainEntries } from "./deck";
import type { Deck } from "./types";

/** One name per copy: 13x Forest becomes 13 entries. */
export function library(deck: Deck): string[] {
  return mainEntries(deck).flatMap((e) => Array(e.count).fill(e.name));
}

/** Fisher-Yates shuffle; `random` is injectable for tests. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
