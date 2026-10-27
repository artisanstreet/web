import { describe, expect, it } from "vitest";
import {
  AUTH_PROD_ORIGIN,
  DASHBOARD_PROD_ORIGIN,
  STACK_NAME,
  assert_all_origins_distinct,
  assert_browser_origins_for_stage,
  assert_origin_for_stage,
  hostname_from_origin,
  normalize_origin,
  worker_name,
} from "../src/config.ts";

describe("stack identity (stage isolation)", () => {
  it("uses the web stack name", () => {
    expect(STACK_NAME).toBe("ast-web");
  });

  it("isolates site workers by stage + site", () => {
    expect(worker_name("prod", "auth")).not.toBe(worker_name("prod", "dashboard"));
    expect(worker_name("prod", "auth")).not.toBe(worker_name("pr-42", "auth"));
    expect(worker_name("pr-42", "auth")).toContain("pr-42");
  });
});

describe("public origins (exact, no wildcards)", () => {
  it("normalizes case + trailing slash", () => {
    expect(normalize_origin("HTTPS://Auth.Example.Dev/", "AST_AUTH_ORIGIN")).toBe(
      "https://auth.example.dev",
    );
  });

  it("rejects wildcards", () => {
    expect(() => normalize_origin("https://*.example.com", "AST_AUTH_ORIGIN")).toThrow();
    expect(() => normalize_origin("https://%2A.example.com", "AST_AUTH_ORIGIN")).toThrow();
  });

  it("requires exact https for every deployed stage", () => {
    const auth = normalize_origin("https://auth.example.dev", "AST_AUTH_ORIGIN");
    expect(() => assert_origin_for_stage(auth, "AST_AUTH_ORIGIN", "prod")).not.toThrow();
    expect(() => assert_origin_for_stage(auth, "AST_AUTH_ORIGIN", "pr-42")).not.toThrow();
    expect(() => assert_origin_for_stage("http://auth.example.dev", "AST_AUTH_ORIGIN", "pr-42")).toThrow();
  });

  it("all four workers have distinct hostnames", () => {
    expect(() =>
      assert_all_origins_distinct(
        "https://api.example.dev",
        "https://relay.example.dev",
        "https://auth.example.dev",
        "https://dashboard.example.dev",
      ),
    ).not.toThrow();
    expect(() =>
      assert_all_origins_distinct(
        "https://api.example.dev",
        "https://relay.example.dev",
        "https://api.example.dev",
        "https://dashboard.example.dev",
      ),
    ).toThrow();
  });

  it("prod pins known browser origins; previews must not reuse prod", () => {
    expect(() => assert_browser_origins_for_stage(AUTH_PROD_ORIGIN, DASHBOARD_PROD_ORIGIN, "prod")).not.toThrow();
    expect(() =>
      assert_browser_origins_for_stage("https://auth-pr-42.example.dev", "https://dashboard-pr-42.example.dev", "pr-42"),
    ).not.toThrow();
    expect(() => assert_browser_origins_for_stage(AUTH_PROD_ORIGIN, DASHBOARD_PROD_ORIGIN, "pr-42")).toThrow();
  });

  it("derives hostnames lowercased", () => {
    expect(hostname_from_origin("https://AUTH.Example.Dev")).toBe("auth.example.dev");
  });
});
