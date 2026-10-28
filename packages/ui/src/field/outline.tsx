import { useId } from "react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  outline: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
    pointerEvents: "none",
    fill: "none",
  },
  rim_top: { stopColor: "color-mix(in oklch, var(--bg), var(--ink) 4%)" },
  rim_bottom: { stopColor: "color-mix(in oklch, var(--bg), oklch(0 0 0) 25%)" },
  highlight_top: { stopColor: "color-mix(in oklch, var(--bg), var(--ink) 12%)" },
  highlight_bottom: { stopColor: "var(--bg)" },
});

export function FieldOutline({ radius }: Readonly<{ radius: string }>) {
  const id = useId();

  return (
    <svg {...stylex.props(styles.outline)} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-rim`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0" {...stylex.props(styles.rim_top)} />
          <stop offset="1" {...stylex.props(styles.rim_bottom)} />
        </linearGradient>
        <linearGradient id={`${id}-highlight`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0" {...stylex.props(styles.highlight_top)} />
          <stop offset="1" {...stylex.props(styles.highlight_bottom)} />
        </linearGradient>
      </defs>
      <rect
        x="0.5"
        y="0.5"
        width="calc(100% - 1px)"
        height="calc(100% - 1px)"
        rx={`calc(${radius} - 0.5px)`}
        stroke={`url(#${id}-rim)`}
        strokeWidth="1"
      />
      <rect
        x="1.5"
        y="1.5"
        width="calc(100% - 3px)"
        height="calc(100% - 3px)"
        rx={`calc(${radius} - 1.5px)`}
        stroke={`url(#${id}-highlight)`}
        strokeWidth="1"
      />
    </svg>
  );
}
