import * as stylex from "@stylexjs/stylex";
import { home_styles } from "../styles/home.ts";
import wordmark_url from "../assets/wordmark.svg?url";
import { Button, TextField } from "@artisanstreet/ui";
import { ArrowNarrowRight } from "../icons/arrow-narrow-right.tsx";
import { GradientShimmer } from "../shimmer/canvas.tsx";

export function HomePage() {
  return (
    <main {...stylex.props(home_styles.canvas)}>
      <header {...stylex.props(home_styles.brand)}>
        <span
          {...stylex.props(home_styles.wordmark, home_styles.wordmark_image(wordmark_url))}
          role="img"
          aria-label="Artisan"
        />
      </header>
      <div {...stylex.props(home_styles.content)}>
        <div {...stylex.props(home_styles.signin)}>
          <TextField
            variant="card"
            xstyle={home_styles.field}
            input_style={home_styles.input}
            id="signin-email"
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Button variant="secondary" xstyle={home_styles.continue} aria-label="Continue">
            <ArrowNarrowRight xstyle={home_styles.continue_icon} />
          </Button>
        </div>
      </div>
      <GradientShimmer />
    </main>
  );
}
