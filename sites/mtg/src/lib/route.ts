// Hash routes, so the page works as one static file locally and when hosted:
//   #/                                  all decks
//   #/deck/<id>                         one deck
//   #/deck/<id>/card/<name>             one deck with a card open
//   #/deck/<id>/history                 a deck's change history
//   #/compare/<id>,<id>[,...]           decks side by side
//   #/compare/<id>,<id>/card/<name>     ...with a card open
//   #/search/<query>                    search every deck
//   #/search/<query>/card/<name>        ...with a card open
export type Route =
  | { view: "decks" }
  | { view: "deck"; deck: string; card?: string }
  | { view: "history"; deck: string }
  | { view: "compare"; decks: string[]; card?: string }
  | { view: "search"; q: string; card?: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const card = parts[2] === "card" && parts[3] ? parts[3] : undefined;
  if (parts[0] === "deck" && parts[1] && parts[2] === "history") return { view: "history", deck: parts[1] };
  if (parts[0] === "deck" && parts[1]) {
    return card ? { view: "deck", deck: parts[1], card } : { view: "deck", deck: parts[1] };
  }
  if (parts[0] === "compare" && parts[1]) {
    const decks = parts[1].split(",").filter(Boolean);
    return card ? { view: "compare", decks, card } : { view: "compare", decks };
  }
  if (parts[0] === "search") {
    const q = parts[1] ?? "";
    return card ? { view: "search", q, card } : { view: "search", q };
  }
  return { view: "decks" };
}

export function href(route: Route): string {
  if (route.view === "decks") return "#/";
  if (route.view === "history") return `#/deck/${encodeURIComponent(route.deck)}/history`;
  const base =
    route.view === "deck" ? `#/deck/${encodeURIComponent(route.deck)}`
    : route.view === "compare" ? `#/compare/${route.decks.map(encodeURIComponent).join(",")}`
    : `#/search/${encodeURIComponent(route.q)}`;
  return route.card ? `${base}/card/${encodeURIComponent(route.card)}` : base;
}
