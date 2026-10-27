import { createFileRoute } from "@tanstack/react-router";
import { MachinesPage } from "../features/machines/page.tsx";

export const Route = createFileRoute("/machines")({
  component: MachinesPage,
});
