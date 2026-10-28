<script lang="ts">
  // Proxy art for one card: every DeckGen style, every attempt, pick one, queue a reroll for the next run you start.
  import { pickAttempt, queueReroll, unqueueReroll } from "../lib/api";
  import { editable } from "../lib/connection.svelte";
  import type { DeckArt, StyleArt } from "../lib/types";

  let { deckId, cardName, art, cardArt, onArtChanged }: {
    deckId: string; cardName: string; art: DeckArt; cardArt: Record<string, StyleArt>; onArtChanged: () => Promise<void>;
  } = $props();

  let styleId = $state(art.activeStyle);
  let note = $state("");
  let busy = $state(false);
  let message = $state<{ ok: boolean; text: string } | null>(null);

  const current = $derived(cardArt[styleId]);
  const target = $derived({ deck: deckId, style: styleId, card: cardName });

  async function act(label: string, fn: () => Promise<string>) {
    busy = true;
    message = null;
    try {
      await fn();
      await onArtChanged();
      message = { ok: true, text: label };
    } catch (e) {
      message = { ok: false, text: (e as Error).message };
    } finally {
      busy = false;
    }
  }
</script>

<section class="proxy" aria-labelledby="proxy-heading">
  <div class="head">
    <h3 id="proxy-heading">Proxy art</h3>
    <div class="styles" role="tablist" aria-label="DeckGen style">
      {#each art.styles as s (s.id)}
        <button role="tab" aria-selected={s.id === styleId} class:on={s.id === styleId} onclick={() => { styleId = s.id; message = null; }}>
          {s.id}{#if s.id === art.activeStyle}<span class="active-dot" title="Active style in the manifest"></span>{/if}
          <span class="mono n">{cardArt[s.id]?.attempts.length ?? 0}</span>
        </button>
      {/each}
    </div>
  </div>

  {#if current}
    <div class="body">
      <div class="finished">
        <p class="eyebrow">Printed card</p>
        {#if current.composed}
          <img src={current.composed} alt={`${cardName} proxy in ${styleId}`} class="composed" />
        {:else}
          <p class="dim">Not rendered yet. It's made when you pick an attempt, or after a run.</p>
        {/if}
      </div>

      <div class="attempts">
        <p class="eyebrow">Attempts{#if editable()} <span class="dim">· click one to use it</span>{/if}</p>
        {#if current.attempts.length === 0}
          <p class="dim">No art in this style yet. Use Generate proxies (in the Proxies panel) to make the first attempt.</p>
        {:else}
          <ul role="list">
            {#each current.attempts as a (a.n)}
              {@const inUse = a.n === current.picked}
              <li>
                <button class="attempt" class:in-use={inUse} disabled={!editable() || busy || inUse}
                  onclick={() => act(`Using attempt ${a.n}. The printed card was re-rendered.`, () => pickAttempt(target, a.n))}
                  aria-label={inUse ? `Attempt ${a.n}, in use` : `Use attempt ${a.n}`}>
                  <img src={a.url} alt="" loading="lazy" />
                  <span class="tag mono">#{a.n}{inUse ? " · in use" : ""}{a.imported ? " · imported" : ""}</span>
                </button>
                {#if a.note}<p class="anote">“{a.note}”</p>{/if}
              </li>
            {/each}
          </ul>
        {/if}

        <div class="reroll">
          {#if !editable()}
            {#if current.queued !== null}<p class="queued">Queued for the next run{current.queued ? `: “${current.queued}”` : ""}.</p>{/if}
            <p class="dim">Connect to your PC (bottom left) to pick attempts or queue rerolls.</p>
          {:else if current.queued !== null}
            <p class="queued">Queued for the next run{current.queued ? `: “${current.queued}”` : ""}.</p>
            <button class="btn" disabled={busy} onclick={() => act("Removed from the queue.", () => unqueueReroll(target))}>Cancel reroll</button>
          {:else}
            <label for="reroll-note" class="eyebrow">Reroll</label>
            <div class="row">
              <input id="reroll-note" type="text" bind:value={note} placeholder="Optional note, e.g. more fire, less smoke" />
              <button class="btn primary" disabled={busy}
                onclick={() => act("Queued. The next Generate proxies run for this card makes a new attempt.", () => queueReroll(target, note)).then(() => (note = ""))}>Queue</button>
            </div>
            <p class="dim">Queuing doesn't spend anything. A queued card gets a new attempt when you include it in Generate proxies (its cost is shown first).</p>
          {/if}
        </div>

        {#if message}<p class="msg" class:err={!message.ok} role="status">{message.text}</p>{/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .proxy { border-top: 1px solid var(--line); padding-top: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4); }
  .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-3); }
  h3 { font-size: var(--step-1); }
  .styles { display: flex; gap: var(--space-1); flex-wrap: wrap; }
  .styles button {
    font-family: var(--font-mono); font-size: var(--step--1);
    display: inline-flex; align-items: center; gap: var(--space-2);
    padding: 0.3rem 0.6rem; border-radius: var(--radius-m);
    border: 1px solid var(--line); background: transparent; color: var(--muted); cursor: pointer;
  }
  .styles button.on { color: var(--fg); border-color: var(--accent); background: var(--accent-soft); }
  .styles .n { color: var(--faint); font-size: var(--step--2); }
  .active-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--good); }

  .body { display: grid; grid-template-columns: minmax(0, 13rem) minmax(0, 1fr); gap: var(--space-5); }
  .finished { display: flex; flex-direction: column; gap: var(--space-2); }
  .composed { width: 100%; border-radius: 4.6% / 3.3%; box-shadow: 0 10px 26px -12px rgb(0 0 0 / 0.7); }
  .attempts { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
  .attempts ul { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr)); gap: var(--space-3); }
  .attempt {
    display: flex; flex-direction: column; width: 100%; padding: 0; overflow: hidden;
    border: 2px solid var(--line); border-radius: var(--radius-m); background: var(--surface); color: var(--fg); cursor: pointer;
  }
  .attempt:not(:disabled):hover { border-color: var(--accent); }
  .attempt.in-use { border-color: var(--good); cursor: default; }
  .attempt:disabled:not(.in-use) { opacity: 0.6; cursor: progress; }
  .attempt img { width: 100%; aspect-ratio: 1; object-fit: cover; }
  .tag { font-size: var(--step--2); padding: 0.25rem 0.4rem; text-align: left; color: var(--muted); }
  .in-use .tag { color: var(--good); }
  .anote { font-size: var(--step--2); color: var(--faint); margin-top: 2px; }

  .reroll { display: flex; flex-direction: column; gap: var(--space-2); border-top: 1px dashed var(--line); padding-top: var(--space-3); }
  .row { display: flex; gap: var(--space-2); }
  input[type="text"] {
    flex: 1; min-width: 0; font: inherit; font-size: var(--step--1); color: var(--fg);
    background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-m); padding: 0.4rem 0.6rem;
  }
  .queued { color: var(--accent); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.4rem 0.75rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--surface); color: var(--fg); cursor: pointer; align-self: start; }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); font-weight: 700; }
  .btn:disabled { opacity: 0.6; cursor: progress; }
  .dim { color: var(--faint); font-size: var(--step--1); }
  .msg { font-size: var(--step--1); color: var(--good); }
  .msg.err { color: var(--warn); }

  @media (max-width: 720px) { .body { grid-template-columns: minmax(0, 1fr); } .finished { max-width: 13rem; } }
</style>
