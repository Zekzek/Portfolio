<script lang="ts">
  // Same behavior as @zekzek/ui ThemeToggle.astro, for use inside Svelte views.
  const root = document.documentElement;
  const current = () =>
    root.dataset.theme ?? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  let theme = $state(current());

  function toggle() {
    theme = current() === "dark" ? "light" : "dark";
    root.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch {}
  }
</script>

<button type="button" class="theme-toggle" onclick={toggle}
  aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
  </svg>
</button>

<style>
  .theme-toggle {
    display: inline-grid; place-items: center;
    width: 2.25rem; height: 2.25rem; flex: none;
    border: 1px solid var(--line); border-radius: var(--radius-m);
    background: transparent; color: var(--muted); cursor: pointer;
  }
  .theme-toggle:hover { color: var(--fg); border-color: var(--faint); }
</style>
