import { Button } from "@artisanstreet/ui";
import { ArrowNarrowRight } from "../icons/arrow-narrow-right.tsx";
import { home_styles } from "../styles/home.ts";

export function AttachedAction() {
  return (
    <Button variant="ghost" xstyle={home_styles.continue} aria-label="Continue">
      <ArrowNarrowRight xstyle={home_styles.continue_icon} />
    </Button>
  );
}
