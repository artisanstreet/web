import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { useSignIn } from "../../src/home/use-sign-in.ts";
import { load_request_secret } from "../../src/lib/auth/storage.ts";

const request_id = `logreq_01K${"A".repeat(23)}`;
const next_id = `logreq_01K${"B".repeat(23)}`;
const account_id = `acct_01K${"A".repeat(23)}`;
const expires_at = "2099-10-28T20:00:00.000Z";
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "content-type": "application/json" },
});
const requested = (id = request_id) => json({ request_id: id, request_secret: `secret-${id}`, expires_at });
const approved = (id = request_id, totp_required = false) => json({
  request_id: id, status: "email_approved", totp_required, email: "a@example.test", expires_at,
});
const request_body = (init?: RequestInit) => {
  const raw = init?.body as string | Uint8Array | undefined;
  return raw === undefined ? null : JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
};
const render_sign_in = () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return renderHook(() => useSignIn("/machines"), { wrapper: ({ children }: PropsWithChildren) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider> });
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("originating-tab sign-in", () => {
  it("polls with the stored secret, finishes only after approval, verifies the session, and redirects", async () => {
    const calls: Array<{ path: string; body: unknown }> = [];
    const redirect = vi.spyOn(window.location, "assign").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      calls.push({ path, body: request_body(init) });
      if (path.endsWith("/request")) return requested();
      if (path.endsWith("/status")) return approved();
      if (path.endsWith("/finalize")) return json({ session_id: `sess_01K${"A".repeat(23)}`, account_id, expires_at, totp_verified: false });
      if (path === "/v1/me") return json({ account_id, email: "a@example.test", display_name: "A", totp_enrolled: false, machines: [], provider_connections: [], latest_config_version: null });
      throw new Error(`Unexpected URL ${url}`);
    }));
    const { result } = render_sign_in();
    act(() => result.current.finish_sign_in());
    expect(calls).toEqual([]);
    act(() => result.current.request_link(" a@example.test "));
    await waitFor(() => expect(result.current.flow._tag).toBe("Approved"));
    expect(calls.find(call => call.path.endsWith("/status"))?.body).toEqual({ requestId: request_id, requestSecret: `secret-${request_id}` });
    expect(calls.some(call => call.path.endsWith("/finalize"))).toBe(false);
    act(() => result.current.finish_sign_in());
    await waitFor(() => expect(redirect).toHaveBeenCalledWith("https://dashboard.artisan.st/machines"));
    expect(calls.slice(-2).map(call => call.path)).toEqual(["/v1/auth/magic/finalize", "/v1/me"]);
    expect(load_request_secret(request_id)).toBeNull();
  });

  it("retains approval after a bad authenticator code and can retry with a recovery code", async () => {
    const finalized: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/request")) return requested();
      if (String(url).endsWith("/status")) return approved(request_id, true);
      if (String(url).endsWith("/finalize")) {
        finalized.push(request_body(init));
        return json({ error: { code: "invalid_totp", message: "Invalid code", request_id: "fixture" } }, 400);
      }
      throw new Error(`Unexpected URL ${url}`);
    }));
    const { result } = render_sign_in();
    act(() => result.current.request_link("a@example.test"));
    await waitFor(() => expect(result.current.flow._tag).toBe("Approved"));
    act(() => result.current.finish_sign_in());
    await waitFor(() => expect(result.current.flow._tag).toBe("Approved"));
    expect(finalized).toEqual([]);
    act(() => result.current.finish_sign_in("000000"));
    await waitFor(() => expect(finalized).toHaveLength(1));
    await waitFor(() => expect(result.current.flow._tag).toBe("Approved"));
    act(() => result.current.finish_sign_in(undefined, "recovery-fixture"));
    await waitFor(() => expect(finalized).toHaveLength(2));
    expect(finalized).toEqual([
      { requestId: request_id, requestSecret: `secret-${request_id}`, totpCode: "000000" },
      { requestId: request_id, requestSecret: `secret-${request_id}`, recoveryCode: "recovery-fixture" },
    ]);
  });

  it("expires without finalizing and lets a replacement request proceed", async () => {
    let requests = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).endsWith("/request")) return requested(requests++ === 0 ? request_id : next_id);
      if (String(url).endsWith("/status")) return requests === 1
        ? json({ request_id, status: "expired", totp_required: false, email: "a@example.test", expires_at })
        : approved(next_id);
      throw new Error(`Unexpected URL ${url}`);
    }));
    const { result } = render_sign_in();
    act(() => result.current.request_link("a@example.test"));
    await waitFor(() => expect(result.current.flow._tag).toBe("Expired"));
    expect(load_request_secret(request_id)).toBeNull();
    act(() => result.current.request_link("a@example.test"));
    await waitFor(() => expect(result.current.flow._tag).toBe("Approved"));
    expect(load_request_secret(next_id)).toBe(`secret-${next_id}`);
  });

  it("ignores a late poll answer after resending", async () => {
    let first_poll: ((response: Response) => void) | undefined;
    let requests = 0;
    const fetch_impl = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/request")) return requested(requests++ === 0 ? request_id : next_id);
      if (String(url).endsWith("/status")) {
        const body = request_body(init);
        if (body.requestId === request_id) return new Promise<Response>(resolve => { first_poll = resolve; });
        return approved(next_id);
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetch_impl);
    const { result } = render_sign_in();
    act(() => result.current.request_link("a@example.test"));
    await waitFor(() => expect(first_poll).toBeDefined());
    act(() => result.current.request_link("b@example.test"));
    await waitFor(() => expect(result.current.flow._tag).toBe("Approved"));
    await act(async () => { first_poll!(approved(request_id)); });
    expect(result.current.flow._tag === "Approved" && result.current.flow.login.request_id).toBe(next_id);
    expect(load_request_secret(request_id)).toBeNull();
  });
  it("does not store secrets or start a poll when the email request returns after unmount", async () => {
    let respond: ((response: Response) => void) | undefined;
    const fetch_impl = vi.fn(() => new Promise<Response>(resolve => { respond = resolve; }));
    vi.stubGlobal("fetch", fetch_impl);
    const { result, unmount } = render_sign_in();
    act(() => result.current.request_link("a@example.test"));
    await waitFor(() => expect(respond).toBeDefined());
    unmount();
    await act(async () => { respond!(requested()); });
    expect(load_request_secret(request_id)).toBeNull();
    expect(fetch_impl).toHaveBeenCalledTimes(1);
  });

});
