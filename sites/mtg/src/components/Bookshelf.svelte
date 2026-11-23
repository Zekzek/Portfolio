<script lang="ts">
  // The deck shelf drawn as a bookshelf: each deck's printed box (MTG/DeckBox) as a spine, families on their
  // own shelf with forks beside their parent. The spines are tabs; the chosen book stands below, cover out.
  import { href } from "../lib/route";
  import { backCover, bookLook, cardImage, families } from "../lib/shelf";
  import { STATUS_LABEL, countLabel } from "../lib/labels";
  import type { Cards, Deck, Proxies } from "../lib/types";
  import Mana from "./Mana.svelte";

  // onShown: when set (connected to the PC), the stand offers "Shown to viewers" for the deck.
  let { decks, cards, proxies = null, saving = null, onShown }: {
    decks: Deck[]; cards: Cards; proxies?: Proxies | null;
    saving?: string | null; onShown?: (d: Deck, shown: boolean) => void;
  } = $props();

  const saved = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
  const remember = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

  const fams = $derived(families(decks));
  const order = $derived(fams.flatMap((f) => f.members));
  let picked = $state(saved("shelf.picked"));
  const current = $derived(order.find((d) => d.id === picked) ?? order[0]);
  function pick(d: Deck, focus = false) {
    picked = d.id;
    remember("shelf.picked", d.id);
    if (focus) document.getElementById(`spine-${d.id}`)?.focus();
  }
  function keys(e: KeyboardEvent) {
    const i = order.findIndex((d) => d.id === current?.id);
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: order.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    pick(order[(to + order.length) % order.length], true);
  }

  const cost = (colors: string | null) => (colors ?? "").split("").map((c) => `{${c}}`).join("");
  const look = $derived(current ? bookLook(current) : null);
  const front = $derived(current ? cardImage(current, current.commanderNames[0], cards, proxies) : null);
  const rear = $derived(current ? backCover(current, cards, proxies) : null);
  const shots = $derived(current?.box?.shots ?? null);
  const fam = $derived(current ? fams.find((f) => f.members.some((m) => m.id === current.id)) : undefined);
  const parent = $derived(current?.parent ? decks.find((d) => d.id === current.parent) : undefined);
  const forks = $derived(current ? decks.filter((d) => d.parent === current.id) : []);
  const fill = (d: Deck) => (d.status === "complete" || d.status === "in_progress") && d.target ? Math.min(1, d.count / d.target) : null;
</script>

