import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { normalize_origin, validate_origins } from "../src/config.ts";

const origins = (stage: string, site: string) =>
  validate_origins(stage, "https://api.example.dev", "https://relay.example.dev", site);

describe("deployment origins", () => {
  it("normalizes host casing and trailing slashes", async () => {
    expect(await Effect.runPromise(normalize_origin(" HTTPS://Artisan.ST/ ", "site"))).toBe("https://artisan.st");
  });

  it.each([
    undefined, "", "https://*.example.com", "https://%2A.example.com", "http://example.com",
    "https://user:password@example.com", "https://example.com/auth", "https://example.com?q=1", "https://example.com/#fragment",
  ])("rejects invalid origins: %s", async (raw) => {
    expect(await Effect.runPromise(Effect.isFailure(normalize_origin(raw, "site")))).toBe(true);
  });

  it("keeps preview stages away from the production hostname", async () => {
    expect(await Effect.runPromise(Effect.isSuccess(origins("prod", "https://artisan.st")))).toBe(true);
    expect(await Effect.runPromise(Effect.isSuccess(origins("pr-42", "https://preview.example.dev")))).toBe(true);
    expect(await Effect.runPromise(Effect.isFailure(origins("pr-42", "https://artisan.st")))).toBe(true);
    expect(await Effect.runPromise(Effect.isFailure(origins("prod", "https://preview.example.dev")))).toBe(true);
  });

  it("rejects invalid stages and collisions with API or relay workers", async () => {
    expect(await Effect.runPromise(Effect.isFailure(origins("../prod", "https://preview.example.dev")))).toBe(true);
    expect(await Effect.runPromise(Effect.isFailure(origins("pr-42", "https://api.example.dev")))).toBe(true);
    expect(await Effect.runPromise(Effect.isFailure(origins("pr-42", "https://relay.example.dev")))).toBe(true);
  });
});
