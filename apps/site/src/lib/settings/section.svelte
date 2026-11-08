<script lang="ts">
  import type { Snippet } from "svelte";
  import Card from "../card/card.svelte";

  let { children }: { children: Snippet } = $props();
</script>

<Card surface="var(--card-inner)" radius="var(--radius-md)">
  <div class="rows">
    {@render children()}
  </div>
</Card>

<style>
  .rows {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
  }

  .rows > :global(* + *) {
    box-shadow:
      inset 0 1px 0 var(--rule-shade),
      inset 0 2px 0 var(--rule-light);
  }
</style>
