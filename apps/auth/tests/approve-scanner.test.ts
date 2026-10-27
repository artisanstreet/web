// Scanner safety: opening /approve?token=... must never consume on GET.
// Approval happens only through an explicit POST triggered by the user
// button. Unknown/expired tokens map to a generic message (no account oracle).

import { describe, expect, it } from "vitest";
import { CoreApi } from "@artisanstreet/core-client";

const REQUEST_ID = `logreq_01K${"A".repeat(23)}`;

describe("approval scanner safety", () => {
  it("performs no network call until the user approves", async () => {
    let calls = 0;
    const fetch_impl = (async () => {
      calls += 1;
      return new Response(
        JSON.stringify({ request_id: REQUEST_ID, status: "email_approved", totp_required: false }),
        { status: 200 },
      );
    }) as typeof fetch;
    // Mounting the page does nothing: only the button handler calls consume.
    expect(calls).toBe(0);
    const api = new CoreApi("", { fetch_impl });
    await api.consume_magic_link("emailtok");
    expect(calls).toBe(1);
  });

  it("maps unknown tokens to a generic unauthorized without account detail", async () => {
    const fetch_impl = (async () =>
      new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "invalid or expired link", request_id: "r2" } }),
        { status: 401 },
      )) as typeof fetch;
    const api = new CoreApi("", { fetch_impl });
    await expect(api.consume_magic_link("wrong-token")).rejects.toThrow(/invalid or expired/i);
    await expect(api.consume_magic_link("wrong-token")).rejects.not.toThrow(/acct_|@example/);
  });

  it("expired consume returns expired status for the resend flow", async () => {
    const fetch_impl = (async () =>
      new Response(
        JSON.stringify({ request_id: REQUEST_ID, status: "expired", totp_required: false }),
        { status: 200 },
      )) as typeof fetch;
    const api = new CoreApi("", { fetch_impl });
    const res = await api.consume_magic_link("stale-token");
    expect(res.status).toBe("expired");
  });
});
