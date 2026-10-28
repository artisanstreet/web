import * as stylex from "@stylexjs/stylex";
import { home_styles } from "../styles/home.ts";
import wordmark_url from "../assets/wordmark.svg?url";
import { TextField } from "@artisanstreet/ui";
import { AttachedAction } from "./action.tsx";
import { Mail } from "../icons/mail.tsx";
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
            variant="bevel"
            size="lg"
            xstyle={home_styles.field}
            input_style={home_styles.input}
            leading_icon={<Mail size={20} />}
            id="signin-email"
            name="email"
            label="Email"
            hide_label
            type="email"
            autoComplete="email"
            placeholder="you@artisan.email"
          />
          <AttachedAction />
        </div>
      </div>
      <GradientShimmer />
    </main>
  );
}
