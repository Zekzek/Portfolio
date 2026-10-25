// Job lengths, per-skill time totals and years of experience.
// Same math as the original jQuery site (index.js), including its rounding,
// so the numbers on the page don't change with the redesign.

export interface RoleTiming {
  key: string;
  start?: string; // YYYY-MM
  end?: string; // YYYY-MM, omitted while current
  tags: string[];
  projects: { months?: number; tags: string[] }[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ym(s: string): { year: number; month: number } {
  const [y, m] = s.split("-");
  return { year: Number(y), month: m ? Number(m) - 1 : 0 };
}

/** Months from start month to end month, both counted. Current jobs run to `now`. */
export function roleMonths(r: Pick<RoleTiming, "start" | "end">, now: Date): number {
  if (!r.start) return 0;
  const s = ym(r.start);
  const e = r.end ? ym(r.end) : { year: now.getFullYear(), month: now.getMonth() };
  return Math.max(0, (e.year - s.year) * 12 + (e.month - s.month) + 1);
}

/** "5 months" under 6 months, otherwise whole years ("2 years"). */
export function humanizeMonths(months: number): string {
  if (!months || months <= 0) return "0 months";
  if (months < 6) return months + (months === 1 ? " month" : " months");
  const years = Math.max(1, Math.round(months / 12));
  return years + (years === 1 ? " year" : " years");
}

/** Short form for the skill list: "4m", "3y". */
export function humanizeMonthsShort(months: number): string {
  if (!months || months <= 0) return "0m";
  if (months < 6) return months + "m";
  return Math.max(1, Math.round(months / 12)) + "y";
}

/** Sort value of a short label ("10y" -> 120), matching the old site's tie-break. */
export function sortableMonths(short: string): number {
  const y = short.match(/(\d+)y/);
  if (y) return Number(y[1]) * 12;
  const m = short.match(/(\d+)m/);
  return m ? Number(m[1]) : 0;
}

/** "Oct 2024 – Present" */
export function dateRange(r: Pick<RoleTiming, "start" | "end">): string | null {
  if (!r.start) return null;
  const fmt = (s: string) => `${MONTHS[ym(s).month]} ${ym(s).year}`;
  return `${fmt(r.start)} – ${r.end ? fmt(r.end) : "Present"}`;
}

/**
 * Months per skill. For each job, add up the months of its projects that use the
 * skill, capped at the job's length. A job with no project months counts its own tags.
 */
export function skillTotals(
  roles: RoleTiming[],
  keys: string[],
  excluded: string[],
  now: Date,
): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const r of roles) {
    if (excluded.includes(r.key)) continue;
    const cap = roleMonths(r, now);
    const timed = r.projects.filter((p) => p.months != null);
    if (timed.length) {
      for (const k of keys) {
        const sum = timed.filter((p) => p.tags.includes(k)).reduce((a, p) => a + (p.months ?? 0), 0);
        if (sum) totals[k] += Math.min(sum, cap);
      }
    } else {
      for (const k of keys) if (r.tags.includes(k)) totals[k] += cap;
    }
  }
  return totals;
}

/** Total months worked, with overlapping or back-to-back jobs merged. */
export function totalMonths(roles: RoleTiming[], excluded: string[], now: Date): number {
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const spans = roles
    .filter((r) => !excluded.includes(r.key) && r.start)
    .map((r) => {
      const s = ym(r.start!);
      const end = r.end ? new Date(ym(r.end).year, ym(r.end).month + 1, 0) : endOfThisMonth;
      return { start: new Date(s.year, s.month, 1), end };
    })
    .sort((a, b) => +a.start - +b.start);
  if (!spans.length) return 0;

  const merged = [{ ...spans[0] }];
  for (const span of spans.slice(1)) {
    const cur = merged[merged.length - 1];
    const dayAfter = new Date(cur.end.getFullYear(), cur.end.getMonth(), cur.end.getDate() + 1);
    if (span.start <= dayAfter) {
      if (span.end > cur.end) cur.end = span.end;
    } else merged.push({ ...span });
  }
  return merged.reduce((sum, m) => {
    const months = (m.end.getFullYear() - m.start.getFullYear()) * 12 + (m.end.getMonth() - m.start.getMonth()) + 1;
    return sum + Math.max(0, months);
  }, 0);
}

/** Skills within a group: rating, then rounded time, then name. */
export function sortSkills<T extends { key: string; label: string; rating?: number }>(
  skills: T[],
  totals: Record<string, number>,
): T[] {
  return [...skills].sort((a, b) => {
    const r = (b.rating ?? 0) - (a.rating ?? 0);
    if (r) return r;
    const t = sortableMonths(humanizeMonthsShort(totals[b.key] ?? 0)) - sortableMonths(humanizeMonthsShort(totals[a.key] ?? 0));
    if (t) return t;
    return a.label.toUpperCase().localeCompare(b.label.toUpperCase());
  });
}
