<script lang="ts">
  // Count, move and remove for one card while editing a deck list.
  import type { DeckEntry, EditOp } from "../lib/types";

  let { entry, category, categories, busy, onEdit }: {
    entry: DeckEntry; category: string; categories: string[]; busy: boolean; onEdit: (ops: EditOp[]) => void;
  } = $props();
</script>

<div class="controls" aria-label={`Edit ${entry.name}`}>
  <div class="row">
    <button class="icon" disabled={busy || entry.count <= 1} aria-label={`One fewer ${entry.name}`}
      onclick={() => onEdit([{ op: "set_count", card: entry.name, count: entry.count - 1 }])}>−</button>
    <span class="n mono" aria-label="Copies">{entry.count}</span>
    <button class="icon" disabled={busy} aria-label={`One more ${entry.name}`}
      onclick={() => onEdit([{ op: "set_count", card: entry.name, count: entry.count + 1 }])}>+</button>
    <button class="icon remove" disabled={busy} aria-label={`Remove ${entry.name}`} title="Remove from the deck"
      onclick={() => onEdit([{ op: "remove", card: entry.name }])}>×</button>
  </div>
  <label class="visually-hidden" for={`move-${entry.name}`}>Move {entry.name} to</label>
  <select id={`move-${entry.name}`} disabled={busy} value={category}
    onchange={(e) => { const v = e.currentTarget.value; if (v !== category) onEdit([{ op: "move", card: entry.name, category: v }]); }}>
    {#each categories as c (c)}<option value={c}>{c}</option>{/each}
  </select>
</div>

<style>
  .controls { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
  .row { display: flex; align-items: center; gap: 4px; }
  .icon {
    width: 1.7rem; height: 1.7rem; display: grid; place-items: center; padding: 0;
    font-size: 1rem; line-height: 1; border: 1px solid var(--line); border-radius: var(--radius-s);
    background: var(--surface); color: var(--fg); cursor: pointer;
  }
  .icon:hover:not(:disabled) { border-color: var(--accent); }
  .icon:disabled { opacity: 0.4; cursor: default; }
  .remove { margin-left: auto; color: var(--warn); }
  .n { min-width: 1.5rem; text-align: center; font-size: var(--step--1); }
  select {
    width: 100%; font: inherit; font-size: var(--step--2); color: var(--fg);
    background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-s); padding: 0.2rem;
  }
</style>
