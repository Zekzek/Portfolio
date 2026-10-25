<script lang="ts">
  import { loadArt, loadCards, loadDecks } from "../lib/api";
  import { parseRoute, type Route } from "../lib/route";
  import type { Art, Cards, Deck } from "../lib/types";
  import CompareView from "./CompareView.svelte";
  import DeckList from "./DeckList.svelte";
  import DeckView from "./DeckView.svelte";

  let decks = $state<Deck[] | null>(null);
  let cards = $state<Cards>({});
  let art = $state<Art>({});
  let error = $state<string | null>(null);
  let route = $state<Route>(parseRoute(location.hash));

  async function load() {
    try {
      [decks, cards, art] = await Promise.all([loadDecks(), loadCards(), loadArt()]);
      error = null;
    } catch (e) {
      error = (e as Error).message;
    }
  }

  /** After a pick or reroll: only the art changes. */
  async function reloadArt() {
    art = await loadArt();
  }

  $effect(() => {
    const onHash = () => (route = parseRoute(location.hash));
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  });

  load();

  // A new page starts at the top; opening or closing a card keeps your place.
  const pageKey = $derived(
    route.view === "deck" ? `deck:${route.deck}` : route.view === "compare" ? `compare:${route.decks.join(",")}` : "decks",
  );
  let lastPage = "";
  $effect(() => {
    if (pageKey !== lastPage) {
      if (lastPage) scrollTo({ top: 0 });
      lastPage = pageKey;
    }
  });

  const deck = $derived(route.view === "deck" ? decks?.find((d) => d.id === route.deck) : undefined);
</script>

{#if error}
  <div class="state">
    <h1>Can't load the decks</h1>
    <p>{error}</p>
    <p class="hint">The page needs the local server. In your MTG folder run <code>python DeckSite/server.py</code>, then reload.</p>
    <button class="btn" onclick={load}>Try again</button>
  </div>
{:else if !decks}
  <div class="state"><p class="eyebrow">Loading decks…</p></div>
{:else if route.view === "deck" && deck}
  {#key deck.id}
    <DeckView {deck} {decks} {cards} art={art[deck.id]} openCard={route.view === "deck" ? route.card : undefined} onArtChanged={reloadArt} />
  {/key}
{:else if route.view === "compare"}
  <CompareView ids={route.decks} {decks} {cards} {art} openCard={route.card} onArtChanged={reloadArt} />
{:else}
  <DeckList {decks} {cards} />
{/if}

<style>
  .state {
    max-width: 40rem;
    margin: 0 auto;
    padding: var(--space-8) max(16px, env(safe-area-inset-left, 0px));
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .hint { color: var(--muted); }
  code { font-family: var(--font-mono); font-size: 0.92em; background: var(--surface-2); padding: 0.1em 0.35em; border-radius: var(--radius-s); }
</style>
