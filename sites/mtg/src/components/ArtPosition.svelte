<script lang="ts">
  // Drag, zoom and mirror a DeckGen card's art inside its frame; preview the real card; save.
  // Saving only re-renders this card (no image generation) and publishes it into the proxy set.
  import { loadArtPosition, previewArtPosition, saveArtPosition } from "../lib/api";
  import { CENTERED, artStyle, dragBy, sameFocus, zoomTo, type ArtPosition, type Focus } from "../lib/artpos";

  let { deckId, style, card, onSaved, onClose }: {
    deckId: string; style: string; card: string; onSaved: (message: string) => Promise<void>; onClose: () => void;
  } = $props();

  const target = $derived({ deck: deckId, style, card });
  let info = $state<ArtPosition | null>(null);
  let error = $state("");
  let focus = $state<Focus>({ ...CENTERED });
  let saved = $state<Focus>({ ...CENTERED });
  let viewWidth = $state(0);

  $effect(() => {
    info = null;
    error = "";
    loadArtPosition(target).then((i) => {
      info = i;
      focus = { ...i.focus };
      saved = { ...i.focus };
    }).catch((e) => (error = (e as Error).message));
  });

  // The exact card, rendered by DeckGen, shortly after each change.
  let preview = $state<string | null>(null);
  let previewing = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (!info) return;
    const f = { ...focus };
    clearTimeout(timer);
    timer = setTimeout(async () => {
      previewing = true;
      try { preview = await previewArtPosition(target, f); } catch (e) { error = (e as Error).message; }
      previewing = false;
    }, 450);
    return () => clearTimeout(timer);
  });

  // Dragging and the mouse wheel.
  let drag: { x: number; y: number; start: Focus } | null = null;
  function down(e: PointerEvent) {
    if (!info) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, start: { ...focus } };
  }
  function move(e: PointerEvent) {
    if (!drag || !info) return;
    focus = dragBy(info.artSize, info.window, drag.start, e.clientX - drag.x, e.clientY - drag.y, viewWidth);
  }
  function up() { drag = null; }
  function wheel(e: WheelEvent) {
    if (!info) return;
    e.preventDefault();
    focus = zoomTo(info.artSize, info.window, focus, focus.zoom * (e.deltaY > 0 ? 1.08 : 1 / 1.08));
  }
  function nudge(e: KeyboardEvent) {
    if (!info) return;
    const step = e.shiftKey ? 40 : 8;
    const d = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!d) return;
    e.preventDefault();
    focus = dragBy(info.artSize, info.window, focus, d[0], d[1], viewWidth);
  }

  const closer = $derived(Math.round((1 / focus.zoom) * 100) / 100);
  let busy = $state(false);
  async function save(f: Focus | null) {
    busy = true;
    error = "";
    try {
      const msg = await saveArtPosition(target, f);
      saved = f ? { ...f } : { ...CENTERED };
      focus = { ...saved };
      await onSaved(msg);
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<div class="editor" aria-label={`Reposition the art of ${card}`}>
  {#if error}<p class="err" role="alert">{error}</p>{/if}
  {#if !info}
    {#if !error}<p class="dim">Loading the art…</p>{/if}
  {:else if info.crops}
    <p class="dim">{card} is cut into several crops of one image; set their positions in the DeckGen file.</p>
  {:else}
    <div class="panes">
      <div class="left">
        <p class="eyebrow">Drag to move · scroll to zoom</p>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="window" style:aspect-ratio={`${info.window[0]} / ${info.window[1]}`} bind:clientWidth={viewWidth}
          role="application" aria-label="Art window: drag to move, arrow keys to nudge" tabindex="0"
          onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} onwheel={wheel} onkeydown={nudge}>
          {#if viewWidth}
            <div class="inner" class:flip={focus.flip}>
              <img src={info.art} alt="" draggable="false" style={artStyle(info.artSize, info.window, focus, viewWidth)} />
            </div>
          {/if}
        </div>
        <div class="controls">
          <label class="zoom"><span class="small">Zoom</span>
            <input type="range" min="1" max="4" step="0.01" value={closer}
              oninput={(e) => (focus = zoomTo(info!.artSize, info!.window, focus, 1 / Number(e.currentTarget.value)))} />
            <span class="mono small">{closer.toFixed(2)}×</span>
          </label>
          <label class="small"><input type="checkbox" bind:checked={focus.flip} /> Mirror</label>
          <button class="link" onclick={() => (focus = { ...CENTERED })}>Center</button>
        </div>
      </div>
      <div class="right">
        <p class="eyebrow">The card{previewing ? " · updating…" : ""}</p>
        {#if preview}<img class="card" src={preview} alt={`${card} with this art position`} />{/if}
      </div>
    </div>
    <div class="actions">
      <button class="btn primary" disabled={busy || sameFocus(focus, saved)} onclick={() => save(focus)}>{busy ? "Saving…" : "Save position"}</button>
      <button class="btn" disabled={busy} onclick={onClose}>Close</button>
      <span class="dim small">Saving re-renders this card and adds it to the proxy set. Nothing is generated.</span>
    </div>
  {/if}
</div>

<style>
  .editor { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--line); border-radius: var(--radius-m); background: var(--surface); }
  .panes { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 13rem); gap: var(--space-5); align-items: start; }
  .left, .right { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
  .window { position: relative; width: 100%; overflow: hidden; border-radius: var(--radius-s); background: var(--bg); cursor: grab; touch-action: none; outline-offset: 3px; }
  .window:active { cursor: grabbing; }
  .window:focus-visible { outline: 2px solid var(--accent); }
  .window img { position: absolute; left: 0; top: 0; max-width: none; user-select: none; pointer-events: none; transform-origin: 0 0; }
  .inner { position: absolute; inset: 0; }
  .inner.flip { transform: scaleX(-1); }
  .controls { display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; }
  .zoom { display: flex; align-items: center; gap: var(--space-2); }
  .zoom input { width: 9rem; accent-color: var(--accent); }
  .card { width: 100%; border-radius: 4.6% / 3.3%; box-shadow: 0 10px 26px -12px rgb(0 0 0 / 0.7); }
  .actions { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
  .small { font-size: var(--step--1); }
  .mono { font-family: var(--font-mono); }
  .dim { color: var(--faint); }
  .err { color: var(--warn); font-size: var(--step--1); }
  .btn { font: inherit; font-size: var(--step--1); padding: 0.4rem 0.75rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); font-weight: 700; }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .link { font: inherit; font-size: var(--step--1); border: 0; background: none; padding: 0; color: var(--accent); cursor: pointer; text-decoration: underline; }
  @media (max-width: 640px) { .panes { grid-template-columns: minmax(0, 1fr); } .right { max-width: 13rem; } }
</style>
