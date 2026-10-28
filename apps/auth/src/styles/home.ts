import * as stylex from "@stylexjs/stylex";
import { home_theme } from "./theme.stylex.ts";

const signin_control_height = "2.8125rem";

export const home_styles = stylex.create({
  canvas: {
    height: "100dvh",
    display: "grid",
    position: "relative",
    gridTemplateColumns: "minmax(0, 3.5fr) minmax(0, 2.5fr)",
    backgroundColor: home_theme["--home-background"],
    overflow: "hidden",
  },
  brand: {
    position: "absolute",
    top: 0,
    left: 0,
    padding: "var(--sp-8)",
    color: home_theme["--home-foreground"],
  },
  wordmark: {
    display: "block",
    width: "5rem",
    aspectRatio: "310.804 / 512",
    backgroundColor: "currentColor",
    maskPosition: "center",
    maskSize: "contain",
    maskRepeat: "no-repeat",
  },
  wordmark_image: (url: string) => ({ maskImage: `url("${url}")` }),
  content: {
    gridColumn: 1,
    display: "grid",
    placeItems: "center",
    minWidth: 0,
    padding: "var(--sp-8)",
  },
  signin: {
    position: "relative",
    width: "100%",
    maxWidth: "32.5rem",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "end",
    gap: 0,
  },
  field: { minWidth: 0, margin: 0, position: "relative", zIndex: 1 },
  input: {
    width: "100%",
    minWidth: 0,
    height: signin_control_height,
    minHeight: signin_control_height,
    paddingBlock: "0.3125rem",
    fontSize: "1.09375rem",
  },
  continue: {
    position: "relative",
    width: signin_control_height,
    height: signin_control_height,
    minHeight: signin_control_height,
    aspectRatio: "1 / 1",
    paddingBlock: 0,
    paddingInline: 0,
    borderWidth: 0,
    borderRadius: "0.8125rem",
    outline: { default: "none", ":focus-visible": "2.5px solid var(--focus)" },
    outlineOffset: { default: 0, ":focus-visible": 2.5 },
    color: "oklch(1 0 0)",
  },
  continue_icon: {
    position: "relative",
    width: "1.875rem",
    height: "1.875rem",
    backgroundImage:
      "linear-gradient(180deg in oklch, color-mix(in oklch, oklch(1 0 0) 75%, var(--continue-pink)), color-mix(in oklch, oklch(1 0 0) 75%, var(--continue-lilac)))",
    backgroundSize: `100% ${signin_control_height}`,
    backgroundPosition: "center",
  },
  shimmer: {
    gridColumn: 2,
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    display: "block",
    backgroundColor: home_theme["--pearl-base"],
    backgroundImage:
      "linear-gradient(160deg, var(--pearl-base), var(--pearl-pink), var(--pearl-lilac))",
    pointerEvents: "none",
    imageRendering: "pixelated",
  },
});
