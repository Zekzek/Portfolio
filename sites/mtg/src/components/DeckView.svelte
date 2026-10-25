<script lang="ts">
  import { groupDeck, manaCurve, pipCounts, typeCounts, type GroupBy, type SortBy } from "../lib/deck";
  import { STATUS_LABEL, countLabel } from "../lib/labels";
  import { href } from "../lib/route";
  import type { Cards, Deck, DeckArt } from "../lib/types";
  import CardDialog from "./CardDialog.svelte";
  import CardTile from "./CardTile.svelte";
  import Mana from "./Mana.svelte";
  import ProxyPanel from "./ProxyPanel.svelte";
  import SampleHand from "./SampleHand.svelte";
  import Stats from "./Stats.svelte";
  import ThemeToggleButton from "./ThemeToggleButton.svelte";

  let { deck, decks, cards, art, openCard, onArtChanged, onDataChanged }: {
    deck: Deck; decks: Deck[]; cards: Cards; art?: DeckArt; openCard?: string;
    onArtChanged: () => Promise<void>; onDataChanged: () => Promise<void>;
  } = $props();

  // View settings are remembered per browser.
  const saved = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
  const remember = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
  let groupBy = $state(saved("deck.groupBy", "category") as GroupBy);
  let sortBy = $state(saved("deck.sortBy", "cmc") as SortBy);
  let imageMode = $state(saved("deck.images", "scryfall") as "scryfall" | "proxy");
  $effect(() => { remember("deck.groupBy", groupBy); remember("deck.sortBy", sortBy); remember("deck.images", imageMode); });

  const groups = $derived(groupDeck(deck, cards, groupBy, sortBy));
  const curve = $derived(manaCurve(deck, cards));
  const types = $derived(typeCounts(deck, cards));
  const pips = $derived(pipCounts(deck, cards));
  const parent = $derived(decks.find((d) => d.id === deck.parent));
  const forks = $derived(decks.filter((d) => d.parent === deck.id));
  const banner = $derived(cards[deck.commanderNames[0]]?.art_crop ?? null);
  const proxyCount = $derived(art ? Object.values(art.cards).filter((c) => c[art.activeStyle]?.composed).length : 0);

  function imageFor(name: string): string | null {
    const composed = art?.cards[name]?.[art.activeStyle]?.composed;
    if (imageMode === "proxy" && composed) return composed;
    return cards[name]?.image ?? null;
  }
  const isProxy = (name: string) => imageMode === "proxy" && !!art?.cards[name]?.[art.activeStyle]?.composed;
  const cardHref = (name: string) => href({ view: "deck", deck: deck.id, card: name });
  const cost = (colors: string | null) => (colors ?? "").split("").map((c) => `{${c}}`).join("");

  const driftCount = $derived(deck.drift ? deck.drift.onlyInDoc.length + deck.drift.onlyInList.length : 0);
  let showHand = $state(false);
  let copied = $state(false);
  async function copyList() {
    if (!deck.list) return;
    const lines = [...deck.commanders.map((c) => `${c.count}x ${c.name} *CMDR*`),
      ...deck.categories.flatMap((g) => [`# ${g.name.replace(/\s+/g, "")}`, ...g.cards.map((e) => `${e.count}x ${e.name}`)])];
    try { await navigator.clipboard.writeText(lines.join("\n")); copied = true; setTimeout(() => (copied = false), 1800); } catch {}
  }
</script>