<div class="shelf" role="tablist" aria-label="Decks" tabindex="-1" onkeydown={keys}>
  {#each fams as f (f.root.id)}
    <div class="set">
      <div class="books">
        {#each f.members as d (d.id)}
          {@const l = bookLook(d)}
          {@const full = fill(d)}
          {@const pic = d.box?.shots?.spine}
          <button id="spine-{d.id}" class="spine st-{d.status}" class:on={d.id === current?.id} class:plain={!l.printed} class:photo={!!pic}
            style:background-image={pic ? `url("${pic}")` : null} style:aspect-ratio={pic && d.box ? `${d.box.outside[2]} / ${d.box.outside[1]}` : null}
            class:hidden-deck={d.viewers === "hidden"} role="tab" aria-selected={d.id === current?.id} aria-controls="stand"
            tabindex={d.id === current?.id ? 0 : -1} onclick={() => pick(d)}
            title="{d.name} · {STATUS_LABEL[d.status]}{d.viewers === 'hidden' ? ' · hidden from viewers' : ''}"
            style:--spine={l.spine} style:--label={l.label} style:--band={l.band}>
            {#if d.status === "in_progress"}<span class="ribbon" aria-hidden="true"></span>{/if}
            <span class="title" class:sr-only={!!pic} style:font-size={l.title.length > 18 ? "0.7rem" : l.title.length > 9 ? "0.76rem" : null}>{l.title}</span>
            {#if d.colors && !pic}<span class="pips"><Mana cost={cost(d.colors)} size="0.95rem" /></span>{/if}
            {#if full !== null && full < 1}<span class="fill" style:--fill={full} aria-hidden="true"></span>{/if}
          </button>
        {/each}
      </div>
      <div class="plank" aria-hidden="true"></div>
      <p class="set-name">
        {f.members.length > 1 ? `${f.root.name} and forks` : f.root.name}
        {#if f.listed.length > 1}· <a href={href({ view: "compare", decks: f.listed.map((m) => m.id) })}>compare</a>{/if}
      </p>
    </div>
  {/each}
</div>

{#if current && look}
  <div class="stand" id="stand" role="tabpanel" aria-labelledby="spine-{current.id}">
    <header class="info">
      <div class="line">
        <h2>{current.name}</h2>
        {#if current.colors}<Mana cost={cost(current.colors)} size="1.1rem" />{/if}
        <span class="status status-{current.status}">{STATUS_LABEL[current.status]}</span>
        <span class="mono">{countLabel(current)}</span>
        <span class="actions">
          {#if fam && fam.listed.length > 1}<a class="btn" href={href({ view: "compare", decks: fam.listed.map((m) => m.id) })}>Compare the family</a>{/if}
          <a class="btn primary" href={href({ view: "deck", deck: current.id })}>Open deck →</a>
        </span>
      </div>
      <p class="line small">
        {#if current.note}<span class="note">{current.note}</span>{/if}
        {#if parent}<span>Fork of <a href={href({ view: "deck", deck: parent.id })}>{parent.name}</a></span>{/if}
        {#if forks.length}<span>Forks: {#each forks as k, i (k.id)}{i ? ", " : ""}<button class="linkish" onclick={() => pick(k)}>{k.name}</button>{/each}</span>{/if}
        <a class="mono faint" href={href({ view: "history", deck: current.id })}>v{current.version} · {new Date(current.updated).toLocaleDateString()}</a>
        {#if !look.printed}<span class="faint">No printed box yet</span>{/if}
        {#if onShown}
          <label class="viewers" class:warn={current.viewers === "hidden"} title="View-only sign-ins on the hosted site see this deck only when this is checked">
            <input type="checkbox" checked={current.viewers !== "hidden"} disabled={saving !== null}
              onchange={(e) => onShown(current, e.currentTarget.checked)} />
            {saving === current.id ? "Saving…" : current.viewers === "hidden" ? "Hidden from viewers" : "Shown to viewers"}
          </label>
        {/if}
      </p>
    </header>

    <div class="covers" style:--ratio={current.box ? `${current.box.outside[0]} / ${current.box.outside[1]}` : "108.2 / 150.8"}>
      <!-- the printed box, photographed (DeckBox/shots.py), or drawn from its colors -->
      <figure>
        {#if shots?.front}
          <img class="photo-cover" src={shots.front} alt="{current.name}'s box: the front cover" />
        {:else}
          <div class="cover" style:--spine={look.spine} style:--label={look.label} style:--band={look.band} style:--frame={look.frame}>
            <span class="cover-title">{look.title}</span>
            <div class="window">
              {#if front}<img src={front} alt={current.commanderNames[0]} />{:else}<span class="nothing">{current.commanderNames[0] ?? current.name}</span>{/if}
            </div>
            {#if current.colors}<span class="cover-pips"><Mana cost={cost(current.colors)} size="1rem" /></span>{/if}
          </div>
        {/if}
        <figcaption>Front</figcaption>
      </figure>
      <figure>
        {#if shots?.back}
          <img class="photo-cover" src={shots.back} alt="{current.name}'s box: the back cover" />
        {:else}
          <div class="cover back" style:--spine={look.spine} style:--label={look.label} style:--frame={look.frame} style:--rear={look.back} style:--rear-band={look.backBand}>
            <div class="window rear" style:aspect-ratio={rear ? String(rear.ratio) : "63 / 88"}>
              {#if rear}<img src={rear.image} alt="The back cover's card" />{:else}<p class="nothing">Nothing in the back cover yet.</p>{/if}
            </div>
          </div>
        {/if}
        <figcaption>Back</figcaption>
      </figure>
    </div>
  </div>
{/if}

<style>
  /* ---- The shelf ---- */
  .shelf { display: flex; flex-wrap: wrap; align-items: flex-end; column-gap: 0; row-gap: var(--space-4); padding-top: var(--space-4); outline: none; }
  .set { display: flex; flex-direction: column; padding-right: 1.4rem; position: relative; }
  /* a bookend after each family */
  .set::after {
    content: ""; position: absolute; right: 0.45rem; bottom: 0.7rem; width: 0.5rem; height: 5.5rem;
    background: #6b4a2f; border-radius: 2px 2px 0 0;
  }
  .set:last-child::after { display: none; }
  .books { display: flex; align-items: flex-end; gap: 2px; padding: 0 0.6rem; min-height: 14rem; }
  .plank { height: 0.7rem; background: #7a5534; border-radius: 2px; margin-right: -1.4rem; box-shadow: inset 0 -3px 0 rgb(0 0 0 / 0.25); }
  .set:last-child .plank { margin-right: 0; }
  .set-name { white-space: nowrap; font-size: var(--step--2); color: var(--faint); margin-top: var(--space-1); padding-left: 0.6rem; font-family: var(--font-mono); letter-spacing: 0.03em; }
  .set-name a { color: inherit; }
  .set-name a:hover { color: var(--accent); }

  .spine {
    --w: 3.3rem;
    position: relative; width: var(--w); height: 12.5rem; padding: 0.9rem 0 0.7rem;
    display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 0.5rem;
    background: var(--spine); color: var(--label); border: 0; border-radius: 3px 3px 1px 1px; cursor: pointer; font: inherit;
    /* bands of the border color near the head and foot, like the printed spine */
    background-image:
      linear-gradient(var(--band), var(--band)), linear-gradient(var(--band), var(--band)),
      linear-gradient(90deg, rgb(255 255 255 / 0.07), transparent 30%, transparent 70%, rgb(0 0 0 / 0.25));
    background-size: 100% 3px, 100% 3px, 100% 100%;
    background-position: 0 0.4rem, 0 calc(100% - 0.4rem), 0 0;
    background-repeat: no-repeat;
    transition: transform 160ms ease;
  }
  .spine:hover { transform: translateY(-0.45rem); }
  .spine.on { transform: translateY(-1.1rem); outline: 2px solid var(--accent); outline-offset: 2px; }
  .spine:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .spine.plain { --w: 2.9rem; height: 11.8rem; }
  .spine.st-pool { height: 10.5rem; opacity: 0.85; }
  .spine.st-no_list { height: 9rem; opacity: 0.6; background-image: none; border: 1px dashed var(--label); }
  .spine.hidden-deck { opacity: 0.7; }
  .title {
    writing-mode: vertical-rl; font-family: var(--font-display); font-weight: 700; font-size: 0.85rem; letter-spacing: 0.08em;
    line-height: 1.15; max-height: 9.5rem; max-width: 100%; overflow: hidden; text-align: center;
  }
  .pips :global(.mana) { flex-direction: column; gap: 3px; }
  /* in progress: a ribbon bookmark out of the top */
  .ribbon { position: absolute; top: -0.9rem; right: 0.55rem; width: 0.45rem; height: 1.4rem; background: var(--accent); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); }
  /* how full the list is, as a thin gauge at the foot */
  .fill { position: absolute; left: 0.35rem; right: 0.35rem; bottom: 0.15rem; height: 2px; background: rgb(255 255 255 / 0.2); }
  .fill::after { content: ""; position: absolute; inset: 0 auto 0 0; width: calc(var(--fill) * 100%); background: var(--label); }

  /* a spine photographed from the printed box */
  .spine.photo { width: auto; height: 12.5rem; padding: 0; background: center / 100% 100% no-repeat; border-radius: 2px; }
  .spine.photo.st-pool { height: 12.5rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

  /* ---- The stand ---- */
  .stand {
    display: flex; flex-direction: column; gap: var(--space-4);
    padding: var(--space-4) var(--space-5) var(--space-5); border: 1px solid var(--line); border-radius: var(--radius-m); background: var(--surface);
  }
  .info { display: flex; flex-direction: column; gap: var(--space-1); }
  .line { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-3); }
  .line.small { font-size: var(--step--1); color: var(--muted); }
  .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-left: auto; }
  .covers { display: grid; grid-template-columns: repeat(2, minmax(0, 30rem)); justify-content: center; gap: var(--space-5); }
  figure { margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
  figcaption { text-align: center; font-family: var(--font-mono); font-size: var(--step--2); letter-spacing: 0.06em; color: var(--faint); text-transform: uppercase; }
  .photo-cover { width: 100%; aspect-ratio: var(--ratio); object-fit: contain; display: block; filter: drop-shadow(0 10px 18px rgb(0 0 0 / 0.3)); }
  .cover {
    aspect-ratio: 108.2 / 150.8; position: relative;
    background: var(--spine); border: 0.55rem solid var(--band); border-radius: 3px 10px 10px 3px;
    box-shadow: inset 0.5rem 0 0 rgb(0 0 0 / 0.25), 0 10px 24px rgb(0 0 0 / 0.25);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; padding: 0.8rem 1rem 0.8rem 1.4rem;
  }
  .cover.back { background: var(--rear); border-color: var(--rear-band); border-radius: 10px 3px 3px 10px; box-shadow: inset -0.5rem 0 0 rgb(0 0 0 / 0.25), 0 10px 24px rgb(0 0 0 / 0.25); padding: 0.8rem 1.4rem 0.8rem 1rem; }
  .cover-title { font-family: var(--font-display); font-weight: 700; font-size: 0.8rem; letter-spacing: 0.1em; color: var(--label); text-align: center; line-height: 1.15; }
  .window { width: 76%; aspect-ratio: 63 / 88; border: 3px solid var(--frame); border-radius: 5px; overflow: hidden; background: rgb(0 0 0 / 0.35); display: grid; place-items: center; }
  .window.rear { width: 84%; }
  .window img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .nothing { color: var(--label); font-size: var(--step--1); padding: var(--space-3); text-align: center; }

  h2 { font-size: var(--step-2); font-weight: 680; letter-spacing: -0.01em; }
  .faint { color: var(--faint); font-size: var(--step--2); }
  .note { color: var(--muted); }
  .linkish { font: inherit; background: none; border: 0; padding: 0; color: var(--accent); cursor: pointer; }
  .linkish:hover { text-decoration: underline; }
  .btn { font-size: var(--step--1); padding: 0.45rem 0.8rem; border: 1px solid var(--line); border-radius: var(--radius-m); text-decoration: none; color: var(--fg); }
  .btn:hover { border-color: var(--accent); }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: var(--bg, #fff); }
  .viewers { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--muted); cursor: pointer; }
  .viewers input { accent-color: var(--accent); }
  .viewers.warn { color: var(--warn); }
  .status {
    font-family: var(--font-mono); font-size: var(--step--2); letter-spacing: 0.04em;
    padding: 0.1rem 0.45rem; border-radius: var(--radius-s); border: 1px solid var(--line); color: var(--muted);
  }
  .status-complete { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, transparent); }
  .status-in_progress { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }

  @media (max-width: 640px) {
    .shelf { flex-wrap: nowrap; overflow-x: auto; padding-bottom: var(--space-2); }
    .stand { padding: var(--space-3); }
    .covers { gap: var(--space-3); }
    .actions { margin-left: 0; }
  }
</style>
