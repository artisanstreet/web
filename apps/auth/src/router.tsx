import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { base64urlnopad } from "@scure/base";
import { routeTree } from "./routeTree.gen";

// Per-request 32-byte CSP nonce (built-in crypto + base64url, no handmade
// encodings). Runs server-side during SSR; the framework propagates the
// nonce to <Scripts>/<HeadContent>, and headers() in __root.tsx gates
// script-src on the same value.
const get_ssr_options = createIsomorphicFn().server(() => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return { nonce: base64urlnopad.encode(bytes) };
});

// Framework contract: TanStack Start imports `getRouter` by name from the
// router entry. (Naming-convention exception: the export name is fixed by
// the Start plugin, not by our snake_case helper rule.)
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    ssr: get_ssr_options(),
  });
  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
