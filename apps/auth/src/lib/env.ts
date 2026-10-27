// Shared runtime environment for auth.artisan.st.
// All values are public (no secrets in the bundle). Single source for both
// the browser Core client and the CSP connect-src allowlist: Vite replaces
// import.meta.env at build time in client AND server bundles, so headers()
// and fetch() always agree. Production default is the real API origin (the
// app has no same-origin /v1 proxy in prod); platform injects stage VITE_
// vars at build time, local dev overrides to its Core worker.

const read_env = (key: string): string | undefined => {
  const meta_env =
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const val = meta_env[key];
  return typeof val === "string" && val.length > 0 ? val : undefined;
};

export const CORE_API_BASE: string =
  read_env("VITE_CORE_API_URL") ?? "https://api.artisan.st";

export const DASHBOARD_BASE: string =
  read_env("VITE_DASHBOARD_URL") ?? "https://dashboard.artisan.st";

export const CORE_DEV_FALLBACK = "http://127.0.0.1:8787";
