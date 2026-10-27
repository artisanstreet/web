// Palette contrast via Color.js (sander-frontend-design-v1): rendered
// foreground against its actual background. OKLCH tokens from tokens.css.

import { describe, expect, it } from "vitest";
import Color from "colorjs.io";

const contrast = (fg_oklch: string, bg_oklch: string): number => {
  const fg = new Color(fg_oklch);
  const bg = new Color(bg_oklch);
  return fg.contrast(bg, "WCAG21");
};

describe("auth palette contrast", () => {
  const bg = "oklch(0.165 0.006 268)";
  const panel = "oklch(0.225 0.009 268)";
  const ink = "oklch(0.935 0.004 268)";
  const dim = "oklch(0.745 0.01 268)";
  const primary_ink = "oklch(1 0 0)";
  const primary = "oklch(0.52 0.172 262)";
  const link = "oklch(0.72 0.14 262)";
  const err = "oklch(0.74 0.13 25)";
  const ok = "oklch(0.8 0.145 152)";

  it("body text meets AA on the page background", () => {
    expect(contrast(ink, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dim, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("form text meets AA on the panel surface", () => {
    expect(contrast(ink, panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dim, panel)).toBeGreaterThanOrEqual(4.5);
  });

  it("primary button text meets AA on its filled surface", () => {
    expect(contrast(primary_ink, primary)).toBeGreaterThanOrEqual(4.5);
  });

  it("links and status tones meet AA on dark surfaces", () => {
    expect(contrast(link, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(err, bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ok, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
