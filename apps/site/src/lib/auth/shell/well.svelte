<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div class="well">
  <p>{@render children()}</p>
</div>

<style>
  .well {
    padding: var(--sp-4);
    border-radius: var(--field-radius);
    background: var(--bg);
    box-shadow: var(--shadow-inset);
  }

  p {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.125rem;
    color: var(--ink-dim);
  }

  .well :global(a),
  .well :global(a:visited),
  .well :global(button) {
    padding: 0;
    font: inherit;
    color: var(--sky-accent);
    text-decoration: underline;
    text-underline-offset: 0.15em;
    background: var(--sky-link-gradient);
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-decoration-color: var(--sky-accent);
    box-decoration-break: clone;
    border: 0;
    cursor: pointer;
  }
  @media (forced-colors: active) {
    .well :global(a),
    .well :global(button) {
      background: none;
      -webkit-text-fill-color: currentColor;
    }
  }
</style>
