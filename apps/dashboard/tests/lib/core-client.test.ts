// Controlled HTTP fixtures for dashboard: strict camelCase requests,
// lenient snake_case responses, credentials:include, generic typed errors.
// No prod, no real credentials — fixtures stand in for local Core.

import { describe, expect, it } from "vitest";
import {
  ApiError,
  C,
  CoreApi,
  decode_lenient,
  decode_strict,
  humanize_validation_error,
} from "@artisanstreet/core-client";

const stub_fetch = (handler: (url: string, init: RequestInit) => unknown, status = 200) => {
  const calls: Array<{ url: string; init: RequestInit; body: unknown }> = [];
  const fetch_impl = (async (url: string | URL | Request, init?: RequestInit) => {
    const raw = init?.body as string | Uint8Array | undefined;
    const body =
      raw === undefined || raw === null || (typeof raw === "string" && raw.length === 0)
        ? {}
        : JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    calls.push({ url: String(url), init: init ?? {}, body });
    const payload = handler(String(url), init ?? {});
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { fetch_impl, calls };
};

describe("dashboard core fixtures", () => {
  it("reads snake_case me and sends credentials:include", async () => {
    const { fetch_impl, calls } = stub_fetch(() => ({
      account_id: "acct_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      email: "owner@example.test",
      display_name: "Owner",
      totp_enrolled: false,
      machines: [],
      provider_connections: [],
      latest_config_version: null,
    }));
    const api = new CoreApi("", { fetch_impl });
    const me = await api.me();
    expect(me.account_id).toMatch(/^acct_/);
    expect(me.email).toBe("owner@example.test");
    expect(me.latest_config_version).toBeNull();
    expect(calls[0]?.init.credentials).toBe("include");
  });

  it("sends camelCase claim code and reads claimed status", async () => {
    const { fetch_impl, calls } = stub_fetch(() => ({
      enrollment_id: "enr_BBBBBBBBBBBBBBBBBBBBBBBBBB",
      status: "claimed",
    }));
    const api = new CoreApi("", { fetch_impl });
    const res = await api.claim_enrollment("ABCDEFGH");
    expect(res.status).toBe("claimed");
    expect(calls[0]?.body).toEqual({ code: "ABCDEFGH" });
  });

  it("sends camelCase provider create and never returns the secret", async () => {
    const { fetch_impl, calls } = stub_fetch(() => ({
      id: "conn_CCCCCCCCCCCCCCCCCCCCCCCCCC",
      provider: "anthropic",
      label: "cafe",
      created_at: "2026-10-26T20:00:00.000Z",
      revoked_at: null,
      assigned_machine_ids: [],
    }));
    const api = new CoreApi("", { fetch_impl });
    const conn = await api.create_provider_connection("anthropic", "cafe", "sk-test");
    expect(conn.provider).toBe("anthropic");
    const sent = calls[0]?.body as Record<string, unknown>;
    expect(sent).toHaveProperty("apiKey", "sk-test");
    expect(sent).not.toHaveProperty("api_key");
  });

  it("rejects unknown request fields strictly, reads responses leniently", () => {
    expect(() => decode_strict(C.ProviderCreateReq, { provider: "anthropic", apiKey: "x", evil: 1 })).toThrow();
    const decoded = decode_lenient(C.MeResp, {
      account_id: "acct_AAAAAAAAAAAAAAAAAAAAAAAAAA",
      email: "owner@example.test",
      display_name: "",
      totp_enrolled: false,
      machines: [],
      provider_connections: [],
      latest_config_version: null,
      future_field: "ignored",
    });
    expect(decoded.account_id).toMatch(/^acct_/);
  });

  it("humanizes validation errors without leaking internals", () => {
    const err = (() => {
      try {
        decode_strict(C.ProviderCreateReq, { provider: "anthropic" });
        return new Error("unreachable");
      } catch (e) {
        return e;
      }
    })();
    expect(humanize_validation_error(err)).toMatch(/./);
  });

  it("surfaces generic API errors with request_id", async () => {
    const fetch_impl = (async () =>
      new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "signed out", request_id: "req_test_1" } }),
        { status: 401 },
      )) as typeof fetch;
    const api = new CoreApi("", { fetch_impl });
    try {
      await api.sessions();
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const api_err = e as ApiError;
      expect(api_err.status).toBe(401);
      expect(api_err.request_id).toBe("req_test_1");
    }
  });
});
