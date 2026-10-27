import { createFileRoute } from "@tanstack/react-router";
import { CredentialsPage } from "../features/credentials/page.tsx";

export const Route = createFileRoute("/credentials")({
  component: CredentialsPage,
});
