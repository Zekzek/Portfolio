import type { Deck, DeckStatus } from "./types";

export const STATUS_LABEL: Record<DeckStatus, string> = {
  complete: "Complete",
  in_progress: "In progress",
  pool: "Candidate pool",
  no_list: "No list yet",
};

/** "98 + 2 commanders", "99 + commander", "52 candidates", "—". */
export function countLabel(d: Deck): string {
  if (d.status === "no_list") return "—";
  if (d.status === "pool") return `${d.count} candidates`;
  const c = d.commanders.reduce((n, e) => n + e.count, 0);
  return c === 0 ? `${d.count} cards` : `${d.count} + ${c === 1 ? "commander" : `${c} commanders`}`;
}
