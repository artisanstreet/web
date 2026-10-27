// Shared runtime environment for dashboard.artisan.st.
// All values are public (no secrets in the bundle).
// TEMPORARY local copy until platform provides shared env; converges to
// platform-owned config. Do not add secrets here.

import { Either } from "effect";

const read_env_record = (): Record<string, unknown> =>
  Either.getOrElse(
    Either.try({
      try: () => (import.meta as unknown as { env?: Record<string, unknown> }).env ?? {},
      catch: () => null,
    }),
    () => ({}),
  );

const read_env = (key: string): string | undefined => {
  const val = read_env_record()[key];
  return typeof val === "string" && val.length > 0 ? val : undefined;
};

const is_dev = (): boolean => read_env_record().DEV === true;

// Production has no API proxy: same-origin "" only works under `vp dev`
// (which proxies /v1 to Core). Production builds fall back to the exact
// public API origin so requests never hit dashboard.artisan.st/v1 (404).
// Same public Vite env source for SSR CSP connect-src and browser client.
export const CORE_API_BASE: string =
  read_env("VITE_CORE_API_URL") ?? (is_dev() ? "" : "https://api.artisan.st");

export const AUTH_BASE: string =
  read_env("VITE_AUTH_URL") ?? "https://auth.artisan.st";

export const CORE_DEV_FALLBACK = "http://127.0.0.1:8787";
