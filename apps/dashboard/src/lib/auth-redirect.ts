import { AUTH_BASE } from "./env.ts";

// Dashboard -> auth redirect: safe, allowlisted return path only.
// No user data in SSR/shared cache; API enforces auth, route guard UX
// redirects to auth.artisan.st with ?return_to=<allowlisted path>.
// No tokens in URL, no parent-domain cookie, no BFF.

const ALLOWED_PREFIXES = ["/", "/machines", "/sessions", "/credentials", "/config", "/activity", "/security"];

const is_safe_return = (path: string): boolean => {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  if (/^\/[a-z-]*:/i.test(path)) return false;
  if (path.length > 512) return false;
  const clean = path.split("?")[0]?.split("#")[0] ?? "/";
  if (clean.includes("..")) return false;
  if (!/^[a-z0-9/_-]*$/i.test(clean)) return false;
  return ALLOWED_PREFIXES.some((p) => clean === p || clean.startsWith(`${p}/`) || p === "/");
};

export const parse_return_path = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return is_safe_return(trimmed) ? trimmed : null;
};

export const sign_in_url = (return_to: string | null | undefined): string => {
  const base = AUTH_BASE.replace(/\/+$/, "");
  const safe = parse_return_path(return_to);
  if (!safe) return `${base}/?return_to=${encodeURIComponent("/")}`;
  return `${base}/?return_to=${encodeURIComponent(safe)}`;
};

export const current_return_path = (): string => {
  if (typeof window === "undefined") return "/";
  const path = `${window.location.pathname}${window.location.search}`;
  return parse_return_path(path) ?? "/";
};
