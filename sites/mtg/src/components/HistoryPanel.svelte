<script lang="ts">
  // A deck's recent changes (from the page or from deck.py), with undo.
  import { loadHistory } from "../lib/api";
  import { editable } from "../lib/connection.svelte";
  import type { HistoryEntry } from "../lib/types";

  let { deckId, version, busy, onUndo }: {
    deckId: string; version: number; busy: boolean; onUndo: (toVersion: number) => void;
  } = $props();

  let rows = $state<HistoryEntry[]>([]);
  let expanded = $state(false);

  $effect(() => {
    void version; // reload whenever the deck changes
    loadHistory(deckId).then((r) => (rows = r)).catch(() => (rows = []));
  });

  const when = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " +
      d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  const shown = $derived(expanded ? rows : rows.slice(0, 4));
</script>

<section class="history" aria-labelledby="history-h">
  <div class="head">
    <h2 id="history-h" class="eyebrow">Changes <span class="dim">· version {version}</span></h2>
    {#if version > 1 && editable()}
      <button class="link" disabled={busy} onclick={() => onUndo(version - 1)}>Undo last</button>
    {/if}
  </div>
  {#if rows.length === 0}
    <p class="dim small">No changes since the list moved into the deck store.</p>
  {:else}
    <ol role="list">
      {#each shown as r (r.version)}
        <li>
          <p class="meta mono">v{r.version} · {r.by} · {when(r.at)}</p>
          {#each r.summary as s, i (i)}<p class="what">{s}</p>{/each}
          {#if r.why}<p class="why">“{r.why}”</p>{/if}
        </li>
      {/each}
    </ol>
    {#if rows.length > 4}
      <button class="link" onclick={() => (expanded = !expanded)}>{expanded ? "Show fewer" : `Show all ${rows.length}`}</button>
    {/if}
  {/if}
</section>

<style>
  .history { display: flex; flex-direction: column; gap: var(--space-2); }
  .head { display: flex; justify-content: space-between; align-items: baseline; }
  h2 { font-family: var(--font-mono); font-weight: 500; }
  .dim { color: var(--faint); text-transform: none; letter-spacing: 0; }
  ol { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
  li { border-left: 2px solid var(--line); padding-left: var(--space-2); }
  .meta { font-size: var(--step--2); color: var(--faint); }
  .what { font-size: var(--step--1); }
  .why { font-size: var(--step--1); color: var(--muted); font-style: italic; }
  .small { font-size: var(--step--1); }
  .link { font: inherit; font-size: var(--step--1); border: 0; background: none; padding: 0; color: var(--accent); cursor: pointer; text-decoration: underline; text-underline-offset: 0.2em; align-self: start; }
  .link:disabled { opacity: 0.5; cursor: default; }
</style>
