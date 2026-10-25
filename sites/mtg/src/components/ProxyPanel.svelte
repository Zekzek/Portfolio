<script lang="ts">
  // Proxy status for a deck (DeckGen), or a way to start one.
  import { startManifest } from "../lib/api";
  import { href } from "../lib/route";
  import type { Deck, DeckArt } from "../lib/types";

  let { deck, art, onDataChanged }: { deck: Deck; art?: DeckArt; onDataChanged: () => Promise<void> } = $props();

  let busy = $state(false);
  let message = $state<{ ok: boolean; text: string } | null>(null);

  const names = $derived(art ? Object.keys(art.cards) : []);
  const active = $derived(art?.activeStyle ?? "");
  const withArt = $derived(names.filter((n) => art!.cards[n][active]?.attempts.length).length);
  const printed = $derived(names.filter((n) => art!.cards[n][active]?.composed).length);
  const queued = $derived(
    art ? names.flatMap((n) => Object.entries(art.cards[n]).filter(([, s]) => s.queued !== null).map(([style]) => ({ name: n, style }))) : [],
  );
  const missing = $derived(names.filter((n) => !art!.cards[n][active]?.attempts.length));

  async function start() {
    busy = true;
    message = null;
    try {
      const text = await startManifest(deck.id);
      await onDataChanged();
      message = { ok: true, text };
    } catch (e) {
      message = { ok: false, text: (e as Error).message };
    } finally {
      busy = false;
    }
  }
</script>

<section class="panel" aria-labelledby="proxy-panel-h">
  <h2 id="proxy-panel-h" class="eyebrow">Proxies</h2>
  {#if art}
    <p class="file mono">{art.manifest} · style {active}</p>
    <dl>
      <div><dt>Cards with art</dt><dd class="mono">{withArt} / {names.length}</dd></div>
      <div><dt>Printed cards</dt><dd class="mono">{printed} / {names.length}</dd></div>
      <div><dt>Queued for tonight</dt><dd class="mono">{queued.length}{art.nightlyCap ? ` (cap ${art.nightlyCap})` : ""}</dd></div>
    </dl>
    {#if queued.length}
      <ul class="small" role="list">
        {#each queued as q (q.name + q.style)}<li><a href={href({ view: "deck", deck: deck.id, card: q.name })}>{q.name}</a> <span class="mono dim">{q.style}</span></li>{/each}
      </ul>
    {/if}
    {#if missing.length && missing.length <= 12}
      <p class="small dim">No art yet: {missing.join(", ")}</p>
    {/if}
    {@const pdfs = art.styles.filter((s) => s.printPdf)}
    {#if pdfs.length}
      <p class="small">Print sheets:
        {#each pdfs as s, i (s.id)}{i ? " · " : ""}<a href={s.printPdf} target="_blank" rel="noopener">{s.id} (PDF)</a>{/each}
      </p>
    {/if}
  {:else if deck.list}
    <p class="small">No DeckGen file for this deck yet. Starting one lists its cards (without basic lands) with a starter style to edit. Nothing is generated or spent until you run DeckGen with it.</p>
    <button class="btn" disabled={busy} onclick={start}>{busy ? "Creating…" : "Start proxies for this deck"}</button>
  {/if}
  {#if message}
    <p class="small msg" class:err={!message.ok} role="status">
      {message.text}{#if message.ok}. Edit its style prompt, then run <code>python deckgen.py decks/{deck.id}.yaml run</code> in DeckGen.{/if}
    </p>
  {/if}
</section>

<style>
  .panel { display: flex; flex-direction: column; gap: var(--space-2); }
  h2 { font-family: var(--font-mono); font-weight: 500; }
  .file { font-size: var(--step--2); color: var(--faint); }
  dl { margin: 0; display: flex; flex-direction: column; gap: 2px; font-size: var(--step--1); }
  dl div { display: flex; justify-content: space-between; border-bottom: 1px dotted var(--line); padding: 2px 0; }
  dd { margin: 0; color: var(--muted); }
  .small { font-size: var(--step--1); color: var(--muted); }
  .small ul, ul.small { list-style: none; padding: 0; margin: 0; }
  .dim { color: var(--faint); }
  code { font-family: var(--font-mono); font-size: var(--step--2); background: var(--surface-2); padding: 0.05rem 0.3rem; border-radius: var(--radius-s); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.45rem 0.75rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--surface); color: var(--fg); cursor: pointer; align-self: start; }
  .btn:hover:not(:disabled) { border-color: var(--accent); }
  .btn:disabled { opacity: 0.6; cursor: progress; }
  .msg { color: var(--good); }
  .msg.err { color: var(--warn); }
</style>
