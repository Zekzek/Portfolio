<script lang="ts">
  import type { Card, DeckEntry } from "../lib/types";

  let { entry, card, image, proxy = false, original = false, href }: {
    entry: DeckEntry; card?: Card; image: string | null; proxy?: boolean; original?: boolean; href: string;
  } = $props();
</script>

<a class="tile" {href} title={entry.note ? `${entry.name}: ${entry.note}` : entry.name}>
  {#if image}
    <img src={image} alt={entry.name} loading="lazy" decoding="async" class:proxy />
  {:else}
    <span class="missing">
      <span class="missing-name">{entry.name}</span>
      <span class="missing-type">{card?.type_line ?? "Not in card data"}</span>
    </span>
  {/if}
  {#if entry.count > 1}<span class="count mono">×{entry.count}</span>{/if}
  {#if original}<span class="orig mono" title="No proxy in this set yet: showing the original card">original</span>{/if}
  {#if entry.note}<span class="note-mark" aria-label={`Note: ${entry.note}`}>✎</span>{/if}
</a>

<style>
  .tile {
    position: relative; display: block;
    aspect-ratio: 63 / 88;
    border-radius: 4.6% / 3.3%;
    overflow: hidden;
    background: var(--surface-2);
    box-shadow: 0 1px 0 rgb(0 0 0 / 0.25), 0 6px 16px -8px rgb(0 0 0 / 0.5);
    transition: transform 140ms ease, box-shadow 140ms ease;
  }
  .tile:hover { transform: translateY(-3px) scale(1.015); box-shadow: 0 0 0 2px var(--accent), 0 10px 24px -10px rgb(0 0 0 / 0.6); }
  img { width: 100%; height: 100%; object-fit: cover; }
  .missing { position: absolute; inset: 0; padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-1); border: 1px dashed var(--line); border-radius: inherit; color: var(--fg); }
  .missing-name { font-weight: 700; font-size: var(--step--1); }
  .missing-type { font-size: var(--step--2); color: var(--muted); }
  .orig {
    position: absolute; top: 3%; right: 5%;
    background: color-mix(in srgb, var(--bg) 85%, transparent); color: var(--muted);
    font-size: var(--step--2); padding: 0.05rem 0.35rem; border-radius: var(--radius-s);
  }
  .note-mark {
    position: absolute; left: 6%; bottom: 4%;
    background: var(--accent); color: var(--on-accent);
    font-size: var(--step--1); line-height: 1; padding: 0.2rem 0.3rem; border-radius: var(--radius-s);
  }
  .count {
    position: absolute; right: 6%; bottom: 4%;
    background: color-mix(in srgb, var(--bg) 82%, transparent); color: var(--fg);
    font-size: var(--step--1); font-weight: 600; padding: 0.05rem 0.4rem; border-radius: var(--radius-s);
  }
</style>
