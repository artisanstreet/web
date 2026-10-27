import { describe, expect, it } from "vitest";
import { dashboard_url, parse_return_to } from "../src/lib/return-to.ts";

describe("parse_return_to", () => {
  it("accepts exact dashboard paths", () => {
    expect(parse_return_to("/")).toBe("/");
    expect(parse_return_to("/threads")).toBe("/threads");
    expect(parse_return_to("/machines")).toBe("/machines");
  });

  it("rejects external origins and open redirects", () => {
    expect(parse_return_to("https://evil.example/phish")).toBeNull();
    expect(parse_return_to("//evil.example/")).toBeNull();
    expect(parse_return_to("javascript:alert(1)")).toBeNull();
    expect(parse_return_to("http://dashboard.artisan.st/")).toBeNull();
    expect(parse_return_to("/\\evil")).toBeNull();
    expect(parse_return_to("/../secret")).toBeNull();
  });

  it("accepts absolute dashboard URLs only on the exact origin", () => {
    expect(parse_return_to("https://dashboard.artisan.st/threads")).toBe("/threads");
    expect(parse_return_to("https://dashboard.artisan.st.evil.example/")).toBeNull();
  });

  it("rejects empty and oversized values", () => {
    expect(parse_return_to(null)).toBeNull();
    expect(parse_return_to("")).toBeNull();
    expect(parse_return_to("   ")).toBeNull();
    expect(parse_return_to(`/${"a".repeat(600)}`)).toBeNull();
  });

  it("never carries tokens — dashboard_url appends path only", () => {
    const url = dashboard_url("/threads");
    expect(url).toBe("https://dashboard.artisan.st/threads");
    expect(url).not.toContain("token");
    expect(url).not.toContain("request_secret");
    expect(dashboard_url("https://evil.example/")).toBe("https://dashboard.artisan.st/");
  });
});
