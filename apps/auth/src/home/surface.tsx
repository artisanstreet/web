import { useEffect, useId, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  surface: {
    position: "absolute",
    insetInline: 0,
    bottom: 0,
    width: "100%",
    height: "3.25rem",
    overflow: "visible",
    pointerEvents: "none",
  },
  body: { fill: "var(--bg)", stroke: "var(--panel-edge)", strokeWidth: 1 },
  pink: { stopColor: "var(--continue-pink)" },
  lilac: { stopColor: "var(--continue-lilac)" },
  inner_ring: { fill: "none", stroke: "oklch(0.75 0.1 345)", strokeWidth: 4 },
  outer_ring: { fill: "none", stroke: "oklch(0.72 0.1 300)", strokeWidth: 2 },
});

export function AttachedSurface() {
  const surface_ref = useRef<SVGSVGElement>(null);
  const [width, set_width] = useState(416);
  const id = useId();

  useEffect(() => {
    const surface = surface_ref.current;
    if (surface === null) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined && entry.contentRect.height > 0) {
        set_width(entry.contentRect.width * 52 / entry.contentRect.height);
      }
    });
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);

  const edge = width - 36;
  const outline = `M10 16H${edge - 8}Q${edge} 16 ${edge} 8Q${edge} 0 ${edge + 8} 0H${width - 10}Q${width} 0 ${width} 10V26Q${width} 36 ${width - 10} 36H${edge + 8}Q${edge} 36 ${edge} 44Q${edge} 52 ${edge - 8} 52H10Q0 52 0 42V26Q0 16 10 16Z`;

  return (
    <svg
      ref={surface_ref}
      viewBox={`0 0 ${width} 52`}
      preserveAspectRatio="none"
      {...stylex.props(styles.surface)}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${id}-shape`}>
          <path d={outline} />
        </clipPath>
        <clipPath id={`${id}-action`}>
          <rect x={edge} width="36" height="52" />
        </clipPath>
        <linearGradient
          id={`${id}-paint`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="36"
        >
          <stop offset="0" {...stylex.props(styles.pink)} />
          <stop offset="1" {...stylex.props(styles.lilac)} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}-shape)`}>
        <path d={outline} {...stylex.props(styles.body)} />
        <g clipPath={`url(#${id}-action)`}>
          <path d={outline} fill={`url(#${id}-paint)`} />
          <path d={outline} {...stylex.props(styles.inner_ring)} />
          <path d={outline} {...stylex.props(styles.outer_ring)} />
        </g>
      </g>
    </svg>
  );
}
