// Where the page gets its data, and whether it can change things:
//   local     served by this PC's server (http://127.0.0.1:8765): live, editable
//   live      hosted page talking to this PC's server directly: live, editable
//   snapshot  hosted page reading the last upload from the bucket: read-only
// The hosted page only tries this PC on its own if it connected from this browser before (no surprise
// "local network access" prompts on a phone or a new browser).
import { HOSTED, idToken } from "./hosted";

export const LOCAL_SERVER = "http://127.0.0.1:8765";
const REMEMBER = "decksite.connectToPc";

export type Mode = "local" | "live" | "snapshot";
export interface UploadStatus { state: string; at: string | null; message: string }

export const conn = $state({
  mode: (HOSTED ? "snapshot" : "local") as Mode,
  connecting: false,
  error: "",
  upload: null as UploadStatus | null,
  snapshotAt: "",
});

export const editable = () => conn.mode !== "snapshot";

const remembered = () => { try { return localStorage.getItem(REMEMBER) === "1"; } catch { return false; } };
const remember = (on: boolean) => { try { on ? localStorage.setItem(REMEMBER, "1") : localStorage.removeItem(REMEMBER); } catch {} };

/** Headers for a request to this PC's server from the hosted page. */
export async function authHeaders(): Promise<Record<string, string>> {
  return conn.mode === "live" ? { Authorization: `Bearer ${await idToken()}` } : {};
}

/** Try this PC's server. Returns true when connected (and remembers it for this browser). */
export async function connect(auto = false): Promise<boolean> {
  if (!HOSTED) return true;
  if (auto && !remembered()) return false;
  conn.connecting = true;
  conn.error = "";
  try {
    const r = await fetch(`${LOCAL_SERVER}/api/hello`, {
      headers: { Authorization: `Bearer ${await idToken()}` },
      cache: "no-store",
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) {
      conn.error = data.error ?? `This computer's Deck Shelf answered ${r.status}.`;
      return false;
    }
    conn.mode = "live";
    conn.upload = data.upload ?? null;
    remember(true);
    return true;
  } catch {
    if (!auto) {
      conn.error = "Couldn't reach Deck Shelf on this computer. Is `python DeckSite/server.py` running? " +
        "If your browser asked about access to devices on your local network, choose Allow.";
    }
    return false;
  } finally {
    conn.connecting = false;
  }
}

/** Back to the uploaded snapshot (and stop auto-connecting from this browser). */
export function disconnect(forget = true) {
  conn.mode = HOSTED ? "snapshot" : "local";
  conn.upload = null;
  if (forget) remember(false);
}

/** Refresh the upload status shown while live. False if the PC stopped answering. */
export async function refreshStatus(): Promise<boolean> {
  if (conn.mode !== "live") return true;
  try {
    const r = await fetch(`${LOCAL_SERVER}/api/hello`, { headers: await authHeaders(), cache: "no-store" });
    if (!r.ok) return false;
    conn.upload = (await r.json()).upload ?? null;
    return true;
  } catch {
    return false;
  }
}
