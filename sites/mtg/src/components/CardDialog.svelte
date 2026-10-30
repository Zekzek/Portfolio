<script lang="ts">
  import { decksWith } from "../lib/deck";
  import { href } from "../lib/route";
  import { activeSet, cardVersions } from "../lib/proxies";
  import type { Card, Deck, DeckArt, EditOp, Proxies } from "../lib/types";
  import Mana from "./Mana.svelte";
  import OracleText from "./OracleText.svelte";
  import ProxyArt from "./ProxyArt.svelte";

  let { name, card, deck, decks, art, proxies = null, currentSet = "", closeHref, onArtChanged, onEdit }: {
    name: string; card?: Card; deck: Deck; decks: Deck[]; art?: DeckArt; proxies?: Proxies | null; currentSet?: string;
    closeHref: string; onArtChanged: () => Promise<void>;
    onEdit?: (ops: EditOp[]) => Promise<boolean>;
  } = $props();

  let dialog: HTMLDialogElement;
  let face = $state(0);

  $effect(() => {
    dialog.showModal();
    return () => dialog.open && dialog.close();
  });

  function closed() {
    if (location.hash !== closeHref) location.hash = closeHref;
  }

  const faces = $derived(card?.faces?.length ? card.faces : null);
  const official = $derived(faces ? faces[face]?.image : card?.image);
  const usedIn = $derived(decksWith(name, decks));
  const cardArt = $derived(art?.cards[name]);
  // Every picture of the card: this deck's set (all versions), the official card, one per other set.
  const set = $derived(activeSet(currentSet, deck.proxySet));
  const setName = $derived(proxies?.sets.find((s) => s.id === set)?.name ?? set ?? "");
  const versions = $derived(cardVersions(proxies, name, set, card?.image ?? faces?.[0]?.image ?? null));
  // The big picture: the one in use (the deck's proxy if it has one), or a version you clicked.
  let picked = $state<string | null>(null);
  $effect(() => { void name; picked = null; }); // a new card starts on its version in use
  const shown = $derived(versions.find((v) => v.key === picked) ?? versions.find((v) => v.inUse) ?? null);
  /** Under its own heading a version needs less: "v7", or the official card's printing. */
  const short = (v: { kind: string; label: string }) =>
    v.kind === "deck" ? v.label.slice(setName.length).replace(/^ · /, "") : v.kind === "official" ? (card?.set_name ?? v.label) : v.label;
  const showOfficial = $derived(!shown || shown.kind === "official");
  const image = $derived(showOfficial ? official : shown!.url);
  // This card's entry in the deck (for its note), if the deck has it.
  const entry = $derived(deck.commanders.find((c) => c.name === name) ?? deck.categories.flatMap((c) => c.cards).find((c) => c.name === name));
  const inCategory = $derived(deck.categories.find((c) => c.cards.some((e) => e.name === name))?.name);
  let noteText = $state("");
  $effect(() => { noteText = entry?.note ?? ""; });
  let savingNote = $state(false);
  async function saveNote() {
    if (!onEdit) return;
    savingNote = true;
    await onEdit([{ op: "set_note", card: name, note: noteText.trim() }]);
    savingNote = false;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} class="card-dialog" aria-label={name} onclose={closed}
  onclick={(e) => { if (e.target === dialog) dialog.close(); }}>
  <div class="sheet">
    <button class="close" aria-label="Close" onclick={() => dialog.close()}>×</button>

    <div class="top">
      <div class="picture">
        {#if image}<img src={image} alt={showOfficial && faces ? faces[face].name : name} />{:else}<div class="noimg">{name}</div>{/if}
        {#if shown}<p class="shown mono">{shown.label}{shown.inUse ? " · in use" : ""}</p>{/if}
        {#if faces && showOfficial}
          <button class="btn flip" onclick={() => (face = (face + 1) % faces.length)}>Show {faces[(face + 1) % faces.length].name}</button>
        {/if}
      </div>

      <div class="info">
        <div class="name-row">
          <h2>{name}</h2>
          {#if card?.mana_cost}<Mana cost={card.mana_cost} size="1.2rem" />{/if}
        </div>
        {#if card}
          <p class="type">{card.type_line}</p>
          {#if entry}
            <div class="deck-note">
              <p class="eyebrow">In {deck.name}{inCategory ? ` · ${inCategory}` : " · commander"}{entry.count > 1 ? ` · ${entry.count} copies` : ""}</p>
              {#if onEdit}
                <form class="note-form" onsubmit={(e) => { e.preventDefault(); saveNote(); }}>
                  <label class="visually-hidden" for="card-note">Note on this card</label>
                  <input id="card-note" type="text" bind:value={noteText} placeholder="Add a note, e.g. cut candidate" />
                  <button class="btn" disabled={savingNote || noteText.trim() === (entry.note ?? "")}>Save note</button>
                </form>
              {:else if entry.note}
                <p class="note-text">{entry.note}</p>
              {/if}
            </div>
          {/if}
          {#if card.oracle_text}<OracleText text={card.oracle_text} />{/if}
          {#if card.power != null}<p class="pt mono">{card.power}/{card.toughness}</p>{/if}
          {#if card.loyalty != null}<p class="pt mono">Loyalty {card.loyalty}</p>{/if}
          <p class="set">{card.set_name} <span class="mono">({card.set?.toUpperCase()})</span> · {card.rarity}
            {#if card.scryfall_uri} · <a href={card.scryfall_uri} target="_blank" rel="noopener">Scryfall ↗</a>{/if}</p>
        {:else}
          <p class="type">This card isn't in the merged card data yet. Run <span class="mono">python DeckSite/tools/merge_cards.py</span>.</p>
        {/if}

        <div class="decks">
          <h3 class="eyebrow">In your decks</h3>
          {#if usedIn.length}
            <ul role="list">
              {#each usedIn as d (d.id)}
                <li><a href={href({ view: "deck", deck: d.id, card: name })} class:current={d.id === deck.id}>{d.name}</a></li>
              {/each}
            </ul>
          {:else}
            <p class="set">Not in any deck list. It's here because it has proxy art.</p>
          {/if}
        </div>
      </div>
    </div>

    {#if versions.length > 1}
      <section class="versions" aria-labelledby="versions-h">
        <h3 id="versions-h">Versions</h3>
        {#each [
          { kind: "deck", title: `In this deck · ${setName}` },
          { kind: "official", title: "Official card" },
          { kind: "other", title: "Other styles" },
        ] as part (part.kind)}
          {@const items = versions.filter((v) => v.kind === part.kind)}
          {#if items.length}
            <div class="vset">
              <p class="eyebrow">{part.title}</p>
              <ul role="list">
                {#each items as v (v.key)}
                  <li class:win={v.inUse} class:on={shown?.key === v.key}>
                    <button class="thumb" onclick={() => (picked = v.key)} aria-pressed={shown?.key === v.key} title="Show this one above">
                      <img src={v.url} alt={`${name}, ${v.label}`} loading="lazy" />
                    </button>
                    <span class="mono">{short(v)}{v.inUse ? " · in use" : ""}</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        {/each}
      </section>
    {/if}

    {#if art && cardArt}
      <ProxyArt deckId={deck.id} cardName={name} {art} {cardArt} {onArtChanged} />
    {:else if art}
      <p class="no-proxy">Not in this deck's DeckGen manifest (<span class="mono">{art.manifest}</span>), so there's no proxy art for it yet.</p>
    {/if}
  </div>
</dialog>

<style>
  .card-dialog {
    width: min(64rem, calc(100vw - 2 * max(16px, env(safe-area-inset-left, 0px))));
    max-height: calc(100dvh - 2rem);
    padding: 0; border: 1px solid var(--line); border-radius: var(--radius-m);
    background: var(--bg); color: var(--fg);
    overflow: auto;
  }
  .card-dialog::backdrop { background: rgb(4 6 8 / 0.78); backdrop-filter: blur(2px); }
  .sheet { position: relative; padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-6); }
  .close {
    position: absolute; top: var(--space-3); right: var(--space-3);
    width: 2.25rem; height: 2.25rem; font-size: 1.5rem; line-height: 1;
    border: 1px solid var(--line); border-radius: var(--radius-m); background: var(--surface); color: var(--fg); cursor: pointer;
  }
  .top { display: grid; grid-template-columns: minmax(0, 20rem) minmax(0, 1fr); gap: var(--space-6); }
  .picture { display: flex; flex-direction: column; gap: var(--space-3); }
  .picture img { width: 100%; border-radius: 4.6% / 3.3%; box-shadow: 0 12px 32px -14px rgb(0 0 0 / 0.7); }
  .noimg { aspect-ratio: 63 / 88; display: grid; place-items: center; border: 1px dashed var(--line); border-radius: var(--radius-m); color: var(--muted); padding: var(--space-4); text-align: center; }
  .info { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; padding-right: var(--space-6); }
  .name-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
  h2 { font-size: var(--step-2); }
  .type { color: var(--muted); font-weight: 700; }
  .pt { font-size: var(--step-1); }
  .set { color: var(--faint); font-size: var(--step--1); }
  .decks ul { list-style: none; padding: 0; margin: var(--space-2) 0 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
  .decks a { display: inline-block; font-size: var(--step--1); padding: 0.2rem 0.55rem; border: 1px solid var(--line); border-radius: 99px; text-decoration: none; color: var(--fg); }
  .decks a:hover { border-color: var(--accent); }
  .decks a.current { border-color: var(--accent); color: var(--accent); }
  .deck-note { display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-2) var(--space-3); border-left: 2px solid var(--accent); background: var(--surface); border-radius: 0 var(--radius-s) var(--radius-s) 0; }
  .note-form { display: flex; gap: var(--space-2); }
  .note-form input { flex: 1; min-width: 0; font: inherit; font-size: var(--step--1); color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-m); padding: 0.35rem 0.55rem; }
  .note-text { color: var(--muted); font-style: italic; }
  .versions { border-top: 1px solid var(--line); padding-top: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4); }
  .versions h3 { font-size: var(--step-1); }
  .vset ul { list-style: none; padding: 0; margin: var(--space-2) 0 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: var(--space-3); }
  .vset li { display: flex; flex-direction: column; gap: 4px; }
  .vset img { width: 100%; aspect-ratio: 63 / 88; object-fit: cover; border-radius: 4.6% / 3.3%; border: 2px solid transparent; }
  .vset li.win img { border-color: var(--good); }
  .vset li.on img { outline: 2px solid var(--accent); outline-offset: 2px; }
  .thumb { all: unset; cursor: pointer; display: block; border-radius: 4.6% / 3.3%; }
  .thumb:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  .shown { font-size: var(--step--2); color: var(--muted); text-align: center; }
  .vset span { font-size: var(--step--2); color: var(--muted); }
  .vset li.win span { color: var(--good); }
  .no-proxy { color: var(--faint); font-size: var(--step--1); border-top: 1px solid var(--line); padding-top: var(--space-4); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.4rem 0.7rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--surface); color: var(--fg); cursor: pointer; }

  @media (max-width: 720px) {
    .sheet { padding: var(--space-4); }
    .top { grid-template-columns: minmax(0, 1fr); }
    .picture { max-width: 18rem; }
    .info { padding-right: 0; }
  }
</style>
