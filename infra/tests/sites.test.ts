import { describe, expect, it } from "vitest";
import { build_auth_props, build_dashboard_props } from "../src/sites.ts";

const origins = {
  core_origin: "https://api-pr-42.example.dev",
  relay_origin: "https://relay-pr-42.example.dev",
  auth_origin: "https://auth-pr-42.example.dev",
  dashboard_origin: "https://dashboard-pr-42.example.dev",
};

describe("dual Start Workers (auth + dashboard)", () => {
  it("declares two independent Workers with exact custom domains, no WorkersDev", () => {
    const auth = build_auth_props("pr-42", origins);
    const dash = build_dashboard_props("pr-42", origins);
    expect(auth.name).not.toBe(dash.name);
    expect(auth.domain).toBe("auth-pr-42.example.dev");
    expect(dash.domain).toBe("dashboard-pr-42.example.dev");
    expect(auth.workersDev).toBe(false);
    expect(dash.workersDev).toBe(false);
    expect(auth.rootDir).toContain("apps/auth");
    expect(dash.rootDir).toContain("apps/dashboard");
  });

  it("binds Core API + auth/dashboard public origins for browser shells", () => {
    const auth = build_auth_props("pr-42", origins);
    expect(auth.env.VITE_CORE_API_URL).toBe(origins.core_origin);
    expect(auth.env.VITE_RELAY_URL).toBe(origins.relay_origin);
    expect(auth.env.VITE_AUTH_URL).toBe(origins.auth_origin);
    expect(auth.env.VITE_DASHBOARD_URL).toBe(origins.dashboard_origin);
    const dash = build_dashboard_props("pr-42", origins);
    expect(dash.env.VITE_CORE_API_URL).toBe(origins.core_origin);
    expect(dash.env.VITE_DASHBOARD_URL).toBe(origins.dashboard_origin);
  });

  it("memo covers shared workspace sources plus lockfile", () => {
    const auth = build_auth_props("pr-42", origins);
    expect(auth.memo.lockfile).toBe(true);
    expect(auth.memo.include.join(" ")).toContain("packages/ui");
    expect(auth.memo.include.join(" ")).toContain("packages/core-client");
  });
});
