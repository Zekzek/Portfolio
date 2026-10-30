<script lang="ts">
  import { loadArt, loadCards, loadDecks, loadProxies, loadSnapshotMeta, loadVersions } from "../lib/api";
  import { conn, connect, disconnect, refreshStatus } from "../lib/connection.svelte";
  import ConnectionBadge from "./ConnectionBadge.svelte";
  import { HOSTED, authState, type AuthState } from "../lib/hosted";
  import { parseRoute, type Route } from "../lib/route";
  import type { Art, Cards, Deck, Proxies } from "../lib/types";
  import CompareView from "./CompareView.svelte";
  import DeckList from "./DeckList.svelte";
  import SearchView from "./SearchView.svelte";
  import DeckView from "./DeckView.svelte";
  import HistoryView from "./HistoryView.svelte";
  import SignIn from "./SignIn.svelte";

  let decks = $state<Deck[] | null>(null);
  let cards = $state<Cards>({});
  let art = $state<Art>({});
  let proxies = $state<Proxies | null>(null);
  let error = $state<string | null>(null);
  let route = $state<Route>(parseRoute(location.hash));

  async function load() {
    try {
      [decks, cards, art, proxies] = await Promise.all([loadDecks(), loadCards(), loadArt(), loadProxies().catch(() => null)]);
      error = null;
      if (conn.mode === "snapshot") loadSnapshotMeta().then((m) => (conn.snapshotAt = m.exportedAt)).catch(() => {});
    } catch (e) {
      error = (e as Error).message;
    }
  }

  /** After a pick or reroll: only the art changes. */
  async function reloadArt() {
    [art, proxies] = await Promise.all([loadArt(), loadProxies().catch(() => proxies)]);
  }

  $effect(() => {
    const onHash = () => (route = parseRoute(location.hash));
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  });

  // Hosted: sign in first. Locally there's nothing to sign in to.
  let auth = $state<AuthState | null>(HOSTED ? null : { signedIn: true, email: "" });
  if (HOSTED) {
    authState()
      .then(async (a) => {
        auth = a;
        if (!a.signedIn) return;
        await connect(true); // only if this browser connected to its PC before
        await load();
      })
      .catch((e) => { auth = { signedIn: false, error: (e as Error).message }; });
  } else {
    load();
  }

  // Hosted art links are signed for an hour; refresh them well before that.
  $effect(() => {
    if (!HOSTED) return;
    const timer = setInterval(() => { if (auth?.signedIn) reloadArt().catch(() => {}); }, 40 * 60 * 1000);
    return () => clearInterval(timer);
  });

  // Decks can change outside this tab (deck.py in a Claude conversation, another tab). Check when the
  // tab comes back into view and every 30 seconds while it's visible; reload if any version moved.
  let notice = $state<string | null>(null);
  async function checkForChanges() {
    if (!decks || document.hidden) return;
    if (conn.mode === "live" && !(await refreshStatus())) {
      disconnect(false);
      notice = "Lost the connection to this computer's Deck Shelf; showing the last upload.";
      setTimeout(() => (notice = null), 8000);
      await load();
      return;
    }
    try {
      const versions = await loadVersions();
      const changed = decks.filter((d) => versions[d.id] !== undefined && versions[d.id] !== d.version);
      const added = Object.keys(versions).filter((id) => !decks!.some((d) => d.id === id));
      if (changed.length || added.length) {
        await load();
        const names = [...changed.map((d) => `${d.name} (now version ${versions[d.id]})`), ...added];
        notice = `Updated from outside this page: ${names.join(", ")}`;
        setTimeout(() => (notice = null), 8000);
      }
    } catch {}
  }
  $effect(() => {
    const timer = setInterval(checkForChanges, 30000);
    addEventListener("focus", checkForChanges);
    document.addEventListener("visibilitychange", checkForChanges);
    return () => {
      clearInterval(timer);
      removeEventListener("focus", checkForChanges);
      document.removeEventListener("visibilitychange", checkForChanges);
    };
  });

  // A new page starts at the top; opening or closing a card keeps your place.
  const pageKey = $derived(
    route.view === "deck" ? `deck:${route.deck}`
    : route.view === "compare" ? `compare:${route.decks.join(",")}`
    : route.view,
  );
  let lastPage = "";
  $effect(() => {
    if (pageKey !== lastPage) {
      if (lastPage) scrollTo({ top: 0 });
      lastPage = pageKey;
    }
  });

  const deck = $derived(route.view === "deck" || route.view === "history" ? decks?.find((d) => d.id === route.deck) : undefined);
</script>

{#if notice}<p class="notice" role="status">{notice}</p>{/if}
{#if HOSTED && auth?.signedIn}<ConnectionBadge onChanged={load} />{/if}

{#if !auth}
  <div class="state"><p class="eyebrow">Checking sign-in…</p></div>
{:else if !auth.signedIn}
  <SignIn error={auth.error} />
{:else if error}
  <div class="state">
    <h1>Can't load the decks</h1>
    <p>{error}</p>
    {#if HOSTED}
      <p class="hint">The deck data may not have been uploaded yet: in your MTG folder run <code>python DeckSite/export.py</code>.</p>
    {:else}
      <p class="hint">The page needs the local server. In your MTG folder run <code>python DeckSite/server.py</code>, then reload.</p>
    {/if}
    <button class="btn" onclick={load}>Try again</button>
  </div>
{:else if !decks}
  <div class="state"><p class="eyebrow">Loading decks…</p></div>
{:else if route.view === "deck" && deck}
  {#key deck.id}
    <DeckView {deck} {decks} {cards} {proxies} art={art[deck.id]} openCard={route.view === "deck" ? route.card : undefined} onArtChanged={reloadArt} onDataChanged={load} />
  {/key}
{:else if route.view === "history" && deck}
  <HistoryView {deck} onDataChanged={load} />
{:else if route.view === "compare"}
  <CompareView ids={route.decks} {decks} {cards} {art} {proxies} openCard={route.card} onArtChanged={reloadArt} />
{:else if route.view === "search"}
  <SearchView q={route.q} {decks} {cards} {art} {proxies} openCard={route.card} onArtChanged={reloadArt} />
{:else}
  <DeckList {decks} {cards} {proxies} email={auth.signedIn ? auth.email : ""} />
{/if}

<style>
  .state {
    max-width: 40rem;
    margin: 0 auto;
    padding: var(--space-8) max(16px, env(safe-area-inset-left, 0px));
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .hint { color: var(--muted); }
  .notice {
    position: fixed; z-index: 20; left: 50%; transform: translateX(-50%);
    bottom: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
    max-width: min(40rem, calc(100vw - 32px)); padding: var(--space-2) var(--space-4);
    background: var(--surface); color: var(--fg); border: 1px solid var(--accent); border-radius: var(--radius-m);
    box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.6); font-size: var(--step--1);
  }
  code { font-family: var(--font-mono); font-size: 0.92em; background: var(--surface-2); padding: 0.1em 0.35em; border-radius: var(--radius-s); }
</style>
