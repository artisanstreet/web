import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { dashboard_url, parse_return_to } from "../../../src/lib/auth/return-to.ts";

const origin = "https://artisan.st";
const parse = parse_return_to(origin);

describe("return destination", () => {
  it("defaults to the dashboard on the current origin", () => {
    expect(dashboard_url(origin, undefined)).toBe("https://artisan.st/dashboard");
    expect(dashboard_url("https://artisan.localhost", null)).toBe("https://artisan.localhost/dashboard");
  });

  it("keeps dashboard paths and queries without duplicating the route prefix", () => {
    expect(dashboard_url(origin, "/dashboard?settings=sign-in")).toBe("https://artisan.st/dashboard?settings=sign-in");
    expect(parse("https://artisan.st/dashboard?settings=profile")).toEqual(Option.some("/dashboard?settings=profile"));
  });

  it.each(["//example.com", "https://example.com/dashboard", "/\\example.com", "javascript:alert(1)", "/dashboard/%2f", "/".repeat(513)])(
    "rejects an unsafe redirect: %s", (candidate) => {
      expect(parse(candidate)).toEqual(Option.none());
      expect(dashboard_url(origin, candidate)).toBe("https://artisan.st/dashboard");
    },
  );
});
