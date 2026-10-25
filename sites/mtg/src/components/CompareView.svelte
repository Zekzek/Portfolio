<script lang="ts">
  import { compareDecks, countsDiffer, deckLetter, type Row } from "../lib/compare";
  import { isLand } from "../lib/deck";
  import { href } from "../lib/route";
  import type { Art, Cards, Deck } from "../lib/types";
  import CardDialog from "./CardDialog.svelte";
  import CardTile from "./CardTile.svelte";
  import ThemeToggleButton from "./ThemeToggleButton.svelte";

  let { ids, decks, cards, art, openCard, onArtChanged }: {
    ids: string[]; decks: Deck[]; cards: Cards; art: Art; openCard?: string; onArtChanged: () => Promise<void>;
  } = $props();

  const saved = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
  let mode = $state(saved("compare.mode", "cards") as "cards" | "table");
  let showLands = $state(saved("compare.lands", "yes") === "yes");
  $effect(() => { try { localStorage.setItem("compare.mode", mode); localStorage.setItem("compare.lands", showLands ? "yes" : "no"); } catch {} });

  const chosen = $derived(ids.map((id) => decks.find((d) => d.id === id)).filter((d): d is Deck => !!d && d.status !== "no_list"));
  const addable = $derived(decks.filter((d) => d.status !== "no_list" && !ids.includes(d.id)));
  const cmp = $derived(compareDecks(chosen, cards));
  const keep = (r: Row) => showLands || !isLand(cards[r.name]);

  const sections = $derived.by(() => {
    if (chosen.length < 2) return [];
    const s: { key: string; title: string; hint?: string; rows: Row[] }[] = [
      { key: "all", title: chosen.length === 2 ? "In both decks" : "In every deck", rows: cmp.inAll.filter(keep) },
    ];
    if (chosen.length > 2) s.push({ key: "some", title: "In some decks", hint: "Letters show which decks have it.", rows: cmp.some.filter(keep) });
    chosen.forEach((d, i) => s.push({ key: `only-${d.id}`, title: `Only in ${deckLetter(i)} · ${d.name}`, rows: cmp.only[i].filter(keep) }));
    return s;
  });

  const go = (next: string[]) => (location.hash = href({ view: "compare", decks: next }));
  const cardHref = (name: string) => href({ view: "compare", decks: ids, card: name });
  const firstDeckWith = (name: string) => chosen.find((d, i) => cmp.rows.find((r) => r.name === name)?.counts[i]);
  const tag = (r: Row) =>
    r.counts.map((c, i) => (c ? (countsDiffer(r) ? `${deckLetter(i)}×${c}` : deckLetter(i)) : null)).filter(Boolean).join(" ");
  const total = (d: Deck) => d.count + d.commanders.reduce((n, c) => n + c.count, 0);
  const sharedWithAll = (i: number) => cmp.rows.filter((r) => r.counts[i] && r.decksIn === chosen.length).length;
</script>

