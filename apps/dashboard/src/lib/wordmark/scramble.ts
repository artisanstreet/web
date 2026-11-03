import { Match } from "effect";

export const glyphs = "ACDEGLNOPRSTUZ";
export const stagger_ms = 18;
export const settle_ms = 170;
export const tick_ms = 34;

export interface Cell {
  readonly from: string;
  readonly to: string;
}

export const squeeze = (rows: ReadonlyArray<ReadonlyArray<string>>): ReadonlyArray<ReadonlyArray<string>> =>
  rows.map((row) => (row.length > 2 ? [row[0] ?? "", row[row.length - 1] ?? ""] : row));

export const cells_between = (
  shown: ReadonlyArray<ReadonlyArray<string>>,
  target: ReadonlyArray<string>,
): ReadonlyArray<ReadonlyArray<Cell>> =>
  shown.map((row, index) => {
    const next = Array.from(target[index] ?? "");
    const width = Math.max(row.length, next.length);
    return Array.from({ length: width }, (_, column) => ({
      from: row[column] ?? "",
      to: next[column] ?? "",
    }));
  });

const glyph_at = (index: number, tick: number): string =>
  glyphs[((Math.imul(index + 1, 2654435761) + Math.imul(tick + 1, 40503)) >>> 0) % glyphs.length] ?? "";

export const cell_char = (cell: Cell, index: number, elapsed: number): string =>
  Match.value(elapsed - index * stagger_ms).pipe(
    Match.when(
      (local) => local < 0,
      () => cell.from,
    ),
    Match.when(
      (local) => local >= settle_ms,
      () => cell.to,
    ),
    Match.orElse((local) => glyph_at(index, Math.floor(local / tick_ms))),
  );

export const total_ms = (cells: ReadonlyArray<ReadonlyArray<Cell>>): number =>
  settle_ms + (cells.flat().length - 1) * stagger_ms;

export const frame_at = (
  cells: ReadonlyArray<ReadonlyArray<Cell>>,
  elapsed: number,
): ReadonlyArray<ReadonlyArray<string>> =>
  cells.reduce<{ readonly rows: ReadonlyArray<ReadonlyArray<string>>; readonly offset: number }>(
    (state, row) => ({
      rows: [...state.rows, row.map((cell, column) => cell_char(cell, state.offset + column, elapsed))],
      offset: state.offset + row.length,
    }),
    { rows: [], offset: 0 },
  ).rows;
