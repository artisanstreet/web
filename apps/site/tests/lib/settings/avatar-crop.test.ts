import { describe, expect, it } from "vitest";
import { constrain_framing, crop_bounds, move_framing } from "../../../src/lib/settings/avatar-crop.ts";

describe("avatar framing", () => {
  it.each([
    [{ width: 1200, height: 800 }, { x: 200, y: 0, size: 800 }],
    [{ width: 800, height: 1200 }, { x: 0, y: 200, size: 800 }],
    [{ width: 128, height: 128 }, { x: 0, y: 0, size: 128 }],
  ])("starts with a centered square in %o", (image, expected) => {
    expect(crop_bounds(image, { x: 0.5, y: 0.5, zoom: 1 })).toEqual(expected);
  });

  it("moves the image in the drag direction and stops at its edges", () => {
    const image = { width: 1200, height: 800 };
    const framing = { x: 0.5, y: 0.5, zoom: 1 };
    expect(crop_bounds(image, move_framing(image, framing, 0.125, 0))).toEqual({ x: 100, y: 0, size: 800 });
    expect(crop_bounds(image, move_framing(image, framing, 5, -5))).toEqual({ x: 0, y: 0, size: 800 });
    expect(crop_bounds(image, move_framing(image, framing, -5, 5))).toEqual({ x: 400, y: 0, size: 800 });
  });

  it("scales drag distance with zoom and allows both axes to move", () => {
    const image = { width: 1200, height: 800 };
    const moved = move_framing(image, { x: 0.5, y: 0.5, zoom: 2 }, 0.25, -0.25);
    expect(crop_bounds(image, moved)).toEqual({ x: 300, y: 300, size: 400 });
  });

  it("keeps a zoomed edge selection inside the image when zooming out", () => {
    const image = { width: 800, height: 1200 };
    const edge = move_framing(image, { x: 0.5, y: 0.5, zoom: 3 }, -10, -10);
    const zoomed_out = constrain_framing(image, { ...edge, zoom: 1 });
    expect(crop_bounds(image, zoomed_out)).toEqual({ x: 0, y: 400, size: 800 });
  });

  it.each([0, 1, 2, 3, 9])("keeps all crop corners inside the source at zoom %s", (zoom) => {
    for (const image of [{ width: 4096, height: 1 }, { width: 1, height: 4096 }, { width: 123, height: 456 }]) {
      for (const x of [-10, 0.5, 10]) {
        for (const y of [-10, 0.5, 10]) {
          const bounds = crop_bounds(image, { x, y, zoom });
          expect(bounds.x).toBeGreaterThanOrEqual(-1e-10);
          expect(bounds.y).toBeGreaterThanOrEqual(-1e-10);
          expect(bounds.x + bounds.size).toBeLessThanOrEqual(image.width + 1e-10);
          expect(bounds.y + bounds.size).toBeLessThanOrEqual(image.height + 1e-10);
        }
      }
    }
  });
});
