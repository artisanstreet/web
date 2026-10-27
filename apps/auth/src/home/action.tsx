import { useId } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@artisanstreet/ui";
import { ArrowNarrowRight } from "../icons/arrow-narrow-right.tsx";
import { home_styles } from "../styles/home.ts";

const outer_edge = "M0 0H36A10.4 10.4 0 0 1 46.4 10.4V25.6A10.4 10.4 0 0 1 36 36H0";
const silhouette = `${outer_edge}A10.4 10.4 0 0 0 10.4 25.6V10.4A10.4 10.4 0 0 0 0 0Z`;

const styles = stylex.create({
  surface: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "calc(2.25rem + var(--radius-md))",
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(180deg in oklch, var(--continue-pink), var(--continue-lilac))",
  },
  clip: (id: string) => ({ clipPath: `url("#${id}")` }),
  border: { display: "block", width: "100%", height: "100%", fill: "none" },
  inner_ring: { stroke: "oklch(0.75 0.1 345)", strokeWidth: 4 },
  outer_ring: { stroke: "oklch(0.72 0.1 300)", strokeWidth: 2 },
});

export function AttachedAction() {
  const clip_id = useId();

  return (
    <Button variant="ghost" xstyle={home_styles.continue} aria-label="Continue">
      <span {...stylex.props(styles.surface, styles.clip(clip_id))} aria-hidden="true">
        <svg viewBox="0 0 46.4 36" {...stylex.props(styles.border)}>
          <defs>
            <clipPath id={clip_id} clipPathUnits="objectBoundingBox">
              <path d={silhouette} transform="scale(0.0215517241 0.0277777778)" />
            </clipPath>
          </defs>
          <path d={outer_edge} {...stylex.props(styles.inner_ring)} />
          <path d={outer_edge} {...stylex.props(styles.outer_ring)} />
        </svg>
      </span>
      <ArrowNarrowRight xstyle={home_styles.continue_icon} />
    </Button>
  );
}
