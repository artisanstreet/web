<script lang="ts">
  import "@artisanstreet/ui/default-button.css";
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  let { children, ...rest }: { children: Snippet } & HTMLButtonAttributes = $props();
</script>

<button class="default-button" {...rest}>{@render children()}</button>

<style>
  .default-button {
    --default-button-height: var(--field-height);
    --default-button-radius: var(--field-radius);
    display: flex;
    width: 100%;
  }

  .default-button:disabled {
    cursor: progress;
  }
</style>
