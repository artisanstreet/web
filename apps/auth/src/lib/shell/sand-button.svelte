<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  let { children, ...rest }: { children: Snippet } & HTMLButtonAttributes = $props();
</script>

<button class="sand" {...rest}>{@render children()}</button>

<style>
  .sand {
    position: relative;
    --sand-light: oklch(0.92 0.035 88);
    --sand-deep: oklch(0.82 0.05 78);
    --sand-top: var(--sand-light);
    --sand-bottom: var(--sand-deep);
    --sand-ink: oklch(0.27 0.025 70);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    width: 100%;
    min-height: var(--field-height);
    padding: var(--sp-1) var(--sp-3);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    color: var(--sand-ink);
    cursor: pointer;
    outline: none;
    border: 1px solid transparent;
    border-radius: var(--field-radius);
    background:
      radial-gradient(ellipse 70% 110% at 50% 115%, oklch(0.42 0.1 55 / 0.45), oklch(0.42 0.1 55 / 0) 70%) padding-box,
      linear-gradient(var(--sand-top), color-mix(in oklch, var(--sand-top), var(--sand-bottom)), var(--sand-bottom)) padding-box,
      linear-gradient(color-mix(in oklch, var(--sand-top), oklch(0 0 0) 8%), color-mix(in oklch, var(--sand-bottom), oklch(0 0 0) 25%)) border-box;
    box-shadow:
      inset 0 1px 0 color-mix(in oklch, var(--sand-top), oklch(1 0 0) 30%),
      var(--shadow-press);
    transform: translateY(0);
    transition:
      transform var(--duration-quick) var(--ease-smooth-out),
      box-shadow var(--duration-quick) var(--ease-smooth-out),
      opacity var(--duration-quick) var(--ease-smooth-out);
  }

  .sand:hover:enabled {
    --sand-top: color-mix(in oklch, var(--sand-light), oklch(1 0 0) 6%);
  }

  .sand:active:enabled {
    --sand-top: color-mix(in oklch, var(--sand-light), oklch(0 0 0) 4%);
    --sand-bottom: color-mix(in oklch, var(--sand-deep), oklch(0 0 0) 5%);
    transform: translateY(1.5px);
    box-shadow:
      inset 0 1px 0 transparent,
      0 0 0.5px oklch(0 0 0 / 0.3);
    transition-duration: var(--duration-micro);
  }

  .sand::after {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    pointer-events: none;
    background: radial-gradient(ellipse 90% 120% at 50% -15%, oklch(0.25 0.04 65 / 0.4), oklch(0.25 0.04 65 / 0) 70%);
    box-shadow: inset 0 1px 0 oklch(0.25 0.04 65 / 0.45);
    opacity: 0;
    transition: opacity var(--duration-quick) var(--ease-smooth-out);
  }

  .sand:active:enabled::after {
    opacity: 1;
    transition-duration: var(--duration-micro);
  }


  .sand:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }

  .sand:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  @media (prefers-reduced-motion: reduce) {
    .sand {
      transition: none;
    }
  }
</style>
