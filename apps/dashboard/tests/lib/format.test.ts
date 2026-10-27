import { describe, expect, it } from "vitest";
import { format_when, short_id } from "../../src/lib/format.ts";

describe("format helpers keep metadata readable", () => {
  it("shortens long ids with ellipsis", () => {
    expect(short_id("mch_ABCDEFGHIJKLMNOPQRSTUVWX")).toMatch(/…$/);
    expect(short_id("short")).toBe("short");
  });

  it("renders null dates as em dash", () => {
    expect(format_when(null)).toBe("—");
  });

  it("passes through unparseable dates", () => {
    expect(format_when("not-a-date")).toBe("not-a-date");
  });
});
