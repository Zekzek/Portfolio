<script lang="ts">
  import type { BackFace, Card, DeckEntry } from "../lib/types";

  let { entry, card, image, proxy = false, original = false, badge = null, badgeTitle = "", arts = 1, back = null, href }: {
    entry: DeckEntry; card?: Card; image: string | null; proxy?: boolean; original?: boolean;
    badge?: string | null; badgeTitle?: string; arts?: number; back?: BackFace | null; href: string;
  } = $props();

  let flipped = $state(false);
  const showing = $derived(flipped && back ? back : { name: entry.name, image, proxy, original });
</script>

<div class="tile">
  <a class="face" {href} title={entry.note ? `${entry.name}: ${entry.note}` : showing.name}>
    {#if showing.image}
      <img src={showing.image} alt={showing.name} loading="lazy" decoding="async" class:proxy={showing.proxy} />
    {:else}
      <span class="missing">
        <span class="missing-name">{showing.name}</span>
        <span class="missing-type">{flipped ? "Back face" : (card?.type_line ?? "Not in card data")}</span>
      </span>
    {/if}
  </a>
  <!-- Tags sit on the card's top and bottom edges, over the border, so they hide little of the card. -->
  {#if badge !== null || back || showing.original}
    <div class="edge top">
      <span class="side">
        {#if badge !== null}<span class="tag badge mono" title={badgeTitle}>{badge}</span>{/if}
        {#if back}
          <button class="tag flip mono" aria-pressed={flipped}
            title={flipped ? `Show the front: ${entry.name}` : `Show the back: ${back.name}`}
            onclick={() => (flipped = !flipped)}>↻ {flipped ? "front" : "back"}</button>
        {/if}
      </span>
      {#if showing.original}<span class="tag orig mono" title="No proxy in this set yet: showing the original card">original</span>{/if}
    </div>
  {/if}
  {#if (arts > 1 && !flipped) || entry.note || entry.count > 1}
    <div class="edge bottom">
      <span class="side">
        {#if arts > 1 && !flipped}<span class="tag arts mono" title={`${arts} different arts for this card in this set`}>{arts} arts</span>{/if}
        {#if entry.note}<span class="tag note-mark" aria-label={`Note: ${entry.note}`} title={entry.note}>✎</span>{/if}
      </span>
      {#if entry.count > 1}<span class="tag count mono">×{entry.count}</span>{/if}
    </div>
  {/if}
</div>

<style>
  .tile {
    position: relative; display: block;
    aspect-ratio: 63 / 88;
    border-radius: 4.6% / 3.3%;
    background: var(--surface-2);
    box-shadow: 0 1px 0 rgb(0 0 0 / 0.25), 0 6px 16px -8px rgb(0 0 0 / 0.5);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }
  .tile:hover { transform: translateY(-3px) scale(1.015); box-shadow: 0 0 0 2px var(--accent), 0 10px 24px -10px rgb(0 0 0 / 0.6); }
  /* The card itself is clipped to its rounded corners; the tags sit outside it. */
  .face { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; display: block; color: inherit; }
  img { width: 100%; height: 100%; object-fit: cover; }
  .missing { position: absolute; inset: 0; padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-1); border: 1px dashed var(--line); border-radius: inherit; color: var(--fg); }
  .missing-name { font-weight: 700; font-size: var(--step--1); }
  .missing-type { font-size: var(--step--2); color: var(--muted); }

  /* Half on the card's border, half outside it. */
  .edge {
    position: absolute; left: 5%; right: 5%; z-index: 1;
    display: flex; justify-content: space-between; align-items: center; gap: var(--space-1);
    pointer-events: none;
  }
  .edge.top { top: 0; transform: translateY(-60%); }
  .edge.bottom { bottom: 0; transform: translateY(60%); }
  .side { display: flex; gap: var(--space-1); align-items: center; }
  .tag {
    background: var(--bg); border: 1px solid var(--line); line-height: 1.3;
    font-size: var(--step--2); padding: 0.05rem 0.35rem; border-radius: var(--radius-s);
    pointer-events: auto;
  }
  .badge { color: var(--accent); font-weight: 700; }
  .orig { color: var(--muted); }
  .arts { color: var(--accent); }
  .count { color: var(--fg); font-weight: 600; }
  .note-mark { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .flip { color: var(--fg); cursor: pointer; font-family: var(--font-mono, monospace); }
  .flip:hover, .flip:focus-visible { border-color: var(--accent); color: var(--accent); }
  .flip[aria-pressed="true"] { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
</style>
