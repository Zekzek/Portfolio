<script lang="ts">
  import { signIn } from "../lib/hosted";

  let { error }: { error?: string } = $props();
  let busy = $state(false);
  let failed = $state<string | null>(null);

  async function go() {
    busy = true;
    failed = null;
    try {
      await signIn(); // leaves for Google's sign-in page
    } catch (e) {
      failed = (e as Error).message;
      busy = false;
    }
  }
</script>

<main class="signin">
  <p class="eyebrow">Commander decks</p>
  <h1>Deck Shelf</h1>
  <p class="lede">Decks, card text and proxy art. Private: sign in with an allowed Google account.</p>
  <button class="google" onclick={go} disabled={busy}>
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.7 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.1z"/>
      <path fill="#FBBC05" d="M10.5 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/>
    </svg>
    {busy ? "Opening Google…" : "Sign in with Google"}
  </button>
  {#if error || failed}<p class="error" role="alert">{error ?? failed}</p>{/if}
</main>

<style>
  .signin {
    max-width: 30rem; margin: 0 auto; min-height: 100%;
    padding: var(--space-8) max(16px, env(safe-area-inset-right, 0px)) var(--space-8) max(16px, env(safe-area-inset-left, 0px));
    display: flex; flex-direction: column; gap: var(--space-4); justify-content: center;
  }
  h1 { font-size: var(--step-4); letter-spacing: -0.025em; font-weight: 720; }
  .lede { color: var(--muted); }
  .google {
    align-self: start; display: inline-flex; align-items: center; gap: var(--space-3);
    font: inherit; font-weight: 700; padding: 0.7rem 1.1rem;
    border-radius: var(--radius-m); border: 1px solid var(--line); background: var(--surface); color: var(--fg); cursor: pointer;
  }
  .google:hover:not(:disabled) { border-color: var(--accent); }
  .google:disabled { opacity: 0.7; cursor: progress; }
  .error { color: var(--warn); }
</style>
