// Reads the Markdown content the same way the site does, without Astro, for tests.
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { Section } from "../src/lib/filter";
import type { RoleTiming } from "../src/lib/durations";

const CONTENT = path.resolve(import.meta.dirname, "../src/content");

function frontmatter(file: string): Record<string, any> {
  const text = fs.readFileSync(file, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`no frontmatter in ${file}`);
  return parse(m[1]);
}

function load() {
  const roles = fs.readdirSync(path.join(CONTENT, "roles"))
    .map((f) => frontmatter(path.join(CONTENT, "roles", f)))
    .sort((a, b) => a.order - b.order);
  return roles.map((r) => {
    const dir = path.join(CONTENT, "projects", r.key);
    const projects = fs.existsSync(dir)
      ? fs.readdirSync(dir).map((f) => frontmatter(path.join(dir, f))).sort((a, b) => a.order - b.order)
      : [];
    return { ...r, projects };
  });
}

export function loadSections(): Section[] {
  return load().map((r) => ({
    key: r.key,
    tags: r.tags ?? [],
    alwaysShow: !!r.alwaysShow,
    children: r.projects.map((p: any) => ({ key: p.key, tags: p.tags ?? [], alwaysShow: !!p.alwaysShow, children: [] })),
  }));
}

export function loadTimings(): RoleTiming[] {
  return load().map((r) => ({
    key: r.key,
    start: r.start,
    end: r.end,
    tags: r.tags ?? [],
    projects: r.projects.map((p: any) => ({ months: p.months, tags: p.tags ?? [] })),
  }));
}
