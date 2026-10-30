// Positioning a DeckGen card's art in its frame (DeckSite/artpos.py, DeckGen compositor._crop_art).
// The same math as the compositor, so the page's drag preview matches the rendered card.

export interface Focus { x: number; y: number; zoom: number; flip: boolean }
export const CENTERED: Focus = { x: 0.5, y: 0.5, zoom: 1, flip: false };

export interface ArtPosition {
  card: string;
  style: string;
  window: [number, number]; // art window size in the frame
  artSize: [number, number]; // the picked art after trimming
  art: string; // URL of that trimmed art
  focus: Focus;
  crops: number; // > 0: one image cut into this many cards (Forest.png, Forest_2.png ...)
  crop: number; // which of them this is (0-based)
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The part of the art that fills the window: left/top/width/height in art pixels. */
export function cropRect(art: [number, number], box: [number, number], f: Focus) {
  const [w, h] = art;
  const ar = box[0] / box[1];
  let [cw, ch] = w / h > ar ? [h * ar, h] : [w, w / ar];
  cw *= f.zoom;
  ch *= f.zoom;
  return { x0: (w - cw) * f.x, y0: (h - ch) * f.y, cw, ch };
}

/** Move the view by a drag of (dx, dy) screen pixels in a window `viewWidth` pixels wide. */
export function dragBy(art: [number, number], box: [number, number], f: Focus, dx: number, dy: number, viewWidth: number): Focus {
  const { x0, y0, cw, ch } = cropRect(art, box, f);
  const perPx = cw / viewWidth; // art pixels per screen pixel
  const mx = (f.flip ? 1 : -1) * dx * perPx; // dragging right shows more of the left (mirrored: the right)
  const my = -dy * perPx;
  const sx = art[0] - cw, sy = art[1] - ch;
  return { ...f, x: sx > 0 ? clamp((x0 + mx) / sx, 0, 1) : 0.5, y: sy > 0 ? clamp((y0 + my) / sy, 0, 1) : 0.5 };
}

/** Zoom in or out (zoom = share of the largest crop: 1 = all of it, 0.25 = 4x closer), keeping the centre. */
export function zoomTo(art: [number, number], box: [number, number], f: Focus, zoom: number): Focus {
  const z = clamp(zoom, 0.25, 1);
  const a = cropRect(art, box, f);
  const cx = a.x0 + a.cw / 2, cy = a.y0 + a.ch / 2;
  const b = cropRect(art, box, { ...f, zoom: z });
  const sx = art[0] - b.cw, sy = art[1] - b.ch;
  return { ...f, zoom: z, x: sx > 0 ? clamp((cx - b.cw / 2) / sx, 0, 1) : 0.5, y: sy > 0 ? clamp((cy - b.ch / 2) / sy, 0, 1) : 0.5 };
}

/** CSS for the art inside a window `viewWidth` pixels wide. */
export function artStyle(art: [number, number], box: [number, number], f: Focus, viewWidth: number): string {
  const { x0, y0, cw } = cropRect(art, box, f);
  const s = viewWidth / cw;
  return `width:${art[0] * s}px;height:${art[1] * s}px;transform:translate(${-x0 * s}px,${-y0 * s}px)`;
}

export const sameFocus = (a: Focus, b: Focus) =>
  Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001 && Math.abs(a.zoom - b.zoom) < 0.001 && a.flip === b.flip;
