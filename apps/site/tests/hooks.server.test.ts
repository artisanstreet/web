import type { Handle } from "@sveltejs/kit/hooks";
import { describe, expect, it, vi } from "vitest";

vi.mock("$app/env/private", () => ({ SITE_PUBLIC_ORIGIN: "https://artisan.localhost" }));

import { handle } from "../src/hooks.server.ts";

const request = (path: string, cookie?: string, origin = "http://artisan.localhost") => {
  const resolve = vi.fn(() => Promise.resolve(new Response("resolved")));
  const event = {
    url: new URL(path, origin),
    cookies: { get: (name: string) => name === "ast_session" ? cookie : undefined },
    setHeaders: vi.fn(),
  };
  const response = handle({ event, resolve } as unknown as Parameters<Handle>[0]);
  return { response, resolve };
};

describe("dashboard session boundary", () => {
  it("redirects a direct unauthenticated visit before resolving the page", async () => {
    const { response, resolve } = request("/dashboard");
    const result = await response;
    expect(result.status).toBe(303);
    expect(result.headers.get("location")).toBe("/auth?return_to=%2Fdashboard");
    expect(resolve).not.toHaveBeenCalled();
  });

  it("preserves a nested destination and its search without downgrading HTTPS behind the proxy", async () => {
    const { response } = request("/dashboard/settings?tab=profile");
    const destination = new URL((await response).headers.get("location")!, "https://artisan.localhost");
    expect(destination.origin).toBe("https://artisan.localhost");
    expect(destination.searchParams.get("return_to")).toBe("/dashboard/settings?tab=profile");
  });

  it("allows a cookie through for client session validation", async () => {
    const { response, resolve } = request("/dashboard", "session-token");
    expect((await response).status).toBe(200);
    expect(resolve).toHaveBeenCalledOnce();
  });

  it("leaves public routes and similarly named paths accessible", async () => {
    for (const path of ["/auth", "/dashboard-preview", "/"]) {
      const { response, resolve } = request(path);
      expect((await response).status).toBe(200);
      expect(resolve).toHaveBeenCalledOnce();
    }
  });
});

describe("registered OAuth callback", () => {
  it("returns the authorization code and state to the canonical origin", async () => {
    const { response, resolve } = request("/oauth/callback?code=opaque%2Bcode&state=flow-state", undefined, "https://auth.artisan.localhost");
    const result = await response;
    const destination = new URL(result.headers.get("location")!);
    expect(result.status).toBe(303);
    expect(destination.origin).toBe("https://artisan.localhost");
    expect(destination.pathname).toBe("/auth/oauth/callback");
    expect(destination.searchParams.get("code")).toBe("opaque+code");
    expect(destination.searchParams.get("state")).toBe("flow-state");
    expect(result.headers.get("referrer-policy")).toBe("no-referrer");
    expect(resolve).not.toHaveBeenCalled();
  });

  it("preserves provider refusals for the callback page to handle", async () => {
    const { response } = request("/oauth/callback?error=access_denied&state=flow-state");
    const destination = new URL((await response).headers.get("location")!);
    expect(destination.searchParams.get("error")).toBe("access_denied");
    expect(destination.searchParams.get("state")).toBe("flow-state");
  });
});
