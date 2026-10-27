import { describe, expect, it } from "vitest";
import { api_origin_for_csp, build_csp, security_headers } from "../src/lib/content-security.ts";

const NONCE = "a".repeat(43);

describe("csp builder", () => {
  it("gates scripts on the nonce without unsafe-inline or eval", () => {
    const csp = build_csp(NONCE, null);
    expect(csp).toContain(`script-src 'self' 'nonce-${NONCE}'`);
    const script_src = csp.split(";").find((part) => part.trim().startsWith("script-src")) ?? "";
    expect(script_src).not.toContain("unsafe-inline");
    expect(script_src).not.toContain("unsafe-eval");
  });

  it("allowlist connect-src to the exact configured API origin", () => {
    expect(build_csp(NONCE, "https://api.artisan.st")).toContain(
      "connect-src 'self' https://api.artisan.st",
    );
    expect(build_csp(NONCE, null)).toContain("connect-src 'self'");
    expect(build_csp(NONCE, "")).not.toContain("*");
  });

  it("rejects non-http origins and credentialed URLs", () => {
    expect(api_origin_for_csp("javascript:alert(1)")).toBeNull();
    expect(api_origin_for_csp("https://user:pass@api.artisan.st")).toBeNull();
    expect(api_origin_for_csp("not-a-url")).toBeNull();
    expect(api_origin_for_csp("https://api.artisan.st/v1")).toBe("https://api.artisan.st");
  });

  it("locks down framing, objects, and caching", () => {
    const headers = security_headers(NONCE, null);
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Cache-Control"]).toBe("private, no-store");
  });
});
