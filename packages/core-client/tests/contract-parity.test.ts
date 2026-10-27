import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import * as C from "../src/contract-v1.ts";
import { decode_lenient, encode_strict } from "../src/api-effect.ts";
import { strict_options } from "../src/api-effect.ts";

describe("contract parity: request strict, response lenient", () => {
  it("rejects unknown request fields (strict)", () => {
    const bad = { email: "a@example.com", admin: true };
    const exit = Schema.decodeUnknownEither(C.MagicRequest, strict_options)(bad);
    expect(exit._tag).toBe("Left");
  });

  it("encodes camel request fields, preserves them", () => {
    const encoded = encode_strict(C.MagicStatusReq, {
      requestId: "logreq_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      requestSecret: "secret",
    });
    expect(encoded).toEqual({
      requestId: "logreq_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      requestSecret: "secret",
    });
  });

  it("decodes snake response fields, ignores additive unknowns (lenient)", () => {
    const raw = {
      request_id: "logreq_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      status: "pending",
      totp_required: false,
      email: "a@example.com",
      expires_at: new Date().toISOString(),
      future_field: "ignored",
    };
    const decoded = decode_lenient(C.MagicStatusResp, raw);
    expect(decoded.request_id).toBe("logreq_AAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect((decoded as Record<string, unknown>).future_field).toBeUndefined();
  });

  it("response schemas use snake_case (no camel response fields)", () => {
    const raw = {
      request_id: "logreq_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      request_secret: "s",
      expires_at: new Date().toISOString(),
    };
    const decoded = decode_lenient(C.MagicRequestResp, raw);
    expect(decoded.request_id).toBeDefined();
    expect("requestId" in (decoded as Record<string, unknown>)).toBe(false);
  });
});
