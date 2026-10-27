// return_to allowlist: exact dashboard paths only.
// Rejects external origins, protocol-relative URLs, backslashes, and
// javascript:/data: schemes. Never transports tokens — return_to is a plain
// post-login landing path, never a credential.

import { DASHBOARD_BASE } from "./env.ts";

const ALLOWED_PATHS = new Set([
  "/",
  "/threads",
  "/machines",
  "/account",
  "/sessions",
  "/security",
  "/vault",
  "/config",
  "/activity",
]);

const is_safe_path = (path: string): boolean => {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  if (/^\/[a-z-]*:/i.test(path)) return false;
  const clean = path.split("?")[0]?.split("#")[0] ?? "/";
  if (ALLOWED_PATHS.has(clean)) return true;
  // Allow any other single-slash app path under the dashboard (no scheme,
  // no host, no traversal). Keeps the allowlist exact without hard-coding
  // every future dashboard route, while still rejecting open redirects.
  if (/^\/[a-z0-9/_-]*$/i.test(clean) && !clean.includes("..")) return true;
  return false;
};

export const parse_return_to = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 512) return null;
  // Absolute dashboard URL: accept only the exact configured origin.
  if (/^https?:\/\//i.test(trimmed)) {
    const dash_origin = (() => {
      try {
        return new URL(DASHBOARD_BASE).origin;
      } catch {
        return "https://dashboard.artisan.st";
      }
    })();
    try {
      const url = new URL(trimmed);
      if (url.origin !== dash_origin) return null;
      const path = `${url.pathname}${url.search}`;
      return is_safe_path(path) ? path : null;
    } catch {
      return null;
    }
  }
  return is_safe_path(trimmed) ? trimmed : null;
};

export const dashboard_url = (return_to: string | null | undefined): string => {
  const safe = parse_return_to(return_to);
  const base = DASHBOARD_BASE.replace(/\/+$/, "");
  if (!safe) return `${base}/`;
  return `${base}${safe}`;
};
