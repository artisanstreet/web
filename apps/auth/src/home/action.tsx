import { useId } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@artisanstreet/ui";
import { ArrowNarrowRight } from "../icons/arrow-narrow-right.tsx";
import { home_styles } from "../styles/home.ts";

const outer_edge = "M0 0H45A13 13 0 0 1 58 13V32A13 13 0 0 1 45 45H0";
const silhouette = `${outer_edge}A13 13 0 0 0 13 32V13A13 13 0 0 0 0 0Z`;
const highlight = "M0 1H45A12 12 0 0 1 57 13V32A12 12 0 0 1 45 44H0Z";
const face = "M0 2H45A11 11 0 0 1 56 13V32A11 11 0 0 1 45 43H0Z";

const styles = stylex.create({
  surface: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "3.625rem",
    pointerEvents: "none",
  },
  border: { display: "block", width: "100%", height: "100%" },
  face_top: { stopColor: "var(--continue-face-top)" },
  face_middle: {
    stopColor: "color-mix(in oklch, var(--continue-face-top), var(--continue-face-bottom))",
  },
  face_bottom: { stopColor: "var(--continue-face-bottom)" },
  highlight_top: { stopColor: "color-mix(in oklch, var(--continue-face-top), oklch(1 0 0) 30%)" },
  highlight_bottom: { stopColor: "var(--continue-face-bottom)" },
  rim_top: { stopColor: "color-mix(in oklch, var(--continue-face-top), oklch(0 0 0) 8%)" },
  rim_bottom: { stopColor: "color-mix(in oklch, var(--continue-face-bottom), oklch(0 0 0) 25%)" },
});

export function AttachedAction() {
  const clip_id = useId();

  return (
    <Button variant="ghost" xstyle={home_styles.continue} aria-label="Continue">
      <span {...stylex.props(styles.surface)} aria-hidden="true">
        <svg viewBox="0 0 58 45" {...stylex.props(styles.border)}>
          <defs>
            <clipPath id={clip_id}>
              <path d={silhouette} />
            </clipPath>
            <linearGradient
              id={`${clip_id}-face`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="0"
              y2="45"
            >
              <stop offset="0" {...stylex.props(styles.face_top)} />
              <stop offset="0.5" {...stylex.props(styles.face_middle)} />
              <stop offset="1" {...stylex.props(styles.face_bottom)} />
            </linearGradient>
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
          <path d={silhouette} fill={`url(#${clip_id}-rim)`} />
          <g clipPath={`url(#${clip_id})`}>
            <path d={highlight} fill={`url(#${clip_id}-highlight)`} />
            <path d={face} fill={`url(#${clip_id}-face)`} />
          </g>
        </svg>
      </span>
      <ArrowNarrowRight xstyle={home_styles.continue_icon} />
    </Button>
  );
}
