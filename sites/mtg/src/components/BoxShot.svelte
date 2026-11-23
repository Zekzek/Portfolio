<script lang="ts">
  // One side of a deck's box, alone on a clear page: DeckBox/shots.py photographs it for the shelf.
  import { onMount } from "svelte";
  import { backCover, cardImage } from "../lib/shelf";
  import type { BoxSide } from "../lib/route";
  import type { Cards, Deck, Proxies } from "../lib/types";
  import DeckBoxView from "./DeckBoxView.svelte";

  let { deck, cards, proxies, side }: { deck: Deck; cards: Cards; proxies: Proxies | null; side: BoxSide } = $props();
  const rear = $derived(backCover(deck, cards, proxies));
  onMount(() => {
    for (const el of [document.documentElement, document.body]) el.style.background = "transparent";
  });
</script>

{#key side}
  <DeckBoxView box={deck.box!} colors={deck.colors} shot={side}
    commanderImage={cardImage(deck, deck.commanderNames[0], cards, proxies)}
    backImage={rear?.image ?? null} backSize={deck.box?.backInsert ? [deck.box.backInsert.w, deck.box.backInsert.h] : null} />
{/key}
