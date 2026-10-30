<script lang="ts">
  // A deck's full change history (from the page or deck.py), with undo and "go back to this version".
  import { ApiError, loadHistory, revertDeck } from "../lib/api";
  import { editable } from "../lib/connection.svelte";
  import { href } from "../lib/route";
  import type { Deck, HistoryEntry } from "../lib/types";
  import ThemeToggleButton from "./ThemeToggleButton.svelte";

  let { deck, onDataChanged }: { deck: Deck; onDataChanged: () => Promise<void> } = $props();

  let rows = $state<HistoryEntry[] | null>(null);
  let error = $state("");
  let busy = $state(false);
  let message = $state<{ ok: boolean; text: string } | null>(null);

  $effect(() => {
    void deck.version; // reload whenever the deck changes
    loadHistory(deck.id).then((r) => (rows = r)).catch((e) => (error = (e as Error).message));
  });

  const when = (iso: string) => new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  async function revertTo(version: number, why: string) {
    busy = true;
    message = null;
    try {
      const r = await revertDeck(deck.id, deck.version, version, why);
      await onDataChanged();
      message = { ok: true, text: `Back to how version ${version} looked (now version ${r.version}).` };
    } catch (e) {
      message = { ok: false, text: (e as Error).message };
      if (e instanceof ApiError && e.status === 409) await onDataChanged();
    } finally {
      busy = false;
    }
  }
</script>

<div class="page">
  <div class="crumbs">
    <a href={href({ view: "deck", deck: deck.id })}>← {deck.name}</a>
    <ThemeToggleButton />
  </div>
  <header class="head">
    <div>
      <p class="eyebrow">Change history</p>
      <h1>{deck.name} <span class="dim mono">· version {deck.version}</span></h1>
    </div>
    {#if deck.version > 1 && editable()}
      <button class="btn" disabled={busy} onclick={() => revertTo(deck.version - 1, "undo")}>Undo last</button>
    {/if}
  </header>
  {#if message}<p class="msg" class:err={!message.ok} role="status">{message.text}</p>{/if}

  {#if error}
    <p class="err">{error}</p>
  {:else if !rows}
    <p class="dim">Loading…</p>
  {:else if rows.length === 0}
    <p class="dim">No changes since the list moved into the deck store.</p>
  {:else}
    <ol role="list">
      {#each rows as r (r.version)}
        <li class:current={r.version === deck.version}>
          <div class="row-head">
            <p class="meta mono">v{r.version} · {r.by} · {when(r.at)}{r.version === deck.version ? " · current" : ""}</p>
            {#if editable() && r.version < deck.version}
              <button class="link" disabled={busy} onclick={() => revertTo(r.version, `back to version ${r.version}`)}>Go back to this version</button>
            {/if}
          </div>
          {#if r.why}<p class="why">“{r.why}”</p>{/if}
          <ul class="what" role="list">{#each r.summary.slice(0, r.summary.length > 8 ? 6 : 8) as s, i (i)}<li>{s}</li>{/each}</ul>
          {#if r.summary.length > 8}
            <details class="more">
              <summary class="small">and {r.summary.length - 6} more</summary>
              <ul class="what" role="list">{#each r.summary.slice(6) as s, i (i)}<li>{s}</li>{/each}</ul>
            </details>
          {/if}
        </li>
      {/each}
    </ol>
    <p class="dim small">Going back is itself a change: it adds a new version, so it can be undone too.</p>
  {/if}
</div>

<style>
  .page {
    max-width: 56rem; margin: 0 auto;
    padding: var(--space-5) max(16px, env(safe-area-inset-right, 0px)) var(--space-8) max(16px, env(safe-area-inset-left, 0px));
    display: flex; flex-direction: column; gap: var(--space-4);
  }
  .crumbs { display: flex; justify-content: space-between; align-items: center; }
  .crumbs a { text-decoration: none; }
  .head { display: flex; justify-content: space-between; align-items: end; gap: var(--space-4); flex-wrap: wrap; }
  h1 { font-size: var(--step-3); letter-spacing: -0.02em; }
  .dim { color: var(--faint); }
  .small { font-size: var(--step--1); }
  .mono { font-family: var(--font-mono); }
  ol { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3); }
  ol > li { border-left: 2px solid var(--line); padding: var(--space-1) 0 var(--space-1) var(--space-3); }
  ol > li.current { border-left-color: var(--accent); }
  .row-head { display: flex; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; align-items: baseline; }
  .meta { font-size: var(--step--1); color: var(--faint); }
  .why { color: var(--muted); font-style: italic; }
  .what { list-style: none; padding: 0; margin: var(--space-1) 0 0; font-size: var(--step--1); }
  .more summary { color: var(--accent); cursor: pointer; margin-top: var(--space-1); }
  .msg { color: var(--good); }
  .msg.err, .err { color: var(--warn); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.45rem 0.8rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--surface); color: var(--fg); cursor: pointer; }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .link { font: inherit; font-size: var(--step--1); border: 0; background: none; padding: 0; color: var(--accent); cursor: pointer; text-decoration: underline; text-underline-offset: 0.2em; }
  .link:disabled { opacity: 0.5; cursor: default; }
</style>
