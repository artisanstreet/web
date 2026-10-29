import type { Config } from "@sveltejs/kit/vite";
import { Option } from "effect";

type CspDirectives = NonNullable<NonNullable<Config["csp"]>["directives"]>;

type Source = NonNullable<CspDirectives["connect-src"]>[number];

export const api_origin = (raw: string): Option.Option<Source> =>
  Option.fromNullishOr(URL.parse(raw.trim())).pipe(
    Option.filter(
      (url) => (url.protocol === "https:" || url.protocol === "http:") && url.username === "" && url.password === "",
    ),
    Option.map((url) => url.origin as Source),
  );

export const csp_directives = (api_url: string): CspDirectives => ({
  "default-src": ["none"],
  "script-src": ["self"],
  "connect-src": [
    "self",
    ...Option.match(api_origin(api_url), { onNone: () => [], onSome: (origin) => [origin] }),
  ],
  "img-src": ["self", "data:", "blob:"],
  "font-src": ["self"],
  "style-src": ["self"],
  "object-src": ["none"],
  "base-uri": ["none"],
  "frame-ancestors": ["none"],
  "form-action": ["self"],
});
