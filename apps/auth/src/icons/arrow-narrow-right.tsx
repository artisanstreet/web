import { useId } from "react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  icon: {
    display: "block",
    width: "1.5rem",
    height: "1.5rem",
    flexShrink: 0,
  },
  top: { stopColor: "color-mix(in oklch, oklch(1 0 0) 75%, var(--continue-face-top))" },
  bottom: { stopColor: "color-mix(in oklch, oklch(1 0 0) 75%, var(--continue-face-bottom))" },
});

// Tabler Icons geometry, MIT. See license.txt.
export function ArrowNarrowRight({ xstyle }: Readonly<{ xstyle?: stylex.StyleXStyles }>) {
  const paint_id = useId();

  return (
    <svg
      {...stylex.props(styles.icon, xstyle)}
      viewBox="0 0 30 30"
      fill="none"
      stroke={`url(#${paint_id})`}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={paint_id} gradientUnits="userSpaceOnUse" x1="0" y1="-8" x2="0" y2="37">
          <stop offset="0" {...stylex.props(styles.top)} />
          <stop offset="1" {...stylex.props(styles.bottom)} />
        </linearGradient>
      </defs>
      <path d="M6.5 15.5H23.5M18.5 10.5l5 5-5 5" />
    </svg>
  );
}
