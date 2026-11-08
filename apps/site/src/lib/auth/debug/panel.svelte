<script lang="ts">
  import { page } from "$app/state";
  import { debug_scenes } from "./scenes.svelte.ts";

  const current = $derived(debug_scenes.current);

  $effect(() => {
    debug_scenes.enter(page.url.pathname.startsWith("/auth/approve") ? "approve" : "sign-in");
  });
</script>

<div class="panel" role="group" aria-label="Debug state">
  <button type="button" aria-label="Previous state" onclick={() => debug_scenes.step(-1)}>‹</button>
  <span class="label">
    {#if current}
      <span class="count">{debug_scenes.index + 1}/{debug_scenes.list.length}</span>
      <span class="group">{current.group}</span>
      <span class="name">{current.label}</span>
    {:else}
      <span class="name">Live</span>
    {/if}
  </span>
  <button type="button" aria-label="Next state" onclick={() => debug_scenes.step(1)}>›</button>
</div>

<style>
  .panel {
    position: fixed;
    top: var(--sp-3);
    right: var(--sp-3);
    z-index: 100;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-1);
    font-size: 0.75rem;
    color: var(--ink);
    background: var(--bg-raised);
    border: 1px solid var(--ink-dim);
    border-radius: var(--radius-sm);
  }

  .label {
    display: flex;
    flex-direction: column;
    min-width: 12rem;
    line-height: 1.2;
  }

  .count,
  .group {
    color: var(--ink-dim);
  }

  button {
    width: 1.75rem;
    height: 1.75rem;
    font: inherit;
    font-size: 1rem;
    color: inherit;
    cursor: pointer;
    background: transparent;
    border: 1px solid var(--ink-dim);
    border-radius: var(--radius-sm);
  }
</style>
