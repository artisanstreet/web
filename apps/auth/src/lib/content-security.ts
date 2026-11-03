import type { Config } from "@sveltejs/kit/vite";

type CspDirectives = NonNullable<NonNullable<Config["csp"]>["directives"]>;

export const csp_directives: CspDirectives = {
  "default-src": ["none"],
  "script-src": ["self"],
  "connect-src": ["self", "https://api.artisan.st"],
  "img-src": ["self", "data:", "blob:", "https://avatars.githubusercontent.com", "https://lh3.googleusercontent.com"],
  "font-src": ["self"],
  "style-src": ["self"],
  "style-src-attr": ["unsafe-inline"],
  "object-src": ["none"],
  "base-uri": ["none"],
  "frame-ancestors": ["none"],
  "form-action": ["self"],
};
