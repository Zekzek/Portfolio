<script lang="ts">
  import { manaSymbols, symbolUrl } from "../lib/deck";

  let { cost = "", size = "1.05em" }: { cost?: string; size?: string } = $props();
  const symbols = $derived(manaSymbols(cost));
</script>

<span class="mana" aria-label={cost}>
  {#each symbols as s, i (i)}
    <img src={symbolUrl(s)} alt={`{${s}}`} style:width={size} style:height={size} loading="lazy" />
  {/each}
</span>

<style>
  .mana { display: inline-flex; gap: 2px; vertical-align: -0.15em; }
  img { display: inline-block; filter: drop-shadow(0 1px 0 rgb(0 0 0 / 0.35)); }
</style>
