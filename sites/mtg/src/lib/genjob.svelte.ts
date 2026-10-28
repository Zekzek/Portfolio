// The current proxy generation run on this PC, polled while it's going.
import { loadGenJob } from "./api";
import { editable } from "./connection.svelte";
import type { GenJob } from "./types";

export const gen = $state({ job: null as GenJob | null });

let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<(job: GenJob) => void>();

/** Called once when a run finishes (to reload art and proxies). */
export function onRunFinished(fn: (job: GenJob) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function refreshJob(): Promise<void> {
  if (!editable()) return;
  const was = gen.job?.state;
  try {
    gen.job = await loadGenJob();
  } catch {
    return;
  }
  if (was === "running" && gen.job.state !== "running") listeners.forEach((fn) => fn(gen.job!));
  clearTimeout(timer);
  if (gen.job.state === "running") timer = setTimeout(refreshJob, 3000);
}
