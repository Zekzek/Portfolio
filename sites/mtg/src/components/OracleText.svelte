<script lang="ts">
  // Rules text with {T}, {G} etc. drawn as symbols and reminder text dimmed.
  import { symbolUrl } from "../lib/deck";

  let { text = "" }: { text?: string } = $props();

  type Part = { kind: "text" | "sym" | "reminder"; value: string };
  function parts(line: string): Part[] {
    const out: Part[] = [];
    for (const chunk of line.split(/(\([^)]*\))/)) {
      if (!chunk) continue;
      if (chunk.startsWith("(") && chunk.endsWith(")")) { out.push({ kind: "reminder", value: chunk }); continue; }
      for (const bit of chunk.split(/(\{[^}]+\})/)) {
        if (!bit) continue;
        out.push(bit.startsWith("{") ? { kind: "sym", value: bit.slice(1, -1) } : { kind: "text", value: bit });
      }
    }
    return out;
  }
  const lines = $derived(text.split("\n").map(parts));
</script>

<div class="oracle">
  {#each lines as line, i (i)}
    <p>
      {#each line as p, j (j)}
        {#if p.kind === "sym"}<img src={symbolUrl(p.value)} alt={`{${p.value}}`} />{:else if p.kind === "reminder"}<i>{p.value}</i>{:else}{p.value}{/if}
      {/each}
    </p>
  {/each}
</div>

<style>
  .oracle { display: flex; flex-direction: column; gap: var(--space-2); }
  p { margin: 0; }
  p:empty { display: none; }
  img { width: 1em; height: 1em; vertical-align: -0.12em; margin: 0 1px; }
  i { color: var(--muted); }
</style>
