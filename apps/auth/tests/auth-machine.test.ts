import { describe, expect, it } from "vitest";
import {
  finalize_effect,
  next_login_state,
  type LoginState,
} from "../src/lib/auth-machine.ts";
import { Effect } from "effect";

const base: LoginState = {
  request_id: `logreq_01K${"A".repeat(23)}`,
  email: "a@example.com",
  expires_at: "2026-10-26T20:00:00.000Z",
  phase: "requested",
  totp_required: false,
};

const run_finalize = (state: LoginState, opts: { request_secret: string | null; totp_code?: string; recovery_code?: string }) =>
  Effect.runSync(Effect.either(finalize_effect({ state, opts })));

describe("finalize guard", () => {
  it("refuses before the emailed link is approved", () => {
    const r1 = run_finalize(base, { request_secret: "shh" });
    expect(r1._tag).toBe("Left");
    const r2 = run_finalize({ ...base, phase: "expired" }, { request_secret: "shh" });
    expect(r2._tag).toBe("Left");
  });

  it("refuses without the originating secret, even when approved", () => {
    const approved = { ...base, phase: "email_approved" as const };
    const r = run_finalize(approved, { request_secret: null });
    expect(r._tag).toBe("Left");
  });

  it("requires the second factor when the account is TOTP-enrolled", () => {
    const approved = { ...base, phase: "email_approved" as const, totp_required: true };
    const missing = run_finalize(approved, { request_secret: "shh" });
    expect(missing._tag).toBe("Left");
    const with_totp = run_finalize(approved, { request_secret: "shh", totp_code: "123456" });
    expect(with_totp._tag).toBe("Right");
    if (with_totp._tag === "Right") {
      expect(with_totp.right.totp_code).toBe("123456");
    }
    const with_rec = run_finalize(approved, { request_secret: "shh", recovery_code: "r1" });
    expect(with_rec._tag).toBe("Right");
  });

  it("passes the plain case through untouched", () => {
    const approved = { ...base, phase: "email_approved" as const };
    const r = run_finalize(approved, { request_secret: "shh" });
    expect(r._tag).toBe("Right");
    if (r._tag === "Right") {
      expect(r.right).toEqual({ request_id: base.request_id, request_secret: "shh" });
    }
  });
});

describe("status mapping", () => {
  it("tracks pending -> approved -> completed without inventing fields", () => {
    let s = next_login_state(base, {
      status: "pending",
      totp_required: false,
      email: base.email,
      expires_at: base.expires_at,
    });
    expect(s.phase).toBe("pending");
    s = next_login_state(s, {
      status: "email_approved",
      totp_required: true,
      email: base.email,
      expires_at: base.expires_at,
    });
    expect(s.phase).toBe("email_approved");
    expect(s.totp_required).toBe(true);
  });
});
