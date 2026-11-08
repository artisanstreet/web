<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import Card from "../card/card.svelte";
  import Continue from "../action/continue.svelte";

  let {
    id,
    label,
    value = $bindable(""),
    busy = false,
    spaced = false,
    ...input
  }: {
    id: string;
    label: string;
    value?: string;
    busy?: boolean;
    spaced?: boolean;
  } & Omit<HTMLInputAttributes, "value" | "id"> = $props();
</script>

<label class="visually-hidden" for={id}>{label}</label>
<div class="control">
  <Card surface="var(--bg)" radius="var(--field-radius)">
    <input {id} class:spaced {...input} readonly={busy || input.readonly} bind:value />
  </Card>
  <Continue disabled={busy} {busy} />
</div>

<style>
  .control {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: stretch;
  }

  .control > :global(.card) {
    overflow: hidden;
    transition: transform var(--duration-quick) var(--ease-smooth-out);
  }

  .control:has(:global(.continue:active:enabled)) > :global(.card) {
    transform: translateY(1.5px);
    transition-duration: var(--duration-micro);
    transition-timing-function: ease-out;
  }

  .control > :global(.card)::before,
  .control > :global(.card)::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 3;
    border-radius: inherit;
    pointer-events: none;
    transition: opacity var(--duration-quick) var(--ease-smooth-out);
  }

  .control > :global(.card)::before {
    box-shadow:
      inset 7px 0 9px -5px oklch(1 0 0 / 0.1),
      inset -7px 0 9px -5px oklch(1 0 0 / 0.1);
  }

  .control > :global(.card)::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 3;
    border-radius: inherit;
    pointer-events: none;
    transition: opacity var(--duration-quick) var(--ease-smooth-out);
  }

  .control > :global(.card)::before {
    mask-image: linear-gradient(to bottom, transparent, black 12px, black calc(100% - 12px), transparent);
    background:
      radial-gradient(ellipse 32px 100% at 32px 50%, oklch(1 0 0 / 0) 66%, oklch(1 0 0 / 0.05) 96%, oklch(1 0 0 / 0) 100%) left / 32px 100% no-repeat,
      radial-gradient(ellipse 32px 100% at 0 50%, oklch(1 0 0 / 0) 66%, oklch(1 0 0 / 0.05) 96%, oklch(1 0 0 / 0) 100%) right / 32px 100% no-repeat;
  }

  .control > :global(.card)::after {
    background: radial-gradient(ellipse 90% 120% at 50% -15%, oklch(0 0 0 / 0.45), oklch(0 0 0 / 0) 70%);
    opacity: 0;
  }

  .control:has(:global(.continue:active:enabled)) > :global(.card)::after {
    opacity: 1;
    transition-duration: var(--duration-micro);
  }

  input {
    box-shadow: inset 0 0 0 oklch(0 0 0 / 0);
    transition: box-shadow var(--duration-quick) var(--ease-smooth-out);
  }

  .control:has(:global(.continue:active:enabled)) input {
    box-shadow: inset 0 2px 4px oklch(0 0 0 / 0.45);
    transition-duration: var(--duration-micro);
    transition-timing-function: ease-out;
  }

  input {
    position: relative;
    z-index: 2;
    display: block;
    width: 100%;
    min-height: var(--field-height);
    padding: var(--sp-1) var(--sp-3);
    font: inherit;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: var(--ink);
    background: transparent;
    border: 0;
    border-radius: inherit;
    outline: none;
  }

  input::placeholder {
    color: var(--ink-dim);
    opacity: 1;
  }

  .spaced {
    letter-spacing: 0.4em;
    font-variant-numeric: tabular-nums;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
</style>
