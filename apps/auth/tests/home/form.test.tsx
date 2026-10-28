import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SignInForm } from "../../src/home/form.tsx";
import { load_request_secret } from "../../src/lib/auth/storage.ts";

const request_id = `logreq_01K${"A".repeat(23)}`;
const confirmation = "We have sent an email to your inbox. Check spam aswell!";

const render_form = () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><SignInForm /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "you@artisan.email" } });
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("sign-in request lifecycle", () => {
  it("blocks duplicate sends, stores the secret, and clears confirmation for a resend", async () => {
    const responses: Array<(response: Response) => void> = [];
    const fetch_impl = vi.fn(() => new Promise<Response>((resolve) => responses.push(resolve)));
    vi.stubGlobal("fetch", fetch_impl);
    render_form();
    const form = screen.getByRole("form", { name: "Sign in" });
    fireEvent.submit(form);
    await waitFor(() => expect(fetch_impl).toHaveBeenCalledTimes(1));
    expect((screen.getByRole("button", { name: "Sending email" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(form);
    expect(fetch_impl).toHaveBeenCalledTimes(1);
    responses[0]!(new Response(JSON.stringify({ request_id, request_secret: "fixture-secret", expires_at: "2026-10-28T20:00:00.000Z" }), { headers: { "content-type": "application/json" } }));
    await waitFor(() => expect(screen.getByText(confirmation).getAttribute("aria-hidden")).toBe("false"));
    expect(load_request_secret(request_id)).toBe("fixture-secret");
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.submit(form);
    await waitFor(() => expect(fetch_impl).toHaveBeenCalledTimes(2));
    expect(screen.getByText(confirmation).getAttribute("aria-hidden")).toBe("true");
    responses[1]!(new Response(JSON.stringify({ request_id, request_secret: "replacement-secret", expires_at: "2026-10-28T20:00:00.000Z" }), { headers: { "content-type": "application/json" } }));
    await waitFor(() => expect(load_request_secret(request_id)).toBe("replacement-secret"));
    expect(screen.getByText(confirmation).getAttribute("aria-hidden")).toBe("false");
  });

  it("restores the action after failure without claiming an email was sent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));
    render_form();
    fireEvent.submit(screen.getByRole("form", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("The account service is unreachable"));
    expect(screen.queryByText(confirmation)).toBeNull();
    expect((screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
