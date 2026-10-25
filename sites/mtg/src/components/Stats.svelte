<script lang="ts">
  import { symbolUrl } from "../lib/deck";

  let { curve, types, pips }: {
    curve: number[]; types: { type: string; count: number }[]; pips: Record<string, number>;
  } = $props();

  const peak = $derived(Math.max(1, ...curve));
  const nonland = $derived(curve.reduce((a, b) => a + b, 0));
  const lands = $derived(types.find((t) => t.type === "Land")?.count ?? 0);
  const pipList = $derived(["W", "U", "B", "R", "G"].filter((c) => pips[c]).map((c) => ({ c, n: pips[c] })));
</script>

<section class="stats" aria-label="Deck stats">
  <div>
    <h2 class="eyebrow">Mana curve <span class="dim">· {nonland} nonland</span></h2>
    <div class="curve" role="img" aria-label={curve.map((n, i) => `${i === 7 ? "7+" : i}: ${n}`).join(", ")}>
      {#each curve as n, i (i)}
        <div class="col">
          <span class="n mono">{n || ""}</span>
          <span class="bar" style:height={`${(n / peak) * 100}%`}></span>
          <span class="x mono">{i === 7 ? "7+" : i}</span>
        </div>
      {/each}
    </div>
  </div>

  <div>
    <h2 class="eyebrow">Types</h2>
    <ul class="types" role="list">
      {#each types as t (t.type)}
        <li><span>{t.type}</span><span class="mono">{t.count}</span></li>
      {/each}
    </ul>
  </div>

  {#if pipList.length}
    <div>
      <h2 class="eyebrow">Color symbols in costs</h2>
      <ul class="pips" role="list">
        {#each pipList as p (p.c)}
          <li><img src={symbolUrl(p.c)} alt={`{${p.c}}`} /><span class="mono">{p.n}</span></li>
        {/each}
      </ul>
      <p class="dim lands">{lands} lands</p>
    </div>
  {/if}
</section>

<style>
  .stats { display: flex; flex-direction: column; gap: var(--space-5); }
  h2 { margin-bottom: var(--space-2); font-family: var(--font-mono); font-weight: 500; }
  .dim { color: var(--faint); text-transform: none; letter-spacing: 0; }
  .curve { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; height: 7.5rem; align-items: end; }
  .col { display: grid; grid-template-rows: auto 1fr auto; height: 100%; align-items: end; justify-items: center; gap: 2px; }
  .bar { width: 100%; min-height: 1px; background: var(--accent); border-radius: 2px 2px 0 0; align-self: end; }
  .n { font-size: var(--step--2); color: var(--muted); }
  .x { font-size: var(--step--2); color: var(--faint); border-top: 1px solid var(--line); width: 100%; text-align: center; padding-top: 2px; }
  .types { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; font-size: var(--step--1); }
  .types li { display: flex; justify-content: space-between; border-bottom: 1px dotted var(--line); padding: 2px 0; }
  .types .mono { color: var(--muted); }
  .pips { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--space-3); }
  .pips li { display: flex; align-items: center; gap: var(--space-1); font-size: var(--step--1); }
  .pips img { width: 1.1rem; height: 1.1rem; }
  .lands { margin-top: var(--space-2); font-size: var(--step--1); }
</style>
