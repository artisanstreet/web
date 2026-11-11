<script lang="ts">
  import "@artisanstreet/ui/danger-button.css";
  import "@artisanstreet/ui/default-button.css";
  import "@artisanstreet/ui/secondary-button.css";
  import "@artisanstreet/ui/special-button.css";
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  type Tone = "default" | "secondary" | "special" | "danger" | "solid-danger";

  let {
    tone = "default",
    children,
    ...rest
  }: { tone?: Tone; children: Snippet } & HTMLButtonAttributes = $props();

  const shared_class: Record<Tone, string | false> = {
    default: "default-button",
    secondary: "secondary-button",
    special: "special-button",
    danger: false,
    "solid-danger": "danger-button",
  };
</script>

<button type="button" class={["button", shared_class[tone]]} data-tone={tone} {...rest}>
  {@render children()}
</button>

<style>
  .button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    min-height: 2.25rem;
    padding: var(--sp-1) var(--sp-3);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    white-space: nowrap;
    color: var(--ink);
    cursor: pointer;
    outline: none;
    border-radius: calc(var(--radius-md) - 6px);
    transform: translateY(0);
    transition:
      transform var(--duration-quick) var(--ease-smooth-out),
      box-shadow var(--duration-quick) var(--ease-smooth-out),
      opacity var(--duration-quick) var(--ease-smooth-out);
  }

  .button:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .button:disabled {
    cursor: default;
  }

  .button[data-tone="danger"] {
    color: var(--err);
    border: 1px solid transparent;
    background: var(--hover-fill) padding-box;
    box-shadow: inset 0 0 0 0.5px var(--hover-edge);
  }

  .button[data-tone="danger"]:disabled {
    opacity: 0.55;
  }

  .button[data-tone="danger"]:active:enabled {
    transform: translateY(1px);
    transition-duration: var(--duration-micro);
    transition-timing-function: ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .button {
      transition: none;
    }
  }
</style>
