<script lang="ts">
  import { href } from "../lib/route";
  import { searchDecks } from "../lib/search";
  import type { Art, Cards, Deck } from "../lib/types";
  import CardDialog from "./CardDialog.svelte";
  import CardTile from "./CardTile.svelte";
  import ThemeToggleButton from "./ThemeToggleButton.svelte";

  let { q, decks, cards, art, openCard, onArtChanged }: {
    q: string; decks: Deck[]; cards: Cards; art: Art; openCard?: string; onArtChanged: () => Promise<void>;
  } = $props();

  let text = $state(q);
  let timer: ReturnType<typeof setTimeout>;
  // Typing updates the address (debounced), so searches can be bookmarked and Back works.
  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(() => history.replaceState(null, "", href({ view: "search", q: text.trim() })), 250);
  }

  const hits = $derived(searchDecks(text, decks, cards));
  const deckName = (id: string) => decks.find((d) => d.id === id)?.name ?? id;
  const cardHref = (name: string) => href({ view: "search", q: text.trim(), card: name });
  const owner = $derived(openCard ? decks.find((d) => hits.find((h) => h.name === openCard)?.decks.includes(d.id)) : undefined);
  const examples = ["t:insect", "o:landfall", "t:creature o:sacrifice", "t:land -t:basic", '"return target land"'];
</script>

<div class="wrap">
  <header class="top">
    <div class="crumbs">
      <a href={href({ view: "decks" })}>← All decks</a>
      <ThemeToggleButton />
    </div>
    <h1>Search your decks</h1>
    <form class="search" role="search" onsubmit={(e) => e.preventDefault()}>
      <label class="visually-hidden" for="search-input">Search cards in your decks</label>
      <!-- svelte-ignore a11y_autofocus -->
      <input id="search-input" type="search" bind:value={text} oninput={onInput} autofocus autocomplete="off" spellcheck="false"
        placeholder="Card name, type or rules text…" />
    </form>
    <p class="help">
      Try {#each examples as ex, i (ex)}{i ? ", " : ""}<button class="ex mono" onclick={() => { text = ex; onInput(); }}>{ex}</button>{/each}.
      <span class="dim">t: type · o: rules text · n: name · - excludes</span>
    </p>
  </header>

  {#if text.trim()}
    <p class="count"><span class="mono">{hits.length}</span> {hits.length === 1 ? "card" : "cards"} across your decks</p>
    <ul class="grid" role="list">
      {#each hits as h (h.name)}
        <li>
          <CardTile entry={{ name: h.name, count: 1 }} card={cards[h.name]} image={cards[h.name]?.image ?? null} href={cardHref(h.name)} />
          <p class="in">{h.decks.length === 1 ? deckName(h.decks[0]) : `${h.decks.length} decks`}</p>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if openCard && owner}
  <CardDialog name={openCard} card={cards[openCard]} deck={owner} {decks} art={art[owner.id]}
    closeHref={href({ view: "search", q: text.trim() })} {onArtChanged} />
{/if}

<style>
  .wrap {
    max-width: 86rem; margin: 0 auto;
    padding: var(--space-5) max(16px, env(safe-area-inset-right, 0px)) var(--space-8) max(16px, env(safe-area-inset-left, 0px));
    display: flex; flex-direction: column; gap: var(--space-5);
  }
  .top { display: flex; flex-direction: column; gap: var(--space-4); }
  .crumbs { display: flex; justify-content: space-between; align-items: center; }
  .crumbs a { color: var(--fg); text-decoration: none; font-size: var(--step--1); }
  h1 { font-size: var(--step-4); letter-spacing: -0.025em; font-weight: 720; }
  .search input {
    width: 100%; max-width: 40rem; font: inherit; font-size: var(--step-1); color: var(--fg);
    background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-m); padding: 0.6rem 0.85rem;
  }
  .search input:focus { outline: 2px solid var(--focus); outline-offset: 1px; }
  .help { color: var(--muted); font-size: var(--step--1); }
  .ex { font-size: var(--step--1); border: 0; background: none; color: var(--accent); padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 0.2em; }
  .dim { color: var(--faint); display: block; margin-top: var(--space-1); font-size: var(--step--2); }
  .count { color: var(--muted); }
  .grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 13.5rem), 1fr)); gap: var(--space-4) var(--space-3); }
  .in { font-size: var(--step--2); color: var(--faint); margin-top: 0.3rem; text-align: center; }
</style>
