import { describe, expect, it } from "vitest";
import { friendly_error } from "../../src/lib/friendly-error.ts";
import { ApiError } from "@artisanstreet/core-client";

describe("friendly errors carry request_id, stay generic", () => {
  it("maps 401 to sign-in", () => {
    expect(friendly_error(new ApiError(401, { code: "unauthorized", message: "nope", request_id: "r1" }))).toMatch(/session expired/i);
  });

  it("keeps server request_id for support without leaking secrets", () => {
    const msg = friendly_error(new ApiError(500, { code: "internal", message: "boom", request_id: "req_123" }));
    expect(msg).toContain("req_123");
    expect(msg).not.toMatch(/secret|token|cookie/i);
  });

  it("passes through safe validation messages with ref", () => {
    const msg = friendly_error(new ApiError(400, { code: "bad_request", message: "Enter a valid email address.", request_id: "req_9" }));
    expect(msg).toContain("valid email");
    expect(msg).toContain("req_9");
  });
});
