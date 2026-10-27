import { describe, expect, it } from "vitest";
import { friendly_error } from "../src/lib/friendly-error.ts";
import { ApiError } from "@artisanstreet/core-client";

describe("friendly errors", () => {
  it("maps rate limits and server faults to human copy", () => {
    expect(friendly_error(new ApiError(429, { code: "rate_limited", message: "slow down", request_id: "r" }))).toMatch(
      /too many attempts/i,
    );
    expect(friendly_error(new ApiError(500, { code: "internal", message: "boom", request_id: "r" }))).toMatch(
      /account service had a problem/i,
    );
  });

  it("passes safe server messages through, humanizes validation at the boundary", () => {
    expect(
      friendly_error(new ApiError(400, { code: "bad_request", message: "that address cannot receive mail", request_id: "r" })),
    ).toContain("cannot receive mail");
    // Generic errors pass their message through (same as core/web); Effect
    // ParseError internals are humanized at the API boundary instead.
    expect(friendly_error(new Error("network down"))).toBe("network down");
    expect(friendly_error("total mystery")).toBe("Something went wrong.");
  });
});
