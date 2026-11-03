import { describe, expect, it } from "vitest";
import {
  cell_char,
  cells_between,
  frame_at,
  glyphs,
  settle_ms,
  squeeze,
  stagger_ms,
  total_ms,
} from "../../../src/lib/wordmark/scramble.ts";

describe("scramble", () => {
  it("squeezes three-letter rows to their outer letters", () => {
    expect(squeeze([["A", "R"], ["T", "I", "S"], ["A", "N"]])).toEqual([["A", "R"], ["T", "S"], ["A", "N"]]);
  });

  it("pads rows so shorter targets resolve to empty cells", () => {
    const cells = cells_between([["T", "I", "S"]], ["GG"]);
    expect(cells).toEqual([
      [
        { from: "T", to: "G" },
        { from: "I", to: "G" },
        { from: "S", to: "" },
      ],
    ]);
  });

  it("holds the source until a cell's turn, scrambles, then settles", () => {
    const cell = { from: "A", to: "T" };
    expect(cell_char(cell, 2, 2 * stagger_ms - 1)).toBe("A");
    expect(glyphs).toContain(cell_char(cell, 2, 2 * stagger_ms + 10));
    expect(cell_char(cell, 2, 2 * stagger_ms + settle_ms)).toBe("T");
  });

  it("lands exactly on the target once every cell has settled", () => {
    const cells = cells_between([["A", "R"], ["T", "I", "S"], ["A", "N"]], ["TO", "GG", "LE"]);
    expect(frame_at(cells, total_ms(cells))).toEqual([["T", "O"], ["G", "G", ""], ["L", "E"]]);
  });

  it("starts from where an interrupted run left off", () => {
    const cells = cells_between([["G", "G", ""], ["T", "O"]], ["AR", "TIS"]);
    expect(cells[0]).toEqual([
      { from: "G", to: "A" },
      { from: "G", to: "R" },
      { from: "", to: "" },
    ]);
  });
});
