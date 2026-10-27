// Shared runtime environment for auth.artisan.st.
// All values are public (no secrets in the bundle).

const read_env = (key: string): string | undefined => {
  const meta_env =
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const val = meta_env[key];
  return typeof val === "string" && val.length > 0 ? val : undefined;
};

export const CORE_API_BASE: string = read_env("VITE_CORE_API_URL") ?? "";

export const DASHBOARD_BASE: string =
  read_env("VITE_DASHBOARD_URL") ?? "https://dashboard.artisan.st";

export const CORE_DEV_FALLBACK = "http://127.0.0.1:8787";
