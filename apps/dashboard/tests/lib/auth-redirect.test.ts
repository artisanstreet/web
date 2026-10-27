import { describe, expect, it } from "vitest";
import { parse_return_path, sign_in_url } from "../../src/lib/auth-redirect.ts";

describe("auth redirect allowlist", () => {
  it("accepts exact dashboard paths", () => {
    expect(parse_return_path("/")).toBe("/");
    expect(parse_return_path("/machines")).toBe("/machines");
    expect(parse_return_path("/security")).toBe("/security");
  });

  it("rejects external origins and schemes", () => {
    expect(parse_return_path("https://evil.test/")).toBeNull();
    expect(parse_return_path("//auth.artisan.st/")).toBeNull();
    expect(parse_return_path("javascript:alert(1)")).toBeNull();
    expect(parse_return_path("/\\evil")).toBeNull();
    expect(parse_return_path("/..")).toBeNull();
  });

  it("builds a safe sign-in url with allowlisted return", () => {
    const url = sign_in_url("/machines");
    expect(url).toContain("auth.artisan.st");
    expect(url).toContain(encodeURIComponent("/machines"));
  });

  it("falls back to root for unsafe return", () => {
    const url = sign_in_url("https://evil.test/");
    expect(url).toContain(encodeURIComponent("/"));
  });
});
