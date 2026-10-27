/// <reference path="./stylex.d.ts" />
import { useEffect } from "react";

export function StyleXDev() {
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.MODE !== "test")
      void import("virtual:stylex:css-only");
  }, []);

  return import.meta.env.DEV && import.meta.env.MODE !== "test" ? (
    <link rel="stylesheet" href="/virtual:stylex.css" />
  ) : null;
}
