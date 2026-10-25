<script lang="ts">
  import { isLand } from "../lib/deck";
  import { library, shuffle } from "../lib/hand";
  import type { Cards, Deck } from "../lib/types";
  import CardTile from "./CardTile.svelte";

  let { deck, cards, imageFor, cardHref, onClose }: {
    deck: Deck; cards: Cards; imageFor: (name: string) => string | null; cardHref: (name: string) => string; onClose: () => void;
  } = $props();

  let order = $state<string[]>([]);
  let shown = $state(7);
  let hands = $state(0);

  function deal() {
    order = shuffle(library(deck));
    shown = 7;
    hands += 1;
  }
  deal();

  const hand = $derived(order.slice(0, shown));
  const lands = $derived(hand.filter((n) => isLand(cards[n])).length);
</script>

<section class="hand" aria-label="Sample hand">
  <div class="head">
    <h2>Sample hand</h2>
    <p class="meta mono">
      {hand.length} cards · {lands} {lands === 1 ? "land" : "lands"} · {order.length - shown} left in library{hands > 1 ? ` · hand #${hands}` : ""}
    </p>
    <div class="actions">
      <button class="btn" onclick={() => (shown = Math.min(order.length, shown + 1))} disabled={shown >= order.length}>Draw a card</button>
      <button class="btn" onclick={deal}>New hand</button>
      <button class="btn quiet" onclick={onClose}>Close</button>
    </div>
  </div>
  <ol class="cards" role="list">
    {#each hand as name, i (i)}
      <li><CardTile entry={{ name, count: 1 }} card={cards[name]} image={imageFor(name)} href={cardHref(name)} /></li>
    {/each}
  </ol>
</section>

<style>
  .hand {
    border: 1px solid var(--line); border-radius: var(--radius-m); background: var(--surface);
    padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-4);
  }
  .head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); }
  h2 { font-size: var(--step-1); }
  .meta { color: var(--muted); font-size: var(--step--1); flex: 1; }
  .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.4rem 0.75rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; }
  .btn:hover:not(:disabled) { border-color: var(--accent); }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .btn.quiet { color: var(--muted); }
  .cards { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 8.5rem), 1fr)); gap: var(--space-3); }
</style>
