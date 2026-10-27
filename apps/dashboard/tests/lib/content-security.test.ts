import { describe, expect, it } from "vitest";
import { api_origin_for_csp, build_csp, security_headers } from "../../src/lib/content-security.ts";

describe("dashboard content security", () => {
  it("derives the exact API origin from the same base the client fetches", () => {
    expect(api_origin_for_csp("https://api.artisan.st")).toBe("https://api.artisan.st");
    expect(api_origin_for_csp("")).toBeNull();
    expect(api_origin_for_csp("not a url")).toBeNull();
    expect(api_origin_for_csp("javascript:alert(1)")).toBeNull();
  });

  it("gates scripts on the per-request nonce with no unsafe-inline/eval", () => {
    const csp = build_csp("testnonce123", "https://api.artisan.st");
    const script_src = csp.split("; ").find((directive) => directive.startsWith("script-src")) ?? "";
    expect(script_src).toBe("script-src 'self' 'nonce-testnonce123'");
    expect(script_src).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(csp).toContain("connect-src 'self' https://api.artisan.st");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("falls back to same-origin connect when no API base is configured", () => {
    expect(build_csp("n", "")).toContain("connect-src 'self'");
  });

  it("emits no-referrer, nosniff, private no-store alongside the policy", () => {
    const headers = security_headers("n", "https://api.artisan.st");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Cache-Control"]).toBe("private, no-store");
    expect(headers["Content-Security-Policy"]).toMatch(/script-src/);
  });
});
