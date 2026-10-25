// Which sections are open for a set of active filters.
// Same rules as the original jQuery site (index.js `update_filters`):
//  - No filters on: everything closes.
//  - A section marked alwaysShow opens; inside it, only sub-sections marked alwaysShow open.
//  - Any other section opens if it, or anything inside it, has one of the active tags.
//    Each sub-section inside it follows the same test on its own.

export interface Section {
  key: string;
  tags: string[];
  alwaysShow: boolean;
  children: Section[];
}

export type OpenState = Record<string, boolean>;

function descendants(s: Section): Section[] {
  return s.children.flatMap((c) => [c, ...descendants(c)]);
}

function matches(s: Section, active: string[]): boolean {
  const all = [s, ...descendants(s)];
  return active.some((k) => all.some((n) => n.tags.includes(k)));
}

export function allKeys(sections: Section[]): string[] {
  return sections.flatMap((s) => [s.key, ...descendants(s).map((d) => d.key)]);
}

export function filterOpen(sections: Section[], active: string[]): OpenState {
  const open: OpenState = {};
  for (const s of sections) {
    const subs = descendants(s);
    if (active.length === 0) {
      open[s.key] = false;
      for (const d of subs) open[d.key] = false;
    } else if (s.alwaysShow) {
      open[s.key] = true;
      for (const d of subs) open[d.key] = d.alwaysShow;
    } else {
      open[s.key] = matches(s, active);
      for (const d of subs) open[d.key] = matches(d, active);
    }
  }
  return open;
}

export function setAll(sections: Section[], value: boolean): OpenState {
  return Object.fromEntries(allKeys(sections).map((k) => [k, value]));
}
