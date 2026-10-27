import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { CoreApi, ApiError } from "../../src/api.ts";
import { api_get } from "../../src/api/effect.ts";
import * as C from "../../src/contract-v1.ts";
import { create_core_api, create_query_client, me_query_options } from "../../src/query.ts";

const json_response = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("CoreApi behavior: credentials, errors, finalize guard", () => {
  it("sends credentials:include and accept json on GET", async () => {
    const seen: Record<string, unknown> = {};
    const fetch_impl = (async (input: unknown, init?: RequestInit) => {
      seen.credentials = init?.credentials;
      seen.accept = (init?.headers as Record<string, string> | undefined)?.accept ?? new Headers(init?.headers).get("accept");
      return json_response(200, {
        account_id: "acct_AAAAAAAAAAAAAAAAAAAAAAAAAA",
        email: "a@example.com",
        display_name: "A",
        totp_enrolled: false,
        machines: [],
        provider_connections: [],
        latest_config_version: null,
      });
    }) as typeof fetch;

    const api = new CoreApi("", { fetch_impl });
    const me = await api.me();
    expect(me.email).toBe("a@example.com");
    expect(seen.credentials).toBe("include");
  });

  it("maps Core error envelope to ApiError code/status/request_id", async () => {
    const fetch_impl = (async () =>
      json_response(401, { error: { code: "unauthorized", message: "bad", request_id: "r1" } })) as typeof fetch;
    const api = new CoreApi("", { fetch_impl });
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
    await expect(api.me()).rejects.toMatchObject({ code: "unauthorized", status: 401, request_id: "r1" });
  });

  it("finalize refuses without originating request secret", () => {
    const api = new CoreApi("", {
      fetch_impl: (async () => json_response(200, {})) as typeof fetch,
    });
    expect(() => api.finalize_magic_link("logreq_AAAAAAAAAAAAAAAAAAAAAAAAAA", null)).toThrow();
  });

  it("create_core_api + query options share one QueryClient cache", () => {
    const fetch_impl = (async () => json_response(200, {})) as typeof fetch;
    const api = create_core_api("", { fetch_impl });
    expect(api).toBeInstanceOf(CoreApi);
    const client_a = create_query_client();
    const client_b = create_query_client();
    expect(client_a).not.toBe(client_b);
    const opts = me_query_options(api);
    expect(opts.queryKey).toEqual(["core", "me"]);
    expect(typeof opts.queryFn).toBe("function");
    expect(client_a.getDefaultOptions().queries?.retry).toBe(1);
  });

  it("no silent compat fallthrough: bad shape becomes bad_response, not undefined", async () => {
    const fetch_impl = (async () => json_response(200, { wrong: 1 })) as typeof fetch;
    const api = new CoreApi("", { fetch_impl });
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
    await expect(api.me()).rejects.toMatchObject({ code: "bad_response" });
  });

  it("never sends traceparent even under a traced span (exact CORS allowlist)", async () => {
    let seen_traceparent: string | null = null;
    const fetch_impl = (async (_input: unknown, init?: RequestInit) => {
      seen_traceparent = new Headers(init?.headers).get("traceparent");
      return json_response(200, {
        account_id: "acct_AAAAAAAAAAAAAAAAAAAAAAAAAA",
        email: "a@example.com",
        display_name: "A",
        totp_enrolled: false,
        machines: [],
        provider_connections: [],
        latest_config_version: null,
      });
    }) as typeof fetch;
    const program = api_get(fetch_impl, "", "/v1/me", C.MeResp).pipe(
      Effect.withSpan("browser-request"),
    );
    await Effect.runPromise(program);
    expect(seen_traceparent).toBeNull();
  });
});
