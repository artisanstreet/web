import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { next_active } from "../../../src/lib/account/active.ts";

const was = (active: string, known: ReadonlyArray<string>) => Option.some({ active, known });

describe("next_active", () => {
  it("starts on the first signed-in account", () => {
    expect(next_active(Option.none(), ["acct_a", "acct_b"])).toEqual(Option.some("acct_a"));
  });

  it("stays on the account you picked", () => {
    expect(next_active(was("acct_b", ["acct_a", "acct_b"]), ["acct_a", "acct_b"])).toEqual(Option.some("acct_b"));
  });

  it("moves to an account you just added", () => {
    expect(next_active(was("acct_b", ["acct_a", "acct_b"]), ["acct_c", "acct_a", "acct_b"])).toEqual(
      Option.some("acct_c"),
    );
  });

  it("falls back to the first remaining account once yours is signed out, and to none when all are", () => {
    expect(next_active(was("acct_b", ["acct_a", "acct_b"]), ["acct_a"])).toEqual(Option.some("acct_a"));
    expect(next_active(was("acct_b", ["acct_a", "acct_b"]), [])).toEqual(Option.none());
  });
});
