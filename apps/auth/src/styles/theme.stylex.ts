import * as stylex from "@stylexjs/stylex";

export const home_theme = stylex.defineVars({
  "--home-background": {
    default: "var(--frame)",
    "@media (prefers-color-scheme: light)": "var(--white)",
  },
  "--home-foreground": {
    default: "var(--white)",
    "@media (prefers-color-scheme: light)": "var(--black)",
  },
  "--pearl-base": {
    default: "oklch(0.224 0.022 285)",
    "@media (prefers-color-scheme: light)": "oklch(0.975 0.012 345)",
  },
  "--pearl-pink": {
    default: "oklch(0.67 0.065 345)",
    "@media (prefers-color-scheme: light)": "oklch(0.8 0.055 345)",
  },
  "--pearl-lilac": {
    default: "oklch(0.68 0.055 300)",
    "@media (prefers-color-scheme: light)": "oklch(0.82 0.05 300)",
  },
});
