import { createFileRoute } from "@tanstack/react-router";
import { GradientShimmer } from "../shimmer/canvas.tsx";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="home-canvas">
      <header className="home-brand">
        <span className="home-wordmark" role="img" aria-label="Artisan" />
      </header>
      <div className="home-content">
        <div className="home-card card" />
      </div>
      <GradientShimmer />
    </main>
  );
}
