// Controlled HTTP fixtures: the client talks to Core with strict requests,
// lenient responses, credentials:include, and generic errors. No real email
// sends (provider is still 401 in prod) — fixtures stand in for the local
// Core test-mail adapter.

import { describe, expect, it } from "vitest";
import {
  ApiError,
  C,
  CoreApi,
  decode_lenient,
  decode_strict,
  humanize_validation_error,
} from "@artisanstreet/core-client";

const { MagicRequest, MagicRequestResp } = C;

const REQUEST_ID = `logreq_01K${"A".repeat(23)}`;

const stub_fetch = (handler: (url: string, init: RequestInit) => unknown) => {
  const calls: Array<{ url: string; init: RequestInit; body: unknown }> = [];
  const fetch_impl = (async (url: string | URL | Request, init?: RequestInit) => {
    const raw = init?.body as string | Uint8Array | undefined;
    const body =
      raw === undefined || raw === null || (typeof raw === "string" && raw.length === 0)
        ? {}
        : JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    calls.push({ url: String(url), init: init ?? {}, body });
    return new Response(JSON.stringify(handler(String(url), init ?? {})), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { fetch_impl, calls };
};

describe("core api fixtures", () => {
  it("sends camelCase requests and reads snake_case responses", async () => {
    const { fetch_impl, calls } = stub_fetch((url) => {
      if (url.includes("/magic/request")) {
        return { request_id: REQUEST_ID, request_secret: "shh", expires_at: "2026-10-26T20:00:00.000Z" };
      }
      throw new Error(`unexpected ${url}`);
    });
    const api = new CoreApi("", { fetch_impl });
    const res = await api.request_magic_link("a@example.com", undefined, "This browser");
    expect(res.request_id).toBe(REQUEST_ID);
    const sent = calls[0]?.body as Record<string, unknown>;
    expect(sent).toHaveProperty("email", "a@example.com");
    expect(sent).toHaveProperty("deviceName", "This browser");
    expect(sent).not.toHaveProperty("request_id");
  });

  it("uses credentials:include so the host-only cookie rides along", async () => {
    const { fetch_impl, calls } = stub_fetch(() => ({
      account_id: `acct_01K${"A".repeat(23)}`,
      email: "a@example.com",
      display_name: "",
      totp_enrolled: false,
      machines: [],
      provider_connections: [],
      latest_config_version: null,
    }));
    const api = new CoreApi("", { fetch_impl });
    await api.me();
    expect(calls[0]?.init.credentials).toBe("include");
  });

  it("rejects unknown request fields strictly, reads responses leniently", () => {
    expect(() =>
      decode_strict(MagicRequest, { email: "a@example.com", evil: 1 }),
    ).toThrow();
    const decoded = decode_lenient(MagicRequestResp, {
      request_id: REQUEST_ID,
      request_secret: "shh",
      expires_at: "2026-10-26T20:00:00.000Z",
      future_field: "ignored",
    });
    expect(decoded.request_id).toBe(REQUEST_ID);
  });

  it("humanizes validation errors without leaking internals", () => {
    const err = (() => {
      try {
        decode_strict(MagicRequest, { email: "not-an-email" });
        return new Error("unreachable");
      } catch (e) {
        return e;
      }
    })();
    expect(humanize_validation_error(err)).toBe("Enter a valid email address.");
  });

  it("surfaces generic API errors with request_id and safe message", async () => {
    const fetch_impl = (async () =>
      new Response(
        JSON.stringify({ error: { code: "bad_request", message: "that address cannot receive mail", request_id: "r1" } }),
        { status: 400 },
      )) as typeof fetch;
    const api = new CoreApi("", { fetch_impl });
    try {
      await api.request_magic_link("a@example.com");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const api_err = e as ApiError;
      expect(api_err.request_id).toBe("r1");
      expect(api_err.message).toContain("cannot receive mail");
    }
  });

  it("consume posts the email token explicitly (never via GET)", async () => {
    const { fetch_impl, calls } = stub_fetch((url, init) => {
      expect(init.method ?? "POST").not.toBe("GET");
      if (url.includes("/magic/consume")) {
        return { request_id: REQUEST_ID, status: "email_approved", totp_required: false };
      }
      throw new Error(`unexpected ${url}`);
    });
    const api = new CoreApi("", { fetch_impl });
    const res = await api.consume_magic_link("emailtok");
    expect(res.request_id).toBe(REQUEST_ID);
    expect(calls[0]?.body).toEqual({ token: "emailtok" });
  });

  it("finalize refuses without the originating secret", () => {
    const api = new CoreApi("", {
      fetch_impl: (async () => new Response("{}", { status: 200 })) as typeof fetch,
    });
    expect(() => api.finalize_magic_link(REQUEST_ID, null)).toThrow(/request secret/i);
  });
});
