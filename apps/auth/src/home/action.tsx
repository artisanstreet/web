import { useId } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@artisanstreet/ui";
import { ArrowNarrowRight } from "../icons/arrow-narrow-right.tsx";
import { home_styles } from "../styles/home.ts";

const outer_edge = "M0 0H45A13 13 0 0 1 58 13V32A13 13 0 0 1 45 45H0";
const silhouette = `${outer_edge}A13 13 0 0 0 13 32V13A13 13 0 0 0 0 0Z`;

const styles = stylex.create({
  surface: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "3.625rem",
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(180deg in oklch, var(--continue-face-top), var(--continue-face-bottom))",
  },
  clip: (id: string) => ({ clipPath: `url("#${id}")` }),
  border: { display: "block", width: "100%", height: "100%", fill: "none" },
  inner_ring: { strokeWidth: 4 },
  outer_ring: { strokeWidth: 2 },
  highlight_top: { stopColor: "color-mix(in oklch, var(--continue-face-top), oklch(1 0 0) 30%)" },
  highlight_bottom: { stopColor: "var(--continue-face-bottom)" },
  rim_top: { stopColor: "color-mix(in oklch, var(--continue-face-top), oklch(0 0 0) 8%)" },
  rim_bottom: { stopColor: "color-mix(in oklch, var(--continue-face-bottom), oklch(0 0 0) 25%)" },
});

export function AttachedAction() {
  const clip_id = useId();

  return (
    <Button variant="ghost" xstyle={home_styles.continue} aria-label="Continue">
      <span {...stylex.props(styles.surface, styles.clip(clip_id))} aria-hidden="true">
        <svg viewBox="0 0 58 45" {...stylex.props(styles.border)}>
          <defs>
            <clipPath id={clip_id} clipPathUnits="objectBoundingBox">
              <path d={silhouette} transform="scale(0.0172413793 0.0222222222)" />
            </clipPath>
            <linearGradient
              id={`${clip_id}-highlight`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="0"
              y2="45"
            >
              <stop offset="0" {...stylex.props(styles.highlight_top)} />
              <stop offset="1" {...stylex.props(styles.highlight_bottom)} />
            </linearGradient>
            <linearGradient
              id={`${clip_id}-rim`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="0"
              y2="45"
            >
              <stop offset="0" {...stylex.props(styles.rim_top)} />
              <stop offset="1" {...stylex.props(styles.rim_bottom)} />
            </linearGradient>
          </defs>
          <path
            d={outer_edge}
            stroke={`url(#${clip_id}-highlight)`}
            {...stylex.props(styles.inner_ring)}
          />
          <path
            d={outer_edge}
            stroke={`url(#${clip_id}-rim)`}
            {...stylex.props(styles.outer_ring)}
          />
        </svg>
      </span>
      <ArrowNarrowRight xstyle={home_styles.continue_icon} />
    </Button>
  );
}
