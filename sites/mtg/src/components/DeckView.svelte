<script lang="ts">
  import { SIDEBOARD, groupDeck, isSideboard, mainEntries, manaCurve, pipCounts, typeCounts, type GroupBy, type SortBy } from "../lib/deck";
  import { STATUS_LABEL, countLabel } from "../lib/labels";
  import { href } from "../lib/route";
  import { ApiError, editDeck, revertDeck } from "../lib/api";
  import { editable } from "../lib/connection.svelte";
  import { coverage, deckArt, proxyFor } from "../lib/proxies";
  import type { Cards, Deck, DeckArt, EditOp, Proxies } from "../lib/types";
  import AddCard from "./AddCard.svelte";
  import CardDialog from "./CardDialog.svelte";
  import EditControls from "./EditControls.svelte";
  import HistoryPanel from "./HistoryPanel.svelte";
  import CardTile from "./CardTile.svelte";
  import Mana from "./Mana.svelte";
  import ProxyPanel from "./ProxyPanel.svelte";
  import SampleHand from "./SampleHand.svelte";
  import Stats from "./Stats.svelte";
  import ThemeToggleButton from "./ThemeToggleButton.svelte";

  let { deck, decks, cards, art, proxies, openCard, onArtChanged, onDataChanged }: {
    deck: Deck; decks: Deck[]; cards: Cards; art?: DeckArt; proxies: Proxies | null; openCard?: string;
    onArtChanged: () => Promise<void>; onDataChanged: () => Promise<void>;
  } = $props();

  // View settings are remembered per browser.
  const saved = (k: string, fallback: string) => { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } };
  const remember = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
  let groupBy = $state(saved("deck.groupBy", "category") as GroupBy);
  let sortBy = $state(saved("deck.sortBy", "cmc") as SortBy);
  // Card images: the deck's proxy set by default (newest version per card), or the original cards.
  let imageSet = $state(deck.proxySet || "original");
  $effect(() => { remember("deck.groupBy", groupBy); remember("deck.sortBy", sortBy); });

  // Editing: every change goes to the deck store with the version this page shows.
  let editing = $state(false);
  let busy = $state(false);
  let why = $state("");
  let message = $state<{ ok: boolean; text: string } | null>(null);
  // Every category plus the Sideboard (created on first use).
  const categoryNames = $derived([...deck.categories.filter((c) => !isSideboard(c)).map((c) => c.name), SIDEBOARD]);
  const sideboardEmpty = $derived(!deck.categories.some((c) => isSideboard(c) && c.cards.length));

  // Drag and drop while editing: drag a card onto another category (or the Sideboard) to move it.
  const DRAG_TYPE = "application/x-deckshelf-card";
  let dragging = $state<{ card: string; from: string } | null>(null);
  let dropOn = $state<string | null>(null);
  function dragStart(e: DragEvent, card: string, from: string) {
    if (!editing || !e.dataTransfer) return;
    e.dataTransfer.setData(DRAG_TYPE, card);
    e.dataTransfer.effectAllowed = "move";
    dragging = { card, from };
  }
  function dragEnd() { dragging = null; dropOn = null; }
  function dragOver(e: DragEvent, category: string) {
    if (!dragging || busy || dragging.from === category) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    dropOn = category;
  }
  function dragLeave(e: DragEvent, category: string) {
    const to = e.relatedTarget as Node | null;
    if (dropOn === category && !(to && (e.currentTarget as Node).contains(to))) dropOn = null;
  }
  function drop(e: DragEvent, category: string) {
    e.preventDefault();
    const d = dragging;
    dragEnd();
    if (!d || d.from === category) return;
    edit([category === SIDEBOARD ? { op: "sideboard", card: d.card } : { op: "move", card: d.card, category }]);
  }

  async function edit(ops: EditOp[], label?: string): Promise<boolean> {
    busy = true;
    message = null;
    try {
      const r = await editDeck(deck.id, deck.version, ops, why.trim());
      await onDataChanged();
      message = { ok: true, text: `${label ?? r.done.join("; ")} (version ${r.version})` };
      why = ""; // a reason belongs to one change
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const by = e.data.lastBy ? ` by ${e.data.lastBy}${e.data.lastWhy ? `: “${e.data.lastWhy}”` : ""}` : "";
        message = { ok: false, text: `This deck changed somewhere else (now version ${e.data.version}${by}). It has been reloaded: check it and redo your change.` };
        await onDataChanged();
      } else {
        message = { ok: false, text: (e as Error).message };
      }
      return false;
    } finally {
      busy = false;
    }
  }

  async function undoTo(version: number) {
    busy = true;
    message = null;
    try {
      const r = await revertDeck(deck.id, deck.version, version, why.trim() || "undo");
      await onDataChanged();
      message = { ok: true, text: `Back to how version ${version} looked (now version ${r.version})` };
      why = "";
    } catch (e) {
      message = { ok: false, text: (e as Error).message };
      if (e instanceof ApiError && e.status === 409) await onDataChanged();
    } finally {
      busy = false;
    }
  }

  const groups = $derived(groupDeck(deck, cards, editing ? "category" : groupBy, sortBy));
  const curve = $derived(manaCurve(deck, cards));
  const types = $derived(typeCounts(deck, cards));
  const pips = $derived(pipCounts(deck, cards));
  const parent = $derived(decks.find((d) => d.id === deck.parent));
  const forks = $derived(decks.filter((d) => d.parent === deck.id));
  const bannerArt = $derived(deckArt(deck, cards, proxies));
  const banner = $derived(bannerArt?.url ?? null);
  const deckNames = $derived([...deck.commanders, ...mainEntries(deck)].map((e) => e.name));
  const setChoices = $derived((proxies?.sets ?? []).map((s) => ({ ...s, covered: coverage(proxies, s.id, deckNames) })));

  function imageFor(name: string): string | null {
    const p = imageSet === "original" ? undefined : proxyFor(proxies, imageSet, name);
    if (p) return p.url;
    return cards[name]?.image ?? null;
  }
  const isProxy = (name: string) => imageSet !== "original" && !!proxyFor(proxies, imageSet, name);
  /** A proxy set is showing but has no image for this card, so it's the original. */
  const isFallback = (name: string) => imageSet !== "original" && !proxyFor(proxies, imageSet, name);
  const cardHref = (name: string) => href({ view: "deck", deck: deck.id, card: name });
  const cost = (colors: string | null) => (colors ?? "").split("").map((c) => `{${c}}`).join("");

  const driftCount = $derived(deck.drift ? deck.drift.onlyInDoc.length + deck.drift.onlyInList.length : 0);
  let showHand = $state(false);
  let copied = $state(false);
  async function copyList() {
    if (!deck.list) return;
    const lines = [...deck.commanders.map((c) => `${c.count}x ${c.name} *CMDR*`),
      ...deck.categories.filter((g) => !g.excluded).flatMap((g) => [`# ${g.name.replace(/[^A-Za-z0-9]+/g, "")}`, ...g.cards.map((e) => `${e.count}x ${e.name}`)])];
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
        <p class="doc mono">Version {deck.version} · updated {new Date(deck.updated).toLocaleString()}{#if deck.doc} · notes: {deck.doc}{/if}</p>
      </div>
    </div>
  </header>

  {#if driftCount}
    <details class="drift">
      <summary>
        <strong>The Deck List in the notes was edited by hand and differs on {driftCount} {driftCount === 1 ? "card" : "cards"}.</strong>
        This page shows the deck store.
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
        <p class="drift-hint">Make those changes here (or with <span class="mono">deck.py</span>), then rewrite the list in the notes from the store:
          <code>python DeckSite/deck.py export {deck.id}</code></p>
      </div>
    </details>
  {/if}

  {#if deck.status === "no_list"}
    <section class="empty">
      <h2>No list yet</h2>
      <p>This deck only exists as notes in <span class="mono">{deck.doc}</span>. Add a deck file for it in <span class="mono">DeckSite/decks/</span> to see it here.</p>
    </section>
  {:else}
    <div class="layout">
      <aside class="side">
        <div class="controls" role="group" aria-label="View options">
          <label>
            <span class="eyebrow">Group by</span>
            <select bind:value={groupBy} id="group-by" disabled={editing} title={editing ? "Editing groups by your categories" : undefined}>
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
          <label>
            <span class="eyebrow">Card images</span>
            <select bind:value={imageSet} id="image-set">
              {#each setChoices as s (s.id)}
                <option value={s.id}>{s.name} · {s.covered} cards{s.id === deck.proxySet ? " (default)" : ""}</option>
              {/each}
              <option value="original">Original cards{!deck.proxySet ? " (default)" : ""}</option>
            </select>
          </label>
          {#if editable() && imageSet !== (deck.proxySet || "original")}
            <button class="link-btn" disabled={busy}
              onclick={() => edit([{ op: "set_deck", field: "proxySet", value: imageSet === "original" ? "" : imageSet }])}>
              Make this the deck's default
            </button>
          {/if}
          <label>
            <span class="eyebrow">Compare with</span>
            <select id="compare-with" onchange={(e) => { const v = e.currentTarget.value; if (v) location.hash = href({ view: "compare", decks: [deck.id, v] }); }}>
              <option value="">Choose a deck…</option>
              {#each decks.filter((d) => d.id !== deck.id && d.status !== "no_list") as d (d.id)}<option value={d.id}>{d.name}</option>{/each}
            </select>
          </label>
          {#if !editable()}<p class="readonly-note">Showing the last upload. Connect to your PC (bottom left) to edit.</p>{:else}<button class="btn" class:on={editing} onclick={() => { editing = !editing; message = null; }} aria-pressed={editing}>{editing ? "Done editing" : "Edit list"}</button>{/if}
          {#if deck.status !== "pool"}<button class="btn" onclick={() => (showHand = !showHand)} aria-pressed={showHand}>{showHand ? "Hide sample hand" : "Sample hand"}</button>{/if}
          {#if deck.list}<button class="btn" onclick={copyList}>{copied ? "Copied" : "Copy for TappedOut"}</button>{/if}
        </div>
        <Stats {curve} {types} {pips} />
        <HistoryPanel deckId={deck.id} version={deck.version} {busy} onUndo={undoTo} />
        <ProxyPanel {deck} {art} {proxies} {onDataChanged} />
      </aside>

      <main class="grid-area">
        {#if editing}
          <section class="editor" aria-label="Edit this deck">
            <AddCard categories={categoryNames} {busy}
              onAdd={(name, category, count) => edit([{ op: "add", card: name, category, count }])} />
            <div class="editor-row">
              <label class="field">
                <span class="eyebrow">Status</span>
                <select id="deck-status" value={deck.status} disabled={busy}
                  onchange={(e) => edit([{ op: "set_deck", field: "status", value: e.currentTarget.value }])}>
                  <option value="complete">Complete</option>
                  <option value="in_progress">In progress</option>
                  <option value="pool">Candidate pool</option>
                </select>
              </label>
              <label class="field grow">
                <span class="eyebrow">Deck note</span>
                <input id="deck-note" type="text" value={deck.note ?? ""} disabled={busy} placeholder="e.g. 96/99, 3 open slots"
                  onchange={(e) => edit([{ op: "set_deck", field: "note", value: e.currentTarget.value }])} />
              </label>
              <label class="field grow">
                <span class="eyebrow">Reason for your next change (saved in the history)</span>
                <input id="edit-why" type="text" bind:value={why} placeholder="Optional, e.g. cutting for the graveyard plan" />
              </label>
            </div>
            <p class="editor-hint">Drag cards between categories, or onto the Sideboard to set them aside. × sets a card aside; × in the Sideboard deletes it. Changes save right away and update the .txt and the Deck List in the notes. Undo is under Changes.</p>
          </section>
        {/if}
        {#if message}<p class="msg" class:err={!message.ok} role="status">{message.text}</p>{/if}
        {#if showHand}
          <SampleHand {deck} {cards} {imageFor} {cardHref} onClose={() => (showHand = false)} />
        {/if}
        {#if deck.commanders.length}
          <section class="group">
            <h2 class="group-head"><span>Commander</span></h2>
            <ul class="grid" role="list">
              {#each deck.commanders as e (e.name)}
                <li><CardTile entry={e} card={cards[e.name]} image={imageFor(e.name)} proxy={isProxy(e.name)} original={isFallback(e.name)} href={cardHref(e.name)} /></li>
              {/each}
            </ul>
          </section>
        {/if}
        {#each groups as g (g.key)}
          <section class="group" class:side={g.sideboard} class:drop-target={dropOn === g.key} role="group" aria-label={g.label}
            ondragover={(e) => editing && dragOver(e, g.key)} ondragleave={(e) => dragLeave(e, g.key)} ondrop={(e) => editing && drop(e, g.key)}>
            <h2 class="group-head"><span>{g.label}</span> <span class="mono dim">{g.count}</span></h2>
            <ul class="grid" role="list">
              {#each g.entries as e (e.name)}
                <li draggable={editing && !busy} class:lifted={dragging?.card === e.name}
                  ondragstart={(ev) => dragStart(ev, e.name, g.key)} ondragend={dragEnd}>
                  <CardTile entry={e} card={cards[e.name]} image={imageFor(e.name)} proxy={isProxy(e.name)} original={isFallback(e.name)} href={cardHref(e.name)} />
                  {#if editing}<EditControls entry={e} category={g.key} categories={categoryNames} {busy} onEdit={(ops) => edit(ops)} />{/if}
                </li>
              {/each}
            </ul>
          </section>
        {/each}
        {#if editing && sideboardEmpty}
          <section class="group side empty-side" class:drop-target={dropOn === SIDEBOARD} role="group" aria-label={SIDEBOARD}
            ondragover={(e) => dragOver(e, SIDEBOARD)} ondragleave={(e) => dragLeave(e, SIDEBOARD)} ondrop={(e) => drop(e, SIDEBOARD)}>
            <h2 class="group-head"><span>{SIDEBOARD} · set aside, not counted</span></h2>
            <p class="dim-text">Drag cards here (or use ×) to set them aside without losing them. They stay with this deck but aren't counted or exported.</p>
          </section>
        {/if}
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

{#if dragging && dragging.from !== SIDEBOARD}
  <div class="aside-bar" class:drop-target={dropOn === SIDEBOARD} role="region" aria-label="Sideboard drop zone"
    ondragover={(e) => dragOver(e, SIDEBOARD)} ondragleave={(e) => dragLeave(e, SIDEBOARD)} ondrop={(e) => drop(e, SIDEBOARD)}>
    Drop here to set {dragging.card} aside in the Sideboard
  </div>
{/if}

{#if openCard}
  <CardDialog name={openCard} card={cards[openCard]} {deck} {decks} {art} {proxies} currentSet={imageSet} closeHref={href({ view: "deck", deck: deck.id })} {onArtChanged}
    onEdit={!editable() ? undefined : (ops) => edit(ops)} />
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
  .link-btn { font: inherit; font-size: var(--step--1); border: 0; background: none; padding: 0; color: var(--accent); cursor: pointer; text-decoration: underline; text-underline-offset: 0.2em; text-align: left; }
  .link-btn:disabled { opacity: 0.5; cursor: progress; }
  .readonly-note { font-size: var(--step--2); color: var(--faint); }
  .btn.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); font-weight: 700; }
  .editor { border: 1px solid var(--accent); border-radius: var(--radius-m); background: var(--surface); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .editor-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: end; }
  .editor .field { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
  .editor .grow { flex: 1 1 14rem; }
  .editor input, .editor select { font: inherit; font-size: var(--step--1); color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-m); padding: 0.4rem 0.55rem; }
  .editor-hint { font-size: var(--step--2); color: var(--faint); }
  .msg { font-size: var(--step--1); color: var(--good); }
  .msg.err { color: var(--warn); }
  .dim-text { color: var(--faint); font-size: var(--step--1); margin: calc(-1 * var(--space-1)) 0 var(--space-3); }
  .grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 9.75rem), 1fr)); gap: var(--space-3); }

  @media (max-width: 860px) {
    .layout { grid-template-columns: minmax(0, 1fr); }
    .side { position: static; max-height: none; overflow: visible; }
    .controls { flex-direction: row; flex-wrap: wrap; align-items: end; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 7.5rem), 1fr)); gap: var(--space-2); }
  }

  /* Editing: drag and drop */
  .group.drop-target { outline: 2px dashed var(--accent); outline-offset: 6px; border-radius: var(--radius-m); }
  .group.side .group-head { color: var(--muted); }
  .empty-side { border: 1px dashed var(--line); border-radius: var(--radius-m); padding: var(--space-4); }
  li[draggable="true"] { cursor: grab; }
  li.lifted { opacity: 0.4; }
  .aside-bar {
    position: fixed; z-index: 20; left: 50%; transform: translateX(-50%);
    bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
    width: min(36rem, calc(100vw - 32px)); padding: var(--space-4); text-align: center;
    background: var(--surface); color: var(--fg); font-weight: 650;
    border: 2px dashed var(--accent); border-radius: var(--radius-m);
    box-shadow: 0 12px 30px -12px rgb(0 0 0 / 0.7);
  }
  .aside-bar.drop-target { background: color-mix(in srgb, var(--accent) 22%, var(--surface)); }
</style>
