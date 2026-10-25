<script lang="ts">
  // Add a card to the deck: Scryfall name suggestions, a category (existing or new), a count.
  import { suggestNames } from "../lib/api";

  let { categories, busy, onAdd }: {
    categories: string[]; busy: boolean; onAdd: (name: string, category: string, count: number) => Promise<boolean>;
  } = $props();

  const NEW = "__new__";
  let name = $state("");
  let category = $state(categories[0] ?? "Uncategorized");
  let newCategory = $state("");
  let count = $state(1);
  let suggestions = $state<string[]>([]);
  let timer: ReturnType<typeof setTimeout>;

  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(async () => (suggestions = await suggestNames(name)), 200);
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const cat = category === NEW ? newCategory.trim() : category;
    if (!name.trim() || !cat) return;
    if (await onAdd(name.trim(), cat, count)) {
      name = "";
      count = 1;
      suggestions = [];
    }
  }
</script>

<form class="add" onsubmit={submit}>
  <label class="field grow">
    <span class="eyebrow">Add card</span>
    <input type="text" bind:value={name} oninput={onInput} list="card-suggestions" placeholder="Card name" autocomplete="off" id="add-card-name" />
    <datalist id="card-suggestions">{#each suggestions as s (s)}<option value={s}></option>{/each}</datalist>
  </label>
  <label class="field">
    <span class="eyebrow">To</span>
    <select bind:value={category} id="add-card-category">
      {#each categories as c (c)}<option value={c}>{c}</option>{/each}
      <option value={NEW}>New category…</option>
    </select>
  </label>
  {#if category === NEW}
    <label class="field">
      <span class="eyebrow">New category</span>
      <input type="text" bind:value={newCategory} placeholder="e.g. Ramp" id="add-card-new-category" />
    </label>
  {/if}
  <label class="field small">
    <span class="eyebrow">Copies</span>
    <input type="number" min="1" bind:value={count} id="add-card-count" />
  </label>
  <button class="btn primary" disabled={busy || !name.trim()}>Add</button>
</form>

<style>
  .add { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: end; }
  .field { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
  .grow { flex: 1 1 14rem; }
  .small input { width: 4.5rem; }
  input, select {
    font: inherit; font-size: var(--step--1); color: var(--fg);
    background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-m); padding: 0.4rem 0.55rem;
  }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.45rem 0.9rem; border-radius: var(--radius-m); border: 1px solid var(--accent); background: var(--accent); color: var(--on-accent); font-weight: 700; cursor: pointer; }
  .btn:disabled { opacity: 0.5; cursor: default; }
</style>
