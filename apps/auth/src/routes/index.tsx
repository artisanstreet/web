import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "../home/page.tsx";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    return_to: typeof search.return_to === "string" ? search.return_to : undefined,
  }),
  component: HomePage,
});
