<script lang="ts">
  import { href } from "../lib/route";
  import { commanderArts } from "../lib/proxies";
  import type { Cards, Deck, Proxies } from "../lib/types";
  import ThemeToggleButton from "./ThemeToggleButton.svelte";
  import Mana from "./Mana.svelte";
  import { STATUS_LABEL, countLabel } from "../lib/labels";

  import { HOSTED, signOut } from "../lib/hosted";

  let { decks, cards, proxies = null, email = "" }: { decks: Deck[]; cards: Cards; proxies?: Proxies | null; email?: string } = $props();

  // Families: each deck without a parent, followed by its forks (and their forks).
  const families = $derived.by(() => {
    const ids = new Set(decks.map((d) => d.id));
    const roots = decks.filter((d) => !d.parent || !ids.has(d.parent));
    const childrenOf = (id: string): Deck[] => decks.filter((d) => d.parent === id).flatMap((d) => [d, ...childrenOf(d.id)]);
    return roots.map((r) => {
      const members = [r, ...childrenOf(r.id)];
      return { root: r, members, listed: members.filter((m) => m.status !== "no_list") };
    });
  });

  // Each commander from the deck's proxy set when it has one, else the original art; partners side by side.
  const arts = (d: Deck) => commanderArts(d, cards, proxies).slice(0, 2);
  const parentName = (d: Deck) => decks.find((x) => x.id === d.parent)?.name;
  const cost = (colors: string | null) => (colors ?? "").split("").map((c) => `{${c}}`).join("");
  const totalCards = $derived(decks.reduce((n, d) => n + d.count + d.commanders.reduce((a, c) => a + c.count, 0), 0));
</script>

<div class="wrap">
  <header class="top">
    <div>
      <p class="eyebrow">Commander decks</p>
      <h1>Deck shelf</h1>
      <p class="sub">{decks.length} decks · {totalCards} cards listed</p>
    </div>
    <div class="tools">
      <a class="search-link" href={href({ view: "search", q: "" })}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>
        Search all decks
      </a>
      <ThemeToggleButton />
      {#if HOSTED}
        <button class="signout" onclick={() => signOut()} title={email ? `Signed in as ${email}` : undefined}>Sign out</button>
      {/if}
    </div>
  </header>

  {#each families as fam (fam.root.id)}
    <section class="family" aria-labelledby={`fam-${fam.root.id}`}>
      <div class="fam-head">
        <h2 id={`fam-${fam.root.id}`} class="eyebrow">{fam.members.length > 1 ? `${fam.root.name} and forks` : fam.root.name}</h2>
        {#if fam.listed.length > 1}
          <a class="compare" href={href({ view: "compare", decks: fam.listed.map((m) => m.id) })}>Compare {fam.listed.length === 2 ? "both" : `all ${fam.listed.length}`} →</a>
        {/if}
      </div>
      <ul class="tiles" role="list">
        {#each fam.members as d (d.id)}
          {@const pics = arts(d)}
          <li>
            <a class="tile" class:empty={d.status === "no_list"} href={href({ view: "deck", deck: d.id })}>
              <div class="art" class:pair={pics.length > 1}>
                {#each pics as a (a.name)}
                  <div class="pic" class:proxy={a.proxy} style:background-image={`url("${a.url}")`}></div>
                {/each}
                {#if !pics.length}<span class="art-fallback" aria-hidden="true">{d.name.slice(0, 1)}</span>{/if}
              </div>
              <div class="body">
                <div class="title-row">
                  <h3>{d.name}</h3>
                  {#if d.colors}<Mana cost={cost(d.colors)} size="1rem" />{/if}
                </div>
                <p class="cmdr">{d.commanderNames.join(" + ")}</p>
                <div class="meta">
                  <span class="status status-{d.status}">{STATUS_LABEL[d.status]}</span>
                  <span class="mono count">{countLabel(d)}</span>
                </div>
                {#if d.parent && parentName(d)}<p class="fork">Fork of {parentName(d)}</p>{/if}
                {#if d.note}<p class="note">{d.note}</p>{/if}
              </div>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</div>

<style>
  .wrap {
    max-width: 78rem;
    margin: 0 auto;
    padding: var(--space-7) max(16px, env(safe-area-inset-right, 0px)) var(--space-8) max(16px, env(safe-area-inset-left, 0px));
    display: flex;
    flex-direction: column;
    gap: var(--space-7);
  }
  .top { display: flex; justify-content: space-between; align-items: start; gap: var(--space-4); flex-wrap: wrap; }
  .tools { display: flex; gap: var(--space-2); align-items: center; }
  .search-link {
    display: inline-flex; align-items: center; gap: var(--space-2);
    min-width: 14rem; padding: 0.45rem 0.8rem; border: 1px solid var(--line); border-radius: var(--radius-m);
    background: var(--surface); color: var(--faint); text-decoration: none; font-size: var(--step--1);
  }
  .search-link:hover { border-color: var(--accent); color: var(--fg); }
  .signout { font: inherit; font-size: var(--step--1); padding: 0.45rem 0.7rem; border: 1px solid var(--line); border-radius: var(--radius-m); background: transparent; color: var(--muted); cursor: pointer; }
  .signout:hover { color: var(--fg); border-color: var(--faint); }
  h1 { font-size: var(--step-4); letter-spacing: -0.025em; font-weight: 720; margin-top: var(--space-1); }
  .sub { color: var(--muted); margin-top: var(--space-2); }

  .family { display: flex; flex-direction: column; gap: var(--space-3); }
  .fam-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); flex-wrap: wrap; }
  .compare { font-size: var(--step--1); text-decoration: none; }
  .compare:hover { text-decoration: underline; }
  .tiles {
    list-style: none; padding: 0; margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
    gap: var(--space-4);
  }
  .tile {
    display: flex; flex-direction: column; height: 100%;
    border: 1px solid var(--line); border-radius: var(--radius-m);
    overflow: hidden; background: var(--surface);
    color: inherit; text-decoration: none;
    transition: border-color 140ms ease, transform 140ms ease;
  }
  .tile:hover { border-color: var(--accent); transform: translateY(-2px); }
  .tile.empty { opacity: 0.7; }
  .art {
    aspect-ratio: 16 / 7;
    background: var(--surface-2);
    display: grid; place-items: center;
  }
  .art.pair { grid-template-columns: 1fr 1fr; gap: 2px; place-items: stretch; }
  .pic { width: 100%; height: 100%; background: center 22% / cover no-repeat; }
  /* A whole proxy card: frame its art box (upper third of the card). */
  .pic.proxy { background-position: center 25%; }
  .pair .pic.proxy { background-size: 140% auto; background-position: center 20%; }
  .art-fallback { font-family: var(--font-display); font-size: var(--step-3); color: var(--faint); }
  .body { padding: var(--space-3) var(--space-4) var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); flex: 1; }
  .title-row { display: flex; justify-content: space-between; align-items: start; gap: var(--space-2); }
  h3 { font-size: var(--step-1); font-weight: 650; }
  .cmdr { color: var(--muted); font-size: var(--step--1); }
  .meta { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-top: auto; padding-top: var(--space-2); }
  .count { font-size: var(--step--2); color: var(--faint); }
  .fork { font-size: var(--step--1); color: var(--faint); }
  .note { font-size: var(--step--1); color: var(--muted); }

  .status {
    font-family: var(--font-mono); font-size: var(--step--2); letter-spacing: 0.04em;
    padding: 0.1rem 0.45rem; border-radius: var(--radius-s); border: 1px solid var(--line); color: var(--muted);
  }
  .status-complete { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, transparent); }
  .status-in_progress { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
</style>
