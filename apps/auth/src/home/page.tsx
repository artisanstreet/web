import * as stylex from "@stylexjs/stylex";
import { home_styles } from "../styles/home.ts";
import wordmark_url from "../assets/wordmark.svg?url";
import { SignInForm } from "./form.tsx";
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
        <SignInForm />
      </div>
      <GradientShimmer />
    </main>
  );
}
