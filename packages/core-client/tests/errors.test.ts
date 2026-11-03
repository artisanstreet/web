import { describe, expect, it } from "vitest";
import { ApiFailure, DecodeFailure, InvalidEmail, is_transient, TransportFailure } from "../src/errors.ts";

const api = (status: number) => new ApiFailure({ status, code: "x", message: "x", request_id: "" });

describe("is_transient", () => {
  it("retries unreachable Core and server errors", () => {
    expect(is_transient(new TransportFailure())).toBe(true);
    expect(is_transient(api(500))).toBe(true);
    expect(is_transient(api(503))).toBe(true);
  });

  it("does not retry refusals, shape errors or local validation", () => {
    expect(is_transient(api(400))).toBe(false);
    expect(is_transient(api(401))).toBe(false);
    expect(is_transient(api(429))).toBe(false);
    expect(is_transient(new DecodeFailure({ reason: "unreadable shape" }))).toBe(false);
    expect(is_transient(new InvalidEmail())).toBe(false);
  });
});
