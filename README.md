# Portfolio

Source for [www.zekzek.net](https://www.zekzek.net): a searchable CV with skill filters, plus links to public projects.

Built with [Astro](https://astro.build) as an npm workspace:

```
sites/portfolio/   the CV site (deploys to www.zekzek.net via AWS Amplify on push to main)
sites/mtg/         Deck Shelf: Commander decks, card text and proxy art (local for now; not deployed)
packages/ui/       shared look for zekzek.net sites: color/type tokens, fonts, base layout, theme toggle
```

### Deck Shelf (sites/mtg)

Svelte inside Astro. Its data and actions come from `MTG/DeckSite/server.py` (in the OneDrive MTG folder),
which reads the deck lists, the merged card data and DeckGen's folders. Deck data never goes in this repo.

```
npm run build:mtg                       # build the page once
python DeckSite/server.py               # in the MTG folder; then open http://127.0.0.1:8765
npm run dev:mtg                         # or: live-reload page on :4330, data proxied to the server above
```

## Everyday use

Needs Node 22.12 or newer.

```
npm install
npm run dev       # local preview with live reload
npm test          # filter + duration tests
npm run build     # static site in sites/portfolio/dist
```

## Editing content

- **A job:** `sites/portfolio/src/content/roles/<key>.md`. Frontmatter holds company, role, dates (`start`/`end` as YYYY-MM; leave `end` off while current), skill tags and screenshots. The body is the intro line.
- **A project:** `sites/portfolio/src/content/projects/<job key>/<name>.md`. Frontmatter holds title, `months`, tags and optional screenshots; the body is the bullet list.
- **Skills, ratings and filter groups:** `sites/portfolio/src/data/skills.ts`.
- **Name, links, summary:** `sites/portfolio/src/data/site.ts`.
- **Images:** `sites/portfolio/src/assets/` (resized automatically). Files in `sites/portfolio/public/` are served as-is, e.g. `/assets/Al_Bueche_Resume.pdf`.

Durations, per-skill time totals and "N years" are computed from the dates, so they don't need editing.

## How the filters behave

The rules live in `src/lib/filter.ts`. `tests/baseline.json` records exactly what the original site opened for every filter, Show all/Collapse all and header clicks, and the tests check the new code against it. Amplify runs the tests before every deploy.
