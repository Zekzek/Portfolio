// Hash routes, so the page works as one static file locally and when hosted:
//   #/                                  all decks
//   #/deck/<id>                         one deck
//   #/deck/<id>/card/<name>             one deck with a card open
//   #/compare/<id>,<id>[,...]           decks side by side
//   #/compare/<id>,<id>/card/<name>     ...with a card open
export type Route =
  | { view: "decks" }
  | { view: "deck"; deck: string; card?: string }
  | { view: "compare"; decks: string[]; card?: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const card = parts[2] === "card" && parts[3] ? parts[3] : undefined;
  if (parts[0] === "deck" && parts[1]) {
    return card ? { view: "deck", deck: parts[1], card } : { view: "deck", deck: parts[1] };
  }
  if (parts[0] === "compare" && parts[1]) {
    const decks = parts[1].split(",").filter(Boolean);
    return card ? { view: "compare", decks, card } : { view: "compare", decks };
  }
  return { view: "decks" };
}

export function href(route: Route): string {
  if (route.view === "decks") return "#/";
  const base = route.view === "deck"
    ? `#/deck/${encodeURIComponent(route.deck)}`
    : `#/compare/${route.decks.map(encodeURIComponent).join(",")}`;
  return route.card ? `${base}/card/${encodeURIComponent(route.card)}` : base;
}
