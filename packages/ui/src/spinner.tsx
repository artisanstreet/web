import * as React from "react";

export interface SpinnerProps {
  readonly label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ label = "Loading…" }: SpinnerProps) => {
  return (
    <span className="art-spinner" role="status" aria-live="polite">
      <span className="art-spinner-dot" aria-hidden="true" />
      <span className="art-spinner-label">{label}</span>
    </span>
  );
};
