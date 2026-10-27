import { createFileRoute } from "@tanstack/react-router";
import { SecurityPage } from "../features/security/page.tsx";

export const Route = createFileRoute("/security")({
  component: SecurityPage,
});
