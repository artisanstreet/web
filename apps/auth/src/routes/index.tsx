import { createFileRoute } from "@tanstack/react-router";
import { GradientShimmer } from "../shimmer/canvas.tsx";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="home-canvas">
      <GradientShimmer />
    </main>
  );
}
