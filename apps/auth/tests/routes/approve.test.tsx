// Rendered approve regression: consuming a token then scrubbing it from the
// URL must show exactly the outcome status — never the missing-token prompt.
// Uses the real route tree + router with a stub fetch seam (no network, no
// real tokens).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { routeTree } from "../../src/routeTree.gen";

const REQUEST_ID = `logreq_01K${"A".repeat(23)}`;

const stub_fetch = (on_call: (url: string) => void) =>
  (async (url: string | URL | Request) => {
    const str = String(url);
    on_call(str);
    if (str.includes("/magic/consume")) {
      return new Response(
        JSON.stringify({ request_id: REQUEST_ID, status: "email_approved", totp_required: false }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    throw new Error(`unexpected network call ${str}`);
  }) as typeof fetch;

const render_at = (path: string) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createRouter({ routeTree, history });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("approve rendering", () => {
  it("shows exactly the success status after consume + URL scrub, no missing prompt", async () => {
    const calls: Array<string> = [];
    vi.stubGlobal("fetch", stub_fetch((url) => void calls.push(url)));
    const router = render_at("/approve?token=emailtok-fixture");

    expect(await screen.findByRole("button", { name: /approve this request/i })).toBeDefined();
    expect(screen.queryByText(/missing its token/i)).toBeNull();
    // Mount alone never consumes (scanner safety).
    expect(calls.filter((u) => u.includes("/magic/consume"))).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /approve this request/i }));
    await waitFor(() =>
      expect(screen.queryByText(/finish in the tab that requested the link/i)).not.toBeNull(),
    );
    // Token scrubbed from the visible URL/history...
    expect(router.history.location.search).not.toContain("emailtok-fixture");
    // ...yet the outcome (not the missing prompt) renders.
    expect(screen.queryByText(/missing its token/i)).toBeNull();
    expect(screen.queryByText(/approve this request/i)).toBeNull();
    expect(calls.filter((u) => u.includes("/magic/consume"))).toHaveLength(1);
  });

  it("initial missing token still shows the missing flow", async () => {
    vi.stubGlobal(
      "fetch",
      (async () => {
        throw new Error("no network call should happen");
      }) as typeof fetch,
    );
    render_at("/approve");
    expect(await screen.findByText(/missing its token/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /approve this request/i })).toBeNull();
  });
});
