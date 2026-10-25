import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";

// While developing, data and actions come from the local Python server (MTG/DeckSite/server.py).
const deckSite = "http://127.0.0.1:8765";

export default defineConfig({
  integrations: [svelte()],
  server: { port: 4330 },
  vite: {
    server: {
      proxy: Object.fromEntries(["/data", "/api", "/img", "/art", "/proxy"].map((p) => [p, deckSite])),
    },
  },
});
