<script lang="ts">
  // Hosted page only: where the data comes from, and connecting to / disconnecting from this PC.
  import { conn, connect, disconnect } from "../lib/connection.svelte";

  let { onChanged }: { onChanged: () => Promise<void> } = $props();
  let open = $state(false);

  const when = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

  async function goLive() {
    if (await connect()) {
      open = false;
      await onChanged();
    }
  }
  async function goSnapshot() {
    disconnect();
    open = false;
    await onChanged();
  }

  const upload = $derived.by(() => {
    const u = conn.upload;
    if (!u || u.state === "off") return "Automatic upload is off";
    if (u.state === "pending" || u.state === "uploading") return "Uploading changes…";
    if (u.state === "ok") return `Uploaded ${when(u.at)}`;
    if (u.state === "failed") return `Upload failed: ${u.message}`;
    return "Changes upload automatically";
  });
</script>

<div class="badge" class:live={conn.mode === "live"}>
  <button class="pill" onclick={() => (open = !open)} aria-expanded={open} aria-controls="conn-panel">
    <span class="dot" aria-hidden="true"></span>
    {#if conn.mode === "live"}Live from this computer{:else if conn.connecting}Connecting…{:else}Last upload{conn.snapshotAt ? ` · ${when(conn.snapshotAt)}` : ""}{/if}
  </button>
  {#if open}
    <div class="panel" id="conn-panel">
      {#if conn.mode === "live"}
        <p>Showing live data from Deck Shelf on this computer. Editing and DeckGen work here.</p>
        <p class="dim" class:warn={conn.upload?.state === "failed"}>{upload}</p>
        <button class="btn" onclick={goSnapshot}>Show the last upload instead</button>
      {:else}
        <p>Showing the last upload{conn.snapshotAt ? ` (${when(conn.snapshotAt)})` : ""}, read-only.</p>
        <p class="dim">At your PC? Start <code>python DeckSite/server.py</code> and connect to edit and use DeckGen.</p>
        <button class="btn primary" onclick={goLive} disabled={conn.connecting}>{conn.connecting ? "Connecting…" : "Connect to this computer"}</button>
        {#if conn.error}<p class="warn" role="alert">{conn.error}</p>{/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .badge {
    position: fixed; z-index: 15;
    left: max(var(--space-3), env(safe-area-inset-left, 0px));
    bottom: calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
    display: flex; flex-direction: column-reverse; align-items: start; gap: var(--space-2);
    max-width: min(26rem, calc(100vw - 32px));
  }
  .pill {
    display: inline-flex; align-items: center; gap: var(--space-2);
    font: inherit; font-size: var(--step--1); padding: 0.4rem 0.75rem;
    border: 1px solid var(--line); border-radius: 99px; background: var(--surface); color: var(--muted); cursor: pointer;
    box-shadow: 0 8px 24px -12px rgb(0 0 0 / 0.6);
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--faint); }
  .live .pill { color: var(--fg); border-color: color-mix(in srgb, var(--good) 50%, var(--line)); }
  .live .dot { background: var(--good); box-shadow: 0 0 0 3px color-mix(in srgb, var(--good) 25%, transparent); }
  .panel {
    background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-m);
    padding: var(--space-3) var(--space-4); display: flex; flex-direction: column; gap: var(--space-2);
    font-size: var(--step--1); box-shadow: 0 12px 30px -14px rgb(0 0 0 / 0.7);
  }
  .dim { color: var(--faint); }
  .warn { color: var(--warn); }
  code { font-family: var(--font-mono); font-size: var(--step--2); background: var(--surface-2); padding: 0.05rem 0.3rem; border-radius: var(--radius-s); }
  .btn { align-self: start; font: inherit; font-size: var(--step--1); padding: 0.4rem 0.75rem; border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); font-weight: 700; }
  .btn:disabled { opacity: 0.6; cursor: progress; }
</style>
