// Hash routes, so the page works as one static file locally and when hosted:
//   #/                       all decks
//   #/deck/<id>              one deck
//   #/deck/<id>/card/<name>  one deck with a card open
export type Route =
  | { view: "decks" }
  | { view: "deck"; deck: string; card?: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  if (parts[0] === "deck" && parts[1]) {
    return parts[2] === "card" && parts[3] ? { view: "deck", deck: parts[1], card: parts[3] } : { view: "deck", deck: parts[1] };
  }
  return { view: "decks" };
}

export function href(route: Route): string {
  if (route.view === "decks") return "#/";
  const base = `#/deck/${encodeURIComponent(route.deck)}`;
  return route.card ? `${base}/card/${encodeURIComponent(route.card)}` : base;
}
