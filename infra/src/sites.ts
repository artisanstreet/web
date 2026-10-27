import * as Path from "node:path";
import { fileURLToPath as file_url_to_path } from "node:url";
import { hostname_from_origin, worker_name } from "./config.ts";

const INFRA_SRC = Path.dirname(file_url_to_path(import.meta.url));
export const WEB_ROOT = Path.resolve(INFRA_SRC, "..", "..");
export const AUTH_ROOT = Path.join(WEB_ROOT, "apps", "auth");
export const DASHBOARD_ROOT = Path.join(WEB_ROOT, "apps", "dashboard");

export type SiteEnv = {
  readonly VITE_CORE_API_URL: string;
  readonly VITE_RELAY_URL: string;
  readonly VITE_AUTH_URL: string;
  readonly VITE_DASHBOARD_URL: string;
};

export type SiteProps = {
  readonly rootDir: string;
  readonly domain: string;
  readonly workersDev: false;
  readonly env: SiteEnv;
  readonly memo: { readonly include: ReadonlyArray<string>; readonly lockfile: true };
};

const site_env_for = (
  core_origin: string,
  relay_origin: string,
  auth_origin: string,
  dashboard_origin: string,
): SiteEnv => ({
  VITE_CORE_API_URL: core_origin,
  VITE_RELAY_URL: relay_origin,
  VITE_AUTH_URL: auth_origin,
  VITE_DASHBOARD_URL: dashboard_origin,
});

// REAL props factories used by the deployed Workers AND tests (no mirrors).
// Two independent Start Workers, exact custom domains on every stage,
// no WorkersDev. Memo includes shared workspace sources so sibling
// package edits retrigger the build.
export function build_auth_props(
  stage: string,
  origins: { core_origin: string; relay_origin: string; auth_origin: string; dashboard_origin: string },
) {
  return {
    name: worker_name(stage, "auth"),
    rootDir: AUTH_ROOT,
    domain: hostname_from_origin(origins.auth_origin),
    workersDev: false as const,
    env: site_env_for(origins.core_origin, origins.relay_origin, origins.auth_origin, origins.dashboard_origin),
    memo: {
      include: ["**/*", "../../packages/ui/src/**/*", "../../packages/core-client/src/**/*"],
      lockfile: true as const,
    },
  } satisfies SiteProps & { readonly name: string };
}

export function build_dashboard_props(
  stage: string,
  origins: { core_origin: string; relay_origin: string; auth_origin: string; dashboard_origin: string },
) {
  return {
    name: worker_name(stage, "dashboard"),
    rootDir: DASHBOARD_ROOT,
    domain: hostname_from_origin(origins.dashboard_origin),
    workersDev: false as const,
    env: site_env_for(origins.core_origin, origins.relay_origin, origins.auth_origin, origins.dashboard_origin),
    memo: {
      include: ["**/*", "../../packages/ui/src/**/*", "../../packages/core-client/src/**/*"],
      lockfile: true as const,
    },
  } satisfies SiteProps & { readonly name: string };
}
