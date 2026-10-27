import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "../features/overview/page.tsx";

export const Route = createFileRoute("/")({
  component: OverviewPage,
});
