import { useId } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@artisanstreet/ui";
import { ArrowNarrowRight } from "../icons/arrow-narrow-right.tsx";
import { home_styles } from "../styles/home.ts";

const outline = "M0 8H8Q12 8 12 4Q12 0 16 0H38Q48 0 48 10V26Q48 36 38 36H20Q12 36 12 44H0Z";

const styles = stylex.create({
  surface: {
    position: "absolute",
    left: "-0.75rem",
    top: 0,
    width: "3rem",
    height: "2.75rem",
    pointerEvents: "none",
    backgroundColor: "var(--continue-lilac)",
    backgroundImage:
      "linear-gradient(180deg in oklch, var(--continue-pink), var(--continue-lilac))",
    backgroundSize: "100% 2.25rem",
    backgroundRepeat: "no-repeat",
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
        <svg viewBox="0 0 48 44" {...stylex.props(styles.border)}>
          <defs>
            <clipPath id={clip_id} clipPathUnits="objectBoundingBox">
              <path d={outline} transform="scale(0.0208333333 0.0227272727)" />
            </clipPath>
          </defs>
          <path d={outline} {...stylex.props(styles.inner_ring)} />
          <path d={outline} {...stylex.props(styles.outer_ring)} />
        </svg>
      </span>
      <ArrowNarrowRight xstyle={home_styles.continue_icon} />
    </Button>
  );
}
