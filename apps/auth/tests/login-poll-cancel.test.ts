// Poll cancellation: a single Effect fiber per request_id, aborted on
// unmount/resend/expired/completed. No duplicate request loops.

import { describe, expect, it } from "vitest";
import { CoreApi } from "@artisanstreet/core-client";
import { start_login_poll } from "../src/lib/login-poll.ts";

const REQUEST_ID = `logreq_01K${"A".repeat(23)}`;

const stub_api = (status_fn: () => Record<string, unknown>, on_call?: () => void) => {
  const fetch_impl = (async () => {
    on_call?.();
    return new Response(JSON.stringify(status_fn()), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return new CoreApi("", { fetch_impl });
};

const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

describe("login poll cancellation", () => {
  it("stops polling after abort without further calls", async () => {
    let calls = 0;
    const api = stub_api(
      () => ({
        request_id: REQUEST_ID,
        status: "pending",
        totp_required: false,
        email: "a@example.com",
        expires_at: "2026-10-26T20:00:00.000Z",
      }),
      () => {
        calls += 1;
      },
    );
    const controller = new AbortController();
    let terminals = 0;
    const stop = start_login_poll(
      api,
      REQUEST_ID,
      () => "shh",
      {
        on_approved: () => expect.unreachable(),
        on_completed: () => expect.unreachable(),
        on_expired: () => expect.unreachable(),
        on_transient: () => undefined,
        on_terminal: () => {
          terminals += 1;
        },
        is_cancelled: () => controller.signal.aborted,
        format_error: () => "err",
      },
      controller.signal,
    );
    await tick(60);
    const calls_at_abort = calls;
    expect(calls_at_abort).toBeGreaterThan(0);
    controller.abort();
    stop();
    await tick(3_400);
    // At most one in-flight call settles after abort; no looping.
    expect(calls - calls_at_abort).toBeLessThanOrEqual(1);
    expect(terminals).toBe(0);
  });

  it("delivers approval once then stops", async () => {
    let calls = 0;
    const api = stub_api(() => {
      calls += 1;
      return {
        request_id: REQUEST_ID,
        status: "email_approved",
        totp_required: false,
        email: "a@example.com",
        expires_at: "2026-10-26T20:00:00.000Z",
      };
    });
    const controller = new AbortController();
    let approved = 0;
    const stop = start_login_poll(
      api,
      REQUEST_ID,
      () => "shh",
      {
        on_approved: () => {
          approved += 1;
        },
        on_completed: () => expect.unreachable(),
        on_expired: () => expect.unreachable(),
        on_transient: () => undefined,
        on_terminal: () => expect.unreachable(),
        is_cancelled: () => controller.signal.aborted,
        format_error: () => "err",
      },
      controller.signal,
    );
    await tick(80);
    expect(approved).toBe(1);
    expect(calls).toBe(1);
    stop();
  });

  it("surfaces a lost secret as terminal without looping", async () => {
    const api = stub_api(() => {
      throw new Error("must not fetch without a secret");
    });
    const controller = new AbortController();
    let terminal = "";
    const stop = start_login_poll(
      api,
      REQUEST_ID,
      () => null,
      {
        on_approved: () => expect.unreachable(),
        on_completed: () => expect.unreachable(),
        on_expired: () => expect.unreachable(),
        on_transient: () => expect.unreachable(),
        on_terminal: (m) => {
          terminal = m;
        },
        is_cancelled: () => controller.signal.aborted,
        format_error: () => "err",
      },
      controller.signal,
    );
    await tick(60);
    expect(terminal).toMatch(/lost track of the request/i);
    stop();
  });
});