<div class="deck">
  <header class="hero" style:--banner={banner ? `url("${banner}")` : "none"}>
    <div class="hero-inner">
      <div class="crumbs">
        <a href={href({ view: "decks" })}>← All decks</a>
        <ThemeToggleButton />
      </div>
      <div class="hero-text">
        <p class="eyebrow">{deck.commanderNames.join(" + ")}</p>
        <h1>{deck.name}</h1>
        <div class="facts">
          {#if deck.colors}<Mana cost={cost(deck.colors)} size="1.15rem" />{/if}
          <span class="status status-{deck.status}">{STATUS_LABEL[deck.status]}</span>
          <span class="mono">{countLabel(deck)}</span>
          {#if parent}
            <a href={href({ view: "deck", deck: parent.id })}>Fork of {parent.name}</a>
            {#if parent.status !== "no_list"}<a href={href({ view: "compare", decks: [deck.id, parent.id] })}>Compare with {parent.name}</a>{/if}
          {/if}
          {#if forks.length}<span class="forks">Forks: {#each forks as f, i (f.id)}{i ? ", " : ""}<a href={href({ view: "deck", deck: f.id })}>{f.name}</a>{/each}</span>{/if}
        </div>
        {#if deck.note}<p class="note">{deck.note}</p>{/if}
        {#if deck.doc}<p class="doc mono">Notes: {deck.doc}</p>{/if}
      </div>
    </div>
  </header>

  {#if driftCount}
    <details class="drift">
      <summary>
        <strong>The list and the notes disagree on {driftCount} {driftCount === 1 ? "card" : "cards"}.</strong>
        This page shows <span class="mono">{deck.list}</span>.
      </summary>
      <div class="drift-body">
        <div>
          <h3 class="eyebrow">Only in the notes ({deck.drift!.onlyInDoc.length})</h3>
          <p>{deck.drift!.onlyInDoc.join(", ") || "None"}</p>
        </div>
        <div>
          <h3 class="eyebrow">Only in the list ({deck.drift!.onlyInList.length})</h3>
          <p>{deck.drift!.onlyInList.join(", ") || "None"}</p>
        </div>
        <p class="drift-hint">If the notes are right, rebuild the list from them (this replaces the .txt):
          <code>python DeckSite/tools/md_to_txt.py {deck.doc} {deck.list}</code></p>
      </div>
    </details>
  {/if}

  {#if deck.status === "no_list"}
    <section class="empty">
      <h2>No list yet</h2>
      <p>This deck only exists as notes in <span class="mono">{deck.doc}</span>. Write a <span class="mono">.txt</span> list next to it and add it to <span class="mono">DeckSite/decks.yaml</span> to see it here.</p>
    </section>
  {:else}
    <div class="layout">
      <aside class="side">
        <div class="controls" role="group" aria-label="View options">
          <label>
            <span class="eyebrow">Group by</span>
            <select bind:value={groupBy} id="group-by">
              <option value="category">My categories</option>
              <option value="type">Card type</option>
              <option value="cmc">Mana value</option>
              <option value="color">Color</option>
            </select>
          </label>
          <label>
            <span class="eyebrow">Sort</span>
            <select bind:value={sortBy} id="sort-by">
              <option value="cmc">Mana value</option>
              <option value="name">Name</option>
            </select>
          </label>
          {#if art}
            <fieldset class="seg">
              <legend class="eyebrow">Card images</legend>
              <label><input type="radio" bind:group={imageMode} value="scryfall" /> Original</label>
              <label><input type="radio" bind:group={imageMode} value="proxy" /> Proxies <span class="mono dim">{proxyCount}</span></label>
            </fieldset>
          {/if}
          <label>
            <span class="eyebrow">Compare with</span>
            <select id="compare-with" onchange={(e) => { const v = e.currentTarget.value; if (v) location.hash = href({ view: "compare", decks: [deck.id, v] }); }}>
              <option value="">Choose a deck…</option>
              {#each decks.filter((d) => d.id !== deck.id && d.status !== "no_list") as d (d.id)}<option value={d.id}>{d.name}</option>{/each}
            </select>
          </label>
          {#if deck.status !== "pool"}<button class="btn" onclick={() => (showHand = !showHand)} aria-pressed={showHand}>{showHand ? "Hide sample hand" : "Sample hand"}</button>{/if}
          {#if deck.list}<button class="btn" onclick={copyList}>{copied ? "Copied" : "Copy for TappedOut"}</button>{/if}
        </div>
        <Stats {curve} {types} {pips} />
        <ProxyPanel {deck} {art} {onDataChanged} />
      </aside>

      <main class="grid-area">
        {#if showHand}
          <SampleHand {deck} {cards} {imageFor} {cardHref} onClose={() => (showHand = false)} />
        {/if}
        {#if deck.commanders.length}
          <section class="group">
            <h2 class="group-head"><span>Commander</span></h2>
            <ul class="grid" role="list">
              {#each deck.commanders as e (e.name)}
                <li><CardTile entry={e} card={cards[e.name]} image={imageFor(e.name)} proxy={isProxy(e.name)} href={cardHref(e.name)} /></li>
              {/each}
            </ul>
          </section>
        {/if}
        {#each groups as g (g.key)}
          <section class="group">
            <h2 class="group-head"><span>{g.label}</span> <span class="mono dim">{g.count}</span></h2>
            <ul class="grid" role="list">
              {#each g.entries as e (e.name)}
                <li><CardTile entry={e} card={cards[e.name]} image={imageFor(e.name)} proxy={isProxy(e.name)} href={cardHref(e.name)} /></li>
              {/each}
            </ul>
          </section>
        {/each}
        {#if deck.proxyOnly.length}
          <section class="group extra">
            <h2 class="group-head"><span>Proxy art, not in this list</span> <span class="mono dim">{deck.proxyOnly.length}</span></h2>
            <p class="dim-text">These cards are in the DeckGen manifest <span class="mono">{deck.deckgen}</span> but not in <span class="mono">{deck.list}</span>.</p>
            <ul class="grid" role="list">
              {#each deck.proxyOnly as name (name)}
                <li><CardTile entry={{ name, count: 1 }} card={cards[name]} image={imageFor(name)} proxy={isProxy(name)} href={cardHref(name)} /></li>
              {/each}
            </ul>
          </section>
        {/if}
      </main>
    </div>
  {/if}
</div>

{#if openCard}
  <CardDialog name={openCard} card={cards[openCard]} {deck} {decks} {art} closeHref={href({ view: "deck", deck: deck.id })} {onArtChanged} />
{/if}

<style>
  .hero {
    position: relative;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--bg) 35%, transparent) 0%, var(--bg) 92%),
      var(--banner) center 25% / cover no-repeat,
      var(--surface);
  }
  .hero-inner {
    max-width: 86rem; margin: 0 auto;
    padding: var(--space-5) max(16px, env(safe-area-inset-right, 0px)) var(--space-6) max(16px, env(safe-area-inset-left, 0px));
    min-height: 17rem;
    display: flex; flex-direction: column; justify-content: space-between; gap: var(--space-6);
  }
  .crumbs { display: flex; justify-content: space-between; align-items: center; }
  .crumbs a { color: var(--fg); text-decoration: none; font-size: var(--step--1); background: color-mix(in srgb, var(--bg) 70%, transparent); padding: 0.3rem 0.6rem; border-radius: var(--radius-m); }
  .hero-text { display: flex; flex-direction: column; gap: var(--space-2); }
  h1 { font-size: var(--step-4); letter-spacing: -0.025em; font-weight: 720; text-shadow: 0 2px 18px color-mix(in srgb, var(--bg) 80%, transparent); }
  .facts { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); font-size: var(--step--1); }
  .facts .mono { color: var(--muted); }
  .note { color: var(--muted); max-width: 70ch; }
  .doc { color: var(--faint); font-size: var(--step--2); }

  .status { font-family: var(--font-mono); font-size: var(--step--2); padding: 0.1rem 0.45rem; border-radius: var(--radius-s); border: 1px solid var(--line); color: var(--muted); background: color-mix(in srgb, var(--bg) 60%, transparent); }
  .status-complete { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, transparent); }
  .status-in_progress { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }

  .drift {
    max-width: 86rem; margin: 0 auto var(--space-2);
    padding: 0 max(16px, env(safe-area-inset-right, 0px)) 0 max(16px, env(safe-area-inset-left, 0px));
    font-size: var(--step--1); color: var(--muted);
  }
  .drift summary {
    cursor: pointer; padding: var(--space-3) var(--space-4);
    border: 1px solid color-mix(in srgb, var(--warn) 45%, var(--line)); border-radius: var(--radius-m);
    background: color-mix(in srgb, var(--warn) 8%, var(--surface));
  }
  .drift summary strong { color: var(--warn); }
  .drift-body { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); gap: var(--space-4); padding: var(--space-4); }
  .drift-body h3 { margin-bottom: var(--space-1); }
  .drift-hint { grid-column: 1 / -1; color: var(--faint); }
  .drift-hint code { display: block; margin-top: var(--space-1); font-family: var(--font-mono); font-size: var(--step--2); color: var(--fg); background: var(--surface-2); padding: 0.4rem 0.6rem; border-radius: var(--radius-s); overflow-x: auto; white-space: nowrap; }
  .empty { max-width: 46rem; margin: 0 auto; padding: var(--space-7) max(16px, env(safe-area-inset-left, 0px)); display: flex; flex-direction: column; gap: var(--space-3); color: var(--muted); }
  .empty h2 { color: var(--fg); }

  .layout {
    max-width: 86rem; margin: 0 auto;
    padding: var(--space-5) max(16px, env(safe-area-inset-right, 0px)) var(--space-8) max(16px, env(safe-area-inset-left, 0px));
    display: grid; grid-template-columns: 15.5rem minmax(0, 1fr); gap: var(--space-6); align-items: start;
  }
  .side {
    position: sticky; top: var(--space-4);
    max-height: calc(100dvh - 2 * var(--space-4)); overflow-y: auto; scrollbar-width: thin;
    padding-right: var(--space-2); padding-bottom: var(--space-4);
    display: flex; flex-direction: column; gap: var(--space-6);
  }
  .controls { display: flex; flex-direction: column; gap: var(--space-4); }
  .controls label { display: flex; flex-direction: column; gap: var(--space-1); }
  select {
    font: inherit; font-size: var(--step--1); color: var(--fg);
    background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-m);
    padding: 0.4rem 0.5rem;
  }
  .seg { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-1); }
  .seg legend { padding: 0; margin-bottom: var(--space-1); }
  .seg label { flex-direction: row; align-items: center; gap: var(--space-2); font-size: var(--step--1); cursor: pointer; }
  .seg input { accent-color: var(--accent); }
  .dim { color: var(--faint); font-size: var(--step--2); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.45rem 0.75rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--surface); color: var(--fg); cursor: pointer; }
  .btn:hover { border-color: var(--faint); }

  .grid-area { display: flex; flex-direction: column; gap: var(--space-6); min-width: 0; }
  .group-head { font-family: var(--font-display); font-size: var(--step-1); font-weight: 600; display: flex; align-items: baseline; gap: var(--space-2); padding-bottom: var(--space-2); border-bottom: 1px solid var(--line); margin-bottom: var(--space-3); }
  .extra .grid { opacity: 0.85; }
  .dim-text { color: var(--faint); font-size: var(--step--1); margin: calc(-1 * var(--space-1)) 0 var(--space-3); }
  .grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 9.75rem), 1fr)); gap: var(--space-3); }

  @media (max-width: 860px) {
    .layout { grid-template-columns: minmax(0, 1fr); }
    .side { position: static; max-height: none; overflow: visible; }
    .controls { flex-direction: row; flex-wrap: wrap; align-items: end; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 7.5rem), 1fr)); gap: var(--space-2); }
  }
</style>
