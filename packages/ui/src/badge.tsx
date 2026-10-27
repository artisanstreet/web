import * as React from "react";

export type BadgeTone = "neutral" | "ok" | "warn" | "err";

export interface BadgeProps {
  readonly tone?: BadgeTone;
  readonly children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ tone = "neutral", children }: BadgeProps) => {
  return <span className={`art-badge art-badge--${tone}`}>{children}</span>;
};
