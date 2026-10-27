import { describe, expect, it } from "vitest";

import { centered, clampCrop, MAX_ZOOM, panBy, placement, sourceRect } from "./crop";

// A 400x200 landscape picture in a 100 px frame.
const W = 400;
const H = 200;
const F = 100;

describe("crop geometry", () => {
  it("starts with the middle square of the image", () => {
    expect(sourceRect(centered, W, H, F)).toEqual({ x: 100, y: 0, size: 200 });
  });

  it("zooming in shrinks the source square around the same centre", () => {
    expect(sourceRect({ ...centered, zoom: 2 }, W, H, F)).toEqual({ x: 150, y: 50, size: 100 });
  });

  it("never lets the frame leave the image", () => {
    const far = clampCrop({ zoom: 1, cx: 5, cy: -3 }, W, H, F);
    const r = sourceRect(far, W, H, F);
    expect(r.x + r.size).toBeCloseTo(W);
    expect(r.y).toBeCloseTo(0);
  });

  it("limits the zoom", () => {
    expect(clampCrop({ ...centered, zoom: 99 }, W, H, F).zoom).toBe(MAX_ZOOM);
    expect(clampCrop({ ...centered, zoom: 0.2 }, W, H, F).zoom).toBe(1);
  });

  it("dragging right shows what is to the left", () => {
    const zoomed = { ...centered, zoom: 2 };
    const moved = panBy(zoomed, 20, 0, W, H, F);
    expect(sourceRect(moved, W, H, F).x).toBeLessThan(sourceRect(zoomed, W, H, F).x);
  });

  it("places the image so it covers the frame", () => {
    const p = placement(centered, W, H, F);
    expect(p.height).toBe(F);
    expect(p.left).toBeLessThanOrEqual(0);
    expect(p.left + p.width).toBeGreaterThanOrEqual(F);
  });
});
