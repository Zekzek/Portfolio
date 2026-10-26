// Page behavior: skill filters, show/collapse, header clicks, live durations, lightbox, PDF.
// The open/closed rules live in lib/filter.ts and are tested against the old site.
import { filterOpen, setAll, type OpenState, type Section } from "../lib/filter";
import {
  humanizeMonths, humanizeMonthsShort, roleMonths, skillTotals, sortSkills, totalMonths, type RoleTiming,
} from "../lib/durations";
import { EXCLUDED_FROM_TOTALS, SKILL_KEYS } from "../data/skills";

const $$ = <T extends Element>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

// ---- sections, read from the page ----
const roleEls = $$<HTMLDetailsElement>(".roles > details[data-section]");
const sectionOf = (el: HTMLDetailsElement): Section => ({
  key: el.dataset.section!,
  tags: (el.dataset.tags ?? "").split(" ").filter(Boolean),
  alwaysShow: el.hasAttribute("data-always"),
  children: $$<HTMLDetailsElement>("details[data-section]", el).map(sectionOf),
});
const sections = roleEls.map(sectionOf);
const detailsByKey = new Map($$<HTMLDetailsElement>("details[data-section]").map((d) => [d.dataset.section!, d]));

function applyOpen(state: OpenState) {
  for (const [key, open] of Object.entries(state)) {
    const d = detailsByKey.get(key);
    if (d && d.open !== open) d.open = open;
  }
}

// ---- filter vs manual mode ----
const form = document.querySelector<HTMLFormElement>("[data-filters]")!;
const modeText = document.querySelector<HTMLElement>("[data-mode-text]")!;
const boxes = $$<HTMLInputElement>('input[name="skill"]', form);
const activeFilters = () => boxes.filter((b) => b.checked).map((b) => b.value);

function setMode(mode: "filter" | "manual") {
  form.classList.toggle("is-manual", mode === "manual");
  modeText.textContent = mode === "manual"
    ? "Filters paused. Check a skill to filter again."
    : activeFilters().length ? "Showing work that uses the checked skills" : "Check a skill to see matching work";
}

function highlightTags(active: string[]) {
  for (const li of $$<HTMLElement>(".tags li[data-tag]")) li.classList.toggle("match", active.includes(li.dataset.tag!));
}

function applyFilters() {
  const active = activeFilters();
  setMode("filter");
  applyOpen(filterOpen(sections, active));
  highlightTags(active);
}

form.addEventListener("change", applyFilters);
form.addEventListener("submit", (e) => e.preventDefault());

// A header click switches to manual mode and toggles just that section (the browser does the toggle).
for (const d of detailsByKey.values()) {
  d.querySelector(":scope > summary")!.addEventListener("click", () => setMode("manual"));
}

document.querySelector('[data-action="show-all"]')!.addEventListener("click", () => {
  setMode("manual");
  applyOpen(setAll(sections, true));
});
document.querySelector('[data-action="collapse-all"]')!.addEventListener("click", () => {
  setMode("manual");
  applyOpen(setAll(sections, false));
});
document.querySelector('[data-action="print"]')!.addEventListener("click", () => window.print());

// ---- durations: refresh with today's date (the HTML was built earlier) ----
const timings: RoleTiming[] = JSON.parse(document.getElementById("timings")!.textContent!);
const now = new Date();
const totals = skillTotals(timings, SKILL_KEYS, EXCLUDED_FROM_TOTALS, now);

for (const r of timings) {
  const el = document.querySelector(`[data-duration-for="${r.key}"]`);
  if (el) el.textContent = humanizeMonths(roleMonths(r, now));
}
for (const el of $$<HTMLElement>("[data-time-for]")) el.textContent = humanizeMonthsShort(totals[el.dataset.timeFor!] ?? 0);
const years = document.querySelector("[data-years]");
if (years) years.textContent = String(Math.floor(totalMonths(timings, EXCLUDED_FROM_TOTALS, now) / 12));

for (const list of $$<HTMLUListElement>("[data-skill-group]")) {
  const items = $$<HTMLLIElement>(":scope > li", list);
  const sorted = sortSkills(
    items.map((li) => ({ key: li.dataset.skill!, label: li.dataset.label!, rating: Number(li.dataset.rating) || undefined, li })),
    totals,
  );
  list.append(...sorted.map((s) => s.li));
}

// ---- initial view: the default filters (already rendered open in the HTML) ----
applyFilters();

// ---- lightbox ----
const dialog = document.querySelector<HTMLDialogElement>("[data-lightbox]")!;
const dialogImg = dialog.querySelector("img")!;
document.addEventListener("click", (e) => {
  const shot = (e.target as Element).closest<HTMLElement>(".shot");
  if (!shot) return;
  // Hide the image until the new one has loaded, so the previous screenshot never flashes.
  dialogImg.classList.add("loading");
  dialogImg.removeAttribute("src");
  dialogImg.src = shot.dataset.full!;
  dialogImg.alt = shot.dataset.alt ?? "";
  if (dialogImg.complete && dialogImg.naturalWidth) dialogImg.classList.remove("loading");
  dialog.showModal();
});
dialogImg.addEventListener("load", () => dialogImg.classList.remove("loading"));
dialogImg.addEventListener("error", () => dialogImg.classList.remove("loading"));
// Click anywhere on the backdrop or image closes it, like the old site; Escape works natively.
dialog.addEventListener("click", () => dialog.close());