<div class="wrap">
  <header class="top">
    <div class="crumbs">
      <a href={href({ view: "decks" })}>← All decks</a>
      <ThemeToggleButton />
    </div>
    <h1>Compare decks</h1>

    <ol class="chips" role="list">
      {#each chosen as d, i (d.id)}
        <li>
          <span class="letter mono">{deckLetter(i)}</span>
          <a href={href({ view: "deck", deck: d.id })}>{d.name}</a>
          <button aria-label={`Remove ${d.name}`} onclick={() => go(ids.filter((x) => x !== d.id))}>×</button>
        </li>
      {/each}
      {#if addable.length}
        <li class="add">
          <label class="visually-hidden" for="add-deck">Add a deck</label>
          <select id="add-deck" onchange={(e) => { const v = e.currentTarget.value; if (v) go([...ids, v]); e.currentTarget.value = ""; }}>
            <option value="">+ Add deck</option>
            {#each addable as d (d.id)}<option value={d.id}>{d.name}</option>{/each}
          </select>
        </li>
      {/if}
    </ol>
  </header>

  {#if chosen.length < 2}
    <p class="empty">Pick at least two decks to compare.</p>
  {:else}
    <div class="summary-row">
      <table class="summary">
        <thead><tr><th scope="col">Deck</th><th scope="col">Cards</th><th scope="col">Shared by all</th><th scope="col">Only here</th></tr></thead>
        <tbody>
          {#each chosen as d, i (d.id)}
            <tr>
              <th scope="row"><span class="letter mono">{deckLetter(i)}</span> {d.name}</th>
              <td class="mono">{total(d)}</td>
              <td class="mono">{sharedWithAll(i)}</td>
              <td class="mono">{cmp.only[i].length}</td>
            </tr>
          {/each}
        </tbody>
      </table>

      <div class="controls">
        <fieldset class="seg">
          <legend class="eyebrow">Show as</legend>
          <label><input type="radio" bind:group={mode} value="cards" /> Cards</label>
          <label><input type="radio" bind:group={mode} value="table" /> Table</label>
        </fieldset>
        <label class="check"><input type="checkbox" bind:checked={showLands} /> Include lands</label>
      </div>
    </div>

    {#if mode === "cards"}
      {#each sections as s (s.key)}
        <section class="group">
          <h2 class="group-head"><span>{s.title}</span> <span class="mono dim">{s.rows.length}</span></h2>
          {#if s.hint}<p class="hint">{s.hint}</p>{/if}
          {#if s.rows.length === 0}
            <p class="hint">None.</p>
          {:else}
            <ul class="grid" role="list">
              {#each s.rows as r (r.name)}
                <li>
                  <CardTile entry={{ name: r.name, count: 1 }} card={cards[r.name]} image={cards[r.name]?.image ?? null} href={cardHref(r.name)} />
                  {#if s.key === "some" || countsDiffer(r)}<p class="tag mono">{tag(r)}</p>{/if}
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      {/each}
    {:else}
      <div class="table-wrap">
        <table class="matrix">
          <thead>
            <tr>
              <th scope="col">Card</th>
              {#each chosen as d, i (d.id)}<th scope="col" class="c" title={d.name}>{deckLetter(i)}</th>{/each}
            </tr>
          </thead>
          {#each sections as s (s.key)}
            <tbody>
              <tr class="sec"><th colspan={chosen.length + 1} scope="colgroup">{s.title} <span class="mono dim">{s.rows.length}</span></th></tr>
              {#each s.rows as r (r.name)}
                <tr>
                  <th scope="row"><a href={cardHref(r.name)}>{r.name}</a></th>
                  {#each r.counts as c, i (i)}
                    <td class="c mono" class:has={c > 0}>{c === 0 ? "·" : c === 1 ? "●" : c}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          {/each}
        </table>
      </div>
    {/if}
  {/if}
</div>

{#if openCard && firstDeckWith(openCard)}
  {@const owner = firstDeckWith(openCard)!}
  <CardDialog name={openCard} card={cards[openCard]} deck={owner} {decks} art={art[owner.id]}
    closeHref={href({ view: "compare", decks: ids })} {onArtChanged} />
{/if}

<style>
  .wrap {
    max-width: 86rem; margin: 0 auto;
    padding: var(--space-5) max(16px, env(safe-area-inset-right, 0px)) var(--space-8) max(16px, env(safe-area-inset-left, 0px));
    display: flex; flex-direction: column; gap: var(--space-6);
  }
  .top { display: flex; flex-direction: column; gap: var(--space-4); }
  .crumbs { display: flex; justify-content: space-between; align-items: center; }
  .crumbs a { color: var(--fg); text-decoration: none; font-size: var(--step--1); }
  h1 { font-size: var(--step-4); letter-spacing: -0.025em; font-weight: 720; }

  .chips { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .chips li { display: inline-flex; align-items: center; gap: var(--space-2); padding: 0.25rem 0.35rem 0.25rem 0.4rem; border: 1px solid var(--line); border-radius: 99px; background: var(--surface); }
  .chips a { color: var(--fg); text-decoration: none; font-size: var(--step--1); }
  .chips button { border: 0; background: transparent; color: var(--faint); font-size: 1.1rem; line-height: 1; cursor: pointer; padding: 0 0.3rem; }
  .chips button:hover { color: var(--warn); }
  .chips .add { padding: 0; border-style: dashed; background: transparent; }
  .chips select { font: inherit; font-size: var(--step--1); border: 0; background: transparent; color: var(--accent); padding: 0.3rem 0.6rem; cursor: pointer; }
  .letter {
    display: inline-grid; place-items: center; width: 1.35rem; height: 1.35rem; border-radius: 50%;
    background: var(--accent-soft); color: var(--accent); font-size: var(--step--2); font-weight: 700;
  }

  .empty, .hint { color: var(--faint); font-size: var(--step--1); }
  .hint { margin: calc(-1 * var(--space-1)) 0 var(--space-3); }

  .summary-row { display: flex; flex-wrap: wrap; gap: var(--space-6); align-items: end; justify-content: space-between; }
  table { border-collapse: collapse; font-size: var(--step--1); }
  .summary th, .summary td { padding: 0.35rem 0.9rem 0.35rem 0; text-align: left; border-bottom: 1px solid var(--line); }
  .summary thead th { font-family: var(--font-mono); font-weight: 500; font-size: var(--step--2); color: var(--faint); text-transform: uppercase; letter-spacing: 0.06em; }
  .summary tbody th { font-weight: 600; }
  .summary tbody th .letter { margin-right: var(--space-2); vertical-align: middle; }
  .summary td { color: var(--muted); }
  .controls { display: flex; flex-wrap: wrap; gap: var(--space-5); align-items: end; }
  .seg { border: 0; padding: 0; margin: 0; display: flex; gap: var(--space-3); align-items: center; }
  .seg legend { padding: 0; margin-bottom: var(--space-1); }
  .seg label, .check { display: flex; align-items: center; gap: var(--space-1); font-size: var(--step--1); cursor: pointer; }
  input { accent-color: var(--accent); }

  .group-head { font-family: var(--font-display); font-size: var(--step-1); font-weight: 600; display: flex; align-items: baseline; gap: var(--space-2); padding-bottom: var(--space-2); border-bottom: 1px solid var(--line); margin-bottom: var(--space-3); }
  .dim { color: var(--faint); font-size: var(--step--2); }
  .grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 8.75rem), 1fr)); gap: var(--space-3); }
  .tag { font-size: var(--step--2); color: var(--accent); margin-top: 0.3rem; text-align: center; }

  .table-wrap { overflow-x: auto; }
  .matrix { min-width: 24rem; }
  .matrix thead th { position: sticky; top: 0; background: var(--bg); font-family: var(--font-mono); font-size: var(--step--2); color: var(--faint); text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--line); z-index: 1; }
  .matrix tbody th { text-align: left; font-weight: 400; padding: 0.25rem 1.2rem 0.25rem 0; }
  .matrix tbody th a { color: var(--fg); text-decoration: none; }
  .matrix tbody th a:hover { color: var(--accent); text-decoration: underline; }
  .matrix td { padding: 0.25rem 0.6rem; border-bottom: 1px solid color-mix(in srgb, var(--line) 50%, transparent); }
  .matrix .c { text-align: center; width: 3rem; }
  .matrix td.c { color: var(--line); }
  .matrix td.c.has { color: var(--accent); }
  .matrix .sec th { padding: var(--space-4) 0 var(--space-1); font-family: var(--font-display); font-size: var(--step-0); font-weight: 650; border-bottom: 1px solid var(--line); }
  .matrix tbody tr:not(.sec):hover { background: var(--surface); }
</style>
