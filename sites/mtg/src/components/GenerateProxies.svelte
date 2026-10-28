<script lang="ts">
  // Generate proxies on this PC: pick or describe a theme, pick cards, check the cost, then confirm.
  // Nothing is spent until "Generate" (with the plan you were shown).
  import { loadGenThemes, planGeneration, startGeneration } from "../lib/api";
  import { cardsFor, costLabel, genRequest, type NewTheme } from "../lib/gen";
  import { gen, refreshJob } from "../lib/genjob.svelte";
  import type { Deck, GenPlan, GenThemes, Proxies } from "../lib/types";

  let { deck, proxies, onClose }: { deck: Deck; proxies: Proxies | null; onClose: () => void } = $props();

  let dialog: HTMLDialogElement;
  $effect(() => {
    dialog.showModal();
    return () => dialog.open && dialog.close();
  });

  let data = $state<GenThemes | null>(null);
  let loadError = $state("");
  loadGenThemes(deck.id).then((d) => {
    data = d;
    // Default theme: the deck's own proxy set if a theme makes it, else the first theme in this deck's manifest.
    const own = d.themes.find((t) => t.proxySet && t.proxySet === deck.proxySet) ?? d.themes.find((t) => t.inThisDeck);
    themeKey = own?.key ?? (d.themes[0]?.key ?? "new");
    art = { ...d.art };
  }).catch((e) => (loadError = (e as Error).message));
  refreshJob();

  // ---- theme
  let themeKey = $state("");
  let fresh = $state<NewTheme>({ name: "", frame: "parchment", prompt: "", references: [] });
  const theme = $derived(data?.themes.find((t) => t.key === themeKey));
  const setName = (id: string | null) => proxies?.sets.find((s) => s.id === id)?.name ?? id ?? "";
  const frameName = (id: string) => data?.frames.find((f) => f.id === id)?.name ?? id;
  const targetSet = $derived(themeKey === "new" ? null : theme?.proxySet ?? null);

  // ---- cards
  let mode = $state("missing");
  let picked = $state(new Set<string>());
  let newAttempt = $state(false);
  let art = $state<Record<string, string>>({});
  const chosen = $derived(data ? cardsFor(mode, data.cards, deck, targetSet, proxies, picked) : []);
  const categories = $derived(deck.categories.filter((c) => !c.excluded && c.cards.some((e) => data?.cards.includes(e.name))));
  function toggle(name: string) {
    const next = new Set(picked);
    next.has(name) ? next.delete(name) : next.add(name);
    picked = next;
  }

  // ---- plan, then confirm
  let plan = $state<GenPlan | null>(null);
  let busy = $state(false);
  let error = $state("");
  const request = $derived(data && (themeKey === "new" || theme) ? genRequest(deck.id, themeKey === "new" ? fresh : theme!, chosen, newAttempt, art) : null);
  // Any change to the form makes the checked plan stale.
  $effect(() => { JSON.stringify(request); plan = null; });

  async function check() {
    if (!request) return;
    busy = true;
    error = "";
    try {
      const p = await planGeneration(request);
      plan = p;
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
  async function go() {
    if (!request || !plan) return;
    busy = true;
    error = "";
    try {
      gen.job = await startGeneration(request, plan.token);
      plan = null;
      refreshJob();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }

  const job = $derived(gen.job);
  const running = $derived(job?.state === "running");
  const thisDeck = $derived(job?.deck === deck.id);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} class="gen" aria-labelledby="gen-h" onclose={onClose}
  onclick={(e) => { if (e.target === dialog) dialog.close(); }}>
  <div class="sheet">
    <button class="close" aria-label="Close" onclick={() => dialog.close()}>×</button>
    <h2 id="gen-h">Generate proxies <span class="dim">· {deck.name}</span></h2>

    {#if job && job.state !== "idle" && thisDeck}
      <section class="run" class:ok={job.state === "done"} class:bad={job.state === "failed"} aria-live="polite">
        {#if running}
          <p><strong>Generating {setName(job.proxySet ?? null)}:</strong> {job.done ?? 0} of {job.total} images{#if job.current} · now {job.current}{/if}{job.step && job.step !== "generate" ? ` · ${job.step}` : ""}</p>
          <progress max={job.total} value={job.done ?? 0}></progress>
          <p class="dim small">You can close this; it keeps running on your PC. New art shows up when it's done.</p>
        {:else if job.state === "failed"}
          <p><strong>The run stopped:</strong> {job.error}</p>
        {:else}
          <p><strong>Done:</strong> {job.done} image{job.done === 1 ? "" : "s"} made{job.failed ? `, ${job.failed} failed` : ""}. Open a card to pick its best attempt; picks go into the {setName(job.proxySet ?? null)} set.</p>
        {/if}
        {#if job.log?.length}
          <details><summary class="small">Log</summary><pre>{job.log.slice(-40).join("\n")}</pre>{#if job.logFile}<p class="small dim mono">{job.logFile}</p>{/if}</details>
        {/if}
      </section>
    {/if}

    {#if loadError}
      <p class="err" role="alert">{loadError}</p>
    {:else if !data}
      <p class="dim">Loading themes…</p>
    {:else}
      <section aria-labelledby="gen-theme-h">
        <h3 id="gen-theme-h" class="eyebrow">1 · Theme</h3>
        <div class="themes" role="radiogroup" aria-label="Theme">
          {#each data.themes as t (t.key)}
            <label class="theme" class:on={themeKey === t.key}>
              <input type="radio" bind:group={themeKey} value={t.key} />
              <span class="t-name">{setName(t.proxySet) || t.style}</span>
              <span class="t-meta mono">{t.style} · {frameName(t.frame)}{t.inThisDeck ? "" : ` · from ${t.deck}`}</span>
              <span class="t-prompt">{t.prompt}</span>
              {#if t.references.length}
                <span class="refs">{#each t.references as r (r.path)}{#if r.url}<img src={r.url} alt="" loading="lazy" />{/if}{/each}</span>
              {/if}
            </label>
          {/each}
          <label class="theme new" class:on={themeKey === "new"}>
            <input type="radio" bind:group={themeKey} value="new" />
            <span class="t-name">New theme…</span>
            <span class="t-prompt">Describe a new look. It gets its own proxy set.</span>
          </label>
        </div>

        {#if themeKey === "new"}
          <div class="fresh">
            <label class="field"><span class="eyebrow">Name</span>
              <input type="text" bind:value={fresh.name} placeholder="e.g. Moss grove" id="gen-name" /></label>
            <label class="field"><span class="eyebrow">Card frame</span>
              <select bind:value={fresh.frame} id="gen-frame">
                {#each data.frames as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
              </select></label>
            <label class="field wide"><span class="eyebrow">Art description (the look of every card)</span>
              <textarea bind:value={fresh.prompt} rows="4" id="gen-prompt"
                placeholder="e.g. Lush watercolor illustration: mossy forest floor, roots and mushrooms, soft green light, detailed insects"></textarea></label>
            <fieldset class="wide">
              <legend class="eyebrow">Style references (optional, shown to the model so every card matches)</legend>
              <div class="ref-pick">
                {#each data.references as r (r.path)}
                  <label class="ref" class:on={fresh.references.includes(r.path)} title={r.name}>
                    <input type="checkbox" checked={fresh.references.includes(r.path)}
                      onchange={(e) => (fresh.references = e.currentTarget.checked ? [...fresh.references, r.path] : fresh.references.filter((x) => x !== r.path))} />
                    {#if r.url}<img src={r.url} alt={r.name} loading="lazy" />{/if}
                  </label>
                {/each}
              </div>
              <p class="small dim">Add more by putting images in <span class="mono">DeckGen/assets/refs</span>. A new card frame is made with <span class="mono">templategen.py</span> (it costs a few images too).</p>
            </fieldset>
          </div>
        {/if}
      </section>

      <section aria-labelledby="gen-cards-h">
        <h3 id="gen-cards-h" class="eyebrow">2 · Cards</h3>
        <div class="row">
          <label class="field"><span class="eyebrow">Which cards</span>
            <select bind:value={mode} id="gen-mode">
              <option value="missing">No proxy in this theme yet</option>
              <option value="all">Whole deck</option>
              {#each categories as c (c.name)}<option value={`category:${c.name}`}>Category: {c.name}</option>{/each}
              <option value="pick">Choose cards…</option>
            </select></label>
          <label class="check"><input type="checkbox" bind:checked={newAttempt} /> Also make another attempt for cards that already have art</label>
        </div>
        <p class="small">{chosen.length} card{chosen.length === 1 ? "" : "s"} chosen{data.cards.length ? ` of ${data.cards.length} (basic lands left out)` : ""}.</p>
        {#if mode === "pick"}
          <ul class="pick" role="list">
            {#each data.cards as n (n)}
              <li><label><input type="checkbox" checked={picked.has(n)} onchange={() => toggle(n)} /> {n}</label></li>
            {/each}
          </ul>
        {/if}
        {#if chosen.length}
          <details class="ideas">
            <summary class="small">Art ideas per card (optional; otherwise the art comes from the card's name and rules text)</summary>
            <ul role="list">
              {#each chosen as n (n)}
                <li>
                  <span class="small">{n}</span>
                  {#if data.art[n]}<span class="small dim">{data.art[n]}</span>
                  {:else}<input type="text" bind:value={art[n]} placeholder="what to show" aria-label={`Art idea for ${n}`} />{/if}
                </li>
              {/each}
            </ul>
          </details>
        {/if}
      </section>

      <section aria-labelledby="gen-cost-h">
        <h3 id="gen-cost-h" class="eyebrow">3 · Cost</h3>
        {#if !plan}
          <button class="btn" disabled={busy || !chosen.length || running} onclick={check}>{busy ? "Checking…" : "Check cost"}</button>
          {#if running && !thisDeck}<p class="small dim">Another run is going ({job?.deck}); wait for it to finish.</p>{/if}
        {:else}
          <div class="plan">
            {#if plan.images}
              <p class="big">{costLabel(plan.images, plan.cost.perImage, plan.cost.unit)}</p>
              <p class="small">{plan.cost.backend === "openart" ? "OpenArt" : plan.cost.backend} · {plan.cost.model} · into <strong>{plan.newSet ? `${plan.newSet.name} (new)` : setName(plan.proxySet)}</strong>{plan.cost.perImage ? "" : " · cost per image unknown: check your account"}</p>
              <details><summary class="small">{plan.run.length} card{plan.run.length === 1 ? "" : "s"} to generate</summary>
                <ul class="small" role="list">{#each plan.run as r (r.name)}<li>{r.name} <span class="dim">· {r.why}</span></li>{/each}</ul></details>
            {:else}
              <p class="big">Nothing to generate</p>
            {/if}
            {#if plan.later.length}<p class="small warn">{plan.later.length} more wait for another run (limit {plan.cost.cap} images per run, set in the manifest).</p>{/if}
            {#if plan.skipped.length}
              <details><summary class="small">{plan.skipped.length} skipped</summary>
                <ul class="small" role="list">{#each plan.skipped as s (s.name)}<li>{s.name} <span class="dim">· {s.why}</span></li>{/each}</ul></details>
            {/if}
            {#if plan.writes.length}
              <p class="small">First it will:</p>
              <ul class="small writes" role="list">{#each plan.writes as w (w)}<li>{w}</li>{/each}</ul>
            {/if}
            {#if !plan.cost.ready}<p class="err small" role="alert">{plan.cost.problem}</p>{/if}
            <div class="row">
              <button class="btn primary" disabled={busy || !plan.images || !plan.cost.ready || running} onclick={go}>
                {busy ? "Starting…" : `Generate ${costLabel(plan.images, plan.cost.perImage, plan.cost.unit)}`}
              </button>
              <button class="btn" onclick={() => (plan = null)}>Change something</button>
            </div>
          </div>
        {/if}
        {#if error}<p class="err small" role="alert">{error}</p>{/if}
      </section>
    {/if}
  </div>
</dialog>

<style>
  .gen {
    width: min(56rem, calc(100vw - 2 * max(16px, env(safe-area-inset-left, 0px))));
    max-height: calc(100dvh - 2rem); padding: 0; border: 1px solid var(--line); border-radius: var(--radius-m);
    background: var(--bg); color: var(--fg); overflow: auto;
  }
  .gen::backdrop { background: rgb(4 6 8 / 0.78); }
  .sheet { position: relative; padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5); }
  .close { position: absolute; top: var(--space-3); right: var(--space-3); width: 2.25rem; height: 2.25rem; font-size: 1.5rem; line-height: 1;
    border: 1px solid var(--line); border-radius: var(--radius-m); background: var(--surface); color: var(--fg); cursor: pointer; }
  h2 { font-size: var(--step-2); padding-right: var(--space-7); }
  h3 { margin-bottom: var(--space-3); }
  section { display: flex; flex-direction: column; gap: var(--space-2); }
  .dim { color: var(--faint); }
  .small { font-size: var(--step--1); }
  .mono { font-family: var(--font-mono); }
  .warn { color: var(--warn); }
  .err { color: var(--warn); }
  .themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: var(--space-3); }
  .theme { display: flex; flex-direction: column; gap: 4px; padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-m);
    background: var(--surface); cursor: pointer; position: relative; }
  .theme.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .theme input { position: absolute; top: var(--space-3); right: var(--space-3); }
  .t-name { font-weight: 700; padding-right: 1.5rem; }
  .t-meta { font-size: var(--step--2); color: var(--faint); }
  .t-prompt { font-size: var(--step--1); color: var(--muted); display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .refs { display: flex; gap: 4px; }
  .refs img { width: 3rem; height: 2.2rem; object-fit: cover; border-radius: var(--radius-s); }
  .fresh { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: var(--space-2); }
  .wide { grid-column: 1 / -1; }
  fieldset { border: 0; padding: 0; margin: 0; }
  .field { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
  input[type="text"], select, textarea { font: inherit; font-size: var(--step--1); color: var(--fg); background: var(--surface);
    border: 1px solid var(--line); border-radius: var(--radius-m); padding: 0.4rem 0.55rem; }
  textarea { resize: vertical; }
  .ref-pick { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: var(--space-2) 0; }
  .ref { position: relative; border: 2px solid transparent; border-radius: var(--radius-s); cursor: pointer; }
  .ref.on { border-color: var(--accent); }
  .ref input { position: absolute; top: 4px; left: 4px; }
  .ref img { width: 6rem; height: 4.2rem; object-fit: cover; display: block; border-radius: var(--radius-s); }
  .row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: end; }
  .check { font-size: var(--step--1); display: flex; gap: var(--space-2); align-items: center; }
  .pick { list-style: none; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr)); gap: 2px var(--space-3);
    font-size: var(--step--1); max-height: 18rem; overflow-y: auto;
    border: 1px solid var(--line); border-radius: var(--radius-m); padding: var(--space-2); }
  .ideas ul { list-style: none; padding: 0; margin: var(--space-2) 0 0; display: flex; flex-direction: column; gap: 4px; max-height: 18rem; overflow: auto; }
  .ideas li { display: grid; grid-template-columns: minmax(0, 14rem) minmax(0, 1fr); gap: var(--space-2); align-items: center; }
  .plan { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-m); background: var(--surface); }
  .big { font-size: var(--step-1); font-weight: 700; }
  .writes { margin: 0; padding-left: 1.2rem; }
  .plan ul:not(.writes) { list-style: none; padding: 0; margin: var(--space-1) 0 0; }
  .run { padding: var(--space-3) var(--space-4); border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: var(--radius-m); background: var(--surface); }
  .run.ok { border-left-color: var(--good); }
  .run.bad { border-left-color: var(--warn); }
  progress { width: 100%; accent-color: var(--accent); }
  pre { font-family: var(--font-mono); font-size: var(--step--2); white-space: pre-wrap; max-height: 14rem; overflow: auto; background: var(--bg); padding: var(--space-2); border-radius: var(--radius-s); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.45rem 0.85rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--surface); color: var(--fg); cursor: pointer; align-self: start; }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); font-weight: 700; }
  .btn:disabled { opacity: 0.5; cursor: default; }
  @media (max-width: 640px) {
    .sheet { padding: var(--space-4); }
    .fresh { grid-template-columns: 1fr; }
    .ideas li { grid-template-columns: 1fr; }
  }
</style>
