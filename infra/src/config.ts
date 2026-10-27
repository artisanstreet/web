import * as Result from "effect/Result";

// Pure deploy-input helpers for ast-web Alchemy IaC (credential-free).

export const STACK_NAME = "ast-web" as const;

const STAGE_PATTERN = /^[a-z0-9][-_a-z0-9]*$/;

export function assert_valid_stage(stage: string): void {
  if (!STAGE_PATTERN.test(stage)) {
    throw new Error(
      `invalid stage ${JSON.stringify(stage)}: must match [a-z0-9][-_a-z0-9]* (see alchemy CLI --stage)`,
    );
  }
}

export const API_PROD_ORIGIN = "https://api.artisan.st" as const;
export const RELAY_PROD_ORIGIN = "https://relay.editor.artisan.st" as const;
export const AUTH_PROD_ORIGIN = "https://auth.artisan.st" as const;
export const DASHBOARD_PROD_ORIGIN = "https://dashboard.artisan.st" as const;

export function worker_name(stage: string, site: "auth" | "dashboard"): string {
  assert_valid_stage(stage);
  return `ast-web-${site}-${stage}`;
}

export function normalize_origin(raw: string | undefined, var_name: string): string {
  const trimmed = (raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error(`${var_name} is required`);
  if (trimmed.includes("*")) throw new Error(`${var_name} must be a single exact origin (no wildcards)`);
  const parsed = Result.try(() => new URL(trimmed));
  if (Result.isFailure(parsed)) {
    throw new Error(`${var_name} must be a valid absolute URL (got ${JSON.stringify(trimmed)})`);
  }
  const u = parsed.success;
  if (u.username || u.password) throw new Error(`${var_name} must not embed credentials`);
  if (u.search || u.hash) throw new Error(`${var_name} must not include query or fragment`);
  if ((u.pathname !== "/" && u.pathname !== "") || trimmed.endsWith("/")) {
    throw new Error(`${var_name} must be a bare origin with no path (got ${JSON.stringify(trimmed)})`);
  }
  if (!u.hostname) throw new Error(`${var_name} must include a hostname`);
  const host = u.hostname.toLowerCase();
  if (host.includes("*")) throw new Error(`${var_name} must be a single exact origin (no wildcards)`);
  const def_port = u.protocol === "https:" ? "443" : "80";
  const port = u.port && u.port !== def_port ? `:${u.port}` : "";
  return `${u.protocol}//${host}${port}`;
}

export function assert_origin_for_stage(origin: string, var_name: string, stage: string): void {
  assert_valid_stage(stage);
  const u = new URL(origin);
  if (u.protocol !== "https:") {
    throw new Error(`${var_name} must be an exact https origin (got ${JSON.stringify(origin)})`);
  }
}

export function hostname_from_origin(origin: string): string {
  return new URL(origin).hostname.toLowerCase();
}

export function assert_all_origins_distinct(
  core_origin: string,
  relay_origin: string,
  auth_origin: string,
  dashboard_origin: string,
): void {
  const parsed = Result.try(() => [
    new URL(core_origin).hostname.toLowerCase(),
    new URL(relay_origin).hostname.toLowerCase(),
    new URL(auth_origin).hostname.toLowerCase(),
    new URL(dashboard_origin).hostname.toLowerCase(),
  ]);
  if (Result.isFailure(parsed)) {
    throw new Error("AST_*_ORIGIN values must be valid absolute URLs");
  }
  const hosts = parsed.success;
  if (hosts.some((h) => !h)) {
    throw new Error("AST_*_ORIGIN values must include hostnames");
  }
  if (new Set(hosts).size !== hosts.length) {
    throw new Error("AST_CORE/RELAY/AUTH/DASHBOARD origins must have distinct hostnames (separate Workers cannot share one custom-domain owner)");
  }
}

export function assert_browser_origins_for_stage(
  auth_origin: string,
  dashboard_origin: string,
  stage: string,
): void {
  assert_valid_stage(stage);
  assert_origin_for_stage(auth_origin, "AST_AUTH_ORIGIN", stage);
  assert_origin_for_stage(dashboard_origin, "AST_DASHBOARD_ORIGIN", stage);
  if (stage === "prod") {
    if (auth_origin !== AUTH_PROD_ORIGIN) {
      throw new Error(`AST_AUTH_ORIGIN must be ${AUTH_PROD_ORIGIN} in prod`);
    }
    if (dashboard_origin !== DASHBOARD_PROD_ORIGIN) {
      throw new Error(`AST_DASHBOARD_ORIGIN must be ${DASHBOARD_PROD_ORIGIN} in prod`);
    }
  } else {
    if (auth_origin === AUTH_PROD_ORIGIN || dashboard_origin === DASHBOARD_PROD_ORIGIN) {
      throw new Error("preview stages must not reuse prod browser origins (second custom-domain attach would move ownership)");
    }
  }
}
