import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Framework contract: TanStack Start imports `getRouter` by name from the
// router entry. (Naming-convention exception: the export name is fixed by
// the Start plugin, not by our snake_case helper rule.)
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  });
  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
