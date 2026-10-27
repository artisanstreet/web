import { createFileRoute } from "@tanstack/react-router";
import { Button, TextField } from "@artisanstreet/ui";
import { ArrowNarrowRight } from "../icons/arrow-narrow-right.tsx";
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
        <div className="home-signin">
          <TextField variant="card" id="signin-email" name="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" />
          <Button variant="secondary" className="home-continue" aria-label="Continue">
            <ArrowNarrowRight />
          </Button>
        </div>
      </div>
      <GradientShimmer />
    </main>
  );
}
