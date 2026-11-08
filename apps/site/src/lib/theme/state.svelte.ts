import { Data } from "effect";
import { flushSync } from "svelte";

export type Theme = Data.TaggedEnum<{
  Dark: {};
  Light: {};
}>;

export const Theme = Data.taggedEnum<Theme>();

export const theme_name = Theme.$match({
  Dark: () => "dark",
  Light: () => "light",
});

const flipped = Theme.$match({
  Dark: () => Theme.Light(),
  Light: () => Theme.Dark(),
});

class ThemeState {
  current = $state<Theme>(Theme.Dark());

  flip = () => {
    const next = flipped(this.current);
    const root = document.documentElement;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || !document.startViewTransition) {
      this.current = next;
      return;
    }
    const sweep = document.startViewTransition(() => {
      root.dataset.themeSweep = "";
      flushSync(() => {
        this.current = next;
      });
    });
    sweep.finished.finally(() => {
      delete root.dataset.themeSweep;
    });
  };

  choose = (theme: Theme) => {
    if (theme._tag !== this.current._tag) this.flip();
  };
}

export const theme_state = new ThemeState();
