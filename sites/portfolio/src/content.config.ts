import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// One file per job (or "Side Projects" / "Education") in src/content/roles/.
// `key` is the section's page id and must stay stable: filters and tests use it.
// `tags` are skill keys from src/data/skills.ts (unknown tags are allowed and ignored by filters).
const roles = defineCollection({
  loader: glob({ base: "./src/content/roles", pattern: "*.md" }),
  schema: ({ image }) =>
    z.object({
      key: z.string(),
      order: z.number(),
      title: z.string().optional(), // for sections that aren't a job
      role: z.string().optional(),
      company: z.string().optional(),
      note: z.string().optional(), // e.g. "Contract"
      start: z.string().regex(/^\d{4}-\d{2}$/).optional(), // YYYY-MM
      end: z.string().regex(/^\d{4}-\d{2}$/).optional(), // omit while current
      subtitle: z.string().optional(),
      tags: z.array(z.string()).default([]),
      alwaysShow: z.boolean().default(false), // stays open whenever a filter is on
      images: z.array(z.object({ src: image(), alt: z.string() })).default([]),
    }),
});

// One file per project in src/content/projects/<role key>/.
const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.md" }),
  schema: ({ image }) =>
    z.object({
      key: z.string(),
      role: z.string(),
      order: z.number(),
      title: z.string(),
      months: z.number().optional(), // time spent; feeds the per-skill totals
      tags: z.array(z.string()).default([]),
      alwaysShow: z.boolean().default(false),
      images: z.array(z.object({ src: image(), alt: z.string() })).default([]),
    }),
});

export const collections = { roles, projects };
