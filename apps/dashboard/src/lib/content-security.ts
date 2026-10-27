// Content-Security-Policy for dashboard.artisan.st (server use in headers()).
// Nonce-gated scripts: per-request 32-byte base64url nonce, no
// unsafe-inline/unsafe-eval in script-src. style-src keeps 'unsafe-inline'
// because BaseUI injects runtime styles without nonces. Origin parsing is an
// Effect Url pipeline (no try/catch, no handwritten normalizers); the API
// origin comes from the same CORE_API_BASE the browser client fetches.

import { Either, Match } from "effect";
import * as Url from "@effect/platform/Url";

const allowed_origin = (url: URL): string | null =>
  Match.value(url).pipe(
    Match.when(
      (u: URL) => (u.protocol === "https:" || u.protocol === "http:") && u.username === "" && u.password === "",
      (u: URL) => u.origin,
    ),
    Match.orElse(() => null),
  );

export const api_origin_for_csp = (raw: string | null | undefined): string | null => {
  if (raw === null || raw === undefined || raw.trim().length === 0) return null;
  return Either.match(Url.fromString(raw.trim()), {
    onLeft: () => null,
    onRight: allowed_origin,
  });
};

export const build_csp = (nonce: string, api_base: string | null | undefined): string => {
  const api_origin = api_origin_for_csp(api_base);
  const connect = api_origin ? `connect-src 'self' ${api_origin}` : "connect-src 'self'";
  return [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    connect,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");
};

export const security_headers = (nonce: string, api_base: string | null | undefined): Record<string, string> => ({
  "Content-Security-Policy": build_csp(nonce, api_base),
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
});
