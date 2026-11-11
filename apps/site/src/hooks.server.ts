import { SITE_PUBLIC_ORIGIN } from "$app/env/private";
import { Match } from "effect";
import type { Handle } from "@sveltejs/kit/hooks";

const security_headers = {
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
};

export const handle: Handle = ({ event, resolve }) => {
  event.setHeaders(security_headers);
  const legacy_callback = event.url.pathname === "/oauth/callback";
  const needs_session =
    (event.url.pathname === "/dashboard" || event.url.pathname.startsWith("/dashboard/")) &&
    !event.cookies.get("ast_session");
  return Match.value({ legacy_callback, needs_session }).pipe(
    Match.when({ legacy_callback: true }, () => {
      const destination = new URL("/auth/oauth/callback", SITE_PUBLIC_ORIGIN);
      destination.search = event.url.search;
      return new Response(null, { status: 303, headers: { ...security_headers, Location: destination.href } });
    }),
    Match.when({ needs_session: true }, () => {
      const destination = new URL("/auth", event.url);
      destination.searchParams.set("return_to", `${event.url.pathname}${event.url.search}`);
      return new Response(null, { status: 303, headers: { ...security_headers, Location: `${destination.pathname}${destination.search}` } });
    }),
    Match.orElse(() => resolve(event)),
  );
};
