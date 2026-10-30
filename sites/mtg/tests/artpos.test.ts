import { describe, expect, it } from "vitest";
import { CENTERED, cropRect, dragBy, sameFocus, zoomTo } from "../src/lib/artpos";

const art: [number, number] = [1000, 1000];
const box: [number, number] = [700, 460]; // wider than tall: full width, a band of the height

describe("art position math (matches compositor._crop_art)", () => {
  it("crops the largest window-shaped band, placed by x/y", () => {
    const r = cropRect(art, box, CENTERED);
    expect(r.cw).toBe(1000);
    expect(Math.round(r.ch)).toBe(657);
    expect(Math.round(r.y0)).toBe(171);
    expect(cropRect(art, box, { ...CENTERED, y: 0 }).y0).toBe(0);
  });
  it("dragging down shows more of the top; sideways does nothing at full width", () => {
    const f = dragBy(art, box, CENTERED, 50, 100, 350); // 350px view: 1 screen px = 1000/350 art px
    expect(f.x).toBe(0.5);
    expect(f.y).toBeLessThan(0.5);
    expect(dragBy(art, box, CENTERED, 0, 5000, 350).y).toBe(0); // clamped
  });
  it("zooming keeps the centre, then dragging sideways moves it (reversed when mirrored)", () => {
    const z = zoomTo(art, box, CENTERED, 0.5);
    expect(z.zoom).toBe(0.5);
    expect(z.x).toBeCloseTo(0.5);
    expect(z.y).toBeCloseTo(0.5);
    expect(dragBy(art, box, z, 100, 0, 350).x).toBeLessThan(0.5);
    expect(dragBy(art, box, { ...z, flip: true }, 100, 0, 350).x).toBeGreaterThan(0.5);
    expect(zoomTo(art, box, CENTERED, 0.01).zoom).toBe(0.25);
  });
  it("compares focuses loosely", () => {
    expect(sameFocus(CENTERED, { ...CENTERED, x: 0.5000001 })).toBe(true);
    expect(sameFocus(CENTERED, { ...CENTERED, flip: true })).toBe(false);
  });
});
